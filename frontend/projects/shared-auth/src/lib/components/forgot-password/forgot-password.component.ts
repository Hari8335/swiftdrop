import { Component, inject, signal } from '@angular/core';
import { AuthShellComponent } from '../auth-shell/auth-shell.component';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'lib-forgot-password',
  standalone: true,
  imports: [AuthShellComponent, CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <lib-auth-shell active="signin" badge="Password recovery" headline="Forgot your password?" lede="Works for every SwiftDrop account. We will email you a code so you can choose a new password." [steps]="recoverySteps" stepsLabel="How password recovery works">
          <div class="card-header">
            <span class="card-pill">Password Recovery</span>
            <h2>Reset your password</h2>
            <p>Enter your email address and we'll send a 6-digit reset code.</p>
          </div>

          @if (successMessage()) {
            <div class="success-banner" role="status">
              <svg class="banner-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
              <div>
                <strong>Check your inbox</strong>
                <p>{{ successMessage() }}</p>
              </div>
            </div>
          }

          @if (errorMessage()) {
            <div class="error-banner" role="alert">
              <svg class="banner-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          @if (!successMessage()) {
            <form [formGroup]="forgotForm" (ngSubmit)="onSubmit()" class="auth-form">
              <div class="form-group">
                <label for="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  formControlName="email"
                  placeholder="you@example.com"
                  [class.invalid]="isFieldInvalid('email')"
                  autocomplete="email"
                />
                @if (isFieldInvalid('email')) {
                  <span class="field-error">Please enter a valid email address</span>
                }
              </div>

              <button
                type="submit"
                class="submit-btn"
                [disabled]="forgotForm.invalid || isLoading()"
              >
                @if (isLoading()) {
                  <span class="spinner"></span> Sending reset code...
                } @else {
                  Send Reset Code
                }
              </button>
            </form>
          }

          <div class="auth-footer">
            <p>Remembered your password? <a routerLink="/login">Back to Sign in</a></p>
          </div>
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
      align-items: center;
      gap: 0.75rem;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      padding: 0.85rem 1.15rem;
      border-radius: 14px;
      margin-bottom: 1.5rem;
      font-size: 0.875rem;
      font-weight: 500;
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
    }
    .form-group input:focus {
      outline: none;
      background: #fff;
      border-color: var(--terracotta);
      box-shadow: 0 0 0 3px rgba(165,58,38,0.12);
    }
    .form-group input.invalid {
      border-color: #ef4444;
      background: #fff5f5;
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
      border: 2px solid rgba(255,255,255,0.3);
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
export class ForgotPasswordComponent {
  /** Shown beside the form so people know what happens after they submit their email. */
  readonly recoverySteps: readonly string[] = [
    'Enter the email address of your account',
    'Check your inbox for a reset code',
    'Enter the code and choose a new password',
  ];

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly forgotForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  isFieldInvalid(fieldName: string): boolean {
    const field = this.forgotForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onSubmit(): void {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.forgotPassword(this.forgotForm.value).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.successMessage.set(response.message || 'If an account exists with this email, password reset instructions have been sent.');
        this.router.navigate(['/reset-password'], {
          queryParams: { email: this.forgotForm.value.email },
        });
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 404) {
          this.errorMessage.set(err.error?.message || 'This email is not registered yet');
        } else {
          this.errorMessage.set(err.error?.message || 'Unable to process your request. Please try again.');
        }
      }
    });
  }
}
