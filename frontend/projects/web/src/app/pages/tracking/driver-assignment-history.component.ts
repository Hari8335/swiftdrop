import { DatePipe } from '@angular/common';
import { Component, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, combineLatest, debounceTime, filter, interval, of, startWith, switchMap, tap } from 'rxjs';
import { TrackingApiService } from './tracking-api.service';
import { DriverAssignment } from './tracking.model';
import { AvatarComponent } from 'ui';

/**
 * Courier Assignment History card on the parcel detail page: every courier assigned to the parcel,
 * oldest first, with name, vehicle and zone (no phone numbers), when they were assigned, whether they
 * are the current courier, and when they were replaced. Reloads when a live event arrives.
 */
@Component({
  selector: 'app-driver-assignment-history',
  standalone: true,
  imports: [DatePipe, AvatarComponent],
  template: `
    <section
      class="rounded-3xl border border-[#eee7e0] bg-[#faf8f6] p-6 sm:p-7 space-y-5 shadow-xs"
      aria-labelledby="driver-history-title"
      data-testid="driver-assignment-history"
    >
      <div class="pb-3.5 border-b border-[#eee7e0]">
        <h2 id="driver-history-title" class="text-lg font-black text-[#1d1b2c] tracking-tight">Courier Assignment History</h2>
        <p class="text-xs text-[#6f6d85] font-semibold mt-0.5">Every courier assigned to this delivery, in order</p>
      </div>

      @switch (state()) {
        @case ('loading') {
          <p class="text-xs font-semibold text-[#6f6d85]" data-testid="driver-history-loading">Loading drivers…</p>
        }
        @case ('error') {
          <div class="bg-white rounded-2xl p-5 border border-[#eee7e0] text-xs font-semibold text-[#6f6d85] flex items-center justify-between gap-3"
               data-testid="driver-history-error">
            <span>Couldn't load the courier history.</span>
            <button type="button" (click)="retry()"
                    class="px-3 py-1.5 rounded-full border border-[#eee7e0] bg-[#faf8f6] hover:bg-[#f3ece4] text-[#a53a26] font-bold cursor-pointer">
              Try again
            </button>
          </div>
        }
        @default {
          @if (assignments().length === 0) {
            <div class="bg-white rounded-2xl p-5 border border-[#eee7e0] text-center" data-testid="driver-history-empty">
              <p class="text-sm font-black text-[#1d1b2c]">No courier assigned yet</p>
              <p class="text-xs font-semibold text-[#6f6d85] mt-1">A courier appears here once dispatch assigns one.</p>
            </div>
          } @else {
            <ol class="bg-white rounded-2xl p-5 border border-[#eee7e0] space-y-5">
              @for (a of assignments(); track a.assignedAt; let last = $last) {
                <li class="relative flex gap-3.5" data-testid="driver-assignment">
                  @if (!last) {
                    <span class="absolute left-[19px] top-11 -bottom-5 w-0.5 bg-[#eee7e0]" aria-hidden="true"></span>
                  }
                  <ui-avatar
                    class="relative w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-black uppercase"
                    [class.bg-[#a53a26]]="a.status === 'CURRENT'"
                    [class.text-white]="a.status === 'CURRENT'"
                    [class.bg-[#f1ece6]]="a.status !== 'CURRENT'"
                    [class.text-[#6f6d85]]="a.status !== 'CURRENT'"
                    aria-hidden="true"
                    data-testid="driver-avatar"
                    [src]="a.driver?.photoUrl"
                    [initials]="initials(a)"
                  />

                  <div class="min-w-0 flex-1 space-y-1.5">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <p class="text-sm font-black text-[#1d1b2c]" data-testid="driver-name">{{ a.driver?.name ?? 'Courier' }}</p>
                      @if (a.status === 'CURRENT') {
                        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                              data-testid="driver-status">Currently Assigned</span>
                      } @else {
                        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#f4f1ee] text-[#6f6d85] border border-[#eee7e0]"
                              data-testid="driver-status">Previously Assigned</span>
                      }
                    </div>

                    <p class="text-xs font-semibold text-[#6f6d85]" data-testid="driver-profile">{{ profileLine(a) }}</p>

                    <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs pt-0.5">
                      <div>
                        <dt class="inline text-[#6f6d85] font-semibold">Assigned: </dt>
                        <dd class="inline font-bold text-[#1d1b2c]" data-testid="driver-assigned-at">{{ a.assignedAt | date: 'medium' }}</dd>
                      </div>
                      @if (a.reassignedAt) {
                        <div>
                          <dt class="inline text-[#6f6d85] font-semibold">Reassigned: </dt>
                          <dd class="inline font-bold text-[#1d1b2c]" data-testid="driver-reassigned-at">{{ a.reassignedAt | date: 'medium' }}</dd>
                        </div>
                      }
                    </dl>
                  </div>
                </li>
              }
            </ol>
          }
        }
      }
    </section>
  `,
})
export class DriverAssignmentHistoryComponent {
  static readonly POLL_MS = 30_000;
  private readonly api = inject(TrackingApiService);

  readonly parcelId = input.required<string>();
  /** Changes when a live status event arrives (LiveTimeline.revision); the list reloads quietly. */
  readonly revision = input(0);
  /**
   * Couriers are assigned and reassigned only while the parcel is CREATED, and those events travel on
   * parcel.assigned.v1, not on the parcel's status stream. So while this is true the list refreshes
   * every POLL_MS to pick up a reassignment.
   */
  readonly poll = input(false);

  readonly assignments = signal<DriverAssignment[]>([]);
  readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  private readonly retry$ = signal(0);
  private loadedFor: string | null = null;

  constructor() {
    const ticks$ = toObservable(this.poll).pipe(
      switchMap((on) => (on ? interval(DriverAssignmentHistoryComponent.POLL_MS).pipe(startWith(0)) : of(0))),
    );
    combineLatest([toObservable(this.parcelId), toObservable(this.revision), toObservable(this.retry$), ticks$])
      .pipe(
        filter(([id]) => !!id),
        debounceTime(0),
        switchMap(([id]) => {
          // Spinner only for the first load of a parcel; live reloads keep the list on screen.
          if (this.loadedFor !== id) {
            this.state.set('loading');
          }
          return this.api.assignments(id).pipe(
            tap((response) => {
              this.loadedFor = id;
              this.assignments.set(response.assignments);
              this.state.set('ready');
            }),
            catchError(() => {
              if (this.loadedFor !== id) {
                this.state.set('error');
              }
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  retry(): void {
    this.retry$.update((n) => n + 1);
  }

  initials(a: DriverAssignment): string {
    const name = a.driver?.name?.trim();
    if (!name) {
      return '?';
    }
    const parts = name.split(/\s+/);
    return (parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
  }

  profileLine(a: DriverAssignment): string {
    if (!a.driver) {
      return 'Profile not available';
    }
    const details = [a.driver.vehicleType, a.driver.zone ? `${a.driver.zone} zone` : null].filter((x) => !!x);
    return details.length ? details.join(' · ') : 'No vehicle or zone details';
  }
}
