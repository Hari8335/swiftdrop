import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, signal } from '@angular/core';
import { MerchantNotification, MerchantNotificationsService } from './merchant-notifications.service';

@Component({
  selector: 'app-merchant-notification-bell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative" id="merchant-notifications">
      <button
        type="button"
        id="merchant-notification-bell-btn"
        (click)="toggle()"
        [attr.aria-expanded]="open()"
        [attr.aria-label]="notifications.unreadCount() ? notifications.unreadCount() + ' unread notifications' : 'Notifications'"
        class="relative grid h-11 w-11 place-items-center rounded-xl border border-[#e8e2dc] bg-white text-[#6f6d85] shadow-sm transition hover:border-[#a53a26]/40 hover:text-[#a53a26] focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 cursor-pointer"
      >
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>
        </svg>
        @if (notifications.unreadCount() > 0) {
          <span id="merchant-notification-badge" class="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#a53a26] px-1 text-[11px] font-bold text-white shadow ring-2 ring-white">{{ notifications.unreadCount() > 9 ? '9+' : notifications.unreadCount() }}</span>
        }
      </button>

      @if (open()) {
        <div id="merchant-notification-dropdown" role="dialog" aria-label="Notifications" class="absolute right-0 top-14 z-50 w-80 sm:w-96 rounded-2xl border border-[#e8e2dc] bg-white shadow-[0_12px_32px_rgba(33,31,50,0.12)] overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3 border-b border-[#f0ebe5] bg-[#faf8f6]">
            <div class="flex items-center gap-2"><span class="text-sm font-black text-[#1d1b2c]">Notifications</span>
              @if (notifications.unreadCount() > 0) { <span class="rounded-full bg-[#a53a26] px-2 py-0.5 text-[10px] font-bold text-white">{{ notifications.unreadCount() }} new</span> }
            </div>
            @if (notifications.unreadCount() > 0) { <button type="button" id="merchant-notification-mark-all" (click)="notifications.markAllRead()" class="text-xs font-bold text-[#a53a26] hover:underline cursor-pointer">Mark all read</button> }
          </div>
          @if (notifications.notifications().length === 0) {
            <div id="merchant-notification-empty" class="px-4 py-8 text-center"><p class="text-sm font-bold text-[#1d1b2c]">You're all caught up</p><p class="mt-1 text-xs text-[#6f6d85]">Merchant portal activity will appear here.</p></div>
          } @else {
            <ul class="max-h-[360px] overflow-y-auto divide-y divide-[#f0ebe5]" role="list">
              @for (item of notifications.notifications(); track item.id) {
                <li><button type="button" (click)="openItem(item)" class="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[#faf8f6] transition-colors cursor-pointer" [class.bg-[#fff8f5]]="!item.read">
                  <span class="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white" [class.bg-[#a53a26]]="item.kind !== 'error'" [class.bg-rose-600]="item.kind === 'error'">
                    @if (item.kind === 'error') { <span aria-hidden="true">!</span> } @else { <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> }
                  </span>
                  <span class="flex-1 min-w-0"><span class="block text-xs font-bold text-[#1d1b2c]">{{ item.title }}</span><span class="block mt-0.5 text-xs text-[#6f6d85]">{{ item.message }}</span><span class="block mt-1 text-[11px] text-[#a09eaf]">{{ item.createdAt | date: 'shortTime' }}</span></span>
                  @if (!item.read) { <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#a53a26]" aria-label="Unread"></span> }
                </button></li>
              }
            </ul>
            <div class="px-4 py-2.5 border-t border-[#f0ebe5] text-right"><button type="button" (click)="notifications.clearAll()" class="text-xs font-semibold text-[#6f6d85] hover:text-[#a53a26] cursor-pointer">Clear all</button></div>
          }
        </div>
      }
    </div>

    @if (notifications.toast(); as toast) {
      <div id="merchant-action-toast" role="status" class="fixed right-4 top-20 z-[80] flex max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg" [class.border-rose-200]="toast.kind === 'error'" [class.bg-rose-50]="toast.kind === 'error'" [class.text-rose-900]="toast.kind === 'error'" [class.border-[#a53a26]/20]="toast.kind !== 'error'" [class.bg-white]="toast.kind !== 'error'" [class.text-[#1d1b2c]]="toast.kind !== 'error'">
        <span class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#a53a26]/10 text-[#a53a26]" [class.bg-rose-100]="toast.kind === 'error'" [class.text-rose-700]="toast.kind === 'error'">{{ toast.kind === 'error' ? '!' : '✓' }}</span>
        <span class="min-w-0 flex-1"><span class="block text-xs font-bold">{{ toast.title }}</span><span class="mt-0.5 block text-xs">{{ toast.message }}</span></span>
        <button type="button" (click)="notifications.dismissToast()" aria-label="Dismiss notification" class="text-sm font-bold opacity-70 hover:opacity-100">×</button>
      </div>
    }
  `,
})
export class MerchantNotificationBellComponent {
  readonly notifications = inject(MerchantNotificationsService);
  readonly open = signal(false);

  toggle(): void { this.open.update((value) => !value); }

  openItem(item: MerchantNotification): void {
    this.notifications.markRead(item.id);
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  closeOnOutsideClick(event: MouseEvent): void {
    if (this.open() && !(event.target as HTMLElement | null)?.closest('#merchant-notifications')) this.open.set(false);
  }
}
