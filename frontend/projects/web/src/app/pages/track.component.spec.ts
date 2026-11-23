import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TrackComponent } from './track.component';
import { FakeEventSource, fakeEventSourceProvider, statusEvent } from './tracking/testing';
import { PublicTrackingResponse } from './tracking/tracking.model';
import { AuthService } from 'shared-auth';
import { of } from 'rxjs';
import { CustomerService } from './customer/customer.service';

const TN = 'SD-20261104-A1B2C3';
const OTHER = 'SD-20261104-Z9Y8X7';

function lookup(trackingNumber: string, status: PublicTrackingResponse['status'] = 'PICKED_UP'): PublicTrackingResponse {
  return {
    trackingNumber,
    status,
    recipientNameMasked: 'S*** S***',
    dropoffDistrict: 'Kandy',
    lastUpdatedAt: '2026-11-04T09:00:00Z',
    timeline: [
      { status: 'CREATED', occurredAt: '2026-11-04T08:00:00Z' },
      { status, occurredAt: '2026-11-04T09:00:00Z' },
    ],
  };
}

describe('TrackComponent (public tracking page)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;

  beforeEach(async () => {
    FakeEventSource.reset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'track', component: TrackComponent },
          { path: 'track/:trackingNo', component: TrackComponent },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        fakeEventSourceProvider,
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  const el = () => harness.routeNativeElement as HTMLElement;
  const text = (testId: string) => el().querySelector(`[data-testid="${testId}"]`)?.textContent?.trim();
  const rows = () => Array.from(el().querySelectorAll('app-tracking-timeline li'));
  const doneRows = () => rows().filter((li) => li.getAttribute('data-state') !== 'pending');
  const indicator = () => el().querySelector('app-live-indicator [data-state]')?.getAttribute('data-state');

  async function open(trackingNumber: string, response: PublicTrackingResponse = lookup(trackingNumber)) {
    await harness.navigateByUrl(`/track/${trackingNumber}`);
    expect(el().textContent).toContain('Looking up your parcel');
    http.expectOne(`/api/v1/tracking/${trackingNumber}`).flush(response);
    harness.detectChanges();
  }

  it('shows the masked lookup from the API and the timeline with the steps still to come', async () => {
    await open(TN);

    expect(text('tracking-number')).toBe(TN);
    expect(text('current-status')).toBe('Picked up');
    expect(el().textContent).toContain('S*** S***');
    expect(el().textContent).toContain('Kandy');
    expect(doneRows().map((li) => li.textContent)).toEqual([expect.stringContaining('Created'), expect.stringContaining('Picked up')]);
    expect(rows().filter((li) => li.getAttribute('data-state') === 'pending')).toHaveLength(3);
  });

  it('loads the selected courier delivery from /track navigation state', async () => {
    const router = TestBed.inject(Router);
    await router.navigate(['/track'], { state: { selectedParcelId: 'parcel-1', selectedTrackingNumber: TN } });

    const parcelRequest = http.expectOne('/api/v1/parcels/parcel-1');
    parcelRequest.flush({
      id: 'parcel-1',
      trackingNumber: TN,
      status: 'IN_TRANSIT',
      pickupAddress: { line1: 'Pickup', city: 'Colombo', district: 'Colombo', postalCode: '00100', latitude: 6.9271, longitude: 79.8612 },
      dropoffAddress: { line1: 'Dropoff', city: 'Kandy', district: 'Kandy', postalCode: '20000', latitude: 7.2906, longitude: 80.6337 },
      recipientName: 'Recipient',
      weightKg: 1,
      size: 'SMALL',
      fee: 100,
      createdAt: '2026-11-04T08:00:00Z',
      updatedAt: '2026-11-04T09:00:00Z',
    });
    http.expectOne(`/api/v1/tracking/${TN}`).flush(lookup(TN, 'IN_TRANSIT'));
    harness.detectChanges();

    expect(text('tracking-number')).toBe(TN);
    expect(text('current-status')).toBe('In transit');
  });

  it('connects the stream for this parcel and only says Live once it is open', async () => {
    await open(TN);
    expect(FakeEventSource.latest().url).toBe(`/api/v1/tracking/${TN}/stream`);
    expect(indicator()).toBe('connecting');

    FakeEventSource.latest().open();
    harness.detectChanges();
    expect(indicator()).toBe('live');
  });

  it('adds live updates without a refresh, once each, and ignores other parcels', async () => {
    await open(TN);
    const source = FakeEventSource.latest();
    source.open();
    source.emit(statusEvent(TN, 3, 'PICKED_UP')); // current state at connect
    source.emit(statusEvent(TN, 4, 'IN_TRANSIT', '2026-11-04T10:00:00Z'));
    source.emit(statusEvent(TN, 4, 'IN_TRANSIT', '2026-11-04T10:00:00Z')); // duplicate
    source.emit(statusEvent(OTHER, 9, 'DELIVERED'));
    harness.detectChanges();

    expect(text('current-status')).toBe('In transit');
    expect(doneRows()).toHaveLength(3);
    expect(doneRows()[2].textContent).toContain('In transit');
    expect(doneRows()[2].getAttribute('data-state')).toBe('current');
  });

  it('shows reconnecting and, when the browser gives up, polls and offers a new live connection', async () => {
    await open(TN);
    const first = FakeEventSource.latest();
    first.open();
    first.fail(0);
    harness.detectChanges();
    expect(indicator()).toBe('reconnecting');

    first.fail(2);
    harness.detectChanges();
    expect(indicator()).toBe('polling');
    expect(el().querySelector('app-live-indicator')?.textContent).toContain('Updating every 10 s');

    const retry = el().querySelector('app-live-indicator button') as HTMLButtonElement;
    expect(retry.textContent).toContain('Try live again');
    retry.click();
    harness.detectChanges();
    expect(FakeEventSource.instances).toHaveLength(2);
    expect(FakeEventSource.latest().url).toBe(`/api/v1/tracking/${TN}/stream`);
  });

  it('when the live stream is unavailable, shows status changes from the 10-second lookup', async () => {
    await open(TN);
    FakeEventSource.latest().fail(2);
    harness.detectChanges();

    await new Promise((resolve) => setTimeout(resolve, 0)); // first lookup is immediate
    http.expectOne(`/api/v1/tracking/${TN}`).flush({
      ...lookup(TN, 'DELIVERED'),
      lastUpdatedAt: '2026-11-04T12:00:00Z',
      timeline: [
        { status: 'CREATED', occurredAt: '2026-11-04T08:00:00Z' },
        { status: 'PICKED_UP', occurredAt: '2026-11-04T09:00:00Z' },
        { status: 'IN_TRANSIT', occurredAt: '2026-11-04T10:00:00Z' },
        { status: 'OUT_FOR_DELIVERY', occurredAt: '2026-11-04T11:00:00Z' },
        { status: 'DELIVERED', occurredAt: '2026-11-04T12:00:00Z' },
      ],
    });
    harness.detectChanges();

    expect(text('current-status')).toBe('Delivered');
    expect(doneRows()).toHaveLength(5);
    expect(indicator()).toBe('ended');
  });

  it('does not open a stream for a delivered parcel', async () => {
    await open(TN, lookup(TN, 'DELIVERED'));
    expect(FakeEventSource.instances).toHaveLength(0);
    expect(indicator()).toBe('ended');
  });

  it('switching to another parcel closes the old stream; its late events do not show', async () => {
    await open(TN);
    const first = FakeEventSource.latest();

    await open(OTHER);
    expect(first.closed).toBe(true);
    first.emit(statusEvent(TN, 9, 'DELIVERED'));
    harness.detectChanges();

    expect(text('tracking-number')).toBe(OTHER);
    expect(text('current-status')).toBe('Picked up');
    expect(FakeEventSource.latest().url).toBe(`/api/v1/tracking/${OTHER}/stream`);
  });

  it('closes the stream when the page is left', async () => {
    await open(TN);
    const source = FakeEventSource.latest();

    harness.fixture.destroy();

    expect(source.closed).toBe(true);
  });

  it('shows not found for an unknown number and an error with retry otherwise', async () => {
    await harness.navigateByUrl(`/track/${TN}`);
    http.expectOne(`/api/v1/tracking/${TN}`).flush(
      { code: 'RESOURCE_NOT_FOUND', message: 'No parcel found for this tracking number' },
      { status: 404, statusText: 'Not Found' },
    );
    harness.detectChanges();
    expect(el().textContent).toContain('Parcel not found');
    expect(FakeEventSource.instances).toHaveLength(0);

    await harness.navigateByUrl(`/track/${OTHER}`);
    http.expectOne(`/api/v1/tracking/${OTHER}`).flush(
      { code: 'TOO_MANY_REQUESTS', message: 'Too many tracking requests, please retry later' },
      { status: 429, statusText: 'Too Many Requests' },
    );
    harness.detectChanges();
    expect(el().textContent).toContain('Too many tracking requests');

    (el().querySelector('[role="alert"] button') as HTMLButtonElement).click();
    http.expectOne(`/api/v1/tracking/${OTHER}`).flush(lookup(OTHER));
    harness.detectChanges();
    expect(text('tracking-number')).toBe(OTHER);
  });

  it('shows an empty timeline message when there is no history yet', async () => {
    await open(TN, { ...lookup(TN, 'CREATED'), timeline: [] });
    expect(el().textContent).toContain('No updates yet');
  });

  // ---------------------------------------------------------------- search box

  const input = () => el().querySelector('#tracking-number-input') as HTMLInputElement;
  async function searchFor(value: string) {
    input().value = value;
    input().dispatchEvent(new Event('input'));
    (el().querySelector('[data-testid="track-search"]') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  it('/track without a number shows the search box and asks for a number, without calling the API', async () => {
    await harness.navigateByUrl('/track');

    expect(input()).not.toBeNull();
    expect(el().textContent).toContain('Enter the tracking number from your receipt or email');
    http.expectNone(() => true);
    expect(FakeEventSource.instances).toHaveLength(0);
  });

  it('a pasted number with spaces and lower case opens that parcel', async () => {
    await harness.navigateByUrl('/track');

    await searchFor('  sd-20261104-a1b2c3 ');

    expect(TestBed.inject(Router).url).toBe(`/track/${TN}`);
    http.expectOne(`/api/v1/tracking/${TN}`).flush(lookup(TN));
    harness.detectChanges();
    expect(text('tracking-number')).toBe(TN);
    expect(input().value).toBe(TN);
  });

  it('a badly formed number shows the format hint and is never sent', async () => {
    await harness.navigateByUrl('/track');

    await searchFor('12345');
    expect(el().textContent).toContain('Use the format SD-YYYYMMDD-XXXXXX');
    expect(TestBed.inject(Router).url).toBe('/track');

    await searchFor('');
    expect(el().textContent).toContain('Enter your tracking number.');
    http.expectNone(() => true);
  });

  it('a link with a badly formed number explains it without calling the API or opening a stream', async () => {
    await harness.navigateByUrl('/track/SWIFT-12345');

    expect(text('track-invalid')).toContain('That is not a tracking number');
    http.expectNone(() => true);
    expect(FakeEventSource.instances).toHaveLength(0);
  });

  it('searching another number from a parcel page switches to it and closes the old stream', async () => {
    await open(TN);
    const first = FakeEventSource.latest();
    expect(input().value).toBe(TN);

    await searchFor(OTHER);

    expect(first.closed).toBe(true);
    http.expectOne(`/api/v1/tracking/${OTHER}`).flush(lookup(OTHER));
    harness.detectChanges();
    expect(text('tracking-number')).toBe(OTHER);
  });
});

describe('TrackComponent location privacy (docs/tracking-design.md section 2)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  const PARCEL_ID = 'parcel-1';
  const ownParcel = {
    id: PARCEL_ID,
    trackingNumber: TN,
    status: 'IN_TRANSIT',
    pickupAddress: { line1: 'Pickup', city: 'Colombo', district: 'Colombo', postalCode: '00100', latitude: 6.9271, longitude: 79.8612 },
    dropoffAddress: { line1: 'Dropoff', city: 'Kandy', district: 'Kandy', postalCode: '20000', latitude: 7.2906, longitude: 80.6337 },
    recipientName: 'Recipient',
    weightKg: 1,
    size: 'SMALL',
    fee: 100,
    createdAt: '2026-11-04T08:00:00Z',
    updatedAt: '2026-11-04T09:00:00Z',
  };
  const el = () => harness.routeNativeElement as HTMLElement;
  const gpsRequests = () => http.match((r) => r.url.includes('/location/'));
  const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

  /** `role` null = signed out; `ownTrackingNumbers` = the customer's own deliveries. */
  async function setUp(role: 'CUSTOMER' | null, ownTrackingNumbers: string[] = []) {
    FakeEventSource.reset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'track', component: TrackComponent },
          { path: 'track/:trackingNo', component: TrackComponent },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        fakeEventSourceProvider,
        { provide: AuthService, useValue: { currentUser: () => (role ? { role } : null) } },
        {
          provide: CustomerService,
          useValue: {
            listParcels: () => of({
              content: ownTrackingNumbers.map((trackingNumber) => ({ id: PARCEL_ID, trackingNumber, status: 'IN_TRANSIT' })),
              totalElements: ownTrackingNumbers.length, totalPages: 1, page: 0, size: 100,
            }),
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  }

  afterEach(() => http.verify());

  it('a signed-out visitor sees no map and no exact location, and no GPS is requested', async () => {
    await setUp(null);
    await harness.navigateByUrl(`/track/${TN}`);
    http.expectOne(`/api/v1/tracking/${TN}`).flush(lookup(TN, 'IN_TRANSIT'));
    harness.detectChanges();
    await nextTick();

    expect(el().querySelector('[data-testid="public-location-note"]')).not.toBeNull();
    expect(el().querySelector('app-tracking-map')).toBeNull();
    expect(gpsRequests()).toHaveLength(0);
  });

  it('a signed-in user looking up someone else\'s parcel gets the public view and no GPS request', async () => {
    await setUp('CUSTOMER', ['SD-20261104-Z9Y8X7']);
    await harness.navigateByUrl(`/track/${TN}`);
    http.expectOne(`/api/v1/tracking/${TN}`).flush(lookup(TN, 'IN_TRANSIT'));
    harness.detectChanges();
    await nextTick();

    expect(el().querySelector('app-tracking-map')).toBeNull();
    expect(http.match((r) => r.url === `/api/v1/parcels/${PARCEL_ID}`)).toHaveLength(0);
    expect(gpsRequests()).toHaveLength(0);
  });

  it('the owner typing their own number gets the map from the authenticated parcel and live GPS', async () => {
    await setUp('CUSTOMER', [TN]);
    await harness.navigateByUrl(`/track/${TN}`);
    http.expectOne(`/api/v1/parcels/${PARCEL_ID}`).flush(ownParcel);
    http.expectOne(`/api/v1/tracking/${TN}`).flush(lookup(TN, 'IN_TRANSIT'));
    harness.detectChanges();
    await nextTick();

    expect(el().querySelector('app-tracking-map')).not.toBeNull();
    expect(el().querySelector('[data-testid="public-location-note"]')).toBeNull();
    const gps = gpsRequests();
    expect(gps.map((r) => r.request.url)).toEqual([`/api/v1/parcels/${PARCEL_ID}/location/latest`]);
    gps[0].flush({ parcelId: PARCEL_ID, latitude: 7, longitude: 80, accuracyMeters: 10, recordedAt: '2026-11-04T09:00:00Z', receivedAt: '2026-11-04T09:00:01Z' });
  });

  it('a delivery picked from the list (e.g. by a courier) uses the authenticated parcel for the map', async () => {
    await setUp(null);
    await TestBed.inject(Router).navigate(['/track'], { state: { selectedParcelId: PARCEL_ID, selectedTrackingNumber: TN } });
    http.expectOne(`/api/v1/parcels/${PARCEL_ID}`).flush(ownParcel);
    http.expectOne(`/api/v1/tracking/${TN}`).flush(lookup(TN, 'IN_TRANSIT'));
    harness.detectChanges();
    await nextTick();

    expect(el().querySelector('app-tracking-map')).not.toBeNull();
    const gps = gpsRequests();
    expect(gps.map((r) => r.request.url)).toEqual([`/api/v1/parcels/${PARCEL_ID}/location/latest`]);
    gps[0].flush(null, { status: 404, statusText: 'Not Found' });
  });
});
