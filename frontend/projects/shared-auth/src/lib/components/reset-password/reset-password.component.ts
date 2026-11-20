import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AuthShellComponent } from '../auth-shell/auth-shell.component';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import {
  passwordComplexityValidator,
  getPasswordComplexityWarning,
} from '../../validators/password.validator';

export const passwordMatchValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const newPassword = control.get('newPassword');
  const confirmPassword = control.get('confirmPassword');

  if (!newPassword || !confirmPassword) {
    return null;
  }

  if (confirmPassword.errors && !confirmPassword.errors['passwordMismatch']) {
    return null;
  }

  if (newPassword.value !== confirmPassword.value) {
    confirmPassword.setErrors({ passwordMismatch: true });
    return { passwordMismatch: true };
  } else {
    confirmPassword.setErrors(null);
    return null;
  }
};

@Component({
  selector: 'lib-reset-password',
  standalone: true,
  imports: [AuthShellComponent, CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <lib-auth-shell active="signin" [badge]="heroCopy().badge" [headline]="heroCopy().headline" [lede]="heroCopy().lede" [steps]="heroCopy().steps" [stepsLabel]="heroCopy().stepsLabel">
          <div class="card-header">
            <span class="card-pill">{{ firstLogin() ? (portalRole() === 'merchant' ? 'Merchant Activation' : 'Account Activation') : 'Password Reset' }}</span>
            <h2>{{ firstLogin() || codeVerified() ? 'Create new password' : 'Enter reset code' }}</h2>
            <p>{{ firstLogin() ? 'Welcome! Set your permanent password to activate your account.' : (codeVerified() ? 'Choose a strong password with at least 8 characters' : 'Enter the 6-digit code sent to your email. It expires in 10 minutes.') }}</p>
          </div>

          @if (missingEmail()) {
            <div class="error-banner" role="alert">
              <svg class="banner-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
              <div>
                <strong>Missing email address</strong>
                <p>Please request a new password reset code.</p>
              </div>
            </div>
            <div class="auth-footer">
              <p><a routerLink="/forgot-password">Request a new reset code</a></p>
            </div>
          } @else if (isSuccess()) {
            <div class="success-banner" role="status">
              <svg class="banner-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
              <div>
                <strong>Password updated!</strong>
                <p>{{ successMessage() }}</p>
              </div>
            </div>
            <button type="button" class="submit-btn" (click)="navigateToPortal()">
              Open your portal
            </button>
          } @else {
            @if (errorMessage()) {
              <div class="error-banner" role="alert">
                <svg class="banner-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
                <span>{{ errorMessage() }}</span>
              </div>
            }

            @if (!firstLogin() && !codeVerified()) {
              <form [formGroup]="codeForm" (ngSubmit)="verifyCode()" class="auth-form">
                @if (resendSuccessMessage()) {
                  <div class="resend-success-banner" role="status">
                    {{ resendSuccessMessage() }}
                  </div>
                }

                <div class="form-group">
                  <div class="code-label-row">
                    <label for="resetCode">6-digit reset code</label>
                    <button type="button" class="resend-btn" (click)="resendCode()" [disabled]="isResending()">
                      {{ isResending() ? 'Sending...' : 'Resend code' }}
                    </button>
                  </div>
                  <input
                    id="resetCode"
                    type="text"
                    inputmode="numeric"
                    maxlength="6"
                    formControlName="token"
                    placeholder="000000"
                    [class.invalid]="isCodeFieldInvalid()"
                    autocomplete="one-time-code"
                  />
                  @if (isCodeFieldInvalid()) {
                    <span class="field-error">Enter the 6-digit code from your email</span>
                  }
                </div>
                <button type="submit" class="submit-btn" [disabled]="codeForm.invalid || isLoading()">
                  @if (isLoading()) {
                    <span class="spinner"></span> Verifying code...
                  } @else {
                    Verify code
                  }
                </button>
              </form>
            } @else {
              <form [formGroup]="resetForm" (ngSubmit)="onSubmit()" class="auth-form">
                <div class="form-group">
                  <label for="newPassword">New password</label>
                  <div class="password-input-wrapper">
                    <input
                      id="newPassword"
                      [type]="showPassword() ? 'text' : 'password'"
                      formControlName="newPassword"
                      placeholder="At least 8 characters"
                      [class.invalid]="!!getPasswordErrorMessage()"
                      (focus)="onPasswordFocus()"
                      (blur)="onPasswordBlur()"
                      autocomplete="new-password"
                    />
                    <button
                      type="button"
                      class="toggle-visibility"
                      (click)="toggleShowPassword()"
                      [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
                      [title]="showPassword() ? 'Hide password' : 'Show password'"
                    >
                      @if (showPassword()) {
                        <svg class="eye-icon" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.7 10.7 0 0 1 12 5c5.2 0 9 5.5 9 7s-3.8 7-9 7a9.7 9.7 0 0 1-4.8-1.3M6.5 16.5C4.3 14.8 3 12.6 3 12c0-1 1.6-3.4 4.1-5.1" />
                        </svg>
                      } @else {
                        <svg class="eye-icon" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
                          <circle cx="12" cy="12" r="2.5" />
                        </svg>
                      }
                    </button>
                  </div>
                  @if (getPasswordErrorMessage()) {
                    <span class="field-error">{{ getPasswordErrorMessage() }}</span>
                  }
                </div>

                <div class="form-group">
                  <label for="confirmPassword">Confirm password</label>
                  <div class="password-input-wrapper">
                    <input
                      id="confirmPassword"
                      [type]="showConfirmPassword() ? 'text' : 'password'"
                      formControlName="confirmPassword"
                      placeholder="Re-enter password"
                      (focus)="onConfirmPasswordFocus()"
                      [class.invalid]="isFieldInvalid('confirmPassword') || hasMismatchError()"
                      autocomplete="new-password"
                    />
                    <button
                      type="button"
                      class="toggle-visibility"
                      (click)="toggleShowConfirmPassword()"
                      [attr.aria-label]="showConfirmPassword() ? 'Hide password' : 'Show password'"
                      [title]="showConfirmPassword() ? 'Hide password' : 'Show password'"
                    >
                      @if (showConfirmPassword()) {
                        <svg class="eye-icon" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.7 10.7 0 0 1 12 5c5.2 0 9 5.5 9 7s-3.8 7-9 7a9.7 9.7 0 0 1-4.8-1.3M6.5 16.5C4.3 14.8 3 12.6 3 12c0-1 1.6-3.4 4.1-5.1" />
                        </svg>
                      } @else {
                        <svg class="eye-icon" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
                          <circle cx="12" cy="12" r="2.5" />
                        </svg>
                      }
                    </button>
                  </div>
                  @if (isFieldInvalid('confirmPassword')) {
                    <span class="field-error">Please confirm your password</span>
                  } @else if (hasMismatchError()) {
                    <span class="field-error">Passwords do not match</span>
                  }
                </div>

                <button
                  type="submit"
                  class="submit-btn"
                  [disabled]="resetForm.invalid || isLoading()"
                >
                  @if (isLoading()) {
                    <span class="spinner"></span> Updating password...
                  } @else {
                    {{ firstLogin() ? 'Set Password & Enter Portal' : 'Reset password' }}
                  }
                </button>
              </form>
            }

            <div class="auth-footer">
              <p>Need a different code? <a routerLink="/forgot-password">Start again</a></p>
            </div>
          }
    </lib-auth-shell>
  `,
  styles: [`
    :host {
      display: block;
      --disp: ui-rounded, 'SF Pro Rounded', 'Nunito', system-ui, -apple-system, sans-serif;
      --terracotta: #a53a26;
      --coral: #f2533a;
      --ink: #1d1b2c;
      --ink-3: #6f6d85;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, 'Segoe UI', Roboto, sans-serif;
    }
    .submit-btn:hover:not(:disabled) {
      background: #000;
      transform: translateY(-1px);
    }
    .card-header {
      margin-bottom: 1.75rem;
      text-align: left;
    }
    .card-pill {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--terracotta);
      background: rgba(165,58,38,0.08);
      border-radius: 9999px;
      margin-bottom: 0.6rem;
    }
    .card-header h2 {
      font-family: var(--disp);
      font-size: 1.85rem;
      font-weight: 900;
      color: var(--ink);
      letter-spacing: -0.025em;
      margin: 0 0 0.4rem;
    }
    .card-header p {
      font-size: 0.95rem;
      color: var(--ink-3);
      margin: 0;
      line-height: 1.45;
    }
    .success-banner {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
      padding: 1rem 1.15rem;
      border-radius: 14px;
      margin-bottom: 1.5rem;
      font-size: 0.875rem;
      line-height: 1.45;
    }
    .success-banner strong {
      display: block;
      color: #15803d;
      margin-bottom: 0.25rem;
    }
    .success-banner p {
      margin: 0;
      color: #166534;
    }
    .error-banner {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      padding: 0.85rem 1.15rem;
      border-radius: 14px;
      margin-bottom: 1.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      line-height: 1.4;
    }
    .error-banner strong {
      display: block;
      color: #dc2626;
      margin-bottom: 0.2rem;
    }
    .error-banner p {
      margin: 0;
      color: #b91c1c;
    }
    .banner-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }
    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }
    .form-group label {
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--ink);
    }
    .form-group input {
      height: 48px;
      padding: 0 1.15rem;
      border-radius: 14px;
      border: 1.5px solid #e5e5ed;
      background: #fbfbfd;
      color: var(--ink);
      font-size: 0.95rem;
      font-family: inherit;
      transition: all 0.2s ease;
      box-sizing: border-box;
      width: 100%;
    }
    .form-group input:focus {
      outline: none;
      background: #fff;
      border-color: var(--terracotta);
      box-shadow: 0 0 0 3px rgba(165,58,38,0.12);
    }
    .code-label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .resend-btn {
      background: none;
      border: none;
      color: var(--terracotta);
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      padding: 0;
      font-family: inherit;
      text-decoration: underline;
      transition: color 0.15s;
    }
    .resend-btn:hover:not(:disabled) {
      color: var(--coral);
    }
    .resend-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .resend-success-banner {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
      padding: 0.6rem 0.85rem;
      border-radius: 10px;
      font-size: 0.825rem;
      font-weight: 600;
    }
    #resetCode {
      letter-spacing: 0.4em;
      text-align: center;
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--ink);
    }
    .form-group input.invalid {
      border-color: #ef4444;
      background: #fff5f5;
    }
    .password-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }
    .password-input-wrapper input {
      width: 100%;
      height: 48px;
      padding: 0 3.25rem 0 1.15rem;
      border-radius: 14px;
      border: 1.5px solid #e5e5ed;
      background: #fbfbfd;
      color: var(--ink);
      font-size: 0.95rem;
      font-family: inherit;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }
    .password-input-wrapper input:focus {
      outline: none;
      background: #fff;
      border-color: var(--terracotta);
      box-shadow: 0 0 0 3px rgba(165,58,38,0.12);
    }
    .password-input-wrapper input.invalid {
      border-color: #ef4444;
      background: #fff5f5;
    }
    .toggle-visibility {
      position: absolute;
      right: 0.75rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.25rem;
      height: 2.25rem;
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--ink-3);
      cursor: pointer;
      border-radius: 8px;
      transition: color 0.2s;
    }
    .toggle-visibility:hover {
      color: var(--ink);
    }
    .eye-icon {
      width: 1.25rem;
      height: 1.25rem;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }
    .field-error {
      font-size: 0.75rem;
      font-weight: 600;
      color: #dc2626;
      margin-top: 0.15rem;
    }
    .submit-btn {
      margin-top: 0.5rem;
      height: 50px;
      padding: 0 1.5rem;
      border-radius: 9999px;
      border: none;
      background: var(--ink);
      color: #fff;
      font-size: 0.95rem;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 0.6rem;
      transition: all 0.2s ease;
      font-family: inherit;
      box-shadow: 0 8px 18px -4px rgba(29,27,44,0.3);
      width: 100%;
    }
    .submit-btn:hover:not(:disabled) {
      background: #000;
      transform: translateY(-1px);
      box-shadow: 0 12px 24px -6px rgba(29,27,44,0.4);
    }
    .submit-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }
    .spinner {
      width: 1rem;
      height: 1rem;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .auth-footer {
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid #f0f0f5;
      text-align: center;
      font-size: 0.9rem;
      color: var(--ink-3);
    }
    .auth-footer p {
      margin: 0;
    }
    .auth-footer a {
      color: var(--terracotta);
      text-decoration: none;
      font-weight: 700;
      transition: color 0.15s;
    }
    .auth-footer a:hover {
      color: var(--coral);
      text-decoration: underline;
    }
    @media (max-width: 640px) {
      .card-header h2 { font-size: 1.5rem; }
    }
  `]
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  email = signal<string | null>(null);
  readonly portalRole = signal<string | null>(null);
  token = signal<string | null>(null);
  readonly missingEmail = signal(false);
  readonly firstLogin = signal(false);
  readonly codeVerified = signal(false);

  /** Text beside the form: first sign-in with a temporary password, or recovering a forgotten one. */
  readonly heroCopy = computed(() => {
    if (this.firstLogin()) {
      const merchant = this.portalRole()?.toLowerCase() === 'merchant';
      return {
        badge: merchant ? 'Merchant account activation' : 'Account activation',
        headline: 'Set your own password',
        lede: 'You signed in with the temporary password from your email. Choose your own password to finish setting up your account.',
        steps: [] as readonly string[],
        stepsLabel: '',
      };
    }
    return {
      badge: 'Password recovery',
      headline: 'Choose a new password',
      lede: 'Enter the code we emailed you, then pick a new password for your account.',
      steps: [
        'Enter the email address of your account',
        'Check your inbox for a reset code',
        'Enter the code and choose a new password',
      ] as readonly string[],
      stepsLabel: 'How password recovery works',
    };
  });
  readonly isLoading = signal(false);
  readonly isResending = signal(false);
  readonly resendSuccessMessage = signal<string | null>(null);
  readonly isSuccess = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly isPasswordFocused = signal(false);
  readonly hasLeftPassword = signal(false);

  readonly codeForm: FormGroup = this.fb.group({
    token: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  readonly resetForm: FormGroup = this.fb.group(
    {
      newPassword: ['', [Validators.required, Validators.maxLength(128), passwordComplexityValidator]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator }
  );

  ngOnInit(): void {
    const rawEmail = this.route.snapshot.queryParamMap.get('email');
    if (!rawEmail || !rawEmail.trim()) {
      this.missingEmail.set(true);
    } else {
      this.email.set(rawEmail.trim().toLowerCase());
    }
    this.firstLogin.set(this.route.snapshot.queryParamMap.get('firstLogin') === 'true');
    this.portalRole.set(this.route.snapshot.queryParamMap.get('role')?.toLowerCase() || null);
  }

  toggleShowPassword(): void {
    this.showPassword.update((v) => !v);
  }

  toggleShowConfirmPassword(): void {
    this.showConfirmPassword.update((v) => !v);
  }

  onPasswordFocus(): void {
    this.isPasswordFocused.set(true);
  }

  onPasswordBlur(): void {
    this.isPasswordFocused.set(false);
    this.hasLeftPassword.set(true);
  }

  onConfirmPasswordFocus(): void {
    this.hasLeftPassword.set(true);
  }

  getPasswordErrorMessage(): string | null {
    const control = this.resetForm.get('newPassword');
    if (!control) return null;

    const val = (control.value as string) || '';
    const isDirty = control.dirty;
    const isTouched = control.touched || this.hasLeftPassword();
    const isFocused = this.isPasswordFocused();

    if (!isDirty && !isTouched) {
      return null;
    }

    if (!val && isTouched) {
      return 'Password must be at least 8 characters';
    }

    if (val.length < 8) {
      return 'Password must be at least 8 characters';
    }

    if (isFocused && !this.hasLeftPassword() && !control.touched) {
      return null;
    }

    return getPasswordComplexityWarning(val);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.resetForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  isCodeFieldInvalid(): boolean {
    const field = this.codeForm.get('token');
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  hasMismatchError(): boolean {
    const confirm = this.resetForm.get('confirmPassword');
    return !!(confirm && confirm.hasError('passwordMismatch') && (confirm.dirty || confirm.touched));
  }

  verifyCode(): void {
    if (this.codeForm.invalid || !this.email()) {
      this.codeForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    const token = this.codeForm.value.token as string;
    this.authService.verifyResetCode({ email: this.email()!, token }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.token.set(token);
        this.codeVerified.set(true);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err.error?.message || 'This code is invalid or expired. Please request a new code.'
        );
      },
    });
  }

  resendCode(): void {
    if (!this.email() || this.isResending()) return;
    this.isResending.set(true);
    this.resendSuccessMessage.set(null);
    this.errorMessage.set(null);

    this.authService.forgotPassword({ email: this.email()! }).subscribe({
      next: (response) => {
        this.isResending.set(false);
        this.resendSuccessMessage.set(
          response.message || 'New reset code sent! Please check your email inbox.'
        );
      },
      error: (err) => {
        this.isResending.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to resend code. Please try again.');
      },
    });
  }

  onSubmit(): void {
    this.hasLeftPassword.set(true);
    if (this.resetForm.invalid || !this.email() || (!this.firstLogin() && !this.token())) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    if (this.firstLogin()) {
      this.authService.changeInitialPassword(this.resetForm.value.newPassword).subscribe({
        next: (response) => {
          this.isLoading.set(false);
          this.isSuccess.set(true);
          this.successMessage.set(response.message || 'Password has been successfully updated.');
          this.navigateToPortal();
        },
        error: (err) => {
          this.isLoading.set(false);
          if (err.status === 401) {
            this.errorMessage.set('Session expired. Please sign in with your temporary password first.');
          } else {
            this.errorMessage.set(err.error?.message || 'Failed to update password. Please try again.');
          }
        },
      });
      return;
    }

    const payload = {
      email: this.email()!,
      token: this.token()!,
      newPassword: this.resetForm.value.newPassword,
    };

    this.authService.resetPassword(payload).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.isSuccess.set(true);
        this.successMessage.set(response.message || 'Password has been successfully reset.');
        this.authService.setSession(response.accessToken, response.user);
        this.navigateToPortal();
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 400) {
          this.errorMessage.set(
            err.error?.message || 'Invalid, expired, or already-used reset code. Please request a new one.'
          );
        } else {
          this.errorMessage.set('Failed to reset password. Please try again.');
        }
      },
    });
  }

  navigateToPortal(): void {
    const role = this.authService.userRole()?.toLowerCase() || this.portalRole();
    if (!role) {
      this.router.navigate(['/login']);
      return;
    }
    const target = role === 'dispatcher' ? '/dispatch' : `/${role}`;
    this.router.navigate([target]);
  }
}
