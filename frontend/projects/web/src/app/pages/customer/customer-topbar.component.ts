import { Component, computed, input } from '@angular/core';
import { NotificationBellComponent } from '../../notification/notification-bell/notification-bell.component';

/**
 * Shared customer top bar, used by every customer page so its size and
 * profile badge stay identical across pages. Page-specific content (search,
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

      <!-- Notifications & Profile Badge -->
      <div class="flex items-center gap-3 flex-shrink-0">
        <div
          id="topbar-notifications"
          class="mr-1 sm:mr-2 rounded-xl border border-[#e8e4df] bg-white shadow-sm transition hover:border-[#d7b4a7]"
        >
          <app-notification-bell></app-notification-bell>
        </div>

        <div
          id="profile-badge"
          class="h-11 flex items-center gap-2.5 pl-1.5 pr-4 rounded-full bg-[#faf8f6] border border-[#e8e2dc]"
          [attr.title]="email() || null"
        >
          <span
            class="w-8 h-8 rounded-full bg-[#a53a26] text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm"
          >
            {{ initials() }}
          </span>
          <span class="text-xs font-bold text-[#1d1b2c] hidden sm:inline">{{ name() }}</span>
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

  readonly initials = computed(() => {
    const name = this.name().trim();
    if (!name) return 'CU';
    const parts = name.split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  });
}
