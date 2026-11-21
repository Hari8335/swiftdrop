import { Component, inject } from '@angular/core';
import { CustomerToastService } from './customer-toast.service';

/** Bottom-right toast stack for the customer portal (rendered once, by the customer sidebar). */
@Component({
  selector: 'app-customer-toasts',
  standalone: true,
  template: `
    <div
      id="customer-toast-stack"
      class="fixed bottom-6 right-6 z-[80] flex flex-col gap-3 w-[calc(100%-3rem)] sm:w-96 pointer-events-none"
      aria-live="polite"
      role="status"
    >
      @for (t of toasts.toasts(); track t.id) {
        <div
          class="customer-toast pointer-events-auto flex items-start gap-3 rounded-2xl border border-[#eee7e0] bg-white p-4 shadow-[0_12px_32px_rgba(33,31,50,0.14)]"
          [attr.data-kind]="t.kind"
          [attr.role]="t.kind === 'error' ? 'alert' : null"
        >
          <span
            class="grid h-8 w-8 shrink-0 place-items-center rounded-full"
            [class.bg-emerald-50]="t.kind === 'success'"
            [class.text-emerald-600]="t.kind === 'success'"
            [class.bg-rose-50]="t.kind === 'error'"
            [class.text-rose-600]="t.kind === 'error'"
            [class.bg-[#faf6f0]]="t.kind === 'info'"
            [class.text-[#a53a26]]="t.kind === 'info'"
          >
            @switch (t.kind) {
              @case ('success') {
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
              }
              @case ('error') {
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              }
              @default {
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M4 4h16v12H5.17L4 17.17V4z"/></svg>
              }
            }
          </span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-bold text-[#1d1b2c]">{{ t.title }}</p>
            @if (t.message) {
              <p class="mt-0.5 text-xs text-[#6f6d85] break-words">{{ t.message }}</p>
            }
          </div>
          <button
            type="button"
            (click)="toasts.dismiss(t.id)"
            aria-label="Dismiss notification"
            class="grid h-6 w-6 shrink-0 place-items-center rounded-md text-[#a09eaf] hover:bg-[#faf8f6] hover:text-[#1d1b2c] cursor-pointer"
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: contents;
      }
      .customer-toast {
        animation: customer-toast-in 0.22s ease-out;
      }
      @keyframes customer-toast-in {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `,
  ],
})
export class CustomerToastsComponent {
  readonly toasts = inject(CustomerToastService);
}
