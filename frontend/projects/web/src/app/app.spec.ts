import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { of } from 'rxjs';
import { App } from './app';
import { routes } from './app.routes';
import { MerchantApprovalService } from './pages/admin/merchant-approval.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App, HttpClientTestingModule],
      providers: [
        provideRouter(routes),
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Hello, web');
  });

  it('should not render notification bell for signed-out visitors', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-notification-bell')).toBeFalsy();
  });

  it('should render notification bell for customers only', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    jest.spyOn(app, 'isAuthPage').mockReturnValue(false);
    jest.spyOn(app.authService, 'hasRole').mockImplementation((role: string) => role === 'CUSTOMER');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-notification-bell')).toBeTruthy();
  });

  it('should not render notification bell for non-customer roles', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    jest.spyOn(app.authService, 'hasRole').mockImplementation((role: string) => role === 'DISPATCHER');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-notification-bell')).toBeFalsy();
  });

  it('should not show admin or dispatcher links to signed-out visitor', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('Staff Management');
    expect(compiled.textContent).not.toContain('Dispatch');
    expect(compiled.textContent).not.toContain('Zones');
    expect(compiled.textContent).not.toContain('Pricing');
  });

  it('should show admin links only when user has ADMIN role', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    jest.spyOn(app, 'isAuthPage').mockReturnValue(false);
    jest.spyOn(app.authService, 'hasRole').mockImplementation((role: string) => role === 'ADMIN');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Admin');
    expect(compiled.textContent).toContain('Staff Management');
    expect(compiled.textContent).toContain('Merchant Approval');
    expect(compiled.textContent).toContain('Reports');
    expect(compiled.textContent).not.toContain('Dispatch');
    expect(compiled.textContent).not.toContain('Zones');
    expect(compiled.textContent).not.toContain('Pricing');
  });

  it('should show dispatcher links only when user has DISPATCHER role', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    jest.spyOn(app, 'isAuthPage').mockReturnValue(false);
    jest.spyOn(app.authService, 'hasRole').mockImplementation((role: string) => role === 'DISPATCHER');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Dispatch');
    expect(compiled.textContent).toContain('Zones');
    expect(compiled.textContent).toContain('Pricing');
    expect(compiled.textContent).not.toContain('Staff Management');
  });

  it('should hide top bar navigation on auth routes (login, register, merchant-registration)', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    jest.spyOn(app, 'isAuthPage').mockReturnValue(true);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('header')).toBeFalsy();
  });

  it('should treat /auth/callback as an auth page to hide shell header and padding', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    (app as any).currentUrl = () => '/auth/callback?error=account_disabled';
    expect(app.isAuthPage()).toBe(true);
  });

  it('should hide the global top bar and page padding on merchant routes', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    jest.spyOn(app, 'isMerchantPage').mockReturnValue(true);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('header')).toBeFalsy();
    expect(compiled.querySelector('main')?.classList.contains('p-6')).toBe(false);
  });

  it('should show top bar navigation on non-auth signed-in routes', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    jest.spyOn(app, 'isAuthPage').mockReturnValue(false);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('header')).toBeTruthy();
  });

  it('should render the persistent admin top bar on admin routes', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    jest.spyOn(app, 'isAdminPage').mockReturnValue(true);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('header')).toBeTruthy();
    expect(compiled.textContent).toContain('Search staff, merchants, reports');
    expect(compiled.textContent).toContain('Sign out');
    expect(compiled.querySelector('#admin-notification-bell-btn')).toBeTruthy();
  });

  it('should display notification badge when pending merchants exist and toggle dropdown', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const merchantService = TestBed.inject(MerchantApprovalService);
    jest.spyOn(app, 'isAdminPage').mockReturnValue(true);
    // Seed the pending count signal via the service's internal signal
    (merchantService as any).pendingCountSignal.set(3);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const badge = compiled.querySelector('#admin-notification-badge');
    expect(badge).toBeTruthy();
    expect(badge?.textContent?.trim()).toBe('3');

    // Click bell button to open dropdown (mock loadPendingCount to avoid HTTP)
    jest.spyOn(merchantService, 'loadPendingCount').mockReturnValue(of(3));
    const bellBtn = compiled.querySelector('#admin-notification-bell-btn') as HTMLButtonElement;
    bellBtn.click();
    fixture.detectChanges();

    const dropdown = compiled.querySelector('#admin-notification-dropdown');
    expect(dropdown).toBeTruthy();
    expect(dropdown?.textContent).toContain('3 pending');
    expect(dropdown?.textContent).toContain('Review applications');

    // Close dropdown
    app.closeAdminNotifications();
    fixture.detectChanges();
    expect(compiled.querySelector('#admin-notification-dropdown')).toBeFalsy();
  });

  it('should display security alerts in admin notification dropdown and allow dismissal', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    jest.spyOn(app, 'isAdminPage').mockReturnValue(true);
    app.securityAlerts.set([
      {
        id: 'alert-1',
        occurredAt: '2026-11-21T10:00:00Z',
        actorId: 'SYSTEM',
        actorRole: 'SECURITY',
        action: 'ACCOUNT_LOCKED',
        targetType: 'USER',
        targetId: 'hacker@example.com',
        ipAddress: '192.168.1.50',
        details: { portal: 'CUSTOMER', reason: '5 consecutive failed password attempts' },
      },
    ]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const badge = compiled.querySelector('#admin-notification-badge');
    expect(badge).toBeTruthy();
    expect(badge?.textContent?.trim()).toBe('1');

    // Open dropdown
    const bellBtn = compiled.querySelector('#admin-notification-bell-btn') as HTMLButtonElement;
    bellBtn.click();
    fixture.detectChanges();

    const dropdown = compiled.querySelector('#admin-notification-dropdown');
    expect(dropdown).toBeTruthy();
    expect(dropdown?.textContent).toContain('Account Lockout');
    expect(dropdown?.textContent).toContain('CUSTOMER');
    expect(dropdown?.textContent).toContain('hacker@example.com');
    expect(dropdown?.textContent).toContain('5 failed password attempts • Locked 15 mins');

    // Dismiss alert
    app.dismissSecurityAlert('alert-1');
    fixture.detectChanges();

    expect(app.activeSecurityAlerts().length).toBe(0);
    expect(app.totalAdminNotificationCount()).toBe(0);
    expect(localStorage.getItem('swiftdrop_dismissed_security_alerts')).toContain('alert-1');
  });

  it('should restore dismissed alert ids from localStorage upon initialization', () => {
    localStorage.setItem('swiftdrop_dismissed_security_alerts', JSON.stringify(['stored-alert-99']));
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app.dismissedAlertIds().has('stored-alert-99')).toBe(true);
    localStorage.removeItem('swiftdrop_dismissed_security_alerts');
  });

  it('should call authService.logout() and redirect to landing page on logout', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const router = TestBed.inject(Router);
    const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
    const logoutSpy = jest.spyOn(app.authService, 'logout').mockReturnValue(of(undefined));

    app.logout();

    expect(logoutSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/']);
  });

  it('should open admin logout confirmation modal and cancel cleanly', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    jest.spyOn(app, 'isAdminPage').mockReturnValue(true);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('#logout-confirm-modal')).toBeNull();

    const logoutBtn = compiled.querySelector('#admin-sidebar-logout-btn') as HTMLButtonElement;
    expect(logoutBtn).toBeTruthy();
    logoutBtn.click();
    fixture.detectChanges();

    expect(compiled.querySelector('#logout-confirm-modal')).not.toBeNull();
    expect(compiled.querySelector('#logout-confirm-title')?.textContent).toContain('Log out of SwiftDrop?');

    const cancelBtn = compiled.querySelector('#logout-cancel-btn') as HTMLButtonElement;
    expect(cancelBtn).toBeTruthy();
    cancelBtn.click();
    fixture.detectChanges();

    expect(compiled.querySelector('#logout-confirm-modal')).toBeNull();
  });

  it('should confirm logout from the admin confirmation modal', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    jest.spyOn(app, 'isAdminPage').mockReturnValue(true);
    const logoutSpy = jest.spyOn(app, 'logout').mockImplementation();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    app.openLogoutConfirm();
    fixture.detectChanges();

    const confirmBtn = compiled.querySelector('#logout-confirm-btn') as HTMLButtonElement;
    expect(confirmBtn).toBeTruthy();
    confirmBtn.click();
    fixture.detectChanges();

    expect(compiled.querySelector('#logout-confirm-modal')).toBeNull();
    expect(logoutSpy).toHaveBeenCalled();
  });

  it('should only show the activity indicator dot on merchant approval when pending requests exist', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const merchantService = TestBed.inject(MerchantApprovalService);
    jest.spyOn(app, 'isAdminPage').mockReturnValue(true);

    // Initial state: 0 pending requests -> no dot
    (merchantService as any).pendingCountSignal.set(0);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const merchantLink = compiled.querySelector('a[routerLink="/admin/merchants"]') as HTMLElement;
    expect(merchantLink).toBeTruthy();
    expect(merchantLink.querySelector('.bg-\\[\\#9b432f\\].rounded-full')).toBeNull();

    // New request comes in: pending count > 0 -> dot is displayed
    (merchantService as any).pendingCountSignal.set(2);
    fixture.detectChanges();
    expect(merchantLink.querySelector('.bg-\\[\\#9b432f\\].rounded-full')).not.toBeNull();
  });
});
