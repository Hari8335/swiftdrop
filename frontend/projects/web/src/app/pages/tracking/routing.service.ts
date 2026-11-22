import { InjectionToken, Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';

export interface NavigationRoute {
  geometry: Array<[number, number]>;
  distanceMeters: number;
  durationSeconds: number;
}

export interface RoutingRequest {
  parcelId: string;
  origin: [number, number];
  recordedAt: string;
}

export interface RoutingProvider {
  readonly name: string;
  route(request: RoutingRequest): Observable<NavigationRoute>;
}

export class RoutingProviderUnavailableError extends Error {
  constructor() {
    super('No approved road-routing provider is configured.');
    this.name = 'RoutingProviderUnavailableError';
  }
}

/** Production-safe default until an approved provider is configured. */
export class UnconfiguredRoutingProvider implements RoutingProvider {
  readonly name = 'unconfigured';
  route(_request: RoutingRequest): Observable<NavigationRoute> {
    return throwError(() => new RoutingProviderUnavailableError());
  }
}

export const ROUTING_PROVIDER = new InjectionToken<RoutingProvider>('SWIFTDROP_ROUTING_PROVIDER', {
  providedIn: 'root',
  factory: () => new UnconfiguredRoutingProvider(),
});

@Injectable({ providedIn: 'root' })
export class RoutingService {
  private readonly provider = inject(ROUTING_PROVIDER);
  get providerName(): string { return this.provider.name; }
  route(request: RoutingRequest): Observable<NavigationRoute> { return this.provider.route(request); }
}
