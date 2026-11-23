import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AuthService,
  getPasswordComplexityWarning,
  passwordComplexityValidator,
  passwordMatchValidator,
} from 'shared-auth';

import { CustomerToastService } from './customer-toast.service';

type Step = 'start' | 'code' | 'password';

/**
 * In-portal password change for a signed-in customer.
 * Reuses the reset-code flow: email a 6-digit code, verify it, then set the new password —
 * without leaving the customer portal.
 */
@Component({
  selector: 'app-customer-change-password',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div id="change-password" class="space-y-6">
      <!-- Step indicator -->
      @if (step() !== 'start') {
      <ol class="flex items-center gap-2 text-[11px] font-bold" aria-label="Password change progress">
        <li class="flex items-center gap-2 text-[#a53a26]">
          <span class="w-5 h-5 rounded-full bg-[#a53a26] text-white flex items-center justify-center">1</span>
          Verify code
        </li>
        <li class="w-8 h-px bg-[#e8e2dc]" aria-hidden="true"></li>
        <li class="flex items-center gap-2" [class.text-[#a53a26]]="step() === 'password'" [class.text-[#a09eaf]]="step() !== 'password'">
          <span
            class="w-5 h-5 rounded-full flex items-center justify-center"
            [class.bg-[#a53a26]]="step() === 'password'"
            [class.text-white]="step() === 'password'"
            [class.bg-[#f0ebe5]]="step() !== 'password'"
          >2</span>
          New password
        </li>
      </ol>
      }

      @if (error()) {
      <div role="alert" class="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{{ error() }}</div>
      }

      @if (info()) {
      <div role="status" class="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">{{ info() }}</div>
      }

      @switch (step()) {
        @case ('start') {
        <div>
          <h3 class="text-sm font-black text-[#1d1b2c]">Password</h3>
          <p class="text-xs text-[#6f6d85] font-medium mt-0.5">
            We'll email a 6-digit verification code to <span class="font-bold text-[#1d1b2c]">{{ email() }}</span>, then you can choose a new password here.
          </p>
        </div>
        <div class="flex justify-end border-t border-[#f0ebe5] pt-6">
          <button
            type="button"
            id="send-password-code-btn"
            (click)="sendCode()"
            [disabled]="busy() || !email()"
            class="px-5 py-2.5 bg-[#a53a26] hover:bg-[#7e2615] text-white text-xs font-bold rounded-full transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ busy() ? 'Sending code...' : 'Change password' }}
          </button>
        </div>
        }

        @case ('code') {
        <form [formGroup]="codeForm" (ngSubmit)="verifyCode()" class="space-y-6">
          <div>
            <h3 class="text-sm font-black text-[#1d1b2c]">Enter verification code</h3>
            <p class="text-xs text-[#6f6d85] font-medium mt-0.5">
              Check <span class="font-bold text-[#1d1b2c]">{{ email() }}</span> for the 6-digit code. It expires in 10 minutes.
            </p>
          </div>
          <div class="sm:max-w-[calc(50%-0.75rem)]">
            <div class="flex items-center justify-between mb-1.5">
              <label for="password-code" class="block text-xs font-bold text-[#1d1b2c]">6-digit code</label>
              <button
                type="button"
                id="resend-password-code-btn"
                (click)="sendCode(true)"
                [disabled]="busy()"
                class="text-[11px] font-bold text-[#a53a26] hover:underline cursor-pointer disabled:opacity-50"
              >
                Resend code
              </button>
            </div>
            <input
              id="password-code"
              formControlName="code"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="6"
              placeholder="000000"
              class="w-full rounded-xl border border-[#eee7e0] bg-[#faf8f6] px-3.5 py-2.5 text-sm font-bold tracking-[0.4em] text-[#1d1b2c] outline-none focus:bg-white focus:border-[#a53a26] focus:ring-2 focus:ring-[#a53a26]/15 transition-colors"
            />
            @if (codeForm.controls.code.invalid && codeForm.controls.code.touched) {
            <p class="text-[11px] font-semibold text-rose-600 mt-1.5">Enter the 6-digit code from your email.</p>
            }
          </div>
          <div class="flex items-center justify-end gap-3 border-t border-[#f0ebe5] pt-6">
            <button type="button" (click)="reset()" class="px-5 py-2.5 bg-white border border-[#eee7e0] hover:bg-[#faf8f6] text-[#1d1b2c] text-xs font-bold rounded-full transition-all cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              id="verify-password-code-btn"
              [disabled]="codeForm.invalid || busy()"
              class="px-5 py-2.5 bg-[#a53a26] hover:bg-[#7e2615] text-white text-xs font-bold rounded-full transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ busy() ? 'Verifying...' : 'Verify code' }}
            </button>
          </div>
        </form>
        }

        @case ('password') {
        <form [formGroup]="passwordForm" (ngSubmit)="savePassword()" class="space-y-6">
          <div>
            <h3 class="text-sm font-black text-[#1d1b2c]">Choose a new password</h3>
            <p class="text-xs text-[#6f6d85] font-medium mt-0.5">At least 8 characters, with an uppercase letter, a number and a special character.</p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            <div>
              <label for="new-password" class="mb-1.5 block text-xs font-bold text-[#1d1b2c]">New password</label>
              <input
                id="new-password"
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="newPassword"
                autocomplete="new-password"
                class="w-full rounded-xl border border-[#eee7e0] bg-[#faf8f6] px-3.5 py-2.5 text-sm text-[#1d1b2c] outline-none focus:bg-white focus:border-[#a53a26] focus:ring-2 focus:ring-[#a53a26]/15 transition-colors"
              />
              @if (passwordWarning()) {
              <p class="text-[11px] font-semibold text-rose-600 mt-1.5">{{ passwordWarning() }}</p>
              }
            </div>
            <div>
              <label for="confirm-password" class="mb-1.5 block text-xs font-bold text-[#1d1b2c]">Confirm new password</label>
              <input
                id="confirm-password"
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="confirmPassword"
                autocomplete="new-password"
                class="w-full rounded-xl border border-[#eee7e0] bg-[#faf8f6] px-3.5 py-2.5 text-sm text-[#1d1b2c] outline-none focus:bg-white focus:border-[#a53a26] focus:ring-2 focus:ring-[#a53a26]/15 transition-colors"
              />
              @if (passwordForm.controls.confirmPassword.hasError('passwordMismatch') && passwordForm.controls.confirmPassword.touched) {
              <p class="text-[11px] font-semibold text-rose-600 mt-1.5">Passwords do not match.</p>
              }
            </div>
          </div>
          <label class="inline-flex items-center gap-2 text-xs font-semibold text-[#6f6d85] cursor-pointer">
            <input type="checkbox" [checked]="showPassword()" (change)="showPassword.set(!showPassword())" class="accent-[#a53a26]" />
            Show passwords
          </label>
          <div class="flex items-center justify-end gap-3 border-t border-[#f0ebe5] pt-6">
            <button type="button" (click)="reset()" class="px-5 py-2.5 bg-white border border-[#eee7e0] hover:bg-[#faf8f6] text-[#1d1b2c] text-xs font-bold rounded-full transition-all cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              id="save-password-btn"
              [disabled]="passwordForm.invalid || busy()"
              class="px-5 py-2.5 bg-[#a53a26] hover:bg-[#7e2615] text-white text-xs font-bold rounded-full transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ busy() ? 'Saving...' : 'Update password' }}
            </button>
          </div>
        </form>
        }

      }
    </div>
  `,
})
export class CustomerChangePasswordComponent {
  private readonly auth = inject(AuthService, { optional: true });
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(CustomerToastService);

  readonly email = input('');
  readonly completed = output<void>();

  readonly step = signal<Step>('start');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly info = signal<string | null>(null);
  readonly showPassword = signal(false);
  private verifiedCode = '';

  readonly codeForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  readonly passwordForm = this.fb.nonNullable.group(
    {
      newPassword: ['', [Validators.required, Validators.maxLength(128), passwordComplexityValidator]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator },
  );

  passwordWarning(): string | null {
    const control = this.passwordForm.controls.newPassword;
    if (!control.touched && !control.dirty) return null;
    if (control.hasError('minlength')) return 'Password must be at least 8 characters.';
    return getPasswordComplexityWarning(control.value);
  }

  sendCode(resend = false): void {
    const email = this.email().trim().toLowerCase();
    if (!email || !this.auth) return;
    this.busy.set(true);
    this.error.set(null);
    this.info.set(null);
    this.auth.forgotPassword({ email }).subscribe({
      next: () => {
        this.busy.set(false);
        this.step.set('code');
        this.info.set(resend ? 'A new code is on its way to your inbox.' : null);
        this.toast.success(resend ? 'New code sent' : 'Verification code sent', `Check ${email} for your 6-digit code.`);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.message || 'Could not send the code. Please try again.');
      },
    });
  }

  verifyCode(): void {
    if (this.codeForm.invalid || !this.auth) {
      this.codeForm.markAllAsTouched();
      return;
    }
    const code = this.codeForm.controls.code.value;
    this.busy.set(true);
    this.error.set(null);
    this.info.set(null);
    this.auth.verifyResetCode({ email: this.email().trim().toLowerCase(), token: code }).subscribe({
      next: () => {
        this.busy.set(false);
        this.verifiedCode = code;
        this.step.set('password');
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.message || 'This code is invalid or expired. Request a new one.');
      },
    });
  }

  savePassword(): void {
    if (this.passwordForm.invalid || !this.auth) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.auth
      .resetPassword({
        email: this.email().trim().toLowerCase(),
        token: this.verifiedCode,
        newPassword: this.passwordForm.controls.newPassword.value,
      })
      .subscribe({
        next: (response) => {
          this.busy.set(false);
          // Keep the customer signed in with the session issued for the new password.
          if (response?.accessToken && response.user) {
            this.auth!.setSession(response.accessToken, response.user);
          }
          this.reset();
          this.info.set('Password successfully updated! Use your new password the next time you sign in.');
          this.toast.success('Password updated', 'Use your new password the next time you sign in.');
          this.completed.emit();
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(err?.error?.message || 'Could not update your password. Please try again.');
        },
      });
  }

  /** Back to the first step, discarding any code or password typed so far. */
  reset(): void {
    this.clearForms();
    this.error.set(null);
    this.info.set(null);
    this.step.set('start');
  }

  private clearForms(): void {
    this.verifiedCode = '';
    this.codeForm.reset();
    this.passwordForm.reset();
    this.showPassword.set(false);
  }
}
