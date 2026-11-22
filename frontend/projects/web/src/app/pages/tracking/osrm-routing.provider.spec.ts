import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { OsrmRoutingProvider } from './osrm-routing.provider';

describe('OsrmRoutingProvider', () => {
  let http: HttpTestingController;
  let provider: OsrmRoutingProvider;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    provider = new OsrmRoutingProvider(TestBed.inject(HttpClient));
  });

  afterEach(() => http.verify());

  it('converts OSRM GeoJSON [longitude, latitude] into Leaflet [latitude, longitude]', async () => {
    const promise = firstValueFrom(provider.route({ parcelId: 'p-1', origin: [6.9271, 79.8612], recordedAt: '2026-11-22T10:00:00Z' }));
    const request = http.expectOne(req => req.url === '/api/v1/navigation/route'
      && req.params.get('parcelId') === 'p-1'
      && req.params.get('origin') === '79.8612,6.9271');
    request.flush({ code: 'Ok', routes: [{ distance: 2400, duration: 420, geometry: { type: 'LineString', coordinates: [[79.8612, 6.9271], [79.8737, 6.9147]] } }] });
    await expect(promise).resolves.toEqual({ geometry: [[6.9271, 79.8612], [6.9147, 79.8737]], distanceMeters: 2400, durationSeconds: 420 });
  });

  it('rejects invalid geometry and no-route responses', async () => {
    const promise = firstValueFrom(provider.route({ parcelId: 'p-1', origin: [6.9271, 79.8612], recordedAt: '2026-11-22T10:00:00Z' }));
    http.expectOne(req => req.url === '/api/v1/navigation/route'
      && req.params.get('parcelId') === 'p-1'
      && req.params.get('origin') === '79.8612,6.9271').flush({ code: 'NoRoute', routes: [] });
    await expect(promise).rejects.toThrow('OSRM returned no route.');
  });
});
