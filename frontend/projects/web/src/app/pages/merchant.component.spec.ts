import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { WritableSignal, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { AuthService, User } from 'shared-auth';
import { MERCHANT_DASHBOARD_REFRESH_MS, MerchantComponent } from './merchant.component';
import {
  DeliveryAttempt,
  MerchantOrderDetails,
  MerchantOrderListPage,
  OrderCounts,
  WebhookDeliveryDetail,
  WebhookDeliveryItem,
  WebhookSettings,
} from './merchant/merchant.model';
import { MerchantService } from './merchant/merchant.service';

describe('MerchantComponent', () => {
  let component: MerchantComponent;
  let fixture: ComponentFixture<MerchantComponent>;
  let merchantService: jest.Mocked<MerchantService>;

  const mockOrderPage: MerchantOrderListPage = {
    content: [
      {
        orderId: 'ord-101',
        parcelId: 'pcl-101',
        trackingNumber: 'SD-20261028-101',
        status: 'IN_TRANSIT',
        recipientName: 'Amara Fernando',
        recipientAddress: 'Colombo 03',
        fee: 750.0,
        createdAt: '2026-10-28T12:00:00Z',
      },
      {
        orderId: 'ord-102',
        parcelId: 'pcl-102',
        trackingNumber: 'SD-20261028-102',
        status: 'DELIVERED',
        recipientName: 'Kavinda Silva',
        recipientAddress: 'Kandy',
        fee: 900.0,
        createdAt: '2026-10-28T14:00:00Z',
      },
    ],
    totalElements: 2,
    totalPages: 1,
    page: 0,
    size: 20,
  };

  const mockCounts: OrderCounts = {
    total: 10,
    created: 2,
    pickedUp: 1,
    inTransit: 2,
    outForDelivery: 1,
    delivered: 3,
    failed: 1,
    cancelled: 0,
  };

  const mockOrderDetails: MerchantOrderDetails = {
    ...mockOrderPage.content[0],
    externalReference: 'store-ref-101',
    status: 'FAILED',
    history: [
      { fromStatus: null, toStatus: 'CREATED', occurredAt: '2026-10-28T12:00:00Z', reason: 'Order created' },
      { fromStatus: 'OUT_FOR_DELIVERY', toStatus: 'FAILED', occurredAt: '2026-10-29T10:00:00Z', reason: 'Recipient absent' },
    ],
  };

  beforeEach(async () => {
    const serviceMock: Partial<jest.Mocked<MerchantService>> = {
      getMerchantProfile: jest.fn().mockReturnValue(of({ businessName: 'North Star Stores' })),
      getOrders: jest.fn().mockReturnValue(of(mockOrderPage)),
      getOrderCounts: jest.fn().mockReturnValue(of(mockCounts)),
      getMerchantProfile: jest.fn().mockReturnValue(of({
        merchantId: 'merchant-test-id', businessName: 'Acme Stores (Pvt) Ltd', contactName: 'Alice', status: 'APPROVED',
      })),
      getOrderDetails: jest.fn().mockReturnValue(of(mockOrderDetails)),
      getWebhookSettings: jest.fn().mockReturnValue(
        of({
          merchantId: 'merchant-test-id',
          url: 'https://api.testmerchant.com/webhook',
          active: true,
          subscribedEvents: ['PARCEL_STATUS_CHANGED'],
          secretConfigured: true,
          secretPreview: 'whsec_••••••••••••••••3f8a',
          rawSecret: null,
          createdAt: '2026-10-20T10:00:00Z',
          updatedAt: '2026-10-25T10:00:00Z',
        })
      ),
      getDeliveryLogs: jest.fn().mockReturnValue(of({
        content: [], totalElements: 0, totalPages: 0, page: 0, size: 20,
      })),
      updateWebhookSettings: jest.fn().mockReturnValue(
        of({
          merchantId: 'merchant-test-id',
          url: 'https://api.testmerchant.com/webhook',
          active: true,
          subscribedEvents: ['PARCEL_STATUS_CHANGED'],
          secretConfigured: true,
          secretPreview: 'whsec_••••••••••••••••3f8a',
          rawSecret: null,
          createdAt: '2026-10-20T10:00:00Z',
          updatedAt: '2026-10-28T10:00:00Z',
        })
      ),
      triggerTestWebhook: jest.fn().mockReturnValue(
        of({
          success: true,
          statusCode: 200,
          latencyMs: 85,
          attemptedAt: '2026-10-28T10:00:00Z',
          targetUrl: 'https://api.testmerchant.com/webhook',
          signatureSent: 't=123,v1=abc',
          timestampSent: '123',
          responseBodySummary: '{"ok":true}',
          errorMessage: null,
        })
      ),
      retryDelivery: jest.fn().mockReturnValue(
        of({
          deliveryId: 'del-1',
          eventId: 'evt-1',
          eventType: 'PARCEL_STATUS_CHANGED',
          trackingNumber: 'SD-1',
          targetUrl: 'https://api.testmerchant.com/webhook',
          status: 'SUCCESS',
          httpStatusCode: 200,
          attempts: 2,
          createdAt: '2026-10-28T10:00:00Z',
        })
      ),
      getDeliveryDetail: jest.fn().mockReturnValue(
        of({
          deliveryId: 'del-success-01',
          eventId: 'evt-01',
          eventType: 'PARCEL_STATUS_CHANGED',
          status: 'SUCCESS',
          targetUrl: 'https://api.testmerchant.com/webhook',
          attempts: 1,
          httpStatusCode: 200,
          requestHeaders: { 'Content-Type': 'application/json' },
          payload: { trackingNumber: 'SD-20261028-101' },
          responseHeaders: { 'Content-Type': 'application/json' },
          responseBody: '{"ok":true}',
          lastAttemptAt: '2026-10-28T12:05:00Z',
          nextRetryAt: null,
          retryHistory: [],
          createdAt: '2026-10-28T12:05:00Z',
        })
      ),
    };

    await TestBed.configureTestingModule({
      imports: [MerchantComponent],
      providers: [{ provide: MerchantService, useValue: serviceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(MerchantComponent);
    component = fixture.componentInstance;
    merchantService = TestBed.inject(MerchantService) as jest.Mocked<MerchantService>;
    fixture.detectChanges();
  });

  it('should create the merchant component and load initial orders and counts', () => {
    expect(component).toBeTruthy();
    expect(merchantService.getOrders).toHaveBeenCalled();
    expect(merchantService.getOrderCounts).toHaveBeenCalled();
    expect(component.orders()).toHaveLength(2);
    expect(component.counts().total).toBe(10);
    expect(component.isLoadingOrders()).toBe(false);
  });

  it('shows the merchant identity (never a hardcoded Sample Merchant), the notification bell, and sidebar logout without a profile dropdown', () => {
    fixture.detectChanges();
    const chip = fixture.nativeElement.querySelector('#merchant-profile-chip')?.textContent ?? '';
    expect(chip).not.toContain('Sample Merchant');
    // No authenticated user in this fixture: neutral fallback, same as the welcome heading.
    expect(chip).toContain(component.merchantName());
    expect(chip).toContain('Merchant Partner');
    expect(fixture.nativeElement.querySelector('#profile-menu-btn')).toBeNull();
    expect(fixture.nativeElement.querySelector('#merchant-notification-bell-btn')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#merchant-sidebar-logout-btn')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[aria-label="Orders Dashboard"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[aria-label="Integrations"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[aria-label="Bulk CSV Orders"]')).toBeTruthy();
  });

  it('loads and displays the selected order actual details and failed history', () => {
    component.viewOrderDetails(mockOrderPage.content[0]);
    fixture.detectChanges();

    expect(merchantService.getOrderDetails).toHaveBeenCalledWith('ord-101');
    expect(component.orderDetails()?.externalReference).toBe('store-ref-101');
    expect(fixture.nativeElement.textContent).toContain('store-ref-101');
    expect(fixture.nativeElement.textContent).toContain('FAILED');
    expect(fixture.nativeElement.textContent).toContain('Recipient absent');
  });

  it('shows cancellation reason and recorded timestamp in the timeline', () => {
    const cancelled = {
      ...mockOrderDetails,
      status: 'CANCELLED' as const,
      history: [{ fromStatus: 'CREATED', toStatus: 'CANCELLED' as const,
        occurredAt: '2026-10-28T12:15:00Z', reason: 'Duplicate order' }],
    };
    merchantService.getOrderDetails.mockReturnValueOnce(of(cancelled));

    component.viewOrderDetails(mockOrderPage.content[0]);
    fixture.detectChanges();

    expect(component.orderDetails()?.status).toBe('CANCELLED');
    expect(fixture.nativeElement.textContent).toContain('CANCELLED');
    expect(fixture.nativeElement.textContent).toContain('Duplicate order');
    expect(fixture.nativeElement.textContent).toContain('Oct 28, 2026');
  });

  it('does not retain old details when switching orders and closing the modal', () => {
    const first = new Subject<MerchantOrderDetails>();
    merchantService.getOrderDetails
      .mockReturnValueOnce(first.asObservable())
      .mockReturnValueOnce(of({ ...mockOrderDetails, ...mockOrderPage.content[1], externalReference: 'store-ref-102', history: [] }));

    component.viewOrderDetails(mockOrderPage.content[0]);
    expect(component.isLoadingOrderDetails()).toBe(true);
    component.viewOrderDetails(mockOrderPage.content[1]);
    expect(component.orderDetails()?.externalReference).toBe('store-ref-102');
    expect(component.orderDetails()?.trackingNumber).toBe('SD-20261028-102');
    component.closeOrderDetails();
    expect(component.orderDetails()).toBeNull();
    expect(component.selectedOrder()).toBeNull();
  });

  it('renders an API error and can retry order details', () => {
    merchantService.getOrderDetails
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' })))
      .mockReturnValueOnce(of(mockOrderDetails));

    component.viewOrderDetails(mockOrderPage.content[0]);
    expect(component.orderDetailsError()).toBeTruthy();
    component.retryOrderDetails();
    expect(component.orderDetails()?.status).toBe('FAILED');
    expect(component.orderDetailsError()).toBeNull();
  });

  it('should switch tabs between orders, settings, and deliveries', () => {
    expect(component.activeTab()).toBe('orders');

    component.activeTab.set('settings');
    expect(component.activeTab()).toBe('settings');

    component.activeTab.set('deliveries');
    expect(component.activeTab()).toBe('deliveries');
  });

  it('shows the three integration links only when the chevron dropdown is open', () => {
    const integrationsButton = fixture.nativeElement.querySelector('[aria-label="Integrations"]') as HTMLButtonElement;
    const chevron = integrationsButton.querySelector('svg:last-child');
    expect(chevron?.querySelector('path')?.getAttribute('d')).toBe('m6 9 6 6 6-6');
    expect(integrationsButton.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('#merchant-integrations-menu')).toBeNull();

    integrationsButton.click();
    fixture.detectChanges();
    const menu = fixture.nativeElement.querySelector('#merchant-integrations-menu') as HTMLElement;
    expect(integrationsButton.getAttribute('aria-expanded')).toBe('true');
    expect(chevron?.classList.contains('rotate-180')).toBe(true);
    expect(Array.from(menu.querySelectorAll('button'), (button) => button.textContent?.trim())).toEqual([
      'Webhook Settings', 'Webhook Delivery Logs', 'API Credentials',
    ]);

    const deliveryLogsButton = Array.from(menu.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Webhook Delivery Logs')) as HTMLButtonElement;
    deliveryLogsButton.click();
    fixture.detectChanges();

    expect(component.activeTab()).toBe('deliveries');
    expect(integrationsButton.getAttribute('aria-expanded')).toBe('true');
    expect(menu.querySelector('[aria-current="page"]')?.textContent).toContain('Webhook Delivery Logs');

    integrationsButton.click();
    fixture.detectChanges();
    expect(integrationsButton.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('#merchant-integrations-menu')).toBeNull();
  });

  it('updates the mobile Integrations submenu state when navigating back to orders', () => {
    component.selectTab('credentials');
    fixture.detectChanges();
    expect(component.integrationsMenuOpen()).toBe(true);

    const ordersButton = fixture.nativeElement.querySelector('[aria-label="Orders Dashboard"]') as HTMLButtonElement;
    ordersButton.click();
    fixture.detectChanges();

    expect(component.activeTab()).toBe('orders');
    expect(component.integrationsMenuOpen()).toBe(false);
  });

  it('should reload orders on status filter change with page reset to 0', () => {
    component.onStatusFilterChange('DELIVERED');

    expect(component.selectedStatusFilter()).toBe('DELIVERED');
    expect(component.currentPage()).toBe(0);
    expect(merchantService.getOrders).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'DELIVERED',
        page: 0,
      })
    );
  });

  it('should reload orders on search query change', () => {
    component.searchQuery = 'SD-20261028-101';
    component.onSearchChange();

    expect(component.currentPage()).toBe(0);
    expect(merchantService.getOrders).toHaveBeenCalledWith(
      expect.objectContaining({
        trackingNumber: 'SD-20261028-101',
        page: 0,
      })
    );
  });

  it('should reload orders on date filter change', () => {
    component.fromDate = '2026-10-01';
    component.toDate = '2026-10-28';
    component.onDateFilterChange();

    expect(component.currentPage()).toBe(0);
    expect(merchantService.getOrders).toHaveBeenCalledWith(
      expect.objectContaining({
        from: expect.any(String),
        to: expect.any(String),
        page: 0,
      })
    );
  });

  it('should navigate to another page when onPageChange is called', () => {
    component.onPageChange(2);

    expect(component.currentPage()).toBe(2);
    expect(merchantService.getOrders).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
      })
    );
  });

  it('should reset filters when resetFilters is clicked', () => {
    component.selectedStatusFilter.set('FAILED');
    component.searchQuery = 'test';
    component.fromDate = '2026-10-01';
    component.toDate = '2026-10-28';

    component.resetFilters();

    expect(component.selectedStatusFilter()).toBe('ALL');
    expect(component.searchQuery).toBe('');
    expect(component.fromDate).toBe('');
    expect(component.toDate).toBe('');
    expect(component.currentPage()).toBe(0);
  });

  it('should handle API errors with orderError and stop loading', () => {
    merchantService.getOrders.mockReturnValue(throwError(() => new Error('Server error')));

    component.loadOrders(0);

    expect(component.isLoadingOrders()).toBe(false);
    expect(component.orderError()).toContain('Unable to load merchant orders');
  });

  it('should render empty state when no orders returned', () => {
    merchantService.getOrders.mockReturnValue(
      of({
        content: [],
        totalElements: 0,
        totalPages: 0,
        page: 0,
        size: 20,
      })
    );

    component.loadOrders(0);

    expect(component.orders()).toHaveLength(0);
    expect(component.totalElements()).toBe(0);
  });

  it('shows a full loading state only before the first page arrives', async () => {
    const initial = new Subject<MerchantOrderListPage>();
    merchantService.getOrders.mockReturnValue(initial.asObservable());
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [MerchantComponent],
      providers: [{ provide: MerchantService, useValue: merchantService }],
    }).compileComponents();
    const freshFixture = TestBed.createComponent(MerchantComponent);
    freshFixture.detectChanges();

    expect(freshFixture.componentInstance.isLoadingOrders()).toBe(true);
    expect(freshFixture.nativeElement.textContent).toContain('Loading merchant orders');

    initial.next(mockOrderPage);
    freshFixture.detectChanges();
    expect(freshFixture.nativeElement.textContent).not.toContain('Loading merchant orders');
    expect(freshFixture.nativeElement.textContent).toContain('SD-20261028-101');
    freshFixture.destroy();
  });

  it('keeps rows visible with a subtle indicator and uses only the latest tracking response after a filter change', () => {
    const pending = new Subject<MerchantOrderListPage>();
    merchantService.getOrders
      .mockReturnValueOnce(pending.asObservable())
      .mockReturnValueOnce(of({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 }));

    component.loadOrders();
    fixture.detectChanges();
    expect(component.isLoadingOrders()).toBe(true);
    // No full-table loading flash: existing rows stay mounted and a subtle indicator is shown.
    expect(fixture.nativeElement.textContent).not.toContain('Loading merchant orders');
    expect(fixture.nativeElement.querySelector('#orders-updating-indicator')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('SD-20261028-101');

    component.onStatusFilterChange('DELIVERED');
    pending.next(mockOrderPage);
    fixture.detectChanges();

    expect(component.isLoadingOrders()).toBe(false);
    expect(component.orders()).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('No orders found');
  });

  it('shows a counts error and recovers when the merchant retries', () => {
    merchantService.getOrderCounts.mockReturnValueOnce(throwError(() => new Error('Unavailable')));
    component.loadOrderCounts();
    fixture.detectChanges();

    expect(component.countsError()).toContain('Unable to load order counts');
    expect(fixture.nativeElement.textContent).toContain('Unable to load order counts');

    merchantService.getOrderCounts.mockReturnValueOnce(of(mockCounts));
    component.loadOrderCounts();
    fixture.detectChanges();

    expect(component.countsError()).toBeNull();
    expect(component.counts().total).toBe(10);
    expect(fixture.nativeElement.textContent).toContain('Total Orders');
  });

  it('refreshes both merchant status rows and aggregate counts', () => {
    const ordersCalls = merchantService.getOrders.mock.calls.length;
    const countsCalls = merchantService.getOrderCounts.mock.calls.length;

    component.refreshOrders();

    expect(merchantService.getOrders).toHaveBeenCalledTimes(ordersCalls + 1);
    expect(merchantService.getOrderCounts).toHaveBeenCalledTimes(countsCalls + 1);
  });

  it('should save webhook settings and update notification', () => {
    component.settingsForm.url = 'https://api.testmerchant.com/webhook';
    component.settingsForm.active = true;

    component.saveSettings();

    expect(merchantService.updateWebhookSettings).toHaveBeenCalled();
    expect(component.notification()).toContain('saved successfully');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#merchant-notification-dropdown')).toBeNull();
    (fixture.nativeElement.querySelector('#merchant-notification-bell-btn') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#merchant-notification-dropdown')?.textContent).toContain('Webhook settings saved');
  });

  it('should run test webhook and display result', () => {
    component.testUrlOverride = 'https://webhook.site/test-spec';
    component.runTestWebhook();

    expect(component.isTestingWebhook()).toBe(false);
    expect(component.testResult()).toBeTruthy();
    expect(component.testResult()?.success).toBe(true);
  });

  it('blocks duplicate saves until the API responds', () => {
    const pending = new Subject<WebhookSettings>();
    merchantService.updateWebhookSettings.mockReturnValue(pending);
    component.saveSettings();
    component.saveSettings();
    expect(merchantService.updateWebhookSettings).toHaveBeenCalledTimes(1);
    expect(component.isSavingSettings()).toBe(true);
    pending.next({ ...component.settings()!, updatedAt: '2026-11-11T10:00:00Z' });
    pending.complete();
    expect(component.isSavingSettings()).toBe(false);
  });

  it('shows validation errors without submitting an invalid URL', () => {
    component.settingsForm.url = 'http://localhost/private';
    component.saveSettings();
    expect(merchantService.updateWebhookSettings).not.toHaveBeenCalled();
    expect(component.settingsError()).toContain('HTTPS');
  });

  it('shows a failed test delivery returned in the 502 response body', () => {
    merchantService.triggerTestWebhook.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 502,
      error: { success: false, statusCode: 500, latencyMs: 50,
        attemptedAt: '2026-11-11T10:00:00Z', targetUrl: 'https://merchant.example/webhook',
        signatureSent: 't=1,v1=abc', timestampSent: '1', errorMessage: 'Target returned HTTP 500' },
    })));
    component.runTestWebhook();
    expect(component.testResult()?.success).toBe(false);
    expect(component.testResult()?.statusCode).toBe(500);
    expect(component.isTestingWebhook()).toBe(false);
  });

  it('clears the one-time secret on leaving settings', () => {
    component.settings.set({ ...component.settings()!, rawSecret: 'one-time-secret' });
    component.selectTab('orders');
    expect(component.settings()?.rawSecret).toBeNull();
  });

  it('uses server pagination and only allows retry for failed deliveries', () => {
    const failed = {
      deliveryId: 'failed-1', eventId: 'event-1', eventType: 'PARCEL_STATUS_CHANGED',
      trackingNumber: 'SD-1', targetUrl: 'https://merchant.example/webhook',
      status: 'FAILED' as const, attempts: 5, createdAt: '2026-11-11T10:00:00Z',
      errorSummary: 'Target returned HTTP 503',
    };
    merchantService.getDeliveryLogs.mockReturnValue(of({
      content: [failed, { ...failed, deliveryId: 'pending-1', status: 'PENDING_RETRY' }],
      totalElements: 41, totalPages: 3, page: 1, size: 20,
    }));

    component.loadDeliveries(1);
    component.selectTab('deliveries');
    fixture.detectChanges();

    expect(merchantService.getDeliveryLogs).toHaveBeenLastCalledWith('ALL', 1, 20, 'ALL', undefined, undefined);
    expect(component.deliveryTotalElements()).toBe(41);
    expect(component.deliveryPage()).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Showing 2 of 41 deliveries');
    expect(fixture.nativeElement.querySelectorAll('button').length).toBeGreaterThan(0);
    component.retryDelivery('pending-1');
    expect(merchantService.retryDelivery).not.toHaveBeenCalled();
  });

  it('blocks duplicate retry requests while the first retry is pending', () => {
    const failed = {
      deliveryId: 'failed-1', eventId: 'event-1', eventType: 'PARCEL_STATUS_CHANGED',
      trackingNumber: 'SD-1', targetUrl: 'https://merchant.example/webhook',
      status: 'FAILED' as const, attempts: 5, createdAt: '2026-11-11T10:00:00Z',
    };
    component.deliveries.set([failed]);
    const pending = new Subject<any>();
    merchantService.retryDelivery.mockReturnValue(pending);

    component.retryDelivery('failed-1');
    component.retryDelivery('failed-1');

    expect(merchantService.retryDelivery).toHaveBeenCalledTimes(1);
    expect(component.retryingDeliveryId()).toBe('failed-1');
    pending.complete();
    expect(component.retryingDeliveryId()).toBeNull();
  });

  describe('Merchant Identity and Fallback Email Removal (Task 16)', () => {
    let authComponent: MerchantComponent;
    let authFixture: ComponentFixture<MerchantComponent>;
    let currentUserSig: WritableSignal<User | null>;
    let isInitializedSig: WritableSignal<boolean>;
    let authMock: {
      currentUser: WritableSignal<User | null>;
      isInitialized: WritableSignal<boolean>;
      isAuthenticated: jest.Mock;
      getProfile: jest.Mock;
      updateProfile: jest.Mock;
      logout: jest.Mock;
    };
    let routerMock: { navigate: jest.Mock };

    beforeEach(async () => {
      currentUserSig = signal<User | null>({
        id: 'user-merchant-1',
        email: 'alice@acme-store.lk',
        fullName: 'Acme Merchant Store',
        role: 'MERCHANT',
        phoneNumber: '+94770001122',
        merchantId: 'merchant-test-id',
      });
      isInitializedSig = signal<boolean>(true);

      authMock = {
        currentUser: currentUserSig,
        isInitialized: isInitializedSig,
        isAuthenticated: jest.fn().mockReturnValue(true),
        getProfile: jest.fn().mockReturnValue(
          of({
            id: 'user-merchant-1',
            email: 'fetched.merchant@acme-store.lk',
            fullName: 'Fetched Store',
            role: 'MERCHANT',
            phoneNumber: '+94770001122',
            merchantId: 'merchant-test-id',
          })
        ),
        updateProfile: jest.fn().mockReturnValue(
          of({
            id: 'user-merchant-1',
            email: 'updated.merchant@acme-store.lk',
            fullName: 'Updated Store',
            role: 'MERCHANT',
            phoneNumber: '+94770001122',
            merchantId: 'merchant-test-id',
          })
        ),
        logout: jest.fn().mockReturnValue(of(undefined)),
      };

      routerMock = {
        navigate: jest.fn(),
      };

      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [MerchantComponent],
        providers: [
          { provide: MerchantService, useValue: merchantService },
          { provide: AuthService, useValue: authMock },
          { provide: Router, useValue: routerMock },
        ],
      }).compileComponents();

      authFixture = TestBed.createComponent(MerchantComponent);
      authComponent = authFixture.componentInstance;
      authFixture.detectChanges();
    });

    it('shows the merchant business name in the header chip and the person in the welcome heading', () => {
      expect(merchantService.getMerchantProfile).toHaveBeenCalledTimes(1);
      const chip = authFixture.nativeElement.querySelector('#merchant-profile-chip') as HTMLElement;
      expect(chip.textContent).toContain('Acme Stores (Pvt) Ltd');
      expect(chip.textContent).toContain('AS');
      expect(chip.textContent).not.toContain('Sample Merchant');
      expect(authFixture.nativeElement.querySelector('h1')?.textContent).toContain('Acme Merchant Store');

      authComponent.selectTab('settings');
      authFixture.detectChanges();
      expect(authFixture.nativeElement.querySelector('#merchant-profile-business-name')?.textContent).toContain('Acme Stores (Pvt) Ltd');
    });

    it('falls back to the account display name when the business profile is unavailable', async () => {
      merchantService.getMerchantProfile.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 503 })));
      currentUserSig.set({ id: 'user-merchant-9', email: 'z@z.lk', fullName: 'Zed Contact', role: 'MERCHANT', merchantId: 'merchant-z' });
      authFixture.detectChanges();
      expect(authComponent.merchantProfile()).toBeNull();
      expect(authFixture.nativeElement.querySelector('#merchant-profile-chip')?.textContent).toContain('Zed Contact');
    });

    it('never shows a business profile that belongs to a different merchant', () => {
      merchantService.getMerchantProfile.mockReturnValueOnce(of({
        merchantId: 'someone-else', businessName: 'Other Tenant Ltd', status: 'APPROVED',
      }));
      currentUserSig.set({ id: 'user-merchant-2', email: 'b@b.lk', fullName: 'Bravo Contact', role: 'MERCHANT', merchantId: 'merchant-b' });
      authFixture.detectChanges();
      const chip = authFixture.nativeElement.querySelector('#merchant-profile-chip')?.textContent;
      expect(chip).not.toContain('Other Tenant Ltd');
      expect(chip).toContain('Bravo Contact');
    });

    it('reloads the business name on account switch and clears it on sign-out', () => {
      merchantService.getMerchantProfile.mockReturnValueOnce(of({
        merchantId: 'merchant-b', businessName: 'Bravo Goods (Pvt) Ltd', status: 'APPROVED',
      }));
      currentUserSig.set({ id: 'merchant-b-user', email: 'bravo@merchant.lk', fullName: 'Bob', role: 'MERCHANT', merchantId: 'merchant-b' });
      authFixture.detectChanges();
      let chip = authFixture.nativeElement.querySelector('#merchant-profile-chip')?.textContent;
      expect(chip).toContain('Bravo Goods (Pvt) Ltd');
      expect(chip).not.toContain('Acme');

      // Same account, renamed contact: no extra profile request.
      const calls = merchantService.getMerchantProfile.mock.calls.length;
      currentUserSig.set({ id: 'merchant-b-user', email: 'bravo@merchant.lk', fullName: 'Bobby', role: 'MERCHANT', merchantId: 'merchant-b' });
      authFixture.detectChanges();
      expect(merchantService.getMerchantProfile.mock.calls.length).toBe(calls);

      currentUserSig.set(null);
      authFixture.detectChanges();
      expect(authComponent.merchantProfile()).toBeNull();
      chip = authFixture.nativeElement.querySelector('#merchant-profile-chip')?.textContent;
      expect(chip).not.toContain('Bravo Goods');
    });

    it('displays authenticated merchant actual email in settings card', () => {
      expect(authComponent.merchantEmail()).toBe('alice@acme-store.lk');

      // Check settings tab profile card email
      authComponent.selectTab('settings');
      authFixture.detectChanges();
      const profileEmailEl = authFixture.nativeElement.querySelector('#merchant-profile-email');
      expect(profileEmailEl?.textContent?.trim()).toBe('alice@acme-store.lk');

      // Ensure hardcoded fallback is NEVER displayed
      expect(authFixture.nativeElement.textContent).not.toContain('merchant@swiftdrop.lk');
    });

    it('displays neutral "Email unavailable" when email is missing or empty', () => {
      currentUserSig.set({
        id: 'user-merchant-2',
        email: '',
        fullName: 'Empty Email Merchant',
        role: 'MERCHANT',
      });
      authFixture.detectChanges();

      expect(authComponent.merchantEmail()).toBe('Email unavailable');

      authComponent.selectTab('settings');
      authFixture.detectChanges();
      const profileEmailEl = authFixture.nativeElement.querySelector('#merchant-profile-email');
      expect(profileEmailEl?.textContent?.trim()).toBe('Email unavailable');

      expect(authFixture.nativeElement.textContent).not.toContain('merchant@swiftdrop.lk');
    });

    it('handles null currentUser safely by displaying "Email unavailable" without crashing', () => {
      currentUserSig.set(null);
      authFixture.detectChanges();

      expect(authComponent.merchantEmail()).toBe('Email unavailable');
      expect(authComponent.merchantName()).toBe('Merchant Partner');
      expect(authFixture.nativeElement.textContent).not.toContain('merchant@swiftdrop.lk');
    });

    it('displays loading state "Loading email..." when profile is actively fetching', () => {
      currentUserSig.set(null);
      authComponent.isLoadingProfile.set(true);
      authFixture.detectChanges();

      expect(authComponent.isEmailLoading()).toBe(true);
      expect(authComponent.merchantEmail()).toBe('Loading email...');
      expect(authFixture.nativeElement.textContent).not.toContain('merchant@swiftdrop.lk');
    });

    it('displays loading state "Loading email..." when auth session is still initializing', () => {
      currentUserSig.set(null);
      isInitializedSig.set(false);
      authFixture.detectChanges();

      expect(authComponent.isEmailLoading()).toBe(true);
      expect(authComponent.merchantEmail()).toBe('Loading email...');
      expect(authFixture.nativeElement.textContent).not.toContain('merchant@swiftdrop.lk');
    });

    it('fetches profile on init only if authenticated and email is not yet present', () => {
      authMock.getProfile.mockClear();

      // Email is present: loadProfile() does not duplicate the fetch
      authComponent.loadProfile();
      expect(authMock.getProfile).not.toHaveBeenCalled();

      // Email is absent: loadProfile() fetches from trusted auth profile endpoint
      currentUserSig.set({ id: 'usr-3', email: '', fullName: 'Needs Fetch', role: 'MERCHANT' });
      authComponent.loadProfile();
      expect(authMock.getProfile).toHaveBeenCalled();
    });

    it('handles profile API errors gracefully without crashing or showing fake identity data', () => {
      currentUserSig.set(null);
      authMock.getProfile.mockReturnValue(throwError(() => new Error('Network error')));
      authComponent.loadProfile();
      authFixture.detectChanges();

      expect(authComponent.isLoadingProfile()).toBe(false);
      expect(authComponent.profileError()).toBe('Unable to load profile');
      expect(authComponent.merchantEmail()).toBe('Email unavailable');
      expect(authFixture.nativeElement.textContent).not.toContain('merchant@swiftdrop.lk');
    });

    it('account switching immediately changes displayed email and never displays cached identity', () => {
      // Merchant A is active
      currentUserSig.set({
        id: 'merchant-a-id',
        email: 'alpha@merchant.lk',
        fullName: 'Alpha Traders',
        role: 'MERCHANT',
      });
      authFixture.detectChanges();
      expect(authComponent.merchantEmail()).toBe('alpha@merchant.lk');

      // Merchant A logs out
      authComponent.logOut();
      expect(authMock.logout).toHaveBeenCalled();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);

      // Session cleared
      currentUserSig.set(null);
      authFixture.detectChanges();
      expect(authComponent.merchantEmail()).toBe('Email unavailable');

      // Merchant B logs in
      currentUserSig.set({
        id: 'merchant-b-id',
        email: 'bravo@merchant.lk',
        fullName: 'Bravo Goods',
        role: 'MERCHANT',
      });
      authFixture.detectChanges();
      expect(authComponent.merchantEmail()).toBe('bravo@merchant.lk');
      expect(authComponent.merchantEmail()).not.toBe('alpha@merchant.lk');
      expect(authFixture.nativeElement.textContent).not.toContain('merchant@swiftdrop.lk');
    });

    it('openEditProfileModal pre-populates actual user email and never placeholder or fallback text', () => {
      currentUserSig.set({
        id: 'user-merchant-1',
        email: 'store@swiftdrop.lk',
        fullName: 'Store One',
        phoneNumber: '+94771234567',
        role: 'MERCHANT',
      });
      authComponent.openEditProfileModal();

      expect(authComponent.editProfileEmail).toBe('store@swiftdrop.lk');
      expect(authComponent.editProfileFullName).toBe('Store One');
      expect(authComponent.editProfilePhone).toBe('+94771234567');

      // When user has no email, modal opens with empty string, not a fallback or display message
      currentUserSig.set({ id: 'user-merchant-2', email: '', fullName: '', role: 'MERCHANT' });
      authComponent.openEditProfileModal();

      expect(authComponent.editProfileEmail).toBe('');
      expect(authComponent.editProfileEmail).not.toContain('merchant@swiftdrop.lk');
      expect(authComponent.editProfileEmail).not.toContain('Email unavailable');
      expect(authComponent.editProfileEmail).not.toContain('Loading');
    });

    it('saveProfile updates profile and refreshes merchant notification', () => {
      authComponent.openEditProfileModal();
      authComponent.editProfileFullName = 'Updated Merchant Name';
      authComponent.editProfileEmail = 'updated@merchant.lk';
      authComponent.editProfilePhone = '+94779998877';

      authComponent.saveProfile();

      expect(authMock.updateProfile).toHaveBeenCalledWith({
        fullName: 'Updated Merchant Name',
        phoneNumber: '+94779998877',
        email: 'updated@merchant.lk',
      });
      expect(authComponent.isSavingProfile()).toBe(false);
      expect(authComponent.isEditProfileModalOpen()).toBe(false);
      expect(authComponent.notification()).toBe('Your profile was updated successfully.');
    });

    it('unsubscribes profile request on component destroy preventing memory leaks or stale updates', () => {
      const profileSubject = new Subject<any>();
      authMock.getProfile.mockReturnValue(profileSubject.asObservable());
      currentUserSig.set(null);

      authComponent.loadProfile();
      expect(authComponent.isLoadingProfile()).toBe(true);

      authComponent.ngOnDestroy();
      expect(profileSubject.observed).toBe(false);
    });
  });

  describe('Delivery Notifications (Webhook Settings) UI Task 2', () => {
    beforeEach(() => {
      component.selectTab('settings');
      fixture.detectChanges();
    });

    it('renders the page header with Delivery Notifications heading, subtitle, and Webhook Settings pill', () => {
      const heading = fixture.nativeElement.querySelector('h1');
      expect(heading?.textContent).toContain('Delivery Notifications');

      const subtitle = fixture.nativeElement.querySelector('p');
      expect(fixture.nativeElement.textContent).toContain('Automatically send parcel delivery updates to your online store.');
      expect(fixture.nativeElement.textContent).toContain('Webhook Settings');
    });

    it('displays configuration summary with Enabled status, destination URL, and subscribed events', () => {
      expect(component.webhookStatusLabel()).toBe('Enabled');
      expect(component.webhookStatusTone()).toBe('success');
      expect(fixture.nativeElement.textContent).toContain('https://api.testmerchant.com/webhook');
      expect(fixture.nativeElement.textContent).toContain('Parcel Status Changes');

      const editBtn = fixture.nativeElement.querySelector('#toggle-webhook-edit-btn');
      expect(editBtn).toBeTruthy();
      expect(editBtn.textContent).toContain('Edit Configuration');
    });

    it('displays Disabled status when active is false, and Not Configured when URL is missing', () => {
      // Inactive webhook
      component.settings.set({
        ...component.settings()!,
        active: false,
      });
      expect(component.webhookStatusLabel()).toBe('Disabled');
      expect(component.webhookStatusTone()).toBe('warning');

      // Unconfigured webhook
      component.settings.set({
        ...component.settings()!,
        url: '',
        active: false,
      });
      fixture.detectChanges();
      expect(component.webhookStatusLabel()).toBe('Not Configured');
      expect(component.webhookStatusTone()).toBe('neutral');
      expect(fixture.nativeElement.textContent).toContain('No destination URL configured');

      const editBtn = fixture.nativeElement.querySelector('#toggle-webhook-edit-btn');
      expect(editBtn?.textContent).toContain('Configure Webhook');
    });

    it('toggles the configuration form on Edit Configuration / Configure Webhook and cancels', () => {
      expect(component.isEditingWebhook()).toBe(false);
      expect(fixture.nativeElement.querySelector('#webhookUrlInput')).toBeNull();

      const editBtn = fixture.nativeElement.querySelector('#toggle-webhook-edit-btn') as HTMLButtonElement;
      editBtn.click();
      fixture.detectChanges();

      expect(component.isEditingWebhook()).toBe(true);
      const urlInput = fixture.nativeElement.querySelector('#webhookUrlInput') as HTMLInputElement;
      expect(urlInput).toBeTruthy();
      expect(fixture.nativeElement.textContent).toContain('Enter the HTTPS endpoint from your online store\'s backend');

      const cancelBtn = fixture.nativeElement.querySelector('#cancel-webhook-edit-btn') as HTMLButtonElement;
      cancelBtn.click();
      fixture.detectChanges();

      expect(component.isEditingWebhook()).toBe(false);
      expect(fixture.nativeElement.querySelector('#webhookUrlInput')).toBeNull();
    });

    it('closes the configuration form automatically when saveSettings succeeds', () => {
      component.startEditingWebhook();
      fixture.detectChanges();
      expect(component.isEditingWebhook()).toBe(true);

      component.settingsForm.url = 'https://api.testmerchant.com/webhook-updated';
      component.saveSettings();
      fixture.detectChanges();

      expect(merchantService.updateWebhookSettings).toHaveBeenCalled();
      expect(component.isEditingWebhook()).toBe(false);
    });

    it('renders the Webhook Signing Secret card with non-technical explanation and preview', () => {
      expect(fixture.nativeElement.textContent).toContain('Your store uses this secret to verify that delivery updates really came from SwiftDrop.');
      expect(fixture.nativeElement.textContent).toContain('whsec_••••••••••••••••3f8a');
      expect(fixture.nativeElement.textContent).toContain('Regenerate Secret');
    });

    it('displays one-time raw secret alert when rawSecret is available and allows dismissing', () => {
      component.settings.set({
        ...component.settings()!,
        rawSecret: 'whsec_raw_secret_xyz123',
      });
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Copy your new signing secret now!');
      expect(fixture.nativeElement.textContent).toContain('whsec_raw_secret_xyz123');

      component.dismissSecret();
      fixture.detectChanges();

      expect(component.settings()?.rawSecret).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('whsec_raw_secret_xyz123');
    });

    it('runs test webhook on Send Test Event and displays real latency and status code', () => {
      const testBtn = fixture.nativeElement.querySelector('#send-test-event-btn') as HTMLButtonElement;
      expect(testBtn).toBeTruthy();
      testBtn.click();
      fixture.detectChanges();

      expect(merchantService.triggerTestWebhook).toHaveBeenCalledWith('');
      expect(fixture.nativeElement.textContent).toContain('HTTP 200 — Delivered');
      expect(fixture.nativeElement.textContent).toContain('85 ms');
    });

    it('provides expandable Advanced Testing section for URL override and expandable Developer Details', () => {
      expect(fixture.nativeElement.textContent).toContain('Advanced Testing (URL Override)');
      expect(fixture.nativeElement.textContent).toContain('Developer Details');
      expect(fixture.nativeElement.textContent).toContain('HMAC Signature Verification');
      expect(fixture.nativeElement.textContent).toContain('X-SwiftDrop-Signature');
      expect(fixture.nativeElement.textContent).toContain('Sample Event Payload (PARCEL_STATUS_CHANGED)');
      expect(fixture.nativeElement.textContent).toContain('Delivery Behavior & Retry Schedule');
    });
  });

  describe('Webhook Delivery Logs UI Task 3', () => {
    const mockDeliveries = [
      {
        deliveryId: 'del-success-01',
        eventId: 'evt-01',
        eventType: 'PARCEL_STATUS_CHANGED',
        trackingNumber: 'SD-20261028-101',
        targetUrl: 'https://api.testmerchant.com/webhook',
        status: 'SUCCESS' as const,
        httpStatusCode: 200,
        attempts: 1,
        createdAt: '2026-10-28T12:05:00Z',
      },
      {
        deliveryId: 'del-failed-02',
        eventId: 'evt-02',
        eventType: 'PARCEL_CREATED',
        trackingNumber: 'SD-20261028-102',
        targetUrl: 'https://api.testmerchant.com/webhook',
        status: 'FAILED' as const,
        httpStatusCode: 503,
        attempts: 5,
        errorSummary: 'Connection refused by peer',
        createdAt: '2026-10-28T14:10:00Z',
      },
      {
        deliveryId: 'del-retry-03',
        eventId: 'evt-03',
        eventType: 'TEST_EVENT',
        trackingNumber: 'SD-TEST-001',
        targetUrl: 'https://api.testmerchant.com/webhook',
        status: 'PENDING_RETRY' as const,
        httpStatusCode: 504,
        attempts: 2,
        createdAt: '2026-10-28T15:00:00Z',
      },
    ];

    beforeEach(() => {
      component.selectTab('deliveries');
      fixture.detectChanges();
    });

    it('renders the page header with Webhook Delivery Logs and non-technical description', () => {
      const heading = fixture.nativeElement.querySelector('h1');
      expect(heading?.textContent).toContain('Webhook Delivery Logs');
      expect(fixture.nativeElement.textContent).toContain('View the delivery updates SwiftDrop has sent to your online store.');
    });

    it('displays Empty State A when webhook is not configured yet', () => {
      component.settings.set({
        ...component.settings()!,
        url: '',
      });
      component.deliveries.set([]);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('#empty-state-unconfigured')).toBeTruthy();
      expect(fixture.nativeElement.textContent).toContain('No webhook configured yet.');
      expect(fixture.nativeElement.textContent).toContain('Add a webhook destination to start receiving automatic delivery updates.');

      const configBtn = fixture.nativeElement.querySelector('#goto-webhook-config-btn') as HTMLButtonElement;
      expect(configBtn).toBeTruthy();
      configBtn.click();
      fixture.detectChanges();

      expect(component.activeTab()).toBe('settings');
    });

    it('displays Empty State B when webhook is configured but no deliveries exist yet', () => {
      component.settings.set({
        ...component.settings()!,
        url: 'https://api.testmerchant.com/webhook',
      });
      component.deliveries.set([]);
      component.resetDeliveryFilters();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('#empty-state-no-deliveries')).toBeTruthy();
      expect(fixture.nativeElement.textContent).toContain('No delivery notifications yet.');
      expect(fixture.nativeElement.textContent).toContain('When SwiftDrop sends updates to your connected store, they will appear here.');
    });

    it('displays Empty State C when filters yield no matching deliveries and allows Clear Filters', () => {
      component.deliveries.set([]);
      component.selectedDeliveryFilter.set('FAILED');
      fixture.detectChanges();

      expect(component.hasActiveDeliveryFilters()).toBe(true);
      expect(fixture.nativeElement.querySelector('#empty-state-filters')).toBeTruthy();
      expect(fixture.nativeElement.textContent).toContain('No matching deliveries.');

      const clearBtn = fixture.nativeElement.querySelector('#clear-delivery-filters-btn') as HTMLButtonElement;
      expect(clearBtn).toBeTruthy();
      clearBtn.click();
      fixture.detectChanges();

      expect(component.selectedDeliveryFilter()).toBe('ALL');
      expect(merchantService.getDeliveryLogs).toHaveBeenCalled();
    });

    it('displays error state and does not show empty state when API fails', () => {
      component.deliveryError.set('Network connection failed');
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Network connection failed');
      expect(fixture.nativeElement.textContent).toContain('Retry Loading');
      expect(fixture.nativeElement.querySelector('#empty-state-unconfigured')).toBeNull();
      expect(fixture.nativeElement.querySelector('#empty-state-no-deliveries')).toBeNull();
      expect(fixture.nativeElement.querySelector('#empty-state-filters')).toBeNull();
    });

    it('renders the deliveries table with readable event names, HTTP explanations, and status labels', () => {
      component.deliveries.set(mockDeliveries);
      component.deliveryTotalElements.set(3);
      fixture.detectChanges();

      // Check event names
      expect(fixture.nativeElement.textContent).toContain('Parcel Status Changed');
      expect(fixture.nativeElement.textContent).toContain('Order Created');
      expect(fixture.nativeElement.textContent).toContain('Test Notification');

      // Check HTTP codes and explanations
      expect(fixture.nativeElement.textContent).toContain('200 OK');
      expect(fixture.nativeElement.textContent).toContain('503 Unavailable');
      expect(fixture.nativeElement.textContent).toContain('504 Gateway Timeout');

      // Check status labels
      expect(fixture.nativeElement.textContent).toContain('Delivered');
      expect(fixture.nativeElement.textContent).toContain('Failed');
      expect(fixture.nativeElement.textContent).toContain('Retrying');

      // Check attempt count
      expect(fixture.nativeElement.textContent).toContain('1 of 5');
      expect(fixture.nativeElement.textContent).toContain('5 of 5');
      expect(fixture.nativeElement.textContent).toContain('2 of 5');
    });

    it('only displays Retry button for FAILED status and triggers manual retry correctly', () => {
      component.deliveries.set(mockDeliveries);
      fixture.detectChanges();

      const retryBtn = fixture.nativeElement.querySelector('#retry-delivery-btn-del-failed-02') as HTMLButtonElement;
      expect(retryBtn).toBeTruthy();

      merchantService.retryDelivery.mockReturnValue(of({
        deliveryId: 'del-failed-02',
        eventId: 'evt-02',
        eventType: 'PARCEL_CREATED',
        trackingNumber: 'SD-20261028-102',
        targetUrl: 'https://api.testmerchant.com/webhook',
        status: 'PENDING_RETRY',
        httpStatusCode: 200,
        attempts: 5,
        createdAt: '2026-10-28T14:10:00Z',
      }));

      retryBtn.click();
      expect(merchantService.retryDelivery).toHaveBeenCalledWith('del-failed-02');
      expect(component.notification()).toContain('Retry status: Retrying');
    });

    it('supports Last 7 Days quick date filter and resets filters via Clear Filters button in filter bar', () => {
      const last7Btn = fixture.nativeElement.querySelector('#last-7-days-filter-btn') as HTMLButtonElement;
      expect(last7Btn).toBeTruthy();
      last7Btn.click();
      fixture.detectChanges();

      expect(component.deliveryFromDate).toBeTruthy();
      expect(component.deliveryToDate).toBeTruthy();
      expect(component.hasActiveDeliveryFilters()).toBe(true);

      const resetFilterBtn = fixture.nativeElement.querySelector('#reset-delivery-filters-btn') as HTMLButtonElement;
      expect(resetFilterBtn).toBeTruthy();
      resetFilterBtn.click();
      fixture.detectChanges();

      expect(component.deliveryFromDate).toBe('');
      expect(component.deliveryToDate).toBe('');
      expect(component.selectedDeliveryFilter()).toBe('ALL');
      expect(component.hasActiveDeliveryFilters()).toBe(false);
    });

    // Runs in the runner's timezone; verified under TZ=Asia/Colombo, America/New_York and UTC.
    describe('date filters use the merchant local timezone', () => {
      afterEach(() => jest.useRealTimers());

      it('includes deliveries just after local midnight and just before local midnight of the selected day', () => {
        component.deliveryFromDate = '2026-11-23';
        component.deliveryToDate = '2026-11-23';
        component.onDeliveryFilterChange();

        const [, , , , from, to] = merchantService.getDeliveryLogs.mock.lastCall;
        expect(from).toBe(new Date(2026, 10, 23, 0, 0, 0, 0).toISOString());
        expect(to).toBe(new Date(2026, 10, 23, 23, 59, 59, 999).toISOString());

        const justAfterMidnight = new Date(2026, 10, 23, 0, 30).getTime();
        const justBeforeMidnight = new Date(2026, 10, 23, 23, 30).getTime();
        for (const createdAt of [justAfterMidnight, justBeforeMidnight]) {
          expect(createdAt).toBeGreaterThanOrEqual(Date.parse(from));
          expect(createdAt).toBeLessThanOrEqual(Date.parse(to));
        }
      });

      it('Last 7 Days uses local calendar dates and never excludes the current moment', () => {
        jest.useFakeTimers({ now: new Date(2026, 10, 23, 0, 30), doNotFake: ['queueMicrotask'] });

        component.applyLast7DaysFilter();

        expect(component.deliveryToDate).toBe('2026-11-23');
        expect(component.deliveryFromDate).toBe('2026-11-16');
        const [, , , , from, to] = merchantService.getDeliveryLogs.mock.lastCall;
        expect(from).toBe(new Date(2026, 10, 16, 0, 0, 0, 0).toISOString());
        expect(Date.parse(to)).toBeGreaterThanOrEqual(Date.now());
      });
    });

    it('opens diagnostic modal with Overview, Headers, Payload, and Response tabs', () => {
      component.inspectDelivery(mockDeliveries[0]);
      fixture.detectChanges();

      expect(component.selectedDelivery()?.deliveryId).toBe('del-success-01');
      expect(fixture.nativeElement.textContent).toContain('Webhook Diagnostics');
      expect(fixture.nativeElement.textContent).toContain('Overview');
      expect(fixture.nativeElement.textContent).toContain('Request Headers');
      expect(fixture.nativeElement.textContent).toContain('Signed Payload');
      expect(fixture.nativeElement.textContent).toContain('Response Body');

      component.selectedDelivery.set(null);
      fixture.detectChanges();
      expect(component.selectedDelivery()).toBeNull();
    });
  });
  describe('Merchant Portal final UI/UX fixes', () => {
    const statusChange = (deliveryId: string, extra: Partial<WebhookDeliveryItem> = {}): WebhookDeliveryItem => ({
      deliveryId,
      eventId: `evt-${deliveryId}`,
      eventType: 'PARCEL_STATUS_CHANGED',
      trackingNumber: 'SD-20261028-101',
      targetUrl: 'https://api.testmerchant.com/webhook',
      status: 'SUCCESS',
      httpStatusCode: 200,
      attempts: 1,
      createdAt: '2026-10-28T12:05:00Z',
      ...extra,
    });

    const detailFor = (deliveryId: string, payload: unknown, extra: Partial<WebhookDeliveryDetail> = {}): WebhookDeliveryDetail => ({
      deliveryId,
      eventId: `evt-${deliveryId}`,
      eventType: 'PARCEL_STATUS_CHANGED',
      status: 'SUCCESS',
      targetUrl: 'https://api.testmerchant.com/webhook',
      attempts: 1,
      httpStatusCode: 200,
      requestHeaders: { 'Content-Type': 'application/json', 'X-SwiftDrop-Signature': 't=1729857600,v1=abc123' },
      payload,
      responseHeaders: null,
      responseBody: null,
      lastAttemptAt: '2026-10-28T12:05:00Z',
      nextRetryAt: null,
      retryHistory: [],
      createdAt: '2026-10-28T12:05:00Z',
      ...extra,
    });

    const parcelPayload = (toStatus: string) => ({ eventType: 'PARCEL_STATUS_CHANGED', parcel: { status: toStatus, fromStatus: 'X', toStatus } });

    const type = (input: HTMLInputElement, value: string) => {
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };

    describe('FIX 1 — action controls are not underlined', () => {
      it('renders no underlined actions on the dashboard, settings (with one-time secret) and delivery logs', () => {
        component.selectedStatusFilter.set('FAILED');
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('#reset-order-filters-btn')).toBeTruthy();
        expect(fixture.nativeElement.querySelectorAll('.underline').length).toBe(0);

        component.selectTab('settings');
        component.settings.set({ ...component.settings()!, rawSecret: 'whsec_once' });
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('#dismiss-signing-secret-btn')).toBeTruthy();
        expect(fixture.nativeElement.querySelectorAll('.underline').length).toBe(0);

        component.selectTab('deliveries');
        component.selectedDeliveryFilter.set('FAILED');
        component.deliveryError.set('Network down');
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelectorAll('.underline').length).toBe(0);
      });
    });

    describe('FIX 3 — top search and Direct Search are independent', () => {
      afterEach(() => jest.useRealTimers());

      it('typing or clearing one input never changes the other', () => {
        const top = fixture.nativeElement.querySelector('#merchant-order-search') as HTMLInputElement;
        const direct = fixture.nativeElement.querySelector('#direct-parcel-search') as HTMLInputElement;

        type(direct, 'SD-20261028-101');
        expect(component.directSearchQuery).toBe('SD-20261028-101');
        expect(component.searchQuery).toBe('');

        type(top, 'SD-2026');
        expect(component.searchQuery).toBe('SD-2026');
        expect(component.directSearchQuery).toBe('SD-20261028-101');

        type(top, '');
        expect(component.searchQuery).toBe('');
        expect(component.directSearchQuery).toBe('SD-20261028-101');

        type(direct, '');
        expect(component.directSearchQuery).toBe('');
        component.resetFilters();
        expect(component.directSearchQuery).toBe('');
      });

      it('debounces the top search and sends one request per settled value', () => {
        jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
        const top = fixture.nativeElement.querySelector('#merchant-order-search') as HTMLInputElement;
        merchantService.getOrders.mockClear();

        type(top, 'S');
        type(top, 'SD');
        type(top, 'SD-1');
        expect(merchantService.getOrders).not.toHaveBeenCalled();
        jest.advanceTimersByTime(400);
        expect(merchantService.getOrders).toHaveBeenCalledTimes(1);
        expect(merchantService.getOrders).toHaveBeenLastCalledWith(expect.objectContaining({ trackingNumber: 'SD-1', page: 0 }));

        // Typing and returning to the applied value does not trigger a duplicate request.
        type(top, 'SD-12');
        type(top, 'SD-1');
        jest.advanceTimersByTime(400);
        expect(merchantService.getOrders).toHaveBeenCalledTimes(1);
      });

      it('Direct Search opens the matching parcel and never filters the table', () => {
        component.directSearchQuery = 'sd-20261028-101';
        merchantService.getOrders.mockClear();

        component.submitDirectSearch();

        expect(merchantService.getOrders).toHaveBeenCalledTimes(1);
        expect(merchantService.getOrders).toHaveBeenCalledWith({ trackingNumber: 'sd-20261028-101', page: 0, size: 10 });
        expect(merchantService.getOrderDetails).toHaveBeenCalledWith('ord-101');
        expect(component.selectedOrder()?.trackingNumber).toBe('SD-20261028-101');
        expect(component.directSearchError()).toBeNull();
        expect(component.searchQuery).toBe('');
        expect(component.orders()).toHaveLength(2);
      });

      it('shows clear feedback for unknown, invalid and empty parcel numbers', () => {
        merchantService.getOrders.mockReturnValueOnce(of({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 10 }));
        component.directSearchQuery = 'SD-UNKNOWN-999';
        component.submitDirectSearch();
        fixture.detectChanges();
        expect(component.directSearchError()).toContain('No parcel found with number SD-UNKNOWN-999');
        expect(fixture.nativeElement.querySelector('#direct-parcel-search-feedback')?.textContent).toContain('No parcel found');
        expect(component.selectedOrder()).toBeNull();

        merchantService.getOrders.mockClear();
        component.directSearchQuery = 'SD 101; DROP';
        component.submitDirectSearch();
        expect(component.directSearchError()).toContain('letters, numbers and hyphens');
        component.directSearchQuery = '   ';
        component.submitDirectSearch();
        expect(component.directSearchError()).toContain('Enter a parcel number');
        expect(merchantService.getOrders).not.toHaveBeenCalled();
      });

      it('does not match a partial tracking number and blocks duplicate submits', () => {
        const pending = new Subject<MerchantOrderListPage>();
        merchantService.getOrders.mockReturnValueOnce(pending.asObservable());
        component.directSearchQuery = 'SD-20261028';
        component.submitDirectSearch();
        component.submitDirectSearch();
        expect(component.isDirectSearching()).toBe(true);
        pending.next(mockOrderPage);
        pending.complete();
        expect(merchantService.getOrders.mock.calls.filter(([p]) => (p as { size?: number })?.size === 10)).toHaveLength(1);
        expect(component.selectedOrder()).toBeNull();
        expect(component.directSearchError()).toContain('No parcel found');
        expect(component.isDirectSearching()).toBe(false);
      });
    });

    describe('FIX 4 — Last 7 Days is a reversible, accessible toggle', () => {
      beforeEach(() => {
        component.selectTab('deliveries');
        fixture.detectChanges();
      });

      const last7 = () => fixture.nativeElement.querySelector('#last-7-days-filter-btn') as HTMLButtonElement;

      it('activates with selected styling and aria-pressed, then toggles off on a second click', () => {
        expect(last7().getAttribute('aria-pressed')).toBe('false');
        last7().click();
        fixture.detectChanges();
        expect(component.isLast7DaysActive()).toBe(true);
        expect(last7().getAttribute('aria-pressed')).toBe('true');
        expect(last7().classList).toContain('filter-active');
        expect(component.deliveryFromDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(component.deliveryToDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

        last7().click();
        fixture.detectChanges();
        expect(component.isLast7DaysActive()).toBe(false);
        expect(last7().getAttribute('aria-pressed')).toBe('false');
        expect(last7().classList).not.toContain('filter-active');
        expect(component.deliveryFromDate).toBe('');
        expect(component.deliveryToDate).toBe('');
        const [, , , , from, to] = merchantService.getDeliveryLogs.mock.lastCall!;
        expect(from).toBeUndefined();
        expect(to).toBeUndefined();
      });

      it('deselects the preset when a date is changed manually and keeps the merchant dates', () => {
        last7().click();
        component.deliveryFromDate = '2026-01-01';
        component.onDeliveryDateChange();
        fixture.detectChanges();
        expect(component.isLast7DaysActive()).toBe(false);
        expect(last7().getAttribute('aria-pressed')).toBe('false');
        expect(component.deliveryFromDate).toBe('2026-01-01');
        expect(component.deliveryToDate).not.toBe('');
      });

      it('keeps the preset selected while the dates still match it', () => {
        last7().click();
        component.onDeliveryDateChange();
        expect(component.isLast7DaysActive()).toBe(true);
      });

      it('Clear Filters resets preset, dates, status and event filters together', () => {
        last7().click();
        component.onDeliveryStatusFilterChange('FAILED');
        component.selectedDeliveryEvent = 'PARCEL_CREATED';
        fixture.detectChanges();
        (fixture.nativeElement.querySelector('#reset-delivery-filters-btn') as HTMLButtonElement).click();
        fixture.detectChanges();
        expect(component.isLast7DaysActive()).toBe(false);
        expect(component.deliveryFromDate).toBe('');
        expect(component.deliveryToDate).toBe('');
        expect(component.selectedDeliveryFilter()).toBe('ALL');
        expect(component.selectedDeliveryEvent).toBe('ALL');
        expect(merchantService.getDeliveryLogs).toHaveBeenLastCalledWith('ALL', 0, 20, 'ALL', undefined, undefined);
      });

      it('rapid filter changes never display a stale (older) response', () => {
        const slow = new Subject<any>();
        merchantService.getDeliveryLogs
          .mockReturnValueOnce(slow.asObservable())
          .mockReturnValueOnce(of({ content: [statusChange('fresh-1', { status: 'FAILED' })], totalElements: 1, totalPages: 1, page: 0, size: 20 }));

        component.onDeliveryStatusFilterChange('SUCCESS');
        component.onDeliveryStatusFilterChange('FAILED');
        slow.next({ content: [statusChange('stale-1')], totalElements: 1, totalPages: 1, page: 0, size: 20 });
        fixture.detectChanges();

        expect(component.deliveries().map((d) => d.deliveryId)).toEqual(['fresh-1']);
        expect(component.isLoadingDeliveries()).toBe(false);
      });
    });

    describe('FIX 4 / orders — local calendar-day boundaries', () => {
      it('sends merchant-local midnight boundaries for the dashboard date filter', () => {
        component.fromDate = '2026-11-23';
        component.toDate = '2026-11-23';
        component.onDateFilterChange();
        expect(merchantService.getOrders).toHaveBeenLastCalledWith(expect.objectContaining({
          from: new Date(2026, 10, 23, 0, 0, 0, 0).toISOString(),
          to: new Date(2026, 10, 23, 23, 59, 59, 999).toISOString(),
        }));
      });
    });

    describe('FIX 5 — no flicker on refresh', () => {
      it('keeps the same order row elements mounted across a refresh with identical rows', () => {
        const before = fixture.nativeElement.querySelector('tbody tr');
        component.refreshOrders();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('tbody tr')).toBe(before);
        expect(fixture.nativeElement.textContent).not.toContain('Loading order counts');
      });

      it('keeps the delivery table visible (dimmed) while a filter change is pending', () => {
        merchantService.getDeliveryLogs.mockReturnValueOnce(of({ content: [statusChange('d-1')], totalElements: 1, totalPages: 1, page: 0, size: 20 }));
        component.selectTab('deliveries');
        component.loadDeliveries(0);
        fixture.detectChanges();
        const pending = new Subject<any>();
        merchantService.getDeliveryLogs.mockReturnValueOnce(pending.asObservable());

        component.onDeliveryStatusFilterChange('FAILED');
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('table')).toBeTruthy();
        expect(fixture.nativeElement.querySelector('#deliveries-updating-indicator')?.textContent).toContain('Updating');
        expect(fixture.nativeElement.querySelector('#empty-state-filters')).toBeNull();
        expect(fixture.nativeElement.querySelector('ui-pagination')).toBeTruthy();
      });

      it('shows inspect failures above the table without hiding the delivery log', () => {
        component.selectTab('deliveries');
        component.deliveries.set([statusChange('d-1')]);
        merchantService.getDeliveryDetail.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));
        component.inspectDelivery(statusChange('d-1'));
        fixture.detectChanges();
        expect(component.deliveryError()).toBeNull();
        expect(fixture.nativeElement.querySelector('#delivery-action-error')?.textContent).toContain('Unable to load delivery details');
        expect(fixture.nativeElement.querySelector('table')).toBeTruthy();
      });
    });

    describe('FIX 6 — background refresh of the dashboard', () => {
      let pollFixture: ComponentFixture<MerchantComponent>;
      let poll: MerchantComponent;
      let visibility: DocumentVisibilityState;

      beforeEach(async () => {
        visibility = 'visible';
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
        jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
        await TestBed.resetTestingModule();
        await TestBed.configureTestingModule({
          imports: [MerchantComponent],
          providers: [
            { provide: MerchantService, useValue: merchantService },
            { provide: AuthService, useValue: {
              currentUser: signal<User | null>({ id: 'u-1', email: 'a@b.lk', fullName: 'Poll Store', role: 'MERCHANT' }),
              isInitialized: signal(true),
              isAuthenticated: jest.fn().mockReturnValue(true),
              logout: jest.fn().mockReturnValue(of(undefined)),
            } },
          ],
        }).compileComponents();
        pollFixture = TestBed.createComponent(MerchantComponent);
        poll = pollFixture.componentInstance;
        pollFixture.detectChanges();
        merchantService.getOrders.mockClear();
        merchantService.getOrderCounts.mockClear();
        merchantService.getOrderDetails.mockClear();
      });

      afterEach(() => {
        pollFixture.destroy();
        jest.useRealTimers();
        delete (document as unknown as Record<string, unknown>)['visibilityState'];
      });

      const flipVisibility = (state: DocumentVisibilityState) => {
        visibility = state;
        document.dispatchEvent(new Event('visibilitychange'));
      };

      it('refreshes orders and counts automatically and shows updated statuses without a reload', () => {
        merchantService.getOrders.mockReturnValue(of({
          ...mockOrderPage,
          content: [{ ...mockOrderPage.content[0], status: 'OUT_FOR_DELIVERY' }, mockOrderPage.content[1]],
        }));
        merchantService.getOrderCounts.mockReturnValue(of({ ...mockCounts, inTransit: 1, outForDelivery: 2 }));

        jest.advanceTimersByTime(MERCHANT_DASHBOARD_REFRESH_MS);
        pollFixture.detectChanges();

        expect(merchantService.getOrders).toHaveBeenCalledTimes(1);
        expect(merchantService.getOrderCounts).toHaveBeenCalledTimes(1);
        expect(poll.orders()[0].status).toBe('OUT_FOR_DELIVERY');
        expect(pollFixture.nativeElement.textContent).toContain('OUT_FOR_DELIVERY');
        expect(pollFixture.nativeElement.querySelector('#merchant-last-updated')?.textContent).toContain('Last updated');
      });

      it('preserves the search text, status, dates and page during background refresh', () => {
        poll.searchQuery = 'SD-2026';
        poll.directSearchQuery = 'SD-DIRECT-1';
        poll.selectedStatusFilter.set('IN_TRANSIT');
        poll.fromDate = '2026-10-01';
        poll.toDate = '2026-10-31';
        poll.loadOrders(2);
        merchantService.getOrders.mockClear();

        jest.advanceTimersByTime(MERCHANT_DASHBOARD_REFRESH_MS);

        expect(merchantService.getOrders).toHaveBeenCalledWith(expect.objectContaining({
          status: 'IN_TRANSIT', trackingNumber: 'SD-2026', page: 2,
          from: new Date(2026, 9, 1).toISOString(),
        }));
        expect(poll.currentPage()).toBe(2);
        expect(poll.searchQuery).toBe('SD-2026');
        expect(poll.directSearchQuery).toBe('SD-DIRECT-1');
      });

      it('does not poll while the tab is hidden and revalidates when it becomes visible', () => {
        flipVisibility('hidden');
        jest.advanceTimersByTime(MERCHANT_DASHBOARD_REFRESH_MS * 5);
        expect(merchantService.getOrders).not.toHaveBeenCalled();

        flipVisibility('visible');
        expect(merchantService.getOrders).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(MERCHANT_DASHBOARD_REFRESH_MS);
        expect(merchantService.getOrders).toHaveBeenCalledTimes(2);
      });

      it('keeps existing data and shows no error when a background request fails', () => {
        merchantService.getOrders.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
        merchantService.getOrderCounts.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));

        jest.advanceTimersByTime(MERCHANT_DASHBOARD_REFRESH_MS);
        pollFixture.detectChanges();

        expect(poll.orders()).toHaveLength(2);
        expect(poll.orderError()).toBeNull();
        expect(poll.countsError()).toBeNull();
        expect(poll.counts().total).toBe(10);
        expect(pollFixture.nativeElement.textContent).not.toContain('Unable to load');
      });

      it('does not interrupt a merchant-initiated request that is still in flight', () => {
        merchantService.getOrders.mockReturnValueOnce(new Subject<MerchantOrderListPage>().asObservable());
        poll.onStatusFilterChange('DELIVERED');
        expect(merchantService.getOrders).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(MERCHANT_DASHBOARD_REFRESH_MS);
        expect(merchantService.getOrders).toHaveBeenCalledTimes(1);
        expect(poll.selectedStatusFilter()).toBe('DELIVERED');
      });

      it('silently refreshes an open parcel timeline without clearing it', () => {
        poll.viewOrderDetails(mockOrderPage.content[0]);
        const updated = { ...mockOrderDetails, status: 'DELIVERED' as const, history: [...mockOrderDetails.history] };
        merchantService.getOrderDetails.mockReturnValue(of(updated));

        jest.advanceTimersByTime(MERCHANT_DASHBOARD_REFRESH_MS);
        pollFixture.detectChanges();

        expect(poll.isLoadingOrderDetails()).toBe(false);
        expect(poll.orderDetails()?.status).toBe('DELIVERED');
        expect(poll.selectedOrder()?.orderId).toBe('ord-101');
      });

      it('only polls on the orders dashboard', () => {
        poll.selectTab('deliveries');
        jest.advanceTimersByTime(MERCHANT_DASHBOARD_REFRESH_MS * 3);
        expect(merchantService.getOrders).not.toHaveBeenCalled();
      });

      it('stops polling when the user is signed out', () => {
        const auth = TestBed.inject(AuthService) as unknown as { isAuthenticated: jest.Mock };
        auth.isAuthenticated.mockReturnValue(false);
        jest.advanceTimersByTime(MERCHANT_DASHBOARD_REFRESH_MS * 3);
        expect(merchantService.getOrders).not.toHaveBeenCalled();
      });

      it('cleans up the timer and visibility listener when leaving the page', () => {
        pollFixture.destroy();
        jest.advanceTimersByTime(MERCHANT_DASHBOARD_REFRESH_MS * 3);
        flipVisibility('visible');
        expect(merchantService.getOrders).not.toHaveBeenCalled();
        expect(jest.getTimerCount()).toBe(0);
      });
    });

    describe('FIX 7 / FIX 9 — readable parcel updates with technical details preserved', () => {
      beforeEach(() => {
        const deliveries = [
          statusChange('d-picked'), statusChange('d-transit'), statusChange('d-ofd'), statusChange('d-delivered'),
          statusChange('d-failed-parcel'), statusChange('d-unknown'),
          { ...statusChange('d-created'), eventType: 'PARCEL_CREATED' },
        ];
        const payloads: Record<string, unknown> = {
          'd-picked': parcelPayload('PICKED_UP'),
          'd-transit': parcelPayload('IN_TRANSIT'),
          'd-ofd': parcelPayload('OUT_FOR_DELIVERY'),
          'd-delivered': parcelPayload('DELIVERED'),
          'd-failed-parcel': parcelPayload('FAILED'),
          'd-unknown': parcelPayload('TELEPORTED'),
        };
        merchantService.getDeliveryDetail.mockImplementation((id: string) => of(detailFor(id, payloads[id] ?? null)));
        merchantService.getDeliveryLogs.mockReturnValue(of({ content: deliveries, totalElements: deliveries.length, totalPages: 1, page: 0, size: 20 }));
        component.selectTab('deliveries');
        component.loadDeliveries(0);
        fixture.detectChanges();
      });

      const labels = () => Array.from(fixture.nativeElement.querySelectorAll('.delivery-event-label') as NodeListOf<HTMLElement>)
        .map((el) => el.textContent!.trim());

      it('describes each status transition and keeps the raw event type visible', () => {
        expect(labels()).toEqual([
          'Parcel Picked Up', 'In Transit', 'Out for Delivery', 'Parcel Delivered', 'Delivery Failed',
          'Parcel Status Changed', 'Order Created',
        ]);
        expect(fixture.nativeElement.textContent).toContain('PARCEL_STATUS_CHANGED');
        expect(fixture.nativeElement.textContent).toContain('PARCEL_CREATED');
      });

      it('never invents a status: unknown payload values fall back to the generic label', () => {
        expect(component.parcelStatusByDelivery().has('d-unknown')).toBe(false);
        expect(labels()).toContain('Parcel Status Changed');
      });

      it('looks each delivery up only once (cached) and only for status-change events', () => {
        const calls = merchantService.getDeliveryDetail.mock.calls.map(([id]) => id);
        expect(calls).not.toContain('d-created');
        merchantService.getDeliveryDetail.mockClear();
        component.loadDeliveries(0);
        expect(merchantService.getDeliveryDetail).not.toHaveBeenCalled();
      });

      it('separates the notification outcome from the parcel outcome', () => {
        const headers = Array.from(fixture.nativeElement.querySelectorAll('thead th') as NodeListOf<HTMLElement>).map((th) => th.textContent!.trim());
        expect(headers).toEqual(expect.arrayContaining(['Parcel Update', 'Notification', 'Store Response']));
        expect(component.notificationStatusSummary('SUCCESS')).toBe('Notification Delivered');
        expect(component.notificationStatusSummary('FAILED')).toBe('Notification Failed');
        expect(fixture.nativeElement.textContent).toContain('Accepted by your store');
        expect(fixture.nativeElement.textContent).toContain('200 OK');
      });

      it('diagnostics show a merchant summary plus HTTP code, raw event, delivery ID and signature', () => {
        component.inspectDelivery(statusChange('d-ofd'));
        fixture.detectChanges();
        const dialog = fixture.nativeElement.querySelector('#webhook-diagnostics-dialog') as HTMLElement;
        expect(dialog.querySelector('#webhook-diagnostics-title')?.textContent).toContain('Out for Delivery');
        expect(dialog.querySelector('#diag-notification-summary')?.textContent).toContain('Notification Delivered');
        expect(dialog.querySelector('#diag-http-status')?.textContent).toContain('200 OK');
        expect(dialog.querySelector('#diag-raw-event-type')?.textContent).toContain('PARCEL_STATUS_CHANGED');
        expect(dialog.textContent).toContain('d-ofd');
        expect(dialog.textContent).toContain('t=1729857600,v1=abc123');
      });
    });

    describe('FIX 8 — accessible diagnostics tabs', () => {
      beforeEach(() => {
        component.selectTab('deliveries');
        component.inspectDelivery(statusChange('d-1'));
        fixture.detectChanges();
      });

      const tabs = () => Array.from(fixture.nativeElement.querySelectorAll('[role="tab"]') as NodeListOf<HTMLButtonElement>);

      it('uses tablist/tab/tabpanel semantics with a distinct active tab', () => {
        expect(fixture.nativeElement.querySelector('[role="tablist"]')).toBeTruthy();
        expect(tabs().map((t) => t.textContent!.trim())).toEqual(['Overview', 'Request Headers', 'Signed Payload', 'Response Body']);
        expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
        expect(tabs()[0].classList).toContain('diag-tab-active');
        expect(tabs()[0].getAttribute('tabindex')).toBe('0');
        expect(tabs()[1].getAttribute('aria-selected')).toBe('false');
        expect(tabs()[1].getAttribute('tabindex')).toBe('-1');
        expect(fixture.nativeElement.querySelector('#diag-panel-overview')?.getAttribute('role')).toBe('tabpanel');

        tabs()[2].click();
        fixture.detectChanges();
        expect(tabs()[2].getAttribute('aria-selected')).toBe('true');
        expect(tabs()[2].classList).toContain('diag-tab-active');
        expect(fixture.nativeElement.querySelector('#diag-panel-payload')).toBeTruthy();
      });

      it('supports arrow, Home and End keys', () => {
        tabs()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
        expect(component.diagnosticTab()).toBe('headers');
        tabs()[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
        expect(component.diagnosticTab()).toBe('response');
        tabs()[3].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
        expect(component.diagnosticTab()).toBe('overview');
        tabs()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
        expect(component.diagnosticTab()).toBe('response');
        tabs()[3].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
        expect(component.diagnosticTab()).toBe('overview');
      });

      it('closes on Escape', () => {
        const dialog = fixture.nativeElement.querySelector('#webhook-diagnostics-dialog') as HTMLElement;
        dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        fixture.detectChanges();
        expect(component.selectedDelivery()).toBeNull();
      });
    });

    describe('FIX 10 — manual retry attempt labels', () => {
      const attempt = (n: number, minute: number, success = false, code = 503): DeliveryAttempt => ({
        attemptNumber: n, attemptedAt: `2026-10-28T12:${String(minute).padStart(2, '0')}:00Z`,
        httpStatusCode: code, latencyMs: 40, success, errorMessage: success ? null : `Target returned HTTP ${code}`,
      });

      it('labels the automatic cycle and each manual retry cycle while staying chronological', () => {
        const history = [
          attempt(1, 0), attempt(2, 1), attempt(3, 6), attempt(4, 21), attempt(5, 51),
          attempt(1, 55, true, 200),
        ];
        const rows = component.attemptHistoryRows(history);
        expect(rows.map((r) => r.label)).toEqual([
          'Attempt #1', 'Attempt #2', 'Attempt #3', 'Attempt #4', 'Attempt #5', 'Manual Retry #1',
        ]);
        expect(rows.map((r) => r.manual)).toEqual([false, false, false, false, false, true]);
        expect(rows).toHaveLength(6);
      });

      it('numbers repeated manual retries and sorts out-of-order history by time', () => {
        const history = [attempt(1, 59, true, 200), attempt(1, 0), attempt(2, 1), attempt(1, 30)];
        const rows = component.attemptHistoryRows(history);
        expect(rows.map((r) => r.label)).toEqual(['Attempt #1', 'Attempt #2', 'Manual Retry #1', 'Manual Retry #2']);
        expect(rows[3].attempt.success).toBe(true);
      });

      it('renders "Manual Retry #1 — 200 OK — Success" in the diagnostics modal', () => {
        merchantService.getDeliveryDetail.mockReturnValueOnce(of(detailFor('d-retried', parcelPayload('IN_TRANSIT'), {
          attempts: 1,
          retryHistory: [attempt(1, 0), attempt(2, 1), attempt(3, 6), attempt(4, 21), attempt(5, 51), attempt(1, 55, true, 200)],
        })));
        component.selectTab('deliveries');
        component.inspectDelivery(statusChange('d-retried'));
        fixture.detectChanges();

        const items = Array.from(fixture.nativeElement.querySelectorAll('#diag-attempt-history li') as NodeListOf<HTMLElement>);
        expect(items).toHaveLength(6);
        expect(fixture.nativeElement.querySelector('#diag-total-attempts')?.textContent?.trim()).toBe('6');
        expect(items[0].querySelector('.attempt-label')?.textContent).toContain('Attempt #1');
        const last = items[5].textContent!.replace(/\s+/g, ' ');
        expect(last).toContain('Manual Retry #1');
        expect(last).toContain('Manual');
        expect(last).toContain('200 OK');
        expect(last).toContain('Success');
      });
    });

    describe('FIX 11 — signing-secret regeneration uses a SwiftDrop dialog', () => {
      let confirmSpy: jest.SpyInstance;

      beforeEach(() => {
        confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => true);
        component.selectTab('settings');
        fixture.detectChanges();
      });

      afterEach(() => confirmSpy.mockRestore());

      const openDialog = () => {
        (fixture.nativeElement.querySelector('#regenerate-secret-btn') as HTMLButtonElement).click();
        fixture.detectChanges();
        return fixture.nativeElement.querySelector('#regenerate-secret-dialog') as HTMLElement;
      };

      it('opens an accessible confirmation dialog instead of the browser popup', () => {
        const dialog = openDialog();
        expect(confirmSpy).not.toHaveBeenCalled();
        expect(dialog.getAttribute('role')).toBe('alertdialog');
        expect(dialog.getAttribute('aria-modal')).toBe('true');
        expect(dialog.textContent).toContain('Regenerate Webhook Signing Secret?');
        expect(dialog.textContent).toContain('Your store\'s webhook receiver must be updated to verify them.');
        expect(dialog.querySelector('#cancel-regenerate-secret-btn')?.textContent).toContain('Cancel');
        expect(dialog.querySelector('#confirm-regenerate-secret-btn')?.textContent).toContain('Regenerate Secret');
        expect(merchantService.updateWebhookSettings).not.toHaveBeenCalled();
      });

      it('Cancel and Escape close the dialog without regenerating', () => {
        openDialog();
        (fixture.nativeElement.querySelector('#cancel-regenerate-secret-btn') as HTMLButtonElement).click();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('#regenerate-secret-dialog')).toBeNull();

        const dialog = openDialog();
        dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('#regenerate-secret-dialog')).toBeNull();
        expect(merchantService.updateWebhookSettings).not.toHaveBeenCalled();
      });

      it('Confirm regenerates exactly once and shows the one-time secret only on the page', () => {
        const pending = new Subject<WebhookSettings>();
        merchantService.updateWebhookSettings.mockReturnValueOnce(pending.asObservable());
        openDialog();
        const confirmBtn = fixture.nativeElement.querySelector('#confirm-regenerate-secret-btn') as HTMLButtonElement;
        confirmBtn.click();
        confirmBtn.click();
        component.confirmRegenerateSecret();
        fixture.detectChanges();

        expect(merchantService.updateWebhookSettings).toHaveBeenCalledTimes(1);
        expect(merchantService.updateWebhookSettings).toHaveBeenCalledWith(
          'https://api.testmerchant.com/webhook', true, ['PARCEL_STATUS_CHANGED'], true);
        expect(confirmBtn.disabled).toBe(true);
        expect(confirmBtn.textContent).toContain('Regenerating');

        pending.next({ ...component.settings()!, rawSecret: 'whsec_brand_new_secret', secretPreview: 'whsec_••••cret' });
        pending.complete();
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('#regenerate-secret-dialog')).toBeNull();
        expect(fixture.nativeElement.textContent).toContain('whsec_brand_new_secret');
        expect(component.notification()).toContain('shown only once');
        expect(component.notification()).not.toContain('whsec_brand_new_secret');
        expect(JSON.stringify(localStorage)).not.toContain('whsec_brand_new_secret');
        expect(JSON.stringify(sessionStorage)).not.toContain('whsec_brand_new_secret');

        component.selectTab('orders');
        expect(component.settings()?.rawSecret).toBeNull();
      });

      it('shows failure feedback and does not reveal any secret when regeneration fails', () => {
        merchantService.updateWebhookSettings.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));
        openDialog();
        (fixture.nativeElement.querySelector('#confirm-regenerate-secret-btn') as HTMLButtonElement).click();
        fixture.detectChanges();

        expect(component.settingsError()).toContain('Unable to regenerate the signing secret');
        expect(component.isRegeneratingSecret()).toBe(false);
        expect(component.settings()?.rawSecret).toBeNull();
        expect(fixture.nativeElement.querySelector('#regenerate-secret-dialog')).toBeNull();
      });
    });

    describe('Follow-ups — list-level parcelStatus and retry counts', () => {
      beforeEach(() => {
        component.selectTab('deliveries');
        merchantService.getDeliveryDetail.mockClear();
      });

      it('uses parcelStatus from the list response without any per-row detail requests', () => {
        merchantService.getDeliveryLogs.mockReturnValueOnce(of({
          content: [
            statusChange('l-1', { parcelStatus: 'PICKED_UP' }),
            statusChange('l-2', { parcelStatus: 'OUT_FOR_DELIVERY' }),
            statusChange('l-3', { parcelStatus: null }),
          ],
          totalElements: 3, totalPages: 1, page: 0, size: 20,
        }));
        component.loadDeliveries(0);
        fixture.detectChanges();

        expect(merchantService.getDeliveryDetail).not.toHaveBeenCalled();
        const labels = Array.from(fixture.nativeElement.querySelectorAll('.delivery-event-label') as NodeListOf<HTMLElement>)
          .map((el) => el.textContent!.trim());
        expect(labels).toEqual(['Parcel Picked Up', 'Out for Delivery', 'Parcel Status Changed']);
      });

      it('still falls back to the detail lookup for servers that do not send parcelStatus', () => {
        merchantService.getDeliveryLogs.mockReturnValueOnce(of({
          content: [statusChange('legacy-1')], totalElements: 1, totalPages: 1, page: 0, size: 20,
        }));
        component.loadDeliveries(0);
        expect(merchantService.getDeliveryDetail).toHaveBeenCalledWith('legacy-1');
      });

      it('shows automatic and manual attempts instead of a bare "1 of 5" after a manual retry', () => {
        merchantService.getDeliveryLogs.mockReturnValueOnce(of({
          content: [
            statusChange('retried', { attempts: 1, totalAttempts: 6, manualRetryCount: 1, parcelStatus: 'IN_TRANSIT' }),
            statusChange('twice', { attempts: 1, totalAttempts: 7, manualRetryCount: 2, parcelStatus: 'IN_TRANSIT' }),
            statusChange('plain', { attempts: 3, totalAttempts: 3, manualRetryCount: 0, parcelStatus: 'IN_TRANSIT', status: 'PENDING_RETRY' }),
          ],
          totalElements: 3, totalPages: 1, page: 0, size: 20,
        }));
        component.loadDeliveries(0);
        fixture.detectChanges();

        const rows = Array.from(fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLElement>);
        const text = (row: HTMLElement, selector: string) => row.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
        expect(text(rows[0], '.delivery-attempts')).toBe('5 of 5 automatic');
        expect(text(rows[0], '.delivery-manual-retries')).toBe('+ 1 manual retry');
        expect(rows[0].querySelector('.delivery-attempts')?.getAttribute('title')).toBe('6 attempts in total');
        expect(text(rows[1], '.delivery-attempts')).toBe('5 of 5 automatic');
        expect(text(rows[1], '.delivery-manual-retries')).toBe('+ 2 manual retries');
        expect(text(rows[2], '.delivery-attempts')).toBe('3 of 5');
        expect(rows[2].querySelector('.delivery-manual-retries')).toBeNull();
      });
    });

    describe('FIX 12 — dashboard summary labels', () => {
      it('shows Failed and Cancelled separately with a consistent in-delivery total', () => {
        merchantService.getOrderCounts.mockReturnValueOnce(of({ ...mockCounts, failed: 4, cancelled: 2 }));
        component.loadOrderCounts();
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).not.toContain('Failed / Cancelled');
        expect(fixture.nativeElement.querySelector('#merchant-failed-count-card')?.textContent).toContain('4');
        expect(fixture.nativeElement.querySelector('#merchant-cancelled-count-card')?.textContent).toContain('2');
        // pickedUp (1) + inTransit (2) + outForDelivery (1)
        expect(component.activeDeliveryCount()).toBe(4);
        expect(fixture.nativeElement.querySelector('#merchant-active-delivery-count')?.textContent?.trim()).toBe('4');
        expect(fixture.nativeElement.textContent).not.toContain('in delivery today');
      });
    });
  });
});
