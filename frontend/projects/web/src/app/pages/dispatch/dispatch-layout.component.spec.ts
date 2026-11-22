import { Component, computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from 'shared-auth';
import { DispatchLayoutComponent } from './dispatch-layout.component';
import { DispatchNotification, DispatchNotificationsService, DispatchToast } from './dispatch-notifications.service';
import { DispatchPortalState } from './dispatch-portal.state';

@Component({ standalone: true, template: '<p>child page</p>' })
class StubPageComponent {}

describe('DispatchLayoutComponent', () => {
  let fixture: ComponentFixture<DispatchLayoutComponent>;
  let component: DispatchLayoutComponent;
  let router: Router;
  let portal: DispatchPortalState;

  const notificationList = signal<DispatchNotification[]>([]);
  const toastList = signal<DispatchToast[]>([]);
  const notificationsStub = {
    queueCount: signal(24),
    failedCount: signal(7),
    notifications: notificationList,
    toasts: toastList,
    unreadCount: computed(() => notificationList().filter((n) => !n.read).length),
    start: jest.fn(),
    stop: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
    clearAll: jest.fn(),
    dismissToast: jest.fn(),
  };
  const authStub = {
    currentUser: signal({ id: 'u1', fullName: 'Dinesh Perera', email: 'd@swiftdrop.lk', role: 'DISPATCHER' }),
    logout: jest.fn().mockReturnValue(of(void 0)),
  };

  const el = () => fixture.nativeElement as HTMLElement;
  const click = (selector: string) => {
    (el().querySelector(selector) as HTMLElement).click();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    notificationList.set([]);
    toastList.set([]);
    await TestBed.configureTestingModule({
      imports: [DispatchLayoutComponent],
      providers: [
        { provide: DispatchNotificationsService, useValue: notificationsStub },
        { provide: AuthService, useValue: authStub },
        provideRouter([
          {
            // Componentless parent: the fixture itself is the layout, so the outlet shows the stub page.
            path: 'dispatch',
            children: [
              { path: '', component: StubPageComponent },
              { path: 'zones', component: StubPageComponent },
              { path: 'pricing', component: StubPageComponent },
              { path: 'settings', component: StubPageComponent },
            ],
          },
          { path: 'login', component: StubPageComponent },
        ]),
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    portal = TestBed.inject(DispatchPortalState);
    fixture = TestBed.createComponent(DispatchLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders one sidebar linking all six dispatcher pages plus settings', () => {
    expect(el().querySelectorAll('aside')).toHaveLength(1);
    const href = (id: string) => (el().querySelector(`#${id}`) as HTMLAnchorElement).getAttribute('href');
    expect(href('tab-home-link')).toBe('/dispatch');
    expect(href('tab-queue-link')).toContain('tab=queue');
    expect(href('tab-failed-link')).toContain('tab=failed');
    expect(href('tab-workload-link')).toContain('tab=workload');
    expect(href('tab-zones-link')).toBe('/dispatch/zones');
    expect(href('tab-pricing-link')).toBe('/dispatch/pricing');
    expect(href('tab-settings-link')).toBe('/dispatch/settings');
  });

  it('keeps collapsed sidebar items as centred squares, not full-width rows', () => {
    const items = Array.from(el().querySelectorAll('aside .rail-link'));
    expect(items).toHaveLength(8); // 6 pages + Settings + Log out
    items.forEach((item) => {
      expect(item.classList).toContain('rail-row');
      expect(item.classList).not.toContain('w-full');
    });
  });

  it('uses the admin-style sidebar: a fixed icon rail that widens on hover or focus', () => {
    const aside = el().querySelector('aside') as HTMLElement;
    expect(aside.className).toContain('fixed');
    expect(aside.className).toContain('w-20');
    expect(aside.className).toContain('hover:w-[272px]');
    expect(aside.className).toContain('focus-within:w-[272px]');
    expect(aside.textContent).toContain('SwiftDrop Dispatch');
  });

  it('shows each nav item name for the hover/focus label', () => {
    expect(el().querySelector('#tab-workload-link .rail-label')?.textContent?.trim()).toBe('Courier Workload');
    expect(el().querySelector('#tab-settings-link .rail-label')?.textContent?.trim()).toBe('Settings');
  });

  it('puts Settings directly above Log out at the end of the sidebar', () => {
    const footerButtons = Array.from(el().querySelectorAll('aside .rail-link')).slice(-2).map((e) => e.id);
    expect(footerButtons).toEqual(['tab-settings-link', 'sidebar-logout-btn']);
  });

  it('shows queue and failed badges from the unfiltered notification poll', () => {
    expect(el().querySelector('#tab-queue-link')?.textContent).toContain('24');
    expect(el().querySelector('#tab-failed-link')?.textContent).toContain('7');
    // Both counts use the one brand colour.
    const badges = Array.from(el().querySelectorAll('aside .rail-badge'));
    expect(badges).toHaveLength(2);
    badges.forEach((b) => expect(b.className).toContain('bg-[#a53a26]'));
    expect(notificationsStub.start).toHaveBeenCalled();
  });

  it('asks for confirmation before logging out', () => {
    click('#sidebar-logout-btn');
    expect(el().querySelector('#logout-confirm-modal')).toBeTruthy();
    expect(authStub.logout).not.toHaveBeenCalled();

    click('#logout-cancel-btn');
    expect(el().querySelector('#logout-confirm-modal')).toBeNull();

    click('#sidebar-logout-btn');
    click('#logout-confirm-btn');
    expect(authStub.logout).toHaveBeenCalledTimes(1);
  });

  it('profile chip is display only: no link, dropdown or staff administration entry', () => {
    const chip = el().querySelector('#profile-chip') as HTMLElement;
    expect(chip.tagName).toBe('DIV');
    expect(chip.getAttribute('href')).toBeNull();
    expect(chip.textContent).toContain('Dinesh Perera');
    expect(chip.textContent).toContain('DP');
    chip.click();
    fixture.detectChanges();
    expect(el().querySelector('[role="menu"]')).toBeNull();
    expect(el().textContent).not.toContain('Staff User Administration');
  });

  it('lists notifications under the bell and opens the parcel on its page', async () => {
    click('#dispatch-notification-bell-btn');
    expect(el().querySelector('#dispatch-notification-empty')).toBeTruthy();

    notificationList.set([
      { id: 'n1', kind: 'failed', title: 'Delivery attempt failed', message: 'SD-1 · Recipient absent', trackingNumber: 'SD-1', createdAt: new Date().toISOString(), read: false },
    ]);
    fixture.detectChanges();
    expect(el().querySelector('#dispatch-notification-badge')?.textContent?.trim()).toBe('1');
    expect(el().querySelector('#dispatch-notification-dropdown')?.textContent).toContain('Delivery attempt failed');

    const navigate = jest.spyOn(router, 'navigate').mockResolvedValue(true);
    component.openNotification(notificationList()[0]);
    expect(notificationsStub.markRead).toHaveBeenCalledWith('n1');
    expect(portal.queries.failed()).toBe('SD-1');
    expect(navigate).toHaveBeenCalledWith(['/dispatch'], { queryParams: { tab: 'failed' } });
  });

  it('renders toasts in the corner stack', () => {
    toastList.set([{ id: 1, kind: 'queue', title: 'New parcel awaiting assignment', message: 'SD-9' }]);
    fixture.detectChanges();
    expect(el().querySelector('.dispatch-toast')?.textContent).toContain('New parcel awaiting assignment');
  });

  it.each([
    ['/dispatch', 'home'],
    ['/dispatch?tab=queue', 'queue'],
    ['/dispatch?tab=failed', 'failed'],
    ['/dispatch?tab=workload', 'workload'],
    ['/dispatch?tab=unknown', 'queue'],
    ['/dispatch/zones', 'zones'],
    ['/dispatch/pricing?x=1', 'pricing'],
    ['/dispatch/settings', 'settings'],
  ])('maps %s to the %s page', (url, page) => {
    expect(DispatchLayoutComponent.pageFromUrl(url)).toBe(page);
  });

  it('shows one page heading and keeps a separate search per page', async () => {
    await router.navigateByUrl('/dispatch/zones');
    fixture.detectChanges();
    expect(portal.page()).toBe('zones');
    expect(el().querySelectorAll('h1')).toHaveLength(1);
    expect(el().querySelector('#dispatch-page-title')?.textContent?.trim()).toBe('Delivery Zones');
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

  it('hides the search box on the settings page', async () => {
    await router.navigateByUrl('/dispatch/settings');
    fixture.detectChanges();
    expect(el().querySelector('#top-quick-search-input')).toBeNull();
    expect(el().querySelector('#dispatch-page-title')?.textContent?.trim()).toBe('Settings');
  });
});
