import { CourierWorkloadItem, FailedParcelsPage, UnassignedParcelsPage } from '../app/pages/dispatch/dispatch.model';
import { MockDispatchDb } from './mock-dispatch-db';
import { MOCK_COURIER_ID } from './mock-dispatch-data';

describe('MockDispatchDb', () => {
  let db: MockDispatchDb;

  beforeEach(() => (db = new MockDispatchDb()));

  const queue = (query = '') => db.listUnassigned(new URLSearchParams(query)).body as UnassignedParcelsPage;
  const failed = (query = '') => db.listFailed(new URLSearchParams(query)).body as FailedParcelsPage;
  const couriers = (query = '') => db.listCouriers(new URLSearchParams(query)).body as CourierWorkloadItem[];
  const offlineCourier = () => couriers().find((c) => !c.available)!;

  it('seeds more than one page of unassigned parcels', () => {
    const page = queue('page=0&size=20');
    expect(page.totalElements).toBe(24);
    expect(page.totalPages).toBe(2);
    expect(page.content.length).toBe(20);
    expect(page.content.every((p) => p.status === 'CREATED')).toBe(true);
  });

  it('filters the queue by pickup or dropoff district', () => {
    const kandy = queue('zone=kandy').content;
    expect(kandy.length).toBeGreaterThan(0);
    expect(kandy.every((p) => p.pickupZone === 'Kandy' || p.dropoffZone === 'Kandy')).toBe(true);
  });

  it('assigns a parcel, removes it from the queue and bumps workload', () => {
    const parcel = queue().content[0];
    const before = couriers().find((c) => c.courierId === MOCK_COURIER_ID)!.activeCount;

    const result = db.assign({ parcelId: parcel.parcelId, courierId: MOCK_COURIER_ID });
    expect(result.status).toBe(200);
    expect(queue().totalElements).toBe(23);
    expect(couriers().find((c) => c.courierId === MOCK_COURIER_ID)!.activeCount).toBe(before + 1);

    expect(db.assign({ parcelId: parcel.parcelId, courierId: MOCK_COURIER_ID }).status).toBe(409);
  });

  it('rejects assignment to an unavailable courier with 400', () => {
    const parcel = queue().content[0];
    const result = db.assign({ parcelId: parcel.parcelId, courierId: offlineCourier().courierId });
    expect(result.status).toBe(400);
  });

  it('reports per-item results for bulk assignment', () => {
    const [a, b] = queue().content;
    const response = db.bulkAssign({
      assignments: [
        { parcelId: a.parcelId, courierId: MOCK_COURIER_ID },
        { parcelId: b.parcelId, courierId: offlineCourier().courierId },
      ],
    }).body!;
    expect(response.successfulCount).toBe(1);
    expect(response.failedCount).toBe(1);
    expect(response.results[1].errorCode).toBe('COURIER_UNAVAILABLE');
  });

  it('re-queues a FAILED parcel back to CREATED with attemptCount + 1', () => {
    const parcel = failed().content[0];
    const result = db.requeue(parcel.parcelId, {});
    expect(result.status).toBe(200);
    expect(result.body!.attemptCount).toBe((parcel.attemptCount ?? 0) + 1);
    expect(failed().totalElements).toBe(6);
    expect(queue().totalElements).toBe(25);

    expect(db.requeue(parcel.parcelId, {}).status).toBe(400);
  });

  it('toggles courier availability', () => {
    const courier = offlineCourier();
    expect(db.setAvailability(courier.courierId, { available: true }).body!.available).toBe(true);
    expect(db.setAvailability('missing', { available: true }).status).toBe(404);
    expect(couriers('availableOnly=true').some((c) => c.courierId === courier.courierId)).toBe(true);
  });
});
