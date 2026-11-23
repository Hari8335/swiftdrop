import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { EMPTY, Observable, Subscription, catchError, exhaustMap, timer } from 'rxjs';
import { TrackingApiService } from './tracking-api.service';
import { PARCEL_STATUSES, PublicTrackingEvent, PublicTrackingResponse, TERMINAL_STATUSES } from './tracking.model';

/**
 * Connection state shown by the live indicator. `polling` means the live stream could not be
 * opened, so the parcel is re-read every {@link TrackingStreamService.POLL_MS} instead.
 */
export type StreamState = 'connecting' | 'live' | 'reconnecting' | 'polling' | 'disconnected' | 'ended';

export type StreamMessage =
  | { type: 'state'; state: StreamState }
  | { type: 'event'; event: PublicTrackingEvent }
  | { type: 'snapshot'; snapshot: PublicTrackingResponse };

/** Minimal part of EventSource used here; replaced by a fake in unit tests. */
export interface EventSourceLike {
  readonly readyState: number;
  onopen: ((event: Event) => unknown) | null;
  onerror: ((event: Event) => unknown) | null;
  addEventListener(type: string, listener: (event: MessageEvent<string>) => void): void;
  close(): void;
}

export const EVENT_SOURCE_FACTORY = new InjectionToken<(url: string) => EventSourceLike>('EVENT_SOURCE_FACTORY', {
  providedIn: 'root',
  factory: () => (url: string) => new EventSource(url),
});

/** EventSource.readyState values. */
const CONNECTING = 0;
const CLOSED = 2;

/**
 * Public live tracking stream (parcel-read.yaml `/api/v1/tracking/{trackingNo}/stream`).
 *
 * - One EventSource per subscription; unsubscribing closes it, so leaving the page, switching
 *   parcels or logging out never leaves a connection or a reconnect loop behind.
 * - The browser reconnects by itself after `retry` and sends `Last-Event-ID`; the server then
 *   replays only the missed changes.
 * - Only well-formed `status` events for the requested tracking number are passed on.
 * - After DELIVERED or CANCELLED the stream is closed here, so the browser does not reconnect
 *   to a finished parcel.
 * - When the browser gives up on the stream, the parcel is polled through the public lookup
 *   every POLL_MS (10 s) and each result is passed on as a `snapshot`, until the parcel is
 *   finished, the lookup says it no longer exists (404), or the caller unsubscribes (for
 *   example to retry the live connection).
 */
@Injectable({ providedIn: 'root' })
export class TrackingStreamService {
  /** Polling interval used when the live stream is unavailable. */
  static readonly POLL_MS = 10_000;

  private readonly createEventSource = inject(EVENT_SOURCE_FACTORY);
  private readonly api = inject(TrackingApiService);

  static url(trackingNumber: string): string {
    return `/api/v1/tracking/${encodeURIComponent(trackingNumber)}/stream`;
  }

  connect(trackingNumber: string): Observable<StreamMessage> {
    return new Observable<StreamMessage>((subscriber) => {
      const source = this.createEventSource(TrackingStreamService.url(trackingNumber));
      let finished = false;
      let polling: Subscription | null = null;
      const finish = (state: StreamState) => {
        if (!finished) {
          finished = true;
          source.close();
          polling?.unsubscribe();
          subscriber.next({ type: 'state', state });
          subscriber.complete();
        }
      };
      const startPolling = () => {
        source.close();
        subscriber.next({ type: 'state', state: 'polling' });
        polling = timer(0, TrackingStreamService.POLL_MS)
          .pipe(
            // A slow lookup is never overlapped by the next one.
            exhaustMap(() =>
              this.api.publicTracking(trackingNumber).pipe(
                catchError((error: unknown) => {
                  if (error instanceof HttpErrorResponse && error.status === 404) {
                    finish('disconnected');
                  }
                  // Other errors (network, rate limit, 5xx): keep the last view and try again next tick.
                  return EMPTY;
                }),
              ),
            ),
          )
          .subscribe((snapshot) => {
            if (finished || snapshot.trackingNumber !== trackingNumber) {
              return;
            }
            subscriber.next({ type: 'snapshot', snapshot });
            if (TERMINAL_STATUSES.includes(snapshot.status)) {
              finish('ended');
            }
          });
      };

      subscriber.next({ type: 'state', state: 'connecting' });
      source.onopen = () => subscriber.next({ type: 'state', state: 'live' });
      source.onerror = () => {
        if (finished || polling) {
          return;
        }
        if (source.readyState === CLOSED) {
          // The browser will not reconnect (e.g. the server refused the stream): poll instead.
          startPolling();
        } else if (source.readyState === CONNECTING) {
          subscriber.next({ type: 'state', state: 'reconnecting' });
        }
      };
      source.addEventListener('status', (message) => {
        const event = parseEvent(message.data, trackingNumber);
        if (!event) {
          return;
        }
        subscriber.next({ type: 'event', event });
        if (TERMINAL_STATUSES.includes(event.status)) {
          finish('ended');
        }
      });

      return () => {
        finished = true;
        source.close();
        polling?.unsubscribe();
      };
    });
  }
}

/** Parses and checks an event body; anything malformed or for another parcel is dropped. */
export function parseEvent(data: string, trackingNumber: string): PublicTrackingEvent | null {
  let value: unknown;
  try {
    value = JSON.parse(data);
  } catch {
    return null;
  }
  if (!value || typeof value !== 'object') {
    return null;
  }
  const e = value as Record<string, unknown>;
  const valid =
    e['trackingNumber'] === trackingNumber &&
    typeof e['sequence'] === 'number' &&
    Number.isInteger(e['sequence']) &&
    (e['sequence'] as number) > 0 &&
    typeof e['status'] === 'string' &&
    (PARCEL_STATUSES as readonly string[]).includes(e['status']) &&
    typeof e['occurredAt'] === 'string' &&
    !Number.isNaN(Date.parse(e['occurredAt']));
  if (!valid) {
    return null;
  }
  return {
    trackingNumber,
    sequence: e['sequence'] as number,
    status: e['status'] as PublicTrackingEvent['status'],
    occurredAt: e['occurredAt'] as string,
  };
}
