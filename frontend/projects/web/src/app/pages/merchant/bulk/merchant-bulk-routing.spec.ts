import { Component, WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { AuthService, User } from 'shared-auth';
import { routes } from '../../../app.routes';

@Component({ standalone: true, template: 'Fallback page' })
class FallbackComponent {}

describe('Bulk merchant route authorization', () => {
  let authenticated: boolean, role: string;
  let logout: jest.Mock;
  let currentUser: WritableSignal<User | null>;
  beforeEach(() => {
    authenticated = true; role = 'MERCHANT';
    logout = jest.fn().mockReturnValue(of(undefined));
    currentUser = signal(null);
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(),
      provideRouter([
        routes.find(route => route.path === 'merchant')!,
        { path: '', component: FallbackComponent },
        { path: 'login', component: FallbackComponent },
        { path: 'customer', component: FallbackComponent },
      ]),
      { provide: AuthService, useValue: {
        isInitialized: () => true, isAuthenticated: () => authenticated,
        hasAnyRole: (roles: string[]) => roles.includes(role), userRole: () => role,
        currentUser, logout,
      } },
    ] });
  });
  it('loads the actual lazy bulk page for a merchant', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/merchant/bulk');
    expect(TestBed.inject(Router).url).toBe('/merchant/bulk');
    expect(harness.routeNativeElement?.textContent).toContain('Bulk CSV orders');
    expect(harness.routeNativeElement?.querySelector('aside [aria-label="Bulk CSV Orders"][aria-current="page"]')).toBeTruthy();
    expect(harness.routeNativeElement?.textContent).not.toContain('Welcome back');
  });
  it('uses the registered business name on both pages and the sample account name without a profile request', async () => {
    const http = TestBed.inject(HttpTestingController);
    currentUser.set({
      id: 'registered-user', role: 'MERCHANT', merchantId: 'registered-merchant',
      fullName: 'Asha Perera', email: 'asha@example.test',
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/merchant');
    http.expectOne('/api/v1/merchant/profile').flush({ businessName: 'North Star Stores' });
    harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('#merchant-profile-chip')?.textContent?.trim()).toBe('North Star Stores');

    await harness.navigateByUrl('/merchant/bulk');
    expect(harness.routeNativeElement!.querySelector('#bulk-merchant-profile-chip')?.textContent?.trim()).toBe('North Star Stores');
    http.expectNone('/api/v1/merchant/profile');

    currentUser.set({ id: 'sample-user', role: 'MERCHANT', fullName: 'Sample Merchant', email: 'sample@example.test' });
    harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('#bulk-merchant-profile-chip')?.textContent?.trim()).toBe('Sample Merchant');
    http.expectNone('/api/v1/merchant/profile');
  });
  it('keeps the same sidebar when moving between bulk upload and the dashboard', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/merchant');
    const sidebar = harness.routeNativeElement!.querySelector('aside')!;
    const bulkButton = sidebar.querySelector<HTMLButtonElement>('[aria-label="Bulk CSV Orders"]')!;
    expect(bulkButton.querySelector('svg')?.getAttribute('stroke-width')).toBe('2.6');
    bulkButton.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/merchant/bulk');
    expect(harness.routeNativeElement!.querySelector('aside')).toBe(sidebar);
    expect(harness.routeNativeElement!.querySelector('app-merchant-bulk')).toBeTruthy();

    sidebar.querySelector<HTMLButtonElement>('[aria-label="Orders Dashboard"]')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/merchant');
    expect(harness.routeNativeElement!.querySelector('aside')).toBe(sidebar);
    expect(harness.routeNativeElement!.textContent).toContain('Welcome back');

    await harness.navigateByUrl('/merchant/bulk');
    sidebar.querySelector<HTMLButtonElement>('[aria-label="Integrations"]')!.click();
    harness.detectChanges();
    const credentialsButton = Array.from(sidebar.querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'API Credentials')!;
    credentialsButton.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/merchant');
    expect(harness.routeNativeElement!.querySelector('aside')).toBe(sidebar);
    expect(harness.routeNativeElement!.querySelector('app-merchant-credentials')).toBeTruthy();
  });
  it('cancels desktop logout and confirms mobile logout from the bulk page', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/merchant/bulk');
    const page = harness.routeNativeElement!;
    page.querySelector<HTMLButtonElement>('#merchant-sidebar-logout-btn')!.click();
    harness.detectChanges();
    expect(page.querySelector('[role="alertdialog"]')?.textContent).toContain('Log out of SwiftDrop?');
    expect(logout).not.toHaveBeenCalled();

    page.querySelector<HTMLButtonElement>('#merchant-logout-cancel-btn')!.click();
    harness.detectChanges();
    expect(page.querySelector('[role="alertdialog"]')).toBeNull();
    expect(logout).not.toHaveBeenCalled();
    expect(TestBed.inject(Router).url).toBe('/merchant/bulk');

    page.querySelector<HTMLButtonElement>('nav[aria-label="Merchant navigation (mobile)"] button[aria-label="Log out"]')!.click();
    harness.detectChanges();
    page.querySelector<HTMLButtonElement>('#merchant-logout-confirm-btn')!.click();
    await harness.fixture.whenStable();
    expect(logout).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(Router).url).toBe('/login');
  });
  it('redirects unauthenticated users to login with the return URL', async () => {
    authenticated = false;
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/merchant/bulk');
    expect(TestBed.inject(Router).url).toContain('/login?returnUrl=');
    expect(harness.routeNativeElement?.textContent).not.toContain('Bulk CSV orders');
  });
  it('redirects a customer away from the merchant upload', async () => {
    role = 'CUSTOMER';
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/merchant/bulk');
    expect(TestBed.inject(Router).url).toBe('/customer');
  });
});
