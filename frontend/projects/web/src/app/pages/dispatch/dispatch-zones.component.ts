import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from 'shared-auth';
import { DispatchService } from './dispatch.service';
import { CANONICAL_DISTRICTS, Zone } from './dispatch.model';

@Component({
  selector: 'app-dispatch-zones',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <!-- Full-Screen Dispatcher Dashboard Layout (Matching Customer Portal Design) -->
    <div class="w-full min-h-screen flex flex-col md:flex-row bg-white">
      <!-- Slim Left Sidebar Navigation Rail (Docked & Sticky) -->
      <aside
        class="w-full md:w-20 flex-shrink-0 flex md:flex-col items-center justify-between md:justify-start py-4 md:py-7 px-4 md:px-0 border-b md:border-b-0 md:border-r border-[#f0ebe5] bg-[#faf8f6] md:sticky md:top-0 md:h-screen md:space-y-7 z-20"
      >
        <!-- Brand Logo Mark (Static Brand Header, Not a Button) -->
        <div
          class="w-11 h-11 rounded-2xl bg-[#a53a26] text-white flex items-center justify-center shadow-md shadow-[#a53a26]/20 shrink-0 select-none"
          title="SwiftDrop"
        >
          <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
        </div>

        <!-- Navigation Icons Stack -->
        <nav class="flex md:flex-col items-center gap-3 sm:gap-4" aria-label="Dispatcher Navigation">
          <!-- 0. Dispatcher Home / Dashboard -->
          <a
            routerLink="/dispatch"
            id="tab-home-link"
            class="rail-icon-btn relative w-10 h-10 rounded-xl flex items-center justify-center text-[#6f6d85] hover:text-[#a53a26] hover:bg-white transition-all cursor-pointer no-underline"
            title="Dispatcher Home"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </a>

          <!-- 1. Unassigned Queue -->
          <a
            routerLink="/dispatch"
            [queryParams]="{ tab: 'queue' }"
            id="tab-queue-link"
            class="rail-icon-btn relative w-10 h-10 rounded-xl flex items-center justify-center text-[#6f6d85] hover:text-[#a53a26] hover:bg-white transition-all cursor-pointer no-underline"
            title="Unassigned Queue"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
              <path d="M9 12h6"></path>
              <path d="M9 16h6"></path>
            </svg>
          </a>

          <!-- 2. Failed Deliveries -->
          <a
            routerLink="/dispatch"
            [queryParams]="{ tab: 'failed' }"
            id="tab-failed-link"
            class="rail-icon-btn relative w-10 h-10 rounded-xl flex items-center justify-center text-[#6f6d85] hover:text-[#a53a26] hover:bg-white transition-all cursor-pointer no-underline"
            title="Failed Deliveries"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </a>

          <!-- 3. Courier Workload Board -->
          <a
            routerLink="/dispatch"
            [queryParams]="{ tab: 'workload' }"
            id="tab-workload-link"
            class="rail-icon-btn relative w-10 h-10 rounded-xl flex items-center justify-center text-[#6f6d85] hover:text-[#a53a26] hover:bg-white transition-all cursor-pointer no-underline"
            title="Courier Workload Board"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <rect x="3" y="3" width="7" height="7" rx="2"></rect>
              <rect x="14" y="3" width="7" height="7" rx="2"></rect>
              <rect x="14" y="14" width="7" height="7" rx="2"></rect>
              <rect x="3" y="14" width="7" height="7" rx="2"></rect>
            </svg>
          </a>

          <!-- 4. Delivery Zones - Active -->
          <a
            routerLink="/dispatch/zones"
            id="tab-zones-btn"
            class="rail-icon-btn relative w-10 h-10 rounded-xl flex items-center justify-center text-[#a53a26] bg-white transition-all cursor-pointer no-underline shadow-xs"
            title="Delivery Zones Configuration"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
              <line x1="8" y1="2" x2="8" y2="18"></line>
              <line x1="16" y1="6" x2="16" y2="22"></line>
            </svg>
            <span class="hidden md:block absolute -right-[1px] top-2 bottom-2 w-1 bg-[#a53a26] rounded-l-full"></span>
          </a>

          <!-- 5. Pricing Rules -->
          <a
            routerLink="/dispatch/pricing"
            id="tab-pricing-link"
            class="rail-icon-btn relative w-10 h-10 rounded-xl flex items-center justify-center text-[#6f6d85] hover:text-[#a53a26] hover:bg-white transition-all cursor-pointer no-underline"
            title="Pricing Rules Configuration"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
              <line x1="7" y1="7" x2="7.01" y2="7"></line>
            </svg>
          </a>
        </nav>

        <!-- Sidebar Footer Utilities -->
        <div class="hidden md:flex flex-col items-center gap-3 pt-4 md:!mt-auto pb-4 border-t border-[#f0ebe5]/60">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title="Live Sync Active"></span>
        </div>
      </aside>

      <!-- Main Content Area (Edge-to-Edge Full Screen) -->
      <main class="flex-1 min-h-screen p-6 sm:p-8 lg:p-10 space-y-7 min-w-0 bg-white">
        <!-- Top Header: Search Bar & User Profile Dropdown -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#f4efe9]">
          <div class="relative flex-1 max-w-lg">
            <svg
              class="w-4 h-4 text-[#a09eaf] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search zones, districts, coverage boundaries..."
              class="w-full pl-11 pr-4 py-2.5 rounded-full bg-[#faf8f6] border border-[#e8e2dc] text-xs font-semibold text-[#1d1b2c] focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] transition-all"
            />
          </div>

          <!-- User Profile & Sign Out Dropdown -->
          <div class="flex items-center gap-3 self-end sm:self-auto">
            <div class="relative">
              <button
                type="button"
                (click)="toggleProfileMenu()"
                class="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#faf8f6] border border-[#e8e2dc] hover:border-[#a53a26]/40 transition-colors cursor-pointer"
              >
                <span
                  class="w-8 h-8 rounded-full bg-[#a53a26] text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm"
                >
                  DP
                </span>
                <span class="text-xs font-bold text-[#1d1b2c]">{{ dispatcherDisplayName() }}</span>
                <svg
                  class="w-3.5 h-3.5 text-[#6f6d85] transition-transform"
                  [class.rotate-180]="profileMenuOpen()"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              <div
                *ngIf="profileMenuOpen()"
                role="menu"
                class="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-[#e8e2dc] shadow-lg shadow-[#1d1b2c]/5 py-2 z-30"
              >
                <div class="px-4 py-2 border-b border-[#f0ebe5]">
                  <p class="text-xs font-bold text-[#1d1b2c] truncate">{{ dispatcherDisplayName() }}</p>
                  <p class="text-[11px] text-[#6f6d85] truncate">Role: DISPATCHER</p>
                </div>
                <a
                  routerLink="/admin/users"
                  class="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-[#1d1b2c] hover:bg-[#faf8f6] hover:text-[#a53a26] transition-colors cursor-pointer no-underline"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                  </svg>
                  <span>Staff User Administration</span>
                </a>
                <button
                  type="button"
                  (click)="logout()"
                  class="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-[#a53a26] hover:bg-[#faf8f6] transition-colors cursor-pointer"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span>Log out</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Greeting Banner -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 class="text-2xl sm:text-3xl font-black text-[#1d1b2c] tracking-tight">
              Delivery Zones Configuration
            </h1>
            <p class="text-xs sm:text-sm text-[#6f6d85] font-medium mt-1">
              Configure coverage boundaries, served delivery areas, and base fees • Port 8083
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#a53a26]/10 text-[#a53a26] border border-[#a53a26]/20"
            >
              <span>🗺️</span>
              <span>{{ zones().length }} Active Zones</span>
            </span>
          </div>
        </div>

        <!-- Section Heading -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div>
            <h2 class="text-xl sm:text-2xl font-black text-[#1d1b2c] tracking-tight">
              Zone Boundary Management
            </h2>
            <p class="text-xs text-[#6f6d85] font-medium mt-1">
              Active geographical zones and municipal delivery coverage
            </p>
          </div>
        </div>

        <!-- Success Feedback Banner -->
        @if (successMessage(); as msg) {
          <div
            id="zone-success-banner"
            class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 flex items-center justify-between shadow-sm"
          >
            <div class="flex items-center gap-2">
              <span>✅</span>
              <span>{{ msg }}</span>
            </div>
            <button
              type="button"
              class="text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
              (click)="successMessage.set(null)"
            >
              ✕
            </button>
          </div>
        }

        <!-- Main Zone Grid -->
        <div class="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <div id="zones" class="bg-white rounded-3xl border border-[#f0ebe5] p-6 shadow-sm space-y-4">
            <div class="flex items-center justify-between border-b border-[#f0ebe5] pb-3">
              <h3 class="text-base font-extrabold text-[#1d1b2c]">Delivery Zones ({{ zones().length }})</h3>
              <span class="text-xs text-[#6f6d85] font-medium">Coverage list</span>
            </div>
            <div class="space-y-3">
              @if (dispatchService.isLoadingZones()) {
                <p class="text-sm text-[#6f6d85]">Loading zones…</p>
              } @else if (dispatchService.zonesError()) {
                <p class="text-sm text-rose-600">{{ dispatchService.zonesError() }}</p>
              } @else if (zones().length === 0) {
                <p class="text-sm text-[#6f6d85]">No delivery zones configured.</p>
              }
              @for (zone of zones(); track zone.name) {
                <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#faf8f6] p-4 border border-[#f0ebe5]">
                  <div>
                    <p class="font-extrabold text-[#1d1b2c]">{{ zone.name }}</p>
                    <p class="text-xs text-[#6f6d85] mt-0.5">{{ zone.districts.join(', ') }}</p>
                  </div>
                  <div class="text-right">
                    <p class="font-bold text-[#1d1b2c]">LKR {{ zone.baseFeeLkr | number: '1.2-2' }}</p>
                    <span class="text-xs font-semibold" [class]="zone.served ? 'text-emerald-700' : 'text-[#6f6d85]'">
                      {{ zone.served ? '● Served' : '○ Paused' }}
                    </span>
                    <div class="mt-2 flex gap-3 justify-end">
                      <button type="button" class="text-xs font-bold text-[#a53a26] hover:underline cursor-pointer" (click)="editZone(zone)">Edit</button>
                      <button type="button" class="text-xs font-bold text-rose-600 hover:underline cursor-pointer" (click)="removeZone(zone)">Delete</button>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="bg-white rounded-3xl border border-[#f0ebe5] p-6 shadow-sm space-y-4">
            <div class="border-b border-[#f0ebe5] pb-3">
              <h3 class="text-base font-extrabold text-[#1d1b2c]">{{ editingZoneId ? 'Edit Delivery Zone' : 'Add Delivery Zone' }}</h3>
              <p class="text-xs text-[#6f6d85]">Configure district boundaries and base delivery fee</p>
            </div>
            <form class="space-y-4" [formGroup]="zoneForm" (ngSubmit)="saveZone()">
              @if (mutationError()) {
                <p class="text-sm text-rose-600 font-semibold">{{ mutationError() }}</p>
              }
              <div>
                <label class="block text-xs font-bold text-[#1d1b2c] uppercase tracking-wider mb-1">
                  Zone name
                </label>
                <input
                  id="zone-name-input"
                  class="w-full rounded-xl border border-[#f0ebe5] bg-[#faf8f6] px-3.5 py-2.5 text-sm text-[#1d1b2c] focus:outline-none focus:ring-2 focus:ring-[#a53a26]"
                  formControlName="name"
                  placeholder="e.g. KANDY_CENTRAL"
                />
                @if (zoneForm.get('name')?.invalid && zoneForm.get('name')?.touched) {
                  <p id="zone-name-error" class="mt-1 text-xs text-rose-600 font-medium">Zone name is required</p>
                }
              </div>

              <div>
                <label class="block text-xs font-bold text-[#1d1b2c] uppercase tracking-wider mb-1">
                  Districts (Hold Ctrl/Cmd to select multiple)
                </label>
                <select
                  id="zone-districts-select"
                  class="w-full rounded-xl border border-[#f0ebe5] bg-[#faf8f6] px-3.5 py-2.5 text-sm text-[#1d1b2c] focus:outline-none focus:ring-2 focus:ring-[#a53a26]"
                  multiple
                  rows="4"
                  formControlName="districts"
                >
                  @for (district of districts; track district) {
                    <option [value]="district">{{ district }}</option>
                  }
                </select>
                @if (zoneForm.get('districts')?.invalid && zoneForm.get('districts')?.touched) {
                  <p id="zone-districts-error" class="mt-1 text-xs text-rose-600 font-medium">At least one district must be selected</p>
                }
              </div>

              <div>
                <label class="block text-xs font-bold text-[#1d1b2c] uppercase tracking-wider mb-1">
                  Base fee (LKR)
                </label>
                <input
                  id="zone-fee-input"
                  class="w-full rounded-xl border border-[#f0ebe5] bg-[#faf8f6] px-3.5 py-2.5 text-sm text-[#1d1b2c] focus:outline-none focus:ring-2 focus:ring-[#a53a26]"
                  type="number"
                  formControlName="baseFeeLkr"
                  placeholder="500"
                />
                @if (zoneForm.get('baseFeeLkr')?.invalid && zoneForm.get('baseFeeLkr')?.touched) {
                  <p id="zone-fee-error" class="mt-1 text-xs text-rose-600 font-medium">Base fee must be 0 or greater</p>
                }
              </div>

              <label class="flex items-center gap-2 text-xs font-semibold text-[#1d1b2c] cursor-pointer">
                <input
                  id="zone-served-checkbox"
                  type="checkbox"
                  formControlName="served"
                  class="rounded text-[#a53a26] focus:ring-[#a53a26]"
                />
                <span>Active served zone</span>
              </label>

              <button
                id="add-zone-submit-btn"
                type="submit"
                [disabled]="zoneForm.invalid || isSaving()"
                class="w-full px-5 py-2.5 rounded-full bg-[#a53a26] hover:bg-[#8c2e1d] text-white font-bold text-xs shadow-sm shadow-[#a53a26]/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {{ isSaving() ? 'Saving...' : (editingZoneId ? 'Save changes' : 'Add zone') }}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  `,
})
export class DispatchZonesComponent {
  readonly dispatchService = inject(DispatchService);
  readonly authService = inject(AuthService, { optional: true });
  readonly router = inject(Router, { optional: true });
  readonly profileMenuOpen = signal(false);

  readonly mutationError = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly isSaving = signal<boolean>(false);
  editingZoneId: string | null = null;
  readonly districts = CANONICAL_DISTRICTS;

  readonly zones = signal<Zone[]>([]);

  readonly zoneForm: FormGroup;

  toggleProfileMenu(): void {
    this.profileMenuOpen.update((open) => !open);
  }

  logout(): void {
    if (this.authService) {
      this.authService.logout().subscribe({
        next: () => this.router?.navigate(['/login']),
        error: () => this.router?.navigate(['/login']),
      });
    } else {
      this.router?.navigate(['/login']);
    }
  }

  dispatcherDisplayName(): string {
    return 'Sample Dispatcher';
  }

  constructor(private readonly formBuilder: FormBuilder) {
    this.zoneForm = this.formBuilder.nonNullable.group({
      name: ['', [Validators.required]],
      districts: [<string[]>[], [Validators.required, Validators.minLength(1)]],
      served: [true],
      baseFeeLkr: [0, [Validators.required, Validators.min(0)]],
    });
    this.loadZones();
  }

  private loadZones(): void {
    this.dispatchService.listZones().subscribe({
      next: (zones) => this.zones.set(zones),
      error: () => undefined,
    });
  }

  saveZone(): void {
    if (this.zoneForm.invalid || this.isSaving()) {
      this.zoneForm.markAllAsTouched();
      return;
    }
    this.mutationError.set(null);
    this.isSaving.set(true);
    const request = this.zoneForm.getRawValue();
    const isEditing = !!this.editingZoneId;
    const zoneName = request.name;

    const operation = isEditing
      ? this.dispatchService.updateZone(this.editingZoneId!, request)
      : this.dispatchService.createZone(request);

    operation.subscribe({
      next: () => {
        this.editingZoneId = null;
        this.isSaving.set(false);
        this.successMessage.set(
          isEditing
            ? `Delivery zone "${zoneName}" updated successfully.`
            : `Delivery zone "${zoneName}" created successfully.`
        );
        this.zoneForm.reset({ name: '', districts: [], served: true, baseFeeLkr: 0 });
        this.loadZones();
      },
      error: (error) => {
        this.isSaving.set(false);
        this.mutationError.set(
          error?.error?.message || error?.message || 'Unable to save the delivery zone.'
        );
      },
    });
  }

  editZone(zone: Zone): void {
    this.editingZoneId = zone.id;
    this.mutationError.set(null);
    this.zoneForm.setValue({
      name: zone.name,
      districts: zone.districts,
      served: zone.served,
      baseFeeLkr: zone.baseFeeLkr,
    });
  }

  removeZone(zone: Zone): void {
    if (!window.confirm(`Delete zone ${zone.name}?`)) {
      return;
    }
    this.mutationError.set(null);
    this.dispatchService.deleteZone(zone.id).subscribe({
      next: () => {
        this.successMessage.set(`Delivery zone "${zone.name}" deleted successfully.`);
        this.loadZones();
      },
      error: (error) => this.mutationError.set(
        error?.error?.message || error?.message || 'Unable to delete the delivery zone.'
      ),
    });
  }
}
