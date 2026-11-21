import { Component, OnInit, inject, signal } from '@angular/core';
import { AuthShellComponent } from '../auth-shell/auth-shell.component';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'lib-auth-callback',
  standalone: true,
  imports: [AuthShellComponent, CommonModule, RouterModule],
  template: `
    <lib-auth-shell active="signin" badge="Google sign-in" headline="Signing you in" lede="We are confirming your Google account. This only takes a moment.">
          <div class="card-header">
            <span class="card-pill">Google Authentication</span>
          </div>

          @if (isLoading()) {
            <div class="loading-state">
              <div class="spinner"></div>
              <h2>Completing Sign In...</h2>
              <p>Please wait while we establish your secure session.</p>
            </div>
          }

          @if (errorMessage()) {
            <div class="error-state">
              <div class="error-banner" role="alert">
                <svg class="banner-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
                <span>{{ errorMessage() }}</span>
              </div>
              <a routerLink="/login" class="submit-btn back-btn">Return to Sign In</a>
            </div>
          }
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
    .card-header {
      margin-bottom: 1.5rem;
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
    .loading-state h2 {
      font-family: var(--disp);
      font-size: 1.85rem;
      font-weight: 900;
      color: var(--ink);
      letter-spacing: -0.025em;
      margin: 1.5rem 0 0.5rem;
    }
    .loading-state p {
      color: var(--ink-3);
      font-size: 0.95rem;
      margin: 0;
      line-height: 1.5;
    }
    .spinner {
      width: 44px;
      height: 44px;
      margin: 1rem auto;
      border: 3.5px solid rgba(165,58,38,0.15);
      border-top-color: var(--terracotta);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .error-banner {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      padding: 1rem 1.15rem;
      border-radius: 14px;
      margin: 1.5rem 0;
      font-size: 0.875rem;
      font-weight: 500;
      text-align: left;
    }
    .banner-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }
    .submit-btn {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      height: 50px;
      padding: 0 1.75rem;
      border-radius: 9999px;
      background: var(--ink);
      color: #fff;
      font-size: 0.95rem;
      font-weight: 800;
      text-decoration: none;
      transition: all 0.2s ease;
      box-shadow: 0 8px 18px -4px rgba(29,27,44,0.3);
    }
    .submit-btn:hover {
      background: #000;
      transform: translateY(-1px);
    }
  `]
})
export class CallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const error = this.route.snapshot.queryParamMap.get('error');

    if (error) {
      this.isLoading.set(false);
      if (error === 'access_denied') {
        this.errorMessage.set('Google sign-in was canceled or denied.');
      } else if (error === 'account_disabled') {
        this.errorMessage.set('Your SwiftDrop account is disabled. Please contact support.');
      } else if (error === 'state_mismatch' || error === 'invalid_state') {
        this.errorMessage.set('Authentication failed due to an invalid or expired security state.');
      } else {
        this.errorMessage.set('Authentication failed. Please try again.');
      }
      return;
    }

    try {
      const initialized = await this.authService.initializeSession();
      if (initialized && this.authService.isAuthenticated()) {
        const userRole = this.authService.userRole()?.toLowerCase() || 'customer';
        await this.router.navigate([`/${userRole}`], { replaceUrl: true });
      } else {
        this.isLoading.set(false);
        this.errorMessage.set('Failed to restore session. Please sign in again.');
      }
    } catch {
      this.isLoading.set(false);
      this.errorMessage.set('An unexpected error occurred while completing sign-in.');
    }
  }
}
