import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Landing page footer: route ribbon, brand, link groups, call to action and a large wordmark. */
@Component({
  selector: 'app-landing-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="footer">
      <div class="ribbon" aria-hidden="true">
        <svg viewBox="0 0 1200 40" preserveAspectRatio="none">
          <path d="M0 22 C 150 4, 300 38, 450 20 S 750 4, 900 22 S 1100 36, 1200 18" fill="none" stroke="#F2A23A" stroke-width="2" stroke-dasharray="2 10" stroke-linecap="round" vector-effect="non-scaling-stroke"></path>
        </svg>
        <span class="parcel">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16121C" stroke-width="2" stroke-linejoin="round"><path d="M12 2l9 5v10l-9 5-9-5V7z" fill="#F2A23A"></path><path d="M3 7l9 5 9-5M12 12v10"></path></svg>
        </span>
      </div>

      <div class="container grid">
        <div class="brand-col">
          <a routerLink="/" class="brand" aria-label="SwiftDrop home">
            <span class="mark">
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7E2A1C" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
            </span>
            <span class="name">SwiftDrop</span>
          </a>
          <p class="tagline">Parcel delivery for people and businesses, across all 25 districts of Sri Lanka.</p>
          <ul class="facts" aria-label="SwiftDrop at a glance">
            <li><span class="num">25</span> districts</li>
            <li>Live status updates</li>
          </ul>
        </div>

        <nav class="col" aria-labelledby="footer-start">
          <h2 id="footer-start">Get started</h2>
          <a routerLink="/register">Join as Customer</a>
          <a routerLink="/merchant-registration">Join as Merchant</a>
          <a routerLink="/login">Sign In</a>
        </nav>

        <nav class="col" aria-labelledby="footer-explore">
          <h2 id="footer-explore">Explore</h2>
          <a href="#features" (click)="goTo($event, 'features')">Features</a>
          <a href="#business" (click)="goTo($event, 'business')">For merchants</a>
          <a href="#coverage" (click)="goTo($event, 'coverage')">Coverage</a>
        </nav>

        <div class="cta-col">
          <h2>Ready to send?</h2>
          <p>Create an account in a minute and book your first parcel with the price shown up front.</p>
          <a routerLink="/register" class="cta">
            Book a delivery
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>
          </a>
        </div>
      </div>

      <div class="container bottom">
        <span>© {{ year }} SwiftDrop · Built for Sri Lanka</span>
        <button type="button" class="top-btn" (click)="backToTop()">
          Back to top
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"></path></svg>
        </button>
      </div>

      <div class="wordmark" aria-hidden="true">SwiftDrop</div>
    </footer>
  `,
  styles: [`
    :host { display: block; }
    .footer { position: relative; overflow: hidden; background: var(--ink); color: var(--on-dark-muted); padding: 0 24px; }
    .container { max-width: 1240px; margin: 0 auto; }
    .ribbon { position: relative; height: 40px; margin: 0 -24px; }
    .ribbon svg { position: absolute; inset: 0; width: 100%; height: 100%; opacity: .7; }
    .parcel { position: absolute; top: 6px; left: 0; animation: ride 16s linear infinite; }
    .parcel svg { display: block; animation: bob 1.2s ease-in-out infinite; }
    .grid { display: grid; grid-template-columns: 1.6fr 1fr 1fr 1.4fr; gap: 48px; padding: 56px 0 48px; }
    .brand { display: inline-flex; align-items: center; gap: 12px; text-decoration: none; color: #fff; }
    .mark { width: 40px; height: 40px; border-radius: 11px; background: #fff; display: flex; align-items: center; justify-content: center; }
    .name { font-family: var(--disp); font-weight: 800; font-size: 24px; letter-spacing: -.02em; }
    .tagline { margin: 18px 0 20px; max-width: 320px; font-size: 15px; line-height: 1.6; }
    .facts { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
    .facts li { padding: 7px 12px; border-radius: 999px; background: var(--ink-2); color: #E8E2EC; font-size: 13px; }
    .num { font-family: var(--mono); font-weight: 700; color: var(--amber); }
    h2 { margin: 0 0 16px; font-size: 12px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; color: var(--amber); }
    .col { display: flex; flex-direction: column; gap: 12px; }
    .col a { position: relative; align-self: flex-start; color: #E8E2EC; text-decoration: none; font-size: 15px; }
    .col a::after { content: ''; position: absolute; left: 0; bottom: -3px; width: 100%; height: 2px; background: var(--amber); transform: scaleX(0); transform-origin: left; transition: transform .25s ease; }
    .col a:hover { color: #fff; }
    .col a:hover::after, .col a:focus-visible::after { transform: scaleX(1); }
    .cta-col { padding: 24px; border-radius: 20px; background: linear-gradient(160deg, var(--terracotta), #5E1F14); color: #F6E3DA; }
    .cta-col h2 { color: #fff; font-family: var(--disp); font-size: 24px; letter-spacing: -.01em; text-transform: none; margin-bottom: 8px; }
    .cta-col p { margin: 0 0 18px; font-size: 14px; line-height: 1.55; }
    .cta { display: inline-flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: 999px; background: #fff; color: var(--terracotta); font-weight: 700; text-decoration: none; transition: gap .2s ease; }
    .cta:hover { gap: 12px; }
    .bottom { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px; padding: 20px 0; border-top: 1px solid rgba(255,255,255,.1); font-size: 14px; }
    .top-btn { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 16px; border: 1px solid rgba(255,255,255,.2); border-radius: 999px; background: transparent; color: #E8E2EC; font: 600 14px Inter, system-ui, sans-serif; cursor: pointer; }
    .top-btn:hover { border-color: var(--amber); color: #fff; }
    .wordmark { margin: 8px -24px -0.18em; text-align: center; font-family: var(--disp); font-weight: 800; font-size: clamp(72px, 17vw, 260px); line-height: .8; letter-spacing: -.05em; color: transparent; background: linear-gradient(180deg, rgba(242,162,58,.28), rgba(242,162,58,0) 85%); -webkit-background-clip: text; background-clip: text; user-select: none; pointer-events: none; }
    a:focus-visible, button:focus-visible { outline: 3px solid var(--amber); outline-offset: 3px; border-radius: 6px; }
    @keyframes ride { from { transform: translateX(-30px); } to { transform: translateX(calc(100vw + 30px)); } }
    @keyframes bob { 0%, 100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-3px) rotate(4deg); } }
    @media (prefers-reduced-motion: reduce) { .parcel, .parcel svg { animation: none; } .parcel { left: 12%; } }
    @media (max-width: 960px) { .grid { grid-template-columns: 1fr 1fr; gap: 36px; } }
    @media (max-width: 560px) {
      .footer { padding: 0 16px; }
      .ribbon, .wordmark { margin-left: -16px; margin-right: -16px; }
      .grid { grid-template-columns: 1fr; padding-top: 40px; }
    }
  `],
})
export class LandingFooterComponent {
  readonly year = new Date().getFullYear();

  /** Smoothly scroll to a section on the landing page instead of jumping. */
  goTo(event: Event, id: string): void {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView?.({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }

  backToTop(): void {
    window.scrollTo?.({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
