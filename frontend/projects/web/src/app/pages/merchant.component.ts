import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, finalize } from 'rxjs';
import { AuthService } from 'shared-auth';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  LoadingStateComponent,
  PaginationComponent,
} from 'ui';
import {
  MerchantOrder,
  MerchantOrderFilterParams,
  OrderCounts,
  ParcelLifecycleStatus,
  TestWebhookResult,
  WebhookDeliveryItem,
  WebhookDeliveryStatus,
  WebhookSettings,
} from './merchant/merchant.model';
import { MerchantService } from './merchant/merchant.service';
import { MerchantCredentialsComponent } from './merchant/merchant-credentials.component';

type ActiveTab = 'orders' | 'settings' | 'deliveries' | 'credentials';

@Component({
  selector: 'app-merchant',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MerchantCredentialsComponent,
    PaginationComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
  ],
  template: `
    <!-- Full-Screen Merchant Portal Shell Matching Customer Portal Template -->
    <div class="merchant-shell w-full min-h-screen flex flex-col md:flex-row bg-white">
      <!-- Slim Left Sidebar Navigation Rail (Docked & Sticky) -->
      <aside
        class="merchant-rail w-full md:w-20 flex-shrink-0 flex md:flex-col items-center justify-between md:justify-start py-4 md:py-7 px-4 md:px-0 border-b md:border-b-0 md:border-r border-[#f0ebe5] bg-[#faf8f6] md:sticky md:top-0 md:h-screen md:space-y-7 z-20"
      >
        <!-- SwiftDrop Brand Logo Icon -->
        <button
          type="button"
          (click)="selectTab('orders')"
          class="w-11 h-11 rounded-2xl bg-[#a53a26] text-white flex items-center justify-center shadow-md shadow-[#a53a26]/20 cursor-pointer hover:scale-105 transition-transform"
          title="SwiftDrop Merchant Portal"
        >
          <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
        </button>

        <!-- Navigation Icons Stack -->
        <nav class="flex md:flex-col items-center gap-3 sm:gap-4" aria-label="Merchant Navigation">
          <!-- 1. Grid Icon (Orders Dashboard) -->
          <button
            type="button"
            (click)="selectTab('orders')"
            [class.rail-active]="activeTab() === 'orders'"
            class="rail-icon-btn relative w-10 h-10 rounded-xl flex items-center justify-center text-[#6f6d85] hover:text-[#a53a26] hover:bg-white transition-all cursor-pointer"
            title="Orders Dashboard"
            aria-label="Orders Dashboard"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <rect x="3" y="3" width="7" height="7" rx="2"></rect>
              <rect x="14" y="3" width="7" height="7" rx="2"></rect>
              <rect x="14" y="14" width="7" height="7" rx="2"></rect>
              <rect x="3" y="14" width="7" height="7" rx="2"></rect>
            </svg>
            <span *ngIf="activeTab() === 'orders'" class="hidden md:block absolute -right-[1px] top-2 bottom-2 w-1 bg-[#a53a26] rounded-l-full"></span>
          </button>

          <!-- 2. Webhook Settings Icon -->
          <button
            type="button"
            (click)="selectTab('settings')"
            [class.rail-active]="activeTab() === 'settings'"
            class="rail-icon-btn relative w-10 h-10 rounded-xl flex items-center justify-center text-[#6f6d85] hover:text-[#a53a26] hover:bg-white transition-all cursor-pointer"
            title="Webhook Settings"
            aria-label="Webhook Settings"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <span *ngIf="activeTab() === 'settings'" class="hidden md:block absolute -right-[1px] top-2 bottom-2 w-1 bg-[#a53a26] rounded-l-full"></span>
          </button>

          <!-- 3. Webhook Delivery Logs Icon -->
          <button
            type="button"
            (click)="selectTab('deliveries')"
            [class.rail-active]="activeTab() === 'deliveries'"
            class="rail-icon-btn relative w-10 h-10 rounded-xl flex items-center justify-center text-[#6f6d85] hover:text-[#a53a26] hover:bg-white transition-all cursor-pointer"
            title="Delivery Logs"
            aria-label="Delivery Logs"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span *ngIf="activeTab() === 'deliveries'" class="hidden md:block absolute -right-[1px] top-2 bottom-2 w-1 bg-[#a53a26] rounded-l-full"></span>
          </button>

          <!-- 4. API Credentials Icon -->
          <button
            type="button"
            (click)="selectTab('credentials')"
            [class.rail-active]="activeTab() === 'credentials'"
            class="rail-icon-btn relative w-10 h-10 rounded-xl flex items-center justify-center text-[#6f6d85] hover:text-[#a53a26] hover:bg-white transition-all cursor-pointer"
            title="API Credentials"
            aria-label="API Credentials"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <circle cx="7.5" cy="15.5" r="3.5"></circle>
              <path d="M10 13l7-7 3 3-7 7M17 6l1-1"></path>
            </svg>
            <span *ngIf="activeTab() === 'credentials'" class="hidden md:block absolute -right-[1px] top-2 bottom-2 w-1 bg-[#a53a26] rounded-l-full"></span>
          </button>

          <!-- 5. Plus Button (Bulk CSV Orders) -->
          <button
            type="button"
            (click)="navigateToBulk()"
            class="w-10 h-10 rounded-2xl bg-[#a53a26] hover:bg-[#7e2615] text-white flex items-center justify-center shadow-md shadow-[#a53a26]/20 hover:scale-105 transition-all cursor-pointer"
            title="Bulk CSV Orders"
            aria-label="Bulk CSV Orders"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </nav>

        <!-- Sidebar Footer Utilities -->
        <div class="hidden md:flex flex-col items-center gap-3 pt-4 md:!mt-4 border-t border-[#f0ebe5]/60">
          <button
            type="button"
            (click)="logOut()"
            class="w-10 h-10 rounded-xl flex items-center justify-center text-[#6f6d85] hover:text-[#a53a26] hover:bg-white transition-all cursor-pointer"
            title="Log Out"
            aria-label="Log Out"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </aside>

      <!-- Main Content Area (Edge-to-Edge Full Screen) -->
      <main class="flex-1 min-h-screen p-6 sm:p-8 lg:p-10 space-y-7 min-w-0 bg-white">
        <!-- Top Header: Search Bar & Merchant Profile -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#f4efe9]">
          <!-- Search Input -->
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
              [(ngModel)]="searchQuery"
              (input)="onSearchChange()"
              placeholder="Search by tracking number, recipient, or address..."
              class="w-full pl-11 pr-4 py-2.5 rounded-full bg-[#faf8f6] border border-[#e8e2dc] text-xs font-semibold text-[#1d1b2c] focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] transition-all"
            />
          </div>

          <!-- Merchant Profile Menu -->
          <div class="flex items-center gap-3 self-end sm:self-auto">
            <div class="relative">
              <button
                type="button"
                id="profile-menu-btn"
                (click)="toggleProfileMenu()"
                aria-haspopup="menu"
                [attr.aria-expanded]="profileMenuOpen()"
                class="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#faf8f6] border border-[#e8e2dc] hover:border-[#a53a26]/40 transition-colors cursor-pointer"
              >
                <span
                  class="w-8 h-8 rounded-full bg-[#a53a26] text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm"
                >
                  {{ merchantInitials() }}
                </span>
                <span class="text-xs font-bold text-[#1d1b2c]">{{ merchantName() }}</span>
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

              @if (profileMenuOpen()) {
                <div
                  role="menu"
                  class="absolute right-0 mt-2 w-60 rounded-2xl bg-white border border-[#e8e2dc] shadow-lg shadow-[#1d1b2c]/5 py-2 z-30"
                >
                  <div class="px-4 py-2 border-b border-[#f0ebe5]">
                    <p class="text-xs font-bold text-[#1d1b2c] truncate">{{ merchantName() }}</p>
                    <p class="text-[11px] text-[#6f6d85] truncate">{{ merchantEmail() }}</p>
                    <span class="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#a53a26]/10 text-[#a53a26] text-[10px] font-bold">MERCHANT PORTAL</span>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    (click)="selectTab('settings'); toggleProfileMenu()"
                    class="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-[#1d1b2c] hover:bg-[#faf8f6] hover:text-[#a53a26] transition-colors cursor-pointer"
                  >
                    <span>Webhook Settings</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    (click)="selectTab('credentials'); toggleProfileMenu()"
                    class="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-[#1d1b2c] hover:bg-[#faf8f6] hover:text-[#a53a26] transition-colors cursor-pointer"
                  >
                    <span>API Credentials</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    (click)="navigateToBulk(); toggleProfileMenu()"
                    class="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-[#1d1b2c] hover:bg-[#faf8f6] hover:text-[#a53a26] transition-colors cursor-pointer"
                  >
                    <span>Bulk CSV Orders</span>
                  </button>
                  <div class="border-t border-[#f0ebe5] mt-1 pt-1">
                    <button
                      type="button"
                      role="menuitem"
                      (click)="logOut(); toggleProfileMenu()"
                      class="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-[#a53a26] hover:bg-[#faf8f6] transition-colors cursor-pointer"
                    >
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Toast Feedback -->
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

        <!-- ========================================================================= -->
        <!-- TAB 1: ORDERS DASHBOARD                                                  -->
        <!-- ========================================================================= -->
        <div *ngIf="activeTab() === 'orders'" class="space-y-6">
          <!-- Greeting Banner -->
          <div>
            <h1 class="text-2xl sm:text-3xl font-black text-[#1d1b2c] tracking-tight">
              Welcome back, {{ merchantName() }}!
            </h1>
            <p class="text-xs text-[#6f6d85] font-medium mt-1">
              Monitor real-time fulfillment, search parcels, and manage your delivery operations.
            </p>
          </div>

          <!-- Two Hero Cards Grid Matching Customer Portal -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <!-- Hero Card 1: Active In-Fulfillment Card with 3D Isometric Parcels -->
            <div
              class="hero-summary-card bg-white rounded-3xl p-6 sm:p-7 border border-[#eee7e0] shadow-sm flex flex-col justify-between relative overflow-hidden"
            >
              <div class="flex items-start justify-between relative z-10">
                <div>
                  <div class="flex items-baseline">
                    <span class="text-5xl font-black text-[#1d1b2c] tracking-tight">
                      {{ (counts().pickedUp || 0) + (counts().inTransit || 0) + (counts().outForDelivery || 0) }}
                    </span>
                    <span class="text-sm font-bold text-[#6f6d85] ml-2">in delivery today</span>
                  </div>
                  <p class="text-xs text-[#6f6d85] font-medium mt-3 max-w-xs leading-relaxed">
                    Total of <strong class="text-[#1d1b2c]">{{ counts().total }}</strong> orders registered across depots. Fast wholesale courier dispatch enabled.
                  </p>
                </div>

                <!-- 3D Isometric Parcels Graphic (Terracotta & Sand Cubes) -->
                <div class="relative w-28 h-28 flex-shrink-0 -mt-2 -mr-1">
                  <svg class="w-full h-full drop-shadow-md" viewBox="0 0 160 140" fill="none">
                    <!-- Terracotta Isometric Cube (Back/Higher) -->
                    <g transform="translate(68, 15)">
                      <polygon points="40,0 80,20 40,40 0,20" fill="#a53a26" />
                      <polygon points="0,20 40,40 40,84 0,64" fill="#7e2615" />
                      <polygon points="40,40 80,20 80,64 40,84" fill="#5c1b0f" />
                    </g>
                    <!-- White/Sand Isometric Cube (Front/Lower) -->
                    <g transform="translate(15, 45)">
                      <polygon points="34,0 68,17 34,34 0,17" fill="#ffffff" stroke="#eee7e0" stroke-width="0.5" />
                      <polygon points="0,17 34,34 34,72 0,55" fill="#f8f6f4" stroke="#eee7e0" stroke-width="0.5" />
                      <polygon points="34,34 68,17 68,55 34,72" fill="#e8e2dc" stroke="#eee7e0" stroke-width="0.5" />
                    </g>
                  </svg>
                </div>
              </div>

              <!-- Action Buttons Row -->
              <div class="flex items-center gap-3 pt-5 relative z-10">
                <button
                  type="button"
                  (click)="navigateToBulk()"
                  class="px-5 py-2.5 rounded-full bg-[#a53a26] hover:bg-[#7e2615] text-white font-bold text-xs transition-all shadow-sm hover:scale-[1.02] active:scale-95 cursor-pointer text-center"
                >
                  Bulk CSV orders
                </button>
                <button
                  type="button"
                  (click)="refreshOrders()"
                  class="px-5 py-2.5 rounded-full border border-[#a53a26] text-[#a53a26] hover:bg-[#faf6f0] font-bold text-xs transition-all cursor-pointer"
                >
                  Refresh tracking
                </button>
              </div>
            </div>

            <!-- Hero Card 2: Direct Search Card (Terracotta #a53a26) -->
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
                  [(ngModel)]="searchQuery"
                  (keyup.enter)="onSearchChange()"
                  placeholder="Enter parcel number"
                  class="w-full sm:flex-1 px-4 py-2.5 rounded-full bg-white text-[#1d1b2c] placeholder:text-[#a09eaf] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-white/80 shadow-inner"
                />
                <button
                  type="button"
                  (click)="onSearchChange()"
                  class="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#1d1b2c] hover:bg-black text-white font-black text-xs transition-all shadow-md cursor-pointer hover:scale-[1.02] active:scale-95"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>

          <!-- KPI Summary Cards Row -->
          <div *ngIf="isLoadingCounts()" role="status" class="rounded-2xl bg-[#faf8f6] border border-[#e8e2dc] p-4 text-xs font-medium text-[#6f6d85]">
            Loading order counts...
          </div>
          <div *ngIf="!isLoadingCounts() && countsError()" role="alert" class="rounded-2xl bg-[#fff1f2] border border-[#fecdd3] p-4 text-xs text-[#e11d48] flex items-center justify-between">
            <span>{{ countsError() }}</span>
            <button type="button" (click)="loadOrderCounts()" class="font-bold underline cursor-pointer ml-3">Retry</button>
          </div>
          <div *ngIf="!isLoadingCounts() && !countsError()" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-white rounded-2xl border border-[#eee7e0] p-5 shadow-sm">
              <span class="text-xs font-bold uppercase tracking-wider text-[#6f6d85]">Total Orders</span>
              <div class="text-3xl font-black text-[#1d1b2c] mt-2">{{ counts().total }}</div>
              <span class="text-[11px] text-[#a09eaf] mt-1 block">All registered parcels</span>
            </div>
            <div class="bg-white rounded-2xl border border-[#eee7e0] p-5 shadow-sm">
              <span class="text-xs font-bold uppercase tracking-wider text-[#a53a26]">Active In-Transit</span>
              <div class="text-3xl font-black text-[#a53a26] mt-2">
                {{ (counts().pickedUp || 0) + (counts().inTransit || 0) + (counts().outForDelivery || 0) }}
              </div>
              <span class="text-[11px] text-[#a09eaf] mt-1 block">Picked up or out for delivery</span>
            </div>
            <div class="bg-white rounded-2xl border border-[#eee7e0] p-5 shadow-sm">
              <span class="text-xs font-bold uppercase tracking-wider text-emerald-700">Delivered</span>
              <div class="text-3xl font-black text-emerald-700 mt-2">{{ counts().delivered }}</div>
              <span class="text-[11px] text-[#a09eaf] mt-1 block">Successfully fulfilled</span>
            </div>
            <div class="bg-white rounded-2xl border border-[#eee7e0] p-5 shadow-sm">
              <span class="text-xs font-bold uppercase tracking-wider text-rose-700">Failed / Cancelled</span>
              <div class="text-3xl font-black text-rose-700 mt-2">{{ counts().failed + counts().cancelled }}</div>
              <span class="text-[11px] text-[#a09eaf] mt-1 block">Exceptions or cancelled</span>
            </div>
          </div>

          <!-- Recent Deliveries Section Card (Matching Customer Portal Screenshot) -->
          <div class="recent-deliveries-card bg-white rounded-3xl border border-[#eee7e0] p-6 sm:p-7 shadow-sm space-y-5">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 class="text-lg font-black text-[#1d1b2c] tracking-tight">Your recent deliveries</h2>

              <!-- Status Filter Pills -->
              <div class="flex flex-wrap items-center gap-1.5">
                <button
                  *ngFor="let s of statusFilterOptions"
                  type="button"
                  (click)="onStatusFilterChange(s.value)"
                  [class.filter-active]="selectedStatusFilter() === s.value"
                  class="filter-pill px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer"
                >
                  {{ s.label }}
                </button>
              </div>
            </div>

            <!-- Date Range & Active Filter Bar -->
            <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#f4efe9] text-xs">
              <div class="flex flex-wrap items-center gap-3">
                <div class="flex items-center gap-1.5 text-[#6f6d85] font-semibold">
                  <label for="fromDate">From:</label>
                  <input
                    id="fromDate"
                    type="date"
                    [(ngModel)]="fromDate"
                    (change)="onDateFilterChange()"
                    class="px-3 py-1.5 rounded-full bg-[#faf8f6] border border-[#e8e2dc] text-xs font-semibold text-[#1d1b2c] focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20"
                  />
                </div>
                <div class="flex items-center gap-1.5 text-[#6f6d85] font-semibold">
                  <label for="toDate">To:</label>
                  <input
                    id="toDate"
                    type="date"
                    [(ngModel)]="toDate"
                    (change)="onDateFilterChange()"
                    class="px-3 py-1.5 rounded-full bg-[#faf8f6] border border-[#e8e2dc] text-xs font-semibold text-[#1d1b2c] focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20"
                  />
                </div>
                <button
                  *ngIf="selectedStatusFilter() !== 'ALL' || searchQuery || fromDate || toDate"
                  type="button"
                  (click)="resetFilters()"
                  class="text-xs font-bold text-[#a53a26] hover:text-[#7e2615] underline cursor-pointer ml-1"
                >
                  Clear filters
                </button>
              </div>

              <div class="text-[11px] text-[#a09eaf]">
                Showing <strong class="text-[#1d1b2c]">{{ orders().length }}</strong> of <strong class="text-[#1d1b2c]">{{ totalElements() }}</strong> parcels
              </div>
            </div>

            <!-- Orders Table Container -->
            <div class="overflow-hidden rounded-2xl border border-[#f0ebe5]">
              <div *ngIf="isLoadingOrders()" class="p-8">
                <ui-loading-state message="Loading merchant orders..." />
              </div>

              <div *ngIf="!isLoadingOrders() && orderError()" class="p-8">
                <ui-error-state
                  title="Unable to load orders"
                  [message]="orderError()!"
                  (retry)="loadOrders()"
                />
              </div>

              <div *ngIf="!isLoadingOrders() && !orderError() && orders().length === 0" class="p-8">
                <ui-empty-state
                  title="No orders found"
                  message="No parcel orders match your selected filters. Try clearing your search or status filter."
                />
              </div>

              <div *ngIf="!isLoadingOrders() && !orderError() && orders().length > 0" class="overflow-x-auto">
                <table class="w-full text-left text-xs text-[#6f6d85]">
                  <thead>
                    <tr class="bg-[#faf8f6] border-b border-[#eee7e0] text-[11px] font-black uppercase tracking-wider text-[#a09eaf]">
                      <th class="py-3.5 px-5">Delivery date</th>
                      <th class="py-3.5 px-5">Recipient / Destination</th>
                      <th class="py-3.5 px-5">Carrier</th>
                      <th class="py-3.5 px-5">Parcel Number</th>
                      <th class="py-3.5 px-5">Fee</th>
                      <th class="py-3.5 px-5">Status</th>
                      <th class="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#f4efe9]">
                    <tr *ngFor="let o of orders()" class="hover:bg-[#faf8f6]/80 transition-colors">
                      <td class="py-4 px-5 font-medium text-[#6f6d85] whitespace-nowrap">
                        {{ o.createdAt | date: 'dd.MM.yyyy' }}
                      </td>
                      <td class="py-4 px-5">
                        <div class="font-bold text-[#1d1b2c]">{{ o.recipientName || '—' }}</div>
                        <div *ngIf="o.recipientAddress" class="text-[11px] text-[#a09eaf] truncate max-w-xs mt-0.5">
                          {{ o.recipientAddress }}
                        </div>
                      </td>
                      <td class="py-4 px-5 font-semibold text-[#1d1b2c] whitespace-nowrap">
                        SwiftDrop Express
                      </td>
                      <td class="py-4 px-5">
                        <span class="inline-block px-2.5 py-1 rounded-md bg-[#faf8f6] border border-[#e8e2dc] font-mono font-bold text-xs text-[#a53a26]">
                          {{ o.trackingNumber }}
                        </span>
                      </td>
                      <td class="py-4 px-5 font-mono font-bold text-[#1d1b2c] whitespace-nowrap">
                        {{ o.fee != null ? 'LKR ' + (o.fee | number:'1.2-2') : '—' }}
                      </td>
                      <td class="py-4 px-5 whitespace-nowrap">
                        <span
                          [ngClass]="getStatusBadgeClass(o.status)"
                          class="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                        >
                          {{ o.status === 'IN_TRANSIT' ? 'IN DELIVERY' : o.status }}
                        </span>
                      </td>
                      <td class="py-4 px-5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          (click)="viewOrderDetails(o)"
                          class="text-xs font-bold text-[#a53a26] hover:text-[#7e2615] transition-colors cursor-pointer"
                        >
                          View details &gt;
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Pagination Toolbar -->
              <div *ngIf="!isLoadingOrders() && !orderError() && totalElements() > 0" class="p-4 border-t border-[#f0ebe5] bg-[#faf8f6]">
                <ui-pagination
                  [page]="currentPage()"
                  [size]="pageSize()"
                  [totalElements]="totalElements()"
                  (pageChange)="onPageChange($event)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- ========================================================================= -->
        <!-- TAB 2: WEBHOOK SETTINGS                                                  -->
        <!-- ========================================================================= -->
        <div *ngIf="activeTab() === 'settings'" class="space-y-6">
          <!-- Tab Header -->
          <div>
            <h1 class="text-2xl sm:text-3xl font-black text-[#1d1b2c] tracking-tight">
              Webhook Configuration
            </h1>
            <p class="text-xs text-[#6f6d85] font-medium mt-1">
              Configure HTTP event delivery, subscription filters, and HMAC-SHA256 signature verification.
            </p>
          </div>

          <div *ngIf="isLoadingSettings()" class="rounded-2xl bg-[#faf8f6] border border-[#e8e2dc] p-4 text-xs font-medium text-[#6f6d85]" role="status">
            Loading webhook settings...
          </div>
          <div *ngIf="settingsError()" class="rounded-2xl bg-[#fff1f2] border border-[#fecdd3] p-4 text-xs text-[#e11d48] flex items-center justify-between" role="alert">
            <span>{{ settingsError() }}</span>
            <button *ngIf="!settings()" type="button" (click)="loadSettings()" class="font-bold underline cursor-pointer ml-3">Retry</button>
          </div>

          <!-- Configuration Grid -->
          <div *ngIf="settings()" class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <!-- Left 2 Cols: Main Webhook Config & HMAC Secret -->
            <div class="lg:col-span-2 space-y-6">
              <!-- Destination URL & Subscriptions Card -->
              <div class="bg-white rounded-3xl border border-[#eee7e0] p-6 sm:p-7 shadow-sm space-y-6">
                <div>
                  <span class="text-[10px] font-black uppercase tracking-widest text-[#a53a26]">Webhook Destination</span>
                  <h2 class="text-xl font-black text-[#1d1b2c] tracking-tight mt-0.5">Endpoint & Event Subscriptions</h2>
                </div>

                <div>
                  <label for="webhookUrlInput" class="block text-xs font-bold text-[#1d1b2c] mb-1.5">
                    Destination URL <span class="text-[#a53a26]">*</span>
                  </label>
                  <input
                    id="webhookUrlInput"
                    type="url"
                    [(ngModel)]="settingsForm.url"
                    [disabled]="isSavingSettings()"
                    placeholder="https://api.yourdomain.com/webhooks/swiftdrop"
                    class="w-full text-xs font-semibold border border-[#e8e2dc] bg-[#faf8f6] rounded-xl px-4 py-3 text-[#1d1b2c] focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] transition-all"
                  />
                  <p class="text-[11px] text-[#6f6d85] mt-1.5">
                    🔒 Destination must be a secure public HTTPS endpoint for automated notifications.
                  </p>
                </div>

                <!-- Active Dispatch Toggle -->
                <div class="flex items-center justify-between p-4 rounded-2xl bg-[#faf8f6] border border-[#e8e2dc]">
                  <div>
                    <div class="text-xs font-bold text-[#1d1b2c]">Dispatch Outbound Webhooks</div>
                    <div class="text-[11px] text-[#6f6d85] mt-0.5">Enable or temporarily suspend outbound webhook event delivery.</div>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" [(ngModel)]="settingsForm.active" [disabled]="isSavingSettings()" class="sr-only peer" />
                    <div class="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#a53a26]"></div>
                  </label>
                </div>

                <!-- Subscribed Events -->
                <div>
                  <label class="block text-xs font-bold text-[#1d1b2c] mb-2.5">Subscribed Event Types</label>
                  <div class="space-y-3">
                    <label class="flex items-start gap-3 p-3.5 rounded-2xl border border-[#e8e2dc] bg-[#faf8f6] hover:border-[#a53a26]/40 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        [checked]="settingsForm.subscribedEvents.includes('PARCEL_STATUS_CHANGED')"
                        (change)="toggleEvent('PARCEL_STATUS_CHANGED')"
                        [disabled]="isSavingSettings()"
                        class="mt-0.5 rounded text-[#a53a26] focus:ring-[#a53a26]"
                      />
                      <div>
                        <div class="text-xs font-bold text-[#1d1b2c]">
                          Parcel Status Changes <span class="font-mono text-[10px] text-[#a53a26] font-normal ml-1">PARCEL_STATUS_CHANGED</span>
                        </div>
                        <div class="text-[11px] text-[#6f6d85] mt-0.5">
                          Dispatched in real time whenever a parcel transitions to Picked Up, In Transit, Out for Delivery, or Delivered.
                        </div>
                      </div>
                    </label>

                    <label class="flex items-start gap-3 p-3.5 rounded-2xl border border-[#e8e2dc] bg-[#faf8f6] hover:border-[#a53a26]/40 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        [checked]="settingsForm.subscribedEvents.includes('PARCEL_CREATED')"
                        (change)="toggleEvent('PARCEL_CREATED')"
                        [disabled]="isSavingSettings()"
                        class="mt-0.5 rounded text-[#a53a26] focus:ring-[#a53a26]"
                      />
                      <div>
                        <div class="text-xs font-bold text-[#1d1b2c]">
                          Order Creation <span class="font-mono text-[10px] text-[#a53a26] font-normal ml-1">PARCEL_CREATED</span>
                        </div>
                        <div class="text-[11px] text-[#6f6d85] mt-0.5">
                          Dispatched immediately when a new parcel order is submitted and validated into the system.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <div class="pt-4 border-t border-[#f4efe9] flex justify-end">
                  <button
                    type="button"
                    (click)="saveSettings()"
                    [disabled]="isSavingSettings() || isLoadingSettings()"
                    class="px-6 py-2.5 bg-[#a53a26] hover:bg-[#7e2615] text-white font-bold text-xs rounded-full transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {{ isSavingSettings() ? 'Saving...' : 'Save Settings' }}
                  </button>
                </div>
              </div>

              <!-- HMAC Secret Card -->
              <div class="bg-white rounded-3xl border border-[#eee7e0] p-6 sm:p-7 shadow-sm space-y-4">
                <div>
                  <span class="text-[10px] font-black uppercase tracking-widest text-[#a53a26]">Security & Signatures</span>
                  <h2 class="text-xl font-black text-[#1d1b2c] tracking-tight mt-0.5">HMAC-SHA256 Signing Secret</h2>
                </div>
                <p class="text-xs text-[#6f6d85]">
                  SwiftDrop cryptographically signs each outbound HTTP POST payload. Verify the signature in the <code>X-SwiftDrop-Signature</code> header.
                </p>

                <!-- One-time Secret Alert -->
                <div *ngIf="settings()?.rawSecret" class="p-5 rounded-2xl bg-[#faf6f0] border border-[#a53a26]/30 text-[#1d1b2c] text-xs space-y-3">
                  <div class="font-bold flex items-center justify-between text-[#a53a26]">
                    <span class="flex items-center gap-1.5">
                      <span>⚠️</span> Copy your new signing secret now!
                    </span>
                    <button
                      type="button"
                      (click)="copyToClipboard(settings()!.rawSecret!, 'Signing secret')"
                      class="px-3 py-1 bg-[#a53a26] hover:bg-[#7e2615] text-white text-[11px] font-bold rounded-full transition-colors cursor-pointer"
                    >
                      Copy Secret
                    </button>
                  </div>
                  <p class="text-[11px] text-[#6f6d85]">This secret will not be displayed in full again after leaving this page:</p>
                  <div class="font-mono bg-white p-3 rounded-xl border border-[#e8e2dc] text-[#1d1b2c] break-all select-all font-bold text-xs">
                    {{ settings()?.rawSecret }}
                  </div>
                  <div class="pt-1">
                    <button type="button" (click)="dismissSecret()" class="text-xs text-[#a53a26] underline font-bold cursor-pointer">
                      I have saved this secret
                    </button>
                  </div>
                </div>

                <div class="flex items-center justify-between p-4 bg-[#faf8f6] rounded-2xl border border-[#e8e2dc]">
                  <div>
                    <span class="text-[10px] uppercase font-bold text-[#a09eaf] block">Active Secret Preview</span>
                    <span class="font-mono text-xs font-bold text-[#1d1b2c] mt-0.5 block">
                      {{ settings()?.secretPreview || 'No secret configured' }}
                    </span>
                  </div>
                  <button
                    type="button"
                    (click)="regenerateSecret()"
                    [disabled]="isSavingSettings() || isLoadingSettings()"
                    class="px-4 py-2 border border-[#e8e2dc] hover:bg-white text-[#1d1b2c] text-xs font-bold rounded-full transition-colors cursor-pointer shadow-sm"
                  >
                    Regenerate Secret
                  </button>
                </div>
              </div>
            </div>

            <!-- Right Col: Test Webhook Card -->
            <div class="bg-white rounded-3xl border border-[#eee7e0] p-6 sm:p-7 shadow-sm space-y-5 h-fit">
              <div class="border-b border-[#f4efe9] pb-3">
                <span class="text-[10px] font-black uppercase tracking-widest text-[#a53a26]">Diagnostics</span>
                <h2 class="text-lg font-black text-[#1d1b2c] tracking-tight mt-0.5">Test Webhook Trigger</h2>
                <p class="text-xs text-[#6f6d85] mt-1">
                  Dispatch an immediate test event to verify DNS reachability, endpoint latency, and HMAC verification.
                </p>
              </div>

              <div>
                <label for="overrideUrl" class="block text-xs font-bold text-[#1d1b2c] mb-1.5">Target URL Override (Optional)</label>
                <input
                  id="overrideUrl"
                  type="url"
                  [(ngModel)]="testUrlOverride"
                  [disabled]="isTestingWebhook()"
                  placeholder="Leave empty to use configured URL"
                  class="w-full text-xs font-semibold border border-[#e8e2dc] bg-[#faf8f6] rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20"
                />
              </div>

              <button
                type="button"
                (click)="runTestWebhook()"
                [disabled]="isTestingWebhook()"
                class="w-full py-2.5 bg-[#1d1b2c] hover:bg-black text-white font-bold text-xs rounded-full disabled:opacity-50 transition-colors flex justify-center items-center gap-2 cursor-pointer shadow-md"
              >
                <span *ngIf="isTestingWebhook()" class="inline-block animate-spin">⏳</span>
                <span>{{ isTestingWebhook() ? 'Sending Test Event...' : '⚡ Send Test Event' }}</span>
              </button>

              <div *ngIf="testError()" class="rounded-2xl bg-[#fff1f2] border border-[#fecdd3] p-3 text-xs text-[#e11d48]" role="alert">
                {{ testError() }}
              </div>

              <!-- Test Execution Result Card -->
              <div
                *ngIf="testResult()"
                class="rounded-2xl p-4 text-xs space-y-2.5 border"
                [ngClass]="testResult()?.success ? 'bg-[#ecfdf5] border-[#a7f3d0] text-[#047857]' : 'bg-[#fff1f2] border-[#fecdd3] text-[#e11d48]'"
              >
                <div class="flex items-center justify-between font-bold">
                  <span>{{ testResult()?.success ? 'HTTP ' + testResult()?.statusCode + ' — Delivered' : 'Delivery Failed' }}</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/70">{{ testResult()?.latencyMs }} ms</span>
                </div>
                <div class="space-y-1 font-mono text-[11px] pt-1">
                  <div><strong>Status:</strong> {{ testResult()?.statusCode }}</div>
                  <div class="truncate"><strong>Signature:</strong> {{ testResult()?.signatureSent }}</div>
                  <div class="truncate"><strong>Timestamp:</strong> {{ testResult()?.timestampSent }}</div>
                </div>
                <div *ngIf="testResult()?.responseBodySummary" class="mt-2 p-2.5 bg-white/80 rounded-xl border text-[11px] font-mono break-all text-[#1d1b2c]">
                  {{ testResult()?.responseBodySummary }}
                </div>
                <div *ngIf="testResult()?.errorMessage" class="text-xs font-semibold">{{ testResult()?.errorMessage }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- ========================================================================= -->
        <!-- TAB 3: WEBHOOK DELIVERY LOG                                              -->
        <!-- ========================================================================= -->
        <div *ngIf="activeTab() === 'deliveries'" class="space-y-6">
          <!-- Tab Header -->
          <div>
            <h1 class="text-2xl sm:text-3xl font-black text-[#1d1b2c] tracking-tight">
              Webhook Delivery Logs
            </h1>
            <p class="text-xs text-[#6f6d85] font-medium mt-1">
              Audit real-time delivery attempts, latency metrics, and failure diagnostics across all outbound notifications.
            </p>
          </div>

          <div *ngIf="isLoadingDeliveries()" role="status" class="rounded-2xl bg-[#faf8f6] border border-[#e8e2dc] p-4 text-xs font-medium text-[#6f6d85]">
            Loading webhook deliveries...
          </div>
          <div *ngIf="deliveryError()" role="alert" class="rounded-2xl bg-[#fff1f2] border border-[#fecdd3] p-4 text-xs text-[#e11d48] flex items-center justify-between">
            <span>{{ deliveryError() }}</span>
            <button type="button" (click)="loadDeliveries()" class="font-bold underline cursor-pointer ml-3">Retry</button>
          </div>

          <!-- Log Card -->
          <div class="bg-white rounded-3xl border border-[#eee7e0] p-6 sm:p-7 shadow-sm space-y-5">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span class="text-[10px] font-black uppercase tracking-widest text-[#a53a26]">Audit Trail</span>
                <h2 class="text-lg font-black text-[#1d1b2c] tracking-tight">Outbound HTTP Deliveries</h2>
              </div>
              <div class="text-xs text-[#a09eaf]">
                Showing <strong class="text-[#1d1b2c]">{{ deliveries().length }}</strong> of <strong class="text-[#1d1b2c]">{{ deliveryTotalElements() }}</strong> deliveries
              </div>
            </div>

            <!-- Status Filter Pills -->
            <div class="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#f4efe9]">
              <span class="text-xs font-bold text-[#6f6d85] mr-1">Status:</span>
              <button
                *ngFor="let f of deliveryFilterOptions"
                type="button"
                (click)="selectedDeliveryFilter.set(f.value); loadDeliveries(0)"
                [class.filter-active]="selectedDeliveryFilter() === f.value"
                class="filter-pill px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer"
              >
                {{ f.label }}
              </button>
            </div>

            <!-- Event & Date Filter Row -->
            <div class="flex flex-wrap items-center gap-3 text-xs pt-2">
              <div class="flex items-center gap-1.5">
                <label for="deliveryEventFilter" class="font-bold text-[#6f6d85]">Event:</label>
                <select
                  id="deliveryEventFilter"
                  [(ngModel)]="selectedDeliveryEvent"
                  (change)="onDeliveryFilterChange()"
                  class="rounded-full bg-[#faf8f6] border border-[#e8e2dc] px-3.5 py-1.5 text-xs font-semibold text-[#1d1b2c] focus:outline-none"
                >
                  <option *ngFor="let event of deliveryEventFilterOptions" [value]="event.value">{{ event.label }}</option>
                </select>
              </div>
              <div class="flex items-center gap-1.5">
                <label for="deliveryFromDate" class="font-bold text-[#6f6d85]">From:</label>
                <input
                  id="deliveryFromDate"
                  type="date"
                  [(ngModel)]="deliveryFromDate"
                  (change)="onDeliveryFilterChange()"
                  class="rounded-full bg-[#faf8f6] border border-[#e8e2dc] px-3.5 py-1.5 text-xs font-semibold text-[#1d1b2c] focus:outline-none"
                />
              </div>
              <div class="flex items-center gap-1.5">
                <label for="deliveryToDate" class="font-bold text-[#6f6d85]">To:</label>
                <input
                  id="deliveryToDate"
                  type="date"
                  [(ngModel)]="deliveryToDate"
                  (change)="onDeliveryFilterChange()"
                  class="rounded-full bg-[#faf8f6] border border-[#e8e2dc] px-3.5 py-1.5 text-xs font-semibold text-[#1d1b2c] focus:outline-none"
                />
              </div>
            </div>

            <!-- Deliveries Table Container -->
            <div class="overflow-hidden rounded-2xl border border-[#f0ebe5]">
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-[#6f6d85]">
                  <thead>
                    <tr class="bg-[#faf8f6] border-b border-[#eee7e0] text-[11px] font-black uppercase tracking-wider text-[#a09eaf]">
                      <th class="py-3.5 px-4">Delivery ID</th>
                      <th class="py-3.5 px-4">Event Type</th>
                      <th class="py-3.5 px-4">Tracking #</th>
                      <th class="py-3.5 px-4">HTTP Code</th>
                      <th class="py-3.5 px-4">Status</th>
                      <th class="py-3.5 px-4">Attempts</th>
                      <th class="py-3.5 px-4">Dispatched</th>
                      <th class="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#f4efe9]">
                    <tr *ngFor="let d of deliveries()" class="hover:bg-[#faf8f6]/80 transition-colors">
                      <td class="py-3.5 px-4">
                        <span class="inline-block px-2 py-0.5 rounded-md bg-[#faf8f6] border border-[#e8e2dc] font-mono font-bold text-xs text-[#1d1b2c]">
                          {{ d.deliveryId.substring(0, 8) }}...
                        </span>
                      </td>
                      <td class="py-3.5 px-4">
                        <span class="inline-block px-2.5 py-0.5 rounded-full bg-[#a53a26]/10 text-[#a53a26] font-mono text-[11px] font-bold">
                          {{ d.eventType }}
                        </span>
                      </td>
                      <td class="py-3.5 px-4 font-mono text-xs">
                        {{ d.trackingNumber }}
                      </td>
                      <td class="py-3.5 px-4 font-mono text-xs font-bold">
                        <span [ngClass]="d.httpStatusCode && d.httpStatusCode < 300 ? 'text-emerald-700' : 'text-rose-700'">
                          {{ d.httpStatusCode || 'ERR' }}
                        </span>
                      </td>
                      <td class="py-3.5 px-4">
                        <span [ngClass]="getDeliveryBadgeClass(d.status)" class="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                          {{ d.status }}
                        </span>
                      </td>
                      <td class="py-3.5 px-4 text-xs font-bold text-[#1d1b2c]">
                        {{ d.attempts }}/5
                      </td>
                      <td class="py-3.5 px-4 text-xs text-[#a09eaf]">
                        {{ d.createdAt | date: 'MMM d, h:mm:ss a' }}
                      </td>
                      <td class="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          (click)="inspectDelivery(d)"
                          class="px-3 py-1 text-xs font-bold text-[#a53a26] hover:bg-[#faf6f0] border border-[#a53a26]/30 rounded-full transition-colors cursor-pointer"
                        >
                          Inspect
                        </button>
                        <button
                          *ngIf="d.status === 'FAILED'"
                          type="button"
                          (click)="retryDelivery(d.deliveryId)"
                          [disabled]="retryingDeliveryId() === d.deliveryId"
                          class="px-3 py-1 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-full transition-colors cursor-pointer"
                        >
                          {{ retryingDeliveryId() === d.deliveryId ? 'Retrying...' : 'Retry' }}
                        </button>
                      </td>
                    </tr>
                    <tr *ngIf="deliveries().length === 0 && !isLoadingDeliveries() && !deliveryError()">
                      <td colspan="8" class="px-6 py-8 text-center text-[#a09eaf]">
                        No webhook deliveries found.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div *ngIf="!isLoadingDeliveries() && !deliveryError() && deliveryTotalElements() > 0" class="p-4 border-t border-[#f0ebe5] bg-[#faf8f6]">
                <ui-pagination
                  [page]="deliveryPage()"
                  [size]="deliveryPageSize()"
                  [totalElements]="deliveryTotalElements()"
                  (pageChange)="loadDeliveries($event)"
                />
              </div>
            </div>
          </div>

          <!-- Enterprise Tabbed Diagnostic Inspection Modal -->
          <div *ngIf="selectedDelivery()" class="fixed inset-0 bg-[#1d1b2c]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-3xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-[#eee7e0] animate-in fade-in">
              <!-- Modal Header -->
              <div class="p-6 border-b border-[#f4efe9] flex justify-between items-center bg-[#faf8f6]">
                <div>
                  <span class="text-[10px] font-black uppercase tracking-widest text-[#a53a26]">Webhook Diagnostics</span>
                  <h3 class="text-base font-black text-[#1d1b2c] font-mono mt-0.5">{{ selectedDelivery()?.deliveryId }}</h3>
                </div>
                <button
                  type="button"
                  (click)="selectedDelivery.set(null)"
                  class="w-8 h-8 rounded-full bg-white border border-[#eee7e0] text-[#6f6d85] hover:text-[#1d1b2c] flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
                >
                  &times;
                </button>
              </div>

              <!-- Modal Tab Navigation -->
              <div class="flex items-center gap-2 px-6 pt-4 border-b border-[#f0ebe5] bg-white overflow-x-auto text-xs font-bold">
                <button
                  type="button"
                  (click)="diagnosticTab.set('overview')"
                  [class.text-[#a53a26]]="diagnosticTab() === 'overview'"
                  [class.border-[#a53a26]]="diagnosticTab() === 'overview'"
                  class="pb-3 border-b-2 border-transparent transition-colors cursor-pointer whitespace-nowrap"
                >
                  Overview
                </button>
                <button
                  type="button"
                  (click)="diagnosticTab.set('headers')"
                  [class.text-[#a53a26]]="diagnosticTab() === 'headers'"
                  [class.border-[#a53a26]]="diagnosticTab() === 'headers'"
                  class="pb-3 border-b-2 border-transparent transition-colors cursor-pointer whitespace-nowrap"
                >
                  Request Headers
                </button>
                <button
                  type="button"
                  (click)="diagnosticTab.set('payload')"
                  [class.text-[#a53a26]]="diagnosticTab() === 'payload'"
                  [class.border-[#a53a26]]="diagnosticTab() === 'payload'"
                  class="pb-3 border-b-2 border-transparent transition-colors cursor-pointer whitespace-nowrap"
                >
                  Signed Payload
                </button>
                <button
                  type="button"
                  (click)="diagnosticTab.set('response')"
                  [class.text-[#a53a26]]="diagnosticTab() === 'response'"
                  [class.border-[#a53a26]]="diagnosticTab() === 'response'"
                  class="pb-3 border-b-2 border-transparent transition-colors cursor-pointer whitespace-nowrap"
                >
                  Response Body
                </button>
              </div>

              <!-- Modal Body Content -->
              <div class="p-6 overflow-y-auto space-y-4 text-xs flex-1">
                <!-- Tab: Overview -->
                <div *ngIf="diagnosticTab() === 'overview'" class="space-y-4">
                  <div class="grid grid-cols-2 gap-4 p-4 bg-[#faf8f6] rounded-2xl border border-[#e8e2dc]">
                    <div>
                      <span class="text-[10px] uppercase font-bold text-[#a09eaf] block">Delivery Status</span>
                      <span [ngClass]="getDeliveryBadgeClass(selectedDelivery()!.status)" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mt-1">
                        {{ selectedDelivery()?.status }} (HTTP {{ selectedDelivery()?.httpStatusCode || 'ERR' }})
                      </span>
                    </div>
                    <div>
                      <span class="text-[10px] uppercase font-bold text-[#a09eaf] block">Attempts Completed</span>
                      <span class="font-bold text-[#1d1b2c] mt-1 block">{{ selectedDelivery()?.attempts }} of 5</span>
                    </div>
                    <div class="col-span-2">
                      <span class="text-[10px] uppercase font-bold text-[#a09eaf] block">Target Destination URL</span>
                      <span class="font-mono text-[11px] font-bold text-[#1d1b2c] break-all mt-0.5 block">{{ selectedDelivery()?.targetUrl }}</span>
                    </div>
                    <div>
                      <span class="text-[10px] uppercase font-bold text-[#a09eaf] block">Event Type</span>
                      <span class="font-mono text-[#a53a26] font-bold mt-0.5 block">{{ selectedDelivery()?.eventType }}</span>
                    </div>
                    <div>
                      <span class="text-[10px] uppercase font-bold text-[#a09eaf] block">Associated Tracking #</span>
                      <span class="font-mono text-[#1d1b2c] mt-0.5 block">{{ selectedDelivery()?.trackingNumber }}</span>
                    </div>
                    <div *ngIf="selectedDelivery()?.errorSummary" class="col-span-2 text-rose-700">
                      <span class="text-[10px] uppercase font-bold text-rose-500 block">Failure Reason</span>
                      <p class="font-semibold mt-0.5">{{ selectedDelivery()?.errorSummary }}</p>
                    </div>
                  </div>

                  <!-- Previous Retries Timeline -->
                  <div *ngIf="selectedDelivery()?.retryHistory?.length" class="space-y-2">
                    <span class="text-[10px] uppercase font-bold text-[#a09eaf] block">Delivery Attempt History</span>
                    <div class="space-y-2">
                      <div *ngFor="let h of selectedDelivery()?.retryHistory" class="flex justify-between items-center p-3 rounded-xl bg-[#faf8f6] border border-[#e8e2dc]">
                        <span class="font-bold text-[#1d1b2c]">Attempt #{{ h.attemptNumber }}</span>
                        <span class="font-mono text-[#6f6d85]">HTTP {{ h.httpStatusCode }}</span>
                        <span class="font-mono text-[#6f6d85]">{{ h.latencyMs }}ms</span>
                        <span [class.text-emerald-700]="h.success" [class.text-rose-700]="!h.success" class="font-bold">
                          {{ h.success ? 'Success' : h.errorMessage || 'Failed' }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Tab: Headers -->
                <div *ngIf="diagnosticTab() === 'headers'" class="space-y-3">
                  <div class="flex justify-between items-center">
                    <span class="text-xs font-bold text-[#1d1b2c]">Outbound Request Headers</span>
                    <button
                      type="button"
                      (click)="copyDeliveryHeaders()"
                      class="px-3 py-1 bg-[#faf8f6] hover:bg-[#e8e2dc] text-[#1d1b2c] text-[11px] font-bold rounded-full border border-[#e8e2dc] transition-colors cursor-pointer"
                    >
                      Copy Headers
                    </button>
                  </div>
                  <pre class="bg-[#1d1b2c] text-white p-4 rounded-2xl overflow-x-auto text-[11px] font-mono leading-relaxed">{{ selectedDelivery()?.requestHeaders | json }}</pre>
                </div>

                <!-- Tab: Payload -->
                <div *ngIf="diagnosticTab() === 'payload'" class="space-y-3">
                  <div class="flex justify-between items-center">
                    <span class="text-xs font-bold text-[#1d1b2c]">Signed JSON Payload</span>
                    <button
                      type="button"
                      (click)="copyDeliveryPayload()"
                      class="px-3 py-1 bg-[#faf8f6] hover:bg-[#e8e2dc] text-[#1d1b2c] text-[11px] font-bold rounded-full border border-[#e8e2dc] transition-colors cursor-pointer"
                    >
                      Copy Payload
                    </button>
                  </div>
                  <pre class="bg-[#1d1b2c] text-white p-4 rounded-2xl overflow-x-auto text-[11px] font-mono leading-relaxed">{{ selectedDelivery()?.payloadJson }}</pre>
                </div>

                <!-- Tab: Response -->
                <div *ngIf="diagnosticTab() === 'response'" class="space-y-3">
                  <div class="flex justify-between items-center">
                    <span class="text-xs font-bold text-[#1d1b2c]">Endpoint Response Body</span>
                    <button
                      *ngIf="selectedDelivery()?.responseBody"
                      type="button"
                      (click)="copyDeliveryResponse()"
                      class="px-3 py-1 bg-[#faf8f6] hover:bg-[#e8e2dc] text-[#1d1b2c] text-[11px] font-bold rounded-full border border-[#e8e2dc] transition-colors cursor-pointer"
                    >
                      Copy Response
                    </button>
                  </div>
                  <pre *ngIf="selectedDelivery()?.responseBody" class="bg-[#faf8f6] text-[#1d1b2c] p-4 rounded-2xl border border-[#e8e2dc] overflow-x-auto text-[11px] font-mono leading-relaxed">{{ selectedDelivery()?.responseBody }}</pre>
                  <p *ngIf="!selectedDelivery()?.responseBody" class="text-xs text-[#a09eaf] p-4 text-center">
                    No response body returned from the destination endpoint.
                  </p>
                </div>
              </div>

              <!-- Modal Footer -->
              <div class="p-4 border-t border-[#f4efe9] bg-[#faf8f6] flex justify-end">
                <button
                  type="button"
                  (click)="selectedDelivery.set(null)"
                  class="px-6 py-2.5 bg-[#1d1b2c] hover:bg-black text-white text-xs font-bold rounded-full transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ========================================================================= -->
        <!-- TAB 4: API CREDENTIALS                                                   -->
        <!-- ========================================================================= -->
        <app-merchant-credentials *ngIf="activeTab() === 'credentials'"></app-merchant-credentials>
      </main>

      <!-- Order Detail Modal for Dashboard -->
      @if (selectedOrder()) {
        <div class="fixed inset-0 bg-[#1d1b2c]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-3xl shadow-xl max-w-lg w-full overflow-hidden border border-[#eee7e0]">
            <div class="p-6 border-b border-[#f4efe9] flex justify-between items-center bg-[#faf8f6]">
              <div>
                <span class="text-[10px] font-black uppercase tracking-widest text-[#a53a26]">Parcel Order Details</span>
                <h3 class="text-lg font-black text-[#1d1b2c] font-mono mt-0.5">{{ selectedOrder()?.trackingNumber }}</h3>
              </div>
              <button
                type="button"
                (click)="selectedOrder.set(null)"
                class="w-8 h-8 rounded-full bg-white border border-[#eee7e0] text-[#6f6d85] hover:text-[#1d1b2c] flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
              >
                &times;
              </button>
            </div>

            <div class="p-6 space-y-4 text-xs">
              <div class="grid grid-cols-2 gap-4 p-4 bg-[#faf8f6] rounded-2xl border border-[#e8e2dc]">
                <div>
                  <span class="text-[10px] uppercase font-bold text-[#a09eaf] block">Status</span>
                  <span [ngClass]="getStatusBadgeClass(selectedOrder()!.status)" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mt-1">
                    {{ selectedOrder()?.status }}
                  </span>
                </div>
                <div>
                  <span class="text-[10px] uppercase font-bold text-[#a09eaf] block">Delivery Fee</span>
                  <span class="font-mono font-bold text-sm text-[#1d1b2c] mt-1 block">
                    {{ selectedOrder()?.fee != null ? 'LKR ' + (selectedOrder()?.fee | number:'1.2-2') : '—' }}
                  </span>
                </div>
                <div class="col-span-2">
                  <span class="text-[10px] uppercase font-bold text-[#a09eaf] block">Recipient</span>
                  <p class="font-bold text-[#1d1b2c] mt-0.5">{{ selectedOrder()?.recipientName || 'Not specified' }}</p>
                  <p class="text-[#6f6d85] mt-0.5">{{ selectedOrder()?.recipientAddress || '—' }}</p>
                </div>
                <div class="col-span-2">
                  <span class="text-[10px] uppercase font-bold text-[#a09eaf] block">Created At</span>
                  <p class="font-mono text-[#1d1b2c] mt-0.5">{{ selectedOrder()?.createdAt | date: 'medium' }}</p>
                </div>
              </div>

              <div class="rounded-2xl border border-[#eee7e0] p-4 flex items-center justify-between">
                <div>
                  <p class="font-bold text-[#1d1b2c]">Carrier Delivery Service</p>
                  <p class="text-[11px] text-[#6f6d85]">SwiftDrop Express Logistics Network</p>
                </div>
                <span class="w-8 h-8 rounded-full bg-[#a53a26]/10 text-[#a53a26] flex items-center justify-center font-bold text-xs">
                  SD
                </span>
              </div>
            </div>

            <div class="p-4 border-t border-[#f4efe9] bg-[#faf8f6] flex justify-end">
              <button
                type="button"
                (click)="selectedOrder.set(null)"
                class="px-5 py-2.5 rounded-full bg-[#1d1b2c] hover:bg-black text-white font-bold text-xs transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      color: #1d1b2c;
      font-family: "Plus Jakarta Sans", system-ui, -apple-system, sans-serif;
    }

    .rail-icon-btn.rail-active {
      color: #a53a26;
      background-color: #ffffff;
      box-shadow: 0 4px 12px rgba(165, 58, 38, 0.12);
    }

    .filter-pill {
      background: #f1f5f9;
      color: #6f6d85;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .filter-pill:hover {
      background: #e2e8f0;
      color: #1d1b2c;
    }

    .filter-pill.filter-active {
      background: #a53a26;
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(165, 58, 38, 0.22);
    }
  `],
})
export class MerchantComponent implements OnInit, OnDestroy {
  private merchantService = inject(MerchantService);
  private authService = inject(AuthService, { optional: true });
  private router = inject(Router, { optional: true });

  private orderSubscription?: Subscription;
  private countsSubscription?: Subscription;
  private deliverySubscription?: Subscription;
  private detailSubscription?: Subscription;

  activeTab = signal<ActiveTab>('orders');
  notification = signal<string | null>(null);
  profileMenuOpen = signal<boolean>(false);
  selectedOrder = signal<MerchantOrder | null>(null);
  diagnosticTab = signal<'overview' | 'headers' | 'payload' | 'response'>('overview');

  readonly merchantName = computed(() => this.authService?.currentUser()?.fullName || 'Merchant Partner');
  readonly merchantEmail = computed(() => this.authService?.currentUser()?.email || 'merchant@swiftdrop.lk');
  readonly merchantInitials = computed(() => {
    const name = this.merchantName();
    if (!name) return 'M';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  });

  // Orders State
  orders = signal<MerchantOrder[]>([]);
  counts = signal<OrderCounts>({ total: 0, created: 0, inTransit: 0, delivered: 0, failed: 0, cancelled: 0 });
  selectedStatusFilter = signal<string>('ALL');
  searchQuery = '';
  fromDate = '';
  toDate = '';

  // Pagination & Loading States
  currentPage = signal<number>(0);
  pageSize = signal<number>(20);
  totalElements = signal<number>(0);
  totalPages = signal<number>(0);
  isLoadingOrders = signal<boolean>(false);
  orderError = signal<string | null>(null);
  isLoadingCounts = signal<boolean>(true);
  countsError = signal<string | null>(null);

  statusFilterOptions = [
    { label: 'All', value: 'ALL' },
    { label: 'Created', value: 'CREATED' },
    { label: 'Picked Up', value: 'PICKED_UP' },
    { label: 'In Transit', value: 'IN_TRANSIT' },
    { label: 'Out for Delivery', value: 'OUT_FOR_DELIVERY' },
    { label: 'Delivered', value: 'DELIVERED' },
    { label: 'Failed', value: 'FAILED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  // Settings State
  settings = signal<WebhookSettings | null>(null);
  isLoadingSettings = signal(false);
  isSavingSettings = signal(false);
  settingsError = signal<string | null>(null);
  settingsForm = {
    url: '',
    active: true,
    subscribedEvents: ['PARCEL_STATUS_CHANGED', 'PARCEL_CREATED'],
  };

  // Test Webhook State
  testUrlOverride = '';
  isTestingWebhook = signal<boolean>(false);
  testResult = signal<TestWebhookResult | null>(null);
  testError = signal<string | null>(null);

  // Deliveries State
  deliveries = signal<WebhookDeliveryItem[]>([]);
  selectedDeliveryFilter = signal<string>('ALL');
  selectedDeliveryEvent = 'ALL';
  deliveryFromDate = '';
  deliveryToDate = '';
  selectedDelivery = signal<WebhookDeliveryItem | null>(null);
  deliveryError = signal<string | null>(null);
  isLoadingDeliveries = signal(false);
  deliveryPage = signal(0);
  deliveryPageSize = signal(20);
  deliveryTotalElements = signal(0);
  retryingDeliveryId = signal<string | null>(null);

  deliveryFilterOptions = [
    { label: 'All', value: 'ALL' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Success (2xx)', value: 'SUCCESS' },
    { label: 'Failed', value: 'FAILED' },
    { label: 'Pending Retry', value: 'PENDING_RETRY' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  deliveryEventFilterOptions = [
    { label: 'All events', value: 'ALL' },
    { label: 'Parcel created', value: 'PARCEL_CREATED' },
    { label: 'Parcel status changed', value: 'PARCEL_STATUS_CHANGED' },
    { label: 'Test event', value: 'TEST_EVENT' },
  ];

  ngOnInit(): void {
    this.loadOrders();
    this.loadOrderCounts();
    this.loadSettings();
    this.loadDeliveries();
  }

  ngOnDestroy(): void {
    this.orderSubscription?.unsubscribe();
    this.countsSubscription?.unsubscribe();
    this.deliverySubscription?.unsubscribe();
    this.detailSubscription?.unsubscribe();
  }

  toggleProfileMenu(): void {
    this.profileMenuOpen.update((v) => !v);
  }

  navigateToBulk(): void {
    if (this.router) {
      this.router.navigate(['/merchant/bulk']);
    } else {
      window.location.assign('/merchant/bulk');
    }
  }

  logOut(): void {
    if (this.authService) {
      this.authService.logout().subscribe({
        next: () => this.router?.navigate(['/login']),
        error: () => this.router?.navigate(['/login']),
      });
    } else {
      this.router?.navigate(['/login']);
    }
  }

  selectTab(tab: ActiveTab): void {
    if (tab !== 'settings') {
      this.dismissSecret();
    }
    this.activeTab.set(tab);
  }

  dismissSecret(): void {
    const current = this.settings();
    if (current?.rawSecret) {
      this.settings.set({ ...current, rawSecret: null });
    }
  }

  viewOrderDetails(order: MerchantOrder): void {
    this.selectedOrder.set(order);
  }

  loadOrders(page: number = this.currentPage()): void {
    this.orderSubscription?.unsubscribe();
    this.currentPage.set(page);
    this.isLoadingOrders.set(true);
    this.orderError.set(null);

    const params: MerchantOrderFilterParams = {
      status: this.selectedStatusFilter() !== 'ALL' ? this.selectedStatusFilter() : undefined,
      trackingNumber: this.searchQuery?.trim() || undefined,
      from: this.fromDate ? new Date(this.fromDate).toISOString() : undefined,
      to: this.toDate ? new Date(this.toDate + 'T23:59:59.999Z').toISOString() : undefined,
      page,
      size: this.pageSize(),
    };

    this.orderSubscription = this.merchantService.getOrders(params).subscribe({
      next: (res) => {
        this.orders.set(res.content);
        this.totalElements.set(res.totalElements);
        this.totalPages.set(res.totalPages);
        this.isLoadingOrders.set(false);
      },
      error: () => {
        this.orderError.set('Unable to load merchant orders. Please check network connection and retry.');
        this.isLoadingOrders.set(false);
      },
    });
  }

  loadOrderCounts(): void {
    this.countsSubscription?.unsubscribe();
    this.isLoadingCounts.set(true);
    this.countsError.set(null);
    this.countsSubscription = this.merchantService.getOrderCounts().subscribe({
      next: (c) => {
        this.counts.set(c);
        this.isLoadingCounts.set(false);
      },
      error: () => {
        this.countsError.set('Unable to load order counts.');
        this.isLoadingCounts.set(false);
      },
    });
  }

  refreshOrders(): void {
    this.loadOrders();
    this.loadOrderCounts();
  }

  onStatusFilterChange(status: string): void {
    this.selectedStatusFilter.set(status);
    this.loadOrders(0);
  }

  onSearchChange(): void {
    this.loadOrders(0);
  }

  onDateFilterChange(): void {
    this.loadOrders(0);
  }

  resetFilters(): void {
    this.selectedStatusFilter.set('ALL');
    this.searchQuery = '';
    this.fromDate = '';
    this.toDate = '';
    this.loadOrders(0);
  }

  onPageChange(newPage: number): void {
    this.loadOrders(newPage);
  }

  loadSettings(): void {
    if (this.isLoadingSettings()) return;
    this.isLoadingSettings.set(true);
    this.settingsError.set(null);
    this.merchantService.getWebhookSettings().pipe(finalize(() => this.isLoadingSettings.set(false))).subscribe({
      next: (s) => {
        this.settings.set({ ...s, rawSecret: null });
        this.settingsForm.url = s.url || '';
        this.settingsForm.active = s.active;
        this.settingsForm.subscribedEvents = [...s.subscribedEvents];
      },
      error: (error: HttpErrorResponse) => {
        this.settings.set(null);
        this.settingsError.set(this.apiErrorMessage(error, 'Unable to load webhook settings.'));
      },
    });
  }

  toggleEvent(eventType: string): void {
    if (this.isSavingSettings()) return;
    const list = this.settingsForm.subscribedEvents;
    const idx = list.indexOf(eventType);
    if (idx > -1) {
      list.splice(idx, 1);
    } else {
      list.push(eventType);
    }
  }

  saveSettings(): void {
    this.submitSettings(false);
  }

  regenerateSecret(): void {
    if (this.isSavingSettings() || this.isLoadingSettings()) return;
    if (confirm('Are you sure you want to regenerate your HMAC signing secret? Outbound signatures will immediately use the new secret.')) {
      this.submitSettings(true);
    }
  }

  private submitSettings(regenerateSecret: boolean): void {
    if (this.isSavingSettings() || this.isLoadingSettings() || !this.settings()) return;
    this.settingsError.set(null);
    const url = this.settingsForm.url.trim();
    if (!this.isHttpsUrl(url)) {
      this.settingsError.set('Enter a valid public HTTPS destination URL.');
      return;
    }
    this.isSavingSettings.set(true);
    this.merchantService.updateWebhookSettings(
      url, this.settingsForm.active, [...this.settingsForm.subscribedEvents], regenerateSecret
    ).pipe(finalize(() => this.isSavingSettings.set(false))).subscribe({
      next: (updated) => {
        this.settings.set(updated);
        this.settingsForm.url = updated.url || '';
        this.notification.set(updated.rawSecret
          ? 'Webhook settings saved. Copy the new signing secret now.'
          : 'Webhook configuration saved successfully.');
      },
      error: (error: HttpErrorResponse) => {
        this.settingsError.set(this.apiErrorMessage(error, 'Unable to save webhook settings.'));
      },
    });
  }

  runTestWebhook(): void {
    if (this.isTestingWebhook() || !this.settings()) return;
    this.testError.set(null);
    const override = this.testUrlOverride.trim();
    if (override && !this.isHttpsUrl(override)) {
      this.testError.set('Enter a valid public HTTPS test URL or leave the override empty.');
      return;
    }
    this.isTestingWebhook.set(true);
    this.testResult.set(null);

    this.merchantService.triggerTestWebhook(override).pipe(finalize(() => this.isTestingWebhook.set(false))).subscribe({
      next: (res) => {
        this.testResult.set(res);
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 502 && this.isTestResult(error.error)) {
          this.testResult.set(error.error);
        } else {
          this.testError.set(this.apiErrorMessage(error, 'Unable to send the test event.'));
        }
      },
    });
  }

  loadDeliveries(page = this.deliveryPage()): void {
    this.deliverySubscription?.unsubscribe();
    this.deliveryPage.set(page);
    this.isLoadingDeliveries.set(true);
    this.deliveryError.set(null);
    this.deliverySubscription = this.merchantService.getDeliveryLogs(
      this.selectedDeliveryFilter(),
      page,
      this.deliveryPageSize(),
      this.selectedDeliveryEvent,
      this.deliveryFromDate ? new Date(this.deliveryFromDate).toISOString() : undefined,
      this.deliveryToDate ? new Date(this.deliveryToDate + 'T23:59:59.999Z').toISOString() : undefined)
      .pipe(finalize(() => this.isLoadingDeliveries.set(false))).subscribe({
      next: (result) => {
        this.deliveries.set(result.content);
        this.deliveryTotalElements.set(result.totalElements);
      },
      error: (error: HttpErrorResponse) => {
        this.deliveries.set([]);
        this.deliveryTotalElements.set(0);
        this.deliveryError.set(this.apiErrorMessage(error, 'Unable to load webhook deliveries.'));
      },
    });
  }

  onDeliveryFilterChange(): void {
    this.loadDeliveries(0);
  }

  copyToClipboard(text: string, label: string): void {
    if (!text) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.notification.set(`${label} copied to clipboard.`);
      }).catch(() => {
        this.notification.set(`${label} ready to copy.`);
      });
    } else {
      this.notification.set(`${label} ready to copy.`);
    }
  }

  copyDeliveryHeaders(): void {
    const headers = this.selectedDelivery()?.requestHeaders;
    if (headers) {
      this.copyToClipboard(JSON.stringify(headers, null, 2), 'Headers');
    }
  }

  copyDeliveryPayload(): void {
    const payload = this.selectedDelivery()?.payloadJson;
    if (payload) {
      this.copyToClipboard(payload, 'Payload');
    }
  }

  copyDeliveryResponse(): void {
    const response = this.selectedDelivery()?.responseBody;
    if (response) {
      this.copyToClipboard(response, 'Response body');
    }
  }

  inspectDelivery(item: WebhookDeliveryItem): void {
    this.diagnosticTab.set('overview');
    this.detailSubscription?.unsubscribe();
    this.deliveryError.set(null);
    this.detailSubscription = this.merchantService.getDeliveryDetail(item.deliveryId).subscribe({
      next: (detail) => this.selectedDelivery.set({
        ...item,
        ...detail,
        httpStatusCode: detail.httpStatusCode === null ? undefined : detail.httpStatusCode,
        lastAttemptAt: detail.lastAttemptAt ?? undefined,
        payloadJson: detail.payload == null ? undefined : JSON.stringify(detail.payload, null, 2),
        requestHeaders: detail.requestHeaders || undefined,
        responseHeaders: detail.responseHeaders || undefined,
        responseBody: detail.responseBody || undefined,
      }),
      error: (error: HttpErrorResponse) => {
        this.deliveryError.set(this.apiErrorMessage(error, 'Unable to load delivery details.'));
      },
    });
  }

  retryDelivery(deliveryId: string): void {
    if (this.retryingDeliveryId() !== null ||
        !this.deliveries().some((delivery) => delivery.deliveryId === deliveryId && delivery.status === 'FAILED')) {
      return;
    }
    this.retryingDeliveryId.set(deliveryId);
    this.merchantService.retryDelivery(deliveryId)
      .pipe(finalize(() => this.retryingDeliveryId.set(null))).subscribe({
      next: (updated) => {
        this.notification.set(`Delivery retry accepted (${updated.status}).`);
        this.loadDeliveries();
        const selected = this.selectedDelivery();
        if (selected?.deliveryId === deliveryId) {
          this.inspectDelivery(selected);
        }
      },
      error: (error: HttpErrorResponse) => {
        this.deliveryError.set(this.apiErrorMessage(error, 'Unable to retry delivery.'));
      },
    });
  }

  private isHttpsUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password;
    } catch {
      return false;
    }
  }

  private isTestResult(value: unknown): value is TestWebhookResult {
    return typeof value === 'object' && value !== null &&
      'success' in value && 'statusCode' in value && 'latencyMs' in value;
  }

  private apiErrorMessage(error: HttpErrorResponse, fallback: string): string {
    if (error.status === 400) return 'The URL or request was rejected. Check the destination and try again.';
    if (error.status === 401) return 'Your session has expired. Sign in and try again.';
    if (error.status === 403) return 'Your merchant account cannot perform this action.';
    return fallback;
  }

  getStatusBadgeClass(status: ParcelLifecycleStatus): string {
    switch (status) {
      case 'DELIVERED':
        return 'bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0]';
      case 'IN_TRANSIT':
      case 'PICKED_UP':
      case 'OUT_FOR_DELIVERY':
        return 'bg-[#fffbeb] text-[#b45309] border border-[#fde68a]';
      case 'FAILED':
        return 'bg-[#fff1f2] text-[#e11d48] border border-[#fecdd3]';
      case 'CANCELLED':
        return 'bg-[#f1f5f9] text-[#64748b] border border-[#cbd5e1]';
      case 'CREATED':
        return 'bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0]';
      default:
        return 'bg-[#faf6f0] text-[#a53a26] border border-[#a53a26]/20';
    }
  }

  getDeliveryBadgeClass(status: WebhookDeliveryStatus): string {
    switch (status) {
      case 'SUCCESS':
        return 'bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0]';
      case 'FAILED':
        return 'bg-[#fff1f2] text-[#e11d48] border border-[#fecdd3]';
      case 'PENDING_RETRY':
        return 'bg-[#fffbeb] text-[#b45309] border border-[#fde68a]';
      default:
        return 'bg-[#f1f5f9] text-[#64748b] border border-[#cbd5e1]';
    }
  }
}
