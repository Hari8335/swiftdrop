import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DispatchService } from './dispatch.service';
import { CANONICAL_DISTRICTS, ParcelSize, PricingRule, QuoteResponse } from './dispatch.model';
import { AuthService } from 'shared-auth';

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
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="w-full min-h-screen flex flex-col md:flex-row bg-white font-sans antialiased text-[#1d1b2c]">
      <!-- Slim Left Docked Sidebar Rail (Customer Portal Style) -->
      <aside
        class="w-full md:w-20 bg-[#faf8f6] border-r border-[#f0ebe5] flex md:flex-col items-center justify-between md:justify-start py-4 px-4 md:px-0 gap-6 shrink-0 z-20"
        aria-label="Sidebar Navigation Rail"
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

          <!-- 4. Delivery Zones -->
          <a
            routerLink="/dispatch/zones"
            id="tab-zones-link"
            class="rail-icon-btn relative w-10 h-10 rounded-xl flex items-center justify-center text-[#6f6d85] hover:text-[#a53a26] hover:bg-white transition-all cursor-pointer no-underline"
            title="Delivery Zones Configuration"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
              <line x1="8" y1="2" x2="8" y2="18"></line>
              <line x1="16" y1="6" x2="16" y2="22"></line>
            </svg>
          </a>

          <!-- 5. Pricing Rules - Active -->
          <a
            routerLink="/dispatch/pricing"
            id="tab-pricing-btn"
            class="rail-icon-btn relative w-10 h-10 rounded-xl flex items-center justify-center text-[#a53a26] bg-white transition-all cursor-pointer no-underline shadow-xs"
            title="Pricing Rules Configuration"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
              <line x1="7" y1="7" x2="7.01" y2="7"></line>
            </svg>
            <span class="hidden md:block absolute -right-[1px] top-2 bottom-2 w-1 bg-[#a53a26] rounded-l-full"></span>
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
              placeholder="Search pricing rules, weight bands, size categories..."
              class="w-full pl-11 pr-4 py-2.5 rounded-full bg-[#faf8f6] border border-[#e8e2dc] text-xs font-semibold text-[#1d1b2c] focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] transition-all"
            />
          </div>

          <!-- User Profile & Sign Out Dropdown -->
          <div class="relative self-end sm:self-auto">
            <button
              type="button"
              (click)="toggleProfileMenu()"
              class="flex items-center gap-2.5 p-1.5 pr-3 rounded-full hover:bg-[#faf8f6] border border-transparent hover:border-[#f0ebe5] transition-all cursor-pointer"
            >
              <div
                class="w-8 h-8 rounded-full bg-[#a53a26] text-white font-bold text-xs flex items-center justify-center shadow-xs"
              >
                DP
              </div>
              <span class="text-xs font-bold text-[#1d1b2c] hidden sm:inline">{{ dispatcherDisplayName() }}</span>
              <svg class="w-3.5 h-3.5 text-[#6f6d85]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            @if (profileMenuOpen()) {
              <div
                class="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#f0ebe5] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                <div class="px-4 py-2 border-b border-[#f0ebe5]">
                  <p class="text-xs font-bold text-[#1d1b2c]">{{ dispatcherDisplayName() }}</p>
                  <p class="text-[11px] text-[#6f6d85] font-medium">DISPATCHER • Ops Hub</p>
                </div>
                <button
                  type="button"
                  (click)="logout()"
                  class="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span>Sign out</span>
                </button>
              </div>
            }
          </div>
        </div>

        <!-- Greeting Banner -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1d1b2c]">
              Pricing Rules Configuration
            </h1>
            <p class="text-sm font-medium text-[#6f6d85] mt-1">
              Configure delivery pricing models, weight tiers, and parcel size charges per ADR 003
            </p>
          </div>

          <div class="flex items-center gap-3">
            <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#faf8f6] text-[#6f6d85] border border-[#f0ebe5]">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              Ops Hub • Port 8083
            </span>
            <div class="px-3.5 py-1.5 rounded-full bg-[#faf8f6] border border-[#f0ebe5] text-center">
              <span class="text-xs font-bold text-[#a53a26]">{{ pricingRules().length }} Active Rules</span>
            </div>
          </div>
        </div>

        <!-- Section Heading -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div>
            <h2 class="text-xl sm:text-2xl font-black text-[#1d1b2c] tracking-tight">
              Pricing Surcharge Tiers
            </h2>
            <p class="text-xs text-[#6f6d85] font-medium mt-1">
              Active parcel weight band thresholds and volumetric size surcharges
            </p>
          </div>
        </div>

        <!-- Success Feedback Banner -->
        @if (successMessage(); as msg) {
          <div
            id="pricing-success-banner"
            class="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs font-semibold text-emerald-800 flex items-center justify-between shadow-xs"
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

        <!-- Main Pricing Grid -->
        <div id="pricing" class="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <!-- Existing Pricing Rules Card -->
          <div class="bg-white rounded-3xl border border-[#f0ebe5] p-6 sm:p-7 shadow-xs space-y-5">
            <div class="flex items-center justify-between border-b border-[#f4efe9] pb-3">
              <h2 class="text-base font-bold text-[#1d1b2c]">Configured Pricing Rules</h2>
              <span class="text-xs font-semibold text-[#6f6d85]">{{ pricingRules().length }} rules</span>
            </div>

            <div class="space-y-3">
              @if (dispatchService.isLoadingPricingRules()) {
                <p class="text-xs text-[#6f6d85]">Loading pricing rules...</p>
              } @else if (dispatchService.pricingRulesError()) {
                <p class="text-xs text-rose-600 font-medium">{{ dispatchService.pricingRulesError() }}</p>
              } @else if (pricingRules().length === 0) {
                <p class="text-xs text-[#6f6d85]">No pricing rules configured.</p>
              }
              @for (rule of pricingRules(); track rule.key) {
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
              <h2 class="text-base font-bold text-[#1d1b2c]">
                {{ editingRuleId ? 'Edit pricing rule' : 'Add pricing rule' }}
              </h2>
              <p class="text-xs text-[#6f6d85] mt-0.5">Specify tier thresholds and surcharge rates</p>
            </div>

            <form class="space-y-4" [formGroup]="pricingForm" (ngSubmit)="savePricingRule()">
              @if (mutationError()) {
                <p class="text-xs text-rose-600 font-medium">{{ mutationError() }}</p>
              }

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
            <h2 class="text-base font-bold text-[#1d1b2c]">Try a Quote calculator</h2>
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

          @if (quoteError()) {
            <div id="quote-error" class="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-xs font-semibold text-rose-800" role="alert">
              {{ quoteError() }}
            </div>
          }

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
      </main>
    </div>
  `,
})
export class DispatchPricingComponent {
  readonly dispatchService = inject(DispatchService);
  readonly authService = inject(AuthService, { optional: true });
  readonly router = inject(Router, { optional: true });
  readonly profileMenuOpen = signal(false);

  readonly mutationError = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly isSaving = signal<boolean>(false);
  readonly pricingRules = signal<PricingRule[]>([]);
  editingRuleId: string | null = null;

  readonly canonicalDistricts = CANONICAL_DISTRICTS;
  readonly quoteResult = signal<QuoteResponse | null>(null);
  readonly isCalculatingQuote = signal<boolean>(false);
  readonly quoteError = signal<string | null>(null);

  readonly pricingForm: FormGroup;
  readonly quoteForm: FormGroup;

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
      error: () => undefined,
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
        this.successMessage.set(
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
        this.mutationError.set(
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
        this.successMessage.set(`Pricing rule "${rule.key}" deleted successfully.`);
        this.loadPricingRules();
      },
      error: (error) => this.mutationError.set(
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
          this.quoteError.set('Pricing engine returned an incomplete quote response.');
          return;
        }
        this.quoteResult.set(result);
      },
      error: (error) => {
        this.isCalculatingQuote.set(false);
        if (error?.status === 422) {
          this.quoteError.set(`Pickup district "${pickupDistrict}" is not an active served area.`);
        } else if (error?.status === 404) {
          this.quoteError.set(error?.error?.message || 'Pricing rule or district not found in active configuration.');
        } else {
          this.quoteError.set(error?.error?.message || error?.message || 'Failed to calculate quote from pricing engine.');
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
}
