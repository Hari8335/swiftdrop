import { Injectable, computed, signal } from '@angular/core';

export type MerchantNotificationKind = 'success' | 'error' | 'info';

export interface MerchantNotification {
  id: number;
  title: string;
  message: string;
  kind: MerchantNotificationKind;
  createdAt: Date;
  read: boolean;
}

@Injectable({ providedIn: 'root' })
export class MerchantNotificationsService {
  private readonly items = signal<MerchantNotification[]>([]);
  private readonly toastItem = signal<MerchantNotification | null>(null);
  private nextId = 0;
  private toastTimer: ReturnType<typeof setTimeout> | undefined;

  readonly notifications = this.items.asReadonly();
  readonly toast = this.toastItem.asReadonly();
  readonly unreadCount = computed(() => this.items().filter((item) => !item.read).length);

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

  markRead(id: number): void {
    this.items.update((items) => items.map((item) => item.id === id ? { ...item, read: true } : item));
  }

  markAllRead(): void {
    this.items.update((items) => items.map((item) => ({ ...item, read: true })));
  }

  clearAll(): void {
    this.items.set([]);
  }

  dismissToast(): void {
    this.toastItem.set(null);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = undefined;
  }
}
