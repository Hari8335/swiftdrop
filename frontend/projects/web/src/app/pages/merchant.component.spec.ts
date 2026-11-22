import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';
import { MerchantComponent } from './merchant.component';
import { MerchantOrderDetails, MerchantOrderListPage, OrderCounts, WebhookSettings } from './merchant/merchant.model';
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
      getOrders: jest.fn().mockReturnValue(of(mockOrderPage)),
      getOrderCounts: jest.fn().mockReturnValue(of(mockCounts)),
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

  it('shows a static Sample Merchant label, the notification bell, and sidebar logout without a profile dropdown', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#merchant-profile-chip')?.textContent).toContain('Sample Merchant');
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

  it('groups webhook settings, delivery logs, and API credentials under Integrations', () => {
    const integrationsButton = fixture.nativeElement.querySelector('[aria-label="Integrations"]') as HTMLButtonElement;
    const menu = fixture.nativeElement.querySelector('#merchant-integrations-menu') as HTMLElement;
    expect(integrationsButton.getAttribute('aria-expanded')).toBe('true');
    expect(menu).toBeTruthy();
    expect(menu.textContent).toContain('Webhook Settings');
    expect(menu.textContent).toContain('Webhook Delivery Logs');
    expect(menu.textContent).toContain('API Credentials');

    integrationsButton.click();
    fixture.detectChanges();

    const deliveryLogsButton = Array.from(menu.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Webhook Delivery Logs')) as HTMLButtonElement;
    deliveryLogsButton.click();
    fixture.detectChanges();

    expect(component.activeTab()).toBe('deliveries');
    expect(integrationsButton.getAttribute('aria-expanded')).toBe('true');
    expect(menu.querySelector('[aria-current="page"]')?.textContent).toContain('Webhook Delivery Logs');
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

  it('shows loading and uses only the latest tracking response after a filter change', () => {
    const pending = new Subject<MerchantOrderListPage>();
    merchantService.getOrders
      .mockReturnValueOnce(pending.asObservable())
      .mockReturnValueOnce(of({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 }));

    component.loadOrders();
    fixture.detectChanges();
    expect(component.isLoadingOrders()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Loading merchant orders');

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
});
