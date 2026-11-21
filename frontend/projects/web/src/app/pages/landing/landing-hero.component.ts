import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ParcelBox3dComponent } from './parcel-box-3d.component';

type Audience = 'customer' | 'merchant';

/** Landing hero: top bar, customer/merchant toggle, chat-style booking box and the 3D parcel visual. */
@Component({
  selector: 'app-landing-hero',
  standalone: true,
  imports: [RouterLink, ParcelBox3dComponent],
  template: `
    <section class="hero">
      <svg class="hero-bg" aria-hidden="true" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="sdgrid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M48 0H0V48" fill="none" stroke="#FFFFFF" stroke-width="1"></path>
          </pattern>
        </defs>
        <rect width="1440" height="900" fill="url(#sdgrid)"></rect>
        <path d="M-40 760 C 260 620, 420 820, 700 640 S 1180 420, 1500 520" fill="none" stroke="#F2A23A" stroke-width="3" stroke-dasharray="2 12" stroke-linecap="round"></path>
        <path d="M-40 300 C 300 380, 520 180, 860 260 S 1260 140, 1500 200" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="2 12" stroke-linecap="round"></path>
      </svg>

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

        <nav class="nav-links" aria-label="Main">
          <a routerLink="/register" class="nav-link">Join as Customer</a>
          <a routerLink="/merchant-registration" class="nav-link">Join as Merchant</a>
          <a routerLink="/login" class="nav-pill">Sign In</a>
        </nav>
      </header>

      <div class="hero-body">
        <div class="hero-copy">
          <div class="audience-toggle" role="group" aria-label="Choose audience">
            <button type="button" class="toggle-btn" [class.active]="audience() === 'customer'"
              [attr.aria-pressed]="audience() === 'customer'" (click)="audience.set('customer')">For customers</button>
            <button type="button" class="toggle-btn" [class.active]="audience() === 'merchant'"
              [attr.aria-pressed]="audience() === 'merchant'" (click)="audience.set('merchant')">For merchants</button>
          </div>

          @if (audience() === 'customer') {
            <h1 class="hero-headline">Just say where.<br /><span class="accent">We’ll handle the rest.</span></h1>
            <p class="hero-lede">
              Book a parcel in a few steps, see the price before you confirm, and follow every status update
              until it’s delivered — anywhere in Sri Lanka.
            </p>
          } @else {
            <h1 class="hero-headline">Your whole order list.<br /><span class="accent">One upload.</span></h1>
            <p class="hero-lede">
              Upload a CSV of orders or connect your system with our API and webhooks. SwiftDrop creates every
              parcel and keeps you updated as each one moves.
            </p>
          }

          <div class="composer">
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8B2E1F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"></path>
              <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"></path>
            </svg>
            <div class="composer-text">How much to send 2 kg from Nugegoda to Kandy?<span class="caret" aria-hidden="true"></span></div>
            <a [routerLink]="bookLink()" class="composer-btn" data-testid="hero-book-link">
              Get started
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>
            </a>
          </div>
          <ul class="prompt-pills" aria-label="Example questions for the assistant">
            <li>“What’s the status of my parcels?”</li>
            <li>“Show the history of my last delivery”</li>
            <li>“How much for a large box to Galle?”</li>
          </ul>
        </div>

        <div class="hero-visual">
          <div class="hero-glow" aria-hidden="true"></div>
          <div class="hero-box">
            <app-parcel-box-3d></app-parcel-box-3d>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .mono { font-family: var(--mono); }
    .strong { font-weight: 600; }
    .hero { position: relative; background: var(--terracotta); color: #fff; padding: 0 24px 96px; }
    .hero-bg { position: absolute; inset: 0; width: 100%; height: 100%; opacity: .16; pointer-events: none; }
    .top-bar { position: relative; max-width: 1240px; margin: 0 auto; padding: 24px 0; display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
    .brand { display: flex; align-items: center; gap: 12px; text-decoration: none; color: #fff; }
    .brand-mark { width: 44px; height: 44px; border-radius: 12px; background: #fff; display: flex; align-items: center; justify-content: center; }
    .brand-text { font-family: var(--disp); font-weight: 800; font-size: 26px; letter-spacing: -.02em; }
    .nav-links { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; padding: 6px 6px 6px 24px; border-radius: 999px; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.18); }
    .nav-link { color: #fff; text-decoration: none; font-weight: 500; font-size: 15px; }
    .nav-link:hover { color: var(--amber); }
    .nav-pill { text-decoration: none; font-weight: 600; font-size: 15px; background: var(--ink); color: #fff; padding: 12px 22px; border-radius: 999px; }
    .hero-body { position: relative; max-width: 1240px; margin: 0 auto; padding-top: 56px; display: flex; flex-wrap: wrap; gap: 56px; align-items: center; }
    .hero-copy { flex: 1 1 520px; min-width: 0; display: flex; flex-direction: column; gap: 28px; }
    .audience-toggle { display: inline-flex; align-self: flex-start; padding: 4px; border-radius: 999px; background: rgba(0,0,0,.22); }
    .toggle-btn { border: 0; cursor: pointer; padding: 12px 20px; border-radius: 999px; font: 600 15px Inter, system-ui, sans-serif; background: transparent; color: #fff; }
    .toggle-btn.active { background: #fff; color: var(--terracotta); }
    .hero-headline { margin: 0; font-family: var(--disp); font-weight: 800; font-size: clamp(48px, 6.4vw, 92px); line-height: .95; letter-spacing: -.04em; }
    .accent { color: var(--amber); }
    .hero-lede { margin: 0; font-size: 19px; line-height: 1.6; max-width: 520px; color: #F6E3DA; }
    .composer { background: #fff; color: var(--ink); border-radius: 22px; padding: 10px 10px 10px 22px; display: flex; align-items: center; gap: 12px; box-shadow: 0 24px 60px rgba(40,10,4,.35); max-width: 600px; }
    .composer-text { flex: 1; min-width: 0; font-size: 18px; color: #3A3340; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .caret { display: inline-block; width: 2px; height: 22px; background: var(--terracotta-2); margin-left: 2px; vertical-align: middle; animation: sdBlink 1s infinite; }
    .composer-btn { text-decoration: none; background: var(--terracotta-2); color: #fff; font-weight: 600; font-size: 16px; padding: 16px 22px; border-radius: 14px; white-space: nowrap; display: flex; align-items: center; gap: 8px; }
    .composer-btn:hover { background: var(--terracotta); }
    .prompt-pills { list-style: none; margin: 0; padding: 0; display: flex; gap: 10px; flex-wrap: wrap; font-size: 14px; }
    .prompt-pills li { padding: 8px 14px; border-radius: 999px; border: 1px solid rgba(255,255,255,.3); }
    .hero-visual { flex: 1 1 440px; min-width: 0; position: relative; min-height: 520px; display: flex; align-items: center; justify-content: center; }
    .hero-glow { position: absolute; left: 50%; top: 52%; width: 420px; height: 420px; transform: translate(-50%,-50%); border-radius: 50%; background: radial-gradient(circle, rgba(242,162,58,.45), rgba(242,162,58,0) 70%); }
    .hero-box { position: relative; width: 100%; max-width: 500px; }
    a:focus-visible, button:focus-visible { outline: 3px solid var(--amber); outline-offset: 2px; }
    @keyframes sdBlink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .caret { animation: none; } }
    @media (max-width: 960px) {
      .hero-visual { min-height: 0; }
      .hero-glow { display: none; }
      .hero-box { max-width: 360px; }
    }
    @media (max-width: 700px) {
      .top-bar { justify-content: center; }
      .nav-links { justify-content: center; padding: 6px 6px 6px 18px; gap: 16px; }
      .hero { padding-bottom: 64px; }
      .hero-body { padding-top: 24px; gap: 40px; }
      .composer { flex-wrap: wrap; padding: 12px; }
      .composer-text { white-space: normal; }
      .composer-btn { width: 100%; justify-content: center; box-sizing: border-box; }
    }
  `],
})
export class LandingHeroComponent {
  readonly audience = signal<Audience>('customer');

  /** Customers book through sign-up; merchants through merchant onboarding. */
  readonly bookLink = computed(() => (this.audience() === 'merchant' ? '/merchant-registration' : '/register'));
}
