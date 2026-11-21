import { Component, HostListener, computed, input, output, signal } from '@angular/core';
import { NotificationBellComponent } from '../../notification/notification-bell/notification-bell.component';

/**
 * Shared customer top bar, used by every customer page so its size and
 * profile menu stay identical across pages. Page-specific content (search,
 * back button, ...) is projected into the left slot.
 */
@Component({
  selector: 'app-customer-topbar',
  standalone: true,
  imports: [NotificationBellComponent],
  template: `
    <header
      class="w-full h-[72px] flex-shrink-0 flex items-center justify-between gap-4 px-4 sm:px-8 lg:px-10 border-b border-[#f0ebe5] bg-white sticky top-0 z-30"
    >
      <!-- Page-specific left content -->
      <div class="flex-1 min-w-0 flex items-center">
        <ng-content></ng-content>
      </div>

      <!-- Notifications (mobile) & Profile Menu -->
      <div class="flex items-center gap-3 flex-shrink-0">
        <div class="md:hidden">
          <app-notification-bell></app-notification-bell>
        </div>

        <div id="profile-menu" class="relative">
          <button
            type="button"
            id="profile-menu-btn"
            (click)="toggleMenu()"
            aria-haspopup="menu"
            [attr.aria-expanded]="menuOpen()"
            class="h-11 flex items-center gap-2.5 pl-1.5 pr-3 rounded-full bg-[#faf8f6] border border-[#e8e2dc] hover:border-[#a53a26]/40 transition-colors cursor-pointer"
          >
            <span
              class="w-8 h-8 rounded-full bg-[#a53a26] text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm"
            >
              {{ initials() }}
            </span>
            <span class="text-xs font-bold text-[#1d1b2c] hidden sm:inline">{{ name() }}</span>
            <svg
              class="w-3.5 h-3.5 text-[#6f6d85] transition-transform"
              [class.rotate-180]="menuOpen()"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          @if (menuOpen()) {
          <div
            role="menu"
            id="profile-menu-panel"
            class="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-[#e8e2dc] shadow-lg shadow-[#1d1b2c]/5 py-2 z-30"
          >
            <div class="px-4 py-2 border-b border-[#f0ebe5]">
              <p class="text-xs font-bold text-[#1d1b2c] truncate">{{ name() }}</p>
              <p class="text-[11px] text-[#6f6d85] truncate">{{ email() }}</p>
            </div>
            <button
              type="button"
              role="menuitem"
              id="profile-menu-settings"
              (click)="onSettings()"
              class="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-[#1d1b2c] hover:bg-[#faf8f6] hover:text-[#a53a26] transition-colors cursor-pointer"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <span>Settings</span>
            </button>
            <button
              type="button"
              role="menuitem"
              id="profile-menu-logout"
              (click)="onLogout()"
              class="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-[#a53a26] hover:bg-[#faf8f6] transition-colors cursor-pointer"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Log out</span>
            </button>
          </div>
          }
        </div>
      </div>
    </header>
  `,
  styles: [
    `
      :host {
        display: contents;
      }
    `,
  ],
})
export class CustomerTopbarComponent {
  readonly name = input('');
  readonly email = input('');

  readonly settings = output<void>();
  readonly logout = output<void>();

  readonly menuOpen = signal(false);

  readonly initials = computed(() => {
    const name = this.name().trim();
    if (!name) return 'CU';
    const parts = name.split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  });

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  onSettings(): void {
    this.menuOpen.set(false);
    this.settings.emit();
  }

  onLogout(): void {
    this.menuOpen.set(false);
    this.logout.emit();
  }

  @HostListener('document:click', ['$event'])
  closeOnOutsideClick(event: MouseEvent): void {
    const target = event.target as Element | null;
    if (this.menuOpen() && !target?.closest('#profile-menu')) {
      this.menuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.menuOpen.set(false);
  }
}
