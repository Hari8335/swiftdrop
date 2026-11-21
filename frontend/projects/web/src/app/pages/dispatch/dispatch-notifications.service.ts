import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DispatchParcelSummary, FailedParcelsPage, UnassignedParcelsPage } from './dispatch.model';
import { DispatchService } from './dispatch.service';

export type DispatchNotificationKind = 'queue' | 'failed';

export interface DispatchNotification {
  id: string;
  kind: DispatchNotificationKind;
  title: string;
  message: string;
  trackingNumber: string;
  createdAt: string;
  read: boolean;
}

export interface DispatchToast {
  id: number;
  kind: DispatchNotificationKind | 'success' | 'error';
  title: string;
  message: string;
}

export interface DispatchAlertPreferences {
  queueAlerts: boolean;
  failedAlerts: boolean;
}

const PREFS_KEY = 'swiftdrop.dispatch.alertPrefs';
const MAX_NOTIFICATIONS = 30;
const TOAST_MS = 6000;
export const DISPATCH_POLL_MS = 15000;

/**
 * Dispatcher notifications, built the same way as the admin portal's: from operational data
 * rather than the customer notification API (which only serves CUSTOMER accounts).
 *
 * Every poll fetches the unfiltered unassigned and failed queues. The first poll only records
 * what already exists; afterwards each parcel that newly appears produces a notification for
 * the top-bar bell and a toast.
 */
@Injectable({ providedIn: 'root' })
export class DispatchNotificationsService {
  private readonly http = inject(HttpClient);

  private readonly _notifications = signal<DispatchNotification[]>([]);
  private readonly _toasts = signal<DispatchToast[]>([]);
  private readonly _prefs = signal<DispatchAlertPreferences>(this.readPrefs());

  readonly notifications = this._notifications.asReadonly();
  readonly toasts = this._toasts.asReadonly();
  readonly prefs = this._prefs.asReadonly();
  readonly unreadCount = computed(() => this._notifications().filter((n) => !n.read).length);

  /** Unfiltered queue sizes, for sidebar badges. */
  readonly queueCount = signal(0);
  readonly failedCount = signal(0);

  private seenQueue: Set<string> | null = null;
  private seenFailed: Set<string> | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private toastSeq = 0;

  start(): void {
    if (this.timer) return;
    this.poll();
    this.timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      this.poll();
    }, DISPATCH_POLL_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  poll(): void {
    const params = new HttpParams().set('page', '0').set('size', '100');
    forkJoin({
      queue: this.http
        .get<UnassignedParcelsPage>(`${DispatchService.BASE_URL}/parcels`, { params })
        .pipe(catchError(() => of(null))),
      failed: this.http
        .get<FailedParcelsPage>(`${DispatchService.BASE_URL}/parcels/failed`, { params })
        .pipe(catchError(() => of(null))),
    }).subscribe(({ queue, failed }) => {
      if (queue) {
        this.queueCount.set(queue.totalElements ?? queue.content?.length ?? 0);
        this.seenQueue = this.diff(queue.content ?? [], this.seenQueue, 'queue');
      }
      if (failed) {
        this.failedCount.set(failed.totalElements ?? failed.content?.length ?? 0);
        this.seenFailed = this.diff(failed.content ?? [], this.seenFailed, 'failed');
      }
    });
  }

  private diff(
    parcels: DispatchParcelSummary[],
    seen: Set<string> | null,
    kind: DispatchNotificationKind
  ): Set<string> {
    const next = new Set(seen ?? []);
    for (const p of parcels) {
      if (next.has(p.parcelId)) continue;
      next.add(p.parcelId);
      if (seen) this.notify(kind, p);
    }
    return next;
  }

  private notify(kind: DispatchNotificationKind, p: DispatchParcelSummary): void {
    const title = kind === 'queue' ? 'New parcel awaiting assignment' : 'Delivery attempt failed';
    const message =
      kind === 'queue'
        ? `${p.trackingNumber} · ${p.pickupZone} to ${p.dropoffZone}`
        : `${p.trackingNumber} · ${this.readableReason(p.failureReason)}`;
    const item: DispatchNotification = {
      id: `${kind}-${p.parcelId}-${Date.now()}`,
      kind,
      title,
      message,
      trackingNumber: p.trackingNumber,
      createdAt: new Date().toISOString(),
      read: false,
    };
    this._notifications.update((list) => [item, ...list].slice(0, MAX_NOTIFICATIONS));

    const prefs = this._prefs();
    if ((kind === 'queue' && prefs.queueAlerts) || (kind === 'failed' && prefs.failedAlerts)) {
      this.toast(kind, title, message);
    }
  }

  /** Shows a toast in the portal's bottom-right stack. */
  toast(kind: DispatchToast['kind'], title: string, message = ''): void {
    const toast: DispatchToast = { id: ++this.toastSeq, kind, title, message };
    this._toasts.update((list) => [...list.slice(-3), toast]);
    setTimeout(() => this.dismissToast(toast.id), TOAST_MS);
  }

  dismissToast(id: number): void {
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }

  markRead(id: string): void {
    this._notifications.update((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  markAllRead(): void {
    this._notifications.update((list) => list.map((n) => ({ ...n, read: true })));
  }

  clearAll(): void {
    this._notifications.set([]);
  }

  setPrefs(prefs: DispatchAlertPreferences): void {
    this._prefs.set(prefs);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* storage unavailable: keep in memory only */
    }
  }

  readableReason(reason?: string | null): string {
    if (!reason) return 'Delivery attempt failed';
    const text = reason.replace(/_/g, ' ').toLowerCase();
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  private readPrefs(): DispatchAlertPreferences {
    const fallback = { queueAlerts: true, failedAlerts: true };
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
    } catch {
      return fallback;
    }
  }
}
