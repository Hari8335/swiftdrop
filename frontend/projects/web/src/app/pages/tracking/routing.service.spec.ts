import { TestBed } from '@angular/core/testing';
import { of, firstValueFrom } from 'rxjs';
import { ROUTING_PROVIDER, RoutingProvider, RoutingService, UnconfiguredRoutingProvider } from './routing.service';

describe('RoutingService', () => {
  it('fails closed when no approved provider is configured', async () => {
    await expect(firstValueFrom(new UnconfiguredRoutingProvider().route({
      parcelId: 'p-1', origin: [6.9271, 79.8612], recordedAt: '2026-11-22T10:00:00Z',
    }))).rejects.toThrow('No approved road-routing provider is configured.');
  });

  it('passes validated requests through a configured provider', async () => {
    const provider: RoutingProvider = {
      name: 'test-provider',
      route: request => of({
        geometry: [request.origin, [6.92, 79.86], [6.9147, 79.8737]],
        distanceMeters: 2400,
        durationSeconds: 420,
      }),
    };
    TestBed.configureTestingModule({ providers: [{ provide: ROUTING_PROVIDER, useValue: provider }, RoutingService] });

    const service = TestBed.inject(RoutingService);
    const route = await firstValueFrom(service.route({
      parcelId: 'p-1', origin: [6.9271, 79.8612], recordedAt: '2026-11-22T10:00:00Z',
    }));

    expect(service.providerName).toBe('test-provider');
    expect(route.geometry).toHaveLength(3);
    expect(route.distanceMeters).toBe(2400);
  });
});
