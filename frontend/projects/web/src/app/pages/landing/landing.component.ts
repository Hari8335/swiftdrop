import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LandingFeaturesComponent } from './landing-features.component';
import { LandingHeroComponent } from './landing-hero.component';

/**
 * Public landing page. Defines the shared design tokens (inherited by the hero and feature
 * sections) and renders the how-it-works steps, coverage map, final call to action and footer.
 */
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, LandingHeroComponent, LandingFeaturesComponent],
  template: `
    <div class="sd-page">
      <app-landing-hero></app-landing-hero>
      <app-landing-features></app-landing-features>

      <section class="steps-section">
        <div class="container stack">
          <h2 class="title small-title">Three steps. No paperwork.</h2>
          <ol class="steps">
            <li class="step on">
              <span class="mono num">01</span>
              <h3>Book it</h3>
              <p>Enter pickup, drop-off, weight and size. You see the price before you confirm.</p>
            </li>
            <li class="step on">
              <span class="mono num">02</span>
              <h3>We assign a courier</h3>
              <p>Our dispatch team assigns a courier to your parcel, and you’re notified when it happens.</p>
            </li>
            <li class="step">
              <span class="mono num">03</span>
              <h3>Track live</h3>
              <p>Follow every status update and share the tracking link with whoever is receiving it.</p>
            </li>
          </ol>
        </div>
      </section>

      <section class="coverage" id="coverage">
        <div class="container coverage-grid">
          <div class="coverage-copy">
            <span class="eyebrow">Island-wide</span>
            <h2 class="title">From Jaffna to Galle, we deliver island-wide.</h2>
            <p class="dim">Pickups and drop-offs in all 25 districts, grouped into five delivery zones so your price is clear before you book.</p>
            <div class="tags">
              <span><span class="mono amber">25</span> districts</span>
              <span><span class="mono amber">5</span> delivery zones</span>
            </div>
          </div>
          <div class="map">
            <svg role="img" aria-label="Illustrated map of Sri Lanka showing delivery coverage" viewBox="0 0 200 330">
              <path d="M92 8 C110 6 118 20 112 34 C124 48 140 80 150 110 C164 150 172 190 166 230 C160 268 140 296 112 308 C88 316 66 304 54 282 C40 256 34 220 36 186 C38 150 46 118 58 92 C68 70 80 50 84 32 C86 20 84 10 92 8 Z" fill="#2A2430" stroke="#4A4252" stroke-width="1.2"></path>
              <path id="sd-r1" d="M44 228 Q 70 200 100 196" fill="none" stroke="#F2A23A" stroke-width="1.6" stroke-dasharray="2 4"></path>
              <path id="sd-r2" d="M44 228 Q 40 120 92 22" fill="none" stroke="#F2A23A" stroke-width="1.6" stroke-dasharray="2 4"></path>
              <path id="sd-r3" d="M44 228 Q 50 270 72 296" fill="none" stroke="#F2A23A" stroke-width="1.6" stroke-dasharray="2 4"></path>
              <path id="sd-r4" d="M100 196 Q 130 150 142 112" fill="none" stroke="#F2A23A" stroke-width="1.6" stroke-dasharray="2 4"></path>
              <circle r="3.2" fill="#FFFFFF"><animateMotion dur="3s" repeatCount="indefinite"><mpath href="#sd-r1"></mpath></animateMotion></circle>
              <circle r="3.2" fill="#FFFFFF"><animateMotion dur="6s" repeatCount="indefinite"><mpath href="#sd-r2"></mpath></animateMotion></circle>
              <circle r="3.2" fill="#FFFFFF"><animateMotion dur="3.6s" repeatCount="indefinite"><mpath href="#sd-r3"></mpath></animateMotion></circle>
              <circle r="3.2" fill="#FFFFFF"><animateMotion dur="4.2s" repeatCount="indefinite"><mpath href="#sd-r4"></mpath></animateMotion></circle>
              <g font-family="Inter, sans-serif" font-size="8" fill="#E8E2EC">
                <circle cx="44" cy="228" r="4.5" fill="#F2A23A"></circle><text x="10" y="242">Colombo</text>
                <circle cx="100" cy="196" r="3" fill="#FFFFFF"></circle><text x="106" y="199">Kandy</text>
                <circle cx="92" cy="22" r="3" fill="#FFFFFF"></circle><text x="98" y="25">Jaffna</text>
                <circle cx="72" cy="296" r="3" fill="#FFFFFF"></circle><text x="78" y="306">Galle</text>
                <circle cx="142" cy="112" r="3" fill="#FFFFFF"></circle><text x="148" y="115">Trinco</text>
              </g>
            </svg>
          </div>
        </div>
      </section>

      <section class="cta-wrap">
        <div class="container final-cta">
          <h2 class="title">Your next parcel is a few clicks away.</h2>
          <div class="cta-actions">
            <a routerLink="/register" class="cta-primary">Book a delivery</a>
            <a routerLink="/merchant-registration" class="cta-secondary">Join as merchant</a>
          </div>
        </div>
      </section>

      <footer class="landing-footer">
        <div class="container footer-inner">
          <span class="footer-brand">SwiftDrop</span>
          <div class="footer-links">
            <a routerLink="/login">Sign In</a>
            <a routerLink="/register">Join as Customer</a>
            <a routerLink="/merchant-registration">Join as Merchant</a>
          </div>
          <span>© {{ year }} SwiftDrop</span>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      --terracotta: #7E2A1C;
      --terracotta-2: #8B2E1F;
      --amber: #F2A23A;
      --ink: #16121C;
      --ink-2: #2A2430;
      --cream: #FBF5EF;
      --muted: #5C5563;
      --muted-2: #4A4350;
      --on-dark-muted: #BDB5C4;
      --disp: 'Bricolage Grotesque', ui-rounded, system-ui, sans-serif;
      --mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
      font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      color: var(--ink);
      background: var(--cream);
    }
    .sd-page { width: 100%; overflow: hidden; }
    .container { max-width: 1240px; margin: 0 auto; }
    .stack { display: flex; flex-direction: column; gap: 40px; }
    .mono { font-family: var(--mono); }
    .amber { color: var(--amber); }
    .title { margin: 0; font-family: var(--disp); font-weight: 800; font-size: clamp(36px, 4.4vw, 60px); line-height: 1; letter-spacing: -.03em; }
    .small-title { font-size: clamp(32px, 3.6vw, 48px); }
    .eyebrow { font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--amber); }
    .dim { margin: 0; max-width: 460px; color: var(--on-dark-muted); font-size: 17px; line-height: 1.6; }

    .steps-section { padding: 0 24px 112px; }
    .steps { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; }
    .step { border-top: 3px solid #DCD4E0; padding-top: 24px; display: flex; flex-direction: column; gap: 10px; }
    .step.on { border-top-color: var(--terracotta-2); }
    .num { font-weight: 700; color: var(--muted); }
    .step.on .num { color: var(--terracotta-2); }
    .step h3 { margin: 0; font-size: 22px; }
    .step p { margin: 0; color: var(--muted-2); line-height: 1.6; }

    .coverage { background: var(--ink); color: #fff; padding: 112px 24px; }
    .coverage-grid { display: flex; flex-wrap: wrap; gap: 64px; align-items: center; }
    .coverage-copy { flex: 1 1 400px; display: flex; flex-direction: column; gap: 20px; }
    .tags { display: flex; gap: 12px; flex-wrap: wrap; }
    .tags > span { font-size: 14px; padding: 10px 14px; border-radius: 12px; background: var(--ink-2); }
    .map { flex: 1 1 380px; display: flex; justify-content: center; }
    .map svg { width: 100%; max-width: 380px; }

    .cta-wrap { padding: 96px 24px; }
    .final-cta { background: var(--terracotta); color: #fff; border-radius: 36px; padding: 64px 48px; display: flex; flex-wrap: wrap; gap: 32px; align-items: center; justify-content: space-between; }
    .final-cta .title { max-width: 640px; }
    .cta-actions { display: flex; gap: 12px; flex-wrap: wrap; }
    .cta-primary { text-decoration: none; background: #fff; color: var(--terracotta); font-weight: 700; padding: 18px 28px; border-radius: 999px; font-size: 17px; }
    .cta-secondary { text-decoration: none; border: 2px solid rgba(255,255,255,.6); color: #fff; font-weight: 600; padding: 16px 26px; border-radius: 999px; font-size: 17px; }
    .cta-secondary:hover { border-color: #fff; }

    .landing-footer { background: var(--ink); color: var(--on-dark-muted); padding: 40px 24px; }
    .footer-inner { display: flex; flex-wrap: wrap; gap: 24px; justify-content: space-between; align-items: center; font-size: 14px; }
    .footer-brand { font-family: var(--disp); font-weight: 800; font-size: 20px; color: #fff; }
    .footer-links { display: flex; gap: 24px; flex-wrap: wrap; }
    .footer-links a { color: var(--on-dark-muted); text-decoration: none; }
    .footer-links a:hover { color: #fff; }
    a:focus-visible { outline: 3px solid var(--amber); outline-offset: 2px; }

    @media (max-width: 700px) {
      .steps-section { padding: 0 16px 72px; }
      .coverage { padding: 72px 16px; }
      .cta-wrap { padding: 64px 16px; }
      .final-cta { padding: 40px 24px; border-radius: 28px; }
    }
  `],
})
export class LandingComponent {
  readonly year = new Date().getFullYear();
}
