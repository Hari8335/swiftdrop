import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { DispatchService } from './dispatch.service';
import { DispatchPortalState, matchesQuery } from './dispatch-portal.state';
import { DispatchNotificationsService } from './dispatch-notifications.service';
import { CANONICAL_DISTRICTS, Zone } from './dispatch.model';

@Component({
  selector: 'app-dispatch-zones',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-7">


        <!-- Main Zone Grid -->
        <div class="grid gap-6 xl:grid-cols-2 items-start">
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
                <p class="text-sm text-[#6f6d85]">Zones couldn't be loaded. Refresh the page to try again.</p>
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
                      <span class="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" [class.bg-emerald-500]="zone.served" [class.bg-[#a09eaf]]="!zone.served"></span>{{ zone.served ? 'Served' : 'Paused' }}
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

              <div id="zone-districts-field" class="relative">
                <label id="zone-districts-label" class="block text-xs font-bold text-[#1d1b2c] uppercase tracking-wider mb-1">
                  Districts
                </label>
                <button
                  type="button"
                  id="zone-districts-toggle"
                  (click)="toggleDistrictPicker()"
                  aria-haspopup="listbox"
                  [attr.aria-expanded]="districtPickerOpen()"
                  aria-labelledby="zone-districts-label"
                  class="w-full h-11 flex items-center justify-between gap-3 rounded-xl border bg-[#faf8f6] px-4 text-sm text-left transition-colors cursor-pointer hover:border-[#a53a26]/50 focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20"
                  [class.border-[#a53a26]]="districtPickerOpen()"
                  [class.border-[#f0ebe5]]="!districtPickerOpen()"
                >
                  <span [class.text-[#1d1b2c]]="selectedDistricts().length" [class.text-[#a09eaf]]="!selectedDistricts().length" class="font-semibold truncate">
                    {{ selectedDistricts().length
                      ? selectedDistricts().length + (selectedDistricts().length === 1 ? ' district selected' : ' districts selected')
                      : 'Select districts' }}
                  </span>
                  <svg class="w-4 h-4 text-[#6f6d85] shrink-0 transition-transform" [class.rotate-180]="districtPickerOpen()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>

                @if (districtPickerOpen()) {
                  <div
                    id="zone-districts-panel"
                    class="absolute left-0 right-0 z-30 mt-2 rounded-2xl border border-[#e8e2dc] bg-white p-3 shadow-[0_12px_32px_rgba(33,31,50,0.12)]"
                  >
                    <div class="flex items-center gap-2">
                      <div class="relative flex-1">
                        <svg class="w-4 h-4 text-[#a09eaf] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                          <circle cx="11" cy="11" r="8"></circle>
                          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input
                          type="search"
                          id="zone-districts-filter"
                          [value]="districtFilter()"
                          (input)="districtFilter.set($any($event.target).value)"
                          placeholder="Find a district"
                          aria-label="Find a district"
                          class="w-full h-10 pl-9 pr-3 rounded-xl border border-[#f0ebe5] bg-[#faf8f6] text-xs font-semibold text-[#1d1b2c] focus:outline-none focus:border-[#a53a26] focus:ring-2 focus:ring-[#a53a26]/15"
                        />
                      </div>
                      <button type="button" id="zone-districts-select-all" (click)="selectAllDistricts()" class="h-10 px-3 rounded-xl text-xs font-bold text-[#a53a26] hover:bg-[#faf6f0] cursor-pointer">Select all</button>
                      <button type="button" id="zone-districts-clear" (click)="clearDistricts()" class="h-10 px-3 rounded-xl text-xs font-bold text-[#6f6d85] hover:bg-[#faf8f6] cursor-pointer">Clear</button>
                    </div>

                    <div role="listbox" aria-multiselectable="true" aria-labelledby="zone-districts-label" class="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-64 overflow-y-auto pr-1">
                      @for (district of filteredDistricts(); track district) {
                        <button
                          type="button"
                          role="option"
                          [attr.aria-selected]="isDistrictSelected(district)"
                          [attr.id]="'zone-district-option-' + district"
                          (click)="toggleDistrict(district)"
                          class="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold text-left transition-colors cursor-pointer"
                          [class.border-[#a53a26]]="isDistrictSelected(district)"
                          [class.bg-[#a53a26]/5]="isDistrictSelected(district)"
                          [class.text-[#a53a26]]="isDistrictSelected(district)"
                          [class.border-[#f0ebe5]]="!isDistrictSelected(district)"
                          [class.text-[#1d1b2c]]="!isDistrictSelected(district)"
                          [class.hover:bg-[#faf8f6]]="!isDistrictSelected(district)"
                        >
                          <span
                            class="grid h-4 w-4 shrink-0 place-items-center rounded border"
                            [class.bg-[#a53a26]]="isDistrictSelected(district)"
                            [class.border-[#a53a26]]="isDistrictSelected(district)"
                            [class.border-[#d9d2ca]]="!isDistrictSelected(district)"
                          >
                            @if (isDistrictSelected(district)) {
                              <svg class="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                            }
                          </span>
                          <span class="truncate">{{ district }}</span>
                        </button>
                      } @empty {
                        <p class="col-span-full py-4 text-center text-xs text-[#6f6d85]">No district matches "{{ districtFilter() }}".</p>
                      }
                    </div>

                    <div class="mt-3 flex items-center justify-between border-t border-[#f0ebe5] pt-3">
                      <span class="text-xs font-semibold text-[#6f6d85]">{{ selectedDistricts().length }} of {{ districts.length }} selected</span>
                      <button type="button" id="zone-districts-done" (click)="closeDistrictPicker()" class="h-9 px-4 rounded-full bg-[#a53a26] hover:bg-[#8c2e1d] text-white text-xs font-bold cursor-pointer">Done</button>
                    </div>
                  </div>
                }

                @if (selectedDistricts().length) {
                  <div id="zone-districts-chips" class="mt-2.5 flex flex-wrap gap-1.5">
                    @for (district of selectedDistricts(); track district) {
                      <span class="inline-flex items-center gap-1 rounded-full border border-[#a53a26]/25 bg-[#a53a26]/5 pl-3 pr-1 py-1 text-xs font-semibold text-[#a53a26]">
                        {{ district }}
                        <button type="button" (click)="toggleDistrict(district)" [attr.aria-label]="'Remove ' + district" class="grid h-5 w-5 place-items-center rounded-full hover:bg-[#a53a26]/10 cursor-pointer">
                          <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </span>
                    }
                  </div>
                }

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
  private readonly alerts = inject(DispatchNotificationsService);
  readonly isSaving = signal<boolean>(false);
  editingZoneId: string | null = null;
  readonly districts = CANONICAL_DISTRICTS;

  readonly zones = signal<Zone[]>([]);

  // District picker
  readonly districtPickerOpen = signal(false);
  readonly districtFilter = signal('');
  /** Mirrors the form's districts value so the picker re-renders on change. */
  readonly selectedDistricts = signal<string[]>([]);
  readonly filteredDistricts = computed(() => {
    const q = this.districtFilter().trim().toLowerCase();
    return q ? this.districts.filter((d) => d.toLowerCase().includes(q)) : this.districts;
  });

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
    this.zoneForm.get('districts')!.valueChanges.subscribe((value: string[] | null) =>
      this.selectedDistricts.set(value ?? [])
    );
    this.loadZones();
  }

  isDistrictSelected(district: string): boolean {
    return this.selectedDistricts().includes(district);
  }

  /** Adds or removes a district, keeping the canonical district order. */
  toggleDistrict(district: string): void {
    const current = new Set(this.selectedDistricts());
    if (current.has(district)) current.delete(district);
    else current.add(district);
    this.setDistricts(this.districts.filter((d) => current.has(d)));
  }

  selectAllDistricts(): void {
    const current = new Set([...this.selectedDistricts(), ...this.filteredDistricts()]);
    this.setDistricts(this.districts.filter((d) => current.has(d)));
  }

  clearDistricts(): void {
    this.setDistricts([]);
  }

  toggleDistrictPicker(): void {
    if (this.districtPickerOpen()) this.closeDistrictPicker();
    else this.districtPickerOpen.set(true);
  }

  closeDistrictPicker(): void {
    if (!this.districtPickerOpen()) return;
    this.districtPickerOpen.set(false);
    this.districtFilter.set('');
    this.zoneForm.get('districts')!.markAsTouched();
  }

  private setDistricts(districts: string[]): void {
    const control = this.zoneForm.get('districts')!;
    control.setValue(districts);
    control.markAsDirty();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Element | null;
    if (this.districtPickerOpen() && target?.isConnected && !target.closest('#zone-districts-field')) {
      this.closeDistrictPicker();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeDistrictPicker();
  }

  private loadZones(): void {
    this.dispatchService.listZones().subscribe({
      next: (zones) => this.zones.set(zones),
      error: (err) =>
        this.alerts.toast('error', "Couldn't load delivery zones", err?.error?.message || err?.message || 'Please try again.'),
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
        this.notifySuccess(
          isEditing
            ? `Delivery zone "${zoneName}" updated successfully.`
            : `Delivery zone "${zoneName}" created successfully.`
        );
        this.zoneForm.reset({ name: '', districts: [], served: true, baseFeeLkr: 0 });
        this.loadZones();
      },
      error: (error) => {
        this.isSaving.set(false);
        this.notifyError(
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
        this.notifySuccess(`Delivery zone "${zone.name}" deleted successfully.`);
        this.loadZones();
      },
      error: (error) => this.notifyError(
        error?.error?.message || error?.message || 'Unable to delete the delivery zone.'
      ),
    });
  }

  /** Confirmation for a save/delete: shown as a toast. */
  private notifySuccess(message: string): void {
    this.successMessage.set(message);
    this.alerts.toast('success', message);
  }

  /** Errors are shown as toasts. */
  private notifyError(message: string): void {
    this.mutationError.set(message);
    this.alerts.toast('error', 'Zone update failed', message);
  }
}
