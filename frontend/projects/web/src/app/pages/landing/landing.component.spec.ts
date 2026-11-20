import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LandingComponent } from './landing.component';

describe('LandingComponent', () => {
  let fixture: ComponentFixture<LandingComponent>;
  let component: LandingComponent;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LandingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  });

  function buttonByText(text: string): HTMLButtonElement {
    const button = Array.from(compiled.querySelectorAll('button')).find((b) => b.textContent?.trim() === text);
    expect(button).toBeTruthy();
    return button as HTMLButtonElement;
  }

  it('creates the landing component', () => {
    expect(component).toBeTruthy();
  });

  it('renders brand wordmark and the customer headline by default', () => {
    expect(compiled.querySelector('.brand-text')?.textContent).toContain('SwiftDrop');
    expect(compiled.querySelector('h1')?.textContent).toContain('Just say where.');
    expect(buttonByText('For customers').getAttribute('aria-pressed')).toBe('true');
  });

  it('renders Join as Customer, Join as Merchant, and Sign In navigation links in header', () => {
    const navLinks = compiled.querySelectorAll('.nav-links a');
    expect(navLinks.length).toBe(3);
    expect(navLinks[0].textContent?.trim()).toBe('Join as Customer');
    expect(navLinks[0].getAttribute('href')).toBe('/register');
    expect(navLinks[1].textContent?.trim()).toBe('Join as Merchant');
    expect(navLinks[1].getAttribute('href')).toBe('/merchant-registration');
    expect(navLinks[2].textContent?.trim()).toBe('Sign In');
    expect(navLinks[2].getAttribute('href')).toBe('/login');
  });

  it('switches headline and booking link when the merchant audience is chosen', () => {
    expect(compiled.querySelector('[data-testid="hero-book-link"]')?.getAttribute('href')).toBe('/register');

    buttonByText('For merchants').click();
    fixture.detectChanges();

    expect(compiled.querySelector('h1')?.textContent).toContain('Your whole order list.');
    expect(buttonByText('For merchants').getAttribute('aria-pressed')).toBe('true');
    expect(compiled.querySelector('[data-testid="hero-book-link"]')?.getAttribute('href')).toBe('/merchant-registration');
  });

  it('has no tracking links, no stats placeholders, and keeps the 3D parcel box', () => {
    expect(compiled.querySelectorAll('a[href^="/track"]').length).toBe(0);
    expect(compiled.textContent).not.toContain('Track Parcel');
    expect(compiled.textContent).not.toMatch(/\[[0-9,+h m]+\]/);
    expect(compiled.querySelector('app-parcel-box-3d')).toBeTruthy();
  });

  it('renders the four feature cards', () => {
    const cards = compiled.querySelectorAll('[data-testid="feature-card"]');
    expect(cards.length).toBe(4);
    const eyebrows = Array.from(cards).map((card) => card.querySelector('.eyebrow')?.textContent?.trim());
    expect(eyebrows).toEqual(['AI Delivery Assistant', 'Live Timeline', 'Dynamic Pricing', 'Merchant Bulk']);
  });

  it('updates the example price estimate from weight and parcel size', () => {
    const price = () => compiled.querySelector('[data-testid="estimate-price"]')?.textContent?.trim();
    // zone 770 + 3 kg × 45 = 905 → rounded to 910 (Small adds nothing)
    expect(price()).toBe('LKR 910');

    const slider = compiled.querySelector('#sd-weight') as HTMLInputElement;
    slider.value = '10';
    slider.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    // 770 + 10 × 45 = 1220
    expect(price()).toBe('LKR 1,220');

    buttonByText('Large').click();
    fixture.detectChanges();
    // 1220 + 300 for a large parcel
    expect(price()).toBe('LKR 1,520');
    expect(buttonByText('Large').getAttribute('aria-pressed')).toBe('true');
  });

  it('only describes features SwiftDrop has today', () => {
    buttonByText('For merchants').click();
    fixture.detectChanges();
    const text = compiled.textContent ?? '';
    for (const unsupported of [
      'Sinhala', 'Tamil', 'Singlish', 'Express', 'surge', 'COD', 'optimis', 'route', 'nearest courier',
      'speak', 'same day', 'next day', 'km away', 'min away', 'Arriving for pickup', 'one sentence',
    ]) {
      expect(text.toLowerCase()).not.toContain(unsupported.toLowerCase());
    }
  });

  it('goes straight from the coverage section to the footer, with no separate call-to-action band', () => {
    expect(compiled.querySelector('.cta-wrap, .final-cta')).toBeNull();
    expect(compiled.textContent).not.toContain('Your next parcel is a few clicks away');
    const coverage = compiled.querySelector('#coverage') as HTMLElement;
    expect(coverage.nextElementSibling?.tagName.toLowerCase()).toBe('app-landing-footer');
  });

  it('shows only the 3D parcel box in the hero visual, without the fee card or courier chip', () => {
    const visual = compiled.querySelector('.hero-visual') as HTMLElement;
    expect(visual.querySelector('app-parcel-box-3d')).toBeTruthy();
    expect(visual.querySelector('.booking-card, .courier-chip')).toBeNull();
    expect(compiled.textContent).not.toContain('Fee estimate');
    expect(compiled.textContent).not.toContain('Courier assigned');
  });

  describe('footer', () => {
    const footer = () => compiled.querySelector('app-landing-footer') as HTMLElement;
    const link = (text: string) =>
      Array.from(footer().querySelectorAll('a')).find((a) => a.textContent?.trim() === text) as HTMLAnchorElement;

    it('links only to real pages and landing sections', () => {
      expect(link('Join as Customer').getAttribute('href')).toBe('/register');
      expect(link('Join as Merchant').getAttribute('href')).toBe('/merchant-registration');
      expect(link('Sign In').getAttribute('href')).toBe('/login');
      expect(link('Book a delivery').getAttribute('href')).toBe('/register');
      for (const [text, id] of [['Features', 'features'], ['For merchants', 'business'], ['Coverage', 'coverage']]) {
        expect(link(text).getAttribute('href')).toBe('#' + id);
        expect(compiled.querySelector('#' + id)).toBeTruthy();
      }
      expect(footer().textContent).toContain(String(new Date().getFullYear()));
      expect(footer().querySelectorAll('a[href^="/track"]').length).toBe(0);
    });

    it('scrolls smoothly to a section instead of jumping', () => {
      const scroll = jest.fn();
      (Element.prototype as unknown as { scrollIntoView: jest.Mock }).scrollIntoView = scroll;
      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      link('Coverage').dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
      delete (Element.prototype as unknown as { scrollIntoView?: jest.Mock }).scrollIntoView;
    });

    it('has a back-to-top button', () => {
      const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
      const button = Array.from(footer().querySelectorAll('button')).find((b) => b.textContent?.includes('Back to top'));
      button?.click();
      expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
      scrollTo.mockRestore();
    });
  });
});
