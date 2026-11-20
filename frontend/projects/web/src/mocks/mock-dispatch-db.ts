import {
  AssignmentResult,
  BulkAssignItemResult,
  BulkAssignResponse,
  CourierWorkloadItem,
  DispatchParcelSummary,
  FailedParcelsPage,
  RequeueResponse,
  UnassignedParcelsPage,
  Zone,
} from '../app/pages/dispatch/dispatch.model';
import { buildDispatchCouriers, buildDispatchParcels, buildDispatchZones } from './mock-dispatch-data';
import { MockResult, error } from './mock-db';

function int(value: string | null, fallback: number): number {
  const parsed = value === null ? NaN : Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

/** YYYY-MM-DD of an ISO timestamp in the browser's local time (what the date picker shows). */
function localDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * In-memory dispatch backend (contracts/openapi/operations-dispatch.yaml). Assigning removes a
 * parcel from the queue and bumps the courier's activeCount; re-queue moves a FAILED parcel back
 * to CREATED with attemptCount + 1. State lives until the page reloads.
 */
export class MockDispatchDb {
  private parcels: DispatchParcelSummary[] = [];
  private couriers: CourierWorkloadItem[] = [];
  private zones: Zone[] = [];

  constructor() {
    this.reset();
  }

  reset(): void {
    this.parcels = buildDispatchParcels();
    this.couriers = buildDispatchCouriers();
    this.zones = buildDispatchZones();
  }

  // ---------------------------------------------------------------- queues

  listUnassigned(params: URLSearchParams): MockResult<UnassignedParcelsPage> {
    return this.page(
      this.parcels.filter((p) => p.status === 'CREATED' && !p.assignedCourierId),
      params,
      (a, b) => a.createdAt.localeCompare(b.createdAt),
    );
  }

  listFailed(params: URLSearchParams): MockResult<FailedParcelsPage> {
    return this.page(
      this.parcels.filter((p) => p.status === 'FAILED'),
      params,
      (a, b) => b.createdAt.localeCompare(a.createdAt),
    );
  }

  private page(
    source: DispatchParcelSummary[],
    params: URLSearchParams,
    order: (a: DispatchParcelSummary, b: DispatchParcelSummary) => number,
  ): MockResult<UnassignedParcelsPage> {
    const page = Math.max(0, int(params.get('page'), 0));
    const size = Math.min(100, Math.max(1, int(params.get('size'), 20)));
    const zone = params.get('zone')?.trim().toUpperCase();
    const date = params.get('date')?.trim();

    const matches = source
      .filter((p) => !zone || p.pickupZone.toUpperCase().includes(zone) || p.dropoffZone.toUpperCase().includes(zone))
      .filter((p) => !date || localDate(p.createdAt) === date)
      .sort(order);

    return {
      status: 200,
      body: {
        content: matches.slice(page * size, page * size + size).map((p) => ({ ...p })),
        totalElements: matches.length,
        totalPages: Math.ceil(matches.length / size),
        page,
        size,
      },
    };
  }

  // ---------------------------------------------------------------- couriers

  listCouriers(params: URLSearchParams): MockResult<CourierWorkloadItem[]> {
    const zone = params.get('zone')?.trim().toUpperCase();
    const availableOnly = params.get('availableOnly') === 'true';
    const body = this.couriers
      .filter((c) => !zone || (c.zone ?? '').toUpperCase().includes(zone))
      .filter((c) => !availableOnly || c.available)
      .map((c) => ({ ...c }));
    return { status: 200, body };
  }

  setAvailability(courierId: string, body: Record<string, unknown>): MockResult<CourierWorkloadItem> {
    const courier = this.couriers.find((c) => c.courierId === courierId);
    if (!courier) {
      return error(404, 'COURIER_NOT_FOUND', 'Courier not found.') as MockResult<never>;
    }
    if (typeof body['available'] !== 'boolean') {
      return error(400, 'VALIDATION_ERROR', 'available must be a boolean.') as MockResult<never>;
    }
    courier.available = body['available'];
    return { status: 200, body: { ...courier } };
  }

  // ---------------------------------------------------------------- assignments

  assign(body: Record<string, unknown>, reassignParam = false): MockResult<AssignmentResult> {
    const parcelId = body['parcelId'];
    const courierId = body['courierId'];
    if (typeof parcelId !== 'string' || typeof courierId !== 'string' || !parcelId || !courierId) {
      return error(400, 'VALIDATION_ERROR', 'parcelId and courierId are required.') as MockResult<never>;
    }
    const outcome = this.tryAssign(parcelId, courierId, reassignParam || body['reassign'] === true);
    if (!outcome.ok) {
      return error(outcome.status, outcome.code, outcome.message) as MockResult<never>;
    }
    return { status: 200, body: outcome.result };
  }

  bulkAssign(body: Record<string, unknown>): MockResult<BulkAssignResponse> {
    const assignments = body['assignments'];
    if (!Array.isArray(assignments) || assignments.length === 0) {
      return error(400, 'VALIDATION_ERROR', 'assignments must be a non-empty array.') as MockResult<never>;
    }
    const results: BulkAssignItemResult[] = assignments.map((raw) => {
      const item = (raw ?? {}) as Record<string, unknown>;
      const parcelId = String(item['parcelId'] ?? '');
      const courierId = String(item['courierId'] ?? '');
      const outcome = this.tryAssign(parcelId, courierId, item['reassign'] === true);
      return outcome.ok
        ? { parcelId, courierId, success: true, errorCode: null, errorMessage: null }
        : { parcelId, courierId, success: false, errorCode: outcome.code, errorMessage: outcome.message };
    });
    const successfulCount = results.filter((r) => r.success).length;
    return {
      status: 200,
      body: { totalRequested: results.length, successfulCount, failedCount: results.length - successfulCount, results },
    };
  }

  private tryAssign(
    parcelId: string,
    courierId: string,
    reassign: boolean,
  ): { ok: true; result: AssignmentResult } | { ok: false; status: number; code: string; message: string } {
    const parcel = this.parcels.find((p) => p.parcelId === parcelId);
    if (!parcel) {
      return { ok: false, status: 404, code: 'PARCEL_NOT_FOUND', message: 'Parcel not found.' };
    }
    const courier = this.couriers.find((c) => c.courierId === courierId);
    if (!courier) {
      return { ok: false, status: 404, code: 'COURIER_NOT_FOUND', message: 'Courier not found.' };
    }
    if (parcel.assignedCourierId && !reassign) {
      return { ok: false, status: 409, code: 'PARCEL_ALREADY_ASSIGNED', message: 'Parcel has already been assigned to another courier.' };
    }
    if (parcel.status !== 'CREATED' && !(reassign && parcel.assignedCourierId)) {
      return { ok: false, status: 409, code: 'ILLEGAL_STATUS_TRANSITION', message: `Parcel in status ${parcel.status} cannot be assigned.` };
    }
    if (!courier.available) {
      return { ok: false, status: 400, code: 'COURIER_UNAVAILABLE', message: 'Courier is currently unavailable for assignments.' };
    }

    if (parcel.assignedCourierId) {
      const previous = this.couriers.find((c) => c.courierId === parcel.assignedCourierId);
      if (previous) previous.activeCount = Math.max(0, previous.activeCount - 1);
    }
    parcel.assignedCourierId = courierId;
    parcel.status = 'ASSIGNED';
    courier.activeCount += 1;
    return { ok: true, result: { parcelId, courierId, assignedAt: new Date().toISOString(), status: 'ASSIGNED' } };
  }

  // ---------------------------------------------------------------- re-queue

  requeue(parcelId: string, _body: Record<string, unknown>): MockResult<RequeueResponse> {
    const parcel = this.parcels.find((p) => p.parcelId === parcelId);
    if (!parcel) {
      return error(404, 'PARCEL_NOT_FOUND', 'Parcel not found.') as MockResult<never>;
    }
    if (parcel.status !== 'FAILED') {
      return error(400, 'PARCEL_NOT_FAILED', 'Only FAILED parcels can be re-queued.') as MockResult<never>;
    }
    parcel.status = 'CREATED';
    parcel.assignedCourierId = undefined;
    parcel.attemptCount = (parcel.attemptCount ?? 0) + 1;
    parcel.failureReason = null;
    return {
      status: 200,
      body: { parcelId, status: 'CREATED', attemptCount: parcel.attemptCount, requeuedAt: new Date().toISOString() },
    };
  }

  // ---------------------------------------------------------------- zones (read-only, for filters)

  listZones(): MockResult<Zone[]> {
    return { status: 200, body: this.zones.map((z) => ({ ...z, districts: [...z.districts] })) };
  }
}

export const mockDispatchDb = new MockDispatchDb();
