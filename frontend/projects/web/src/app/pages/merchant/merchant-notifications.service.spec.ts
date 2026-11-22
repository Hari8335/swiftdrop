import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from 'shared-auth';
import { MerchantNotificationsService } from './merchant-notifications.service';

describe('MerchantNotificationsService', () => {
  let service: MerchantNotificationsService;
  let http: HttpTestingController;
  const currentUser = signal<{ id: string } | null>(null);

  beforeEach(() => {
    currentUser.set(null);
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(), MerchantNotificationsService,
      { provide: AuthService, useValue: { currentUser } },
    ] });
    service = TestBed.inject(MerchantNotificationsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { service.dismissToast(); http.verify(); });

  it('keeps recent merchant actions for the notification bell and marks them read', () => {
    service.add('Webhook saved', 'Webhook settings updated.');
    service.add('Bulk upload failed', 'One row was rejected.', 'error');

    expect(service.notifications()).toHaveLength(2);
    expect(service.unreadCount()).toBe(2);
    expect(service.toast()?.title).toBe('Bulk upload failed');

    service.markRead(service.notifications()[0].id);
    expect(service.unreadCount()).toBe(1);
    service.markAllRead();
    expect(service.unreadCount()).toBe(0);
  });

  it('caps history at 40 items and supports clearing the inbox', () => {
    for (let i = 0; i < 45; i++) service.add('Action', `Action ${i}`);
    expect(service.notifications()).toHaveLength(40);
    service.clearAll();
    expect(service.notifications()).toEqual([]);
    expect(service.unreadCount()).toBe(0);
  });

  it('loads server notifications without returning credential secrets in the list', () => {
    service.refresh();
    http.expectOne('/api/v1/merchant/notifications').flush({
      items: [{ id: 'notification-uuid', type: 'CREDENTIALS_REPLACED', title: 'Credentials replaced', message: 'Claim once.', read: false, credentialAvailable: true, createdAt: '2026-11-22T10:00:00Z' }],
      totalElements: 1, unreadCount: 1,
    });
    expect(service.notifications()[0]).toMatchObject({ type: 'CREDENTIALS_REPLACED', credentialAvailable: true, read: false });
    expect(service.unreadCount()).toBe(1);
  });

  it('requests the one-time credential claim only on notification activation', () => {
    let result: unknown;
    service.claimCredential('notification-uuid').subscribe((value) => result = value);
    http.expectOne('/api/v1/merchant/notifications/notification-uuid/credential/claim')
      .flush({ clientId: 'merchant-client', clientSecret: 'one-time-secret' });
    expect(result).toEqual({ clientId: 'merchant-client', clientSecret: 'one-time-secret' });
  });

  it('discards a credential response when the signed-in merchant changes', () => {
    currentUser.set({ id: 'merchant-one' });
    const result = jest.fn();
    service.claimCredential('notification-uuid').subscribe(result);
    const claim = http.expectOne('/api/v1/merchant/notifications/notification-uuid/credential/claim');
    currentUser.set({ id: 'merchant-two' });
    claim.flush({ clientId: 'merchant-client', clientSecret: 'one-time-secret' });
    expect(result).not.toHaveBeenCalled();
  });
});
