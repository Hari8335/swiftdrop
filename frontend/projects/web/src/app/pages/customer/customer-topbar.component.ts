import { Component, computed, inject, input } from '@angular/core';
import { AuthService } from 'shared-auth';
import { AvatarComponent } from 'ui';
import { NotificationBellComponent } from '../../notification/notification-bell/notification-bell.component';

/**
 * Shared customer top bar, used by every customer page so its size and
 * profile badge stay identical across pages. Page-specific content (search,
 * back button, ...) is projected into the left slot.
 */
@Component({
  selector: 'app-customer-topbar',
  standalone: true,
  imports: [NotificationBellComponent, AvatarComponent],
  template: `
    <header
      class="w-full h-[72px] flex-shrink-0 flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 border-b border-[#ece9e4] bg-white sticky top-0 z-30"
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

        <div id="profile-badge" class="flex items-center gap-3" [attr.title]="email() || null">
          <span class="hidden text-right sm:block">
            <span id="profile-badge-name" class="block max-w-[200px] truncate text-sm font-bold text-[#211f32]">{{ name() || 'Customer' }}</span>
          </span>
          <ui-avatar class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#9b432f] text-xs font-bold uppercase text-white" [src]="avatarSrc()" [initials]="initials()" />
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
  private readonly authService = inject(AuthService, { optional: true });

  /** Optional override; by default the signed-in user's picture is used, so every customer page shows it. */
  readonly avatarUrl = input<string | null | undefined>(undefined);
  /** Initials are shown when there is no picture. */
  readonly avatarSrc = computed(() => this.avatarUrl() ?? this.authService?.currentUser?.()?.avatarUrl ?? null);

  readonly initials = computed(() => {
    const name = this.name().trim();
    if (!name) return 'CU';
    const parts = name.split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  });
}
