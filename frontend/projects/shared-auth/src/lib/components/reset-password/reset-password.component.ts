import { Component, OnInit, inject, signal } from '@angular/core';
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
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div class="brand-badge">SwiftDrop</div>
          <h2>{{ firstLogin() || codeVerified() ? 'Create new password' : 'Enter reset code' }}</h2>
          <p>{{ firstLogin() || codeVerified() ? 'Choose a strong password with at least 8 characters' : 'Enter the 6-digit code sent to your email. It expires in 10 minutes.' }}</p>
        </div>

        @if (missingEmail()) {
          <div class="error-banner" role="alert">
            <span class="error-icon">⚠️</span>
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
            <span class="success-icon">✓</span>
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
              <span class="error-icon">⚠️</span>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          @if (!firstLogin() && !codeVerified()) {
            <form [formGroup]="codeForm" (ngSubmit)="verifyCode()" class="auth-form">
              <div class="form-group">
                <label for="resetCode">6-digit reset code</label>
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
                  [class.invalid]="isFieldInvalid('newPassword')"
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
              @if (isFieldInvalid('newPassword')) {
                <span class="field-error">Password must be between 8 and 128 characters</span>
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
                Reset password
              }
            </button>
          </form>
          }

          <div class="auth-footer">
            <p>Need a different code? <a routerLink="/forgot-password">Start again</a></p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
      padding: 2rem 1rem;
      background: radial-gradient(circle at top right, #1e293b 0%, #0f172a 100%);
      color: #f8fafc;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .auth-card {
      width: 100%;
      max-width: 440px;
      padding: 2.5rem;
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 1rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
    }

    .auth-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .brand-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      border-radius: 9999px;
      margin-bottom: 0.75rem;
    }

    .auth-header h2 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #f8fafc;
      margin: 0 0 0.5rem 0;
    }

    .auth-header p {
      font-size: 0.875rem;
      color: #94a3b8;
      margin: 0;
    }

    .success-banner {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      background: rgba(34, 197, 94, 0.15);
      border: 1px solid #22c55e;
      color: #86efac;
      padding: 1rem;
      border-radius: 0.5rem;
      margin-bottom: 1.5rem;
      font-size: 0.875rem;
      line-height: 1.4;
    }

    .success-banner strong {
      display: block;
      color: #4ade80;
      margin-bottom: 0.25rem;
    }

    .success-banner p {
      margin: 0;
      color: #dcfce7;
    }

    .success-icon {
      font-size: 1.1rem;
      color: #4ade80;
    }

    .error-banner {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid #ef4444;
      color: #fca5a5;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      margin-bottom: 1.5rem;
      font-size: 0.875rem;
      line-height: 1.4;
    }

    .error-banner strong {
      display: block;
      color: #f87171;
      margin-bottom: 0.25rem;
    }

    .error-banner p {
      margin: 0;
      color: #fecaca;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .form-group label {
      font-size: 0.875rem;
      font-weight: 500;
      color: #cbd5e1;
    }

    .form-group input {
      width: 100%;
      box-sizing: border-box;
      padding: 0.75rem 1rem;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 0.5rem;
      background: rgba(15, 23, 42, 0.6);
      color: #f8fafc;
      font-size: 0.95rem;
    }

    .form-group input::placeholder {
      color: #64748b;
    }

    .form-group input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
    }

    #resetCode {
      letter-spacing: 0.35em;
      text-align: center;
      font-size: 1.15rem;
      font-weight: 700;
    }

    .form-group input.invalid {
      border-color: #ef4444;
    }

    .password-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .password-input-wrapper input {
      width: 100%;
      padding: 0.75rem 3.5rem 0.75rem 1rem;
      border-radius: 0.5rem;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: rgba(15, 23, 42, 0.6);
      color: #f8fafc;
      font-size: 0.95rem;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    .password-input-wrapper input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
    }

    .password-input-wrapper input.invalid {
      border-color: #ef4444;
    }

    .toggle-visibility {
      position: absolute;
      right: 0.75rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      padding: 0;
      border: 0;
      background: transparent;
      color: #94a3b8;
      cursor: pointer;
    }

    .toggle-visibility:hover {
      color: #f8fafc;
    }

    .eye-icon {
      width: 1.15rem;
      height: 1.15rem;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }

    .field-error {
      font-size: 0.75rem;
      color: #ef4444;
    }

    .submit-btn {
      margin-top: 0.5rem;
      padding: 0.875rem 1.25rem;
      border-radius: 0.5rem;
      border: none;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s ease;
      width: 100%;
    }

    .submit-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
    }

    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
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
      text-align: center;
      font-size: 0.875rem;
      color: #94a3b8;
    }

    .auth-footer a {
      color: #60a5fa;
      text-decoration: none;
      font-weight: 500;
    }

    .auth-footer a:hover {
      text-decoration: underline;
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
  readonly isLoading = signal(false);
  readonly isSuccess = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);

  readonly codeForm: FormGroup = this.fb.group({
    token: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  readonly resetForm: FormGroup = this.fb.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
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

  onSubmit(): void {
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
          this.errorMessage.set(err.error?.message || 'Failed to update password. Please try again.');
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

