import { http } from 'msw';
import { MockDispatchDb } from '../mock-dispatch-db';
import { readJson, respond } from './respond';

/** Dispatcher endpoints from contracts/openapi/operations-dispatch.yaml (M4). */
export function dispatchHandlers(db: MockDispatchDb, baseUrl = '') {
  const api = `${baseUrl}/api/v1`;
  const search = (request: Request) => new URL(request.url).searchParams;
  return [
    http.get(`${api}/dispatch/parcels/failed`, ({ request }) => respond(db.listFailed(search(request)))),
    http.get(`${api}/dispatch/parcels`, ({ request }) => respond(db.listUnassigned(search(request)))),
    http.post(`${api}/dispatch/parcels/:id/requeue`, async ({ params, request }) =>
      respond(db.requeue(String(params['id']), await readJson(request))),
    ),

    http.get(`${api}/dispatch/couriers`, ({ request }) => respond(db.listCouriers(search(request)))),
    http.patch(`${api}/dispatch/couriers/:id/availability`, async ({ params, request }) =>
      respond(db.setAvailability(String(params['id']), await readJson(request))),
    ),

    http.post(`${api}/dispatch/assignments/bulk`, async ({ request }) => respond(db.bulkAssign(await readJson(request)))),
    http.post(`${api}/dispatch/assignments`, async ({ request }) =>
      respond(db.assign(await readJson(request), search(request).get('reassign') === 'true')),
    ),

    // Zone list for the dispatcher's zone filter. Zone/pricing CRUD (M5) is not mocked here.
    http.get(`${api}/admin/zones`, () => respond(db.listZones())),
  ];
}
