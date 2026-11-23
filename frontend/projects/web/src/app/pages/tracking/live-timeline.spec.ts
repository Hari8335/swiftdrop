import { LiveTimeline } from './live-timeline';
import { statusEvent } from './testing';
import { ParcelStatus, PublicTimelineEntry, PublicTrackingResponse } from './tracking.model';

const TN = 'SD-20261104-A1B2C3';

describe('LiveTimeline', () => {
  let timeline: LiveTimeline;

  beforeEach(() => {
    timeline = new LiveTimeline();
    timeline.reset(
      TN,
      'PICKED_UP',
      [
        { status: 'PICKED_UP', occurredAt: '2026-11-04T09:00:00Z' },
        { status: 'CREATED', occurredAt: '2026-11-04T08:00:00Z' },
      ],
      '2026-11-04T09:00:00Z',
    );
  });

  it('orders the loaded history by time', () => {
    expect(timeline.items().map((i) => i.status)).toEqual(['CREATED', 'PICKED_UP']);
    expect(timeline.status()).toBe('PICKED_UP');
  });

  it('the state sent at connect repeats the current status and adds no row', () => {
    expect(timeline.apply(statusEvent(TN, 3, 'PICKED_UP'))).toBe(false);
    expect(timeline.items()).toHaveLength(2);
  });

  it('revision counts every accepted event, including same-status ones such as a reassignment', () => {
    expect(timeline.revision()).toBe(0);
    timeline.apply(statusEvent(TN, 3, 'PICKED_UP'));
    expect(timeline.revision()).toBe(1);
    timeline.apply(statusEvent(TN, 3, 'PICKED_UP'));
    expect(timeline.revision()).toBe(1);
    timeline.apply(statusEvent(TN, 4, 'IN_TRANSIT'));
    expect(timeline.revision()).toBe(2);
  });

  it('adds a row and updates status and time for a new status', () => {
    timeline.apply(statusEvent(TN, 3, 'PICKED_UP'));
    expect(timeline.apply(statusEvent(TN, 4, 'IN_TRANSIT', '2026-11-04T10:00:00Z'))).toBe(true);

    expect(timeline.items().map((i) => i.status)).toEqual(['CREATED', 'PICKED_UP', 'IN_TRANSIT']);
    expect(timeline.status()).toBe('IN_TRANSIT');
    expect(timeline.lastUpdatedAt()).toBe('2026-11-04T10:00:00Z');
    expect(timeline.lastUpdateLive()).toBe(true);
  });

  it('ignores duplicates and older sequences (replay after reconnect)', () => {
    timeline.apply(statusEvent(TN, 4, 'IN_TRANSIT'));
    timeline.apply(statusEvent(TN, 4, 'IN_TRANSIT'));
    timeline.apply(statusEvent(TN, 3, 'PICKED_UP'));
    timeline.apply(statusEvent(TN, 5, 'OUT_FOR_DELIVERY'));
    timeline.apply(statusEvent(TN, 5, 'OUT_FOR_DELIVERY'));

    expect(timeline.items().map((i) => i.status)).toEqual(['CREATED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY']);
  });

  it('ignores events for another parcel', () => {
    expect(timeline.apply(statusEvent('SD-20261104-OTHER1', 9, 'DELIVERED'))).toBe(false);
    expect(timeline.status()).toBe('PICKED_UP');
  });

  it('a re-queued parcel (FAILED then CREATED) shows both rows', () => {
    timeline.apply(statusEvent(TN, 4, 'FAILED'));
    timeline.apply(statusEvent(TN, 5, 'CREATED'));
    expect(timeline.items().map((i) => i.status)).toEqual(['CREATED', 'PICKED_UP', 'FAILED', 'CREATED']);
  });

  it('clear() forgets the parcel, so late events cannot change the view', () => {
    timeline.clear();
    expect(timeline.apply(statusEvent(TN, 9, 'DELIVERED'))).toBe(false);
    expect(timeline.items()).toEqual([]);
    expect(timeline.status()).toBeNull();
  });
});

describe('LiveTimeline.applySnapshot (polling fallback)', () => {
  let timeline: LiveTimeline;
  const lookup = (status: ParcelStatus, timeline: PublicTimelineEntry[], trackingNumber = TN): PublicTrackingResponse => ({
    trackingNumber,
    status,
    recipientNameMasked: 'S*** S***',
    dropoffDistrict: 'Kandy',
    lastUpdatedAt: timeline.at(-1)!.occurredAt,
    timeline,
  });
  const created = { status: 'CREATED' as const, occurredAt: '2026-11-04T08:00:00Z' };
  const pickedUp = { status: 'PICKED_UP' as const, occurredAt: '2026-11-04T09:00:00Z' };
  const inTransit = { status: 'IN_TRANSIT' as const, occurredAt: '2026-11-04T10:00:00Z' };

  beforeEach(() => {
    timeline = new LiveTimeline();
    // Loaded from the owner's history, with a reason the public lookup does not carry.
    timeline.reset(TN, 'PICKED_UP', [created, { ...pickedUp, reason: 'Collected at depot' }], pickedUp.occurredAt);
  });

  it('adds only the entries newer than the last row and keeps loaded details', () => {
    const changed = timeline.applySnapshot(lookup('IN_TRANSIT', [created, pickedUp, inTransit]));

    expect(changed).toBe(true);
    expect(timeline.status()).toBe('IN_TRANSIT');
    expect(timeline.items().map((i) => i.status)).toEqual(['CREATED', 'PICKED_UP', 'IN_TRANSIT']);
    expect(timeline.items()[1].reason).toBe('Collected at depot');
    expect(timeline.lastUpdatedAt()).toBe(inTransit.occurredAt);
    expect(timeline.lastUpdateLive()).toBe(true);
  });

  it('changes nothing when the lookup has nothing new', () => {
    const revision = timeline.revision();

    expect(timeline.applySnapshot(lookup('PICKED_UP', [created, pickedUp]))).toBe(false);
    expect(timeline.items()).toHaveLength(2);
    expect(timeline.revision()).toBe(revision);
  });

  it('ignores a lookup for another parcel', () => {
    expect(timeline.applySnapshot(lookup('DELIVERED', [created, inTransit], 'SD-20261104-OTHER1'))).toBe(false);
    expect(timeline.status()).toBe('PICKED_UP');
  });

  it('bumps the revision so dependent views reload', () => {
    const revision = timeline.revision();
    timeline.applySnapshot(lookup('IN_TRANSIT', [created, pickedUp, inTransit]));
    expect(timeline.revision()).toBe(revision + 1);
  });
});
