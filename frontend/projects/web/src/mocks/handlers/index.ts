import { MockParcelDb, mockDb } from '../mock-db';
import { MockDispatchDb, mockDispatchDb } from '../mock-dispatch-db';
import { dispatchHandlers } from './dispatch.handlers';
import { parcelHandlers } from './parcel.handlers';
import { trackingHandlers } from './tracking.handlers';

/**
 * Builds all handlers. Add your service's handlers here (one file per contract) so every
 * member gets them with `ng serve --configuration mock`.
 */
export function createHandlers(db: MockParcelDb = mockDb, baseUrl = '', dispatchDb: MockDispatchDb = mockDispatchDb) {
  // Specific routes (e.g. /parcels/:id/history) are listed before generic ones (/parcels/:id)
  // for readability; MSW matches whole paths, so order does not change behaviour.
  return [...trackingHandlers(db, baseUrl), ...parcelHandlers(db, baseUrl), ...dispatchHandlers(dispatchDb, baseUrl)];
}

export const handlers = createHandlers();
