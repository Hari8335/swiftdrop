import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DispatchLayoutComponent } from './dispatch-layout.component';
import { DispatchPortalState } from './dispatch-portal.state';
import { DispatchService } from './dispatch.service';

@Component({ standalone: true, template: '<p>child page</p>' })
class StubPageComponent {}

describe('DispatchLayoutComponent', () => {
  let fixture: ComponentFixture<DispatchLayoutComponent>;
  let router: Router;
  let portal: DispatchPortalState;
  const dispatchServiceSpy = {
    unassignedCount: signal(24),
    totalFailedCount: signal(7),
    loadUnassignedParcels: jest.fn().mockReturnValue(of({})),
    loadFailedParcels: jest.fn().mockReturnValue(of({})),
  };

  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    jest.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [DispatchLayoutComponent],
      providers: [
        { provide: DispatchService, useValue: dispatchServiceSpy },
        provideRouter([
          {
            path: 'dispatch',
            component: DispatchLayoutComponent,
            children: [
              { path: '', component: StubPageComponent },
              { path: 'zones', component: StubPageComponent },
              { path: 'pricing', component: StubPageComponent },
            ],
          },
        ]),
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    portal = TestBed.inject(DispatchPortalState);
    fixture = TestBed.createComponent(DispatchLayoutComponent);
    fixture.detectChanges();
  });

  it('renders one sidebar linking all six dispatcher pages', () => {
    expect(el().querySelectorAll('aside')).toHaveLength(1);
    const href = (id: string) => (el().querySelector(`#${id}`) as HTMLAnchorElement).getAttribute('href');
    expect(href('tab-home-link')).toBe('/dispatch');
    expect(href('tab-queue-link')).toContain('tab=queue');
    expect(href('tab-failed-link')).toContain('tab=failed');
    expect(href('tab-workload-link')).toContain('tab=workload');
    expect(href('tab-zones-link')).toBe('/dispatch/zones');
    expect(href('tab-pricing-link')).toBe('/dispatch/pricing');
  });

  it('shows queue and failed badges on every page', () => {
    expect(el().querySelector('#tab-queue-link')?.textContent).toContain('24');
    expect(el().querySelector('#tab-failed-link')?.textContent).toContain('7');
  });

  it.each([
    ['/dispatch', 'home'],
    ['/dispatch?tab=queue', 'queue'],
    ['/dispatch?tab=failed', 'failed'],
    ['/dispatch?tab=workload', 'workload'],
    ['/dispatch?tab=unknown', 'queue'],
    ['/dispatch/zones', 'zones'],
    ['/dispatch/pricing?x=1', 'pricing'],
  ])('maps %s to the %s page', (url, page) => {
    expect(DispatchLayoutComponent.pageFromUrl(url)).toBe(page);
  });

  it('highlights the active page and keeps a separate search per page', async () => {
    await router.navigateByUrl('/dispatch/zones');
    fixture.detectChanges();
    expect(portal.page()).toBe('zones');
    expect(el().querySelector('#tab-zones-link')?.getAttribute('aria-current')).toBe('page');

    const input = el().querySelector('#top-quick-search-input') as HTMLInputElement;
    input.value = 'Western';
    input.dispatchEvent(new Event('input'));
    expect(portal.queries.zones()).toBe('Western');

    await router.navigateByUrl('/dispatch?tab=failed');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(portal.page()).toBe('failed');
    expect(portal.query()).toBe('');
    expect(portal.queries.zones()).toBe('Western');
  });
});
