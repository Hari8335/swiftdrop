import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DispatchParcelSummary } from './dispatch.model';
import { DispatchNotificationsService } from './dispatch-notifications.service';

describe('DispatchNotificationsService', () => {
  let service: DispatchNotificationsService;
  let http: HttpTestingController;

  const parcel = (id: string, extra: Partial<DispatchParcelSummary> = {}): DispatchParcelSummary => ({
    parcelId: id,
    trackingNumber: `SD-${id}`,
    status: 'CREATED',
    pickupZone: 'Colombo',
    dropoffZone: 'Kandy',
    createdAt: '',
    ...extra,
  });
  const page = (content: DispatchParcelSummary[]) => ({ content, totalElements: content.length, totalPages: 1, page: 0, size: 100 });

  const respond = (queue: DispatchParcelSummary[], failed: DispatchParcelSummary[]) => {
    service.poll();
    http.expectOne((r) => r.url === '/api/v1/dispatch/parcels').flush(page(queue));
    http.expectOne((r) => r.url === '/api/v1/dispatch/parcels/failed').flush(page(failed));
  };

  beforeEach(() => {
    jest.useFakeTimers();
    try { localStorage.clear(); } catch { /* ignore */ }
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(DispatchNotificationsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    jest.useRealTimers();
  });

  it('treats the first poll as a baseline and does not notify', () => {
    respond([parcel('a')], [parcel('f', { status: 'FAILED' })]);
    expect(service.notifications()).toHaveLength(0);
    expect(service.queueCount()).toBe(1);
    expect(service.failedCount()).toBe(1);
  });

  it('notifies and toasts for parcels that appear after the baseline', () => {
    respond([parcel('a')], []);
    respond([parcel('a'), parcel('b')], [parcel('f', { status: 'FAILED', failureReason: 'RECIPIENT_ABSENT' })]);

    const titles = service.notifications().map((n) => n.title);
    expect(titles).toEqual(['Delivery attempt failed', 'New parcel awaiting assignment']);
    expect(service.notifications()[0].message).toContain('Recipient absent');
    expect(service.unreadCount()).toBe(2);
    expect(service.toasts()).toHaveLength(2);

    jest.advanceTimersByTime(6000);
    expect(service.toasts()).toHaveLength(0);
  });

  it('respects pop-up preferences but still lists the notification', () => {
    service.setPrefs({ queueAlerts: false, failedAlerts: true });
    respond([], []);
    respond([parcel('b')], []);
    expect(service.notifications()).toHaveLength(1);
    expect(service.toasts()).toHaveLength(0);
  });

  it('marks notifications read and clears them', () => {
    respond([], []);
    respond([parcel('b'), parcel('c')], []);
    service.markRead(service.notifications()[0].id);
    expect(service.unreadCount()).toBe(1);
    service.markAllRead();
    expect(service.unreadCount()).toBe(0);
    service.clearAll();
    expect(service.notifications()).toHaveLength(0);
  });
});
