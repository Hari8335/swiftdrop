import { Injectable, WritableSignal, computed, signal } from '@angular/core';

export type DispatchPage = 'home' | 'queue' | 'failed' | 'workload' | 'zones' | 'pricing';

const PLACEHOLDERS: Record<DispatchPage, string> = {
  home: 'Search parcels, couriers, tracking ID, address...',
  queue: 'Search unassigned tracking #, address, recipient...',
  failed: 'Search failed tracking #, reason, address...',
  workload: 'Search couriers by name, phone, zone, vehicle...',
  zones: 'Search zones by name or district...',
  pricing: 'Search pricing rules by key or type...',
};

/**
 * Shared state for the dispatcher portal shell: which page is showing, and one search query per
 * page. The top header search and any in-page search box bind to the same signal, so they stay in
 * sync, and each page keeps its own query when you switch away and back.
 */
@Injectable({ providedIn: 'root' })
export class DispatchPortalState {
  readonly page = signal<DispatchPage>('home');

  readonly queries: Record<DispatchPage, WritableSignal<string>> = {
    home: signal(''),
    queue: signal(''),
    failed: signal(''),
    workload: signal(''),
    zones: signal(''),
    pricing: signal(''),
  };

  readonly query = computed(() => this.queries[this.page()]());
  readonly placeholder = computed(() => PLACEHOLDERS[this.page()]);

  setQuery(value: string): void {
    this.queries[this.page()].set(value ?? '');
  }
}

/** Case-insensitive "any field contains the query" check used by every page's search. */
export function matchesQuery(query: string, ...fields: (string | number | null | undefined)[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => f !== null && f !== undefined && String(f).toLowerCase().includes(q));
}
