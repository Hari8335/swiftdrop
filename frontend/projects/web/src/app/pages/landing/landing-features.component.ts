import { DecimalPipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

type ParcelSize = 'SMALL' | 'MEDIUM' | 'LARGE';

/**
 * Example fee inputs for the landing-page estimator (Kandy → Colombo). They mirror the real pricing
 * factors (zone, weight, size) but are not the live rules; real fees are quoted at booking.
 */
export const EXAMPLE_ZONE_FEE = 770;
export const EXAMPLE_PER_KG = 45;
export const EXAMPLE_SIZE_FEE: Record<ParcelSize, number> = { SMALL: 0, MEDIUM: 150, LARGE: 300 };

/** Landing feature cards: AI assistant, live timeline, example price estimator and merchant bulk. */
@Component({
  selector: 'app-landing-features',
  standalone: true,
  imports: [DecimalPipe, RouterLink],
  template: `
    <section class="features" id="features">
      <div class="container">
        <div class="section-head">
          <h2 class="section-title">Everything a delivery needs, <span class="accent">shown — not told.</span></h2>
          <p class="section-lede">Each card is a live slice of the product, so you can see SwiftDrop working before you sign up.</p>
        </div>

        <div class="bento-grid">
          <article class="card dark wide" data-testid="feature-card">
            <div class="copy">
              <span class="eyebrow amber">AI Delivery Assistant</span>
              <h3>Ask about any parcel in plain words.</h3>
              <p class="dim">Check a parcel’s status, its tracking history, a summary of all your parcels or a fee estimate — no digging through menus.</p>
            </div>
            <div class="chat" aria-label="Example conversation">
              <div class="bubble me">Where is my parcel SD-20261114-LCFZKK?</div>
              <div class="bubble bot">It’s in transit — picked up on 18 Nov and now moving between sorting facilities.</div>
              <div class="bubble me">How much to send 2 kg to Kandy?</div>
              <div class="bubble bot">About LKR 860 for a small parcel. You’ll see the exact price before you book.</div>
              <div class="suggestions"><span>Show my parcels</span><span>Tracking history</span></div>
            </div>
          </article>

          <article class="card light" data-testid="feature-card">
            <span class="eyebrow blue">Live Timeline</span>
            <h3 class="sr-only">Live Timeline Tracking</h3>
            <ol class="timeline">
              <li><span class="tl-dot"></span><div><div class="strong">Picked up</div><div class="small">10:42 · courier collected it</div></div></li>
              <li><span class="tl-dot"></span><div><div class="strong">In transit</div><div class="small">11:20 · between facilities</div></div></li>
              <li class="current"><span class="tl-dot"><span class="ring"></span></span><div><div class="strong">Out for delivery</div><div class="small">14:05 · on the way to you</div></div></li>
              <li class="pending"><span class="tl-dot"></span><div><div class="strong">Delivered</div></div></li>
            </ol>
          </article>

          <article class="card light" data-testid="feature-card">
            <span class="eyebrow green">Dynamic Pricing</span>
            <h3 class="sr-only">Dynamic Pricing Estimator</h3>
            <div class="price-row">
              <span class="route">Kandy → Colombo</span>
              <span class="price mono" data-testid="estimate-price">LKR {{ price() | number }}</span>
            </div>
            <div class="weight">
              <label for="sd-weight"><span>Weight</span><span class="mono">{{ weight() }} kg</span></label>
              <input id="sd-weight" type="range" min="1" max="20" step="1" [value]="weight()" (input)="onWeight($event)" />
            </div>
            <div class="speed" role="group" aria-label="Parcel size">
              @for (option of sizes; track option.value) {
                <button type="button" [class.active]="size() === option.value" [attr.aria-pressed]="size() === option.value"
                  (click)="size.set(option.value)">{{ option.label }}</button>
              }
            </div>
            <p class="small">Example estimate based on weight, size and delivery zone. Your exact price is shown before you book.</p>
          </article>

          <article class="card amber-bg wide" id="business" data-testid="feature-card">
            <div class="copy">
              <span class="eyebrow">Merchant Bulk</span>
              <h3>Drop a CSV. Every order becomes a parcel.</h3>
              <a routerLink="/merchant-registration" class="btn-ink">Join as merchant</a>
            </div>
            <div class="csv-flow" aria-hidden="true">
              <div class="csv-file">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#1F7A4D" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6M8 13h8M8 17h8"></path></svg>
                <span class="mono">orders.csv</span>
              </div>
              <svg class="arrow" width="40" height="24" viewBox="0 0 40 24" fill="none" stroke="#16121C" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h34M28 4l8 8-8 8"></path></svg>
              <div class="routes">
                <div class="row head"><span>128 parcels created</span><span class="ready">Ready</span></div>
                <div class="row"><span>Colombo</span><span class="mono">42</span></div>
                <div class="row"><span>Gampaha</span><span class="mono">51</span></div>
                <div class="row"><span>Kandy</span><span class="mono">35</span></div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .features { padding: 112px 24px 96px; }
    .container { max-width: 1240px; margin: 0 auto; display: flex; flex-direction: column; gap: 48px; }
    .mono { font-family: var(--mono); }
    .strong { font-weight: 600; }
    .small { margin: 0; font-size: 13px; line-height: 1.5; color: var(--muted); }
    .sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
    .section-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 24px; }
    .section-title { margin: 0; max-width: 680px; font-family: var(--disp); font-weight: 800; font-size: clamp(36px, 4.4vw, 60px); line-height: 1; letter-spacing: -.03em; }
    .accent { color: var(--terracotta-2); }
    .section-lede { margin: 0; max-width: 380px; font-size: 17px; line-height: 1.6; color: var(--muted-2); }
    .bento-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
    .card { min-width: 0; border-radius: 28px; padding: 28px; display: flex; flex-direction: column; gap: 18px; }
    .card h3 { margin: 0; font-family: var(--disp); font-size: 34px; line-height: 1.05; letter-spacing: -.02em; }
    .wide { grid-column: span 2; flex-flow: row wrap; gap: 32px; padding: 32px; }
    .dark { background: var(--ink); color: #fff; }
    .light { background: #fff; border: 1px solid #EADFD5; }
    .amber-bg { background: var(--amber); color: var(--ink); align-items: center; }
    .copy { flex: 1 1 240px; display: flex; flex-direction: column; gap: 14px; }
    .eyebrow { align-self: flex-start; font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
    .eyebrow.amber { color: var(--amber); }
    .eyebrow.blue { color: #2F5BD3; }
    .eyebrow.green { color: #1F7A4D; }
    .dim { margin: 0; color: var(--on-dark-muted); font-size: 16px; line-height: 1.6; }
    .chat { flex: 1 1 320px; display: flex; flex-direction: column; gap: 10px; font-size: 15px; }
    .bubble { padding: 12px 16px; max-width: 85%; }
    .me { align-self: flex-end; background: var(--terracotta-2); border-radius: 16px 16px 4px 16px; }
    .bot { align-self: flex-start; background: var(--ink-2); border-radius: 16px 16px 16px 4px; }
    .suggestions { display: flex; gap: 8px; flex-wrap: wrap; padding-top: 4px; }
    .suggestions span { font-size: 13px; padding: 8px 12px; border-radius: 999px; background: var(--ink-2); color: #E8E2EC; }
    .timeline { list-style: none; margin: 0; padding: 0; }
    .timeline li { position: relative; display: flex; gap: 14px; padding-bottom: 20px; }
    .timeline li:last-child { padding-bottom: 0; }
    .timeline li:not(:last-child)::before { content: ''; position: absolute; left: 6px; top: 16px; bottom: 0; width: 2px; background: #2F5BD3; }
    .timeline li.current::before { background: #DCD4E0; }
    .tl-dot { position: relative; flex-shrink: 0; width: 14px; height: 14px; margin-top: 3px; border-radius: 50%; background: #2F5BD3; }
    .pending .tl-dot { background: transparent; border: 2px solid #DCD4E0; box-sizing: border-box; }
    .pending .strong { color: #6F6876; }
    .ring { position: absolute; inset: 0; border-radius: 50%; background: #2F5BD3; animation: sdPulse 1.8s ease-out infinite; }
    .price-row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; }
    .route { font-size: 15px; color: var(--muted-2); }
    .price { font-size: 34px; font-weight: 700; }
    .weight { display: flex; flex-direction: column; gap: 8px; }
    .weight label { display: flex; justify-content: space-between; font-size: 14px; color: var(--muted-2); }
    .weight input { width: 100%; height: 28px; accent-color: var(--terracotta-2); }
    .speed { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .speed button { height: 44px; border-radius: 12px; cursor: pointer; font: 600 15px Inter, system-ui, sans-serif; border: 2px solid #DCD4E0; background: #fff; color: var(--ink); }
    .speed button.active { border-color: var(--ink); background: var(--ink); color: #fff; }
    .btn-ink { align-self: flex-start; text-decoration: none; color: #fff; background: var(--ink); padding: 14px 20px; border-radius: 12px; font-weight: 600; }
    .csv-flow { flex: 1 1 340px; display: flex; align-items: center; gap: 16px; }
    .csv-file { flex-shrink: 0; width: 120px; padding: 16px; border-radius: 16px; background: #fff; display: flex; flex-direction: column; align-items: center; gap: 8px; font-size: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.12); }
    .routes { flex: 1; min-width: 0; padding: 14px; border-radius: 16px; background: #fff; display: flex; flex-direction: column; gap: 8px; font-size: 13px; box-shadow: 0 10px 30px rgba(0,0,0,.12); }
    .row { display: flex; justify-content: space-between; gap: 8px; color: var(--muted-2); }
    .row.head { font-weight: 600; color: var(--ink); }
    .ready { color: #1F7A4D; }
    a:focus-visible, button:focus-visible, input:focus-visible { outline: 3px solid var(--amber); outline-offset: 2px; }
    @keyframes sdPulse { 0% { transform: scale(1); opacity: .7; } 100% { transform: scale(2.6); opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .ring { animation: none; } }
    @media (max-width: 700px) {
      .features { padding: 72px 16px 64px; }
      .wide { grid-column: auto; }
      .card h3 { font-size: 28px; }
      .csv-flow { flex-wrap: wrap; }
      .arrow { display: none; }
    }
  `],
})
export class LandingFeaturesComponent {
  readonly weight = signal(3);
  readonly size = signal<ParcelSize>('SMALL');
  readonly sizes: { value: ParcelSize; label: string }[] = [
    { value: 'SMALL', label: 'Small' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'LARGE', label: 'Large' },
  ];

  readonly price = computed(() => {
    const raw = EXAMPLE_ZONE_FEE + this.weight() * EXAMPLE_PER_KG + EXAMPLE_SIZE_FEE[this.size()];
    return Math.round(raw / 10) * 10;
  });

  onWeight(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(value)) {
      this.weight.set(Math.min(20, Math.max(1, value)));
    }
  }
}
