import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Which top-bar link is highlighted. */
export type AuthShellActive = 'customer' | 'merchant' | 'signin';

/**
 * Shared layout for every sign-in and sign-up screen: terracotta page, top bar, explanatory text
 * on the left and a white card on the right. The screen's own form is projected into the card.
 */
@Component({
  selector: 'lib-auth-shell',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="auth-page">
      <header class="top-bar">
        <a routerLink="/" class="brand" aria-label="SwiftDrop home">
          <span class="brand-mark">
            <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7E2A1C" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </span>
          <span class="brand-text">SwiftDrop</span>
        </a>

        <nav class="nav-links" aria-label="Account">
          <a routerLink="/register" [class]="active() === 'customer' ? 'nav-pill' : 'nav-link'"
            [attr.aria-current]="active() === 'customer' ? 'page' : null">Join as Customer</a>
          <a routerLink="/merchant-registration" [class]="active() === 'merchant' ? 'nav-pill' : 'nav-link'"
            [attr.aria-current]="active() === 'merchant' ? 'page' : null">Join as Merchant</a>
          <a routerLink="/login" [class]="active() === 'signin' ? 'nav-pill' : 'nav-link'"
            [attr.aria-current]="active() === 'signin' ? 'page' : null">Sign In</a>
        </nav>
      </header>

      <main class="hero-grid">
        <section class="hero-copy">
          <div class="hero-badge"><span class="badge-dot" aria-hidden="true"></span> {{ badge() }}</div>
          <h1 class="hero-headline">{{ headline() }}</h1>
          <p class="hero-lede">{{ lede() }}</p>
          @if (steps().length) {
            <ol class="hero-steps" [attr.aria-label]="stepsLabel()">
              @for (step of steps(); track step; let i = $index) {
                <li><span class="step-num">{{ i + 1 }}</span><span>{{ step }}</span></li>
              }
            </ol>
          }
        </section>

        <section class="auth-card-wrap">
          <div class="auth-card">
            <ng-content></ng-content>
          </div>
        </section>
      </main>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      --disp: 'Bricolage Grotesque', ui-rounded, system-ui, -apple-system, sans-serif;
      --terracotta: #a53a26;
      --ink: #1d1b2c;
      --ink-3: #6f6d85;
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .auth-page {
      position: relative; min-height: 100vh; box-sizing: border-box; padding: 2.5rem 2rem 4rem; overflow: clip; color: #fff;
      background: radial-gradient(55% 65% at 75% 45%, #b8432f 0%, #98311e 65%, #882b1a 100%), #98311e;
    }
    .top-bar { max-width: 1200px; margin: 0 auto 3rem; display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; }
    /* Same logo as the landing page: white rounded tile with the parcel mark, then the wordmark. */
    .brand { display: inline-flex; align-items: center; gap: 12px; color: #fff; text-decoration: none; }
    .brand-mark { width: 44px; height: 44px; border-radius: 12px; background: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .brand-text { font-family: var(--disp); font-weight: 800; font-size: 26px; letter-spacing: -.02em; }
    .nav-links { display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; }
    .nav-link { color: rgba(255,255,255,.85); text-decoration: none; font-size: .95rem; font-weight: 600; transition: color .2s; }
    .nav-link:hover { color: #fff; }
    .nav-pill { display: inline-flex; align-items: center; height: 38px; padding: 0 1.25rem; border-radius: 9999px; background: var(--ink); color: #fff; font-size: .875rem; font-weight: 700; text-decoration: none; transition: background-color .2s, transform .2s; }
    .nav-pill:hover { background: #000; transform: translateY(-1px); }
    .hero-grid { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1.1fr .9fr; align-items: start; gap: 4rem; }
    .hero-copy { display: flex; flex-direction: column; align-items: flex-start; padding-top: 2.75rem; position: sticky; top: 2rem; }
    .hero-badge { display: inline-flex; align-items: center; gap: .5rem; padding: .35rem .85rem; margin-bottom: 1.5rem; border-radius: 9999px; background: rgba(255,255,255,.15); backdrop-filter: blur(8px); font-size: .8125rem; font-weight: 700; }
    .badge-dot { width: 7px; height: 7px; border-radius: 50%; background: #4ade80; box-shadow: 0 0 8px #4ade80; }
    .hero-headline { margin: 0 0 1.5rem; font-family: var(--disp); font-size: clamp(2.4rem, 4.5vw, 4.25rem); font-weight: 900; line-height: .96; letter-spacing: -.035em; text-shadow: 0 2px 0 rgba(140,30,15,.25); }
    .hero-lede { max-width: 28rem; margin: 0 0 2rem; font-size: 1.15rem; line-height: 1.55; color: rgba(255,255,255,.9); }
    .hero-steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .75rem; max-width: 28rem; }
    .hero-steps li { display: flex; align-items: center; gap: .85rem; font-size: 1rem; font-weight: 600; color: rgba(255,255,255,.92); }
    .step-num { flex-shrink: 0; width: 30px; height: 30px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: rgba(255,255,255,.15); border: 1px solid rgba(255,255,255,.3); font-weight: 800; font-size: .85rem; }
    .auth-card-wrap { display: flex; justify-content: center; width: 100%; }
    .auth-card { width: 100%; max-width: 480px; box-sizing: border-box; padding: 2.75rem 2.25rem; background: #fff; color: var(--ink); border-radius: 28px; box-shadow: 0 24px 60px -15px rgba(29,27,44,.35), 0 8px 24px -6px rgba(0,0,0,.2); }
    a:focus-visible { outline: 3px solid #fbbf24; outline-offset: 3px; }
    @media (max-width: 960px) {
      .auth-page { padding: 1.75rem 1.25rem 3rem; }
      .hero-grid { grid-template-columns: 1fr; gap: 2.5rem; }
      .hero-copy { align-items: center; text-align: center; padding-top: 0; position: static; }
      .hero-steps { align-self: stretch; margin: 0 auto; }
      .hero-steps li { text-align: left; }
      .hero-headline { font-size: 2.5rem; }
      .auth-card { padding: 2.25rem 1.75rem; }
    }
    @media (max-width: 560px) {
      .top-bar { flex-direction: column; gap: 1rem; margin-bottom: 2rem; }
      .nav-links { justify-content: center; gap: 1rem; }
      .hero-headline { font-size: 2.1rem; }
      .auth-card { padding: 1.75rem 1.25rem; border-radius: 20px; }
    }
  `],
})
export class AuthShellComponent {
  readonly active = input<AuthShellActive>('signin');
  readonly badge = input.required<string>();
  readonly headline = input.required<string>();
  readonly lede = input.required<string>();
  /** Optional numbered steps shown under the text, e.g. how an application or password reset works. */
  readonly steps = input<readonly string[]>([]);
  readonly stepsLabel = input('How it works');
}
