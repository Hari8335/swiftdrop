import { CurrencyPipe, DatePipe, Location } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from 'shared-auth';
import { EMPTY, Subject, Subscription, catchError, distinctUntilChanged, forkJoin, map, startWith, switchMap, tap } from 'rxjs';
import {
  ButtonComponent,
  EmptyStateComponent,
  ErrorStateComponent,
  LoadingStateComponent,
  StatusBadgeComponent,
} from 'ui';
import { CUSTOMER_NAV } from '../customer-history/customer-nav';
import { LiveIndicatorComponent } from './live-indicator.component';
import { PageState, failure, followParcel } from './live-stream';
import { ParcelRatingComponent } from './parcel-rating.component';
import { ReceiptButtonComponent } from './receipt-button.component';
import { DriverAssignmentHistoryComponent } from './driver-assignment-history.component';
import { LiveTimeline } from './live-timeline';
import { TrackingApiService } from './tracking-api.service';
import { StreamState, TrackingStreamService } from './tracking-stream.service';
import { TrackingTimelineComponent } from './tracking-timeline.component';
import { ParcelDetail } from './tracking.model';
import { NotificationBellComponent } from '../../notification/notification-bell/notification-bell.component';

/**
 * Signed-in parcel detail with a live timeline (CU-04, CU-05; docs/tracking-design.md 3.5).
 * Styled with a 2-column side-by-side layout matching the Nomu Customer Portal design.
 */
@Component({
  selector: 'app-parcel-detail',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    CurrencyPipe,
    ButtonComponent,
    StatusBadgeComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    LiveIndicatorComponent,
    TrackingTimelineComponent,
    ReceiptButtonComponent,
    ParcelRatingComponent,
    NotificationBellComponent,
    DriverAssignmentHistoryComponent,
  ],
  template: `
    <!-- Full-Screen Edge-to-Edge Layout matching Customer Portal -->
    <div class="w-full min-h-screen flex flex-col md:flex-row bg-white font-sans text-[#1d1b2c]">
      <!-- Slim Left Sidebar Navigation Rail (Docked & Sticky) -->
      <aside
        class="w-full md:w-20 flex-shrink-0 flex md:flex-col items-center justify-between md:justify-start py-4 md:py-7 px-4 md:px-0 border-b md:border-b-0 md:border-r border-[#f0ebe5] bg-[#faf8f6] md:sticky md:top-0 md:h-screen md:space-y-7 z-20"
      >
        <!-- Brand Logo Icon -->
        <a
          routerLink="/customer"
          class="w-11 h-11 rounded-2xl bg-[#a53a26] text-white flex items-center justify-center shadow-md shadow-[#a53a26]/20 group cursor-pointer hover:scale-105 transition-transform"
          title="SwiftDrop Customer Portal"
        >
          <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
        </a>

        <!-- Navigation Icons Stack -->
        <nav class="flex md:flex-col items-center gap-3 sm:gap-4" aria-label="Customer Navigation">
          <!-- 1. Grid Icon (My Deliveries) - Active Rail Indicator -->
          <a
            routerLink="/customer"
            class="rail-icon-btn rail-active relative w-11 h-11 rounded-2xl flex items-center justify-center text-[#a53a26] bg-white border border-[#eee7e0] shadow-xs transition-all cursor-pointer no-underline"
            title="My Deliveries"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/>
              <path d="M12 22V12"/>
              <polyline points="3.29 7 12 12 20.71 7"/>
              <path d="m7.5 4.27 9 5.15"/>
            </svg>
          </a>

          <!-- 2. Plus Button (Book New Delivery) -->
          <a
            routerLink="/customer"
            class="w-11 h-11 rounded-2xl bg-[#a53a26] hover:bg-[#8c2e1d] text-white flex items-center justify-center shadow-xs shadow-[#a53a26]/25 hover:shadow-sm hover:scale-[1.03] transition-all cursor-pointer no-underline"
            title="Book New Delivery"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </a>

          <!-- 3. Conversational AI Chat Icon (AI Assistant) -->
          <a
            routerLink="/customer/assistant"
            id="nav-assistant-link"
            class="rail-icon-btn relative w-11 h-11 rounded-2xl flex items-center justify-center text-[#6f6d85] hover:text-[#a53a26] hover:bg-[#faf6f0] transition-all cursor-pointer no-underline"
            title="AI Assistant"
            aria-label="AI Assistant"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              <path d="M12 7l.8 1.6 1.7.8-1.7.8-.8 1.6-.8-1.6-1.7-.8 1.7-.8z"/>
            </svg>
          </a>
        </nav>

        <!-- Bottom Actions (Notifications & Sign Out) -->
        <div class="hidden md:flex flex-col items-center gap-4 mt-auto pt-4 border-t border-[#f0ebe5]/60">
          <app-notification-bell placement="right"></app-notification-bell>
          <button
            (click)="signOut()"
            class="w-11 h-11 rounded-2xl flex items-center justify-center text-[#6f6d85] hover:text-[#a53a26] hover:bg-[#faf6f0] transition-colors cursor-pointer"
            title="Sign Out"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>

      <!-- Main Content Column -->
      <main class="flex-1 flex flex-col min-w-0 bg-[#ffffff] min-h-screen">
        <!-- Top Navigation Header (Breadcrumb removed) -->
        <header
          class="w-full min-h-[72px] flex items-center justify-between px-4 sm:px-8 md:px-12 border-b border-[#f0ebe5] bg-white sticky top-0 z-10"
        >
          <!-- Back Button -->
          <button
            type="button"
            (click)="goBack()"
            class="h-10 inline-flex items-center gap-2 px-4 rounded-full border border-[#eee7e0] bg-[#faf8f6] hover:bg-[#f3ece4] text-[#1d1b2c] text-xs font-bold transition-all shadow-xs cursor-pointer group"
            title="Back to Deliveries"
          >
            <svg
              class="w-4 h-4 text-[#a53a26] group-hover:-translate-x-0.5 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Deliveries</span>
          </button>

          <!-- User Profile Badge -->
          <div class="flex items-center gap-3">
            <div class="h-10 inline-flex items-center gap-2.5 px-3 rounded-full bg-[#faf8f6] border border-[#eee7e0]">
              <div
                class="w-7 h-7 rounded-full bg-[#a53a26] text-white flex items-center justify-center text-xs font-black shadow-xs"
              >
                {{ customerInitials() }}
              </div>
              <span class="text-xs font-bold text-[#1d1b2c] hidden sm:inline">{{ customerName() }}</span>
            </div>
          </div>
        </header>

        <!-- Page Content Body -->
        <div class="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          @switch (page()) {
            @case ('loading') {
              <div class="py-16 text-center">
                <ui-loading-state message="Loading your parcel…" />
              </div>
            }
            @case ('not-found') {
              <div class="p-8 sm:p-12 rounded-3xl border border-[#eee7e0] bg-[#faf8f6] text-center shadow-xs">
                <ui-empty-state title="Parcel not found" message="It may have been removed, or the link is wrong.">
                  <div class="mt-4 flex justify-center">
                    <ui-button routerLink="/customer/parcels" variant="secondary">Back to my parcels</ui-button>
                  </div>
                </ui-empty-state>
              </div>
            }
            @case ('forbidden') {
              <div class="p-8 rounded-3xl border border-[#eee7e0] bg-[#faf8f6] shadow-xs">
                <ui-error-state title="No access" [message]="error()" retryLabel="" />
              </div>
            }
            @case ('unauthorized') {
              <div class="p-8 rounded-3xl border border-[#eee7e0] bg-[#faf8f6] shadow-xs">
                <ui-error-state title="Signed out" [message]="error()" retryLabel="" />
              </div>
            }
            @case ('error') {
              <div class="p-8 rounded-3xl border border-[#eee7e0] bg-[#faf8f6] shadow-xs">
                <ui-error-state title="Could not load this parcel" [message]="error()" (retry)="reload()" />
              </div>
            }
            @default {
              @if (parcel(); as p) {
                <!-- Side-by-Side 2-Column Grid Layout -->
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <!-- Left Column (7 cols): Tracking Details & Summary -->
                  <div class="lg:col-span-7 space-y-6">
                    <div class="rounded-3xl border border-[#eee7e0] bg-[#faf8f6] p-6 sm:p-7 space-y-6 shadow-xs">
                      <!-- Header: Tracking Number & Current Status -->
                      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#eee7e0]">
                        <div>
                          <p class="text-xs font-bold uppercase tracking-wider text-[#a53a26]">Tracking Number</p>
                          <h1
                            class="text-2xl sm:text-3xl font-black text-[#1d1b2c] tracking-tight font-mono mt-1"
                            data-testid="tracking-number"
                          >
                            {{ p.trackingNumber }}
                          </h1>
                        </div>
                        @if (timeline.status(); as status) {
                          <div class="flex-shrink-0">
                            <ui-status-badge [status]="status" data-testid="current-status" />
                          </div>
                        }
                      </div>

                      <!-- Visual Delivery Route Card -->
                      <div class="rounded-2xl bg-white border border-[#eee7e0] p-5 space-y-4 shadow-xs">
                        <div class="text-[11px] font-bold uppercase tracking-wider text-[#6f6d85]">Delivery Route</div>
                        <div class="relative pl-6 space-y-4">
                          <!-- Vertical route line -->
                          <div class="absolute left-2 top-2 bottom-2 w-0.5 bg-[#eee7e0]"></div>

                          <!-- Origin / Pickup -->
                          <div class="relative">
                            <span class="absolute -left-6 top-1 w-3 h-3 rounded-full bg-[#a53a26] ring-4 ring-[#faf6f0]"></span>
                            <div class="text-[11px] font-bold text-[#6f6d85] uppercase tracking-wide">Pickup Point</div>
                            <p class="text-sm font-black text-[#1d1b2c] mt-0.5">
                              {{ p.pickupAddress.line1 }}, {{ p.pickupAddress.city }}, {{ p.pickupAddress.district }}
                            </p>
                          </div>

                          <!-- Destination / Dropoff -->
                          <div class="relative pt-2">
                            <span class="absolute -left-6 top-3 w-3 h-3 rounded-full bg-[#2e7d32] ring-4 ring-[#faf6f0]"></span>
                            <div class="text-[11px] font-bold text-[#6f6d85] uppercase tracking-wide">Destination</div>
                            <p class="text-sm font-black text-[#1d1b2c] mt-0.5">
                              <span class="text-[#a53a26]">{{ p.recipientName }}</span> · {{ p.dropoffAddress.line1 }}, {{ p.dropoffAddress.city }}, {{ p.dropoffAddress.district }}
                            </p>
                          </div>
                        </div>
                      </div>

                      <!-- 2-Stat Grid: Specs & Last Updated -->
                      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                        <!-- Parcel Specs -->
                        <div class="p-4 rounded-2xl bg-white border border-[#eee7e0] space-y-1 shadow-xs">
                          <dt class="text-[#6f6d85] font-bold uppercase tracking-wider text-[11px]">Parcel</dt>
                          <dd class="text-[#1d1b2c] font-black text-sm pt-0.5 leading-snug">
                            {{ p.size }} · {{ p.weightKg }} kg · {{ p.fee | currency: 'LKR' : 'symbol' : '1.2-2' }}
                          </dd>
                        </div>

                        <!-- Last Updated -->
                        <div class="p-4 rounded-2xl bg-white border border-[#eee7e0] space-y-1 shadow-xs">
                          <dt class="text-[#6f6d85] font-bold uppercase tracking-wider text-[11px]">Last update</dt>
                          <dd class="text-[#1d1b2c] font-black text-sm pt-0.5 leading-snug" data-testid="last-updated">
                            {{ timeline.lastUpdatedAt() | date: 'medium' }}
                          </dd>
                        </div>
                      </dl>

                      <!-- Receipt Button (if DELIVERED) -->
                      @if (timeline.status() === 'DELIVERED') {
                        <div class="pt-1">
                          <app-receipt-button class="block" [parcelId]="p.id" [trackingNumber]="p.trackingNumber" />
                        </div>
                      }

                      <!-- Live Stream Indicator Bar -->
                      <app-live-indicator
                        class="mt-4 border-t border-[#eee7e0] pt-4 block"
                        [state]="stream()"
                        (retry)="reconnect()"
                      />
                    </div>

                    <!-- Rating Component (if DELIVERED) -->
                    @if (timeline.status() === 'DELIVERED') {
                      <app-parcel-rating class="block" [parcelId]="p.id" />
                    }
                  </div>

                  <!-- Right Column (5 cols): Timeline Beside the Details -->
                  <div class="lg:col-span-5 space-y-6">
                    <div class="rounded-3xl border border-[#eee7e0] bg-[#faf8f6] p-6 sm:p-7 space-y-5 shadow-xs">
                      <div class="flex items-center justify-between pb-3.5 border-b border-[#eee7e0]">
                        <div>
                          <h2 class="text-lg font-black text-[#1d1b2c] tracking-tight">Timeline</h2>
                          <p class="text-xs text-[#6f6d85] font-semibold mt-0.5">Real-time status updates & parcel journey</p>
                        </div>
                      </div>

                      @if (timeline.isEmpty()) {
                        <ui-empty-state title="No updates yet" message="Updates appear here as soon as the parcel moves." />
                      } @else {
                        <div class="bg-white rounded-2xl p-5 border border-[#eee7e0] shadow-xs">
                          <app-tracking-timeline [items]="timeline.items()" [status]="timeline.status()" />
                        </div>
                      }
                    </div>

                    <!-- Driver Assignment History (below the timeline) -->
                    <app-driver-assignment-history
                      class="block"
                      [parcelId]="p.id"
                      [revision]="timeline.revision()"
                      [poll]="timeline.status() === 'CREATED'"
                    />
                  </div>
                </div>
              }
            }
          }
        </div>
      </main>
    </div>
  `,
  styles: [
    `
      :host {
        --terracotta: #a53a26;
        --terracotta-dark: #7e2615;
        --coral: #a53a26;
        --ink: #1d1b2c;
        --ink-2: #3a384e;
        --ink-3: #6f6d85;
        --sand: #faf6f0;
        --disp: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        display: block;
        font-family: var(--disp);
        background-color: #ffffff;
      }
      .rail-icon-btn.rail-active {
        color: var(--terracotta);
        background: #ffffff;
        border: 1px solid #eee7e0;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }
    `,
  ],
})
export class ParcelDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly api = inject(TrackingApiService);
  private readonly streams = inject(TrackingStreamService);
  private readonly auth = inject(AuthService);
  private readonly reload$ = new Subject<void>();
  private readonly retry$ = new Subject<void>();
  private readonly subscription: Subscription;

  protected readonly nav = CUSTOMER_NAV;
  readonly timeline = new LiveTimeline();
  readonly page = signal<PageState>('loading');
  readonly stream = signal<StreamState>('connecting');
  readonly error = signal('');
  readonly parcel = signal<ParcelDetail | null>(null);

  customerName = computed(() => {
    const user = typeof (this.auth as any).currentUser === 'function' ? (this.auth as any).currentUser() : null;
    return user?.fullName || user?.email?.split('@')[0] || 'Customer';
  });

  customerInitials = computed(() => {
    const name = this.customerName();
    if (!name) return 'CU';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  constructor() {
    this.subscription = this.route.paramMap
      .pipe(
        map((params) => params.get('id') ?? ''),
        distinctUntilChanged(),
        // switchMap: opening another parcel closes the previous stream first.
        switchMap((id) => this.reload$.pipe(startWith(undefined), switchMap(() => this.load(id)))),
        takeUntilDestroyed(),
      )
      .subscribe();

    // Logout: close the stream (no reconnect loop) and drop the parcel data from memory.
    effect(() => {
      if (!this.auth.isAuthenticated()) {
        this.subscription.unsubscribe();
        this.timeline.clear();
        this.parcel.set(null);
        this.stream.set('disconnected');
        this.error.set('Your session has ended. Please sign in again.');
        this.page.set('unauthorized');
      }
    });
  }

  goBack(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/customer']);
    }
  }

  signOut(): void {
    if (typeof (this.auth as any).logout === 'function') {
      (this.auth as any).logout().subscribe({
        next: () => this.router.navigate(['/login']),
        error: () => this.router.navigate(['/login']),
      });
    } else {
      this.router.navigate(['/login']);
    }
  }

  reload(): void {
    this.reload$.next();
  }

  reconnect(): void {
    this.retry$.next();
  }

  private load(id: string) {
    this.page.set('loading');
    this.stream.set('connecting');
    this.timeline.clear();
    this.parcel.set(null);
    return forkJoin({ parcel: this.api.parcel(id), history: this.api.history(id) }).pipe(
      catchError((err: unknown) => {
        const { state, message } = failure(err);
        this.page.set(state);
        this.error.set(message);
        return EMPTY;
      }),
      tap(({ parcel, history }) => {
        this.parcel.set(parcel);
        this.timeline.reset(
          parcel.trackingNumber,
          parcel.status,
          history.entries.map((entry) => ({ status: entry.toStatus, occurredAt: entry.occurredAt, reason: entry.reason })),
          null,
        );
        this.page.set('ready');
      }),
      switchMap(({ parcel }) =>
        followParcel(this.streams, this.timeline, parcel.trackingNumber, parcel.status, (s) => this.stream.set(s), this.retry$),
      ),
    );
  }
}
