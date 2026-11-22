import { TestBed } from '@angular/core/testing';
import { MerchantNotificationsService } from './merchant-notifications.service';

describe('MerchantNotificationsService', () => {
  let service: MerchantNotificationsService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [MerchantNotificationsService] });
    service = TestBed.inject(MerchantNotificationsService);
  });

  afterEach(() => service.dismissToast());

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
});
