import { CommonModule } from '@angular/common';
import { AuthShellComponent } from 'shared-auth';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonComponent, InputComponent, StatusBadgeComponent } from 'ui';
import { MerchantOnboardingService } from './merchant-onboarding.service';
import { MerchantRegistrationResponse } from './merchant-registration.model';

@Component({
  selector: 'app-merchant-registration',
  standalone: true,
  imports: [AuthShellComponent, CommonModule, ReactiveFormsModule, RouterLink, ButtonComponent, InputComponent, StatusBadgeComponent],
  template: `
    <lib-auth-shell active="merchant" badge="Merchant application" headline="Ship your orders with SwiftDrop" lede="Apply for a merchant account to upload orders in bulk, connect your systems with our API and webhooks, and follow every parcel." [steps]="applicationSteps" stepsLabel="How merchant registration works">
              <div class="card-header">
                <span class="card-pill">Merchant application</span>
                <h2>Register your business</h2>
                <p>Tell us about your business. We review every application and email you when your account is ready.</p>
              </div>

              @if (registration(); as result) {
                <div class="success-box" role="status">
                  <span class="success-badge">Registration received</span>
                  <h2 class="success-title">{{ result.businessName }}</h2>
                  <p class="success-msg">{{ result.message }}</p>
                  <p class="status-indicator">
                    Status: <ui-status-badge [status]="result.status" tone="warning" [label]="result.status" />
                  </p>
                  <p class="approval-info">What happens next: our admin team reviews your application. Once it is approved, you will get an email at your business address with a temporary password.</p>
                  <p class="approval-info">Sign in with that temporary password as a Merchant, and you will be asked to choose your own password before your merchant portal opens.</p>
                  <div class="mt-6">
                    <ui-button routerLink="/login" [queryParams]="{ role: 'MERCHANT' }" [fullWidth]="true">Go to merchant sign-in</ui-button>
                  </div>
                </div>
              } @else {
                @if (errorMessage()) {
                  <div role="alert" class="error-banner">
                    <svg class="error-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                    </svg>
                    <span>{{ errorMessage() }}</span>
                  </div>
                }

                <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">
                  <div class="form-stack">
                    <ui-input
                      inputId="businessName"
                      label="Business name"
                      formControlName="businessName"
                      placeholder="e.g. Ceylon Spices Co."
                      autocomplete="organization"
                      [messages]="{ required: 'Enter a business name (up to 200 characters).', maxlength: 'Enter a business name (up to 200 characters).' }"
                    />

                    <ui-input
                      inputId="contactName"
                      label="Contact name"
                      formControlName="contactName"
                      placeholder="e.g. Kasun Perera"
                      autocomplete="name"
                      [messages]="{ required: 'Enter a contact name (up to 200 characters).', maxlength: 'Enter a contact name (up to 200 characters).' }"
                    />

                    <ui-input
                      inputId="phoneNumber"
                      label="Phone number"
                      type="tel"
                      inputmode="numeric"
                      [maxlength]="10"
                      formControlName="phoneNumber"
                      placeholder="0771234567"
                      autocomplete="tel"
                      [messages]="{ required: 'Phone number is required.', pattern: 'Phone number must be exactly 10 digits (e.g. 0771234567).' }"
                    />

                    <ui-input
                      inputId="email"
                      label="Business email"
                      type="email"
                      formControlName="email"
                      placeholder="merchant@example.com"
                      autocomplete="email"
                      (input)="onEmailInput()"
                      [messages]="{
                        required: 'Enter a valid business email address.',
                        email: 'Enter a valid email address (e.g. merchant@example.com).',
                        pattern: 'Enter a valid email address (e.g. merchant@example.com).',
                        alreadyExists: 'This email is already registered. Please use a different email or sign in.'
                      }"
                    />

                    <ui-input
                      inputId="businessRegistrationNumber"
                      label="Business registration number (optional)"
                      formControlName="businessRegistrationNumber"
                      placeholder="e.g. PV-123456"
                    />
                  </div>

                  <div class="submit-wrap">
                    <ui-button type="submit" [disabled]="form.invalid || isSubmitting()" [loading]="isSubmitting()" [fullWidth]="true">
                      {{ isSubmitting() ? 'Submitting…' : 'Submit registration' }}
                    </ui-button>
                  </div>
                </form>

                <div class="auth-footer">
                  <p>Already approved? <a routerLink="/login">Sign in</a></p>
                  <p class="customer-note">Looking for personal delivery? <a routerLink="/register">Customer signup</a></p>
                </div>
              }
    </lib-auth-shell>
  `,
  styles: [`
    .card-header { margin-bottom: 1.75rem; }
    .card-header h2 { font-family: var(--disp); font-size: 1.85rem; font-weight: 900; color: var(--ink); letter-spacing: -0.025em; margin: 0.75rem 0 0.5rem; }
    .card-header p { font-size: 0.9rem; color: var(--ink-3); line-height: 1.45; margin: 0; }
    :host {
      display: block;
      --disp: ui-rounded, 'SF Pro Rounded', 'Nunito', system-ui, -apple-system, sans-serif;
      --terracotta: #a53a26;
      --coral: #f2533a;
      --ink: #1d1b2c;
      --ink-3: #6f6d85;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, 'Segoe UI', Roboto, sans-serif;
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
    }
    .form-stack {
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
    }
    :host ::ng-deep ui-input label {
      font-size: 0.875rem !important;
      font-weight: 700 !important;
      color: var(--ink) !important;
      margin-bottom: 0.35rem !important;
      display: block !important;
    }
    :host ::ng-deep ui-input input {
      padding: 0.85rem 1.1rem !important;
      border-radius: 14px !important;
      border: 1.5px solid #e2e8f0 !important;
      background: #f8fafc !important;
      color: var(--ink) !important;
      font-size: 0.95rem !important;
      transition: all 0.2s ease !important;
      width: 100% !important;
      box-sizing: border-box !important;
    }
    :host ::ng-deep ui-input input:focus {
      outline: none !important;
      background: #ffffff !important;
      border-color: var(--terracotta) !important;
      box-shadow: 0 0 0 4px rgba(165,58,38,0.15) !important;
    }
    :host ::ng-deep ui-button button {
      width: 100% !important;
      height: 50px !important;
      border-radius: 9999px !important;
      background: var(--ink) !important;
      color: #ffffff !important;
      font-size: 1rem !important;
      font-weight: 700 !important;
      border: none !important;
      box-shadow: 0 10px 25px -8px rgba(29,27,44,0.4) !important;
      transition: all 0.2s ease !important;
      cursor: pointer !important;
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
    }
    :host ::ng-deep ui-button button:hover:not(:disabled) {
      background: #000000 !important;
      transform: translateY(-1px) !important;
    }
    :host ::ng-deep ui-button button:disabled {
      opacity: 0.5 !important;
      cursor: not-allowed !important;
      transform: none !important;
      box-shadow: none !important;
    }
    .submit-wrap {
      margin-top: 1.5rem;
    }
    .auth-footer {
      margin-top: 1.75rem;
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
    .customer-note { font-size: 0.8125rem; }
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
    .success-box {
      border-radius: 20px;
      border: 1.5px solid #a7f3d0;
      background: #ecfdf5;
      padding: 1.75rem;
      color: #064e3b;
    }
    .success-badge {
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #047857;
    }
    .success-title {
      font-family: var(--disp);
      font-size: 1.5rem;
      font-weight: 900;
      color: #064e3b;
      margin: 0.5rem 0;
    }
    .success-msg {
      font-size: 0.9rem;
      color: #047857;
      margin-bottom: 1rem;
    }
    .status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      font-weight: 700;
      color: #92400e;
      margin-bottom: 1rem;
    }
    .approval-info {
      font-size: 0.85rem;
      color: #065f46;
      line-height: 1.5;
      margin: 0.75rem 0;
    }
    .auth-link {
      font-weight: 700;
      color: var(--terracotta);
      text-decoration: underline;
    }
  `]
})
export class MerchantRegistrationComponent {
  /** The real approval flow, shown beside the form. */
  readonly applicationSteps: readonly string[] = [
    'Apply with your business details',
    'Our admin team reviews your application',
    'You get an email with a temporary password',
    'Sign in and choose your own password',
  ];

  private readonly formBuilder = inject(FormBuilder);
  private readonly onboardingService = inject(MerchantOnboardingService);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly registration = signal<MerchantRegistrationResponse | null>(null);
  readonly form = this.formBuilder.nonNullable.group({
    businessName: ['', [Validators.required, Validators.maxLength(200)]],
    contactName: ['', [Validators.required, Validators.maxLength(200)]],
    email: ['', [Validators.required, Validators.email, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    businessRegistrationNumber: [''],
  });

  invalid(field: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.dirty || control.touched);
  }

  onEmailInput(): void {
    const emailControl = this.form.controls.email;
    if (emailControl.hasError('alreadyExists')) {
      const errors = { ...emailControl.errors };
      delete errors['alreadyExists'];
      emailControl.setErrors(Object.keys(errors).length > 0 ? errors : null);
      if (this.errorMessage()?.includes('already registered') || this.errorMessage()?.includes('already exists')) {
        this.errorMessage.set(null);
      }
    }
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    const { businessRegistrationNumber, ...requiredFields } = this.form.getRawValue();
    this.onboardingService.register({
      ...requiredFields,
      ...(businessRegistrationNumber.trim() ? { businessRegistrationNumber: businessRegistrationNumber.trim() } : {}),
    }).subscribe({
      next: (result) => {
        this.registration.set(result);
        this.isSubmitting.set(false);
      },
      error: (error: { status?: number; error?: { message?: string } }) => {
        if (error.status === 409) {
          this.form.controls.email.setErrors({ alreadyExists: true });
          this.form.controls.email.markAsTouched();
          this.errorMessage.set('This email is already registered. Please use a different email or sign in.');
        } else {
          this.errorMessage.set(error.error?.message || 'Registration could not be submitted. Please try again.');
        }
        this.isSubmitting.set(false);
      },
    });
  }
}
