import { Component, inject, isDevMode, signal, computed, OnInit } from '@angular/core';
import { AuthShellComponent } from '../auth-shell/auth-shell.component';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AuthRole, LoginRequest } from '../../models/auth.models';

@Component({
  selector: 'lib-login',
  standalone: true,
  imports: [AuthShellComponent, CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <lib-auth-shell active="signin" [badge]="heroCopy().badge" [headline]="heroCopy().headline" [lede]="heroCopy().lede">
            <div class="card-header">
              <span class="card-pill">{{ currentRoleMeta().label }} Sign In</span>
              <h2>Welcome back</h2>
              <p>{{ currentRoleMeta().desc }}</p>
            </div>

            <!-- Role Selector -->
            <div class="role-selector" role="tablist" aria-label="Select User Role">
              @for (r of roles; track r.id) {
                <button
                  type="button"
                  class="role-tab"
                  [class.active]="selectedRole() === r.id"
                  (click)="selectRole(r.id)"
                  role="tab"
                  [attr.aria-selected]="selectedRole() === r.id"
                >
                  <span class="role-name">{{ r.label }}</span>
                </button>
              }
            </div>

            @if (showSampleCredentials) {
              <div class="sample-hint-row">
                <button type="button" class="sample-link" (click)="useSampleCredentials(selectedRole())">
                  Fill sample {{ currentRoleMeta().label }} credentials
                </button>
              </div>
            }

            @if (errorMessage()) {
              <div class="error-banner" role="alert">
                <svg class="error-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
                <span>{{ errorMessage() }}</span>
              </div>
            }

            <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="auth-form">
              <div class="form-group">
                <label for="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  formControlName="email"
                  [placeholder]="currentRoleMeta().placeholder"
                  [class.invalid]="isFieldInvalid('email')"
                  autocomplete="email"
                />
                @if (isFieldInvalid('email')) {
                  <span class="field-error">Please enter a valid email address</span>
                }
              </div>

              <div class="form-group">
                <div class="password-label-container">
                  <label for="password">Password</label>
                  <a routerLink="/forgot-password" class="forgot-password-link">Forgot?</a>
                </div>
                <div class="password-input-wrap">
                  <input
                    id="password"
                    [type]="showPassword() ? 'text' : 'password'"
                    formControlName="password"
                    placeholder="••••••••••••"
                    [class.invalid]="isFieldInvalid('password')"
                    autocomplete="current-password"
                  />
                  <button
                    type="button"
                    class="password-toggle"
                    style="border: 0; background: none; cursor: pointer; padding: 0; color: var(--ink-3);"
                    [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
                    [attr.aria-pressed]="showPassword()"
                    (click)="togglePasswordVisibility()"
                  >
                    @if (showPassword()) {
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/>
                        <circle cx="12" cy="12" r="2.5"/>
                      </svg>
                    } @else {
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/>
                        <circle cx="12" cy="12" r="2.5"/>
                        <path d="m3 3 18 18"/>
                      </svg>
                    }
                  </button>
                </div>
                @if (isFieldInvalid('password')) {
                  <span class="field-error">Password is required</span>
                }
              </div>

              <button
                type="submit"
                class="submit-btn"
                [disabled]="loginForm.invalid || isLoading()"
              >
                @if (isLoading()) {
                  <span class="spinner"></span> Signing in...
                } @else {
                  Sign in as {{ currentRoleMeta().label }}
                }
              </button>
            </form>

            @if (selectedRole() === 'CUSTOMER') {
              <div class="oauth-divider">
                <span>or</span>
              </div>

              <button
                type="button"
                class="google-btn"
                (click)="onGoogleLogin()"
                [disabled]="isLoading()"
              >
                <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Continue with Google
              </button>
            }

            <div class="auth-footer">
              @if (selectedRole() === 'CUSTOMER' || selectedRole() === 'MERCHANT') {
                <p>Don't have an account? <a routerLink="/register">Customer signup</a> or <a routerLink="/merchant-registration">Merchant partner</a></p>
              } @else {
                <p>Need an account? {{ currentRoleMeta().label }} accounts are created by your SwiftDrop administrator.</p>
              }
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
    .card-header { margin-bottom: 1.25rem; text-align: left; }
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
      font-size: 0.9rem;
      color: var(--ink-3);
      line-height: 1.45;
      margin: 0;
    }
    /* Role Segmented Selector */
    .role-selector {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 0.25rem;
      background: #f1f5f9;
      padding: 0.25rem;
      border-radius: 9999px;
      margin-bottom: 0.85rem;
    }
    .role-tab {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.65rem 0.5rem;
      border: none;
      border-radius: 9999px;
      background: transparent;
      color: var(--ink-3);
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;
    }
    .role-tab:hover { color: var(--ink); }
    .role-tab.active {
      background: #fff;
      color: var(--ink);
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .sample-hint-row {
      margin-bottom: 1.25rem;
      text-align: right;
    }
    .sample-link {
      background: none;
      border: none;
      padding: 0;
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--terracotta);
      cursor: pointer;
      text-decoration: underline;
    }
    .sample-link:hover { color: #000; }
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
    .password-label-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .forgot-password-link {
      font-size: 0.8125rem;
      color: var(--terracotta);
      font-weight: 700;
      text-decoration: none;
    }
    .forgot-password-link:hover, .auth-footer a:hover { text-decoration: underline; }
    .form-group input {
      padding: 0.85rem 1.1rem;
      border-radius: 14px;
      border: 1.5px solid #e2e8f0;
      background: #f8fafc;
      color: var(--ink);
      font-size: 0.95rem;
      transition: all 0.2s ease;
    }
    .password-input-wrap {
      position: relative;
    }
    .password-input-wrap input {
      width: 100%;
      padding-right: 3.25rem;
    }
    .password-toggle {
      position: absolute;
      right: 0.85rem;
      bottom: 50%;
      transform: translateY(50%);
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
    .oauth-divider {
      display: flex;
      align-items: center;
      margin: 1.5rem 0 1.25rem;
      text-align: center;
    }
    .oauth-divider::before, .oauth-divider::after {
      content: '';
      flex: 1;
      border-bottom: 1.5px solid #e2e8f0;
    }
    .oauth-divider span {
      padding: 0 0.85rem;
      color: var(--ink-3);
      font-size: 0.8125rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 700;
    }
    .google-btn {
      width: 100%;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      background: #fff;
      color: var(--ink);
      font-size: 0.95rem;
      font-weight: 700;
      border: 1.5px solid #e2e8f0;
      border-radius: 9999px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .google-btn:hover:not(:disabled) {
      background: #f8fafc;
      border-color: #cbd5e1;
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    }
    .google-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .auth-footer {
      margin-top: 1.75rem;
      text-align: center;
      font-size: 0.875rem;
      color: var(--ink-3);
    }
    .auth-footer a {
      color: var(--terracotta);
      text-decoration: none;
      font-weight: 700;
    }
    @media (max-width: 480px) {
      .role-tab { font-size: 0.72rem; gap: 0.15rem; }
    }
  `]
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute, { optional: true });

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly selectedRole = signal<AuthRole>('CUSTOMER');
  readonly showPassword = signal(false);

  ngOnInit(): void {
    const roleParam = this.route?.snapshot.queryParamMap.get('role')?.toUpperCase();
    if (roleParam && (roleParam === 'CUSTOMER' || roleParam === 'MERCHANT' || roleParam === 'ADMIN' || roleParam === 'DISPATCHER' || roleParam === 'COURIER')) {
      this.selectedRole.set(roleParam as AuthRole);
    }
  }

  readonly roles = [
    { id: 'CUSTOMER' as const, label: 'Customer', placeholder: 'customer@swiftdrop.lk', target: '/customer', desc: 'Sign in to track and manage personal deliveries' },
    { id: 'MERCHANT' as const, label: 'Merchant', placeholder: 'merchant@swiftdrop.lk', target: '/merchant', desc: 'Access merchant bulk orders, CSV tools, and API' },
    { id: 'ADMIN' as const, label: 'Admin', placeholder: 'admin@swiftdrop.lk', target: '/admin', desc: 'System user management, approvals, and audits' },
    { id: 'DISPATCHER' as const, label: 'Dispatcher', placeholder: 'dispatcher@swiftdrop.lk', target: '/dispatch', desc: 'Courier dispatch queue, workload, and zone rates' },
    { id: 'COURIER' as const, label: 'Courier', placeholder: 'courier@swiftdrop.lk', target: '/courier', desc: 'View assigned deliveries and update delivery status' },
  ];

  /** The sample-credentials shortcut is for local development only, never production builds. */
  readonly showSampleCredentials = isDevMode();

  /** Text beside the form, matching how each role gets and uses its account. */
  readonly heroCopy = computed(() => {
    switch (this.selectedRole()) {
      case 'MERCHANT':
        return {
          badge: 'Merchant sign-in',
          headline: 'Your business deliveries, in one place',
          lede: 'Upload order CSVs, follow every parcel and manage your API credentials. First time? Use the temporary password from your approval email, then set your own.',
        };
      case 'COURIER':
        return {
          badge: 'Courier sign-in',
          headline: 'Ready for today’s deliveries?',
          lede: 'See the parcels assigned to you and update each status as you go. Your account is created by your SwiftDrop administrator, and your first password arrives by email.',
        };
      case 'DISPATCHER':
        return {
          badge: 'Dispatcher sign-in',
          headline: 'Keep every parcel moving',
          lede: 'Assign couriers, balance workloads and re-queue failed deliveries. Your account is created by your SwiftDrop administrator.',
        };
      case 'ADMIN':
        return {
          badge: 'Admin sign-in',
          headline: 'Run the SwiftDrop platform',
          lede: 'Manage staff accounts, approve merchants and review reports and audit logs.',
        };
      default:
        return {
          badge: 'Customer sign-in',
          headline: 'Welcome back',
          lede: 'Book deliveries, see prices before you confirm and follow every parcel until it arrives. You can also continue with Google.',
        };
    }
  });

  readonly currentRoleMeta = computed(() => {
    return this.roles.find((r) => r.id === this.selectedRole()) ?? this.roles[0];
  });

  readonly loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  selectRole(role: AuthRole): void {
    this.selectedRole.set(role);
    this.errorMessage.set(null);
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  useSampleCredentials(role: AuthRole): void {
    const sampleEmails: Record<AuthRole, string> = {
      CUSTOMER: 'customer@swiftdrop.lk',
      MERCHANT: 'merchant@swiftdrop.lk',
      ADMIN: 'admin@swiftdrop.lk',
      DISPATCHER: 'dispatcher@swiftdrop.lk',
      COURIER: 'courier@swiftdrop.lk',
    };
    this.loginForm.patchValue({
      email: sampleEmails[role],
      password: 'Password123!'
    });
    this.loginForm.markAsDirty();
  }

  onGoogleLogin(): void {
    this.errorMessage.set(null);
    this.isLoading.set(true);
    try {
      this.authService.loginWithGoogle();
    } catch {
      this.isLoading.set(false);
      this.errorMessage.set('Unable to initiate Google sign-in. Please try again.');
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const credentials: LoginRequest = {
      email: this.loginForm.value.email,
      password: this.loginForm.value.password,
      role: this.selectedRole(),
    };

    this.authService.login(credentials).subscribe({
      next: (response) => {
        const actualRole = response.user?.role?.toUpperCase();
        const expectedRole = this.selectedRole().toUpperCase();

        if (actualRole && actualRole !== expectedRole) {
          this.isLoading.set(false);
          this.authService.logout().subscribe({ error: () => {} });
          this.errorMessage.set(
            `This account is registered as ${actualRole?.toLowerCase()}`
          );
          return;
        }

        this.isLoading.set(false);
        if (response.mustChangePassword) {
          this.router.navigate(['/reset-password'], {
            queryParams: {
              email: response.user.email,
              firstLogin: 'true',
              role: response.user.role,
            },
          });
          return;
        }
        const role = response.user.role?.toLowerCase() || this.selectedRole().toLowerCase();
        const target = role === 'dispatcher' ? '/dispatch' : `/${role}`;
        this.router.navigate([target]);
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 401) {
          this.errorMessage.set('Invalid email or password credentials.');
        } else if (err.status === 423) {
          this.errorMessage.set('Account is temporarily locked due to repeated failed login attempts.');
        } else if (err.status === 403) {
          const msg = err.error?.message;
          if (msg && msg.toLowerCase().includes('registered as')) {
            this.errorMessage.set(msg);
          } else {
            this.errorMessage.set('Your account has been disabled by admin');
          }
        } else if (err.status === 429) {
          this.errorMessage.set('Too many login attempts. Please wait a minute and try again.');
        } else {
          this.errorMessage.set(err.error?.message || 'Authentication failed. Please try again.');
        }
      }
    });
  }
}
