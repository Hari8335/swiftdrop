import { HttpErrorResponse } from '@angular/common/http';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { TrackingApiService } from './tracking-api.service';
import { StreamMessage, TrackingStreamService, parseEvent } from './tracking-stream.service';
import { FakeEventSource, fakeEventSourceProvider, statusEvent } from './testing';
import { ParcelStatus, PublicTrackingResponse } from './tracking.model';

const TN = 'SD-20261104-A1B2C3';

/** A public lookup result for TN with the given current status. */
function snapshot(status: ParcelStatus, timeline = [{ status, occurredAt: '2026-11-04T12:00:00Z' }]): PublicTrackingResponse {
  return {
    parcelId: 'p-1',
    trackingNumber: TN,
    status,
    recipientNameMasked: 'S*** S***',
    dropoffDistrict: 'Kandy',
    lastUpdatedAt: timeline.at(-1)!.occurredAt,
    timeline,
  };
}

describe('TrackingStreamService', () => {
  let service: TrackingStreamService;
  let messages: StreamMessage[];
  /** Responses for the next polled lookups, in order; afterwards IN_TRANSIT. */
  let lookups: Observable<PublicTrackingResponse>[];
  let api: { publicTracking: jest.Mock };

  beforeEach(() => {
    FakeEventSource.reset();
    lookups = [];
    api = { publicTracking: jest.fn(() => lookups.shift() ?? of(snapshot('IN_TRANSIT'))) };
    TestBed.configureTestingModule({ providers: [fakeEventSourceProvider, { provide: TrackingApiService, useValue: api }] });
    service = TestBed.inject(TrackingStreamService);
    messages = [];
  });

  const states = () => messages.filter((m) => m.type === 'state').map((m) => (m.type === 'state' ? m.state : null));
  const events = () => messages.filter((m) => m.type === 'event').map((m) => (m.type === 'event' ? m.event : null));

  it('opens one EventSource on the contract URL for the requested parcel', () => {
    service.connect(TN).subscribe((m) => messages.push(m));

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(FakeEventSource.latest().url).toBe(`/api/v1/tracking/${TN}/stream`);
    expect(states()).toEqual(['connecting']);

    FakeEventSource.latest().open();
    expect(states()).toEqual(['connecting', 'live']);
  });

  it('passes on valid status events and drops malformed ones or ones for another parcel', () => {
    service.connect(TN).subscribe((m) => messages.push(m));
    const source = FakeEventSource.latest();

    source.emit(statusEvent(TN, 4, 'IN_TRANSIT'));
    source.emit('{not json');
    source.emit(statusEvent('SD-20261104-OTHER1', 5, 'DELIVERED'));
    source.emit(JSON.stringify({ trackingNumber: TN, sequence: 'x', status: 'IN_TRANSIT', occurredAt: '2026-11-04T10:00:00Z' }));
    source.emit(JSON.stringify({ trackingNumber: TN, sequence: 6, status: 'LOST', occurredAt: '2026-11-04T10:00:00Z' }));
    source.emit(statusEvent(TN, 7, 'OUT_FOR_DELIVERY'), 'message'); // not the contract's event name

    expect(events()).toEqual([statusEvent(TN, 4, 'IN_TRANSIT')]);
  });

  it('reports reconnecting while the browser retries, and switches to polling when it gives up', fakeAsync(() => {
    const subscription = service.connect(TN).subscribe((m) => messages.push(m));
    const source = FakeEventSource.latest();
    source.open();

    source.fail(0);
    expect(states().at(-1)).toBe('reconnecting');
    source.open();
    expect(states().at(-1)).toBe('live');

    source.fail(2);
    expect(states().at(-1)).toBe('polling');
    expect(source.closed).toBe(true);
    subscription.unsubscribe();
  }));

  describe('polling fallback', () => {
    const snapshots = () => messages.filter((m) => m.type === 'snapshot').map((m) => (m.type === 'snapshot' ? m.snapshot : null));
    const giveUp = () => {
      const source = FakeEventSource.latest();
      source.fail(2);
      return source;
    };

    it('reads the public lookup at once and then every 10 seconds', fakeAsync(() => {
      const subscription = service.connect(TN).subscribe((m) => messages.push(m));
      giveUp();

      tick(0);
      expect(api.publicTracking).toHaveBeenCalledTimes(1);
      expect(api.publicTracking).toHaveBeenCalledWith(TN);
      expect(snapshots()).toHaveLength(1);

      tick(9_999);
      expect(api.publicTracking).toHaveBeenCalledTimes(1);
      tick(1);
      expect(api.publicTracking).toHaveBeenCalledTimes(2);
      expect(snapshots()).toHaveLength(2);

      subscription.unsubscribe();
    }));

    it('stops polling and ends once the parcel is delivered', fakeAsync(() => {
      let completed = false;
      lookups = [of(snapshot('OUT_FOR_DELIVERY')), of(snapshot('DELIVERED'))];
      service.connect(TN).subscribe({ next: (m) => messages.push(m), complete: () => (completed = true) });
      giveUp();

      tick(10_000);

      expect(snapshots().map((s) => s!.status)).toEqual(['OUT_FOR_DELIVERY', 'DELIVERED']);
      expect(states().at(-1)).toBe('ended');
      expect(completed).toBe(true);
      tick(30_000);
      expect(api.publicTracking).toHaveBeenCalledTimes(2);
    }));

    it('keeps polling after a failed lookup and gives up only on 404', fakeAsync(() => {
      lookups = [
        throwError(() => new HttpErrorResponse({ status: 503 })),
        of(snapshot('IN_TRANSIT')),
        throwError(() => new HttpErrorResponse({ status: 404 })),
      ];
      service.connect(TN).subscribe((m) => messages.push(m));
      giveUp();

      tick(0);
      expect(snapshots()).toHaveLength(0);
      expect(states().at(-1)).toBe('polling');
      tick(10_000);
      expect(snapshots()).toHaveLength(1);
      tick(10_000);
      expect(states().at(-1)).toBe('disconnected');
      tick(30_000);
      expect(api.publicTracking).toHaveBeenCalledTimes(3);
    }));

    it('does not start a second lookup while one is still running', fakeAsync(() => {
      const slow = new Subject<PublicTrackingResponse>();
      lookups = [slow];
      const subscription = service.connect(TN).subscribe((m) => messages.push(m));
      giveUp();

      tick(25_000);
      expect(api.publicTracking).toHaveBeenCalledTimes(1);

      slow.next(snapshot('IN_TRANSIT'));
      slow.complete();
      tick(5_000);
      expect(api.publicTracking).toHaveBeenCalledTimes(2);
      subscription.unsubscribe();
    }));

    it('ignores lookups for another parcel', fakeAsync(() => {
      lookups = [of({ ...snapshot('DELIVERED'), trackingNumber: 'SD-20261104-OTHER1' })];
      const subscription = service.connect(TN).subscribe((m) => messages.push(m));
      giveUp();

      tick(0);

      expect(snapshots()).toHaveLength(0);
      expect(states().at(-1)).toBe('polling');
      subscription.unsubscribe();
    }));

    it('stops polling when unsubscribed, e.g. to retry the live connection', fakeAsync(() => {
      const subscription = service.connect(TN).subscribe((m) => messages.push(m));
      giveUp();
      tick(0);

      subscription.unsubscribe();
      tick(60_000);

      expect(api.publicTracking).toHaveBeenCalledTimes(1);
    }));
  });

  it('closes the connection after a terminal status so the browser does not reconnect', () => {
    let completed = false;
    service.connect(TN).subscribe({ next: (m) => messages.push(m), complete: () => (completed = true) });
    const source = FakeEventSource.latest();

    source.emit(statusEvent(TN, 6, 'DELIVERED'));

    expect(events()).toHaveLength(1);
    expect(states().at(-1)).toBe('ended');
    expect(source.closed).toBe(true);
    expect(completed).toBe(true);
  });

  it('closes the EventSource when unsubscribed', () => {
    const subscription = service.connect(TN).subscribe((m) => messages.push(m));
    const source = FakeEventSource.latest();

    subscription.unsubscribe();

    expect(source.closed).toBe(true);
  });

  it('parseEvent only accepts complete events for the given parcel', () => {
    expect(parseEvent(JSON.stringify(statusEvent(TN, 1, 'CREATED')), TN)).toEqual(statusEvent(TN, 1, 'CREATED'));
    expect(parseEvent('null', TN)).toBeNull();
    expect(parseEvent(JSON.stringify({ ...statusEvent(TN, 1, 'CREATED'), occurredAt: 'yesterday' }), TN)).toBeNull();
    expect(parseEvent(JSON.stringify({ ...statusEvent(TN, 0, 'CREATED') }), TN)).toBeNull();
  });
});
