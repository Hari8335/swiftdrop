import { Injectable, signal } from '@angular/core';

export type CustomerToastKind = 'success' | 'error' | 'info';

export interface CustomerToast {
  id: number;
  kind: CustomerToastKind;
  title: string;
  message: string;
}

const TOAST_MS = 5000;
const MAX_VISIBLE = 4;

/**
 * Pop-up confirmations for the customer portal. Pages call `success()` / `error()` and the
 * toast stack rendered by the customer sidebar (present on every customer page) shows them in
 * the bottom-right corner for a few seconds.
 */
@Injectable({ providedIn: 'root' })
export class CustomerToastService {
  private readonly _toasts = signal<CustomerToast[]>([]);
  readonly toasts = this._toasts.asReadonly();
  private seq = 0;

  success(title: string, message = ''): void {
    this.show('success', title, message);
  }

  error(title: string, message = ''): void {
    this.show('error', title, message);
  }

  info(title: string, message = ''): void {
    this.show('info', title, message);
  }

  show(kind: CustomerToastKind, title: string, message = ''): void {
    const toast: CustomerToast = { id: ++this.seq, kind, title, message };
    this._toasts.update((list) => [...list.slice(-(MAX_VISIBLE - 1)), toast]);
    setTimeout(() => this.dismiss(toast.id), TOAST_MS);
  }

  dismiss(id: number): void {
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
