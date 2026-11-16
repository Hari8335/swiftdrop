import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'lib-auth-callback',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="yum-page">
      <header class="top-bar">
        <a routerLink="/login" class="brand">
          <svg class="brand-icon" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="10" fill="#ffffff" />
            <path d="M8 12L16 7L24 12V22L16 27L8 22V12Z" fill="#a53a26" />
            <path d="M16 7V27M8 12L24 22M24 12L8 22" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          <span class="brand-text">SwiftDrop</span>
        </a>

        <nav class="nav-links">
          <a routerLink="/register" class="nav-link">Customer</a>
          <a routerLink="/merchant-registration" class="nav-link">Merchant</a>
          <a routerLink="/login" class="nav-pill">Sign In</a>
        </nav>
      </header>

      <main class="auth-card-wrap">
        <div class="auth-card">
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
        </div>
      </main>
    </div>
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
    .yum-page {
      position: relative;
      min-height: 100vh;
      margin: 0;
      padding: 2.5rem 2rem 4rem;
      background: radial-gradient(55% 65% at 75% 45%, #b8432f 0%, #98311e 65%, #882b1a 100%), #98311e;
      color: #fff;
      overflow-x: hidden;
      box-sizing: border-box;
    }
    .top-bar {
      max-width: 1200px;
      margin: 0 auto 3rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      color: #fff;
      text-decoration: none;
    }
    .brand-icon {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .brand-text {
      font-family: var(--disp);
      font-size: 1.5rem;
      font-weight: 900;
      letter-spacing: -0.03em;
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }
    .nav-link {
      color: rgba(255,255,255,0.85);
      text-decoration: none;
      font-size: 0.95rem;
      font-weight: 600;
      transition: color 0.2s;
    }
    .nav-link:hover { color: #fff; }
    .nav-pill {
      display: inline-flex;
      align-items: center;
      height: 38px;
      padding: 0 1.25rem;
      border-radius: 9999px;
      background: var(--ink);
      color: #fff;
      font-size: 0.875rem;
      font-weight: 700;
      text-decoration: none;
      transition: background-color 0.2s, transform 0.2s;
    }
    .nav-pill:hover {
      background: #000;
      transform: translateY(-1px);
    }
    .auth-card-wrap {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      margin: 3rem auto;
    }
    .auth-card {
      width: 100%;
      max-width: 480px;
      padding: 3rem 2.5rem;
      background: #fff;
      color: var(--ink);
      border-radius: 28px;
      box-shadow: 0 24px 60px -15px rgba(29,27,44,0.35), 0 8px 24px -6px rgba(0,0,0,0.2);
      text-align: center;
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
    @media (max-width: 640px) {
      .yum-page { padding: 1.5rem 1rem 3rem; }
      .top-bar { margin-bottom: 2rem; }
      .auth-card { padding: 2rem 1.25rem; border-radius: 20px; }
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
