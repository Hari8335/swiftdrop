import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import * as L from 'leaflet';
import { CourierLocation, NavigationHeading } from './tracking.model';
import { NavigationRoute } from './routing.service';

@Component({
  selector: 'app-tracking-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="rounded-3xl border border-[#eee7e0] bg-white p-4 sm:p-6 shadow-sm" aria-label="Parcel map">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div><h2 class="text-lg font-black text-[#1d1b2c]">Parcel route</h2><p class="text-xs text-[#6f6d85]">{{ route ? 'Approved road route' : (navigation ? 'Road route unavailable' : 'Direct connection (not a driving route)') }}</p></div>
        <span class="text-xs font-bold" [class.text-emerald-700]="location" [class.text-[#6f6d85]]="!location">{{ location ? ('Courier updated ' + (location.recordedAt | date:'shortTime')) : locationLabel }}</span>
      </div>
      <div class="relative h-[22rem] sm:h-[28rem] overflow-hidden rounded-2xl bg-[#faf8f6]"><div #map class="h-full w-full" role="img" aria-label="Parcel pickup, destination, and courier map"></div><div *ngIf="!hasMapPoints" class="absolute inset-0 flex items-center justify-center bg-[#faf8f6]/90 p-6 text-center text-sm font-semibold text-[#6f6d85]">Verified parcel coordinates are not available for this parcel.</div></div>
      <p *ngIf="location && location.accuracyMeters > 100" class="mt-3 text-xs font-semibold text-amber-700">GPS accuracy is low ({{ location.accuracyMeters | number:'1.0-0' }} m); the marker may be approximate.</p>
      <p *ngIf="!location && authorized" class="mt-3 text-xs font-semibold text-[#6f6d85]">Live courier location is unavailable or requires the courier to share GPS.</p>
      <p *ngIf="navigation && !route" class="mt-3 text-xs font-semibold text-amber-700">No approved routing provider is configured. Use the validated external navigation link for turn-by-turn directions.</p>
      <div *ngIf="!hasDestinationCoordinates" class="mt-3 rounded-xl bg-[#faf8f6] p-3 text-xs text-[#6f6d85]">
        <p class="font-bold text-[#1d1b2c]">Delivery location is not pinned on the map.</p>
        <p *ngIf="destinationAddress">{{ destinationAddress }}</p>
        <a *ngIf="externalNavigationUrl" [href]="externalNavigationUrl" target="_blank" rel="noopener noreferrer" class="mt-1 inline-block font-bold text-[#a53a26] underline">Open in Google Maps</a>
      </div>
      <p *ngIf="!authorized" class="mt-3 text-xs font-semibold text-[#6f6d85]">Sign in to view precise courier location. Public tracking remains privacy-preserving.</p>
    </section>
  `,
})
export class TrackingMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('map') private mapElement?: ElementRef<HTMLElement>;
  @Input() pickup: [number, number] | null = null;
  @Input() destination: [number, number] | null = null;
  @Input() location: CourierLocation | null = null;
  @Input() authorized = false;
  @Input() navigation = false;
  @Input() route: NavigationRoute | null = null;
  @Input() heading: NavigationHeading = null;
  @Input() followLocation = false;
  @Input() destinationAddress: string | null = null;
  @Input() externalNavigationUrl: string | null = null;
  @Input() locationLabel = 'Location unavailable';
  private map?: L.Map;
  private layers: L.Layer[] = [];
  get hasMapPoints(): boolean { return this.validPoint(this.pickup) || this.validPoint(this.destination) || (this.authorized && this.validLocation()); }
  get hasDestinationCoordinates(): boolean { return this.validPoint(this.destination); }

  ngAfterViewInit(): void {
    if (!this.mapElement) return;
    this.map = L.map(this.mapElement.nativeElement);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(this.map);
    this.render();
    this.refreshSize();
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (this.map && (changes['pickup'] || changes['destination'] || changes['location'] || changes['route'] || changes['navigation'] || changes['heading'] || changes['followLocation'])) {
      this.render();
      this.refreshSize();
    }
  }
  ngOnDestroy(): void { this.map?.remove(); }
  private render(): void {
    if (!this.map) return;
    this.layers.forEach(layer => layer.remove()); this.layers = [];
    const points: L.LatLngExpression[] = [];
    if (this.validPoint(this.pickup)) { this.layers.push(this.marker(this.pickup, 'Pickup', 'pickup').addTo(this.map)); points.push(this.pickup); }
    if (this.validPoint(this.destination)) { this.layers.push(this.marker(this.destination, 'Destination', 'destination').addTo(this.map)); points.push(this.destination); }
    if (this.route && this.validRoute(this.route)) {
      this.layers.push(L.polyline(this.route.geometry, { color: '#2563eb', weight: 6, opacity: 0.9 }).addTo(this.map).bindTooltip('Approved road route'));
    } else if (!this.navigation && this.validPoint(this.pickup) && this.validPoint(this.destination)) {
      this.layers.push(L.polyline([this.pickup, this.destination], { color: '#a53a26', dashArray: '8 8', weight: 4 }).addTo(this.map).bindTooltip('Direct connection (not a driving route)'));
    }
    if (this.authorized && this.validLocation()) {
      const point: [number, number] = [this.location!.latitude, this.location!.longitude];
      this.layers.push(this.marker(point, 'Courier GPS', 'courier', this.heading).addTo(this.map));
      points.push(point);
    }
    if (this.followLocation && this.validLocation()) {
      const point: [number, number] = [this.location!.latitude, this.location!.longitude];
      if (this.map.getCenter().distanceTo(point) > 15) this.map.setView(point, Math.max(this.map.getZoom(), 16), { animate: false });
    } else if (points.length) this.map.fitBounds(L.latLngBounds(points), { padding: [24, 24] }); else this.map.setView([7.8731, 80.7718], 7);
  }

  private marker(point: [number, number], label: string, kind: 'pickup' | 'destination' | 'courier', heading: NavigationHeading = null): L.Marker {
    const rotation = kind === 'courier' && heading !== null && Number.isFinite(heading) ? ` style="transform: rotate(${heading}deg)"` : '';
    const icon = L.divIcon({
      className: `swiftdrop-map-marker swiftdrop-map-marker-${kind}`,
      html: `<span aria-hidden="true"${rotation}></span>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
    return L.marker(point, { icon }).bindPopup(label);
  }

  private validRoute(route: NavigationRoute): boolean {
    return route.geometry.length >= 2 && route.geometry.every(point => this.validPoint(point))
      && Number.isFinite(route.distanceMeters) && route.distanceMeters >= 0
      && Number.isFinite(route.durationSeconds) && route.durationSeconds >= 0;
  }

  private validPoint(point: [number, number] | null): point is [number, number] {
    return Boolean(point && Number.isFinite(point[0]) && Number.isFinite(point[1]) && point[0] >= -90 && point[0] <= 90 && point[1] >= -180 && point[1] <= 180);
  }

  private validLocation(): boolean {
    return Boolean(this.location && Number.isFinite(this.location.latitude) && Number.isFinite(this.location.longitude)
      && this.location.latitude >= -90 && this.location.latitude <= 90
      && this.location.longitude >= -180 && this.location.longitude <= 180);
  }

  private refreshSize(): void {
    setTimeout(() => this.map?.invalidateSize({ pan: false }), 0);
  }
}
