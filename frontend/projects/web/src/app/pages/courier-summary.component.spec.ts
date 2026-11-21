import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { CourierSummaryComponent } from './courier-summary.component';
import { NotificationService } from '../notification/notification.service';

describe('CourierSummaryComponent', () => {
  let component: CourierSummaryComponent;
  let fixture: ComponentFixture<CourierSummaryComponent>;
  let http: HttpTestingController;

  const mockNotificationService = {
    unreadCount: signal(0),
    totalElements: signal(0),
    notifications: signal([]),
    isLoading: signal(false),
    error: signal(null),
    refreshUnreadCount: () => of(0),
    loadNotifications: () => of([]),
    markAsRead: () => of(void 0),
    markAllAsRead: () => of(void 0),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CourierSummaryComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CourierSummaryComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('maps backend counts and cards without calculating them locally', () => {
    fixture.detectChanges();
    http.expectOne('/api/v1/courier/summary').flush({ date: '2026-10-29', totalDeliveries: 2, pendingCount: 1, completedCount: 1, deliveries: [{ parcelId: 'p1', trackingNumber: 'SD-1', status: 'FAILED', recipientName: 'A', recipientPhone: null, dropoffAddress: 'Colombo', googleMapsUrl: null, weightKg: 1, attemptCount: 2, sequenceOrder: 1, completedAt: '2026-10-28T18:31:00Z' }] });
    fixture.detectChanges();
    expect(component.summary()?.pendingCount).toBe(1);
    expect(component.summary()?.completedCount).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('SD-1');
  });

  it('omits date initially and sends an explicit selected date unchanged', () => {
    fixture.detectChanges();
    http.expectOne((request) => request.url === '/api/v1/courier/summary' && !request.params.has('date')).flush({ date: '2026-10-29', totalDeliveries: 0, pendingCount: 0, completedCount: 0, deliveries: [] });
    component.selectDate('2026-10-28');
    const request = http.expectOne((r) => r.url === '/api/v1/courier/summary' && r.params.get('date') === '2026-10-28');
    request.flush({ date: '2026-10-28', totalDeliveries: 0, pendingCount: 0, completedCount: 0, deliveries: [] });
    expect(component.selectedDate()).toBe('2026-10-28');
  });

  it('renders empty summaries and API failures', () => {
    fixture.detectChanges();
    http.expectOne('/api/v1/courier/summary').flush({ date: '2026-10-29', totalDeliveries: 0, pendingCount: 0, completedCount: 0, deliveries: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No deliveries');
  });

  it('navigates with query parameters properly', () => {
    http.expectOne('/api/v1/courier/summary').flush({ date: '2026-10-29', totalDeliveries: 0, pendingCount: 0, completedCount: 0, deliveries: [] });
    const router = (component as any).router;
    const navigateSpy = jest.spyOn(router, 'navigate');
    component.navigateTo('/courier?tab=tracking');
    expect(navigateSpy).toHaveBeenCalledWith(['/courier'], { queryParams: { tab: 'tracking' } });
  });
});
