import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { DispatchService } from './dispatch.service';
import { DispatchPortalState, matchesQuery } from './dispatch-portal.state';
import { CANONICAL_DISTRICTS, Zone } from './dispatch.model';

@Component({
  selector: 'app-dispatch-zones',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-7">
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
              <h3 class="text-base font-extrabold text-[#1d1b2c]">
                Delivery Zones ({{ searchQuery() ? filteredZones().length + ' of ' + zones().length : zones().length }})
              </h3>
              <span class="text-xs text-[#6f6d85] font-medium">Coverage list</span>
            </div>
            <div class="space-y-3">
              @if (dispatchService.isLoadingZones()) {
                <p class="text-sm text-[#6f6d85]">Loading zones…</p>
              } @else if (dispatchService.zonesError()) {
                <p class="text-sm text-rose-600">{{ dispatchService.zonesError() }}</p>
              } @else if (zones().length === 0) {
                <p class="text-sm text-[#6f6d85]">No delivery zones configured.</p>
              } @else if (filteredZones().length === 0) {
                <p id="zones-no-match" class="text-sm text-[#6f6d85]">No zones match "{{ searchQuery() }}".</p>
              }
              @for (zone of filteredZones(); track zone.name) {
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
    </div>
  `,
})
export class DispatchZonesComponent {
  readonly dispatchService = inject(DispatchService);

  readonly mutationError = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly isSaving = signal<boolean>(false);
  editingZoneId: string | null = null;
  readonly districts = CANONICAL_DISTRICTS;

  readonly zones = signal<Zone[]>([]);

  /** Shared with the portal's top search bar. */
  readonly searchQuery = inject(DispatchPortalState).queries.zones;
  readonly filteredZones = computed(() =>
    this.zones().filter((z) =>
      matchesQuery(this.searchQuery(), z.name, z.served ? 'served' : 'not served', ...z.districts)
    )
  );

  readonly zoneForm: FormGroup;


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
