import { Component, Injectable, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from 'shared-auth';
import { CustomerChangePasswordComponent } from '../customer/customer-change-password.component';
import { CustomerToastKind, CustomerToastService } from '../customer/customer-toast.service';
import { MerchantProfile } from './merchant.model';
import { MerchantNotificationsService } from './merchant-notifications.service';

/**
 * The shared change-password form reports through CustomerToastService, whose pop-ups only the
 * customer portal renders. Inside merchant Settings, route them to the merchant pop-up and bell.
 */
@Injectable()
export class MerchantSettingsToastService extends CustomerToastService {
  private readonly merchantNotifications = inject(MerchantNotificationsService);

  override show(kind: CustomerToastKind, title: string, message = ''): void {
    this.merchantNotifications.add(title, message, kind);
  }
}

type SettingsSection = 'profile' | 'security';

export const MERCHANT_STATUS_LABELS: Record<MerchantProfile['status'], string> = {
  APPROVED: 'Approved',
  PENDING: 'Pending approval',
  REJECTED: 'Rejected',
  SUSPENDED: 'Suspended',
};

/**
 * Merchant account settings: the signed-in user's contact details (editable) alongside the
 * registered business identity (read-only), plus password management.
 */
@Component({
  selector: 'app-merchant-settings',
  standalone: true,
  imports: [FormsModule, CustomerChangePasswordComponent],
  providers: [{ provide: CustomerToastService, useClass: MerchantSettingsToastService }],
  template: `
    <div id="merchant-settings-panel" class="mx-auto w-full max-w-7xl">
      <h1 class="text-2xl sm:text-3xl font-black text-[#1d1b2c] tracking-tight">Settings</h1>

      <div class="mt-6 grid grid-cols-1 md:grid-cols-[15rem_1fr] gap-6 lg:gap-10 items-start">
        <!-- Section menu -->
        <aside class="rounded-3xl bg-[#faf8f6] border border-[#f0ebe5] p-4 md:p-5 md:sticky md:top-24">
          <nav class="flex md:flex-col gap-1 overflow-x-auto" aria-label="Settings sections">
            @for (item of sections; track item.id) {
              <button
                type="button"
                [id]="'merchant-settings-nav-' + item.id"
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
                  @if (item.id === 'profile') {
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
                  } @else {
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                  }
                </span>
                <span>{{ item.label }}</span>
              </button>
            }
          </nav>
        </aside>

        <!-- Selected section -->
        <section class="min-w-0 max-w-3xl">
          @if (section() === 'profile') {
            <div class="flex items-center justify-between gap-4">
              <h2 class="text-xl font-black text-[#1d1b2c] tracking-tight">Personal information</h2>
              @if (!isEditing()) {
                <button
                  type="button"
                  id="merchant-settings-edit-btn"
                  (click)="startEditing()"
                  class="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#eee7e0] hover:border-[#a53a26] text-[#a53a26] text-xs font-bold rounded-full transition-colors cursor-pointer"
                >
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                  Edit profile
                </button>
              }
            </div>
            <div class="h-px bg-[#f0ebe5] my-6"></div>

            <form id="merchant-settings-form" (ngSubmit)="saveProfile()" class="space-y-8">
              <div>
                <h3 class="text-sm font-black text-[#1d1b2c]">Business</h3>
                <p class="text-xs text-[#6f6d85] font-medium mt-0.5">Shown to customers on tracking pages and to the SwiftDrop operations team.</p>

                <div class="flex items-center gap-4 mt-5">
                  <span class="w-14 h-14 flex-shrink-0 rounded-full bg-[#a53a26] text-white flex items-center justify-center font-bold text-base uppercase shadow-sm">{{ initials() }}</span>
                  <div class="min-w-0">
                    <p id="merchant-settings-business-name" class="text-sm font-bold text-[#1d1b2c] truncate">{{ businessName() || 'Business name unavailable' }}</p>
                    <div class="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[#6f6d85] font-medium">
                      <span>Merchant account</span>
                      @if (status()) {
                        <span id="merchant-settings-status" class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold" [class]="statusClass()">{{ statusLabel() }}</span>
                      }
                    </div>
                  </div>
                </div>
                <p class="mt-4 text-[11px] text-[#8a8799] font-medium">The business name comes from your registration. Contact SwiftDrop support to change it.</p>
              </div>

              <div>
                <h3 class="text-sm font-black text-[#1d1b2c]">Account holder</h3>
                <p class="text-xs text-[#6f6d85] font-medium mt-0.5">The person who signs in to this portal. Used for order alerts and account recovery.</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 mt-5">
                  <div class="sm:col-span-2 sm:max-w-[calc(50%-0.75rem)]">
                    <label for="merchant-settings-fullname" class="mb-1.5 block text-xs font-bold text-[#1d1b2c]">Full name</label>
                    <input type="text" id="merchant-settings-fullname" name="fullName" [(ngModel)]="fullName" required [readonly]="!isEditing()" [placeholder]="isEditing() ? '' : 'Not provided'" class="settings-input" />
                  </div>
                  <div>
                    <label for="merchant-settings-email" class="mb-1.5 block text-xs font-bold text-[#1d1b2c]">Email address</label>
                    <input type="email" id="merchant-settings-email" name="email" [(ngModel)]="email" required [readonly]="!isEditing()" [placeholder]="isEditing() ? '' : emailFallback()" class="settings-input" />
                  </div>
                  <div>
                    <label for="merchant-settings-phone" class="mb-1.5 block text-xs font-bold text-[#1d1b2c]">Phone number</label>
                    <input type="tel" id="merchant-settings-phone" name="phone" [(ngModel)]="phone" [readonly]="!isEditing()" [placeholder]="isEditing() ? '0771234567' : 'Not provided'" class="settings-input" />
                  </div>
                </div>
              </div>

              @if (error()) {
                <div id="merchant-settings-error" role="alert" class="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{{ error() }}</div>
              }

              @if (isEditing()) {
                <div class="flex items-center justify-end gap-3 border-t border-[#f0ebe5] pt-6">
                  <button type="button" id="merchant-settings-cancel-btn" (click)="cancelEditing()" class="px-5 py-2.5 bg-white border border-[#eee7e0] hover:bg-[#faf8f6] text-[#1d1b2c] text-xs font-bold rounded-full transition-all cursor-pointer">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="merchant-settings-save-btn"
                    [disabled]="!fullName.trim() || !email.trim() || isSaving()"
                    class="px-5 py-2.5 bg-[#a53a26] hover:bg-[#7e2615] text-white text-xs font-bold rounded-full shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {{ isSaving() ? 'Saving...' : 'Save changes' }}
                  </button>
                </div>
              }
            </form>
          } @else {
            <h2 class="text-xl font-black text-[#1d1b2c] tracking-tight">Security</h2>
            <div class="h-px bg-[#f0ebe5] my-6"></div>
            <app-customer-change-password [email]="userEmail()"></app-customer-change-password>
          }
        </section>
      </div>
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
    `,
  ],
})
export class MerchantSettingsComponent implements OnInit {
  private readonly authService = inject(AuthService, { optional: true });

  /** Registered business name from GET /api/v1/merchant/profile (read-only here). */
  readonly businessName = input<string | null | undefined>(null);
  readonly status = input<MerchantProfile['status'] | null | undefined>(null);
  /** Shown in the read-only email field when the account has no email yet (e.g. "Loading email..."). */
  readonly emailFallback = input('Not provided');
  /** Opens Personal information directly in edit mode (used by "Edit profile" elsewhere in the portal). */
  readonly startInEditMode = input(false);

  readonly profileSaved = output<void>();
  readonly profileSaveFailed = output<string>();

  readonly sections: { id: SettingsSection; label: string }[] = [
    { id: 'profile', label: 'Personal information' },
    { id: 'security', label: 'Security' },
  ];
  readonly section = signal<SettingsSection>('profile');

  readonly userEmail = computed(() => this.authService?.currentUser?.()?.email || '');
  readonly initials = computed(() => {
    const source = this.businessName()?.trim() || this.authService?.currentUser?.()?.fullName?.trim() || 'Merchant';
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (parts[0] ?? 'M').slice(0, 2).toUpperCase();
  });
  readonly statusLabel = computed(() => {
    const status = this.status();
    return status ? MERCHANT_STATUS_LABELS[status] : '';
  });
  readonly statusClass = computed(() => {
    switch (this.status()) {
      case 'APPROVED': return 'bg-emerald-50 text-emerald-700';
      case 'PENDING': return 'bg-amber-50 text-amber-700';
      default: return 'bg-rose-50 text-rose-700';
    }
  });

  fullName = '';
  email = '';
  phone = '';
  readonly isEditing = signal(false);
  readonly isSaving = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.resetForm();
    if (this.startInEditMode()) this.isEditing.set(true);
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

  /** Fills the form with the saved details (never display placeholders), discarding unsaved edits. */
  resetForm(): void {
    const user = this.authService?.currentUser?.();
    this.fullName = user?.fullName || '';
    this.email = user?.email || '';
    this.phone = user?.phoneNumber || '';
    this.error.set(null);
    this.isEditing.set(false);
  }

  saveProfile(): void {
    if (!this.isEditing() || !this.fullName.trim() || !this.email.trim() || !this.authService) return;
    this.isSaving.set(true);
    this.error.set(null);
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
          this.profileSaved.emit();
        },
        error: (err) => {
          this.isSaving.set(false);
          const message = err?.error?.message || err?.message || 'Failed to update profile.';
          this.error.set(message);
          this.profileSaveFailed.emit(message);
        },
      });
  }
}
