import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AssignParcelRequest,
  BulkAssignResponse,
  CourierWorkloadItem,
  DispatchParcelSummary,
  RequeueResponse,
  Zone,
} from './dispatch.model';
import { DispatchService } from './dispatch.service';
import { DispatchPortalState, matchesQuery } from './dispatch-portal.state';
import { DispatchNotificationsService } from './dispatch-notifications.service';

type DispatchTab = 'home' | 'queue' | 'workload' | 'failed';

/** Queue pages are fetched in one go (backend max page size) so zone/search filtering sees everything. */
const QUEUE_FETCH_SIZE = 100;

interface HomeResults {
  queue: DispatchParcelSummary[];
  failed: DispatchParcelSummary[];
  couriers: CourierWorkloadItem[];
}

@Component({
  selector: 'app-dispatch',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="space-y-7">

        <!-- ================================================================= -->
        <!-- TAB 0: HOME PAGE (Interactive Hero Cards & Operations Launchpad) -->
        <!-- ================================================================= -->
        <div *ngIf="activeTab() === 'home'" class="space-y-8 animate-fade-in">

          <!-- Home search results (driven by the top search bar) -->
          <div *ngIf="homeSearchQuery().trim()" id="home-search-results" class="bg-white rounded-3xl border border-[#f0ebe5] p-6 shadow-xs space-y-5">
            <div class="flex items-center justify-between gap-3 border-b border-[#f4efe9] pb-3">
              <p class="text-base font-black text-[#1d1b2c]">Search results for “{{ homeSearchQuery().trim() }}”</p>
              <span class="text-xs font-bold text-[#6f6d85]">{{ homeResultCount() }} matches</span>
            </div>

            <p *ngIf="homeResultCount() === 0" class="text-sm text-[#6f6d85]">
              No parcels or couriers match your search.
            </p>

            <div *ngIf="homeResults().queue.length" class="space-y-2">
              <h3 class="text-[11px] font-black uppercase tracking-widest text-[#a53a26]">Unassigned queue ({{ homeResults().queue.length }})</h3>
              <button
                type="button"
                *ngFor="let p of homeResults().queue.slice(0, 5)"
                (click)="openSearchResult('queue', p.trackingNumber)"
                class="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-[#faf8f6] border border-[#f0ebe5] hover:border-[#a53a26]/40 text-left cursor-pointer transition-colors"
              >
                <span class="font-mono text-xs font-black text-[#a53a26]">{{ p.trackingNumber }}</span>
                <span class="text-xs text-[#6f6d85] truncate">{{ p.pickupZone }} → {{ p.dropoffZone }}<span *ngIf="p.recipientName"> • {{ p.recipientName }}</span></span>
              </button>
            </div>

            <div *ngIf="homeResults().failed.length" class="space-y-2">
              <h3 class="text-[11px] font-black uppercase tracking-widest text-rose-600">Failed deliveries ({{ homeResults().failed.length }})</h3>
              <button
                type="button"
                *ngFor="let p of homeResults().failed.slice(0, 5)"
                (click)="openSearchResult('failed', p.trackingNumber)"
                class="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-rose-50/60 border border-rose-200/70 hover:border-rose-300 text-left cursor-pointer transition-colors"
              >
                <span class="font-mono text-xs font-black text-rose-700">{{ p.trackingNumber }}</span>
                <span class="text-xs text-[#6f6d85] truncate">{{ p.failureReason || 'Failed' }} • {{ p.dropoffZone }}</span>
              </button>
            </div>

            <div *ngIf="homeResults().couriers.length" class="space-y-2">
              <h3 class="text-[11px] font-black uppercase tracking-widest text-emerald-700">Couriers ({{ homeResults().couriers.length }})</h3>
              <button
                type="button"
                *ngFor="let c of homeResults().couriers.slice(0, 5)"
                (click)="openSearchResult('workload', c.name)"
                class="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-[#faf8f6] border border-[#f0ebe5] hover:border-emerald-300 text-left cursor-pointer transition-colors"
              >
                <span class="text-xs font-bold text-[#1d1b2c]">{{ c.name }}</span>
                <span class="text-xs text-[#6f6d85] truncate">{{ c.zone || 'No zone' }} • {{ c.available ? 'Online' : 'Offline' }} • {{ c.activeCount }} active</span>
              </button>
            </div>
          </div>

          <!-- Two Hero Cards Grid (Matching Customer Portal Design) -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <!-- Hero Card 1: Active In-Queue Card with 3D Isometric Graphic -->
            <div
              class="hero-summary-card bg-white rounded-3xl p-6 sm:p-7 border border-[#eee7e0] shadow-sm flex flex-col justify-between relative overflow-hidden space-y-6"
            >
              <div class="flex items-start justify-between relative z-10">
                <div>
                  <span class="text-[10px] font-black uppercase tracking-widest text-[#a53a26] block mb-1">
                    DISPATCH QUEUE OVERVIEW
                  </span>
                  <div class="flex items-baseline">
                    <span class="text-5xl font-black text-[#1d1b2c] tracking-tight">
                      {{ dispatchService.unassignedCount() }}
                    </span>
                    <span class="text-sm font-bold text-[#6f6d85] ml-2">in queue awaiting assignment</span>
                  </div>
                  <p class="text-xs text-[#6f6d85] font-medium mt-3 max-w-xs leading-relaxed">
                    <strong class="text-[#1d1b2c]">{{ dispatchService.totalWorkloadActive() }} deliveries active</strong> across
                    <strong class="text-[#1d1b2c]">{{ dispatchService.availableCouriersCount() }} online couriers</strong>. Ready to optimize parcel dispatch routes?
                  </p>
                </div>

                <!-- 3D Isometric Parcels Graphic (Terracotta & White Cubes) -->
                <div class="relative w-28 h-28 flex-shrink-0 -mt-2 -mr-1">
                  <svg class="w-full h-full drop-shadow-md" viewBox="0 0 160 140" fill="none">
                    <g transform="translate(68, 15)">
                      <polygon points="40,0 80,20 40,40 0,20" fill="#a53a26" />
                      <polygon points="0,20 40,40 40,84 0,64" fill="#7e2615" />
                      <polygon points="40,40 80,20 80,64 40,84" fill="#5c1b0f" />
                    </g>
                    <g transform="translate(15, 45)">
                      <polygon points="34,0 68,17 34,34 0,17" fill="#ffffff" stroke="#eee7e0" stroke-width="0.5" />
                      <polygon points="0,17 34,34 34,72 0,55" fill="#f8f6f4" stroke="#eee7e0" stroke-width="0.5" />
                      <polygon points="34,34 68,17 68,55 34,72" fill="#e8e2dc" stroke="#eee7e0" stroke-width="0.5" />
                    </g>
                  </svg>
                </div>
              </div>

              <!-- Quick Launch Buttons in Hero Card 1 -->
              <div class="flex flex-wrap items-center gap-3 pt-2 relative z-10">
                <button
                  type="button"
                  id="home-review-queue-btn"
                  (click)="setTab('queue')"
                  class="px-5 py-2.5 rounded-full bg-[#a53a26] hover:bg-[#7e2615] text-white font-bold text-xs transition-all shadow-sm hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <span>Review Queue ({{ dispatchService.unassignedCount() }})</span>
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>
                </button>
                <button
                  type="button"
                  id="home-courier-workloads-btn"
                  (click)="setTab('workload')"
                  class="px-5 py-2.5 rounded-full border border-[#a53a26] text-[#a53a26] hover:bg-[#faf6f0] font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <span>Courier Workloads</span>
                </button>
              </div>
            </div>

            <!-- Hero Card 2: Operations Monitor (Terracotta Card #a53a26) -->
            <div
              class="hero-track-card bg-[#a53a26] rounded-3xl p-6 sm:p-7 text-white shadow-md shadow-[#a53a26]/20 flex flex-col justify-between space-y-6"
            >
              <div>
                <span class="text-[10px] font-black uppercase tracking-widest text-white/70 block mb-1">
                  OPERATIONS MONITOR
                </span>
                <h3 class="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug max-w-sm">
                  Live Fleet Status & Failed Queue
                </h3>
                <p class="text-xs text-white/80 mt-1">
                  Real-time courier load balancing, bulk batch assignments, and re-queuing failed deliveries.
                </p>
              </div>

              <!-- Fleet & Failed Delivery Metrics (3 Interactive Buttons) -->
              <div class="grid grid-cols-3 gap-2.5 pt-1">
                <button
                  type="button"
                  id="home-online-couriers-btn"
                  (click)="setTab('workload')"
                  class="bg-white/10 hover:bg-white/20 active:scale-95 transition-all rounded-2xl p-3 text-center border border-white/10 cursor-pointer group"
                  title="View Online Couriers"
                >
                  <p class="text-[10px] font-bold uppercase tracking-wider text-white/70 group-hover:text-white transition-colors">
                    Online Couriers
                  </p>
                  <p class="text-xl font-black text-white mt-0.5">
                    {{ dispatchService.availableCouriersCount() }}/{{ dispatchService.couriers().length }}
                  </p>
                </button>
                <button
                  type="button"
                  id="home-active-load-btn"
                  (click)="setTab('workload')"
                  class="bg-white/10 hover:bg-white/20 active:scale-95 transition-all rounded-2xl p-3 text-center border border-white/10 cursor-pointer group"
                  title="View Active Deliveries"
                >
                  <p class="text-[10px] font-bold uppercase tracking-wider text-white/70 group-hover:text-white transition-colors">
                    Active Load
                  </p>
                  <p class="text-xl font-black text-white mt-0.5">
                    {{ dispatchService.totalWorkloadActive() }}
                  </p>
                </button>
                <button
                  type="button"
                  id="home-failed-parcels-btn"
                  (click)="setTab('failed')"
                  class="bg-white/10 hover:bg-white/20 active:scale-95 transition-all rounded-2xl p-3 text-center border border-white/10 cursor-pointer group"
                  title="View Failed Deliveries"
                >
                  <p class="text-[10px] font-bold uppercase tracking-wider text-white/70 group-hover:text-white transition-colors">
                    Failed Parcels
                  </p>
                  <p class="text-xl font-black text-white mt-0.5">
                    {{ dispatchService.totalFailedCount() }}
                  </p>
                </button>
              </div>
            </div>
          </div>

          <!-- Regional Logistics & Pricing Configuration (Space-Efficient 2-Box Row) -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            <!-- Delivery Zones Box -->
            <a
              routerLink="/dispatch/zones"
              id="home-delivery-zones-btn"
              class="bg-white rounded-3xl p-6 border border-[#eee7e0] shadow-xs hover:border-[#a53a26]/40 hover:shadow-md transition-all cursor-pointer group flex items-center justify-between gap-4 no-underline"
              title="Configure Delivery Zones"
            >
              <div class="flex items-center gap-4 min-w-0">
                <div class="w-12 h-12 rounded-2xl bg-[#faf8f6] border border-[#f0ebe5] flex items-center justify-center text-[#a53a26] group-hover:scale-105 transition-transform shrink-0">
                  <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <h3 class="text-base font-black text-[#1d1b2c] group-hover:text-[#a53a26] transition-colors truncate">
                      Delivery Zones
                    </h3>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#faf8f6] text-[#a53a26] border border-[#f0ebe5]">
                      Coverage Areas
                    </span>
                  </div>
                  <p class="text-xs text-[#6f6d85] font-medium mt-0.5 truncate">
                    Configure municipal coverage boundaries and regional base fees
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#faf8f6] group-hover:bg-[#a53a26] text-[#a53a26] group-hover:text-white border border-[#f0ebe5] group-hover:border-[#a53a26] text-xs font-bold transition-all shrink-0">
                <span>Configure</span>
                <span class="group-hover:translate-x-0.5 transition-transform"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg></span>
              </div>
            </a>

            <!-- Pricing Rules Box -->
            <a
              routerLink="/dispatch/pricing"
              id="home-pricing-rules-btn"
              class="bg-white rounded-3xl p-6 border border-[#eee7e0] shadow-xs hover:border-[#a53a26]/40 hover:shadow-md transition-all cursor-pointer group flex items-center justify-between gap-4 no-underline"
              title="Configure Pricing Rules"
            >
              <div class="flex items-center gap-4 min-w-0">
                <div class="w-12 h-12 rounded-2xl bg-[#faf8f6] border border-[#f0ebe5] flex items-center justify-center text-[#a53a26] group-hover:scale-105 transition-transform shrink-0">
                  <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <h3 class="text-base font-black text-[#1d1b2c] group-hover:text-[#a53a26] transition-colors truncate">
                      Pricing Rules
                    </h3>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#faf8f6] text-[#a53a26] border border-[#f0ebe5]">
                      Tariff Models
                    </span>
                  </div>
                  <p class="text-xs text-[#6f6d85] font-medium mt-0.5 truncate">
                    Configure weight brackets, size surcharges, and rate tiers
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#faf8f6] group-hover:bg-[#a53a26] text-[#a53a26] group-hover:text-white border border-[#f0ebe5] group-hover:border-[#a53a26] text-xs font-bold transition-all shrink-0">
                <span>Configure</span>
                <span class="group-hover:translate-x-0.5 transition-transform"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg></span>
              </div>
            </a>
          </div>
        </div>

        <!-- ================================================================= -->
        <!-- TAB 1: UNASSIGNED QUEUE -->
        <!-- ================================================================= -->
        <div *ngIf="activeTab() === 'queue'" class="space-y-7 animate-fade-in">

          <!-- Queue Operations Data Card -->
          <div class="bg-white rounded-3xl border border-[#f0ebe5] p-6 sm:p-8 shadow-xs space-y-6">
            <!-- Header Row with Tools -->
            <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-[#f4efe9] pb-5">
              <p id="queue-summary" class="text-sm font-bold text-[#1d1b2c]">{{ filteredParcels().length }} <span class="font-medium text-[#6f6d85]">{{ filteredParcels().length === 1 ? 'parcel awaiting assignment' : 'parcels awaiting assignment' }}</span></p>

              <!-- Queue tools: search + zone + select all + refresh -->
              <div class="flex flex-wrap items-center gap-2.5 lg:justify-end">
                <div class="relative w-full sm:w-60">
                  <svg class="w-4 h-4 text-[#a09eaf] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input
                    type="search"
                    id="queue-search-input"
                    [ngModel]="searchQuery()"
                    (ngModelChange)="searchQuery.set($event)"
                    placeholder="Search tracking #, address, recipient..."
                    aria-label="Search tracking #, address, recipient..."
                    class="w-full pl-10 pr-4 h-10 rounded-full border border-[#e8e2dc] bg-[#faf8f6] text-xs font-semibold text-[#1d1b2c] focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] transition-colors"
                  />
                </div>

                <div class="relative w-full sm:w-56">
                  <select
                    id="queue-zone-filter"
                    [ngModel]="selectedZone()"
                    (ngModelChange)="onQueueZoneChange($event)"
                    aria-label="Filter by delivery zone"
                    class="w-full appearance-none pl-4 pr-10 truncate cursor-pointer h-10 rounded-full border border-[#e8e2dc] bg-[#faf8f6] text-xs font-semibold text-[#1d1b2c] focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] transition-colors"
                  >
                    <option value="">All Delivery Zones</option>
                    <option *ngFor="let z of availableZones()" [value]="z.name">
                      {{ z.name }}{{ z.districts.length ? ' (' + z.districts.join(', ') + ')' : '' }}
                    </option>
                  </select>
                  <svg class="w-4 h-4 text-[#6f6d85] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>

                <label class="inline-flex items-center gap-2 px-4 cursor-pointer hover:bg-[#f3eee9] h-10 rounded-full border border-[#e8e2dc] bg-[#faf8f6] text-xs font-semibold text-[#1d1b2c] focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] transition-colors">
                  <input
                    type="checkbox"
                    id="select-all-queue-checkbox"
                    [checked]="isAllSelected()"
                    (change)="toggleSelectAll()"
                    class="rounded text-[#a53a26] focus:ring-[#a53a26]"
                  />
                  <span>Select All</span>
                </label>

                <button
                  type="button"
                  id="refresh-queue-btn"
                  (click)="retryLoadQueue()"
                  class="inline-flex items-center justify-center gap-2 px-4 text-[#6f6d85] hover:text-[#a53a26] hover:bg-[#f3eee9] cursor-pointer h-10 rounded-full border border-[#e8e2dc] bg-[#faf8f6] text-xs font-semibold text-[#1d1b2c] focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] transition-colors"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                  </svg>
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            <!-- Bulk Assign Action Bar -->
            <div *ngIf="selectedParcelIds().size > 0" class="bg-[#fff8f5] border border-[#fcd9cf] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
              <div class="flex items-center gap-3">
                <span class="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-[#a53a26] text-white font-black text-sm shadow-sm">
                  {{ selectedParcelIds().size }}
                </span>
                <div>
                  <p class="text-sm font-bold text-[#1d1b2c]">{{ selectedParcelIds().size }} Parcel(s) Selected for Bulk Assignment</p>
                  <p class="text-xs text-[#a53a26] font-medium">Assign all selected parcels to a single courier simultaneously</p>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-2.5">
                <select
                  id="bulk-courier-select"
                  [ngModel]="bulkCourierId()"
                  (ngModelChange)="bulkCourierId.set($event)"
                  class="px-3 py-1.5 rounded-xl border border-[#fcd9cf] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#a53a26] bg-white text-[#1d1b2c]"
                >
                  <option value="">Select Target Courier...</option>
                  <option *ngFor="let c of dispatchService.availableCouriers()" [value]="c.courierId">
                    {{ c.name }} ({{ c.activeCount }} active) • {{ c.zone }}
                  </option>
                </select>

                <button
                  type="button"
                  id="submit-bulk-assign-btn"
                  [disabled]="!bulkCourierId() || isSubmittingBulk()"
                  (click)="submitBulkAssign()"
                  class="px-4 py-1.5 rounded-xl bg-[#a53a26] hover:bg-[#8c2e1d] text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <span *ngIf="isSubmittingBulk()" class="inline-flex"><span class="inline-block w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true"></span></span>
                  <span>{{ isSubmittingBulk() ? 'Assigning...' : 'Assign Selected' }}</span>
                </button>

                <button
                  type="button"
                  id="clear-selection-btn"
                  (click)="clearSelection()"
                  class="px-3 py-1.5 rounded-xl border border-[#f0ebe5] bg-white hover:bg-[#faf8f6] text-[#6f6d85] text-xs font-semibold transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            <!-- Loading State -->
            <div *ngIf="dispatchService.isLoadingParcels()" class="bg-white rounded-2xl border border-[#f0ebe5] p-12 text-center space-y-3">
              <div class="mx-auto w-7 h-7 rounded-full border-2 border-[#e8e2dc] border-t-[#a53a26] animate-spin" aria-hidden="true"></div>
              <p class="text-sm font-semibold text-[#6f6d85]">Loading unassigned dispatch queue...</p>
            </div>

            <!-- Error State with Retry -->
            <div *ngIf="!dispatchService.isLoadingParcels() && dispatchService.parcelsError()" class="bg-white rounded-2xl border border-[#f0ebe5] p-10 text-center space-y-3">
              <p class="text-sm font-semibold text-[#6f6d85]">We couldn't load the unassigned queue.</p>
              <button
                type="button"
                id="retry-queue-btn"
                (click)="retryLoadQueue()"
                class="h-10 px-5 rounded-full border border-[#e8e2dc] bg-[#faf8f6] text-[#1d1b2c] hover:text-[#a53a26] hover:bg-[#f3eee9] text-xs font-semibold transition-colors cursor-pointer"
              >
                Try again
              </button>
            </div>

            <!-- Parcels Grid / Table -->
            <div *ngIf="!dispatchService.isLoadingParcels() && !dispatchService.parcelsError()">
              <div *ngIf="filteredParcels().length > 0; else emptyQueueTemplate" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  *ngFor="let parcel of filteredParcels()"
                  class="bg-white rounded-2xl border border-[#f0ebe5] shadow-sm p-5 hover:border-[#a53a26]/40 hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                >
                  <div>
                    <div class="flex items-center justify-between gap-2">
                      <div class="flex items-center gap-2">
                        <input
                          type="checkbox"
                          [attr.id]="'select-parcel-' + parcel.parcelId"
                          [checked]="isParcelSelected(parcel.parcelId)"
                          (change)="toggleSelectParcel(parcel.parcelId)"
                          class="rounded text-[#a53a26] focus:ring-[#a53a26] w-4 h-4 cursor-pointer"
                        />
                        <span class="font-mono text-sm font-black text-[#a53a26] bg-[#a53a26]/10 px-2.5 py-1 rounded-lg border border-[#a53a26]/20">
                          {{ parcel.trackingNumber }}
                        </span>
                      </div>
                      <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <span class="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 align-middle"></span>Unassigned
                      </span>
                    </div>

                    <!-- Pickup & Dropoff Routing -->
                    <div class="mt-4 space-y-2.5 text-xs text-[#6f6d85]">
                      <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#faf8f6] border border-[#f0ebe5] text-[11px] font-bold text-[#1d1b2c]">
                        <span>Route:</span>
                        <span class="text-[#a53a26]">{{ parcel.pickupZone }} → {{ parcel.dropoffZone }}</span>
                      </div>

                      <div class="flex items-start gap-2">
                        <span class="w-16 shrink-0 mt-0.5 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700"><span class="w-2 h-2 rounded-full bg-emerald-500"></span>Pickup</span>
                        <div>
                          <p class="font-bold text-[#1d1b2c]">{{ parcel.pickupAddress || 'Address on file' }}</p>
                          <p class="text-[11px] text-[#6f6d85]">{{ parcel.pickupZone }}</p>
                        </div>
                      </div>
                      <div class="flex items-start gap-2">
                        <span class="w-16 shrink-0 mt-0.5 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#a53a26]"><span class="w-2 h-2 rounded-full bg-[#a53a26]"></span>Drop-off</span>
                        <div>
                          <p class="font-bold text-[#1d1b2c]">{{ parcel.dropoffAddress || 'Address on file' }}</p>
                          <p class="text-[11px] text-[#6f6d85]">
                            {{ parcel.dropoffZone }}
                            <span *ngIf="parcel.recipientName"> • Recipient: {{ parcel.recipientName }}</span>
                            <span *ngIf="parcel.recipientPhone"> ({{ parcel.recipientPhone }})</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Footer Specs & Assign Trigger -->
                  <div class="pt-3 border-t border-[#f0ebe5] flex items-center justify-between gap-2">
                    <div class="flex items-center gap-3 text-xs text-[#6f6d85] font-medium">
                      <span *ngIf="parcel.weightKg !== undefined">{{ parcel.weightKg }} kg</span>
                      <span>•</span>
                      <span>Attempts: {{ parcel.attemptCount ?? 0 }}</span>
                    </div>

                    <button
                      type="button"
                      [attr.id]="'assign-parcel-' + parcel.parcelId + '-btn'"
                      (click)="openAssignModal(parcel)"
                      class="px-4 py-2 rounded-xl bg-[#a53a26] hover:bg-[#8c2e1d] text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Assign Courier</span>
                      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>
                    </button>
                  </div>
                </div>
              </div>

              <ng-template #emptyQueueTemplate>
                <div class="bg-white rounded-2xl border border-[#f0ebe5] p-12 text-center space-y-3">
                  <div *ngIf="searchQuery() || selectedZone()">
                    <h3 class="text-base font-bold text-[#1d1b2c]">No matching parcels found</h3>
                    <p class="text-xs text-[#6f6d85] max-w-sm mx-auto">
                      No unassigned parcels matched your current search query or zone filter. Try clearing your filters.
                    </p>
                  </div>
                  <div *ngIf="!searchQuery() && !selectedZone()">
                    <h3 class="text-base font-bold text-[#1d1b2c]">No Unassigned Parcels / All caught up!</h3>
                    <p class="text-xs text-[#6f6d85] max-w-sm mx-auto">
                      All parcels have been dispatched. There are currently no parcels in the unassigned queue awaiting courier assignment.
                    </p>
                  </div>
                </div>
              </ng-template>
            </div>
          </div>
        </div>

        <!-- ================================================================= -->
        <!-- TAB 2: COURIER WORKLOAD BOARD -->
        <!-- ================================================================= -->
        <div *ngIf="activeTab() === 'workload'" class="space-y-7 animate-fade-in">

          <!-- Workload Operations Data Card -->
          <div class="bg-white rounded-3xl border border-[#f0ebe5] p-6 sm:p-8 shadow-xs space-y-6">
            <!-- Header Row with Tools -->
            <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-[#f4efe9] pb-5">
              <p id="workload-summary" class="text-sm font-bold text-[#1d1b2c]">{{ filteredCouriers().length }} <span class="font-medium text-[#6f6d85]">{{ filteredCouriers().length === 1 ? 'courier' : 'couriers' }} · {{ dispatchService.availableCouriersCount() }} online</span></p>

              <!-- Workload tools: search + zone + online only + refresh -->
              <div class="flex flex-wrap items-center gap-2.5 lg:justify-end">
                <div class="relative w-full sm:w-60">
                  <svg class="w-4 h-4 text-[#a09eaf] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input
                    type="search"
                    id="workload-search-input"
                    [ngModel]="workloadSearchQuery()"
                    (ngModelChange)="workloadSearchQuery.set($event)"
                    placeholder="Search courier name, phone, vehicle..."
                    aria-label="Search courier name, phone, vehicle..."
                    class="w-full pl-10 pr-4 h-10 rounded-full border border-[#e8e2dc] bg-[#faf8f6] text-xs font-semibold text-[#1d1b2c] focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] transition-colors"
                  />
                </div>

                <div class="relative w-full sm:w-56">
                  <select
                    id="workload-zone-filter"
                    [ngModel]="workloadZone()"
                    (ngModelChange)="onWorkloadZoneChange($event)"
                    aria-label="Filter by delivery zone"
                    class="w-full appearance-none pl-4 pr-10 truncate cursor-pointer h-10 rounded-full border border-[#e8e2dc] bg-[#faf8f6] text-xs font-semibold text-[#1d1b2c] focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] transition-colors"
                  >
                    <option value="">All Delivery Zones</option>
                    <option *ngFor="let z of availableZones()" [value]="z.name">
                      {{ z.name }}{{ z.districts.length ? ' (' + z.districts.join(', ') + ')' : '' }}
                    </option>
                  </select>
                  <svg class="w-4 h-4 text-[#6f6d85] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>

                <label class="inline-flex items-center gap-2 px-4 cursor-pointer hover:bg-[#f3eee9] h-10 rounded-full border border-[#e8e2dc] bg-[#faf8f6] text-xs font-semibold text-[#1d1b2c] focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] transition-colors">
                  <input
                    type="checkbox"
                    id="available-only-toggle"
                    [ngModel]="availableOnly()"
                    (ngModelChange)="onAvailableOnlyChange($event)"
                    class="rounded text-[#a53a26] focus:ring-[#a53a26]"
                  />
                  <span>Online Only</span>
                </label>

                <button
                  type="button"
                  id="refresh-workload-btn"
                  (click)="retryLoadWorkload()"
                  class="inline-flex items-center justify-center gap-2 px-4 text-[#6f6d85] hover:text-[#a53a26] hover:bg-[#f3eee9] cursor-pointer h-10 rounded-full border border-[#e8e2dc] bg-[#faf8f6] text-xs font-semibold text-[#1d1b2c] focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] transition-colors"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                  </svg>
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            <!-- Workload Loading State -->
            <div *ngIf="dispatchService.isLoadingCouriers()" class="bg-[#faf8f6] rounded-2xl border border-[#f0ebe5] p-12 text-center space-y-3">
              <div class="mx-auto w-7 h-7 rounded-full border-2 border-[#e8e2dc] border-t-[#a53a26] animate-spin" aria-hidden="true"></div>
              <p class="text-sm font-semibold text-[#6f6d85]">Loading courier workload board...</p>
            </div>

            <!-- Workload Error State -->
            <div *ngIf="!dispatchService.isLoadingCouriers() && dispatchService.couriersError()" class="bg-white rounded-2xl border border-[#f0ebe5] p-10 text-center space-y-3">
              <p class="text-sm font-semibold text-[#6f6d85]">We couldn't load courier workload.</p>
              <button
                type="button"
                id="retry-workload-btn"
                (click)="retryLoadWorkload()"
                class="h-10 px-5 rounded-full border border-[#e8e2dc] bg-[#faf8f6] text-[#1d1b2c] hover:text-[#a53a26] hover:bg-[#f3eee9] text-xs font-semibold transition-colors cursor-pointer"
              >
                Try again
              </button>
            </div>

            <!-- Couriers Grid -->
            <div *ngIf="!dispatchService.isLoadingCouriers() && !dispatchService.couriersError()">
              <div *ngIf="filteredCouriers().length > 0; else emptyWorkloadTemplate" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div
                  *ngFor="let courier of filteredCouriers()"
                  class="bg-white rounded-2xl border border-[#f0ebe5] shadow-sm p-5 space-y-4 hover:border-[#a53a26]/30 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex items-center gap-3">
                        <div
                          class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base"
                          [class.bg-emerald-100]="courier.available"
                          [class.text-emerald-700]="courier.available"
                          [class.bg-[#f0ebe5]]="!courier.available"
                          [class.text-[#6f6d85]]="!courier.available"
                        >
                          {{ courierInitials(courier.name) }}
                        </div>
                        <div>
                          <h3 class="text-sm font-extrabold text-[#1d1b2c]">{{ courier.name }}</h3>
                          <p class="text-[11px] text-[#6f6d85] font-medium">{{ courier.phoneNumber || 'No phone' }}</p>
                        </div>
                      </div>

                      <span
                        class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold"
                        [class.bg-emerald-50]="courier.available"
                        [class.text-emerald-700]="courier.available"
                        [class.border]="courier.available"
                        [class.border-emerald-200]="courier.available"
                        [class.bg-[#faf8f6]]="!courier.available"
                        [class.text-[#6f6d85]]="!courier.available"
                        [class.border-[#f0ebe5]]="!courier.available"
                      >
                        <span class="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" [class.bg-emerald-500]="courier.available" [class.bg-[#a09eaf]]="!courier.available"></span>{{ courier.available ? 'Online' : 'Offline' }}
                      </span>
                    </div>

                    <!-- Zone & Vehicle Info -->
                    <div class="mt-4 pt-3 border-t border-[#f0ebe5] space-y-1 text-xs text-[#6f6d85]">
                      <p><span class="font-semibold text-[#6f6d85]/70">Zone:</span> {{ courier.zone || 'Unassigned' }}</p>
                      <p><span class="font-semibold text-[#6f6d85]/70">Vehicle:</span> {{ courier.vehicleType || 'Standard' }}</p>
                    </div>
                  </div>

                  <!-- Workload Counter Display & Toggle -->
                  <div class="pt-3 border-t border-[#f0ebe5] flex items-center justify-between gap-2">
                    <div>
                      <p class="text-[10px] uppercase font-bold text-[#6f6d85]">Active Load</p>
                      <div class="flex items-center gap-1.5 mt-0.5">
                        <span
                          class="inline-flex items-center justify-center px-2.5 py-0.5 rounded-lg text-xs font-black"
                          [class.bg-emerald-100]="courier.activeCount <= 2"
                          [class.text-emerald-800]="courier.activeCount <= 2"
                          [class.bg-amber-100]="courier.activeCount > 2 && courier.activeCount <= 4"
                          [class.text-amber-800]="courier.activeCount > 2 && courier.activeCount <= 4"
                          [class.bg-rose-100]="courier.activeCount > 4"
                          [class.text-rose-800]="courier.activeCount > 4"
                        >
                          {{ courier.activeCount }} active
                        </span>
                        <span class="text-[11px] text-[#6f6d85] font-medium">
                          {{ courier.activeCount <= 2 ? 'Light' : courier.activeCount <= 4 ? 'Moderate' : 'Heavy' }}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      [attr.id]="'toggle-courier-' + courier.courierId + '-btn'"
                      (click)="toggleCourierAvailability(courier)"
                      class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer"
                      [class.border-[#f0ebe5]]="courier.available"
                      [class.text-[#6f6d85]]="courier.available"
                      [class.hover:bg-[#faf8f6]]="courier.available"
                      [class.bg-emerald-600]="!courier.available"
                      [class.text-white]="!courier.available"
                      [class.hover:bg-emerald-700]="!courier.available"
                    >
                      {{ courier.available ? 'Set Offline' : 'Set Online' }}
                    </button>
                  </div>
                </div>
              </div>

              <ng-template #emptyWorkloadTemplate>
                <div class="bg-white rounded-2xl border border-[#f0ebe5] p-12 text-center space-y-3">
                  <h3 class="text-base font-bold text-[#1d1b2c]">No Couriers Found</h3>
                  <p class="text-xs text-[#6f6d85] max-w-sm mx-auto">
                    No couriers match your search, zone, or availability filters.
                  </p>
                </div>
              </ng-template>
            </div>
          </div>
        </div>

        <!-- ================================================================= -->
        <!-- TAB 3: FAILED DELIVERIES -->
        <!-- ================================================================= -->
        <div *ngIf="activeTab() === 'failed'" class="space-y-7 animate-fade-in">

          <!-- Failed Deliveries Operations Data Card -->
          <div class="bg-white rounded-3xl border border-[#f0ebe5] p-6 sm:p-8 shadow-xs space-y-6">
            <!-- Header Row with Tools -->
            <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-[#f4efe9] pb-5">
              <p id="failed-summary" class="text-sm font-bold text-[#1d1b2c]">{{ filteredFailedParcels().length }} <span class="font-medium text-[#6f6d85]">{{ filteredFailedParcels().length === 1 ? 'failed delivery to review' : 'failed deliveries to review' }}</span></p>

              <!-- Failed tools: search + zone + refresh -->
              <div class="flex flex-wrap items-center gap-2.5 lg:justify-end">
                <div class="relative w-full sm:w-60">
                  <svg class="w-4 h-4 text-[#a09eaf] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input
                    type="search"
                    id="failed-search-input"
                    [ngModel]="failedSearchQuery()"
                    (ngModelChange)="failedSearchQuery.set($event)"
                    placeholder="Search tracking #, reason, address..."
                    aria-label="Search tracking #, reason, address..."
                    class="w-full pl-10 pr-4 h-10 rounded-full border border-[#e8e2dc] bg-[#faf8f6] text-xs font-semibold text-[#1d1b2c] focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] transition-colors"
                  />
                </div>

                <div class="relative w-full sm:w-56">
                  <select
                    id="failed-zone-filter"
                    [ngModel]="failedSelectedZone()"
                    (ngModelChange)="onFailedZoneChange($event)"
                    aria-label="Filter by delivery zone"
                    class="w-full appearance-none pl-4 pr-10 truncate cursor-pointer h-10 rounded-full border border-[#e8e2dc] bg-[#faf8f6] text-xs font-semibold text-[#1d1b2c] focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] transition-colors"
                  >
                    <option value="">All Delivery Zones</option>
                    <option *ngFor="let z of availableZones()" [value]="z.name">
                      {{ z.name }}{{ z.districts.length ? ' (' + z.districts.join(', ') + ')' : '' }}
                    </option>
                  </select>
                  <svg class="w-4 h-4 text-[#6f6d85] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>

                <button
                  type="button"
                  id="refresh-failed-btn"
                  (click)="retryLoadFailed()"
                  class="inline-flex items-center justify-center gap-2 px-4 text-[#6f6d85] hover:text-[#a53a26] hover:bg-[#f3eee9] cursor-pointer h-10 rounded-full border border-[#e8e2dc] bg-[#faf8f6] text-xs font-semibold text-[#1d1b2c] focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] transition-colors"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                  </svg>
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            <!-- Loading State -->
            <div *ngIf="dispatchService.isLoadingFailed()" class="bg-[#faf8f6] rounded-2xl border border-[#f0ebe5] p-12 text-center space-y-3">
              <div class="mx-auto w-7 h-7 rounded-full border-2 border-[#e8e2dc] border-t-[#a53a26] animate-spin" aria-hidden="true"></div>
              <p class="text-sm font-semibold text-[#6f6d85]">Loading failed delivery parcels...</p>
            </div>

            <!-- Error State with Retry -->
            <div *ngIf="!dispatchService.isLoadingFailed() && dispatchService.failedError()" class="bg-white rounded-2xl border border-[#f0ebe5] p-10 text-center space-y-3">
              <p class="text-sm font-semibold text-[#6f6d85]">We couldn't load failed deliveries.</p>
              <button
                type="button"
                id="retry-failed-btn"
                (click)="retryLoadFailed()"
                class="h-10 px-5 rounded-full border border-[#e8e2dc] bg-[#faf8f6] text-[#1d1b2c] hover:text-[#a53a26] hover:bg-[#f3eee9] text-xs font-semibold transition-colors cursor-pointer"
              >
                Try again
              </button>
            </div>

            <!-- Failed Parcels Grid -->
            <div *ngIf="!dispatchService.isLoadingFailed() && !dispatchService.failedError()">
              <div *ngIf="filteredFailedParcels().length > 0; else emptyFailedTemplate" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  *ngFor="let parcel of filteredFailedParcels()"
                  class="bg-white rounded-2xl border border-rose-200/80 shadow-sm p-5 hover:border-rose-300 transition-all space-y-4 flex flex-col justify-between"
                >
                  <div>
                    <div class="flex items-center justify-between gap-2">
                      <span class="font-mono text-sm font-black text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                        {{ parcel.trackingNumber }}
                      </span>
                      <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        <span class="inline-block w-1.5 h-1.5 rounded-full bg-rose-600 mr-1.5 align-middle"></span>Failed
                      </span>
                    </div>

                    <!-- Failure Reason Alert Box -->
                    <div class="mt-3 p-3 rounded-xl bg-rose-50/70 border border-rose-200 text-xs text-rose-900 space-y-1">
                      <div class="flex items-center gap-1.5 font-bold">
                        <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <span>Failure reason</span>
                      </div>
                      <p class="text-rose-700 font-medium pl-[22px]">{{ readableReason(parcel.failureReason) }}</p>
                    </div>

                    <!-- Routing -->
                    <div class="mt-3 space-y-2 text-xs text-[#6f6d85]">
                      <div class="flex items-start gap-2">
                        <span class="w-16 shrink-0 mt-0.5 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700"><span class="w-2 h-2 rounded-full bg-emerald-500"></span>Pickup</span>
                        <div>
                          <p class="font-bold text-[#1d1b2c]">{{ parcel.pickupAddress || 'Address on file' }}</p>
                          <p class="text-[11px] text-[#6f6d85]">{{ parcel.pickupZone }}</p>
                        </div>
                      </div>
                      <div class="flex items-start gap-2">
                        <span class="w-16 shrink-0 mt-0.5 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#a53a26]"><span class="w-2 h-2 rounded-full bg-[#a53a26]"></span>Drop-off</span>
                        <div>
                          <p class="font-bold text-[#1d1b2c]">{{ parcel.dropoffAddress || 'Address on file' }}</p>
                          <p class="text-[11px] text-[#6f6d85]">
                            {{ parcel.dropoffZone }}
                            <span *ngIf="parcel.recipientName"> • Recipient: {{ parcel.recipientName }}</span>
                            <span *ngIf="parcel.recipientPhone"> ({{ parcel.recipientPhone }})</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Footer & Re-queue Trigger -->
                  <div class="pt-3 border-t border-[#f0ebe5] flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2 text-xs text-[#6f6d85] font-medium">
                      <span class="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-bold">
                        Attempt #{{ parcel.attemptCount ?? 1 }}
                      </span>
                      <span *ngIf="parcel.weightKg !== undefined">• {{ parcel.weightKg }} kg</span>
                    </div>

                    <button
                      type="button"
                      [attr.id]="'requeue-parcel-' + parcel.parcelId + '-btn'"
                      (click)="openRequeueModal(parcel)"
                      class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Re-queue parcel</span>
                    </button>
                  </div>
                </div>
              </div>

              <ng-template #emptyFailedTemplate>
                <div class="bg-white rounded-2xl border border-[#f0ebe5] p-12 text-center space-y-3">
                  <h3 class="text-base font-bold text-[#1d1b2c]">No Failed Deliveries</h3>
                  <p class="text-xs text-[#6f6d85] max-w-sm mx-auto">
                    There are no failed parcels requiring dispatcher attention at this time.
                  </p>
                </div>
              </ng-template>
            </div>
          </div>
        </div>



      <!-- ================================================================= -->
      <!-- MODAL: ASSIGN PARCEL DIALOG -->
      <!-- ================================================================= -->
      <div
        *ngIf="selectedParcelForAssign()"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1d1b2c]/40 backdrop-blur-sm animate-fade-in"
      >
        <div class="bg-white rounded-2xl shadow-xl border border-[#f0ebe5] w-full max-w-lg p-6 space-y-5">
          <div class="flex items-center justify-between border-b border-[#f0ebe5] pb-3">
            <div>
              <h3 class="text-base font-extrabold text-[#1d1b2c]">Assign Courier to Parcel</h3>
              <p class="text-xs text-[#a53a26] font-mono font-bold">{{ selectedParcelForAssign()?.trackingNumber }}</p>
            </div>
            <button
              type="button"
              [disabled]="isSubmittingAssignment()"
              (click)="selectedParcelForAssign.set(null)"
              class="w-8 h-8 rounded-lg flex items-center justify-center text-[#6f6d85] hover:text-[#1d1b2c] hover:bg-[#faf8f6] text-sm disabled:opacity-50 cursor-pointer"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <!-- Parcel Route Card -->
          <div class="bg-[#faf8f6] rounded-xl p-3.5 border border-[#f0ebe5] text-xs space-y-1.5 text-[#1d1b2c]">
            <p><strong>Route:</strong> {{ selectedParcelForAssign()?.pickupZone }} → {{ selectedParcelForAssign()?.dropoffZone }}</p>
            <p><strong>Dropoff Address:</strong> {{ selectedParcelForAssign()?.dropoffAddress }}</p>
            <p *ngIf="selectedParcelForAssign()?.weightKg !== undefined"><strong>Weight:</strong> {{ selectedParcelForAssign()?.weightKg }} kg</p>
          </div>

          <!-- Select Courier -->
          <div class="space-y-2">
            <label class="block text-xs font-bold text-[#1d1b2c] uppercase tracking-wider">
              Select Available Courier
            </label>
            <div class="max-h-56 overflow-y-auto space-y-2 pr-1">
              <div
                *ngFor="let courier of dispatchService.couriers()"
                (click)="courier.available && !isSubmittingAssignment() ? selectedCourierId.set(courier.courierId) : null"
                class="p-3 rounded-xl border flex items-center justify-between gap-3 transition-all"
                [class.cursor-pointer]="courier.available && !isSubmittingAssignment()"
                [class.cursor-not-allowed]="!courier.available || isSubmittingAssignment()"
                [class.opacity-50]="!courier.available"
                [class.border-[#a53a26]]="selectedCourierId() === courier.courierId"
                [class.bg-[#fff8f5]]="selectedCourierId() === courier.courierId"
                [class.border-[#f0ebe5]]="selectedCourierId() !== courier.courierId"
              >
                <div class="flex items-center gap-3">
                  <input
                    type="radio"
                    name="courierSelection"
                    [value]="courier.courierId"
                    [checked]="selectedCourierId() === courier.courierId"
                    [disabled]="!courier.available || isSubmittingAssignment()"
                    class="text-[#a53a26] focus:ring-[#a53a26]"
                  />
                  <div>
                    <p class="text-xs font-bold text-[#1d1b2c]">{{ courier.name }}</p>
                    <p class="text-[11px] text-[#6f6d85]">{{ courier.zone || 'Zone N/A' }} • {{ courier.vehicleType || 'Standard' }}</p>
                  </div>
                </div>

                <div class="text-right">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold"
                    [class.bg-emerald-100]="courier.activeCount <= 2"
                    [class.text-emerald-800]="courier.activeCount <= 2"
                    [class.bg-amber-100]="courier.activeCount > 2"
                    [class.text-amber-800]="courier.activeCount > 2"
                  >
                    {{ courier.activeCount }} active
                  </span>
                  <p class="text-[10px] text-[#6f6d85] mt-0.5">
                    <span class="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" [class.bg-emerald-500]="courier.available" [class.bg-[#a09eaf]]="!courier.available"></span>{{ courier.available ? 'Available' : 'Offline' }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Dialog Actions -->
          <div class="pt-3 border-t border-[#f0ebe5] flex items-center justify-end gap-2">
            <button
              type="button"
              [disabled]="isSubmittingAssignment()"
              (click)="selectedParcelForAssign.set(null)"
              class="px-4 py-2 rounded-xl text-xs font-semibold text-[#6f6d85] hover:bg-[#faf8f6] transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              id="confirm-assignment-btn"
              [disabled]="!selectedCourierId() || isSubmittingAssignment()"
              (click)="confirmAssignment()"
              class="px-5 py-2 rounded-xl bg-[#a53a26] hover:bg-[#8c2e1d] text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
            >
              <span *ngIf="isSubmittingAssignment()" class="inline-flex"><span class="inline-block w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true"></span></span>
              <span>{{ isSubmittingAssignment() ? 'Assigning...' : 'Confirm Assignment' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ================================================================= -->
      <!-- MODAL: BULK ASSIGN RESULTS -->
      <!-- ================================================================= -->
      <div
        *ngIf="bulkResult()"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1d1b2c]/40 backdrop-blur-sm animate-fade-in"
      >
        <div class="bg-white rounded-2xl shadow-xl border border-[#f0ebe5] w-full max-w-lg p-6 space-y-4">
          <div class="flex items-center justify-between border-b border-[#f0ebe5] pb-3">
            <h3 class="text-base font-extrabold text-[#1d1b2c]">Bulk Assignment Summary</h3>
            <button
              type="button"
              (click)="bulkResult.set(null)"
              class="w-8 h-8 rounded-lg flex items-center justify-center text-[#6f6d85] hover:text-[#1d1b2c] text-sm cursor-pointer"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div class="grid grid-cols-3 gap-3 text-center">
            <div class="p-3 rounded-xl bg-[#faf8f6] border border-[#f0ebe5]">
              <p class="text-[11px] font-bold text-[#6f6d85] uppercase">Total</p>
              <p class="text-lg font-black text-[#1d1b2c]">{{ bulkResult()?.totalRequested }}</p>
            </div>
            <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <p class="text-[11px] font-bold text-emerald-600 uppercase">Succeeded</p>
              <p class="text-lg font-black text-emerald-800">{{ bulkResult()?.successfulCount }}</p>
            </div>
            <div class="p-3 rounded-xl bg-rose-50 border border-rose-200">
              <p class="text-[11px] font-bold text-rose-600 uppercase">Failed</p>
              <p class="text-lg font-black text-rose-800">{{ bulkResult()?.failedCount }}</p>
            </div>
          </div>

          <div class="max-h-60 overflow-y-auto space-y-2 pr-1">
            <div
              *ngFor="let item of bulkResult()?.results"
              class="p-2.5 rounded-xl border text-xs flex items-center justify-between gap-3"
              [class.bg-emerald-50/50]="item.success"
              [class.border-emerald-200]="item.success"
              [class.bg-rose-50/50]="!item.success"
              [class.border-rose-200]="!item.success"
            >
              <div class="flex items-center gap-2">
                <svg *ngIf="item.success" class="w-4 h-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                <svg *ngIf="!item.success" class="w-4 h-4 text-rose-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                <div>
                  <p class="font-mono font-bold text-[#1d1b2c]">{{ item.parcelId }}</p>
                  <p *ngIf="!item.success" class="text-[11px] text-rose-600">
                    {{ item.errorMessage || item.errorCode }}
                  </p>
                </div>
              </div>
              <span
                class="px-2 py-0.5 rounded text-[11px] font-bold"
                [class.bg-emerald-100]="item.success"
                [class.text-emerald-800]="item.success"
                [class.bg-rose-100]="!item.success"
                [class.text-rose-800]="!item.success"
              >
                {{ item.success ? 'Assigned' : 'Failed' }}
              </span>
            </div>
          </div>

          <div class="pt-3 border-t border-[#f0ebe5] flex justify-end">
            <button
              type="button"
              id="close-bulk-results-btn"
              (click)="bulkResult.set(null)"
              class="px-5 py-2 rounded-xl bg-[#a53a26] hover:bg-[#8c2e1d] text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <!-- ================================================================= -->
      <!-- MODAL: RE-QUEUE PARCEL CONFIRMATION -->
      <!-- ================================================================= -->
      <div
        *ngIf="selectedParcelForRequeue()"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1d1b2c]/40 backdrop-blur-sm animate-fade-in"
      >
        <div class="bg-white rounded-2xl shadow-xl border border-[#f0ebe5] w-full max-w-lg p-6 space-y-5">
          <div class="flex items-center justify-between border-b border-[#f0ebe5] pb-3">
            <div>
              <h3 class="text-base font-extrabold text-[#1d1b2c]">Re-queue Failed Parcel</h3>
              <p class="text-xs text-[#a53a26] font-mono font-bold">{{ selectedParcelForRequeue()?.trackingNumber }}</p>
            </div>
            <button
              type="button"
              [disabled]="isSubmittingRequeue()"
              (click)="selectedParcelForRequeue.set(null)"
              class="w-8 h-8 rounded-lg flex items-center justify-center text-[#6f6d85] hover:text-[#1d1b2c] hover:bg-[#faf8f6] text-sm disabled:opacity-50 cursor-pointer"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <!-- Warning info box -->
          <div class="bg-amber-50 rounded-xl p-3.5 border border-amber-200 text-xs space-y-1.5 text-amber-900">
            <p class="font-bold flex items-center gap-1.5">
              <span>ℹ️</span>
              <span>Re-queue Confirmation</span>
            </p>
            <p>
              This action will return the parcel from <strong>FAILED</strong> to <strong>CREATED</strong> status,
              remove previous courier assignment, and increment the delivery attempt count
              (from <strong>{{ selectedParcelForRequeue()?.attemptCount ?? 1 }}</strong> to <strong>{{ (selectedParcelForRequeue()?.attemptCount ?? 1) + 1 }}</strong>).
            </p>
            <p class="text-[#6f6d85] mt-1">
              Previous Failure Reason: <em>"{{ selectedParcelForRequeue()?.failureReason || 'N/A' }}"</em>
            </p>
          </div>

          <!-- Reason Input -->
          <div class="space-y-1.5">
            <label for="requeue-reason-input" class="block text-xs font-bold text-[#1d1b2c] uppercase tracking-wider">
              Dispatcher Reason (Optional)
            </label>
            <input
              type="text"
              id="requeue-reason-input"
              [ngModel]="requeueReason()"
              (ngModelChange)="requeueReason.set($event)"
              placeholder="e.g. Customer requested redelivery tomorrow morning"
              class="w-full px-3.5 py-2.5 rounded-xl border border-[#f0ebe5] text-sm focus:outline-none focus:ring-2 focus:ring-[#a53a26] text-[#1d1b2c]"
            />
          </div>

          <!-- Actions -->
          <div class="pt-3 border-t border-[#f0ebe5] flex items-center justify-end gap-2">
            <button
              type="button"
              [disabled]="isSubmittingRequeue()"
              (click)="selectedParcelForRequeue.set(null)"
              class="px-4 py-2 rounded-xl text-xs font-semibold text-[#6f6d85] hover:bg-[#faf8f6] transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              id="confirm-requeue-btn"
              [disabled]="isSubmittingRequeue()"
              (click)="confirmRequeue()"
              class="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              <span *ngIf="isSubmittingRequeue()" class="inline-flex"><span class="inline-block w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true"></span></span>
              <span>{{ isSubmittingRequeue() ? 'Re-queueing...' : 'Confirm Re-queue' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DispatchComponent implements OnInit, OnDestroy {
  public dispatchService = inject(DispatchService);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly router = inject(Router, { optional: true });

  private readonly portal = inject(DispatchPortalState);
  private readonly alerts = inject(DispatchNotificationsService);

  public activeTab = signal<DispatchTab>('home');
  private pollIntervalId: any = null;


  // Search signals are shared with the portal's top search bar (one query per page), so the
  // header search and the in-page search box on the same page always show the same text.
  public homeSearchQuery = this.portal.queries.home;
  public searchQuery = this.portal.queries.queue;
  public failedSearchQuery = this.portal.queries.failed;
  public workloadSearchQuery = this.portal.queries.workload;

  // Zone filters
  public selectedZone = signal('');
  public workloadZone = signal('');
  public availableOnly = signal(false);
  public failedSelectedZone = signal('');
  /** Zones configured on the Delivery Zones page (GET /api/v1/admin/zones). */
  public availableZones = signal<Zone[]>([]);

  // Modals & Submitting state
  public selectedParcelForAssign = signal<DispatchParcelSummary | null>(null);
  public selectedCourierId = signal<string>('');
  public isSubmittingAssignment = signal(false);

  // Re-queue state
  public selectedParcelForRequeue = signal<DispatchParcelSummary | null>(null);
  public requeueReason = signal('');
  public isSubmittingRequeue = signal(false);

  // Bulk assignment state
  public selectedParcelIds = signal<Set<string>>(new Set());
  public bulkCourierId = signal('');
  public isSubmittingBulk = signal(false);
  public bulkResult = signal<BulkAssignResponse | null>(null);

  // Toast state
  public toastMessage = signal<string | null>(null);
  public toastType = signal<'success' | 'error'>('success');

  /** Last load error already shown as a toast, per list, so polling doesn't repeat it. */
  private readonly toastedLoadErrors: Record<string, string | null> = {};

  private readonly loadErrorToasts = effect(() => {
    this.toastLoadError('queue', "Couldn't load the unassigned queue", this.dispatchService.parcelsError?.(), this.dispatchService.isLoadingParcels?.());
    this.toastLoadError('workload', "Couldn't load courier workload", this.dispatchService.couriersError?.(), this.dispatchService.isLoadingCouriers?.());
    this.toastLoadError('failed', "Couldn't load failed deliveries", this.dispatchService.failedError?.(), this.dispatchService.isLoadingFailed?.());
  });

  private toastLoadError(key: string, title: string, error: string | null | undefined, loading: boolean | undefined): void {
    if (error) {
      if (this.toastedLoadErrors[key] !== error) {
        this.toastedLoadErrors[key] = error;
        untracked(() => this.alerts.toast('error', title, error));
      }
    } else if (!loading) {
      // A successful load: the next failure should toast again.
      this.toastedLoadErrors[key] = null;
    }
  }

  constructor() {
    this.route?.queryParamMap.subscribe((params) => {
      const tab = params.get('tab');
      if (tab === 'workload') {
        this.activeTab.set('workload');
      } else if (tab === 'failed') {
        this.activeTab.set('failed');
      } else if (tab === 'queue') {
        this.activeTab.set('queue');
      } else if (tab === 'home') {
        this.activeTab.set('home');
      } else if (tab !== null && tab !== undefined && tab !== '') {
        this.activeTab.set('queue');
      } else {
        this.activeTab.set('home');
      }
    });
  }

  public setTab(tab: DispatchTab): void {
    this.activeTab.set(tab);
    if (this.router && this.route) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { tab: tab === 'home' ? null : tab },
        queryParamsHandling: 'merge',
      });
    }
  }

  public ngOnInit(): void {
    this.loadAvailableZones();
    this.retryLoadQueue();
    this.retryLoadWorkload();
    this.retryLoadFailed();
    this.startLiveQueuePolling();
  }

  /**
   * Loads the zone dropdowns from the Delivery Zones page's data. This component is re-created
   * whenever you come back from the zones page, so newly created/edited zones show up here.
   */
  public loadAvailableZones(): void {
    this.dispatchService.listZones().subscribe({
      next: (zones) => {
        this.availableZones.set(zones ?? []);
        // A zone deleted on the zones page can no longer be a filter.
        for (const filter of [this.selectedZone, this.workloadZone, this.failedSelectedZone]) {
          if (filter() && this.availableZones().length > 0 && !this.findZone(filter())) {
            filter.set('');
          }
        }
      },
      error: () => this.availableZones.set([]),
    });
  }

  /** Configured zone with exactly this name (case-insensitive), if any. */
  public findZone(name: string): Zone | undefined {
    const n = name?.trim().toLowerCase();
    if (!n) return undefined;
    return this.availableZones().find((z) => z.name.trim().toLowerCase() === n);
  }

  /**
   * Value sent as the backend `zone` query param. The backend matches a single district, but a
   * configured zone can cover several districts, so for those we fetch everything and filter by
   * all of the zone's districts on the client instead.
   */
  public resolveBackendDistrict(zone: string): string | undefined {
    if (!zone || !zone.trim()) return undefined;
    if (this.findZone(zone)) return undefined;
    return zone.trim();
  }

  /** True when a district (parcel or courier zone) belongs to the selected zone filter. */
  public matchesZone(targetZone: string | undefined | null, filterZone: string): boolean {
    if (!filterZone || !filterZone.trim()) return true;
    if (!targetZone || !targetZone.trim()) return false;

    const target = targetZone.trim().toLowerCase();
    const filter = filterZone.trim().toLowerCase();
    if (target === filter) return true;

    const zone = this.findZone(filterZone);
    if (zone) {
      return zone.districts.some((d) => d.trim().toLowerCase() === target);
    }
    // Not a configured zone (raw district/code): same "contains" rule as the backend.
    return target.includes(filter);
  }

  /** A configured zone matches on the parcel's delivery (dropoff) district. */
  public matchesParcelZone(p: DispatchParcelSummary, filterZone: string): boolean {
    if (!filterZone || !filterZone.trim()) return true;
    if (this.findZone(filterZone)) {
      return this.matchesZone(p.dropoffZone, filterZone);
    }
    return this.matchesZone(p.dropoffZone, filterZone) || this.matchesZone(p.pickupZone, filterZone);
  }

  public ngOnDestroy(): void {
    this.stopLiveQueuePolling();
  }

  public startLiveQueuePolling(): void {
    this.stopLiveQueuePolling();
    this.pollIntervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      this.performPeriodicSync();
    }, 10000);
  }

  public stopLiveQueuePolling(): void {
    if (this.pollIntervalId !== null) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
  }

  public performPeriodicSync(): void {
    const tab = this.activeTab();
    if (tab === 'home') {
      if (!this.dispatchService.isLoadingParcels()) this.retryLoadQueue();
      if (!this.dispatchService.isLoadingCouriers()) this.retryLoadWorkload();
      if (!this.dispatchService.isLoadingFailed()) this.retryLoadFailed();
    } else if (tab === 'queue' && !this.dispatchService.isLoadingParcels()) {
      this.retryLoadQueue();
    } else if (tab === 'workload' && !this.dispatchService.isLoadingCouriers()) {
      this.retryLoadWorkload();
    } else if (tab === 'failed' && !this.dispatchService.isLoadingFailed()) {
      this.retryLoadFailed();
    }
  }

  public retryLoadQueue(): void {
    const backendZone = this.resolveBackendDistrict(this.selectedZone());
    this.dispatchService.loadUnassignedParcels(backendZone, undefined, 0, QUEUE_FETCH_SIZE).subscribe({
      error: () => {},
    });
  }

  public retryLoadWorkload(): void {
    const backendZone = this.resolveBackendDistrict(this.workloadZone());
    this.dispatchService.loadCourierWorkload(backendZone, this.availableOnly()).subscribe({
      error: () => {},
    });
  }

  public retryLoadFailed(): void {
    const backendZone = this.resolveBackendDistrict(this.failedSelectedZone());
    this.dispatchService.loadFailedParcels(backendZone, undefined, 0, QUEUE_FETCH_SIZE).subscribe({
      error: () => {},
    });
  }

  public onQueueZoneChange(zone: string): void {
    this.selectedZone.set(zone);
    this.clearSelection();
    this.retryLoadQueue();
  }

  public onWorkloadZoneChange(zone: string): void {
    this.workloadZone.set(zone);
    this.retryLoadWorkload();
  }

  public onFailedZoneChange(zone: string): void {
    this.failedSelectedZone.set(zone);
    this.retryLoadFailed();
  }

  public onAvailableOnlyChange(availableOnly: boolean): void {
    this.availableOnly.set(availableOnly);
    this.retryLoadWorkload();
  }

  private parcelMatchesSearch(p: DispatchParcelSummary, query: string): boolean {
    return matchesQuery(
      query,
      p.trackingNumber,
      p.pickupAddress,
      p.dropoffAddress,
      p.pickupZone,
      p.dropoffZone,
      p.recipientName,
      p.recipientPhone,
      p.failureReason
    );
  }

  private courierMatchesSearch(c: CourierWorkloadItem, query: string): boolean {
    return matchesQuery(query, c.name, c.phoneNumber, c.zone, c.vehicleType, c.available ? 'online' : 'offline');
  }

  public filteredParcels = computed(() => {
    const zone = this.selectedZone();
    const q = this.searchQuery();
    return this.dispatchService
      .unassignedParcels()
      .filter((p) => this.matchesParcelZone(p, zone) && this.parcelMatchesSearch(p, q));
  });

  public filteredCouriers = computed(() => {
    const zone = this.workloadZone();
    const q = this.workloadSearchQuery();
    const onlineOnly = this.availableOnly();
    return this.dispatchService
      .couriers()
      .filter((c) => this.matchesZone(c.zone, zone) && (!onlineOnly || c.available) && this.courierMatchesSearch(c, q));
  });

  public filteredFailedParcels = computed(() => {
    const zone = this.failedSelectedZone();
    const q = this.failedSearchQuery();
    return this.dispatchService
      .failedParcels()
      .filter((p) => this.matchesParcelZone(p, zone) && this.parcelMatchesSearch(p, q));
  });

  /** Home page search: looks across the queue, failed deliveries and couriers. */
  public homeResults = computed(() => {
    const q = this.homeSearchQuery();
    if (!q.trim()) return { queue: [], failed: [], couriers: [] } as HomeResults;
    return {
      queue: this.dispatchService.unassignedParcels().filter((p) => this.parcelMatchesSearch(p, q)),
      failed: this.dispatchService.failedParcels().filter((p) => this.parcelMatchesSearch(p, q)),
      couriers: this.dispatchService.couriers().filter((c) => this.courierMatchesSearch(c, q)),
    } as HomeResults;
  });

  public homeResultCount = computed(() => {
    const r = this.homeResults();
    return r.queue.length + r.failed.length + r.couriers.length;
  });

  /** Opens a home search result on its own page, pre-filled with that page's search. */
  public openSearchResult(tab: 'queue' | 'failed' | 'workload', term: string): void {
    this.portal.queries[tab].set(term);
    this.setTab(tab);
  }

  // -------------------------------------------------------------------------
  // Bulk Assignment Logic
  // -------------------------------------------------------------------------
  public isParcelSelected(parcelId: string): boolean {
    return this.selectedParcelIds().has(parcelId);
  }

  public toggleSelectParcel(parcelId: string): void {
    const updated = new Set(this.selectedParcelIds());
    if (updated.has(parcelId)) {
      updated.delete(parcelId);
    } else {
      updated.add(parcelId);
    }
    this.selectedParcelIds.set(updated);
  }

  public isAllSelected = computed(() => {
    const current = this.filteredParcels();
    if (current.length === 0) return false;
    const selected = this.selectedParcelIds();
    return current.every((p) => selected.has(p.parcelId));
  });

  public toggleSelectAll(): void {
    if (this.isAllSelected()) {
      this.clearSelection();
    } else {
      const allIds = new Set(this.filteredParcels().map((p) => p.parcelId));
      this.selectedParcelIds.set(allIds);
    }
  }

  public clearSelection(): void {
    this.selectedParcelIds.set(new Set());
    this.bulkCourierId.set('');
  }

  public submitBulkAssign(): void {
    const courierId = this.bulkCourierId();
    const parcelIds = Array.from(this.selectedParcelIds());
    if (!courierId || parcelIds.length === 0 || this.isSubmittingBulk()) {
      return;
    }

    this.isSubmittingBulk.set(true);

    const assignments: AssignParcelRequest[] = parcelIds.map((id) => ({
      parcelId: id,
      courierId,
    }));

    this.dispatchService.bulkAssignParcels(assignments).subscribe({
      next: (response) => {
        this.isSubmittingBulk.set(false);
        this.bulkResult.set(response);
        this.clearSelection();
        this.showToast(
          `Bulk assignment completed: ${response.successfulCount} succeeded, ${response.failedCount} failed.`,
          response.failedCount === 0 ? 'success' : 'error',
          response.failedCount === 0 ? 'Parcels assigned' : 'Some assignments failed'
        );
      },
      error: (err: any) => {
        this.isSubmittingBulk.set(false);
        const msg = err?.error?.message || err?.message || 'Bulk assignment failed.';
        this.showToast(msg, 'error', 'Bulk assignment failed');
      },
    });
  }

  // -------------------------------------------------------------------------
  // Re-queue Parcel Logic
  // -------------------------------------------------------------------------
  public openRequeueModal(parcel: DispatchParcelSummary): void {
    this.selectedParcelForRequeue.set(parcel);
    this.requeueReason.set('');
    this.isSubmittingRequeue.set(false);
  }

  public confirmRequeue(): void {
    const parcel = this.selectedParcelForRequeue();
    if (!parcel || this.isSubmittingRequeue()) {
      return;
    }

    this.isSubmittingRequeue.set(true);

    this.dispatchService.requeueParcel(parcel.parcelId, this.requeueReason()).subscribe({
      next: (res) => {
        this.isSubmittingRequeue.set(false);
        this.selectedParcelForRequeue.set(null);
        this.showToast(
          `Parcel ${parcel.trackingNumber} successfully re-queued to CREATED (Attempt #${res.attemptCount})!`,
          'success',
          'Parcel re-queued'
        );
      },
      error: (err: any) => {
        this.isSubmittingRequeue.set(false);
        const errorMsg =
          err?.error?.message ||
          err?.message ||
          'Failed to re-queue parcel. Please try again.';
        this.showToast(errorMsg, 'error', 'Re-queue failed');

        if (err?.status === 400 || err?.status === 409) {
          this.retryLoadFailed();
          this.retryLoadQueue();
        }
      },
    });
  }

  // -------------------------------------------------------------------------
  // Single Assignment Logic
  // -------------------------------------------------------------------------
  public openAssignModal(parcel: DispatchParcelSummary): void {
    this.selectedParcelForAssign.set(parcel);
    const firstAvailable = this.dispatchService.availableCouriers()[0];
    this.selectedCourierId.set(firstAvailable ? firstAvailable.courierId : '');
    this.isSubmittingAssignment.set(false);
  }

  public confirmAssignment(): void {
    const parcel = this.selectedParcelForAssign();
    const courierId = this.selectedCourierId();
    if (!parcel || !courierId || this.isSubmittingAssignment()) {
      return;
    }

    this.isSubmittingAssignment.set(true);

    this.dispatchService.assignParcel(parcel.parcelId, courierId).subscribe({
      next: () => {
        this.showToast(
          `Assignment accepted for parcel ${parcel.trackingNumber}; updating workload via event stream...`,
          'success',
          'Parcel assigned'
        );
        this.selectedParcelForAssign.set(null);
        this.selectedCourierId.set('');
        this.isSubmittingAssignment.set(false);
      },
      error: (err: any) => {
        this.isSubmittingAssignment.set(false);
        const errorMsg =
          err?.error?.message ||
          err?.message ||
          'Failed to assign parcel. Please try again.';
        this.showToast(errorMsg, 'error', 'Assignment failed');

        if (err?.status === 409) {
          this.retryLoadQueue();
          this.retryLoadWorkload();
        }
      },
    });
  }

  public toggleCourierAvailability(courier: CourierWorkloadItem): void {
    const nextStatus = !courier.available;
    this.dispatchService.updateCourierAvailability(courier.courierId, nextStatus).subscribe({
      next: () => {
        this.showToast(
          `${courier.name} is now ${nextStatus ? 'Online' : 'Offline'}.`,
          'success',
          'Courier status updated'
        );
      },
      error: (err: any) => {
        const msg = err?.error?.message || err?.message || 'Failed to update courier availability.';
        this.showToast(msg, 'error', "Couldn't update courier");
      },
    });
  }

  private showToast(message: string, type: 'success' | 'error', title?: string): void {
    this.toastMessage.set(message);
    this.toastType.set(type);
    this.alerts.toast(type, title ?? (type === 'success' ? 'Done' : 'Something went wrong'), message);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 4500);
  }

  /** Two-letter avatar for a courier card. */
  public courierInitials(name: string): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (parts[0] ?? '?').slice(0, 2).toUpperCase();
  }

  /** RECIPIENT_ABSENT -> "Recipient absent". */
  public readableReason(reason?: string | null): string {
    return this.alerts.readableReason(reason);
  }
}
