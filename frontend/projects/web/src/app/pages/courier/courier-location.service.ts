import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, catchError, tap } from 'rxjs';

export interface CourierLocationPayload { latitude: number; longitude: number; accuracyMeters: number; recordedAt: string; }

@Injectable({ providedIn: 'root' })
export class CourierLocationService {
  private readonly http = inject(HttpClient);
  private watchId: number | null = null;
  private inFlight = false;
  private lastSentAt = 0;

  start(parcelId: string, onState: (state: string) => void, onError: (message: string) => void): void {
    this.stop();
    if (!navigator.geolocation) { onError('This browser does not provide GPS location.'); return; }
    onState('Requesting GPS permission…');
    this.watchId = navigator.geolocation.watchPosition(position => {
      const now = Date.now();
      if (this.inFlight || now - this.lastSentAt < 5000) return;
      const payload: CourierLocationPayload = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy,
        recordedAt: new Date(position.timestamp).toISOString(),
      };
      if (payload.accuracyMeters < 0 || payload.accuracyMeters > 10000) { onError('GPS accuracy is outside the accepted range.'); return; }
      this.inFlight = true;
      this.http.post(`/api/v1/courier/deliveries/${encodeURIComponent(parcelId)}/location`, payload).pipe(
        tap(() => { this.lastSentAt = Date.now(); onState(`Sharing GPS (±${Math.round(payload.accuracyMeters)} m)`); }),
        catchError((error) => { onError(error?.status === 403 ? 'Location sharing stopped: this parcel is no longer assigned to you.' : 'GPS update could not be sent.'); return EMPTY; }),
      ).subscribe({ complete: () => { this.inFlight = false; } });
    }, error => {
      onError(error.code === error.PERMISSION_DENIED ? 'GPS permission was denied.' : 'GPS location is unavailable.');
      this.stop();
    }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 });
  }

  stop(): void {
    if (this.watchId !== null) navigator.geolocation?.clearWatch(this.watchId);
    this.watchId = null;
    this.inFlight = false;
  }
}
