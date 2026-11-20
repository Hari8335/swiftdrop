import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ParcelBox3dComponent } from './parcel-box-3d.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, ParcelBox3dComponent],
  template: `
    <div class="yum-page">
      <!-- Top Brand Bar -->
      <header class="top-bar">
        <div class="brand">
          <svg class="brand-icon" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="10" fill="#ffffff" />
            <path d="M8 12L16 7L24 12V22L16 27L8 22V12Z" fill="#a53a26" />
            <path d="M16 7V27M8 12L24 22M24 12L8 22" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          <span class="brand-text">SwiftDrop</span>
        </div>

        <nav class="nav-links">
          <a routerLink="/register" class="nav-link">Join as Customer</a>
          <a routerLink="/merchant-registration" class="nav-link">Join as Merchant</a>
          <a routerLink="/login" class="nav-pill">Sign In</a>
        </nav>
      </header>

      <main class="landing-content">
        <!-- Hero Section -->
        <section class="hero-section">
          <div class="hero-grid">
            <div class="hero-text-col">
              <div class="hero-badge">
                <span class="badge-dot"></span> Next-Generation Parcel Delivery
              </div>

              <h1 class="hero-headline">The parcel delivery you can talk to</h1>

              <p class="hero-lede">
                Say “two packages to Colombo by 2 PM”, and dispatch is scheduled.
                SwiftDrop calculates dynamic rates, coordinates couriers live, and tracks every stop across Sri Lanka.
              </p>

              <div class="hero-actions">
                <a routerLink="/register" class="hero-btn-primary">Book Delivery</a>
              </div>
            </div>

            <div class="hero-3d-col">
              <app-parcel-box-3d></app-parcel-box-3d>
            </div>
          </div>
        </section>

        <!-- Feature Bento Grid (Tactile YumLog Cards) -->
        <section class="bento-section">
          <div class="bento-grid">
            <div class="bento-card">
              <div class="card-icon-badge badge-gps" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="card-icon">
                  <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <h3>Live GPS &amp; Timeline Tracking</h3>
              <p>Real-time courier telematics, live milestone progression via Server-Sent Events, and automated proof-of-delivery photo capture.</p>
            </div>

            <div class="bento-card">
              <div class="card-icon-badge badge-pricing" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="card-icon">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <h3>Dynamic Pricing Engine</h3>
              <p>Automated zone-based rating factoring distance, parcel weight thresholds, and SLA priority with full transparency.</p>
            </div>

            <div class="bento-card">
              <div class="card-icon-badge badge-logistics" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="card-icon">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </div>
              <h3>Merchant Bulk Logistics</h3>
              <p>High-throughput CSV order orchestration, dedicated OAuth 2.0 API credentials, and resilient webhook dispatch.</p>
            </div>

            <div class="bento-card">
              <div class="card-icon-badge badge-ai" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="card-icon">
                  <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/>
                </svg>
              </div>
              <h3>AI Delivery Assistant</h3>
              <p>Natural-language parcel tracking, intelligent schedule queries, and conversational dispatch support powered by Gemini.</p>
            </div>
          </div>
        </section>

        <!-- Bottom Footer Callout -->
        <footer class="landing-footer">
          <div class="footer-inner">
            <span class="footer-brand">SwiftDrop</span>
            <p>Next-generation distributed parcel delivery platform for Sri Lanka.</p>
            <div class="footer-links">
              <a routerLink="/login">Sign In</a>
              <a routerLink="/register">Register</a>
              <a routerLink="/merchant-registration">Merchants</a>
            </div>
          </div>
        </footer>
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
      padding: 2.25rem 2rem 3rem;
      background: radial-gradient(55% 65% at 75% 45%, #b8432f 0%, #98311e 65%, #882b1a 100%), #98311e;
      color: #fff;
      overflow-x: hidden;
    }
    .top-bar {
      max-width: 1200px;
      margin: 0 auto 3.5rem;
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
      width: 36px;
      height: 36px;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .brand-text {
      font-family: var(--disp);
      font-size: 1.55rem;
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
      height: 40px;
      padding: 0 1.35rem;
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
    .landing-content {
      max-width: 1200px;
      margin: 0 auto;
    }
    .hero-section {
      padding: 1.5rem 0 3.5rem;
    }
    .hero-grid {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 3rem;
      width: 100%;
    }
    .hero-text-col {
      flex: 1 1 54%;
      min-width: 0;
      text-align: left;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }
    .hero-3d-col {
      flex: 0 0 460px;
      max-width: 500px;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .hero-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-top: 2rem;
      flex-wrap: wrap;
    }
    .hero-btn-primary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.85rem 1.85rem;
      border-radius: 9999px;
      background: #ffffff;
      color: var(--terracotta);
      font-size: 0.95rem;
      font-weight: 800;
      text-decoration: none;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.2);
      transition: transform 0.2s, background-color 0.2s, box-shadow 0.2s;
    }
    .hero-btn-primary:hover {
      background: #faf6f0;
      transform: translateY(-2px);
      box-shadow: 0 14px 30px -5px rgba(0,0,0,0.25);
    }
    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 1rem;
      border-radius: 9999px;
      background: rgba(255,255,255,0.15);
      backdrop-filter: blur(8px);
      font-size: 0.85rem;
      font-weight: 700;
      color: #fff;
      margin-bottom: 1.75rem;
    }
    .badge-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #4ade80;
      box-shadow: 0 0 8px #4ade80;
    }
    .hero-headline {
      font-family: var(--disp);
      font-size: clamp(2.75rem, 5.5vw, 5rem);
      font-weight: 900;
      line-height: 0.94;
      letter-spacing: -0.035em;
      color: #fff;
      margin: 0 0 1.75rem;
      max-width: 22ch;
      text-shadow: 0 2px 0 rgba(140,30,15,0.25);
    }
    .hero-lede {
      max-width: 36rem;
      font-size: 1.2rem;
      line-height: 1.55;
      color: rgba(255,255,255,0.9);
      margin: 0;
    }
    .bento-section {
      padding: 1.5rem 0 4rem;
    }
    .bento-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1.5rem;
    }
    .bento-card {
      background: #fff;
      color: var(--ink);
      border-radius: 28px;
      padding: 2.25rem 1.75rem;
      box-shadow: 0 20px 45px -15px rgba(29,27,44,0.3);
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .bento-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 24px 55px -12px rgba(29,27,44,0.4);
    }
    .card-icon-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 14px;
      margin-bottom: 1.25rem;
      flex-shrink: 0;
    }
    .badge-gps {
      background: #eff6ff;
      color: #2563eb;
    }
    .badge-pricing {
      background: #ecfdf5;
      color: #059669;
    }
    .badge-logistics {
      background: #fffbeb;
      color: #d97706;
    }
    .badge-ai {
      background: #f5f3ff;
      color: #7c3aed;
    }
    .card-icon {
      width: 24px;
      height: 24px;
    }
    .bento-card h3 {
      font-family: var(--disp);
      font-size: 1.35rem;
      font-weight: 900;
      letter-spacing: -0.02em;
      margin: 0 0 0.65rem;
      color: var(--ink);
    }
    .bento-card p {
      font-size: 0.95rem;
      color: var(--ink-3);
      line-height: 1.55;
      margin: 0;
      flex-grow: 1;
    }
    .landing-footer {
      border-top: 1px solid rgba(255,255,255,0.15);
      padding: 2.5rem 0 1.5rem;
      margin-top: 2rem;
    }
    .footer-inner {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
      font-size: 0.9rem;
      color: rgba(255,255,255,0.8);
    }
    .footer-brand {
      font-family: var(--disp);
      font-weight: 900;
      font-size: 1.2rem;
      color: #fff;
    }
    .footer-links {
      display: flex;
      gap: 1.5rem;
    }
    .footer-links a {
      color: rgba(255,255,255,0.85);
      text-decoration: none;
      font-weight: 600;
    }
    .footer-links a:hover { color: #fff; }
    @media (max-width: 1024px) {
      .hero-grid {
        gap: 2rem;
      }
      .hero-3d-col {
        flex: 0 0 380px;
        max-width: 400px;
      }
    }
    @media (max-width: 768px) {
      .top-bar { flex-direction: column; gap: 1rem; margin-bottom: 2rem; }
      .hero-grid {
        flex-direction: column;
        text-align: center;
        gap: 2rem;
      }
      .hero-text-col {
        align-items: center;
        text-align: center;
      }
      .hero-3d-col {
        flex: 0 0 auto;
        max-width: 270px;
        width: 100%;
        margin-top: 1rem;
      }
      .hero-actions {
        justify-content: center;
      }
      .hero-headline { font-size: 2.5rem; }
      .footer-inner { flex-direction: column; text-align: center; }
    }
  `]
})
export class LandingComponent {}
