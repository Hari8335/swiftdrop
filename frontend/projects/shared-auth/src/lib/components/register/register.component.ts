import { Component, inject, signal } from '@angular/core';
import { AuthShellComponent } from '../auth-shell/auth-shell.component';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import {
  passwordComplexityValidator,
  getPasswordComplexityWarning,
} from '../../validators/password.validator';

@Component({
  selector: 'lib-register',
  standalone: true,
  imports: [AuthShellComponent, CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <lib-auth-shell active="customer" badge="Customer sign-up" headline="Create your customer account" lede="Book parcels anywhere in Sri Lanka, see the price before you confirm, and follow every status update until delivery." [steps]="signupSteps" stepsLabel="How customer sign-up works">
            <div class="card-header">
              <span class="card-pill">Customer Signup</span>
              <h2>Join SwiftDrop</h2>
              <p>Enter your details to create your delivery account</p>
            </div>

            @if (errorMessage()) {
              <div class="error-banner" role="alert">
                <svg class="error-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
                <span>{{ errorMessage() }}</span>
              </div>
            }

            <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="auth-form">
              <div class="form-group">
                <label for="fullName">Full Name <span class="required-star text-red-500">*</span></label>
                <input
                  id="fullName"
                  type="text"
                  formControlName="fullName"
                  placeholder="Kasun Perera"
                  [class.invalid]="isFieldInvalid('fullName')"
                  autocomplete="name"
                />
                @if (isFieldInvalid('fullName')) {
                  <span class="field-error">Full name is required</span>
                }
              </div>

              <div class="form-group">
                <label for="email">Email address <span class="required-star text-red-500">*</span></label>
                <input
                  id="email"
                  type="email"
                  formControlName="email"
                  (input)="onEmailInput()"
                  placeholder="you@example.com"
                  [class.invalid]="isFieldInvalid('email') || !!registerForm.get('email')?.hasError('alreadyExists')"
                  autocomplete="email"
                />
                @if (registerForm.get('email')?.hasError('alreadyExists')) {
                  <span class="field-error">An account with this email address already exists. Please sign in or use a different email.</span>
                } @else if (isFieldInvalid('email')) {
                  <span class="field-error">Please enter a valid email address (e.g. you@example.com)</span>
                }
              </div>

              <div class="form-group">
                <label for="phoneNumber">Phone Number (optional)</label>
                <input
                  id="phoneNumber"
                  type="tel"
                  inputmode="numeric"
                  maxlength="10"
                  formControlName="phoneNumber"
                  placeholder="0771234567"
                  [class.invalid]="isFieldInvalid('phoneNumber')"
                  (input)="onPhoneInput($event)"
                  autocomplete="tel"
                />
                @if (isFieldInvalid('phoneNumber')) {
                  <span class="field-error">Phone number must be exactly 10 digits (e.g. 0771234567)</span>
                }
              </div>

              <div class="form-group">
                <label for="password">Password <span class="required-star text-red-500">*</span></label>
                <input
                  id="password"
                  type="password"
                  formControlName="password"
                  placeholder="At least 8 characters"
                  [class.invalid]="!!getPasswordErrorMessage()"
                  (focus)="onPasswordFocus()"
                  (blur)="onPasswordBlur()"
                  autocomplete="new-password"
                />
                @if (getPasswordErrorMessage()) {
                  <span class="field-error">{{ getPasswordErrorMessage() }}</span>
                }
              </div>

              <button
                type="submit"
                class="submit-btn"
                [disabled]="registerForm.invalid || isLoading()"
              >
                @if (isLoading()) {
                  <span class="spinner"></span> Creating account...
                } @else {
                  Create Account
                }
              </button>
            </form>

            <div class="auth-footer">
              <p>Already have an account? <a routerLink="/login">Sign in</a></p>
              <p class="merchant-note">Merchant partner? <a routerLink="/merchant-registration">Register business</a></p>
            </div>
    </lib-auth-shell>
  `,
  styles: [`
    :host {
      display: block;
      --disp: 'Bricolage Grotesque', ui-rounded, system-ui, -apple-system, sans-serif;
      --terracotta: #a53a26;
      --coral: #f2533a;
      --ink: #1d1b2c;
      --ink-3: #6f6d85;
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .submit-btn:hover:not(:disabled) {
      background: #000;
      transform: translateY(-1px);
    }
    .card-header { margin-bottom: 2rem; text-align: left; }
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
      margin-bottom: 0.75rem;
    }
    .card-header h2 {
      font-family: var(--disp);
      font-size: 1.85rem;
      font-weight: 900;
      color: var(--ink);
      letter-spacing: -0.025em;
      margin: 0 0 0.5rem;
    }
    .card-header p {
      font-size: 0.9rem;
      color: var(--ink-3);
      line-height: 1.45;
      margin: 0;
    }
    .error-banner {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      background: #fef2f2;
      border: 1.5px solid #fca5a5;
      color: #991b1b;
      padding: 0.85rem 1rem;
      border-radius: 14px;
      margin-bottom: 1.5rem;
      font-size: 0.875rem;
      font-weight: 600;
    }
    .error-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      color: #dc2626;
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
    .required-star {
      color: #ef4444;
      margin-left: 2px;
      font-weight: 700;
    }
    .form-group input {
      padding: 0.85rem 1.1rem;
      border-radius: 14px;
      border: 1.5px solid #e2e8f0;
      background: #f8fafc;
      color: var(--ink);
      font-size: 0.95rem;
      transition: all 0.2s ease;
    }
    .form-group input:focus {
      outline: none;
      background: #fff;
      border-color: var(--terracotta);
      box-shadow: 0 0 0 4px rgba(165,58,38,0.15);
    }
    .form-group input.invalid {
      border-color: #ef4444;
      background: #fff5f5;
    }
    .field-error {
      font-size: 0.75rem;
      font-weight: 600;
      color: #dc2626;
    }
    .submit-btn {
      margin-top: 0.5rem;
      height: 50px;
      border-radius: 9999px;
      border: none;
      background: var(--ink);
      color: #fff;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 0.5rem;
      box-shadow: 0 10px 25px -8px rgba(29,27,44,0.4);
      transition: all 0.2s ease;
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
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .auth-footer {
      margin-top: 2rem;
      text-align: center;
      font-size: 0.875rem;
      color: var(--ink-3);
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .auth-footer a {
      color: var(--terracotta);
      text-decoration: none;
      font-weight: 700;
    }
    .auth-footer a:hover { text-decoration: underline; }
    .merchant-note { font-size: 0.8125rem; }
  `]
})
export class RegisterComponent {
  /** What happens after signing up: customers are signed in straight away, no approval needed. */
  readonly signupSteps: readonly string[] = [
    'Enter your name, email and a password',
    'You are signed in straight away',
    'Book a parcel and see the price before you confirm',
    'Follow every status update until delivery',
  ];

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly isPasswordFocused = signal(false);
  readonly hasLeftPassword = signal(false);

  readonly registerForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
    phoneNumber: ['', [Validators.pattern(/^[0-9]{10}$/)]],
    password: ['', [Validators.required, Validators.maxLength(128), passwordComplexityValidator]]
  });

  onPasswordFocus(): void {
    this.isPasswordFocused.set(true);
  }

  onPasswordBlur(): void {
    this.isPasswordFocused.set(false);
    this.hasLeftPassword.set(true);
  }

  getPasswordErrorMessage(): string | null {
    const control = this.registerForm.get('password');
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

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digitsOnly = input.value.replace(/\D/g, '').slice(0, 10);
    if (input.value !== digitsOnly) {
      input.value = digitsOnly;
      this.registerForm.get('phoneNumber')?.setValue(digitsOnly);
    }
  }

  onEmailInput(): void {
    const emailControl = this.registerForm.get('email');
    if (emailControl?.hasError('alreadyExists')) {
      const errors = { ...emailControl.errors };
      delete errors['alreadyExists'];
      emailControl.setErrors(Object.keys(errors).length > 0 ? errors : null);
      if (this.errorMessage()?.includes('already registered') || this.errorMessage()?.includes('already exists')) {
        this.errorMessage.set(null);
      }
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onSubmit(): void {
    this.hasLeftPassword.set(true);
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.register(this.registerForm.value).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/customer']);
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 409) {
          const emailControl = this.registerForm.get('email');
          emailControl?.setErrors({ alreadyExists: true });
          emailControl?.markAsTouched();
          this.errorMessage.set('This email address is already registered. Please sign in or use a different email.');
        } else if (err.status === 429) {
          this.errorMessage.set('Too many registration attempts. Please wait a moment and try again.');
        } else {
          this.errorMessage.set(err.error?.message || 'Registration failed. Please check your details.');
        }
      }
    });
  }
}
