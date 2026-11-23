import { computed, signal } from '@angular/core';
import { ParcelStatus, PublicTrackingEvent, PublicTrackingResponse, TimelineItem } from './tracking.model';

/**
 * Timeline state of one parcel: the history loaded over REST plus live stream events.
 *
 * An event is applied only if it is for this parcel and its sequence is higher than the last
 * one applied, so replays after a reconnect and duplicates never show twice. An event that
 * repeats the current status (the state sent at connect, or a courier assignment, which also
 * moves the sequence) only advances the sequence and adds no row.
 */
export class LiveTimeline {
  private readonly _trackingNumber = signal<string | null>(null);
  private readonly _status = signal<ParcelStatus | null>(null);
  private readonly _items = signal<TimelineItem[]>([]);
  private readonly _lastUpdatedAt = signal<string | null>(null);
  private readonly _lastUpdateLive = signal(false);
  private readonly _revision = signal(0);
  private lastSequence = 0;

  readonly trackingNumber = this._trackingNumber.asReadonly();
  readonly status = this._status.asReadonly();
  readonly items = this._items.asReadonly();
  readonly lastUpdatedAt = this._lastUpdatedAt.asReadonly();
  /** True once a live event has changed the status (used for the "updated" highlight). */
  readonly lastUpdateLive = this._lastUpdateLive.asReadonly();
  readonly isEmpty = computed(() => this._items().length === 0);
  /**
   * Counts every accepted live event, including ones that keep the status (a courier
   * reassignment), so views such as the driver assignment history know when to reload.
   */
  readonly revision = this._revision.asReadonly();

  /** Starts over for a parcel with the history from the API (oldest first). */
  reset(trackingNumber: string, status: ParcelStatus, items: TimelineItem[], lastUpdatedAt: string | null): void {
    this._trackingNumber.set(trackingNumber);
    this._status.set(status);
    this._items.set([...items].sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt)));
    this._lastUpdatedAt.set(lastUpdatedAt ?? items.at(-1)?.occurredAt ?? null);
    this._lastUpdateLive.set(false);
    this.lastSequence = 0;
  }

  /** Clears everything (logout, or switching to another parcel before it has loaded). */
  clear(): void {
    this._trackingNumber.set(null);
    this._status.set(null);
    this._items.set([]);
    this._lastUpdatedAt.set(null);
    this._lastUpdateLive.set(false);
    this.lastSequence = 0;
  }

  /**
   * Merges a polled public lookup (used when the live stream is unavailable). Only entries newer
   * than the last row are added, so rows loaded with more detail (e.g. reasons) are kept.
   * @returns true when the timeline changed
   */
  applySnapshot(snapshot: PublicTrackingResponse): boolean {
    if (snapshot.trackingNumber !== this._trackingNumber()) {
      return false;
    }
    const last = this._items().at(-1);
    const lastTime = last ? Date.parse(last.occurredAt) : Number.NEGATIVE_INFINITY;
    const newer = snapshot.timeline
      .filter((entry) => Date.parse(entry.occurredAt) > lastTime)
      .sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));
    if (newer.length === 0 && snapshot.status === this._status()) {
      return false;
    }
    this._status.set(snapshot.status);
    if (newer.length > 0) {
      this._items.update((items) => [...items, ...newer.map((e) => ({ status: e.status, occurredAt: e.occurredAt }))]);
    }
    this._lastUpdatedAt.set(snapshot.lastUpdatedAt ?? newer.at(-1)?.occurredAt ?? this._lastUpdatedAt());
    this._lastUpdateLive.set(true);
    this._revision.update((n) => n + 1);
    return true;
  }

  /** @returns true when the event added a timeline row */
  apply(event: PublicTrackingEvent): boolean {
    if (event.trackingNumber !== this._trackingNumber() || event.sequence <= this.lastSequence) {
      return false;
    }
    this.lastSequence = event.sequence;
    this._revision.update((n) => n + 1);
    if (event.status === this._status()) {
      return false;
    }
    this._status.set(event.status);
    this._items.update((items) => [...items, { status: event.status, occurredAt: event.occurredAt }]);
    this._lastUpdatedAt.set(event.occurredAt);
    this._lastUpdateLive.set(true);
    return true;
  }
}
