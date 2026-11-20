import { Component } from '@angular/core';
import { LandingFeaturesComponent } from './landing-features.component';
import { LandingFooterComponent } from './landing-footer.component';
import { LandingHeroComponent } from './landing-hero.component';

/**
 * Public landing page. Defines the shared design tokens (inherited by the hero and feature
 * sections) and renders the how-it-works steps, coverage map, and footer.
 */
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [LandingHeroComponent, LandingFeaturesComponent, LandingFooterComponent],
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
            <svg role="img" aria-label="Map of Sri Lanka showing delivery coverage from Colombo to Jaffna, Trincomalee, Kandy and Galle" viewBox="0 0 200 344">
              <path d="M192.8 238.5 L194.0 244.6 L193.5 248.0 L189.6 261.5 L189.1 266.3 L187.1 271.1 L184.7 274.9 L185.3 277.0 L184.4 279.4 L176.4 292.0 L173.8 294.7 L168.9 298.2 L165.2 299.8 L149.6 312.1 L146.4 313.8 L136.3 317.4 L136.1 316.1 L134.9 315.8 L133.9 318.5 L128.6 321.0 L110.9 325.3 L108.8 326.1 L107.5 327.9 L105.2 327.4 L103.0 328.3 L96.6 333.1 L95.1 334.8 L90.2 334.8 L84.7 337.7 L80.4 336.0 L74.1 336.3 L72.3 333.7 L69.6 334.7 L66.8 334.3 L65.1 333.1 L63.7 333.7 L62.5 332.5 L55.8 330.5 L52.7 328.4 L52.1 329.0 L42.9 319.7 L42.8 318.6 L37.7 308.6 L36.0 300.6 L34.4 297.8 L33.1 292.3 L31.9 291.2 L32.0 290.7 L33.1 290.6 L32.4 285.8 L23.4 262.7 L22.2 255.7 L22.2 249.5 L23.3 245.3 L19.3 231.0 L19.8 228.9 L19.8 230.2 L22.2 235.9 L22.7 235.9 L23.3 234.7 L23.3 232.1 L22.7 230.0 L21.2 229.5 L20.4 228.5 L21.0 226.6 L16.3 195.1 L16.9 194.7 L17.5 195.1 L18.3 190.3 L17.2 187.9 L17.0 183.2 L14.8 172.6 L11.6 162.6 L9.5 153.0 L9.5 150.3 L10.0 150.9 L10.3 149.3 L9.5 142.8 L12.1 140.2 L13.8 135.6 L16.3 131.7 L13.5 137.5 L14.5 139.0 L16.3 139.3 L14.7 143.3 L13.6 143.9 L13.5 147.4 L12.0 152.0 L12.2 154.5 L14.1 156.8 L12.4 160.3 L15.1 162.2 L19.0 162.5 L21.0 161.1 L19.7 158.0 L17.8 156.1 L17.6 155.2 L20.4 149.8 L19.3 146.8 L19.3 143.3 L18.5 141.9 L20.4 137.8 L22.2 124.2 L23.7 122.2 L24.3 115.7 L27.9 112.5 L30.1 106.8 L30.8 98.6 L28.8 93.3 L29.1 86.3 L27.9 81.7 L30.5 80.8 L35.4 76.4 L39.0 74.2 L43.8 60.1 L44.7 56.6 L44.9 50.9 L40.5 48.2 L39.4 43.2 L42.3 41.2 L46.8 39.9 L48.7 37.5 L51.5 36.2 L48.5 32.2 L40.7 27.4 L39.4 25.8 L42.1 25.9 L49.8 29.9 L54.6 31.1 L57.9 33.6 L58.4 34.6 L57.3 35.1 L57.9 36.2 L57.3 36.8 L59.1 38.0 L63.3 37.0 L70.9 34.0 L77.4 35.4 L82.7 37.8 L86.7 38.6 L81.0 34.6 L76.7 33.1 L74.6 31.6 L72.3 31.6 L71.1 32.5 L69.9 31.7 L66.0 31.4 L60.0 26.2 L50.6 21.4 L49.6 21.4 L49.8 23.4 L51.8 25.6 L50.6 26.8 L44.7 22.5 L42.9 21.7 L46.4 25.2 L44.3 24.8 L38.3 21.7 L35.0 19.2 L31.5 17.6 L31.4 18.2 L30.5 17.6 L29.7 14.7 L27.4 11.2 L29.2 10.3 L32.5 7.2 L34.0 6.6 L40.6 7.1 L45.3 6.9 L45.9 10.4 L49.3 11.3 L50.1 12.3 L52.7 11.8 L53.7 12.4 L63.4 23.0 L72.3 27.5 L72.3 26.9 L69.3 25.4 L61.9 19.3 L55.8 12.3 L52.7 10.7 L47.9 9.5 L46.6 8.6 L46.5 7.3 L48.2 6.6 L54.0 6.0 L55.7 6.3 L56.9 7.1 L58.4 11.1 L69.4 24.0 L74.4 27.1 L97.6 45.9 L102.2 51.4 L101.1 52.0 L99.1 50.3 L96.9 50.2 L101.7 55.2 L103.4 56.1 L102.4 54.1 L102.6 53.4 L104.3 53.5 L109.2 64.1 L105.6 63.2 L105.2 64.4 L108.4 65.7 L108.6 67.7 L110.4 66.6 L112.1 71.2 L113.7 73.6 L115.6 74.9 L115.2 76.1 L114.4 76.4 L113.3 74.7 L108.6 72.9 L112.6 77.1 L112.6 78.7 L113.6 79.4 L111.9 81.2 L113.3 82.3 L114.7 82.2 L115.9 81.1 L117.3 78.2 L120.3 81.8 L123.0 86.5 L126.9 89.1 L128.7 93.4 L131.7 95.4 L133.9 102.0 L134.4 100.9 L135.7 101.5 L135.5 102.3 L138.6 106.1 L138.6 107.6 L136.3 109.6 L138.0 109.0 L139.8 113.0 L140.1 115.0 L138.0 115.4 L138.4 114.0 L137.9 112.9 L137.0 112.8 L136.3 114.2 L137.4 117.0 L136.8 118.3 L133.9 116.3 L132.5 116.0 L131.1 116.6 L130.0 118.1 L130.4 118.8 L131.7 118.6 L133.4 117.2 L137.0 121.3 L138.9 121.8 L142.7 121.7 L144.1 120.9 L143.2 118.9 L147.2 117.7 L149.9 120.4 L151.8 128.2 L151.9 130.5 L150.8 129.8 L149.7 127.5 L148.7 127.0 L149.1 130.6 L149.6 131.7 L152.7 132.6 L156.8 150.5 L155.3 152.6 L153.0 145.1 L152.4 145.1 L152.4 149.8 L153.4 150.4 L154.3 152.4 L155.7 153.5 L157.2 153.4 L157.7 151.5 L158.2 151.5 L159.5 155.8 L162.8 161.5 L164.0 160.2 L164.5 162.6 L166.3 161.5 L166.7 162.5 L166.3 164.9 L169.2 168.4 L168.0 168.9 L167.5 170.8 L168.5 173.7 L170.3 175.7 L172.6 175.4 L174.1 178.6 L178.9 184.2 L179.1 185.9 L177.2 186.4 L173.2 182.3 L171.8 181.8 L170.7 181.9 L169.8 182.8 L169.2 184.6 L171.2 185.2 L172.6 184.1 L174.5 184.9 L175.1 185.5 L174.9 186.4 L179.0 191.1 L178.4 192.1 L179.0 193.5 L179.5 192.8 L179.2 191.7 L182.1 193.5 L184.1 198.1 L183.6 200.4 L184.1 201.8 L182.8 203.4 L184.7 206.2 L183.8 206.9 L184.0 207.5 L184.6 207.7 L185.8 206.8 L186.5 211.5 L187.1 211.5 L187.3 209.1 L188.2 207.4 L188.0 206.1 L188.6 206.1 L189.3 206.8 L189.8 209.3 L191.1 211.3 L193.2 218.5 Z M181.3 190.2 L180.1 187.0 L180.5 184.5 L180.1 183.5 L181.2 184.5 L183.9 190.7 L186.9 195.5 L188.4 202.9 L188.3 204.6 L187.1 205.6 L185.3 204.1 L185.3 195.9 Z M10.9 70.0 L9.6 68.9 L9.8 68.0 L10.9 67.7 L14.7 67.7 L21.6 69.9 L25.1 71.9 L27.9 74.7 L22.7 72.9 L27.4 78.7 L25.3 78.5 L18.1 72.3 L14.7 70.8 Z M12.3 34.0 L11.0 35.3 L8.8 35.4 L6.9 34.7 L6.0 33.7 L6.2 29.3 L7.7 31.0 L11.3 31.9 Z M26.2 24.0 L23.6 21.1 L21.6 17.1 L22.5 15.6 L23.2 12.2 L25.1 11.8 L26.0 12.1 L25.6 15.0 L26.1 18.0 L26.8 18.8 L28.8 18.8 L29.4 20.9 L32.7 22.6 L33.1 23.4 L32.5 24.0 L31.4 24.0 L28.8 23.0 Z" fill="#2A2430" stroke="#4A4252" stroke-width="1" stroke-linejoin="round"></path>
              <path id="sd-r1" d="M23.3 252.5 Q 55 226 88.3 221.6" fill="none" stroke="#F2A23A" stroke-width="1.6" stroke-dasharray="2 4"></path>
              <path id="sd-r2" d="M23.3 252.5 Q 62 140 37.1 20.3" fill="none" stroke="#F2A23A" stroke-width="1.6" stroke-dasharray="2 4"></path>
              <path id="sd-r3" d="M23.3 252.5 Q 30 300 53.6 326.7" fill="none" stroke="#F2A23A" stroke-width="1.6" stroke-dasharray="2 4"></path>
              <path id="sd-r4" d="M88.3 221.6 Q 122 172 137.2 111.5" fill="none" stroke="#F2A23A" stroke-width="1.6" stroke-dasharray="2 4"></path>
              <circle r="3.2" fill="#FFFFFF"><animateMotion dur="3s" repeatCount="indefinite"><mpath href="#sd-r1"></mpath></animateMotion></circle>
              <circle r="3.2" fill="#FFFFFF"><animateMotion dur="6s" repeatCount="indefinite"><mpath href="#sd-r2"></mpath></animateMotion></circle>
              <circle r="3.2" fill="#FFFFFF"><animateMotion dur="3.6s" repeatCount="indefinite"><mpath href="#sd-r3"></mpath></animateMotion></circle>
              <circle r="3.2" fill="#FFFFFF"><animateMotion dur="4.2s" repeatCount="indefinite"><mpath href="#sd-r4"></mpath></animateMotion></circle>
              <g font-family="Inter, sans-serif" font-size="9" fill="#E8E2EC">
                <circle cx="23.3" cy="252.5" r="4.5" fill="#F2A23A"></circle><text x="30.3" y="255.5">Colombo</text>
                <circle cx="88.3" cy="221.6" r="3" fill="#FFFFFF"></circle><text x="95.3" y="224.6">Kandy</text>
                <circle cx="37.1" cy="20.3" r="3" fill="#FFFFFF"></circle><text x="44.1" y="23.3">Jaffna</text>
                <circle cx="53.6" cy="326.7" r="3" fill="#FFFFFF"></circle><text x="60.6" y="329.7">Galle</text>
                <circle cx="137.2" cy="111.5" r="3" fill="#FFFFFF"></circle><text x="144.2" y="114.5">Trinco</text>
              </g>
            </svg>
          </div>
        </div>
      </section>


      <app-landing-footer></app-landing-footer>
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


    a:focus-visible { outline: 3px solid var(--amber); outline-offset: 2px; }

    @media (max-width: 700px) {
      .steps-section { padding: 0 16px 72px; }
      .coverage { padding: 72px 16px; }
    }
  `],
})
export class LandingComponent {
}
