import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthShellActive, AuthShellComponent } from './auth-shell.component';

@Component({
  standalone: true,
  imports: [AuthShellComponent],
  template: `
    <lib-auth-shell [active]="active" badge="Badge text" headline="Big headline" lede="Some lede" [steps]="steps">
      <form class="projected-form"><button type="submit">Go</button></form>
    </lib-auth-shell>
  `,
})
class HostComponent {
  active: AuthShellActive = 'signin';
  steps: string[] = [];
}

describe('AuthShellComponent', () => {
  function render(active: AuthShellActive, steps: string[] = []) {
    TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.active = active;
    fixture.componentInstance.steps = steps;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders the brand, the text and the projected form inside the white card', () => {
    const el = render('signin');
    expect(el.querySelector('.brand-text')?.textContent).toBe('SwiftDrop');
    expect(el.querySelector('.hero-badge')?.textContent).toContain('Badge text');
    expect(el.querySelector('h1.hero-headline')?.textContent).toBe('Big headline');
    expect(el.querySelector('.hero-lede')?.textContent).toBe('Some lede');
    expect(el.querySelector('.auth-card .projected-form')).toBeTruthy();
    expect(el.querySelector('.hero-steps')).toBeNull();
  });

  it.each([
    ['customer', 'Join as Customer'],
    ['merchant', 'Join as Merchant'],
    ['signin', 'Sign In'],
  ] as const)('highlights the %s link and marks it as the current page', (active, label) => {
    const el = render(active);
    const pills = el.querySelectorAll('.nav-links .nav-pill');
    expect(pills.length).toBe(1);
    expect(pills[0].textContent?.trim()).toBe(label);
    expect(pills[0].getAttribute('aria-current')).toBe('page');
    expect(el.querySelectorAll('.nav-links a').length).toBe(3);
  });

  it('lists numbered steps when given', () => {
    const el = render('merchant', ['Apply', 'Get approved']);
    const items = Array.from(el.querySelectorAll('.hero-steps li')).map((li) => [
      li.querySelector('.step-num')?.textContent,
      li.lastElementChild?.textContent,
    ]);
    expect(items).toEqual([['1', 'Apply'], ['2', 'Get approved']]);
  });
});
