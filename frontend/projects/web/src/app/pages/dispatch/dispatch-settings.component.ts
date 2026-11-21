import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from 'shared-auth';
import { CustomerChangePasswordComponent } from '../customer/customer-change-password.component';
import { DispatchNotificationsService } from './dispatch-notifications.service';

type SettingsSection = 'profile' | 'security' | 'notifications';

/**
 * Dispatcher account settings, laid out like the customer portal's settings: a section menu on
 * the left and the selected section on the right.
 */
@Component({
  selector: 'app-dispatch-settings',
  standalone: true,
  imports: [FormsModule, CustomerChangePasswordComponent],
  template: `
    <div id="dispatch-settings-panel" class="grid grid-cols-1 md:grid-cols-[15rem_1fr] gap-6 lg:gap-10 items-start">
      <!-- Section menu -->
      <aside class="rounded-3xl bg-[#faf8f6] border border-[#f0ebe5] p-4 md:p-5 md:sticky md:top-24">
        <nav class="flex md:flex-col gap-1 overflow-x-auto" aria-label="Settings sections">
          @for (item of sections; track item.id) {
            <button
              type="button"
              [id]="'settings-nav-' + item.id"
              (click)="selectSection(item.id)"
              [attr.aria-current]="section() === item.id ? 'page' : null"
              [class.bg-[#a53a26]]="section() === item.id"
              [class.text-white]="section() === item.id"
              [class.shadow-md]="section() === item.id"
              [class.text-[#1d1b2c]]="section() !== item.id"
              [class.hover:bg-white]="section() !== item.id"
              class="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer text-left"
            >
              <span
                class="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                [class.bg-white/20]="section() === item.id"
                [class.bg-white]="section() !== item.id"
                [class.text-[#a53a26]]="section() !== item.id"
              >
                @switch (item.id) {
                  @case ('profile') {
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
                  }
                  @case ('security') {
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                  }
                  @case ('notifications') {
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>
                  }
                }
              </span>
              <span>{{ item.label }}</span>
            </button>
          }
        </nav>
      </aside>

      <!-- Selected section -->
      <section class="min-w-0 max-w-3xl">
        @switch (section()) {
          @case ('profile') {
            <div class="flex items-center justify-between gap-4">
              <h2 class="text-xl font-black text-[#1d1b2c] tracking-tight">Personal information</h2>
              @if (!isEditing()) {
                <button
                  type="button"
                  id="dispatch-edit-profile-btn"
                  (click)="startEditing()"
                  class="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#eee7e0] hover:border-[#a53a26] text-[#a53a26] text-xs font-bold rounded-full transition-colors cursor-pointer"
                >
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                  Edit profile
                </button>
              }
            </div>
            <div class="h-px bg-[#f0ebe5] my-6"></div>

            <form id="dispatch-profile-form" (ngSubmit)="saveProfile()" class="space-y-8">
              <div>
                <h3 class="text-sm font-black text-[#1d1b2c]">Profile</h3>
                <p class="text-xs text-[#6f6d85] font-medium mt-0.5">Shown to couriers and the operations team on assignments.</p>

                <div class="flex items-center gap-4 mt-5">
                  <span class="w-14 h-14 flex-shrink-0 rounded-full bg-[#a53a26] text-white flex items-center justify-center font-bold text-base uppercase shadow-sm">{{ initials() }}</span>
                  <div class="min-w-0">
                    <p id="dispatch-settings-name" class="text-sm font-bold text-[#1d1b2c] truncate">{{ name() }}</p>
                    <p class="text-xs text-[#6f6d85] font-medium">Dispatcher account</p>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 mt-6">
                  <div class="sm:col-span-2 sm:max-w-[calc(50%-0.75rem)]">
                    <label for="dispatch-profile-fullname" class="mb-1.5 block text-xs font-bold text-[#1d1b2c]">Full name</label>
                    <input type="text" id="dispatch-profile-fullname" name="fullName" [(ngModel)]="fullName" required [readonly]="!isEditing()" class="settings-input" />
                  </div>
                </div>
              </div>

              <div>
                <h3 class="text-sm font-black text-[#1d1b2c]">Contact details</h3>
                <p class="text-xs text-[#6f6d85] font-medium mt-0.5">Used for shift updates and account recovery.</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 mt-5">
                  <div>
                    <label for="dispatch-profile-email" class="mb-1.5 block text-xs font-bold text-[#1d1b2c]">Email address</label>
                    <input type="email" id="dispatch-profile-email" name="email" [(ngModel)]="email" required [readonly]="!isEditing()" class="settings-input" />
                  </div>
                  <div>
                    <label for="dispatch-profile-phone" class="mb-1.5 block text-xs font-bold text-[#1d1b2c]">Phone number</label>
                    <input
                      type="tel"
                      id="dispatch-profile-phone"
                      name="phone"
                      [(ngModel)]="phone"
                      [placeholder]="isEditing() ? '0771234567' : 'Not provided'"
                      [readonly]="!isEditing()"
                      class="settings-input"
                    />
                  </div>
                </div>
              </div>

              @if (isEditing()) {
                <div class="flex items-center justify-end gap-3 border-t border-[#f0ebe5] pt-6">
                  <button type="button" id="dispatch-cancel-profile-btn" (click)="cancelEditing()" class="px-5 py-2.5 bg-white border border-[#eee7e0] hover:bg-[#faf8f6] text-[#1d1b2c] text-xs font-bold rounded-full transition-all cursor-pointer">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="dispatch-save-profile-btn"
                    [disabled]="!fullName.trim() || !email.trim() || isSaving()"
                    class="px-5 py-2.5 bg-[#a53a26] hover:bg-[#7e2615] text-white text-xs font-bold rounded-full shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {{ isSaving() ? 'Saving...' : 'Save' }}
                  </button>
                </div>
              }
            </form>
          }

          @case ('security') {
            <h2 class="text-xl font-black text-[#1d1b2c] tracking-tight">Security</h2>
            <div class="h-px bg-[#f0ebe5] my-6"></div>
            <app-customer-change-password [email]="userEmail()"></app-customer-change-password>
          }

          @case ('notifications') {
            <h2 class="text-xl font-black text-[#1d1b2c] tracking-tight">Notifications</h2>
            <div class="h-px bg-[#f0ebe5] my-6"></div>
            <h3 class="text-sm font-black text-[#1d1b2c]">Pop-up alerts</h3>
            <p class="text-xs text-[#6f6d85] font-medium mt-0.5">
              Choose which events show a pop-up while you work. Every event is still listed under the bell in the top bar.
            </p>

            <div class="mt-5 divide-y divide-[#f0ebe5] rounded-2xl border border-[#f0ebe5]">
              <label class="flex items-center justify-between gap-4 p-4 cursor-pointer">
                <span>
                  <span class="block text-sm font-bold text-[#1d1b2c]">New parcels in the queue</span>
                  <span class="block text-xs text-[#6f6d85] mt-0.5">When a parcel arrives and needs a courier.</span>
                </span>
                <input type="checkbox" id="pref-queue-alerts" class="toggle" [checked]="notifications.prefs().queueAlerts" (change)="setPref('queueAlerts', $any($event.target).checked)" />
              </label>
              <label class="flex items-center justify-between gap-4 p-4 cursor-pointer">
                <span>
                  <span class="block text-sm font-bold text-[#1d1b2c]">Failed deliveries</span>
                  <span class="block text-xs text-[#6f6d85] mt-0.5">When a courier reports a failed delivery attempt.</span>
                </span>
                <input type="checkbox" id="pref-failed-alerts" class="toggle" [checked]="notifications.prefs().failedAlerts" (change)="setPref('failedAlerts', $any($event.target).checked)" />
              </label>
            </div>
          }
        }
      </section>
    </div>
  `,
  styles: [
    `
      .settings-input {
        width: 100%;
        border-radius: 0.75rem;
        border: 1px solid #eee7e0;
        background: #faf8f6;
        padding: 0.625rem 0.875rem;
        font-size: 0.875rem;
        color: #1d1b2c;
        outline: none;
        transition: background-color 0.15s, border-color 0.15s, box-shadow 0.15s;
      }
      .settings-input:focus {
        background: #fff;
        border-color: #a53a26;
        box-shadow: 0 0 0 3px rgba(165, 58, 38, 0.15);
      }
      .settings-input:read-only {
        background: #fff;
        border-color: #f0ebe5;
        cursor: default;
        box-shadow: none;
      }
      .toggle {
        appearance: none;
        flex-shrink: 0;
        width: 2.5rem;
        height: 1.5rem;
        border-radius: 9999px;
        background: #e8e2dc;
        position: relative;
        cursor: pointer;
        transition: background-color 0.18s ease;
      }
      .toggle::after {
        content: '';
        position: absolute;
        top: 0.1875rem;
        left: 0.1875rem;
        width: 1.125rem;
        height: 1.125rem;
        border-radius: 9999px;
        background: #fff;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
        transition: transform 0.18s ease;
      }
      .toggle:checked {
        background: #a53a26;
      }
      .toggle:checked::after {
        transform: translateX(1rem);
      }
      .toggle:focus-visible {
        outline: 2px solid rgba(165, 58, 38, 0.35);
        outline-offset: 2px;
      }
    `,
  ],
})
export class DispatchSettingsComponent {
  private readonly authService = inject(AuthService, { optional: true });
  readonly notifications = inject(DispatchNotificationsService);

  readonly sections: { id: SettingsSection; label: string }[] = [
    { id: 'profile', label: 'Personal information' },
    { id: 'security', label: 'Security' },
    { id: 'notifications', label: 'Notifications' },
  ];
  readonly section = signal<SettingsSection>('profile');

  readonly name = computed(() => this.authService?.currentUser?.()?.fullName || 'Dispatcher');
  readonly userEmail = computed(() => this.authService?.currentUser?.()?.email || '');
  private readonly userPhone = computed(() => this.authService?.currentUser?.()?.phoneNumber || '');
  readonly initials = computed(() => {
    const parts = this.name().trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (parts[0] ?? 'DP').slice(0, 2).toUpperCase();
  });

  fullName = '';
  email = '';
  phone = '';
  readonly isEditing = signal(false);
  readonly isSaving = signal(false);
  readonly saved = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.resetForm();
  }

  selectSection(section: SettingsSection): void {
    this.section.set(section);
    if (section === 'profile') this.resetForm();
  }

  startEditing(): void {
    this.resetForm();
    this.isEditing.set(true);
  }

  cancelEditing(): void {
    this.resetForm();
  }

  /** Fills the form with the saved details, discarding unsaved edits. */
  resetForm(): void {
    this.fullName = this.authService?.currentUser?.()?.fullName || '';
    this.email = this.userEmail();
    this.phone = this.userPhone();
    this.error.set(null);
    this.saved.set(false);
    this.isEditing.set(false);
  }

  saveProfile(): void {
    if (!this.isEditing() || !this.fullName.trim() || !this.email.trim() || !this.authService) return;
    this.isSaving.set(true);
    this.error.set(null);
    this.saved.set(false);
    this.authService
      .updateProfile({
        fullName: this.fullName.trim(),
        phoneNumber: this.phone.trim() || undefined,
        email: this.email.trim(),
      })
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.isEditing.set(false);
          this.saved.set(true);
          this.notifications.toast('success', 'Profile updated', 'Your personal information has been saved.');
        },
        error: (err) => {
          this.isSaving.set(false);
          const message = err?.error?.message || err?.message || 'Failed to update profile.';
          this.error.set(message);
          this.notifications.toast('error', 'Profile update failed', message);
        },
      });
  }

  setPref(key: 'queueAlerts' | 'failedAlerts', value: boolean): void {
    this.notifications.setPrefs({ ...this.notifications.prefs(), [key]: value });
  }
}
