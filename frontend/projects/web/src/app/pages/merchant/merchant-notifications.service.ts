import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, filter, tap } from 'rxjs';
import { AuthService } from 'shared-auth';

export type MerchantNotificationKind = 'success' | 'error' | 'info';

export interface MerchantNotification {
  id: number | string;
  title: string;
  message: string;
  kind: MerchantNotificationKind;
  createdAt: Date;
  read: boolean;
  type?: 'MERCHANT_APPROVED' | 'CREDENTIALS_REPLACED';
  credentialAvailable?: boolean;
}

export interface MerchantPortalNotificationPage {
  items: Array<{ id: string; type: MerchantNotification['type']; title: string; message: string; read: boolean; credentialAvailable: boolean; createdAt: string }>;
  totalElements: number;
  unreadCount: number;
}

export interface MerchantCredentialClaim { clientId: string; clientSecret: string }

@Injectable({ providedIn: 'root' })
export class MerchantNotificationsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly items = signal<MerchantNotification[]>([]);
  private readonly toastItem = signal<MerchantNotification | null>(null);
  private nextId = 0;
  private toastTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly remoteInbox = signal<{ owner: string | null; items: MerchantNotification[] } | null>(null);
  readonly owner = computed(() => this.auth.currentUser?.()?.id ?? null);
  private readonly remoteItems = computed(() => {
    const inbox = this.remoteInbox();
    return inbox && inbox.owner === this.owner() ? inbox.items : [];
  });

  readonly notifications = computed(() => [...this.remoteItems(), ...this.items()]);
  readonly hasLocalActivity = computed(() => this.items().length > 0);
  readonly toast = this.toastItem.asReadonly();
  readonly unreadCount = computed(() => this.notifications().filter((item) => !item.read).length);

  refresh(): void {
    const owner = this.owner();
    this.http.get<MerchantPortalNotificationPage>('/api/v1/merchant/notifications').subscribe({
      next: (page) => {
        if (owner !== this.owner()) return;
        this.remoteInbox.set({ owner, items: page.items.map((item) => ({
          id: item.id, type: item.type, title: item.title, message: item.message,
          kind: item.type === 'CREDENTIALS_REPLACED' ? 'info' : 'success',
          createdAt: new Date(item.createdAt), read: item.read, credentialAvailable: item.credentialAvailable,
        })) });
      },
      // Keep local merchant activity available if the server notification API is temporarily unavailable.
      error: () => undefined,
    });
  }

  claimCredential(id: string): Observable<MerchantCredentialClaim> {
    const owner = this.owner();
    return this.http.post<MerchantCredentialClaim>(`/api/v1/merchant/notifications/${encodeURIComponent(id)}/credential/claim`, {}).pipe(
      filter(() => owner === this.owner()),
      tap(() => this.updateRemoteItem(id, { read: true, credentialAvailable: false })),
    );
  }

  add(title: string, message: string, kind: MerchantNotificationKind = 'success'): void {
    const notification: MerchantNotification = {
      id: ++this.nextId,
      title,
      message,
      kind,
      createdAt: new Date(),
      read: false,
    };
    this.items.update((items) => [notification, ...items].slice(0, 40));
    this.toastItem.set(notification);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.dismissToast(), 6000);
  }

  markRead(id: number | string): void {
    this.items.update((items) => items.map((item) => item.id === id ? { ...item, read: true } : item));
    if (typeof id === 'string') {
      const owner = this.owner();
      this.http.post<void>(`/api/v1/merchant/notifications/${encodeURIComponent(id)}/read`, {}).subscribe({
        next: () => {
          if (owner === this.owner()) this.updateRemoteItem(id, { read: true });
        },
        error: () => this.refresh(),
      });
    }
  }

  markAllRead(): void {
    this.items.update((items) => items.map((item) => ({ ...item, read: true })));
    this.remoteItems().filter((item) => !item.read).forEach((item) => this.markRead(item.id));
  }

  clearAll(): void {
    this.items.set([]);
  }

  private updateRemoteItem(id: string, changes: Partial<MerchantNotification>): void {
    const owner = this.owner();
    this.remoteInbox.update((inbox) => inbox && inbox.owner === owner
      ? { owner, items: inbox.items.map((item) => item.id === id ? { ...item, ...changes } : item) }
      : inbox);
  }

  dismissToast(): void {
    this.toastItem.set(null);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = undefined;
  }
}
