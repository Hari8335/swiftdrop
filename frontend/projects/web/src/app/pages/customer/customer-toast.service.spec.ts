import { TestBed } from '@angular/core/testing';
import { CustomerToastService } from './customer-toast.service';
import { CustomerToastsComponent } from './customer-toasts.component';

describe('CustomerToastService', () => {
  let service: CustomerToastService;

  beforeEach(() => {
    jest.useFakeTimers();
    TestBed.configureTestingModule({ imports: [CustomerToastsComponent] });
    service = TestBed.inject(CustomerToastService);
  });

  afterEach(() => jest.useRealTimers());

  it('shows a toast and hides it after a few seconds', () => {
    service.success('Parcel booked', 'Tracking: SD-1');
    expect(service.toasts()).toEqual([expect.objectContaining({ kind: 'success', title: 'Parcel booked', message: 'Tracking: SD-1' })]);
    jest.advanceTimersByTime(5000);
    expect(service.toasts()).toHaveLength(0);
  });

  it('keeps at most four toasts and can dismiss one', () => {
    for (let i = 1; i <= 6; i++) service.info(`Toast ${i}`);
    expect(service.toasts().map((t) => t.title)).toEqual(['Toast 3', 'Toast 4', 'Toast 5', 'Toast 6']);
    service.dismiss(service.toasts()[0].id);
    expect(service.toasts()).toHaveLength(3);
  });

  it('renders success and error toasts in the corner stack', () => {
    const fixture = TestBed.createComponent(CustomerToastsComponent);
    service.success('Address added');
    service.error('Booking failed', 'Server unavailable');
    fixture.detectChanges();

    const toasts = (fixture.nativeElement as HTMLElement).querySelectorAll('.customer-toast');
    expect(toasts).toHaveLength(2);
    expect(toasts[0].getAttribute('data-kind')).toBe('success');
    expect(toasts[1].getAttribute('role')).toBe('alert');
    expect(toasts[1].textContent).toContain('Server unavailable');
  });
});
