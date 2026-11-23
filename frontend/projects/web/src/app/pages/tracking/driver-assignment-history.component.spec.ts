import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { DriverAssignmentHistoryComponent } from './driver-assignment-history.component';
import { TrackingApiService } from './tracking-api.service';
import { DriverAssignmentHistoryResponse } from './tracking.model';

@Component({
  standalone: true,
  imports: [DriverAssignmentHistoryComponent],
  template: `<app-driver-assignment-history [parcelId]="parcelId()" [revision]="revision()" [poll]="poll()" />`,
})
class HostComponent {
  parcelId = signal('p-1');
  revision = signal(0);
  poll = signal(false);
}

const REASSIGNED: DriverAssignmentHistoryResponse = {
  parcelId: 'p-1',
  assignments: [
    {
      driver: { name: 'Saman Perera', vehicleType: 'Motorbike', zone: 'Colombo' },
      assignedAt: '2026-11-19T08:05:00Z',
      status: 'PREVIOUS',
      reassignedAt: '2026-11-19T09:30:00Z',
    },
    {
      driver: { name: 'Nimal Silva', vehicleType: null, zone: 'Kandy' },
      assignedAt: '2026-11-19T09:30:00Z',
      status: 'CURRENT',
      reassignedAt: null,
    },
  ],
};

describe('DriverAssignmentHistoryComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let assignments: jest.Mock;
  const el = () => fixture.nativeElement as HTMLElement;
  const all = (testId: string) => [...el().querySelectorAll(`[data-testid="${testId}"]`)].map((e) => e.textContent!.trim());

  function create(response: unknown = of(REASSIGNED)) {
    assignments = jest.fn().mockReturnValue(response);
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: TrackingApiService, useValue: { assignments } }],
    });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  }

  it('lists every driver oldest first with profile, times and status', fakeAsync(() => {
    create();
    tick();
    fixture.detectChanges();

    expect(assignments).toHaveBeenCalledWith('p-1');
    expect(all('driver-name')).toEqual(['Saman Perera', 'Nimal Silva']);
    expect(all('driver-status')).toEqual(['Previously Assigned', 'Currently Assigned']);
    expect(all('driver-profile')).toEqual(['Motorbike · Colombo zone', 'Kandy zone']);
    expect(all('driver-assigned-at')).toHaveLength(2);
    // Only the replaced driver has a reassignment time.
    expect(all('driver-reassigned-at')).toHaveLength(1);
    expect(el().textContent).not.toMatch(/\+94|phone/i);
  }));

  it("shows the courier's profile picture when they have one and initials otherwise", fakeAsync(() => {
    create(of({
      ...REASSIGNED,
      assignments: [
        { ...REASSIGNED.assignments[0], driver: { ...REASSIGNED.assignments[0].driver!, photoUrl: 'data:image/png;base64,AAAA' } },
        REASSIGNED.assignments[1],
      ],
    }));
    tick();
    fixture.detectChanges();

    const avatars = [...el().querySelectorAll('[data-testid="driver-avatar"]')];
    expect(avatars).toHaveLength(2);
    expect(avatars[0].querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,AAAA');
    expect(avatars[1].querySelector('img')).toBeNull();
    expect(avatars[1].textContent?.trim()).toBe('NS');
  }));

  it('shows "Courier" and "Profile not available" when the driver has no profile', fakeAsync(() => {
    create(of({
      parcelId: 'p-1',
      assignments: [{ driver: null, assignedAt: '2026-11-19T08:05:00Z', status: 'CURRENT', reassignedAt: null }],
    }));
    tick();
    fixture.detectChanges();

    expect(all('driver-name')).toEqual(['Courier']);
    expect(all('driver-profile')).toEqual(['Profile not available']);
  }));

  it('shows an empty state when no driver has been assigned', fakeAsync(() => {
    create(of({ parcelId: 'p-1', assignments: [] }));
    tick();
    fixture.detectChanges();

    expect(el().querySelector('[data-testid="driver-history-empty"]')!.textContent).toContain('No courier assigned yet');
  }));

  it('shows an error with a working retry', fakeAsync(() => {
    create(throwError(() => new Error('down')));
    tick();
    fixture.detectChanges();
    expect(el().querySelector('[data-testid="driver-history-error"]')).not.toBeNull();

    assignments.mockReturnValue(of(REASSIGNED));
    el().querySelector<HTMLButtonElement>('[data-testid="driver-history-error"] button')!.click();
    tick();
    fixture.detectChanges();

    expect(all('driver-name')).toEqual(['Saman Perera', 'Nimal Silva']);
  }));

  it('polls every 30 s only while polling is on (parcel still CREATED)', fakeAsync(() => {
    create();
    tick();
    expect(assignments).toHaveBeenCalledTimes(1);

    tick(DriverAssignmentHistoryComponent.POLL_MS);
    expect(assignments).toHaveBeenCalledTimes(1);

    fixture.componentInstance.poll.set(true);
    fixture.detectChanges();
    tick();
    const afterOn = assignments.mock.calls.length;
    tick(DriverAssignmentHistoryComponent.POLL_MS);
    expect(assignments.mock.calls.length).toBe(afterOn + 1);

    fixture.componentInstance.poll.set(false);
    fixture.detectChanges();
    tick();
    const afterOff = assignments.mock.calls.length;
    tick(DriverAssignmentHistoryComponent.POLL_MS * 2);
    expect(assignments.mock.calls.length).toBe(afterOff);
  }));

  it('reloads quietly when a live event arrives, keeping the list on screen', fakeAsync(() => {
    create();
    tick();
    fixture.detectChanges();
    const pending = new Subject<DriverAssignmentHistoryResponse>();
    assignments.mockReturnValue(pending);

    fixture.componentInstance.revision.set(1);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(assignments).toHaveBeenCalledTimes(2);
    expect(el().querySelector('[data-testid="driver-history-loading"]')).toBeNull();
    expect(all('driver-name')).toEqual(['Saman Perera', 'Nimal Silva']);

    pending.next({ ...REASSIGNED, assignments: [...REASSIGNED.assignments] });
    fixture.detectChanges();
    expect(all('driver-name')).toHaveLength(2);
  }));
});
