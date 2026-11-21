import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

import { DispatchService } from './dispatch.service';
import { DispatchPortalState, matchesQuery } from './dispatch-portal.state';
import { DispatchNotificationsService } from './dispatch-notifications.service';
import { CANONICAL_DISTRICTS, ParcelSize, PricingRule, QuoteResponse } from './dispatch.model';

const weightBandBoundsValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  if (control.get('kind')?.value !== 'WEIGHT_BAND') {
    return null;
  }

  const minimum = control.get('minimumWeightKg')?.value;
  const maximum = control.get('maximumWeightKg')?.value;
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)
    || minimum < 0 || maximum <= 0 || maximum <= minimum) {
    return { weightBandBounds: true };
  }

  return null;
};

@Component({
  selector: 'app-dispatch-pricing',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-7">


        <!-- Main Pricing Grid -->
        <div id="pricing" class="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <!-- Existing Pricing Rules Card -->
          <div class="bg-white rounded-3xl border border-[#f0ebe5] p-6 sm:p-7 shadow-xs space-y-5">
            <div class="flex items-center justify-between border-b border-[#f4efe9] pb-3">
              <h3 class="text-base font-extrabold text-[#1d1b2c]">Configured Pricing Rules</h3>
              <span class="text-xs font-semibold text-[#6f6d85]">
                {{ searchQuery() ? filteredPricingRules().length + ' of ' + pricingRules().length : pricingRules().length }} rules
              </span>
            </div>

            <div class="space-y-3">
              @if (dispatchService.isLoadingPricingRules()) {
                <p class="text-xs text-[#6f6d85]">Loading pricing rules...</p>
              } @else if (dispatchService.pricingRulesError()) {
                <p class="text-xs text-[#6f6d85] font-medium">Pricing rules couldn't be loaded. Refresh the page to try again.</p>
              } @else if (pricingRules().length === 0) {
                <p class="text-xs text-[#6f6d85]">No pricing rules configured.</p>
              } @else if (filteredPricingRules().length === 0) {
                <p id="pricing-no-match" class="text-xs text-[#6f6d85]">No pricing rules match "{{ searchQuery() }}".</p>
              }
              @for (rule of filteredPricingRules(); track rule.key) {
                <div class="rounded-2xl bg-[#faf8f6] p-4 border border-[#f0ebe5] hover:border-[#e8e2dc] transition-all">
                  <div class="flex items-center justify-between gap-3">
                    <p class="font-bold text-sm text-[#1d1b2c]">{{ rule.key }}</p>
                    <span class="text-xs font-extrabold text-[#a53a26]">LKR {{ rule.chargeLkr | number: '1.2-2' }}</span>
                  </div>
                  <p class="mt-1 text-xs text-[#6f6d85]">
                    {{ rule.kind === 'SIZE' ? 'Size charge' : (rule.minimumWeightKg + '–' + rule.maximumWeightKg + ' kg weight band') }}
                  </p>
                  <div class="mt-2 flex items-center justify-between">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                      [class]="rule.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'"
                    >
                      {{ rule.active ? 'Active' : 'Inactive' }}
                    </span>
                    <div class="flex gap-3">
                      <button type="button" class="text-xs font-bold text-[#a53a26] hover:underline cursor-pointer" (click)="editPricingRule(rule)">Edit</button>
                      <button type="button" class="text-xs font-bold text-rose-600 hover:underline cursor-pointer" (click)="removePricingRule(rule)">Delete</button>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Add / Edit Pricing Rule Card -->
          <div class="bg-white rounded-3xl border border-[#f0ebe5] p-6 sm:p-7 shadow-xs space-y-5">
            <div class="border-b border-[#f4efe9] pb-3">
              <h3 class="text-base font-extrabold text-[#1d1b2c]">
                {{ editingRuleId ? 'Edit pricing rule' : 'Add pricing rule' }}
              </h3>
              <p class="text-xs text-[#6f6d85] mt-0.5">Specify tier thresholds and surcharge rates</p>
            </div>

            <form class="space-y-4" [formGroup]="pricingForm" (ngSubmit)="savePricingRule()">

              <div>
                <label class="block text-xs font-bold text-[#1d1b2c] mb-1">
                  Rule type
                </label>
                <select
                  id="pricing-kind-select"
                  class="w-full rounded-xl border border-[#e8e2dc] px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] bg-[#faf8f6]"
                  formControlName="kind"
                >
                  <option value="SIZE">Size</option>
                  <option value="WEIGHT_BAND">Weight band</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-[#1d1b2c] mb-1">
                  Key
                </label>
                <input
                  id="pricing-key-input"
                  class="w-full rounded-xl border border-[#e8e2dc] px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] bg-[#faf8f6]"
                  formControlName="key"
                  placeholder="LARGE or UP_TO_5KG"
                />
                @if (pricingForm.get('key')?.invalid && pricingForm.get('key')?.touched) {
                  <p id="pricing-key-error" class="mt-1 text-[11px] text-rose-600 font-medium">Key identifier is required</p>
                }
              </div>

              @if (pricingForm.get('kind')?.value === 'WEIGHT_BAND') {
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-bold text-[#1d1b2c] mb-1">
                      Minimum kg
                    </label>
                    <input
                      id="pricing-min-kg-input"
                      class="w-full rounded-xl border border-[#e8e2dc] px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] bg-[#faf8f6]"
                      type="number"
                      formControlName="minimumWeightKg"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-[#1d1b2c] mb-1">
                      Maximum kg
                    </label>
                    <input
                      id="pricing-max-kg-input"
                      class="w-full rounded-xl border border-[#e8e2dc] px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] bg-[#faf8f6]"
                      type="number"
                      formControlName="maximumWeightKg"
                    />
                  </div>
                </div>
                @if (pricingForm.hasError('weightBandBounds')
                  && (pricingForm.get('minimumWeightKg')?.touched
                    || pricingForm.get('maximumWeightKg')?.touched)) {
                  <p id="pricing-weight-bounds-error" class="text-[11px] text-rose-600 font-medium">
                    Minimum weight must be at least 0, maximum weight must be greater than 0,
                    and maximum weight must be greater than minimum weight
                  </p>
                }
              }

              <div>
                <label class="block text-xs font-bold text-[#1d1b2c] mb-1">
                  Charge (LKR)
                </label>
                <input
                  id="pricing-charge-input"
                  class="w-full rounded-xl border border-[#e8e2dc] px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] bg-[#faf8f6]"
                  type="number"
                  formControlName="chargeLkr"
                  placeholder="250"
                />
                @if (pricingForm.get('chargeLkr')?.invalid && pricingForm.get('chargeLkr')?.touched) {
                  <p id="pricing-charge-error" class="mt-1 text-[11px] text-rose-600 font-medium">Charge must be 0 or greater</p>
                }
              </div>

              <button
                id="add-pricing-submit-btn"
                type="submit"
                [disabled]="pricingForm.invalid || isSaving()"
                class="w-full px-5 py-2.5 rounded-full bg-[#a53a26] hover:bg-[#8c2e1d] text-white font-bold text-xs shadow-sm shadow-[#a53a26]/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {{ isSaving() ? 'Saving...' : (editingRuleId ? 'Save changes' : 'Add pricing rule') }}
              </button>
            </form>
          </div>
        </div>

        <!-- Try a Quote Live Fee Calculator -->
        <div id="quote-calculator" class="bg-white rounded-3xl border border-[#f0ebe5] p-6 sm:p-7 shadow-xs space-y-6">
          <div class="border-b border-[#f4efe9] pb-3">
            <h3 class="text-base font-extrabold text-[#1d1b2c]">Try a Quote calculator</h3>
            <p class="text-xs text-[#6f6d85] mt-1">
              Calculate estimated parcel delivery fees in real time using the backend pricing engine (ADR 003 formula: Drop-off Zone Base Fee + Weight Band Charge + Size Charge).
            </p>
          </div>

          <form [formGroup]="quoteForm" (ngSubmit)="calculateQuote()" class="grid gap-4 md:grid-cols-4 items-end">
            <div>
              <label class="block text-xs font-bold text-[#1d1b2c] mb-1">
                Pickup District
              </label>
              <select
                id="quote-pickup-select"
                formControlName="pickupDistrict"
                class="w-full rounded-xl border border-[#e8e2dc] px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] bg-[#faf8f6]"
              >
                @for (district of canonicalDistricts; track district) {
                  <option [value]="district">{{ district }}</option>
                }
              </select>
              @if (quoteForm.get('pickupDistrict')?.invalid && quoteForm.get('pickupDistrict')?.touched) {
                <p class="mt-1 text-[11px] text-rose-600 font-medium">Pickup district is required</p>
              }
            </div>

            <div>
              <label class="block text-xs font-bold text-[#1d1b2c] mb-1">
                Drop-off District
              </label>
              <select
                id="quote-dropoff-select"
                formControlName="dropoffDistrict"
                class="w-full rounded-xl border border-[#e8e2dc] px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] bg-[#faf8f6]"
              >
                @for (district of canonicalDistricts; track district) {
                  <option [value]="district">{{ district }}</option>
                }
              </select>
              @if (quoteForm.get('dropoffDistrict')?.invalid && quoteForm.get('dropoffDistrict')?.touched) {
                <p class="mt-1 text-[11px] text-rose-600 font-medium">Drop-off district is required</p>
              }
            </div>

            <div>
              <label class="block text-xs font-bold text-[#1d1b2c] mb-1">
                Weight (kg)
              </label>
              <input
                id="quote-weight-input"
                type="number"
                step="any"
                min="0.0001"
                formControlName="weightKg"
                placeholder="e.g. 2.5"
                class="w-full rounded-xl border border-[#e8e2dc] px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] bg-[#faf8f6]"
              />
              @if (quoteForm.get('weightKg')?.invalid && quoteForm.get('weightKg')?.touched) {
                <p class="mt-1 text-[11px] text-rose-600 font-medium">Weight must be greater than 0</p>
              }
            </div>

            <div>
              <label class="block text-xs font-bold text-[#1d1b2c] mb-1">
                Size Category
              </label>
              <select
                id="quote-size-select"
                formControlName="size"
                class="w-full rounded-xl border border-[#e8e2dc] px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] bg-[#faf8f6]"
              >
                <option value="SMALL">SMALL</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LARGE">LARGE</option>
              </select>
              @if (quoteForm.get('size')?.invalid && quoteForm.get('size')?.touched) {
                <p class="mt-1 text-[11px] text-rose-600 font-medium">Size is required</p>
              }
            </div>

            <div class="md:col-span-4 flex items-center gap-3">
              <button
                id="quote-calculate-btn"
                type="submit"
                [disabled]="quoteForm.invalid || isCalculatingQuote()"
                class="px-5 py-2.5 rounded-full bg-[#a53a26] hover:bg-[#8c2e1d] text-white font-bold text-xs shadow-sm shadow-[#a53a26]/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {{ isCalculatingQuote() ? 'Calculating quote...' : 'Calculate Quote' }}
              </button>
              <button
                type="button"
                id="quote-clear-btn"
                class="px-4 py-2 rounded-full border border-[#e8e2dc] text-[#6f6d85] hover:text-[#1d1b2c] hover:bg-[#faf8f6] text-xs font-bold transition-colors cursor-pointer"
                (click)="clearQuote()"
              >
                Clear
              </button>
            </div>
          </form>

          @if (quoteResult(); as result) {
            <div id="quote-result" class="rounded-2xl border border-[#f0ebe5] bg-[#faf8f6] p-5 space-y-4">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f0ebe5] pb-3">
                <div>
                  <p class="text-[10px] uppercase font-bold text-[#a53a26] tracking-wider">Estimated Delivery Quote</p>
                  <div class="flex items-center gap-2 mt-1">
                    <span id="quote-total-fee" class="text-2xl font-black text-[#1d1b2c]">
                      {{ result.currency || 'LKR' }} {{ result.totalFee | number: '1.2-2' }}
                    </span>
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Calculated via Backend
                    </span>
                  </div>
                </div>
                @if (result.pickupZone || result.dropoffZone) {
                  <div class="text-right">
                    <span class="text-xs text-[#6f6d85] font-medium">Route Coverage</span>
                    <p class="text-xs font-bold text-[#1d1b2c]">
                      {{ result.pickupZone || 'Zone' }} to {{ result.dropoffZone || 'Zone' }}
                    </p>
                  </div>
                }
              </div>

              <div class="grid gap-3 sm:grid-cols-3">
                <div class="p-3.5 rounded-xl bg-white border border-[#f0ebe5] shadow-xs">
                  <span class="text-[11px] font-semibold text-[#6f6d85] block">Drop-off Base Fee</span>
                  <span id="quote-base-fee" class="text-sm font-bold text-[#1d1b2c] mt-1 block">
                    {{ result.currency || 'LKR' }} {{ result.breakdown.dropoffZoneBaseFee | number: '1.2-2' }}
                  </span>
                </div>

                <div class="p-3.5 rounded-xl bg-white border border-[#f0ebe5] shadow-xs">
                  <span class="text-[11px] font-semibold text-[#6f6d85] block">Weight Band Charge</span>
                  <span id="quote-weight-fee" class="text-sm font-bold text-[#1d1b2c] mt-1 block">
                    {{ result.currency || 'LKR' }} {{ result.breakdown.weightBandCharge | number: '1.2-2' }}
                  </span>
                </div>

                <div class="p-3.5 rounded-xl bg-white border border-[#f0ebe5] shadow-xs">
                  <span class="text-[11px] font-semibold text-[#6f6d85] block">Size Charge</span>
                  <span id="quote-size-fee" class="text-sm font-bold text-[#1d1b2c] mt-1 block">
                    {{ result.currency || 'LKR' }} {{ result.breakdown.sizeCharge | number: '1.2-2' }}
                  </span>
                </div>
              </div>

              <p class="text-[11px] text-[#6f6d85] italic">
                Formula per ADR 003: Fee = Drop-off Zone Base Fee ({{ result.currency || 'LKR' }} {{ result.breakdown.dropoffZoneBaseFee }}) + Weight Band Charge ({{ result.currency || 'LKR' }} {{ result.breakdown.weightBandCharge }}) + Size Charge ({{ result.currency || 'LKR' }} {{ result.breakdown.sizeCharge }}).
              </p>
            </div>
          }
        </div>
    </div>
  `,
})
export class DispatchPricingComponent {
  readonly dispatchService = inject(DispatchService);

  readonly mutationError = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  private readonly alerts = inject(DispatchNotificationsService);
  readonly isSaving = signal<boolean>(false);
  readonly pricingRules = signal<PricingRule[]>([]);

  /** Shared with the portal's top search bar. */
  readonly searchQuery = inject(DispatchPortalState).queries.pricing;
  readonly filteredPricingRules = computed(() =>
    this.pricingRules().filter((r) =>
      matchesQuery(
        this.searchQuery(),
        r.key,
        r.kind,
        r.kind === 'WEIGHT_BAND' ? 'weight band' : 'size',
        r.chargeLkr,
        r.active ? 'active' : 'inactive'
      )
    )
  );
  editingRuleId: string | null = null;

  readonly canonicalDistricts = CANONICAL_DISTRICTS;
  readonly quoteResult = signal<QuoteResponse | null>(null);
  readonly isCalculatingQuote = signal<boolean>(false);
  readonly quoteError = signal<string | null>(null);

  readonly pricingForm: FormGroup;
  readonly quoteForm: FormGroup;


  constructor(private readonly formBuilder: FormBuilder) {
    this.pricingForm = this.formBuilder.nonNullable.group({
      kind: ['SIZE' as PricingRule['kind'], [Validators.required]],
      key: ['', [Validators.required]],
      minimumWeightKg: [0],
      maximumWeightKg: [0],
      chargeLkr: [0, [Validators.required, Validators.min(0)]],
      active: [true],
    }, { validators: weightBandBoundsValidator });

    this.quoteForm = this.formBuilder.nonNullable.group({
      pickupDistrict: ['Colombo', [Validators.required]],
      dropoffDistrict: ['Kandy', [Validators.required]],
      weightKg: [1.0, [Validators.required, Validators.min(0.0001)]],
      size: ['MEDIUM' as ParcelSize, [Validators.required]],
    });

    this.loadPricingRules();
  }

  private loadPricingRules(): void {
    this.dispatchService.listPricingRules().subscribe({
      next: (rules) => this.pricingRules.set(rules),
      error: (err) =>
        this.alerts.toast('error', "Couldn't load pricing rules", err?.error?.message || err?.message || 'Please try again.'),
    });
  }

  savePricingRule(): void {
    if (this.pricingForm.invalid || this.isSaving()) {
      this.pricingForm.markAllAsTouched();
      return;
    }
    this.mutationError.set(null);
    this.isSaving.set(true);
    const raw = this.pricingForm.getRawValue();
    const request = raw.kind === 'SIZE'
      ? { kind: raw.kind, key: raw.key, chargeLkr: raw.chargeLkr, active: raw.active }
      : raw;
    const isEditing = !!this.editingRuleId;
    const ruleKey = request.key;

    const operation = isEditing
      ? this.dispatchService.updatePricingRule(this.editingRuleId!, request)
      : this.dispatchService.createPricingRule(request);

    operation.subscribe({
      next: () => {
        this.editingRuleId = null;
        this.isSaving.set(false);
        this.notifySuccess(
          isEditing
            ? `Pricing rule "${ruleKey}" updated successfully.`
            : `Pricing rule "${ruleKey}" created successfully.`
        );
        this.pricingForm.reset({
          kind: 'SIZE', key: '', minimumWeightKg: 0, maximumWeightKg: 0, chargeLkr: 0, active: true,
        });
        this.loadPricingRules();
      },
      error: (error) => {
        this.isSaving.set(false);
        this.notifyError(
          error?.error?.message || error?.message || 'Unable to save the pricing rule.'
        );
      },
    });
  }

  editPricingRule(rule: PricingRule): void {
    this.editingRuleId = rule.id;
    this.mutationError.set(null);
    this.pricingForm.setValue({
      kind: rule.kind,
      key: rule.key,
      minimumWeightKg: rule.minimumWeightKg ?? 0,
      maximumWeightKg: rule.maximumWeightKg ?? 0,
      chargeLkr: rule.chargeLkr,
      active: rule.active,
    });
  }

  removePricingRule(rule: PricingRule): void {
    if (!window.confirm(`Delete pricing rule ${rule.key}?`)) {
      return;
    }
    this.mutationError.set(null);
    this.dispatchService.deletePricingRule(rule.id).subscribe({
      next: () => {
        this.notifySuccess(`Pricing rule "${rule.key}" deleted successfully.`);
        this.loadPricingRules();
      },
      error: (error) => this.notifyError(
        error?.error?.message || error?.message || 'Unable to delete the pricing rule.'
      ),
    });
  }

  calculateQuote(): void {
    if (this.quoteForm.invalid || this.isCalculatingQuote()) {
      this.quoteForm.markAllAsTouched();
      return;
    }

    const { pickupDistrict, dropoffDistrict, weightKg, size } = this.quoteForm.getRawValue();
    this.isCalculatingQuote.set(true);
    this.quoteError.set(null);
    this.quoteResult.set(null);

    this.dispatchService.calculateQuote(pickupDistrict, dropoffDistrict, Number(weightKg), size).subscribe({
      next: (result) => {
        this.isCalculatingQuote.set(false);
        if (!result || typeof result.totalFee !== 'number' || !result.breakdown) {
          this.setQuoteError('Pricing engine returned an incomplete quote response.');
          return;
        }
        this.quoteResult.set(result);
      },
      error: (error) => {
        this.isCalculatingQuote.set(false);
        if (error?.status === 422) {
          this.setQuoteError(`Pickup district "${pickupDistrict}" is not an active served area.`);
        } else if (error?.status === 404) {
          this.setQuoteError(error?.error?.message || 'Pricing rule or district not found in active configuration.');
        } else {
          this.setQuoteError(error?.error?.message || error?.message || 'Failed to calculate quote from pricing engine.');
        }
      },
    });
  }

  clearQuote(): void {
    this.quoteResult.set(null);
    this.quoteError.set(null);
    this.quoteForm.reset({
      pickupDistrict: 'Colombo',
      dropoffDistrict: 'Kandy',
      weightKg: 1.0,
      size: 'MEDIUM',
    });
    this.quoteForm.markAsPristine();
    this.quoteForm.markAsUntouched();
  }

  /** Confirmation for a save/delete: shown as a toast. */
  private notifySuccess(message: string): void {
    this.successMessage.set(message);
    this.alerts.toast('success', message);
  }

  /** Errors are shown as toasts. */
  private notifyError(message: string): void {
    this.mutationError.set(message);
    this.alerts.toast('error', 'Pricing rule update failed', message);
  }

  /** Quote problems are shown as toasts. */
  private setQuoteError(message: string): void {
    this.quoteError.set(message);
    this.alerts.toast('error', "Couldn't calculate the quote", message);
  }
}
