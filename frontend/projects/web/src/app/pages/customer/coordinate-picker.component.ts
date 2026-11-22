import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-coordinate-picker',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="space-y-2"><div #map class="h-40 rounded-xl overflow-hidden border border-[#e8e2dc]"></div><div class="flex items-center justify-between text-[11px] text-[#6f6d85]"><span>{{ latitude != null && longitude != null ? (latitude + ', ' + longitude) : 'Select the verified point on the map' }}</span><button type="button" class="font-bold text-[#a53a26]" (click)="clear()" *ngIf="latitude != null || longitude != null">Clear</button></div></div>`,
})
export class CoordinatePickerComponent implements AfterViewInit, OnChanges {
  @ViewChild('map') private mapElement?: ElementRef<HTMLElement>;
  @Input() latitude: number | null = null;
  @Input() longitude: number | null = null;
  @Output() coordinatesChange = new EventEmitter<{ latitude: number | null; longitude: number | null }>();
  private map?: L.Map;
  private marker?: L.Marker;
  ngAfterViewInit(): void {
    if (!this.mapElement) return;
    this.map = L.map(this.mapElement.nativeElement).setView([7.8731, 80.7718], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(this.map);
    this.map.on('click', (event: L.LeafletMouseEvent) => this.setPoint(event.latlng.lat, event.latlng.lng));
    this.render();
  }
  ngOnChanges(changes: SimpleChanges): void { if (this.map && (changes['latitude'] || changes['longitude'])) this.render(); }
  clear(): void { this.coordinatesChange.emit({ latitude: null, longitude: null }); }
  private setPoint(latitude: number, longitude: number): void { this.coordinatesChange.emit({ latitude: Number(latitude.toFixed(6)), longitude: Number(longitude.toFixed(6)) }); }
  private render(): void {
    if (!this.map || this.latitude == null || this.longitude == null) return;
    this.marker?.remove(); this.marker = L.marker([this.latitude, this.longitude]).addTo(this.map); this.map.setView([this.latitude, this.longitude], 14);
  }
}
