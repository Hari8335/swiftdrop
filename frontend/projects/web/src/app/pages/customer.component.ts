import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from 'shared-auth';
import { CustomerSidebarComponent, CustomerSidebarItem } from './customer/customer-sidebar.component';
import { CustomerTopbarComponent } from './customer/customer-topbar.component';
import { CustomerChangePasswordComponent } from './customer/customer-change-password.component';
import {
  AddressDto,
  CreateCustomerParcelRequest,
  CustomerAddress,
  CustomerParcel,
  CustomerParcelPage,
  District,
  FeePreview,
  ParcelSize,
  ParcelStatus,
  SRI_LANKA_DISTRICTS,
} from './customer/customer.model';
import { CustomerService } from './customer/customer.service';

type CustomerTab = 'deliveries' | 'wizard' | 'addresses' | 'settings';
type SettingsSection = 'profile' | 'addresses' | 'security';

@Component({
  selector: 'app-customer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CustomerSidebarComponent, CustomerTopbarComponent, CustomerChangePasswordComponent],
  template: `
    <!-- Full-Screen Customer Dashboard Layout -->
    <div class="w-full min-h-screen flex flex-col md:flex-row bg-white">
      <app-customer-sidebar
        [active]="sidebarActive()"
        (deliveries)="activeTab.set('deliveries')"
        (newDelivery)="startNewDelivery()"
        (settings)="openSettings()"
        (signOut)="signOut()"
      ></app-customer-sidebar>

      <!-- Main Content Area (Edge-to-Edge Full Screen) -->
      <main class="flex-1 min-h-screen min-w-0 bg-white flex flex-col">
        <app-customer-topbar
          [name]="customerName()"
          [email]="customerEmail()"
          (settings)="openSettings()"
          (logout)="requestSignOut()"
        >
            <!-- Search Input -->
            <div class="relative w-full max-w-lg">
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
                [(ngModel)]="searchQuery"
                placeholder="Search for parcel numbers, shippers, carriers ..."
                class="w-full pl-11 pr-4 py-2.5 rounded-full bg-[#faf8f6] border border-[#e8e2dc] text-xs font-semibold text-[#1d1b2c] focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] transition-all"
              />
            </div>
        </app-customer-topbar>

        <div class="flex-1 p-6 sm:p-8 lg:p-10 space-y-7">
          <!-- Toast Notification -->
          @if (notification()) {
          <div
            id="toast-notification"
            class="toast-alert bg-[#faf6f0] border border-[#a53a26]/20 text-[#1d1b2c] px-5 py-3.5 rounded-2xl flex items-center justify-between text-sm shadow-sm transition-all"
          >
            <div class="flex items-center gap-3 font-semibold">
              <div class="w-7 h-7 rounded-full bg-[#a53a26]/10 text-[#a53a26] flex items-center justify-center flex-shrink-0">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <span>{{ notification() }}</span>
            </div>
            <button
              type="button"
              (click)="notification.set(null)"
              class="text-[#6f6d85] hover:text-[#1d1b2c] font-bold p-1 rounded-lg transition-colors cursor-pointer"
              aria-label="Dismiss notification"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          }

          <!-- ================================================================= -->
          <!-- VIEW 1: MY DELIVERIES (Matching Reference Screenshot)              -->
          <!-- ================================================================= -->
          @if (activeTab() === 'deliveries') {
          <div class="space-y-6">
            <!-- Greeting Banner & Header Actions -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 class="text-2xl sm:text-3xl font-black text-[#1d1b2c] tracking-tight">
                  Welcome back, {{ customerName() }}!
                </h1>
                <p class="text-xs text-[#6f6d85] font-semibold mt-1">Track and manage your SwiftDrop parcel deliveries</p>
              </div>
            </div>

            <!-- Two Hero Cards Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <!-- Hero Card 1: Active In-Delivery Card with 3D Isometric Parcels -->
              <div
                class="hero-summary-card bg-white rounded-3xl p-6 sm:p-7 border border-[#eee7e0] shadow-sm flex flex-col justify-between relative overflow-hidden"
              >
                <!-- Card Header with Large Stat & 3D Isometric Graphic -->
                <div class="flex items-start justify-between relative z-10">
                  <div>
                    <div class="flex items-baseline">
                      <span class="text-5xl font-black text-[#1d1b2c] tracking-tight">
                        {{ activeDeliveriesCount() }}
                      </span>
                      <span class="text-sm font-bold text-[#6f6d85] ml-2">in delivery today</span>
                    </div>
                    <p class="text-xs text-[#6f6d85] font-medium mt-3 max-w-xs leading-relaxed">
                      @if (activeDeliveriesCount() > 0) {
                        Your active shipments are currently in transit with assigned couriers across Sri Lanka.
                      } @else {
                        No active shipments out for delivery today. All recent deliveries are up to date.
                      }
                    </p>
                  </div>

                  <!-- 3D Isometric Parcels Graphic (Terracotta & White Cubes) -->
                  <div class="relative w-28 h-28 flex-shrink-0 -mt-2 -mr-1">
                    <svg class="w-full h-full drop-shadow-md" viewBox="0 0 160 140" fill="none">
                      <!-- Terracotta Isometric Cube (Back/Higher) -->
                      <g transform="translate(68, 15)">
                        <!-- Top Face -->
                        <polygon points="40,0 80,20 40,40 0,20" fill="#a53a26" />
                        <!-- Left Face -->
                        <polygon points="0,20 40,40 40,84 0,64" fill="#7e2615" />
                        <!-- Right Face -->
                        <polygon points="40,40 80,20 80,64 40,84" fill="#5c1b0f" />
                      </g>
                      <!-- White/Sand Isometric Cube (Front/Lower) -->
                      <g transform="translate(15, 45)">
                        <!-- Top Face -->
                        <polygon points="34,0 68,17 34,34 0,17" fill="#ffffff" stroke="#eee7e0" stroke-width="0.5" />
                        <!-- Left Face -->
                        <polygon points="0,17 34,34 34,72 0,55" fill="#f8f6f4" stroke="#eee7e0" stroke-width="0.5" />
                        <!-- Right Face -->
                        <polygon points="34,34 68,17 68,55 34,72" fill="#e8e2dc" stroke="#eee7e0" stroke-width="0.5" />
                      </g>
                    </svg>
                  </div>
                </div>

                <!-- Action Buttons Row -->
                <div class="flex items-center gap-3 pt-5 relative z-10">
                  <button
                    type="button"
                    (click)="startNewDelivery()"
                    class="px-5 py-2.5 rounded-full bg-[#a53a26] hover:bg-[#7e2615] text-white font-bold text-xs transition-all shadow-sm hover:scale-[1.02] active:scale-95 cursor-pointer"
                  >
                    Book Delivery
                  </button>
                  <button
                    type="button"
                    id="hero-add-address-btn"
                    (click)="openAddressModal()"
                    class="px-5 py-2.5 rounded-full border border-[#a53a26] text-[#a53a26] hover:bg-[#faf6f0] font-bold text-xs transition-all cursor-pointer"
                  >
                    Add Address
                  </button>
                </div>
              </div>

              <!-- Hero Card 2: Quick Tracking Card (Matching Logo Terracotta #a53a26) -->
              <div
                class="hero-track-card bg-[#a53a26] rounded-3xl p-6 sm:p-7 text-white shadow-md shadow-[#a53a26]/20 flex flex-col justify-between space-y-4"
              >
                <div>
                  <span class="text-[10px] font-black uppercase tracking-widest text-white/70 block mb-1">
                    Direct Search
                  </span>
                  <h3 class="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug max-w-sm">
                    Enter your parcel number to track your deliveries
                  </h3>
                </div>

                <div class="flex flex-col sm:flex-row items-center gap-2 pt-2">
                  <input
                    type="text"
                    [(ngModel)]="quickTrackNumber"
                    (keyup.enter)="trackParcelByNumber()"
                    placeholder="Enter parcel number"
                    class="w-full sm:flex-1 px-4 py-2.5 rounded-full bg-white text-[#1d1b2c] placeholder:text-[#a09eaf] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-white/80 shadow-inner"
                  />
                  <button
                    type="button"
                    (click)="trackParcelByNumber()"
                    class="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#1d1b2c] hover:bg-black text-white font-black text-xs transition-all shadow-md cursor-pointer hover:scale-[1.02] active:scale-95"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>

            <!-- Recent Deliveries Section -->
            <div class="recent-deliveries-card bg-white rounded-3xl border border-[#eee7e0] p-6 sm:p-7 shadow-sm space-y-5">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 class="text-lg font-black text-[#1d1b2c] tracking-tight">Your recent deliveries</h2>

                <!-- Status Filter Pills -->
                <div class="flex flex-wrap items-center gap-1.5">
                  @for (st of statusFilters; track $index) {
                  <button
                    type="button"
                    (click)="selectedStatusFilter.set(st.value); selectedParcelPage.set(0); loadParcels()"
                    [class.filter-active]="selectedStatusFilter() === st.value"
                    class="filter-pill px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
                  >
                    {{ st.label }}
                  </button>
                  }
                </div>
              </div>

              <!-- Deliveries Table Matching Reference Format -->
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-[#1d1b2c]">
                  <thead class="border-b border-[#f0ebe5] text-[11px] font-bold text-[#6f6d85]">
                    <tr>
                      <th class="py-3 px-4">Delivery date</th>
                      <th class="py-3 px-4">Shipper</th>
                      <th class="py-3 px-4">Carrier</th>
                      <th class="py-3 px-4">Parcel Number</th>
                      <th class="py-3 px-4">Status</th>
                      <th class="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#f7f4f0] font-semibold">
                    @if (filteredParcels().length === 0) {
                    <tr>
                      <td colspan="6" class="py-12 text-center text-[#6f6d85]">
                        <p class="text-sm font-bold text-[#1d1b2c]">No deliveries found</p>
                        <p class="text-xs text-[#a09eaf] mt-1">Book your first parcel delivery using the plus button!</p>
                      </td>
                    </tr>
                    } @for (parcel of filteredParcels(); track parcel.id) {
                    <tr class="hover:bg-[#faf8f6]/80 transition-colors">
                      <td class="py-3.5 px-4 text-[#6f6d85]">
                        {{ formatParcelDate(parcel.createdAt) }}
                      </td>
                      <td class="py-3.5 px-4 font-bold text-[#1d1b2c]">
                        {{ parcel.pickupAddress.district }} Depot
                      </td>
                      <td class="py-3.5 px-4 text-[#1d1b2c]">
                        SwiftDrop Express
                      </td>
                      <td class="py-3.5 px-4">
                        <span class="font-mono font-bold text-xs text-[#a53a26] bg-[#faf6f0] px-2 py-0.5 rounded-md border border-[#a53a26]/10">
                          {{ parcel.trackingNumber }}
                        </span>
                      </td>
                      <td class="py-3.5 px-4">
                        <span
                          class="status-badge-ref inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                          [ngClass]="getStatusBadgeClass(parcel.status)"
                        >
                          {{ parcel.status === 'IN_TRANSIT' ? 'IN DELIVERY' : parcel.status }}
                        </span>
                      </td>
                      <td class="py-3.5 px-4 text-right">
                        <div class="inline-flex items-center justify-end gap-2">
                          @if (parcel.status === 'CREATED') {
                          <button
                            type="button"
                            (click)="openCancelModal(parcel)"
                            class="px-2.5 py-1 rounded-lg border border-[#d8d0c7] hover:border-rose-400 text-[#6f6d85] hover:text-rose-600 bg-transparent font-semibold text-xs transition-colors cursor-pointer inline-flex items-center"
                            data-testid="open-cancel-modal-btn"
                          >
                            Cancel
                          </button>
                          }
                          <button
                            type="button"
                            (click)="viewParcelDetails(parcel)"
                            class="px-2.5 py-1 rounded-lg border border-[#d8d0c7] hover:border-[#a53a26] text-[#1d1b2c] hover:text-[#a53a26] bg-transparent font-semibold text-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                          >
                            <span>View details</span>
                            <svg class="w-3 h-3 text-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                              <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                    }
                  </tbody>
                </table>
              </div>

              <!-- Pagination / Show all -->
              <div class="flex items-center justify-between pt-2 border-t border-[#f0ebe5] text-xs font-bold text-[#6f6d85]">
                <button
                  type="button"
                  (click)="selectedStatusFilter.set(null); loadParcels()"
                  class="text-[#a53a26] hover:text-[#7e2615] hover:underline cursor-pointer"
                >
                  Show all &gt;
                </button>
                @if (parcelPage().totalPages > 1) {
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    (click)="changeParcelPage(parcelPage().page - 1)"
                    [disabled]="parcelPage().page === 0"
                    class="px-3 py-1 rounded-full border border-[#e2e8f0] bg-white text-[#1d1b2c] hover:bg-[#f1f5f9] disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <span>{{ parcelPage().page + 1 }} / {{ parcelPage().totalPages }}</span>
                  <button
                    type="button"
                    (click)="changeParcelPage(parcelPage().page + 1)"
                    [disabled]="parcelPage().page >= parcelPage().totalPages - 1"
                    class="px-3 py-1 rounded-full border border-[#e2e8f0] bg-white text-[#1d1b2c] hover:bg-[#f1f5f9] disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
                }
              </div>
            </div>
          </div>
          }

          <!-- ================================================================= -->
          <!-- VIEW 2: NEW DELIVERY WIZARD                                       -->
          <!-- ================================================================= -->
          @if (activeTab() === 'wizard') {
          <div class="bg-white rounded-3xl border border-[#e8e2dc] shadow-sm p-6 sm:p-8 space-y-8">
            <!-- Stepper Progress Tracker -->
            <div class="wizard-stepper space-y-3">
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold text-[#6f6d85]">
                <div class="step-label flex items-center gap-2" [class.step-active]="wizardStep() >= 1">
                  <span class="step-num w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black" [class.num-active]="wizardStep() >= 1">1</span>
                  <span>Route & Addresses</span>
                </div>
                <div class="step-label flex items-center gap-2" [class.step-active]="wizardStep() >= 2">
                  <span class="step-num w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black" [class.num-active]="wizardStep() >= 2">2</span>
                  <span>Parcel & Contact</span>
                </div>
                <div class="step-label flex items-center gap-2" [class.step-active]="wizardStep() >= 3">
                  <span class="step-num w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black" [class.num-active]="wizardStep() >= 3">3</span>
                  <span>Instant Quote</span>
                </div>
                <div class="step-label flex items-center gap-2" [class.step-active]="wizardStep() >= 4">
                  <span class="step-num w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black" [class.num-active]="wizardStep() >= 4">4</span>
                  <span>Confirmation</span>
                </div>
              </div>
              <div class="h-2 w-full bg-[#f1f5f9] rounded-full overflow-hidden">
                <div
                  class="h-full bg-[#a53a26] transition-all duration-300 rounded-full"
                  [style.width.%]="(wizardStep() / 4) * 100"
                ></div>
              </div>
            </div>

            <!-- STEP 1: ROUTE & ADDRESSES -->
            @if (wizardStep() === 1) {
            <div class="space-y-6">
              <div class="border-b border-[#eee7e0] pb-4">
                <span class="card-pill">Step 1 of 4</span>
                <h2 class="text-xl font-black text-[#1d1b2c] tracking-tight mt-1">Origin & Destination</h2>
                <p class="text-xs text-[#6f6d85] mt-1 font-medium">
                  Specify pickup origin and delivery dropoff. Sri Lanka district routing enforces ADR 002.
                </p>
              </div>

              <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- Pickup Address -->
                <div class="space-y-4 p-6 rounded-2xl bg-[#faf8f6] border border-[#eee7e0]">
                  <div class="flex items-center justify-between">
                    <h3 class="text-sm font-black text-[#1d1b2c] flex items-center gap-2">
                      <span class="w-7 h-7 rounded-xl bg-[#a53a26] text-white flex items-center justify-center text-xs font-black">
                        A
                      </span>
                      Pickup Origin (Sender)
                    </h3>
                    @if (addresses().length > 0) {
                    <select
                      (change)="selectSavedAddress('pickup', $any($event.target).value)"
                      class="text-xs bg-white border border-[#e2e8f0] rounded-xl px-3 py-1.5 font-bold text-[#a53a26] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 cursor-pointer"
                    >
                      <option value="">Quick fill from Address Book...</option>
                      @for (a of addresses(); track a.id) {
                      <option [value]="a.id">{{ a.label }} ({{ a.district }})</option>
                      }
                    </select>
                    }
                  </div>

                  <div class="space-y-3.5 text-xs font-bold text-[#1d1b2c]">
                    <div>
                      <label class="block mb-1 text-[#3a384e]">Street Address Line 1 *</label>
                      <input
                        type="text"
                        id="pickup-line1"
                        [(ngModel)]="wizardData.pickupAddress.line1"
                        placeholder="e.g. 142 Havelock Road"
                        class="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm font-semibold text-[#1d1b2c] focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] focus:outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label class="block mb-1 text-[#3a384e]">Street Address Line 2 (Optional)</label>
                      <input
                        type="text"
                        [(ngModel)]="wizardData.pickupAddress.line2"
                        placeholder="Apartment, suite, unit, etc."
                        class="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm font-semibold text-[#1d1b2c] focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] focus:outline-none transition-all"
                      />
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label class="block mb-1 text-[#3a384e]">City *</label>
                        <input
                          type="text"
                          [(ngModel)]="wizardData.pickupAddress.city"
                          placeholder="e.g. Colombo 05"
                          class="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm font-semibold text-[#1d1b2c] focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] focus:outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label class="block mb-1 text-[#3a384e]">Postal Code *</label>
                        <input
                          type="text"
                          [(ngModel)]="wizardData.pickupAddress.postalCode"
                          placeholder="e.g. 00500"
                          class="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm font-semibold text-[#1d1b2c] focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label class="block mb-1 text-[#3a384e]">District (ADR 002) *</label>
                      <select
                        id="pickup-district"
                        [(ngModel)]="wizardData.pickupAddress.district"
                        (change)="updateFeePreview()"
                        class="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm font-bold text-[#1d1b2c] focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] focus:outline-none transition-all cursor-pointer"
                      >
                        @for (d of districts; track d) {
                        <option [value]="d">{{ d }}</option>
                        }
                      </select>
                    </div>
                  </div>
                </div>

                <!-- Dropoff Address -->
                <div class="space-y-4 p-6 rounded-2xl bg-[#faf8f6] border border-[#eee7e0]">
                  <div class="flex items-center justify-between">
                    <h3 class="text-sm font-black text-[#1d1b2c] flex items-center gap-2">
                      <span class="w-7 h-7 rounded-xl bg-[#2e7d32] text-white flex items-center justify-center text-xs font-black">
                        B
                      </span>
                      Dropoff Destination (Recipient)
                    </h3>
                    @if (addresses().length > 0) {
                    <select
                      (change)="selectSavedAddress('dropoff', $any($event.target).value)"
                      class="text-xs bg-white border border-[#e2e8f0] rounded-xl px-3 py-1.5 font-bold text-[#a53a26] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 cursor-pointer"
                    >
                      <option value="">Quick fill from Address Book...</option>
                      @for (a of addresses(); track a.id) {
                      <option [value]="a.id">{{ a.label }} ({{ a.district }})</option>
                      }
                    </select>
                    }
                  </div>

                  <div class="space-y-3.5 text-xs font-bold text-[#1d1b2c]">
                    <div>
                      <label class="block mb-1 text-[#3a384e]">Street Address Line 1 *</label>
                      <input
                        type="text"
                        id="dropoff-line1"
                        [(ngModel)]="wizardData.dropoffAddress.line1"
                        placeholder="e.g. 88 Kandy Road"
                        class="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm font-semibold text-[#1d1b2c] focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] focus:outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label class="block mb-1 text-[#3a384e]">Street Address Line 2 (Optional)</label>
                      <input
                        type="text"
                        [(ngModel)]="wizardData.dropoffAddress.line2"
                        placeholder="Apartment, building, gate, etc."
                        class="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm font-semibold text-[#1d1b2c] focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] focus:outline-none transition-all"
                      />
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label class="block mb-1 text-[#3a384e]">City *</label>
                        <input
                          type="text"
                          [(ngModel)]="wizardData.dropoffAddress.city"
                          placeholder="e.g. Kadugannawa"
                          class="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm font-semibold text-[#1d1b2c] focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] focus:outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label class="block mb-1 text-[#3a384e]">Postal Code *</label>
                        <input
                          type="text"
                          [(ngModel)]="wizardData.dropoffAddress.postalCode"
                          placeholder="e.g. 20300"
                          class="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm font-semibold text-[#1d1b2c] focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label class="block mb-1 text-[#3a384e]">District (ADR 002) *</label>
                      <select
                        id="dropoff-district"
                        [(ngModel)]="wizardData.dropoffAddress.district"
                        (change)="updateFeePreview()"
                        class="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm font-bold text-[#1d1b2c] focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] focus:outline-none transition-all cursor-pointer"
                      >
                        @for (d of districts; track d) {
                        <option [value]="d">{{ d }}</option>
                        }
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div class="flex justify-end pt-4">
                <button
                  type="button"
                  id="wizard-step1-next"
                  (click)="goToStep(2)"
                  [disabled]="!isStep1Valid()"
                  class="action-pill-btn px-7 py-3 bg-[#1d1b2c] hover:bg-black disabled:opacity-40 text-white font-bold text-sm rounded-full shadow-sm transition-all cursor-pointer"
                >
                  Continue to Parcel Details →
                </button>
              </div>
            </div>
            }

            <!-- STEP 2: PARCEL DETAILS -->
            @if (wizardStep() === 2) {
            <div class="space-y-6">
              <div class="border-b border-[#eee7e0] pb-4">
                <span class="card-pill">Step 2 of 4</span>
                <h2 class="text-xl font-black text-[#1d1b2c] tracking-tight mt-1">Package & Recipient Info</h2>
                <p class="text-xs text-[#6f6d85] mt-1 font-medium">
                  Select package size tier, weight, and enter recipient contact numbers for courier coordination.
                </p>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <!-- Package Spec -->
                <div class="space-y-5">
                  <div>
                    <label class="block text-xs font-bold text-[#1d1b2c] mb-2.5">Package Size Tier *</label>
                    <div class="grid grid-cols-3 gap-3">
                      @for (tier of sizeTiers; track tier.size) {
                      <button
                        type="button"
                        (click)="wizardData.size = tier.size; updateFeePreview()"
                        [class.size-tier-active]="wizardData.size === tier.size"
                        class="size-tier-card p-3.5 text-left border border-[#e2e8f0] rounded-2xl bg-white hover:border-[#a53a26]/50 transition-all cursor-pointer"
                      >
                        <div class="font-black text-xs text-[#1d1b2c]">{{ tier.label }}</div>
                        <div class="text-[10px] text-[#6f6d85] mt-1 leading-snug">{{ tier.desc }}</div>
                        <div class="text-[10px] font-bold text-[#a53a26] mt-2.5">{{ tier.surcharge }}</div>
                      </button>
                      }
                    </div>
                  </div>

                  <div class="p-4 rounded-2xl bg-[#faf8f6] border border-[#eee7e0] space-y-2">
                    <div class="flex items-center justify-between text-xs font-bold text-[#1d1b2c]">
                      <span>Package Weight:</span>
                      <span class="text-[#a53a26] font-mono text-sm">{{ wizardData.weightKg }} kg</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="50"
                      step="0.1"
                      [(ngModel)]="wizardData.weightKg"
                      (input)="updateFeePreview()"
                      class="w-full accent-[#a53a26] cursor-pointer"
                    />
                    <div class="flex justify-between text-[10px] text-[#6f6d85] font-bold">
                      <span>0.1 kg</span>
                      <span>25 kg</span>
                      <span>50 kg</span>
                    </div>
                  </div>
                </div>

                <!-- Recipient Spec -->
                <div class="space-y-3.5 text-xs font-bold text-[#1d1b2c]">
                  <div>
                    <label class="block mb-1 text-[#3a384e]">Recipient Full Name *</label>
                    <input
                      type="text"
                      id="recipient-name"
                      [(ngModel)]="wizardData.recipientName"
                      placeholder="e.g. Sunil Silva"
                      class="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm font-semibold text-[#1d1b2c] focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label class="block mb-1 text-[#3a384e]">Recipient Mobile Phone *</label>
                    <input
                      type="text"
                      id="recipient-phone"
                      [(ngModel)]="wizardData.recipientPhone"
                      placeholder="e.g. +94771234567"
                      class="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm font-semibold text-[#1d1b2c] focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label class="block mb-1 text-[#3a384e]">Special Delivery Instructions (Optional)</label>
                    <textarea
                      rows="2"
                      [(ngModel)]="wizardData.notes"
                      placeholder="e.g. Gate code #1234, ring bell twice"
                      class="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm font-semibold text-[#1d1b2c] focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] focus:outline-none transition-all"
                    ></textarea>
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-between pt-4">
                <button
                  type="button"
                  (click)="goToStep(1)"
                  class="px-5 py-2.5 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#1d1b2c] font-bold text-sm rounded-full transition-all cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  id="wizard-step2-next"
                  (click)="goToStep(3)"
                  [disabled]="!isStep2Valid()"
                  class="action-pill-btn px-7 py-3 bg-[#1d1b2c] hover:bg-black disabled:opacity-40 text-white font-bold text-sm rounded-full shadow-sm transition-all cursor-pointer"
                >
                  Review Fee Preview →
                </button>
              </div>
            </div>
            }

            <!-- STEP 3: FEE PREVIEW -->
            @if (wizardStep() === 3) {
            <div class="space-y-6">
              <div class="border-b border-[#eee7e0] pb-4">
                <span class="card-pill">Step 3 of 4</span>
                <h2 class="text-xl font-black text-[#1d1b2c] tracking-tight mt-1">Instant Pricing Quote</h2>
                <p class="text-xs text-[#6f6d85] mt-1 font-medium">
                  Guaranteed frozen delivery fee calculated via ADR 003 formula before booking commitment.
                </p>
              </div>

              @if (isLoadingQuote()) {
              <div class="p-10 text-center bg-[#faf8f6] rounded-3xl border border-[#eee7e0] space-y-3">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#a53a26] border-t-transparent"></div>
                <p class="text-sm font-bold text-[#1d1b2c]">Calculating instant delivery fee quote from backend...</p>
              </div>
              } @else if (quoteError()) {
              <div class="p-6 bg-rose-50 border border-rose-200 rounded-3xl space-y-3">
                <div class="flex items-center gap-2 text-rose-800 font-bold text-sm">
                  <svg class="w-4 h-4 text-rose-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <span id="quote-error-title">{{ quoteErrorUnserved() ? "We can't deliver this parcel" : 'Quote Calculation Notice' }}</span>
                </div>
                <p id="quote-error-message" class="text-xs text-rose-700 font-medium">{{ quoteError() }}</p>
                @if (quoteErrorUnserved()) {
                <button
                  type="button"
                  id="change-addresses-btn"
                  (click)="wizardStep.set(1)"
                  class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-full transition-all cursor-pointer"
                >
                  Change addresses
                </button>
                } @else {
                <button
                  type="button"
                  id="retry-quote-btn"
                  (click)="updateFeePreview()"
                  class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-full transition-all cursor-pointer"
                >
                  Retry Quote
                </button>
                }
              </div>
              } @else if (feePreview(); as quote) {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <!-- Route Card -->
                <div class="bg-[#faf8f6] p-6 rounded-3xl border border-[#eee7e0] space-y-5">
                  <span class="card-pill">Route Overview</span>

                  <div class="flex items-center gap-4">
                    <div class="flex flex-col items-center">
                      <div class="w-3.5 h-3.5 rounded-full bg-[#a53a26] ring-4 ring-[#a53a26]/20"></div>
                      <div class="w-0.5 h-12 bg-[#e2e8f0] my-1"></div>
                      <div class="w-3.5 h-3.5 rounded-full bg-[#2e7d32] ring-4 ring-[#2e7d32]/20"></div>
                    </div>

                    <div class="space-y-4 text-xs">
                      <div>
                        <div class="font-black text-[#1d1b2c] text-sm">
                          {{ quote.pickupDistrict }} District
                        </div>
                        <div class="text-[#6f6d85] font-medium mt-0.5">
                          {{ wizardData.pickupAddress.line1 }}, {{ wizardData.pickupAddress.city }}
                        </div>
                      </div>
                      <div>
                        <div class="font-black text-[#1d1b2c] text-sm">
                          {{ quote.dropoffDistrict }} District
                        </div>
                        <div class="text-[#6f6d85] font-medium mt-0.5">
                          {{ wizardData.dropoffAddress.line1 }}, {{ wizardData.dropoffAddress.city }}
                        </div>
                      </div>
                    </div>
                  </div>

                  @if (quote.pickupZone || quote.dropoffZone) {
                  <div class="pt-3 border-t border-[#eee7e0] flex items-center justify-between text-xs text-[#6f6d85] font-medium">
                    <span>Zone Routing:</span>
                    <span class="font-bold text-[#1d1b2c]">
                      {{ quote.pickupZone || quote.pickupDistrict }} → {{ quote.dropoffZone || quote.dropoffDistrict }}
                    </span>
                  </div>
                  }
                </div>

                <!-- Price Breakdown Card -->
                <div class="bg-[#1d1b2c] text-white p-6 sm:p-7 rounded-3xl shadow-xl shadow-[#1d1b2c]/20 space-y-5">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-[#a09eaf] uppercase tracking-wider">
                      Price Calculation
                    </span>
                    <span class="text-xs font-bold bg-[#a53a26] text-white px-3 py-1 rounded-full">
                      ADR 003 Frozen
                    </span>
                  </div>

                  <div class="space-y-3 text-xs">
                    <div class="flex justify-between text-[#c4c2d4] font-medium">
                      <span>Drop-off Zone Base Fee</span>
                      <span class="font-mono text-white">{{ quote.currency }} {{ quote.breakdown.dropoffZoneBaseFee.toFixed(2) }}</span>
                    </div>
                    <div class="flex justify-between text-[#c4c2d4] font-medium">
                      <span>Weight Band Charge ({{ quote.weightKg }} kg)</span>
                      <span class="font-mono text-white">{{ quote.currency }} {{ quote.breakdown.weightBandCharge.toFixed(2) }}</span>
                    </div>
                    <div class="flex justify-between text-[#c4c2d4] font-medium">
                      <span>Size Tier Charge ({{ quote.size }})</span>
                      <span class="font-mono text-white">{{ quote.currency }} {{ quote.breakdown.sizeCharge.toFixed(2) }}</span>
                    </div>

                    <div class="pt-4 border-t border-white/10 flex items-center justify-between">
                      <span class="text-sm font-bold text-white">Total Delivery Fee</span>
                      <span id="wizard-total-fee" class="text-2xl font-black text-white font-mono">
                        {{ quote.currency }} {{ quote.totalFee.toFixed(2) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              }

              <div class="flex items-center justify-between pt-4">
                <button
                  type="button"
                  (click)="goToStep(2)"
                  class="px-5 py-2.5 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#1d1b2c] font-bold text-sm rounded-full transition-all cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  id="wizard-step3-next"
                  (click)="goToStep(4)"
                  [disabled]="isLoadingQuote() || !feePreview() || !!quoteError()"
                  class="action-pill-btn px-7 py-3 bg-[#1d1b2c] hover:bg-black disabled:opacity-40 text-white font-bold text-sm rounded-full shadow-sm transition-all cursor-pointer"
                >
                  Confirm Booking Details →
                </button>
              </div>
            </div>
            }

            <!-- STEP 4: CONFIRM & BOOK -->
            @if (wizardStep() === 4) {
            <div class="space-y-6">
              @if (!orderConfirmed()) {
              <div class="border-b border-[#eee7e0] pb-4">
                <span class="card-pill">Step 4 of 4</span>
                <h2 class="text-xl font-black text-[#1d1b2c] tracking-tight mt-1">Review & Place Delivery Order</h2>
                <p class="text-xs text-[#6f6d85] mt-1 font-medium">
                  Please inspect the final details below before issuing the parcel order to dispatch.
                </p>
              </div>

              <div class="bg-[#faf8f6] p-6 rounded-3xl border border-[#eee7e0] grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div>
                  <span class="font-bold text-[#6f6d85] uppercase tracking-wider block mb-1">
                    Pickup Address
                  </span>
                  <p class="font-black text-[#1d1b2c] text-sm">
                    {{ wizardData.pickupAddress.line1 }}
                  </p>
                  <p class="text-[#6f6d85] font-medium mt-0.5">
                    {{ wizardData.pickupAddress.city }}, {{ wizardData.pickupAddress.district }} {{ wizardData.pickupAddress.postalCode }}
                  </p>
                </div>

                <div>
                  <span class="font-bold text-[#6f6d85] uppercase tracking-wider block mb-1">
                    Dropoff Address
                  </span>
                  <p class="font-black text-[#1d1b2c] text-sm">
                    {{ wizardData.dropoffAddress.line1 }}
                  </p>
                  <p class="text-[#6f6d85] font-medium mt-0.5">
                    {{ wizardData.dropoffAddress.city }}, {{ wizardData.dropoffAddress.district }} {{ wizardData.dropoffAddress.postalCode }}
                  </p>
                </div>

                <div>
                  <span class="font-bold text-[#6f6d85] uppercase tracking-wider block mb-1">
                    Recipient Contact
                  </span>
                  <p class="font-black text-[#1d1b2c] text-sm">
                    {{ wizardData.recipientName }}
                  </p>
                  <p class="text-[#6f6d85] font-medium mt-0.5">{{ wizardData.recipientPhone }}</p>
                </div>

                <div>
                  <span class="font-bold text-[#6f6d85] uppercase tracking-wider block mb-1">
                    Parcel Specifications & Fee
                  </span>
                  <p class="font-black text-[#1d1b2c] text-sm">
                    {{ wizardData.weightKg }} kg · {{ wizardData.size }}
                  </p>
                  <p class="text-[#a53a26] font-black font-mono text-base mt-0.5">
                    {{ feePreview()?.currency || 'LKR' }} {{ feePreview()?.totalFee?.toFixed(2) }}
                  </p>
                </div>
              </div>

              <div class="flex items-center justify-between pt-4">
                <button
                  type="button"
                  (click)="goToStep(3)"
                  class="px-5 py-2.5 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#1d1b2c] font-bold text-sm rounded-full transition-all cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  id="confirm-booking-btn"
                  (click)="submitDeliveryOrder()"
                  [disabled]="isSubmitting() || !feePreview()"
                  class="action-pill-btn px-8 py-3.5 bg-[#a53a26] hover:bg-[#7e2615] disabled:opacity-50 text-white font-bold text-sm rounded-full shadow-lg shadow-[#a53a26]/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  @if (isSubmitting()) {
                  <span>Placing Order...</span>
                  } @else {
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Confirm & Place Order</span>
                  }
                </button>
              </div>
              } @else {
              <!-- Celebratory Order Success View -->
              <div class="text-center py-10 space-y-5">
                <div class="w-16 h-16 rounded-3xl bg-[#faf6f0] text-[#a53a26] border border-[#a53a26]/20 flex items-center justify-center mx-auto shadow-sm">
                  <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <h2 class="text-2xl font-black text-[#1d1b2c] tracking-tight">
                  Order Confirmed & Booked!
                </h2>
                <p class="text-xs text-[#6f6d85] max-w-md mx-auto font-medium">
                  Your parcel delivery request has been registered in status CREATED and added to the dispatch queue.
                </p>

                <div class="bg-[#faf6f0] border border-[#a53a26]/20 rounded-3xl p-6 max-w-sm mx-auto space-y-1.5 shadow-sm">
                  <span class="text-xs font-bold text-[#a53a26] uppercase tracking-wider">
                    Official Tracking Number
                  </span>
                  <div id="confirmed-tracking-number" class="text-xl font-black text-[#1d1b2c] font-mono tracking-wider">
                    {{ confirmedParcel()?.trackingNumber }}
                  </div>
                  @if (confirmedParcel()?.id) {
                  <div id="confirmed-parcel-id" class="text-[10px] text-[#6f6d85] font-mono">
                    Order ID: {{ confirmedParcel()?.id }}
                  </div>
                  }
                </div>

                <div class="flex items-center justify-center gap-3 pt-3">
                  <button
                    type="button"
                    (click)="activeTab.set('deliveries')"
                    class="action-pill-btn px-6 py-2.5 bg-[#1d1b2c] text-white font-bold text-xs rounded-full hover:bg-black transition-all cursor-pointer"
                  >
                    View in My Deliveries
                  </button>
                  <button
                    type="button"
                    (click)="startNewDelivery()"
                    class="px-6 py-2.5 bg-[#f1f5f9] text-[#1d1b2c] font-bold text-xs rounded-full hover:bg-[#e2e8f0] transition-all cursor-pointer"
                  >
                    Send Another Parcel
                  </button>
                </div>
              </div>
              }
            </div>
            }
          </div>
          }

          <!-- ================================================================= -->
          <!-- VIEW 3: ADDRESS BOOK                                              -->
          <!-- ================================================================= -->
          @if (activeTab() === 'addresses') {
          <div class="space-y-6">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-xl font-black text-[#1d1b2c] tracking-tight">Saved Address Book</h2>
                <p class="text-xs text-[#6f6d85] font-medium mt-0.5">
                  Manage frequently used pickup and dropoff locations for one-click delivery booking.
                </p>
              </div>
              <button
                type="button"
                id="open-add-address-modal"
                (click)="openAddressModal()"
                class="action-pill-btn px-5 py-2.5 bg-[#1d1b2c] hover:bg-black text-white text-xs font-bold rounded-full shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>Add New Address</span>
              </button>
            </div>

            <!-- Addresses Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              @for (addr of addresses(); track addr.id) {
              <div
                class="bg-white rounded-3xl p-6 border border-[#e8e2dc] shadow-sm flex flex-col justify-between space-y-4 hover:border-[#a53a26]/40 transition-all"
              >
                <div class="space-y-2.5">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold px-3 py-1 rounded-full bg-[#f1f5f9] text-[#1d1b2c]">
                      {{ addr.label }}
                    </span>
                    @if (addr.isDefault) {
                    <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#faf6f0] text-[#a53a26] border border-[#a53a26]/20">
                      Default
                    </span>
                    }
                  </div>

                  <div class="text-sm font-black text-[#1d1b2c]">
                    {{ addr.line1 }}
                  </div>
                  @if (addr.line2) {
                  <div class="text-xs text-[#6f6d85]">
                    {{ addr.line2 }}
                  </div>
                  }
                  <div class="text-xs font-semibold text-[#6f6d85]">
                    {{ addr.city }}, {{ addr.district }} {{ addr.postalCode }}
                  </div>
                </div>

                <div class="pt-3.5 border-t border-[#eee7e0] flex items-center justify-between text-xs">
                  @if (!addr.isDefault) {
                  <button
                    type="button"
                    (click)="setDefaultAddress(addr.id)"
                    class="text-[#a53a26] hover:text-[#7e2615] font-bold cursor-pointer"
                  >
                    Set Default
                  </button>
                  } @else {
                  <span class="text-[#a09eaf] font-semibold">Primary address</span>
                  }

                  <button
                    type="button"
                    (click)="openAddressModal(addr)"
                    class="text-[#1d1b2c] hover:text-[#a53a26] font-bold cursor-pointer"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    (click)="deleteAddress(addr.id)"
                    class="text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
              }
            </div>
          </div>
          }

          <!-- Address Modal -->
          @if (showAddressModal()) {
          <div
            class="fixed inset-0 bg-[#1d1b2c]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <div
              class="bg-white rounded-3xl border border-[#e8e2dc] shadow-2xl max-w-md w-full p-6 sm:p-7 space-y-4 animate-in fade-in zoom-in-95 duration-150"
            >
              <div class="flex items-center justify-between border-b border-[#eee7e0] pb-3.5">
                <h3 class="text-lg font-black text-[#1d1b2c]">
                  {{ editingAddressId() ? 'Edit Address' : 'Add New Address' }}
                </h3>
                <button
                  type="button"
                  (click)="showAddressModal.set(false)"
                  class="text-[#6f6d85] hover:text-[#1d1b2c] font-bold p-1 rounded-lg cursor-pointer"
                  aria-label="Close modal"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <div class="space-y-3.5 text-xs font-bold text-[#1d1b2c]">
                <div>
                  <label class="block mb-1 text-[#3a384e]">Label *</label>
                  <input
                    type="text"
                    id="modal-label"
                    [(ngModel)]="newAddressForm.label"
                    placeholder="e.g. Home, Office, Warehouse"
                    class="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm font-semibold text-[#1d1b2c] focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label class="block mb-1 text-[#3a384e]">Street Address Line 1 *</label>
                  <input
                    type="text"
                    id="modal-line1"
                    [(ngModel)]="newAddressForm.line1"
                    placeholder="e.g. 12 Flower Road"
                    class="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm font-semibold text-[#1d1b2c] focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label class="block mb-1 text-[#3a384e]">Line 2 (Optional)</label>
                  <input
                    type="text"
                    [(ngModel)]="newAddressForm.line2"
                    placeholder="Apartment, suite, etc."
                    class="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm font-semibold text-[#1d1b2c] focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] focus:outline-none transition-all"
                  />
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block mb-1 text-[#3a384e]">City *</label>
                    <input
                      type="text"
                      id="modal-city"
                      [(ngModel)]="newAddressForm.city"
                      placeholder="e.g. Colombo 07"
                      class="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm font-semibold text-[#1d1b2c] focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label class="block mb-1 text-[#3a384e]">Postal Code *</label>
                    <input
                      type="text"
                      id="modal-postal-code"
                      [(ngModel)]="newAddressForm.postalCode"
                      placeholder="e.g. 00700"
                      class="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm font-semibold text-[#1d1b2c] focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label class="block mb-1 text-[#3a384e]">District (ADR 002) *</label>
                  <select
                    id="modal-district"
                    [(ngModel)]="newAddressForm.district"
                    class="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-sm font-bold text-[#1d1b2c] focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] focus:outline-none transition-all cursor-pointer"
                  >
                    @for (d of districts; track d) {
                    <option [value]="d">{{ d }}</option>
                    }
                  </select>
                </div>

                <div class="flex items-center gap-2.5 pt-2">
                  <input
                    type="checkbox"
                    id="modal-is-default"
                    [(ngModel)]="newAddressForm.isDefault"
                    class="rounded-lg border-[#e2e8f0] text-[#a53a26] focus:ring-[#a53a26] w-4 h-4 cursor-pointer"
                  />
                  <label for="modal-is-default" class="text-xs font-semibold text-[#3a384e] cursor-pointer">
                    Set as my default delivery address
                  </label>
                </div>
              </div>

              <div class="flex items-center justify-end gap-3 pt-4 border-t border-[#eee7e0]">
                <button
                  type="button"
                  (click)="showAddressModal.set(false)"
                  class="px-5 py-2 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#1d1b2c] font-bold text-xs rounded-full transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="save-address-btn"
                  (click)="saveAddress()"
                  [disabled]="!isAddressFormValid()"
                  class="action-pill-btn px-6 py-2 bg-[#a53a26] hover:bg-[#7e2615] disabled:opacity-40 text-white font-bold text-xs rounded-full transition-all shadow-sm cursor-pointer"
                >
                  Save Address
                </button>
              </div>
            </div>
          </div>
          }

          <!-- Cancel Delivery Confirmation Modal -->
          @if (parcelToCancel(); as parcel) {
          <div
            class="fixed inset-0 bg-[#1d1b2c]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            (click)="closeCancelModal()"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-modal-title"
          >
            <div
              class="bg-white rounded-3xl border border-[#e8e2dc] shadow-2xl max-w-md w-full p-6 sm:p-7 space-y-4 animate-in fade-in zoom-in-95 duration-150"
              (click)="$event.stopPropagation()"
            >
              <!-- Modal Header -->
              <div class="flex items-start justify-between border-b border-[#eee7e0] pb-3.5">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-2xl bg-[#fdf2f0] border border-[#f5d5ce] flex items-center justify-center text-[#a53a26] flex-shrink-0">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 id="cancel-modal-title" class="text-base sm:text-lg font-black text-[#1d1b2c]">
                      Cancel Delivery Order?
                    </h3>
                    <p class="text-xs font-semibold text-[#6f6d85]">
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  (click)="closeCancelModal()"
                  class="text-[#6f6d85] hover:text-[#1d1b2c] p-1 rounded-lg cursor-pointer"
                  aria-label="Close modal"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <!-- Modal Body -->
              <div class="space-y-3.5 text-xs">
                <!-- Parcel Details Summary -->
                <div class="p-3.5 rounded-2xl bg-[#faf8f6] border border-[#eee7e0] space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-[#6f6d85] font-bold text-[11px] uppercase tracking-wider">Tracking Number</span>
                    <span class="font-mono font-black text-[#a53a26] text-xs bg-white px-2 py-0.5 rounded-md border border-[#a53a26]/10" data-testid="cancel-modal-tracking-number">
                      {{ parcel.trackingNumber }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between text-xs font-semibold text-[#1d1b2c]">
                    <span class="text-[#6f6d85]">Route</span>
                    <span>{{ parcel.pickupAddress.city || parcel.pickupAddress.district }} &rarr; {{ parcel.dropoffAddress.city || parcel.dropoffAddress.district }}</span>
                  </div>
                  <div class="flex items-center justify-between text-xs font-semibold text-[#1d1b2c]">
                    <span class="text-[#6f6d85]">Fee</span>
                    <span class="font-black">{{ parcel.fee | currency: 'LKR' : 'symbol' : '1.2-2' }}</span>
                  </div>
                </div>

                <p class="text-[#3a384e] font-medium leading-relaxed">
                  Are you sure you want to cancel this delivery order? Cancellation is only permitted before courier pickup.
                </p>

                <!-- Reason (Optional) -->
                <div>
                  <label for="cancel-reason-input" class="block mb-1 text-[11px] font-bold uppercase tracking-wider text-[#3a384e]">
                    Reason for Cancellation (Optional)
                  </label>
                  <input
                    type="text"
                    id="cancel-reason-input"
                    [(ngModel)]="cancellationReason"
                    placeholder="e.g. Changed plans, duplicate order"
                    class="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-xs font-semibold text-[#1d1b2c] focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] focus:outline-none transition-all"
                  />
                </div>
              </div>

              <!-- Modal Footer -->
              <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-[#eee7e0]">
                <button
                  type="button"
                  id="cancel-modal-dismiss-btn"
                  (click)="closeCancelModal()"
                  [disabled]="isCancelling()"
                  class="px-4 py-2 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#1d1b2c] font-bold text-xs rounded-full transition-all cursor-pointer disabled:opacity-50"
                >
                  Keep Delivery
                </button>
                <button
                  type="button"
                  id="cancel-modal-confirm-btn"
                  (click)="confirmCancelParcel()"
                  [disabled]="isCancelling()"
                  class="action-pill-btn inline-flex items-center gap-1.5 px-5 py-2 bg-[#a53a26] hover:bg-[#7e2615] disabled:opacity-50 text-white font-bold text-xs rounded-full transition-all shadow-sm cursor-pointer"
                >
                  @if (isCancelling()) {
                    <svg class="animate-spin -ml-1 mr-1 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>Cancelling...</span>
                  } @else {
                    <span>Yes, Cancel Delivery</span>
                  }
                </button>
              </div>
            </div>
          </div>
          }

          @if (activeTab() === 'settings') {
          <div id="settings-panel" class="grid grid-cols-1 md:grid-cols-[15rem_1fr] gap-6 lg:gap-10 items-start">
            <!-- Settings menu -->
            <aside class="rounded-3xl bg-[#faf8f6] border border-[#f0ebe5] p-4 md:p-5 md:sticky md:top-24">
              <h2 class="text-xl font-black text-[#1d1b2c] tracking-tight px-2 pt-1 pb-4">Settings</h2>
              <nav class="flex md:flex-col gap-1 overflow-x-auto" aria-label="Settings sections">
                @for (item of settingsSections; track item.id) {
                <button
                  type="button"
                  [id]="'settings-nav-' + item.id"
                  (click)="selectSettingsSection(item.id)"
                  [attr.aria-current]="settingsSection() === item.id ? 'page' : null"
                  [class.bg-[#a53a26]]="settingsSection() === item.id"
                  [class.text-white]="settingsSection() === item.id"
                  [class.shadow-md]="settingsSection() === item.id"
                  [class.text-[#1d1b2c]]="settingsSection() !== item.id"
                  [class.hover:bg-white]="settingsSection() !== item.id"
                  class="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer text-left"
                >
                  <span
                    class="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    [class.bg-white/20]="settingsSection() === item.id"
                    [class.bg-white]="settingsSection() !== item.id"
                    [class.text-[#a53a26]]="settingsSection() !== item.id"
                  >
                    @switch (item.id) {
                      @case ('profile') {
                      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
                      }
                      @case ('addresses') {
                      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                      }
                      @case ('security') {
                      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                      }
                    }
                  </span>
                  <span>{{ item.label }}</span>
                </button>
                }
              </nav>
            </aside>

            <!-- Selected section -->
            <section class="min-w-0 max-w-3xl">
              @switch (settingsSection()) {
                @case ('profile') {
                <div class="flex items-center justify-between gap-4">
                  <h2 class="text-2xl font-black text-[#1d1b2c] tracking-tight">Personal information</h2>
                  @if (!isEditingProfile()) {
                  <button
                    type="button"
                    id="customer-edit-profile-btn"
                    (click)="startEditingProfile()"
                    class="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#eee7e0] hover:border-[#a53a26] text-[#a53a26] text-xs font-bold rounded-full transition-colors cursor-pointer"
                  >
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                    Edit profile
                  </button>
                  }
                </div>
                <div class="h-px bg-[#f0ebe5] my-6"></div>

                <form id="settings-profile-form" (ngSubmit)="saveProfile()" class="space-y-8">
                  <div>
                    <h3 class="text-sm font-black text-[#1d1b2c]">Profile</h3>
                    <p class="text-xs text-[#6f6d85] font-medium mt-0.5">Used by couriers and merchants to identify you on deliveries.</p>

                    <div class="flex items-center gap-4 mt-5">
                      <span class="w-14 h-14 flex-shrink-0 rounded-full bg-[#a53a26] text-white flex items-center justify-center font-bold text-base uppercase shadow-sm">
                        {{ customerInitials() }}
                      </span>
                      <div class="min-w-0">
                        <p id="settings-name" class="text-sm font-bold text-[#1d1b2c] truncate">{{ customerName() }}</p>
                        <p class="text-xs text-[#6f6d85] font-medium">Customer account</p>
                      </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 mt-6">
                      <div class="sm:col-span-2 sm:max-w-[calc(50%-0.75rem)]">
                        <label for="edit-profile-fullname" class="mb-1.5 block text-xs font-bold text-[#1d1b2c]">Full name</label>
                        <input
                          type="text"
                          id="edit-profile-fullname"
                          [(ngModel)]="editProfileFullName"
                          name="editFullName"
                          required
                          [readonly]="!isEditingProfile()"
                          class="w-full rounded-xl border border-[#eee7e0] bg-[#faf8f6] px-3.5 py-2.5 text-sm text-[#1d1b2c] outline-none focus:bg-white focus:border-[#a53a26] focus:ring-2 focus:ring-[#a53a26]/15 transition-colors read-only:bg-white read-only:border-[#f0ebe5] read-only:cursor-default read-only:focus:ring-0 read-only:focus:border-[#f0ebe5]"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 class="text-sm font-black text-[#1d1b2c]">Contact details</h3>
                    <p class="text-xs text-[#6f6d85] font-medium mt-0.5">We use these to send delivery updates and receipts.</p>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 mt-5">
                      <div>
                        <label for="edit-profile-email" class="mb-1.5 block text-xs font-bold text-[#1d1b2c]">Email address</label>
                        <input
                          type="email"
                          id="edit-profile-email"
                          [(ngModel)]="editProfileEmail"
                          name="editEmail"
                          required
                          [readonly]="!isEditingProfile()"
                          class="w-full rounded-xl border border-[#eee7e0] bg-[#faf8f6] px-3.5 py-2.5 text-sm text-[#1d1b2c] outline-none focus:bg-white focus:border-[#a53a26] focus:ring-2 focus:ring-[#a53a26]/15 transition-colors read-only:bg-white read-only:border-[#f0ebe5] read-only:cursor-default read-only:focus:ring-0 read-only:focus:border-[#f0ebe5]"
                        />
                      </div>
                      <div>
                        <label for="edit-profile-phone" class="mb-1.5 block text-xs font-bold text-[#1d1b2c]">Phone number</label>
                        <input
                          type="tel"
                          id="edit-profile-phone"
                          [(ngModel)]="editProfilePhone"
                          name="editPhone"
                          [placeholder]="isEditingProfile() ? '0771234567' : 'Not provided'"
                          [readonly]="!isEditingProfile()"
                          class="w-full rounded-xl border border-[#eee7e0] bg-[#faf8f6] px-3.5 py-2.5 text-sm text-[#1d1b2c] outline-none focus:bg-white focus:border-[#a53a26] focus:ring-2 focus:ring-[#a53a26]/15 transition-colors read-only:bg-white read-only:border-[#f0ebe5] read-only:cursor-default read-only:focus:ring-0 read-only:focus:border-[#f0ebe5]"
                        />
                      </div>
                    </div>
                  </div>

                  @if (editProfileError()) {
                  <div class="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                    {{ editProfileError() }}
                  </div>
                  }
                  @if (profileSaved()) {
                  <div id="settings-profile-saved" class="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
                    Your profile has been updated.
                  </div>
                  }

                  @if (isEditingProfile()) {
                  <div class="flex items-center justify-end gap-3 border-t border-[#f0ebe5] pt-6">
                    <button
                      type="button"
                      id="cancel-profile-btn"
                      (click)="cancelEditingProfile()"
                      class="px-5 py-2.5 bg-white border border-[#eee7e0] hover:bg-[#faf8f6] text-[#1d1b2c] text-xs font-bold rounded-full transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      id="save-profile-btn"
                      [disabled]="!editProfileFullName.trim() || !editProfileEmail.trim() || isSavingProfile()"
                      class="px-5 py-2.5 bg-[#a53a26] hover:bg-[#7e2615] text-white text-xs font-bold rounded-full shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {{ isSavingProfile() ? 'Saving...' : 'Save' }}
                    </button>
                  </div>
                  }
                </form>
                }

                @case ('addresses') {
                <h2 class="text-2xl font-black text-[#1d1b2c] tracking-tight">Saved addresses</h2>
                <div class="h-px bg-[#f0ebe5] my-6"></div>
                <h3 class="text-sm font-black text-[#1d1b2c]">Address book</h3>
                <p class="text-xs text-[#6f6d85] font-medium mt-0.5">Add or remove the pickup and drop-off addresses you use often.</p>
                <p class="text-sm font-bold text-[#1d1b2c] mt-5">
                  {{ addresses().length }} saved {{ addresses().length === 1 ? 'address' : 'addresses' }}
                </p>
                <div class="flex justify-end border-t border-[#f0ebe5] pt-6 mt-8">
                  <button
                    type="button"
                    id="settings-addresses-btn"
                    (click)="activeTab.set('addresses')"
                    class="px-5 py-2.5 bg-[#a53a26] hover:bg-[#7e2615] text-white text-xs font-bold rounded-full transition-all cursor-pointer whitespace-nowrap"
                  >
                    Manage address book
                  </button>
                </div>
                }

                @case ('security') {
                <h2 class="text-2xl font-black text-[#1d1b2c] tracking-tight">Security</h2>
                <div class="h-px bg-[#f0ebe5] my-6"></div>
                <app-customer-change-password [email]="customerEmail()"></app-customer-change-password>
                }

              }
            </section>
          </div>
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
      .filter-pill {
        background: #f1f5f9;
        color: var(--ink-3);
        border: 1px solid transparent;
        cursor: pointer;
      }
      .filter-pill:hover {
        background: #e2e8f0;
        color: var(--ink);
      }
      .filter-pill.filter-active {
        background: var(--terracotta);
        color: #fff;
        box-shadow: 0 4px 12px rgba(165, 58, 38, 0.22);
      }
      .action-pill-btn {
        transition: all 0.2s ease;
      }
      .action-pill-btn:hover:not(:disabled) {
        transform: translateY(-1px);
      }
      .card-pill {
        display: inline-block;
        padding: 0.2rem 0.65rem;
        font-size: 0.7rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--terracotta);
        background: rgba(165, 58, 38, 0.08);
        border-radius: 9999px;
      }
      .size-tier-card.size-tier-active {
        border-color: var(--terracotta);
        background: #faf6f0;
        box-shadow: 0 0 0 2px var(--terracotta);
      }
      .step-label.step-active {
        color: var(--terracotta);
      }
      .step-num {
        background: #e2e8f0;
        color: var(--ink-3);
      }
      .step-num.num-active {
        background: var(--terracotta);
        color: #fff;
      }
    `,
  ],
})
export class CustomerComponent implements OnInit {
  private customerService = inject(CustomerService);
  private authService = inject(AuthService, { optional: true });
  private router = inject(Router, { optional: true });
  private route = inject(ActivatedRoute, { optional: true });

  readonly districts = SRI_LANKA_DISTRICTS;
  readonly sizeTiers: { size: ParcelSize; label: string; desc: string; surcharge: string }[] = [
    { size: 'SMALL', label: 'Small', desc: 'Up to 1kg (docs, accessories)', surcharge: 'Standard Rate' },
    { size: 'MEDIUM', label: 'Medium', desc: '1 - 5kg (shoes, apparel)', surcharge: '+Rs. 100' },
    { size: 'LARGE', label: 'Large', desc: '5 - 50kg (heavy goods, boxes)', surcharge: '+Rs. 250' },
  ];

  readonly statusFilters: { label: string; value: ParcelStatus | null }[] = [
    { label: 'All', value: null },
    { label: 'Created', value: 'CREATED' },
    { label: 'In Transit', value: 'IN_TRANSIT' },
    { label: 'Delivered', value: 'DELIVERED' },
  ];

  activeTab = signal<CustomerTab>('deliveries');
  parcels = signal<CustomerParcel[]>([]);
  parcelPage = signal<CustomerParcelPage>({
    content: [],
    totalElements: 0,
    totalPages: 0,
    page: 0,
    size: 20,
  });
  addresses = signal<CustomerAddress[]>([]);
  selectedParcelPage = signal(0);
  selectedStatusFilter = signal<ParcelStatus | null>(null);
  notification = signal<string | null>(null);

  // Search & Filter state
  searchQuery = signal<string>('');
  quickTrackNumber = signal<string>('');

  filteredParcels = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.parcels();
    return this.parcels().filter(
      (p) =>
        p.trackingNumber.toLowerCase().includes(q) ||
        p.recipientName.toLowerCase().includes(q) ||
        p.pickupAddress.district.toLowerCase().includes(q) ||
        p.dropoffAddress.district.toLowerCase().includes(q) ||
        p.dropoffAddress.city.toLowerCase().includes(q)
    );
  });

  customerName = computed(() => {
    return this.authService?.currentUser()?.fullName || 'Diana';
  });

  customerEmail = computed(() => this.authService?.currentUser()?.email ?? '');

  customerPhone = computed(() => this.authService?.currentUser()?.phoneNumber ?? '');

  // Settings
  readonly settingsSections: { id: SettingsSection; label: string }[] = [
    { id: 'profile', label: 'Personal information' },
    { id: 'addresses', label: 'Saved addresses' },
    { id: 'security', label: 'Security' },
  ];
  settingsSection = signal<SettingsSection>('profile');
  editProfileFullName = '';
  editProfilePhone = '';
  editProfileEmail = '';
  editProfileError = signal<string | null>(null);
  isSavingProfile = signal(false);
  profileSaved = signal(false);
  isEditingProfile = signal(false);

  startEditingProfile(): void {
    this.resetProfileForm();
    this.isEditingProfile.set(true);
  }

  cancelEditingProfile(): void {
    this.resetProfileForm();
    this.isEditingProfile.set(false);
  }

  selectSettingsSection(section: SettingsSection): void {
    this.settingsSection.set(section);
    if (section === 'profile') this.resetProfileForm();
  }

  /** Fills the profile form with the saved details, discarding unsaved edits. */
  resetProfileForm(): void {
    this.editProfileFullName = this.customerName();
    this.editProfilePhone = this.customerPhone();
    this.editProfileEmail = this.customerEmail();
    this.editProfileError.set(null);
    this.profileSaved.set(false);
    this.isEditingProfile.set(false);
  }

  saveProfile(): void {
    if (!this.isEditingProfile()) return;
    if (!this.editProfileFullName.trim() || !this.editProfileEmail.trim()) return;
    this.isSavingProfile.set(true);
    this.editProfileError.set(null);
    this.profileSaved.set(false);

    this.authService?.updateProfile({
      fullName: this.editProfileFullName.trim(),
      phoneNumber: this.editProfilePhone.trim() || undefined,
      email: this.editProfileEmail.trim(),
    }).subscribe({
      next: () => {
        this.isSavingProfile.set(false);
        this.isEditingProfile.set(false);
        this.profileSaved.set(true);
      },
      error: (err) => {
        this.isSavingProfile.set(false);
        this.editProfileError.set(err?.error?.message || err?.message || 'Failed to update profile.');
      },
    });
  }

  openSettings(): void {
    this.selectSettingsSection('profile');
    this.activeTab.set('settings');
  }

  @ViewChild(CustomerSidebarComponent) private sidebar?: CustomerSidebarComponent;

  sidebarActive = computed<CustomerSidebarItem>(() => {
    const tab = this.activeTab();
    return tab === 'deliveries' || tab === 'wizard' || tab === 'settings' ? tab : null;
  });

  /** Opens the shared logout confirmation; sign-out happens only once confirmed. */
  requestSignOut(): void {
    this.sidebar?.openLogoutConfirm();
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.showAddressModal.set(false);
    this.closeCancelModal();
  }

  customerInitials = computed(() => {
    const name = this.customerName();
    if (!name) return 'D';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  });

  activeDeliveriesCount = computed(() => {
    const active = this.parcels().filter(
      (p) =>
        p.status === 'CREATED' ||
        p.status === 'IN_TRANSIT' ||
        p.status === 'PICKED_UP' ||
        p.status === 'OUT_FOR_DELIVERY'
    );
    return active.length;
  });

  // Wizard state
  wizardStep = signal<number>(1);
  wizardData: CreateCustomerParcelRequest = {
    pickupAddress: {
      line1: '142 Havelock Road',
      line2: 'Apt 4B',
      city: 'Colombo 05',
      district: 'Colombo',
      postalCode: '00500',
    },
    dropoffAddress: {
      line1: '88 Kandy Road',
      line2: null,
      city: 'Kadugannawa',
      district: 'Kandy',
      postalCode: '20300',
    },
    weightKg: 2.5,
    size: 'MEDIUM',
    recipientName: 'Kamal Silva',
    recipientPhone: '+94771234567',
    notes: 'Please ring bell',
  };

  feePreview = signal<FeePreview | null>(null);
  isLoadingQuote = signal<boolean>(false);
  quoteError = signal<string | null>(null);
  /** True when the quote failed because SwiftDrop doesn't serve the pickup or drop-off district (HTTP 422). */
  quoteErrorUnserved = signal(false);
  isSubmitting = signal<boolean>(false);
  orderConfirmed = signal<boolean>(false);
  confirmedParcel = signal<CustomerParcel | null>(null);

  // Address modal state
  showAddressModal = signal<boolean>(false);
  editingAddressId = signal<string | null>(null);
  newAddressForm = {
    label: '',
    line1: '',
    line2: '',
    city: '',
    district: 'Colombo' as District,
    postalCode: '',
    isDefault: false,
  };

  // Cancel delivery confirmation modal state
  parcelToCancel = signal<CustomerParcel | null>(null);
  cancellationReason = 'Cancelled by customer';
  isCancelling = signal<boolean>(false);

  ngOnInit(): void {
    const tab = this.route?.snapshot.queryParamMap.get('tab');
    if (tab === 'settings') {
      this.openSettings();
    } else if (tab === 'wizard') {
      this.startNewDelivery();
    }
    this.loadParcels();
    this.loadAddresses();
  }

  loadParcels(): void {
    this.customerService
      .listParcels(this.selectedStatusFilter() || undefined, this.selectedParcelPage())
      .subscribe({
        next: (page) => {
          this.parcelPage.set(page);
          this.parcels.set(page.content);
        },
        error: (err) => this.notification.set(this.apiErrorMessage(err, 'Unable to load parcels.')),
      });
  }

  changeParcelPage(page: number): void {
    if (page < 0 || page >= this.parcelPage().totalPages) return;
    this.selectedParcelPage.set(page);
    this.loadParcels();
  }

  loadAddresses(): void {
    this.customerService.listAddresses().subscribe({
      next: (addrs) => this.addresses.set(addrs),
      error: (err) => this.notification.set(this.apiErrorMessage(err, 'Unable to load addresses.')),
    });
  }

  startNewDelivery(): void {
    this.wizardStep.set(1);
    this.orderConfirmed.set(false);
    this.confirmedParcel.set(null);
    this.activeTab.set('wizard');
    this.updateFeePreview();
  }

  goToStep(step: number): void {
    this.wizardStep.set(step);
    if (step === 3) {
      this.updateFeePreview();
    }
  }

  updateFeePreview(): void {
    const pickup = this.wizardData.pickupAddress.district;
    const dropoff = this.wizardData.dropoffAddress.district;
    const weight = Number(this.wizardData.weightKg);
    const size = this.wizardData.size;

    if (!pickup || !dropoff || !weight || weight <= 0 || !size) {
      this.feePreview.set(null);
      this.quoteError.set(null);
      this.quoteErrorUnserved.set(false);
      return;
    }

    this.isLoadingQuote.set(true);
    this.quoteError.set(null);
    this.quoteErrorUnserved.set(false);

    this.customerService.getFeeQuote(pickup, dropoff, weight, size).subscribe({
      next: (quote) => {
        this.feePreview.set({
          currency: quote.currency || 'LKR',
          totalFee: quote.totalFee,
          breakdown: quote.breakdown,
          pickupZone: quote.pickupZone,
          dropoffZone: quote.dropoffZone,
          pickupDistrict: pickup,
          dropoffDistrict: dropoff,
          weightKg: weight,
          size,
        });
        this.isLoadingQuote.set(false);
      },
      error: (err) => {
        this.feePreview.set(null);
        this.isLoadingQuote.set(false);
        const message =
          err.error?.message ||
          err.message ||
          'Unable to calculate delivery fee. Please verify your addresses and package details.';
        this.quoteError.set(message);
        this.quoteErrorUnserved.set(err.status === 422);
      },
    });
  }

  selectSavedAddress(type: 'pickup' | 'dropoff', addressId: string): void {
    if (!addressId) return;
    const match = this.addresses().find((a) => a.id === addressId);
    if (match) {
      const target: AddressDto = {
        line1: match.line1,
        line2: match.line2,
        city: match.city,
        district: match.district,
        postalCode: match.postalCode,
      };
      if (type === 'pickup') {
        this.wizardData.pickupAddress = target;
      } else {
        this.wizardData.dropoffAddress = target;
      }
      this.updateFeePreview();
    }
  }

  isStep1Valid(): boolean {
    const p = this.wizardData.pickupAddress;
    const d = this.wizardData.dropoffAddress;
    return !!(p.line1 && p.city && p.district && p.postalCode && d.line1 && d.city && d.district && d.postalCode);
  }

  isStep2Valid(): boolean {
    return !!(
      this.wizardData.weightKg > 0 &&
      this.wizardData.size &&
      this.wizardData.recipientName?.trim() &&
      this.wizardData.recipientPhone?.trim()
    );
  }

  submitDeliveryOrder(): void {
    if (this.isSubmitting() || !this.feePreview()) return;
    this.isSubmitting.set(true);
    this.customerService.createParcel(this.wizardData).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.confirmedParcel.set(created);
        this.orderConfirmed.set(true);
        this.loadParcels();
        this.notification.set(`Parcel booked successfully! Tracking: ${created.trackingNumber}`);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const message =
          err?.error?.message ||
          err?.message ||
          'Failed to place delivery order. Please try again.';
        this.notification.set(message);
      },
    });
  }

  openCancelModal(parcel: CustomerParcel): void {
    this.parcelToCancel.set(parcel);
    this.cancellationReason = 'Cancelled by customer';
    this.isCancelling.set(false);
  }

  closeCancelModal(): void {
    if (!this.isCancelling()) {
      this.parcelToCancel.set(null);
    }
  }

  confirmCancelParcel(): void {
    const parcel = this.parcelToCancel();
    if (!parcel) return;

    this.isCancelling.set(true);
    const reason = this.cancellationReason.trim() || 'Cancelled by customer';
    this.customerService.cancelParcel(parcel.id, reason).subscribe({
      next: (cancelled) => {
        this.isCancelling.set(false);
        this.parcelToCancel.set(null);
        this.loadParcels();
        this.notification.set(`Delivery order ${cancelled.trackingNumber} has been cancelled.`);
      },
      error: (err) => {
        this.isCancelling.set(false);
        this.notification.set(this.apiErrorMessage(err, 'Failed to cancel parcel.'));
      },
    });
  }

  cancelParcel(id: string, reason?: string): void {
    this.customerService.cancelParcel(id, reason || 'Cancelled by customer').subscribe({
      next: (cancelled) => {
        this.loadParcels();
        this.notification.set(`Delivery order ${cancelled.trackingNumber} has been cancelled.`);
      },
      error: (err) => {
        this.notification.set(this.apiErrorMessage(err, 'Failed to cancel parcel.'));
      },
    });
  }

  trackParcelByNumber(): void {
    const num = this.quickTrackNumber().trim();
    if (!num) return;
    this.searchQuery.set(num);
    this.activeTab.set('deliveries');
  }

  viewParcelDetails(parcel: CustomerParcel): void {
    if (this.router) {
      this.router.navigate(['/customer/parcels', parcel.id]);
    }
  }

  formatParcelDate(dateString?: string): string {
    if (!dateString) return '24.04.2026';
    try {
      const d = new Date(dateString);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}.${month}.${year}`;
    } catch {
      return '24.04.2026';
    }
  }

  openAddressModal(address?: CustomerAddress): void {
    this.editingAddressId.set(address?.id || null);
    this.newAddressForm = address
      ? {
          label: address.label,
          line1: address.line1,
          line2: address.line2 || '',
          city: address.city,
          district: address.district,
          postalCode: address.postalCode,
          isDefault: address.isDefault,
        }
      : {
          label: '',
          line1: '',
          line2: '',
          city: '',
          district: 'Colombo',
          postalCode: '',
          isDefault: false,
        };
    this.showAddressModal.set(true);
  }

  isAddressFormValid(): boolean {
    const f = this.newAddressForm;
    return !!(f.label && f.line1 && f.city && f.district && f.postalCode);
  }

  saveAddress(): void {
    if (!this.isAddressFormValid()) return;
    const isEditing = !!this.editingAddressId();
    const request = {
      label: this.newAddressForm.label.trim(),
      line1: this.newAddressForm.line1.trim(),
      line2: this.newAddressForm.line2.trim() || null,
      city: this.newAddressForm.city.trim(),
      district: this.newAddressForm.district,
      postalCode: this.newAddressForm.postalCode.trim(),
      isDefault: this.newAddressForm.isDefault,
    };
    const operation = this.editingAddressId()
      ? this.customerService.updateAddress(this.editingAddressId()!, request)
      : this.customerService.createAddress(request);
    operation.subscribe({
      next: (saved) => {
        this.loadAddresses();
        this.showAddressModal.set(false);
        this.editingAddressId.set(null);
        this.notification.set(
          `Address '${saved.label}' ${isEditing ? 'updated' : 'added to address book'}.`
        );
      },
      error: (err) => this.notification.set(this.apiErrorMessage(err, 'Unable to save address.')),
    });
  }

  saveNewAddress(): void {
    this.saveAddress();
  }

  setDefaultAddress(id: string): void {
    this.customerService.setDefaultAddress(id).subscribe({
      next: (updated) => {
        this.loadAddresses();
        this.notification.set(`'${updated.label}' is now your default address.`);
      },
      error: (err) => this.notification.set(this.apiErrorMessage(err, 'Unable to set default address.')),
    });
  }

  deleteAddress(id: string): void {
    this.customerService.deleteAddress(id).subscribe({
      next: () => {
        this.loadAddresses();
        this.notification.set('Address deleted.');
      },
      error: (err) => this.notification.set(this.apiErrorMessage(err, 'Unable to delete address.')),
    });
  }

  signOut(): void {
    if (this.authService) {
      this.authService.logout().subscribe({
        next: () => this.router?.navigate(['/']),
        error: () => this.router?.navigate(['/']),
      });
    } else {
      this.router?.navigate(['/']);
    }
  }

  private apiErrorMessage(error: { error?: { message?: string }; message?: string }, fallback: string): string {
    const raw = error?.error?.message || error?.message;
    if (raw && !raw.includes('Http failure during parsing')) {
      return raw;
    }
    return fallback;
  }

  getStatusBadgeClass(status: ParcelStatus): string {
    switch (status) {
      case 'CREATED':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200/80';
      case 'PICKED_UP':
      case 'IN_TRANSIT':
      case 'OUT_FOR_DELIVERY':
        return 'bg-amber-50 text-amber-700 border border-amber-200/80';
      case 'DELIVERED':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200/80';
      case 'FAILED':
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-700 border border-rose-200/80';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }
}
