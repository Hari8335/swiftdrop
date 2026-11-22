import { TrackingMapComponent } from './tracking-map.component';

describe('TrackingMapComponent', () => {
  it('recognizes verified pickup and destination points', () => {
    const component = new TrackingMapComponent();

    component.pickup = [6.9271, 79.8612];
    component.destination = [6.9147, 79.8737];

    expect(component.hasMapPoints).toBe(true);
  });

  it('does not treat invalid or missing coordinates as map points', () => {
    const component = new TrackingMapComponent();

    component.pickup = [91, 0];
    component.destination = [Number.NaN, 79.8737];

    expect(component.hasMapPoints).toBe(false);
  });

  it('keeps the map usable when only one verified endpoint exists', () => {
    const component = new TrackingMapComponent();

    component.pickup = [6.9271, 79.8612];
    component.destination = null;

    expect(component.hasMapPoints).toBe(true);
  });

  it('reports when the delivery destination is not pinned', () => {
    const component = new TrackingMapComponent();

    component.destination = null;

    expect(component.hasDestinationCoordinates).toBe(false);
    component.destination = [6.9147, 79.8737];
    expect(component.hasDestinationCoordinates).toBe(true);
  });

  it('does not render a precise courier point for an unauthorized viewer', () => {
    const component = new TrackingMapComponent();

    component.authorized = false;
    component.location = {
      parcelId: 'p-1', latitude: 6.9271, longitude: 79.8612,
      accuracyMeters: 10, recordedAt: '2026-11-22T10:00:00Z', receivedAt: '2026-11-22T10:00:01Z',
    };

    expect(component.hasMapPoints).toBe(false);
  });
});
