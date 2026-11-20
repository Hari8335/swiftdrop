import { CourierWorkloadItem, DispatchParcelSummary, Zone } from '../app/pages/dispatch/dispatch.model';

/**
 * Seed data for the dispatcher portal (contracts/openapi/operations-dispatch.yaml, M4).
 *
 * Zones on parcels and couriers are district names, matching the real backend: operations-service
 * maps pickupZone/dropoffZone from the address district, and the zone filter does a
 * case-insensitive "contains" match on pickup OR dropoff district.
 *
 * Timestamps are relative to "now" so the date filter (YYYY-MM-DD) always has data for today.
 */

/** Courier whose mock login is courier@swiftdrop.lk (MOCK_USERS.courier). */
export const MOCK_COURIER_ID = 'usr-mock-courier-1';

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

const ADDRESSES: Record<string, string[]> = {
  Colombo: ['45 Galle Road, Floor 3, Colombo 03, Colombo', '18 Duplication Road, Colombo 04, Colombo', '7 Park Street, Colombo 02, Colombo', '221 Baseline Road, Colombo 09, Colombo'],
  Gampaha: ['12 Kandy Road, Kiribathgoda, Gampaha', '88 Negombo Road, Wattala, Gampaha', '5 Station Road, Gampaha, Gampaha'],
  Kalutara: ['31 Main Street, Panadura, Kalutara', '9 Beach Road, Kalutara South, Kalutara'],
  Kandy: ['12 Temple Road, Kandy, Kandy', '64 Peradeniya Road, Kandy, Kandy', '3 Lake Drive, Katugastota, Kandy'],
  Galle: ['22 Church Street, Galle Fort, Galle', '140 Matara Road, Unawatuna, Galle'],
  Matara: ['17 Anagarika Dharmapala Mawatha, Matara, Matara'],
  Kurunegala: ['56 Colombo Road, Kurunegala, Kurunegala', '4 Puttalam Road, Kurunegala, Kurunegala'],
  Jaffna: ['10 Hospital Road, Jaffna, Jaffna'],
};

const RECIPIENTS: [string, string][] = [
  ['Nimal Perera', '+94771234501'],
  ['Kumari Fernando', '+94772345602'],
  ['Ruwan Jayasinghe', '+94713456703'],
  ['Dilani Wickramasinghe', '+94704567804'],
  ['Mohamed Rizwan', '+94755678905'],
  ['Tharushi de Silva', '+94766789006'],
  ['Arjun Selvarajah', '+94777890107'],
  ['Sanduni Herath', '+94718901208'],
];

function address(district: string, index: number): string {
  const list = ADDRESSES[district] ?? [`1 Main Street, ${district}, ${district}`];
  return list[index % list.length];
}

interface ParcelSeed {
  pickup: string;
  dropoff: string;
  weightKg: number;
  hoursAgo: number;
}

/**
 * 24 CREATED parcels (more than one page of 20, so pagination is testable), spread across
 * served zones, with a few created on previous days for the date filter.
 */
const UNASSIGNED: ParcelSeed[] = [
  { pickup: 'Colombo', dropoff: 'Colombo', weightKg: 1.2, hoursAgo: 0.2 },
  { pickup: 'Colombo', dropoff: 'Gampaha', weightKg: 2.5, hoursAgo: 0.5 },
  { pickup: 'Colombo', dropoff: 'Kandy', weightKg: 4.0, hoursAgo: 0.8 },
  { pickup: 'Gampaha', dropoff: 'Colombo', weightKg: 0.6, hoursAgo: 1.1 },
  { pickup: 'Colombo', dropoff: 'Galle', weightKg: 7.5, hoursAgo: 1.4 },
  { pickup: 'Kandy', dropoff: 'Kandy', weightKg: 3.1, hoursAgo: 1.7 },
  { pickup: 'Colombo', dropoff: 'Kalutara', weightKg: 1.8, hoursAgo: 2.0 },
  { pickup: 'Colombo', dropoff: 'Kurunegala', weightKg: 12.0, hoursAgo: 2.3 },
  { pickup: 'Gampaha', dropoff: 'Gampaha', weightKg: 0.9, hoursAgo: 2.6 },
  { pickup: 'Galle', dropoff: 'Matara', weightKg: 2.2, hoursAgo: 2.9 },
  { pickup: 'Colombo', dropoff: 'Colombo', weightKg: 5.4, hoursAgo: 3.2 },
  { pickup: 'Kandy', dropoff: 'Colombo', weightKg: 1.0, hoursAgo: 3.5 },
  { pickup: 'Colombo', dropoff: 'Gampaha', weightKg: 18.5, hoursAgo: 3.8 },
  { pickup: 'Kurunegala', dropoff: 'Kandy', weightKg: 2.7, hoursAgo: 4.1 },
  { pickup: 'Colombo', dropoff: 'Colombo', weightKg: 0.4, hoursAgo: 4.4 },
  { pickup: 'Kalutara', dropoff: 'Colombo', weightKg: 3.3, hoursAgo: 4.7 },
  { pickup: 'Colombo', dropoff: 'Galle', weightKg: 6.0, hoursAgo: 5.0 },
  { pickup: 'Gampaha', dropoff: 'Kandy', weightKg: 2.0, hoursAgo: 5.3 },
  { pickup: 'Colombo', dropoff: 'Colombo', weightKg: 1.5, hoursAgo: 5.6 },
  { pickup: 'Colombo', dropoff: 'Kurunegala', weightKg: 8.8, hoursAgo: 5.9 },
  // Older than today (date filter)
  { pickup: 'Colombo', dropoff: 'Gampaha', weightKg: 2.4, hoursAgo: 26 },
  { pickup: 'Kandy', dropoff: 'Kandy', weightKg: 1.1, hoursAgo: 28 },
  { pickup: 'Galle', dropoff: 'Colombo', weightKg: 4.6, hoursAgo: 50 },
  { pickup: 'Colombo', dropoff: 'Kalutara', weightKg: 0.7, hoursAgo: 52 },
];

interface FailedSeed extends ParcelSeed {
  attemptCount: number;
  failureReason: string;
}

/** FAILED parcels for the failed-deliveries queue / re-queue flow. */
const FAILED: FailedSeed[] = [
  { pickup: 'Colombo', dropoff: 'Colombo', weightKg: 1.4, hoursAgo: 3, attemptCount: 1, failureReason: 'RECIPIENT_ABSENT' },
  { pickup: 'Colombo', dropoff: 'Gampaha', weightKg: 2.8, hoursAgo: 6, attemptCount: 1, failureReason: 'ADDRESS_NOT_FOUND' },
  { pickup: 'Colombo', dropoff: 'Kandy', weightKg: 5.2, hoursAgo: 9, attemptCount: 2, failureReason: 'RECIPIENT_REFUSED' },
  { pickup: 'Gampaha', dropoff: 'Colombo', weightKg: 0.8, hoursAgo: 20, attemptCount: 1, failureReason: 'RECIPIENT_UNREACHABLE' },
  { pickup: 'Galle', dropoff: 'Galle', weightKg: 3.0, hoursAgo: 30, attemptCount: 3, failureReason: 'RECIPIENT_ABSENT' },
  { pickup: 'Colombo', dropoff: 'Kurunegala', weightKg: 9.5, hoursAgo: 34, attemptCount: 2, failureReason: 'DAMAGED_IN_TRANSIT' },
  { pickup: 'Kandy', dropoff: 'Kandy', weightKg: 1.9, hoursAgo: 55, attemptCount: 1, failureReason: 'WEATHER_DELAY' },
];

function trackingNumber(createdAt: string, index: number, prefix: string): string {
  const date = createdAt.slice(0, 10).replace(/-/g, '');
  return `SD-${date}-${prefix}${String(index + 1).padStart(4, '0')}`;
}

function parcelId(group: number, index: number): string {
  return `d15a7c${group}0-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
}

function toSummary(seed: ParcelSeed, index: number, group: number, prefix: string): DispatchParcelSummary {
  const createdAt = hoursAgo(seed.hoursAgo);
  const [recipientName, recipientPhone] = RECIPIENTS[index % RECIPIENTS.length];
  return {
    parcelId: parcelId(group, index),
    trackingNumber: trackingNumber(createdAt, index, prefix),
    status: 'CREATED',
    pickupZone: seed.pickup,
    dropoffZone: seed.dropoff,
    pickupAddress: address(seed.pickup, index),
    dropoffAddress: address(seed.dropoff, index + 1),
    weightKg: seed.weightKg,
    attemptCount: 0,
    failureReason: null,
    createdAt,
    recipientName,
    recipientPhone,
  };
}

export function buildDispatchParcels(): DispatchParcelSummary[] {
  const unassigned = UNASSIGNED.map((seed, i) => toSummary(seed, i, 1, 'Q'));
  const failed = FAILED.map((seed, i) => ({
    ...toSummary(seed, i, 2, 'F'),
    status: 'FAILED',
    attemptCount: seed.attemptCount,
    failureReason: seed.failureReason,
  }));
  return [...unassigned, ...failed];
}

/**
 * Couriers covering the served zones. Includes an offline courier (assignment should be
 * rejected with 400), a courier with a heavy load, and the mock-login courier.
 */
export function buildDispatchCouriers(): CourierWorkloadItem[] {
  return [
    { courierId: MOCK_COURIER_ID, name: 'Sunil Silva', phoneNumber: '+94771110001', zone: 'Colombo', activeCount: 2, available: true, vehicleType: 'MOTORCYCLE' },
    { courierId: 'c0a1e5d2-0000-4000-8000-000000000002', name: 'Saman Perera', phoneNumber: '+94771110002', zone: 'Colombo', activeCount: 5, available: true, vehicleType: 'MOTORCYCLE' },
    { courierId: 'c0a1e5d2-0000-4000-8000-000000000003', name: 'Chaminda Bandara', phoneNumber: '+94771110003', zone: 'Colombo', activeCount: 0, available: false, vehicleType: 'VAN' },
    { courierId: 'c0a1e5d2-0000-4000-8000-000000000004', name: 'Fathima Nazeer', phoneNumber: '+94771110004', zone: 'Gampaha', activeCount: 1, available: true, vehicleType: 'THREE_WHEELER' },
    { courierId: 'c0a1e5d2-0000-4000-8000-000000000005', name: 'Kasun Rathnayake', phoneNumber: '+94771110005', zone: 'Kandy', activeCount: 3, available: true, vehicleType: 'MOTORCYCLE' },
    { courierId: 'c0a1e5d2-0000-4000-8000-000000000006', name: 'Priyantha Gunawardena', phoneNumber: '+94771110006', zone: 'Galle', activeCount: 0, available: true, vehicleType: 'VAN' },
    { courierId: 'c0a1e5d2-0000-4000-8000-000000000007', name: 'Lahiru Dissanayake', phoneNumber: '+94771110007', zone: 'Kurunegala', activeCount: 4, available: false, vehicleType: 'TRUCK' },
    { courierId: 'c0a1e5d2-0000-4000-8000-000000000008', name: 'Ishara Madushani', phoneNumber: '+94771110008', zone: 'Kalutara', activeCount: 1, available: true, vehicleType: 'BICYCLE' },
  ];
}

/** Zones for the dispatcher's zone filter dropdown (GET /api/v1/admin/zones). */
export function buildDispatchZones(): Zone[] {
  const ts = '2026-10-01T00:00:00Z';
  return [
    { id: 'a2c4e6f8-0000-4000-8000-000000000001', name: 'Western', districts: ['Colombo', 'Gampaha', 'Kalutara'], served: true, baseFeeLkr: 350, createdAt: ts, updatedAt: ts },
    { id: 'a2c4e6f8-0000-4000-8000-000000000002', name: 'Central', districts: ['Kandy', 'Matale', 'Nuwara Eliya'], served: true, baseFeeLkr: 450, createdAt: ts, updatedAt: ts },
    { id: 'a2c4e6f8-0000-4000-8000-000000000003', name: 'Southern', districts: ['Galle', 'Matara', 'Hambantota'], served: true, baseFeeLkr: 500, createdAt: ts, updatedAt: ts },
    { id: 'a2c4e6f8-0000-4000-8000-000000000004', name: 'North Western', districts: ['Kurunegala', 'Puttalam'], served: true, baseFeeLkr: 500, createdAt: ts, updatedAt: ts },
    { id: 'a2c4e6f8-0000-4000-8000-000000000005', name: 'Northern', districts: ['Jaffna', 'Kilinochchi', 'Mannar', 'Mullaitivu', 'Vavuniya'], served: false, baseFeeLkr: 750, createdAt: ts, updatedAt: ts },
  ];
}
