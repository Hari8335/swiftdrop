import { Component, HostListener, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationBellComponent } from '../../notification/notification-bell/notification-bell.component';

export type CustomerSidebarItem = 'deliveries' | 'assistant' | 'wizard' | 'settings' | null;

/**
 * Shared customer navigation rail, used by every customer page so the
 * sidebar looks the same no matter which page is open.
 * Owns the logout confirmation dialog; emits `signOut` once confirmed.
 */
@Component({
  selector: 'app-customer-sidebar',
  standalone: true,
  imports: [RouterLink, NotificationBellComponent],
  template: `
    <!-- Reserves the rail's width in the page layout; the rail itself is fixed. -->
    <div class="hidden md:block w-20 flex-shrink-0" aria-hidden="true"></div>

    <aside
      id="customer-sidebar"
      aria-label="Customer sidebar"
      class="w-full flex items-center justify-between gap-4 px-4 py-3 border-b border-[#ece9e4] bg-white z-40
             md:fixed md:inset-y-0 md:left-0 md:h-screen md:w-20 md:flex-col md:items-stretch md:justify-between
             md:py-5 md:px-3 md:border-b-0 md:border-r md:overflow-y-auto md:overflow-x-hidden
             md:transition-all md:duration-300 md:ease-in-out md:hover:w-[272px] md:focus-within:w-[272px] md:hover:shadow-[0_15px_35px_rgba(0,0,0,0.08)]"
    >
      <div class="flex md:flex-col items-center md:items-stretch gap-3 md:gap-8">
      <!-- Brand Logo -->
      <a
        routerLink="/customer"
        id="customer-home-link"
        (click)="deliveries.emit()"
        class="md:mx-1 flex items-center gap-3 shrink-0 no-underline cursor-pointer"
        title="SwiftDrop Home"
        aria-label="SwiftDrop Home"
      >
        <span class="w-10 h-10 shrink-0 rounded-2xl bg-[#9b432f] text-white flex items-center justify-center shadow-[0_8px_18px_rgba(155,67,47,0.25)]">
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
        </span>
        <span class="rail-label rail-brand">SwiftDrop</span>
      </a>

      <nav class="flex md:flex-col items-center md:items-stretch gap-1 md:gap-1.5" aria-label="Customer Navigation">
        <!-- My Deliveries (dashboard) -->
        <a
          routerLink="/customer"
          id="nav-deliveries-link"
          (click)="deliveries.emit()"
          [class.rail-active]="active() === 'deliveries'"
          class="rail-item"
          title="My Deliveries"
          aria-label="My Deliveries"
        >
          <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="7" height="9" x="3" y="3" rx="1"/>
            <rect width="7" height="5" x="14" y="3" rx="1"/>
            <rect width="7" height="9" x="14" y="12" rx="1"/>
            <rect width="7" height="5" x="3" y="16" rx="1"/>
          </svg>
          <span class="rail-label">My Deliveries</span>
        </a>

        <!-- AI Assistant -->
        <a
          routerLink="/customer/assistant"
          id="nav-assistant-link"
          [class.rail-active]="active() === 'assistant'"
          class="rail-item"
          title="AI Assistant"
          aria-label="AI Assistant"
        >
          <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"/>
            <path d="m14 7 3 3"/>
            <path d="M5 6v4"/>
            <path d="M19 14v4"/>
            <path d="M10 2v2"/>
            <path d="M7 8H3"/>
            <path d="M21 16h-4"/>
            <path d="M11 3H9"/>
          </svg>
          <span class="rail-label">AI Assistant</span>
        </a>

        <!-- Book New Delivery -->
        <button
          type="button"
          id="tab-wizard-btn"
          (click)="newDelivery.emit()"
          [class.rail-active]="active() === 'wizard'"
          class="rail-item"
          title="Book New Delivery"
          aria-label="Book New Delivery"
        >
          <span class="rail-cta grid w-7 h-7 -mx-1 shrink-0 place-items-center rounded-lg bg-[#9b432f] text-white shadow-[0_6px_14px_rgba(155,67,47,0.25)]">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </span>
          <span class="rail-label">Book Delivery</span>
        </button>
      </nav>
      </div>

      <!-- Footer Utilities -->
      <div class="hidden md:flex flex-col items-center gap-4">
        <app-notification-bell placement="right" tone="brand"></app-notification-bell>
        <button
          type="button"
          id="nav-settings-btn"
          (click)="settings.emit()"
          [class.rail-active]="active() === 'settings'"
          class="rail-item"
          title="Settings"
          aria-label="Settings"
        >
          <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span class="rail-label">Settings</span>
        </button>
        <button
          type="button"
          id="sidebar-logout-btn"
          (click)="openLogoutConfirm()"
          class="rail-item"
          title="Sign Out"
          aria-label="Sign Out"
        >
          <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span class="rail-label">Log out</span>
        </button>
      </div>
    </aside>

    @if (logoutConfirmOpen()) {
    <div
      id="logout-confirm-modal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#1d1b2c]/40 backdrop-blur-sm p-4"
      (click)="cancelLogout()"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="logout-confirm-title"
        aria-describedby="logout-confirm-desc"
        class="w-full max-w-sm rounded-3xl bg-white border border-[#eee7e0] shadow-xl p-6 space-y-5"
        (click)="$event.stopPropagation()"
      >
        <div class="w-12 h-12 rounded-2xl bg-[#faf6f0] text-[#a53a26] flex items-center justify-center">
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </div>
        <div>
          <h3 id="logout-confirm-title" class="text-base font-black text-[#1d1b2c]">Log out of SwiftDrop?</h3>
          <p id="logout-confirm-desc" class="text-xs text-[#6f6d85] font-medium mt-1">You'll need to sign in again to manage your deliveries.</p>
        </div>
        <div class="flex justify-end gap-3">
          <button
            type="button"
            id="logout-cancel-btn"
            (click)="cancelLogout()"
            class="px-5 py-2.5 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#1d1b2c] text-xs font-bold rounded-full transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            id="logout-confirm-btn"
            (click)="confirmLogout()"
            class="px-5 py-2.5 bg-[#a53a26] hover:bg-[#7e2615] text-white text-xs font-bold rounded-full transition-all cursor-pointer"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
    }
  `,
  styles: [
    `
      :host {
        display: contents;
      }
      /* Nav item, matching the admin sidebar. */
      .rail-item {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2.75rem;
        height: 2.75rem;
        border-radius: 1rem;
        color: #6f6d85;
        cursor: pointer;
        text-decoration: none;
        transition: background-color 0.2s, color 0.2s, box-shadow 0.2s;
      }
      .rail-item:hover {
        background: #fbf7f5;
        color: #9b432f;
      }
      .rail-item.rail-active {
        background: #faf0ec;
        color: #9b432f;
        font-weight: 700;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05), 0 0 0 1px #f2ded8;
      }
      /* Labels stay hidden on mobile and fade in when the rail is hovered (md+). */
      .rail-label {
        display: none;
        margin-left: 0.875rem;
        white-space: nowrap;
        font-size: 0.875rem;
        line-height: 1.25rem;
        font-weight: 500;
        opacity: 0;
        transition: opacity 0.2s;
      }
      .rail-active .rail-label {
        font-weight: 700;
      }
      .rail-brand {
        margin-left: 0;
        font-size: 1rem;
        font-weight: 800;
        letter-spacing: -0.025em;
        color: #211f32;
      }
      @media (min-width: 768px) {
        .rail-item {
          width: 100%;
          justify-content: flex-start;
          padding: 0 0.75rem;
        }
        .rail-label {
          display: inline;
        }
        aside:hover .rail-label,
        aside:focus-within .rail-label {
          opacity: 1;
        }
      }
    `,
  ],
})
export class CustomerSidebarComponent {
  readonly active = input<CustomerSidebarItem>(null);

  readonly deliveries = output<void>();
  readonly newDelivery = output<void>();
  readonly settings = output<void>();
  readonly signOut = output<void>();

  readonly logoutConfirmOpen = signal(false);

  openLogoutConfirm(): void {
    this.logoutConfirmOpen.set(true);
  }

  cancelLogout(): void {
    this.logoutConfirmOpen.set(false);
  }

  confirmLogout(): void {
    this.logoutConfirmOpen.set(false);
    this.signOut.emit();
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.logoutConfirmOpen.set(false);
  }
}
