import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

/** How long a looked-up picture is reused before it is fetched again (picks up other people's changes). */
export const USER_AVATAR_TTL_MS = 2 * 60 * 1000;
const MAX_IDS_PER_REQUEST = 50;

/**
 * Profile pictures of *other* users shown on a screen (e.g. couriers on the dispatch workload board).
 * Pictures are fetched in batches from GET /api/v1/auth/avatars, cached in a signal so templates update
 * when they arrive, and refreshed after {@link USER_AVATAR_TTL_MS}. Missing pictures resolve to null
 * so callers show initials.
 */
@Injectable({ providedIn: 'root' })
export class UserAvatarsService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly baseUrl = '/api/v1/auth/avatars';

  private readonly avatars = signal<Readonly<Record<string, string | null>>>({});
  private readonly fetchedAt = new Map<string, number>();
  private readonly inFlight = new Set<string>();

  /** Picture for a user id, or null while unknown / when the user has none. Reactive. */
  avatarFor(userId: string | null | undefined): string | null {
    return userId ? this.avatars()[userId] ?? null : null;
  }

  /** Fetches pictures for ids that are not cached (or are stale). Safe to call on every list change. */
  load(userIds: readonly (string | null | undefined)[]): void {
    if (!this.http) return;
    const now = Date.now();
    const wanted = [...new Set(userIds.filter((id): id is string => !!id && id.trim().length > 0))].filter(
      (id) => !this.inFlight.has(id) && now - (this.fetchedAt.get(id) ?? 0) > USER_AVATAR_TTL_MS,
    );
    for (let i = 0; i < wanted.length; i += MAX_IDS_PER_REQUEST) {
      this.fetch(wanted.slice(i, i + MAX_IDS_PER_REQUEST));
    }
  }

  private fetch(ids: string[]): void {
    ids.forEach((id) => this.inFlight.add(id));
    this.http!.get<Record<string, string>>(this.baseUrl, { params: { userIds: ids.join(',') } }).subscribe({
      next: (result) => {
        const fetched = Date.now();
        this.avatars.update((current) => {
          const next = { ...current };
          for (const id of ids) {
            next[id] = result?.[id] ?? null;
            this.fetchedAt.set(id, fetched);
          }
          return next;
        });
        ids.forEach((id) => this.inFlight.delete(id));
      },
      // Pictures are optional: keep initials and retry on a later load().
      error: () => ids.forEach((id) => this.inFlight.delete(id)),
    });
  }
}
