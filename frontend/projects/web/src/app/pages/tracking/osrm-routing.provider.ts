import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { NavigationRoute, RoutingProvider, RoutingRequest } from './routing.service';

interface OsrmResponse {
  code?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: { type?: string; coordinates?: unknown };
  }>;
}

/**
 * Adapter for an authenticated SwiftDrop backend proxy to a self-hosted OSRM instance.
 * It is deliberately not registered as the default provider until OSRM is approved and configured.
 */
export class OsrmRoutingProvider implements RoutingProvider {
  readonly name = 'osrm';

  constructor(private readonly http: HttpClient, private readonly proxyBaseUrl = '/api/v1/navigation') {}

  route(request: RoutingRequest): Observable<NavigationRoute> {
    const params = new HttpParams()
      .set('parcelId', request.parcelId)
      .set('origin', `${request.origin[1]},${request.origin[0]}`)
      .set('recordedAt', request.recordedAt);
    return this.http.get<OsrmResponse>(`${this.proxyBaseUrl}/route`, { params }).pipe(
      map(response => this.toRoute(response)),
      catchError(error => throwError(() => error)),
    );
  }

  private toRoute(response: OsrmResponse): NavigationRoute {
    if (response.code !== 'Ok' || !response.routes?.length) throw new Error('OSRM returned no route.');
    const first = response.routes[0];
    const coordinates = first.geometry?.type === 'LineString' && Array.isArray(first.geometry.coordinates)
      ? first.geometry.coordinates : [];
    const geometry = coordinates.map((point: unknown) => {
      if (!Array.isArray(point) || point.length < 2 || !Number.isFinite(point[0]) || !Number.isFinite(point[1])) throw new Error('OSRM returned invalid geometry.');
      const longitude = Number(point[0]);
      const latitude = Number(point[1]);
      if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) throw new Error('OSRM returned out-of-range geometry.');
      return [latitude, longitude] as [number, number];
    });
    if (geometry.length < 2 || !Number.isFinite(first.distance) || !Number.isFinite(first.duration) || first.distance! < 0 || first.duration! < 0) {
      throw new Error('OSRM returned incomplete route metadata.');
    }
    return { geometry, distanceMeters: first.distance!, durationSeconds: first.duration! };
  }
}
