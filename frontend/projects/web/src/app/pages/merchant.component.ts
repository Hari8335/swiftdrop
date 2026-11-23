import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, OnDestroy, OnInit, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterOutlet } from '@angular/router';
import { Subscription, catchError, finalize, from, map, mergeMap, of } from 'rxjs';
import { AuthService } from 'shared-auth';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  LoadingStateComponent,
  PaginationComponent,
  StatusBadgeComponent,
} from 'ui';
import {
  DeliveryAttempt,
  MerchantOrder,
  MerchantOrderDetails,
  MerchantOrderFilterParams,
  MerchantProfile,
  OrderCounts,
  ParcelLifecycleStatus,
  TestWebhookResult,
  WebhookDeliveryItem,
  WebhookDeliveryStatus,
  WebhookSettings,
} from './merchant/merchant.model';
import { MerchantService } from './merchant/merchant.service';
import { MerchantCredentialsComponent } from './merchant/merchant-credentials.component';
import { MERCHANT_STATUS_LABELS, MerchantSettingsComponent } from './merchant/merchant-settings.component';
import { MerchantNotificationBellComponent } from './merchant/merchant-notification-bell.component';
import { MerchantNotificationsService } from './merchant/merchant-notifications.service';

/** 'settings' is Webhook Settings; 'account' is the merchant's own account Settings page. */
type ActiveTab = 'orders' | 'settings' | 'deliveries' | 'credentials' | 'account';
type DiagnosticTab = 'overview' | 'headers' | 'payload' | 'response';

/** One row of the diagnostics attempt history, labelled by retry cycle. */
export interface AttemptHistoryRow {
  attempt: DeliveryAttempt;
  /** 0 = the automatic delivery cycle; 1+ = the n-th manual retry cycle. */
  cycle: number;
  manual: boolean;
  label: string;
}

const PARCEL_STATUSES: readonly ParcelLifecycleStatus[] = [
  'CREATED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELLED',
];

/** Merchant-facing description of a parcel status transition carried by a webhook. */
const PARCEL_UPDATE_LABELS: Record<ParcelLifecycleStatus, string> = {
  CREATED: 'Order Created',
  PICKED_UP: 'Parcel Picked Up',
  IN_TRANSIT: 'In Transit',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Parcel Delivered',
  FAILED: 'Delivery Failed',
  CANCELLED: 'Order Cancelled',
};

/** Background refresh cadence for the orders dashboard. */
export const MERCHANT_DASHBOARD_REFRESH_MS = 20_000;
const SEARCH_DEBOUNCE_MS = 350;
const PARCEL_STATUS_LOOKUP_CONCURRENCY = 3;

@Component({
  selector: 'app-merchant',
  standalone: true,
  host: { '(document:keydown.escape)': 'cancelLogout()' },
  imports: [
    CommonModule,
    FormsModule,
    RouterOutlet,
    MerchantCredentialsComponent,
    MerchantSettingsComponent,
    MerchantNotificationBellComponent,
    PaginationComponent,
    StatusBadgeComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
  ],
  template: `
    <!-- Full-Screen Merchant Portal Shell Matching Customer Portal Template -->
    <div class="merchant-shell w-full min-h-screen flex flex-col md:flex-row bg-white">
      <!-- Merchant navigation follows the Admin portal's fixed, expanding sidebar. -->
      <aside
        class="fixed inset-y-0 left-0 z-40 hidden h-screen w-20 flex-col justify-between overflow-y-auto overflow-x-hidden border-r border-[#ece9e4] bg-white py-5 px-3 transition-all duration-300 ease-in-out hover:w-[272px] has-[:focus-visible]:w-[272px] hover:shadow-[0_15px_35px_rgba(0,0,0,0.08)] group lg:flex"
        aria-label="Merchant Navigation"
      >
        <div>
          <button type="button" (click)="selectTab('orders')" aria-label="SwiftDrop merchant home" class="flex items-center gap-3 px-1 text-left">
            <span class="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#9b432f] text-white shadow-[0_8px_18px_rgba(155,67,47,0.25)]">
              <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
            </span>
            <span class="whitespace-nowrap text-base font-extrabold tracking-tight text-[#211f32] opacity-0 transition-opacity duration-200 group-hover:opacity-100">SwiftDrop Merchant</span>
          </button>

          <nav class="mt-8 flex flex-col gap-1.5" aria-label="Merchant primary navigation">
            <button
              type="button" (click)="selectTab('orders')" aria-label="Orders Dashboard"
              [ngClass]="!bulkPageActive() && activeTab() === 'orders' ? 'bg-[#faf0ec] text-[#9b432f] font-bold shadow-xs ring-1 ring-[#f2ded8]' : 'text-[#6f6d85] hover:bg-[#fbf7f5] hover:text-[#9b432f]'"
              class="relative flex h-11 w-full items-center rounded-2xl px-3 transition-all duration-200"
            >
              <span class="grid h-5 w-5 shrink-0 place-items-center"><svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg></span>
              <span class="ml-3.5 whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-200 group-hover:opacity-100">Orders Dashboard</span>
            </button>

            <div class="relative w-full">
              <button type="button" (click)="toggleIntegrationsMenu()" aria-label="Integrations"
                aria-controls="merchant-integrations-menu" [attr.aria-expanded]="integrationsMenuOpen()"
                [ngClass]="isIntegrationTab() ? 'bg-[#faf0ec] text-[#9b432f] font-bold shadow-xs ring-1 ring-[#f2ded8]' : 'text-[#6f6d85] hover:bg-[#fbf7f5] hover:text-[#9b432f]'"
                class="flex h-11 w-full items-center gap-2 rounded-2xl px-2 transition-all duration-200">
                <ng-container *ngTemplateOutlet="integrationsIcon" />
                <span class="whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-has-[:focus-visible]:opacity-100">Integrations</span>
              </button>
              @if (integrationsMenuOpen()) {
                <div id="merchant-integrations-menu" class="ml-7 mt-1 hidden space-y-0.5 group-hover:block group-has-[:focus-visible]:block">
                  <ng-container *ngTemplateOutlet="integrationLinks" />
                </div>
              }
            </div>

            <button type="button" (click)="navigateToBulk()" aria-label="Bulk CSV Orders" [attr.aria-current]="bulkPageActive() ? 'page' : null" class="relative flex h-11 w-full items-center rounded-2xl px-3 text-[#6f6d85] transition-all duration-200 hover:bg-[#fbf7f5] hover:text-[#9b432f]">
              <ng-container *ngTemplateOutlet="bulkPlusIcon" />
              <span class="ml-3.5 whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-200 group-hover:opacity-100">Bulk CSV Orders</span>
            </button>
          </nav>
        </div>

        <div class="flex flex-col gap-1.5 border-t border-[#f0ece8] pt-3">
          <button
            type="button" id="merchant-sidebar-settings-btn" (click)="selectTab('account')" aria-label="Settings"
            [attr.aria-current]="!bulkPageActive() && activeTab() === 'account' ? 'page' : null"
            [ngClass]="!bulkPageActive() && activeTab() === 'account' ? 'bg-[#faf0ec] text-[#9b432f] font-bold shadow-xs ring-1 ring-[#f2ded8]' : 'text-[#6f6d85] hover:bg-[#fbf7f5] hover:text-[#9b432f]'"
            class="relative flex h-11 w-full items-center rounded-2xl px-3 transition-all duration-200"
          >
            <ng-container *ngTemplateOutlet="settingsIcon" />
            <span class="ml-3.5 whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-has-[:focus-visible]:opacity-100">Settings</span>
          </button>
          <button type="button" id="merchant-sidebar-logout-btn" (click)="openLogoutConfirm()" aria-label="Log out" class="relative flex h-11 w-full items-center rounded-2xl px-3 text-[#6f6d85] transition-all duration-200 hover:bg-[#faf0ec] hover:text-[#9b432f]">
            <span class="grid h-5 w-5 shrink-0 place-items-center"><svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></span>
            <span class="ml-3.5 whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-200 group-hover:opacity-100">Log out</span>
          </button>
        </div>
      </aside>

      <nav class="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-[#ece9e4] bg-white px-2 py-2 shadow-[0_-8px_24px_rgba(42,32,25,0.06)] lg:hidden" aria-label="Merchant navigation (mobile)">
        <button type="button" (click)="openLogoutConfirm()" aria-label="Log out" class="grid h-11 w-11 place-items-center rounded-xl text-[#6f6d85] hover:bg-[#faf0ec] hover:text-[#9b432f]"><svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></button>
        <button type="button" (click)="selectTab('orders')" aria-label="Orders Dashboard" class="grid h-11 w-11 place-items-center rounded-xl text-[#6f6d85] hover:bg-[#faf0ec] hover:text-[#9b432f]"><svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg></button>
        <div class="relative">
          <button type="button" (click)="toggleIntegrationsMenu()" aria-label="Integrations"
            aria-controls="merchant-mobile-integrations-menu" [attr.aria-expanded]="integrationsMenuOpen()"
            class="grid h-11 w-11 place-items-center rounded-xl text-[#6f6d85] hover:bg-[#faf0ec] hover:text-[#9b432f]">
            <ng-container *ngTemplateOutlet="integrationsIcon" />
          </button>
          @if (integrationsMenuOpen()) {
            <div id="merchant-mobile-integrations-menu" class="absolute bottom-full left-1/2 mb-2 w-56 -translate-x-1/2 rounded-2xl border border-[#e8e4df] bg-white p-2 shadow-[0_12px_32px_rgba(33,31,50,0.12)]">
              <ng-container *ngTemplateOutlet="integrationLinks" />
            </div>
          }
        </div>
        <button type="button" (click)="navigateToBulk()" aria-label="Bulk CSV Orders" [attr.aria-current]="bulkPageActive() ? 'page' : null" class="grid h-11 w-11 place-items-center rounded-xl text-[#6f6d85] hover:bg-[#faf0ec] hover:text-[#9b432f]">
          <ng-container *ngTemplateOutlet="bulkPlusIcon" />
        </button>
        <button type="button" id="merchant-mobile-settings-btn" (click)="selectTab('account')" aria-label="Settings"
          [attr.aria-current]="!bulkPageActive() && activeTab() === 'account' ? 'page' : null"
          [ngClass]="!bulkPageActive() && activeTab() === 'account' ? 'bg-[#faf0ec] text-[#9b432f]' : 'text-[#6f6d85]'"
          class="grid h-11 w-11 place-items-center rounded-xl hover:bg-[#faf0ec] hover:text-[#9b432f]">
          <ng-container *ngTemplateOutlet="settingsIcon" />
        </button>
      </nav>

      <ng-template #settingsIcon>
        <span class="grid h-5 w-5 shrink-0 place-items-center">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </span>
      </ng-template>

      <ng-template #integrationsIcon>
        <span class="flex shrink-0 items-center gap-1" aria-hidden="true">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M8 7h8M8 17h8" />
            <circle cx="5" cy="7" r="2" /><circle cx="19" cy="7" r="2" />
            <circle cx="5" cy="17" r="2" /><circle cx="19" cy="17" r="2" />
          </svg>
          <svg class="h-3 w-3 transition-transform" [class.rotate-180]="integrationsMenuOpen()"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </ng-template>

      <ng-template #integrationLinks>
        @for (link of integrationTabs; track link.tab) {
          <button type="button" (click)="selectTab(link.tab)"
            [attr.aria-current]="activeTab() === link.tab ? 'page' : null"
            [class.bg-[#fff5ef]]="activeTab() === link.tab"
            [class.text-[#9b432f]]="activeTab() === link.tab"
            class="block w-full whitespace-nowrap rounded-xl px-2.5 py-2.5 text-left text-xs font-semibold text-[#77748a] transition hover:bg-[#fbf7f5] hover:text-[#9b432f]">
            {{ link.label }}
          </button>
        }
      </ng-template>

      <ng-template #bulkPlusIcon>
        <span class="grid h-7 w-7 -mx-1 shrink-0 place-items-center rounded-lg bg-[#9b432f] text-white shadow-[0_6px_14px_rgba(155,67,47,0.25)]">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </span>
      </ng-template>

      <!-- Main Content Area (Edge-to-Edge Full Screen) -->
      <main class="flex-1 min-h-screen min-w-0 bg-white pb-24 lg:pb-0 lg:ml-20">
        <router-outlet [routerOutletData]="headerName()" (activate)="onBulkOpened()" (deactivate)="onBulkClosed()" />
        @if (!bulkPageActive()) {
        <!-- Top Header: Search Bar & Merchant Profile. 80px tall so it centres on the sidebar logo. -->
        <header id="merchant-top-bar" class="sticky top-0 z-30 flex min-h-20 items-center justify-between gap-3 border-b border-[#f0ebe5] bg-white/95 px-6 py-3 backdrop-blur sm:px-8 lg:h-20 lg:px-10 lg:py-0">
          <!-- Search Input: it only filters the orders list, so it is shown on the Orders Dashboard only. -->
          @if (activeTab() === 'orders') {
          <div class="relative min-w-0 flex-1 max-w-lg">
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
              id="merchant-order-search"
              type="search"
              [(ngModel)]="searchQuery"
              (input)="onSearchInput()"
              (keyup.enter)="onSearchChange()"
              aria-label="Filter orders by tracking number"
              placeholder="Filter orders by tracking number..."
              class="w-full h-11 pl-11 pr-4 rounded-full bg-[#faf8f6] border border-[#e8e2dc] text-xs font-semibold text-[#1d1b2c] focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] transition-all"
            />
          </div>
          } @else {
            <!-- Keeps the bell and profile chip pinned to the right. -->
            <div class="flex-1" aria-hidden="true"></div>
          }

          <div class="flex shrink-0 items-center gap-3">
            <app-merchant-notification-bell />
            <div id="merchant-profile-chip" class="h-11 flex min-w-0 max-w-[14rem] items-center gap-2 rounded-full bg-[#faf8f6] border border-[#e8e2dc] pl-1.5 pr-1.5 sm:pr-4 select-none" [attr.title]="headerName()">
              <span aria-hidden="true" class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#a53a26] text-[10px] font-black text-white">{{ merchantInitials() }}</span>
              <span class="hidden truncate text-xs font-bold text-[#1d1b2c] sm:inline">{{ headerName() }}</span>
            </div>
          </div>
        </header>

        <div class="space-y-7 px-6 pt-7 pb-8 sm:px-8 lg:px-10 lg:pb-10">

        <!-- Toast Feedback -->
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
                    <span id="merchant-active-delivery-count" class="text-5xl font-black text-[#1d1b2c] tracking-tight">
                      {{ activeDeliveryCount() }}
                    </span>
                    <span class="text-sm font-bold text-[#6f6d85] ml-2">{{ activeDeliveryCount() === 1 ? 'parcel' : 'parcels' }} currently in delivery</span>
                  </div>
                  <p class="text-xs text-[#6f6d85] font-medium mt-3 max-w-xs leading-relaxed">
                    Picked up, in transit or out for delivery, out of <strong class="text-[#1d1b2c]">{{ counts().total }}</strong> orders in total.
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
              <div class="flex flex-wrap items-center gap-3 pt-5 relative z-10">
                <button
                  type="button"
                  (click)="navigateToBulk()"
                  class="px-5 py-2.5 rounded-full bg-[#a53a26] hover:bg-[#7e2615] text-white font-bold text-xs transition-all shadow-sm hover:scale-[1.02] active:scale-95 cursor-pointer text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a53a26]/40 focus-visible:ring-offset-2"
                >
                  Bulk CSV orders
                </button>
                <button
                  type="button"
                  id="refresh-tracking-btn"
                  (click)="refreshOrders()"
                  class="px-5 py-2.5 rounded-full border border-[#a53a26] text-[#a53a26] hover:bg-[#faf6f0] font-bold text-xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a53a26]/40 focus-visible:ring-offset-2"
                >
                  Refresh tracking
                </button>
                <span id="merchant-last-updated" class="text-[11px] font-medium text-[#a09eaf]" [class.invisible]="!lastUpdatedAt()">
                  Auto-updates · Last updated {{ lastUpdatedAt() | date: 'h:mm:ss a' }}
                </span>
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

              <form class="space-y-2 pt-2" (ngSubmit)="submitDirectSearch()" role="search" aria-label="Direct parcel search">
                <div class="flex flex-col sm:flex-row items-center gap-2">
                  <label for="direct-parcel-search" class="sr-only">Parcel number</label>
                  <input
                    id="direct-parcel-search"
                    name="directParcelSearch"
                    type="text"
                    autocomplete="off"
                    [(ngModel)]="directSearchQuery"
                    (ngModelChange)="directSearchError.set(null)"
                    [attr.aria-invalid]="directSearchError() ? 'true' : null"
                    aria-describedby="direct-parcel-search-feedback"
                    placeholder="Enter parcel number"
                    class="w-full sm:flex-1 px-4 py-2.5 rounded-full bg-white text-[#1d1b2c] placeholder:text-[#a09eaf] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-white/80 shadow-inner"
                  />
                  <button
                    type="submit"
                    id="direct-parcel-search-btn"
                    [disabled]="isDirectSearching()"
                    class="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#1d1b2c] hover:bg-black text-white font-black text-xs transition-all shadow-md cursor-pointer hover:scale-[1.02] active:scale-95 disabled:cursor-wait disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    {{ isDirectSearching() ? 'Searching…' : 'Track parcel' }}
                  </button>
                </div>
                <p id="direct-parcel-search-feedback" aria-live="polite" class="min-h-[1rem] px-2 text-[11px] font-semibold text-white">
                  {{ directSearchError() }}
                </p>
              </form>
            </div>
          </div>

          <!-- KPI Summary Cards Row -->
          <div *ngIf="isLoadingCounts() && !countsLoaded()" role="status" class="rounded-2xl bg-[#faf8f6] border border-[#e8e2dc] p-4 text-xs font-medium text-[#6f6d85]">
            Loading order counts...
          </div>
          <div *ngIf="!isLoadingCounts() && countsError()" role="alert" class="rounded-2xl bg-[#fff1f2] border border-[#fecdd3] p-4 text-xs text-[#e11d48] flex items-center justify-between">
            <span>{{ countsError() }}</span>
            <button type="button" (click)="loadOrderCounts()" class="ml-3 rounded-full px-3 py-1.5 font-bold text-[#be123c] transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 cursor-pointer">Retry</button>
          </div>
          <div *ngIf="countsLoaded() && !countsError()" id="merchant-summary-cards" class="grid grid-cols-2 lg:grid-cols-5 gap-4" [attr.aria-busy]="isLoadingCounts()">
            <div class="bg-white rounded-2xl border border-[#eee7e0] p-5 shadow-sm">
              <span class="text-xs font-bold uppercase tracking-wider text-[#6f6d85]">Total Orders</span>
              <div class="text-3xl font-black text-[#1d1b2c] mt-2">{{ counts().total }}</div>
              <span class="text-[11px] text-[#a09eaf] mt-1 block">All orders you have created</span>
            </div>
            <div class="bg-white rounded-2xl border border-[#eee7e0] p-5 shadow-sm">
              <span class="text-xs font-bold uppercase tracking-wider text-[#a53a26]">In Delivery</span>
              <div class="text-3xl font-black text-[#a53a26] mt-2">{{ activeDeliveryCount() }}</div>
              <span class="text-[11px] text-[#a09eaf] mt-1 block">Picked up, in transit or out for delivery</span>
            </div>
            <div class="bg-white rounded-2xl border border-[#eee7e0] p-5 shadow-sm">
              <span class="text-xs font-bold uppercase tracking-wider text-emerald-700">Delivered</span>
              <div class="text-3xl font-black text-emerald-700 mt-2">{{ counts().delivered }}</div>
              <span class="text-[11px] text-[#a09eaf] mt-1 block">Handed to the recipient</span>
            </div>
            <div id="merchant-failed-count-card" class="bg-white rounded-2xl border border-[#eee7e0] p-5 shadow-sm">
              <span class="text-xs font-bold uppercase tracking-wider text-rose-700">Delivery Failed</span>
              <div class="text-3xl font-black text-rose-700 mt-2">{{ counts().failed }}</div>
              <span class="text-[11px] text-[#a09eaf] mt-1 block">Parcel could not be delivered</span>
            </div>
            <div id="merchant-cancelled-count-card" class="col-span-2 lg:col-span-1 bg-white rounded-2xl border border-[#eee7e0] p-5 shadow-sm">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-600">Cancelled</span>
              <div class="text-3xl font-black text-slate-600 mt-2">{{ counts().cancelled }}</div>
              <span class="text-[11px] text-[#a09eaf] mt-1 block">Cancelled before delivery</span>
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
                  id="reset-order-filters-btn"
                  (click)="resetFilters()"
                  class="action-link ml-1"
                >
                  Clear filters
                </button>
              </div>

              <div class="flex items-center gap-2 text-[11px] text-[#a09eaf]">
                <span *ngIf="isLoadingOrders() && hasLoadedOrders()" id="orders-updating-indicator" role="status" class="inline-flex items-center gap-1.5 font-semibold text-[#a53a26]">
                  <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-[#a53a26]" aria-hidden="true"></span>
                  Updating…
                </span>
                <span>Showing <strong class="text-[#1d1b2c]">{{ orders().length }}</strong> of <strong class="text-[#1d1b2c]">{{ totalElements() }}</strong> parcels</span>
              </div>
            </div>

            <!-- Orders Table Container (kept mounted across refreshes to avoid flicker) -->
            <div class="min-h-[14rem] overflow-hidden rounded-2xl border border-[#f0ebe5]" [attr.aria-busy]="isLoadingOrders()">
              <div *ngIf="isLoadingOrders() && !hasLoadedOrders()" class="p-8">
                <ui-loading-state message="Loading merchant orders..." />
              </div>

              <div *ngIf="!isLoadingOrders() && orderError()" class="p-8">
                <ui-error-state
                  title="Unable to load orders"
                  [message]="orderError()!"
                  (retry)="loadOrders()"
                />
              </div>

              <div *ngIf="hasLoadedOrders() && !orderError() && orders().length === 0" class="p-8 transition-opacity duration-200" [class.opacity-60]="isLoadingOrders()">
                <ui-empty-state
                  title="No orders found"
                  message="No parcel orders match your selected filters. Try clearing your search or status filter."
                />
              </div>

              <div *ngIf="!orderError() && orders().length > 0" class="overflow-x-auto transition-opacity duration-200" [class.opacity-60]="isLoadingOrders()">
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
                    <tr *ngFor="let o of orders(); trackBy: trackOrder" class="hover:bg-[#faf8f6]/80 transition-colors">
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
                          [attr.aria-label]="'View details for parcel ' + o.trackingNumber"
                          class="action-link"
                        >
                          View details
                          <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Pagination Toolbar -->
              <div *ngIf="!orderError() && totalElements() > 0" class="p-4 border-t border-[#f0ebe5] bg-[#faf8f6]">
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
        <div *ngIf="activeTab() === 'settings'" class="mx-auto w-full max-w-7xl space-y-6">
          <!-- Account Profile Card -->
          <section id="merchant-details-card" aria-labelledby="merchant-details-title" class="overflow-hidden rounded-3xl border border-[#eee7e0] bg-white shadow-sm">
            <div class="flex flex-col gap-4 bg-gradient-to-r from-[#fbf3ef] via-[#fdf8f5] to-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div class="flex min-w-0 items-center gap-4">
                <span aria-hidden="true" class="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#a53a26] text-base font-black text-white shadow-[0_10px_22px_rgba(165,58,38,0.25)]">{{ merchantInitials() }}</span>
                <div class="min-w-0">
                  <span class="text-[10px] font-black uppercase tracking-widest text-[#a53a26]">Merchant details</span>
                  <h2 id="merchant-details-title" class="mt-0.5 flex flex-wrap items-center gap-2 text-lg font-black tracking-tight text-[#1d1b2c] sm:text-xl">
                    <span class="min-w-0 break-words">{{ merchantProfile()?.businessName || headerName() }}</span>
                    @if (merchantProfile()?.status; as status) {
                      <span id="merchant-details-status" class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold" [ngClass]="merchantStatusClass(status)">
                        <span class="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true"></span>{{ merchantStatusLabel(status) }}
                      </span>
                    }
                  </h2>
                  <p class="mt-0.5 text-xs font-medium text-[#6f6d85]">Webhooks below are sent on behalf of this business.</p>
                </div>
              </div>
              <button
                type="button"
                id="merchant-edit-profile-btn"
                (click)="openAccountSettings(true)"
                class="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-[#eee7e0] bg-white px-4 py-2 text-xs font-bold text-[#a53a26] transition-colors hover:border-[#a53a26] sm:self-auto cursor-pointer"
              >
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                Edit profile
              </button>
            </div>
            <dl class="grid grid-cols-1 gap-3 border-t border-[#f4efe9] p-5 sm:grid-cols-2 sm:px-7 xl:grid-cols-4">
              <div class="flex min-w-0 items-start gap-3 rounded-2xl bg-[#faf8f6] p-3.5">
                <span aria-hidden="true" class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#a53a26] shadow-xs">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/></svg>
                </span>
                <div class="min-w-0">
                  <dt class="text-[11px] font-semibold text-[#6f6d85]">Business name</dt>
                  <dd id="merchant-profile-business-name" class="mt-0.5 break-words text-sm font-bold text-[#1d1b2c]">{{ merchantProfile()?.businessName || 'Not available' }}</dd>
                </div>
              </div>
              <div class="flex min-w-0 items-start gap-3 rounded-2xl bg-[#faf8f6] p-3.5">
                <span aria-hidden="true" class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#a53a26] shadow-xs">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
                </span>
                <div class="min-w-0">
                  <dt class="text-[11px] font-semibold text-[#6f6d85]">Account holder</dt>
                  <dd id="merchant-profile-name" class="mt-0.5 break-words text-sm font-bold text-[#1d1b2c]">{{ merchantName() }}</dd>
                </div>
              </div>
              <div class="flex min-w-0 items-start gap-3 rounded-2xl bg-[#faf8f6] p-3.5">
                <span aria-hidden="true" class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#a53a26] shadow-xs">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
                </span>
                <div class="min-w-0">
                  <dt class="text-[11px] font-semibold text-[#6f6d85]">Email</dt>
                  <dd id="merchant-profile-email" class="mt-0.5 truncate text-sm font-bold text-[#1d1b2c]" [attr.title]="merchantEmail()">{{ merchantEmail() }}</dd>
                </div>
              </div>
              <div class="flex min-w-0 items-start gap-3 rounded-2xl bg-[#faf8f6] p-3.5">
                <span aria-hidden="true" class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#a53a26] shadow-xs">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </span>
                <div class="min-w-0">
                  <dt class="text-[11px] font-semibold text-[#6f6d85]">Phone number</dt>
                  <dd id="merchant-profile-phone" class="mt-0.5 break-words text-sm font-bold" [ngClass]="merchantPhone() ? 'text-[#1d1b2c]' : 'text-[#a09eaf]'">{{ merchantPhone() || 'Not provided' }}</dd>
                </div>
              </div>
            </dl>
          </section>

          <!-- Section A: Page Header -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div class="flex items-center gap-2.5">
                <h1 class="text-2xl sm:text-3xl font-black text-[#1d1b2c] tracking-tight">
                  Delivery Notifications
                </h1>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#a53a26]/10 text-[#a53a26] uppercase tracking-wide">
                  Webhook Settings
                </span>
              </div>
              <p class="text-xs sm:text-sm text-[#6f6d85] font-medium mt-1">
                Automatically send parcel delivery updates to your online store.
              </p>
            </div>
          </div>

          <div *ngIf="isLoadingSettings()" class="rounded-2xl bg-[#faf8f6] border border-[#e8e2dc] p-4 text-xs font-medium text-[#6f6d85]" role="status">
            Loading webhook settings...
          </div>
          <div *ngIf="settingsError()" class="rounded-2xl bg-[#fff1f2] border border-[#fecdd3] p-4 text-xs text-[#e11d48] flex items-center justify-between" role="alert">
            <span>{{ settingsError() }}</span>
            <button *ngIf="!settings()" type="button" (click)="loadSettings()" class="ml-3 rounded-full px-3 py-1.5 font-bold text-[#be123c] transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 cursor-pointer">Retry</button>
          </div>

          <div *ngIf="settings()" class="space-y-6">
            <!-- Section B: Current Configuration Summary Card -->
            <div class="bg-white rounded-3xl border border-[#eee7e0] p-6 sm:p-7 shadow-sm space-y-5">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f4efe9] pb-4">
                <div class="flex items-center gap-3">
                  <span class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#faf8f6] text-[#a53a26]">
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                  </span>
                  <div>
                    <span class="text-[10px] font-black uppercase tracking-widest text-[#a53a26]">Live Status</span>
                    <h2 class="text-lg font-black text-[#1d1b2c] tracking-tight">Configuration Summary</h2>
                  </div>
                </div>

                <div class="flex items-center gap-3">
                  <ui-status-badge
                    [status]="webhookStatusLabel()"
                    [tone]="webhookStatusTone()"
                    [label]="webhookStatusLabel()"
                  />
                  <button
                    type="button"
                    id="toggle-webhook-edit-btn"
                    (click)="startEditingWebhook()"
                    *ngIf="!isEditingWebhook()"
                    class="px-4 py-2 bg-[#a53a26] hover:bg-[#7e2615] text-white text-xs font-bold rounded-full transition-all shadow-xs cursor-pointer"
                  >
                    {{ settings()?.url ? 'Edit Configuration' : 'Configure Webhook' }}
                  </button>
                </div>
              </div>

              <!-- Summary Metadata Grid -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div class="p-4 rounded-2xl bg-[#faf8f6] border border-[#e8e2dc] space-y-1">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-[#6f6d85] block">Destination Endpoint</span>
                  @if (settings()?.url) {
                    <code class="block font-mono font-bold text-[#1d1b2c] text-xs break-all">{{ settings()?.url }}</code>
                  } @else {
                    <span class="text-[#6f6d85] italic font-medium">No destination URL configured</span>
                  }
                </div>

                <div class="p-4 rounded-2xl bg-[#faf8f6] border border-[#e8e2dc] space-y-1">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-[#6f6d85] block">Subscribed Events</span>
                  @if (settings()?.subscribedEvents?.length) {
                    <div class="flex flex-wrap gap-1.5 pt-0.5">
                      @for (ev of settings()?.subscribedEvents; track ev) {
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white border border-[#e8e2dc] text-[#1d1b2c]">
                          {{ humanReadableEvent(ev) }}
                        </span>
                      }
                    </div>
                  } @else {
                    <span class="text-[#6f6d85] italic font-medium">No event subscriptions configured</span>
                  }
                </div>
              </div>
            </div>

            <!-- Section C: Configuration Form (Shown when editing or unconfigured) -->
            <div *ngIf="isEditingWebhook()" class="bg-white rounded-3xl border border-[#a53a26]/30 p-6 sm:p-7 shadow-md space-y-6">
              <div class="flex items-center justify-between border-b border-[#f4efe9] pb-4">
                <div>
                  <span class="text-[10px] font-black uppercase tracking-widest text-[#a53a26]">Setup</span>
                  <h2 class="text-xl font-black text-[#1d1b2c] tracking-tight mt-0.5">Webhook Configuration</h2>
                </div>
                <button
                  type="button"
                  id="close-webhook-edit-btn"
                  (click)="cancelEditingWebhook()"
                  class="text-xs font-bold text-[#6f6d85] hover:text-[#1d1b2c] transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>

              <!-- Destination URL Input -->
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
                <p class="text-[11px] text-[#6f6d85] mt-1.5 leading-relaxed">
                  Enter the HTTPS endpoint from your online store's backend where SwiftDrop should send delivery updates. Your store's developer or e-commerce plugin provides this URL.
                </p>
              </div>

              <!-- Active Dispatch Toggle -->
              <div class="flex items-center justify-between p-4 rounded-2xl bg-[#faf8f6] border border-[#e8e2dc]">
                <div>
                  <div class="text-xs font-bold text-[#1d1b2c]">Enable Delivery Notifications</div>
                  <div class="text-[11px] text-[#6f6d85] mt-0.5">Toggle active webhook dispatching on or off.</div>
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

              <!-- Form Action Buttons -->
              <div class="pt-4 border-t border-[#f4efe9] flex items-center justify-end gap-3">
                <button
                  type="button"
                  id="cancel-webhook-edit-btn"
                  (click)="cancelEditingWebhook()"
                  [disabled]="isSavingSettings()"
                  class="px-5 py-2.5 border border-[#e8e2dc] hover:bg-[#faf8f6] text-[#1d1b2c] font-bold text-xs rounded-full transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="save-webhook-btn"
                  (click)="saveSettings()"
                  [disabled]="isSavingSettings() || isLoadingSettings()"
                  class="px-6 py-2.5 bg-[#a53a26] hover:bg-[#7e2615] text-white font-bold text-xs rounded-full transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {{ isSavingSettings() ? 'Saving...' : 'Save Configuration' }}
                </button>
              </div>
            </div>

            <!-- Grid for Section D & Section E -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <!-- Section D: Webhook Signing Secret Card -->
              <div class="bg-white rounded-3xl border border-[#eee7e0] p-6 sm:p-7 shadow-sm space-y-4">
                <div class="border-b border-[#f4efe9] pb-3">
                  <span class="text-[10px] font-black uppercase tracking-widest text-[#a53a26]">Security & Signatures</span>
                  <h2 class="text-lg font-black text-[#1d1b2c] tracking-tight mt-0.5">Webhook Signing Secret</h2>
                  <p class="text-xs text-[#6f6d85] mt-1 leading-relaxed">
                    Your store uses this secret to verify that delivery updates really came from SwiftDrop.
                  </p>
                </div>

                <!-- One-time Secret Alert -->
                <div *ngIf="settings()?.rawSecret" class="p-5 rounded-2xl bg-[#faf6f0] border border-[#a53a26]/30 text-[#1d1b2c] text-xs space-y-3">
                  <div class="font-bold flex items-center justify-between text-[#a53a26]">
                    <span class="flex items-center gap-1.5">
                      <svg class="w-4 h-4 text-[#a53a26]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                      <span>Copy your new signing secret now!</span>
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
                    <button type="button" id="dismiss-signing-secret-btn" (click)="dismissSecret()" class="inline-flex items-center gap-1.5 rounded-full border border-[#a53a26]/40 bg-white px-4 py-2 text-xs font-bold text-[#a53a26] transition-colors hover:bg-[#faf0ec] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a53a26]/40 cursor-pointer">
                      <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                      I have saved this secret
                    </button>
                  </div>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-3 p-4 bg-[#faf8f6] rounded-2xl border border-[#e8e2dc]">
                  <div class="min-w-0">
                    <span class="text-[10px] uppercase font-bold text-[#a09eaf] block">Active Secret Preview</span>
                    <span class="font-mono text-xs font-bold text-[#1d1b2c] mt-0.5 block break-all">
                      {{ settings()?.secretPreview || 'No secret configured' }}
                    </span>
                  </div>
                  <button
                    type="button"
                    id="regenerate-secret-btn"
                    (click)="regenerateSecret()"
                    [disabled]="isSavingSettings() || isLoadingSettings()"
                    aria-haspopup="dialog"
                    class="px-4 py-2 border border-[#e8e2dc] hover:bg-white text-[#1d1b2c] text-xs font-bold rounded-full transition-colors cursor-pointer shadow-xs disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a53a26]/40"
                  >
                    {{ isRegeneratingSecret() ? 'Regenerating…' : 'Regenerate Secret' }}
                  </button>
                </div>
              </div>

              <!-- Section E: Send Test Event Card -->
              <div class="bg-white rounded-3xl border border-[#eee7e0] p-6 sm:p-7 shadow-sm space-y-4">
                <div class="border-b border-[#f4efe9] pb-3">
                  <span class="text-[10px] font-black uppercase tracking-widest text-[#a53a26]">Diagnostics</span>
                  <h2 class="text-lg font-black text-[#1d1b2c] tracking-tight mt-0.5">Send Test Event</h2>
                  <p class="text-xs text-[#6f6d85] mt-1 leading-relaxed">
                    @if (settings()?.url) {
                      Dispatch an immediate test event to verify DNS reachability and HMAC signature verification.
                    } @else {
                      Configure a valid destination URL before sending a test notification.
                    }
                  </p>
                </div>

                <!-- Primary Test Trigger Action -->
                <button
                  type="button"
                  id="send-test-event-btn"
                  (click)="runTestWebhook()"
                  [disabled]="isTestingWebhook() || (!settings()?.url && !testUrlOverride)"
                  class="w-full py-2.5 bg-[#1d1b2c] hover:bg-black text-white font-bold text-xs rounded-full disabled:opacity-50 transition-colors flex justify-center items-center gap-2 cursor-pointer shadow-md"
                >
                  <svg *ngIf="isTestingWebhook()" class="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{{ isTestingWebhook() ? 'Sending Test Event...' : 'Send Test Event' }}</span>
                </button>

                <!-- Advanced Testing: Expandable Target URL Override -->
                <details class="group rounded-2xl border border-[#e8e2dc] bg-[#faf8f6] p-4 text-xs space-y-3">
                  <summary class="font-bold text-[#1d1b2c] cursor-pointer select-none flex items-center justify-between">
                    <span>Advanced Testing (URL Override)</span>
                    <span class="text-[#a53a26] text-[11px] group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div class="pt-2 space-y-2">
                    <label for="overrideUrl" class="block text-[11px] font-bold text-[#6f6d85]">
                      Temporary Target URL Override
                    </label>
                    <input
                      id="overrideUrl"
                      type="url"
                      [(ngModel)]="testUrlOverride"
                      [disabled]="isTestingWebhook()"
                      placeholder="https://webhook.site/test-uuid"
                      class="w-full text-xs font-semibold border border-[#e8e2dc] bg-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20"
                    />
                    <p class="text-[10px] text-[#6f6d85] leading-normal">
                      Optionally test against an inspection endpoint without updating your saved store configuration.
                    </p>
                  </div>
                </details>

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

            <!-- Section F: Developer Details (Expandable) -->
            <details class="group rounded-3xl border border-[#eee7e0] bg-white overflow-hidden shadow-sm transition-all">
              <summary class="flex items-center justify-between p-6 cursor-pointer select-none bg-white hover:bg-[#faf8f6] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a53a26]">
                <div class="flex items-center gap-3">
                  <span class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#faf8f6] text-[#a53a26]">
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="16 18 22 12 16 6"></polyline>
                      <polyline points="8 6 2 12 8 18"></polyline>
                    </svg>
                  </span>
                  <div>
                    <h2 class="text-base font-black text-[#1d1b2c] tracking-tight">Developer Details</h2>
                    <p class="text-xs text-[#6f6d85] mt-0.5">
                      HMAC-SHA256 signature verification, event payloads, delivery behavior, and retry policies.
                    </p>
                  </div>
                </div>
                <span class="grid h-8 w-8 place-items-center rounded-full bg-[#faf8f6] text-[#6f6d85] group-open:rotate-180 transition-transform">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </span>
              </summary>

              <div class="border-t border-[#f0ece8] p-6 space-y-6 bg-[#faf8f6]/40 text-xs">
                <!-- Signature Verification -->
                <div class="bg-white p-5 rounded-2xl border border-[#eee7e0] space-y-2">
                  <h3 class="font-bold text-[#1d1b2c] uppercase text-[11px] tracking-wider">HMAC Signature Verification</h3>
                  <p class="text-[#6f6d85] leading-relaxed">
                    SwiftDrop signs every outbound HTTP POST request. Compare the signature hash in <code>X-SwiftDrop-Signature</code> with an HMAC-SHA256 computed over <code>timestamp + "." + payloadJson</code> using your active signing secret.
                  </p>
                  <code class="block font-mono bg-[#1d1b2c] text-[#faf8f6] p-3 rounded-xl text-[11px] overflow-x-auto">
                    X-SwiftDrop-Signature: t=1729857600,v1=4d7f508a54ceb8...
                  </code>
                </div>

                <!-- Sample Payloads -->
                <div class="bg-white p-5 rounded-2xl border border-[#eee7e0] space-y-3">
                  <h3 class="font-bold text-[#1d1b2c] uppercase text-[11px] tracking-wider">Sample Event Payload (PARCEL_STATUS_CHANGED)</h3>
                  <pre class="font-mono bg-[#1d1b2c] text-[#faf8f6] p-4 rounded-xl text-[11px] overflow-x-auto leading-relaxed"><code>{{ '{' }}
  "eventId": "evt_01JBCDEFGHJKMNPQRSTVWXYZ",
  "eventType": "PARCEL_STATUS_CHANGED",
  "occurredAt": "2026-10-25T14:30:00Z",
  "data": {{ '{' }}
    "parcelId": "550e8400-e29b-41d4-a716-446655440000",
    "trackingNumber": "SD-20261025-001",
    "status": "OUT_FOR_DELIVERY",
    "merchantId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "externalReference": "STORE-ORDER-4421"
  {{ '}' }}
{{ '}' }}</code></pre>
                </div>

                <!-- Retry Policy -->
                <div class="bg-white p-5 rounded-2xl border border-[#eee7e0] space-y-2">
                  <h3 class="font-bold text-[#1d1b2c] uppercase text-[11px] tracking-wider">Delivery Behavior & Retry Schedule</h3>
                  <p class="text-[#6f6d85] leading-relaxed">
                    SwiftDrop expects an HTTP <code>2xx</code> response from your destination within 5 seconds. If the endpoint is unreachable or returns an error, deliveries are retried up to 5 times using exponential backoff:
                  </p>
                  <ul class="list-disc list-inside space-y-1 text-[#6f6d85] pl-1">
                    <li><strong>Attempt 1:</strong> Immediate upon event generation</li>
                    <li><strong>Attempt 2:</strong> 1 minute after initial failure</li>
                    <li><strong>Attempt 3:</strong> 5 minutes after previous failure</li>
                    <li><strong>Attempt 4:</strong> 15 minutes after previous failure</li>
                    <li><strong>Attempt 5:</strong> 30 minutes after previous failure</li>
                  </ul>
                  <p class="text-[11px] text-[#a09eaf] pt-1">
                    View delivery attempt timestamps, response headers, and payloads under the <strong>Webhook Delivery Logs</strong> tab.
                  </p>
                </div>
              </div>
            </details>
          </div>
        </div>

        <!-- ========================================================================= -->
        <!-- TAB 3: WEBHOOK DELIVERY LOG                                              -->
        <!-- ========================================================================= -->
        <div *ngIf="activeTab() === 'deliveries'" class="mx-auto w-full max-w-7xl space-y-6">
          <!-- Tab Header -->
          <div>
            <h1 class="text-2xl sm:text-3xl font-black text-[#1d1b2c] tracking-tight">
              Webhook Delivery Logs
            </h1>
            <p class="text-xs text-[#6f6d85] font-medium mt-1">
              View the delivery updates SwiftDrop has sent to your online store.
            </p>
          </div>

          <div *ngIf="deliveryError()" role="alert" class="rounded-2xl bg-[#fff1f2] border border-[#fecdd3] p-4 text-xs text-[#e11d48] flex items-center justify-between">
            <span>{{ deliveryError() }}</span>
            <button type="button" (click)="loadDeliveries()" class="ml-3 rounded-full px-3 py-1.5 font-bold text-[#be123c] transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 cursor-pointer">Retry Loading</button>
          </div>
          <div *ngIf="deliveryActionError()" id="delivery-action-error" role="alert" class="rounded-2xl bg-[#fff1f2] border border-[#fecdd3] p-4 text-xs text-[#e11d48] flex items-center justify-between">
            <span>{{ deliveryActionError() }}</span>
            <button type="button" (click)="deliveryActionError.set(null)" aria-label="Dismiss message" class="ml-3 rounded-full px-3 py-1.5 font-bold text-[#be123c] transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 cursor-pointer">Dismiss</button>
          </div>

          <!-- Log Card -->
          <div *ngIf="!deliveryError()" class="bg-white rounded-3xl border border-[#eee7e0] p-6 sm:p-7 shadow-sm space-y-5">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span class="text-[10px] font-black uppercase tracking-widest text-[#a53a26]">Audit Trail</span>
                <h2 class="text-lg font-black text-[#1d1b2c] tracking-tight">Store Notifications Sent</h2>
              </div>
              <div class="flex items-center gap-2 text-xs text-[#a09eaf]">
                <span *ngIf="isLoadingDeliveries()" id="deliveries-updating-indicator" role="status" class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#a53a26]">
                  <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-[#a53a26]" aria-hidden="true"></span>
                  {{ deliveriesLoaded() ? 'Updating…' : 'Loading webhook deliveries...' }}
                </span>
                <span>Showing <strong class="text-[#1d1b2c]">{{ deliveries().length }}</strong> of <strong class="text-[#1d1b2c]">{{ deliveryTotalElements() }}</strong> deliveries</span>
              </div>
            </div>

            <!-- Status Filter Pills -->
            <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#f4efe9]">
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="text-xs font-bold text-[#6f6d85] mr-1">Status:</span>
                <button
                  *ngFor="let f of deliveryFilterOptions"
                  type="button"
                  (click)="onDeliveryStatusFilterChange(f.value)"
                  [class.filter-active]="selectedDeliveryFilter() === f.value"
                  [attr.aria-pressed]="selectedDeliveryFilter() === f.value"
                  class="filter-pill px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer"
                >
                  {{ f.label }}
                </button>
              </div>

              <!-- Clear Filters Button if any filter is active -->
              <button
                *ngIf="hasActiveDeliveryFilters()"
                type="button"
                id="reset-delivery-filters-btn"
                (click)="resetDeliveryFilters()"
                class="action-link"
              >
                Clear Filters
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
                  class="rounded-full bg-[#faf8f6] border border-[#e8e2dc] px-3.5 py-1.5 text-xs font-semibold text-[#1d1b2c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a53a26]/30"
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
                  (change)="onDeliveryDateChange()"
                  class="rounded-full bg-[#faf8f6] border border-[#e8e2dc] px-3.5 py-1.5 text-xs font-semibold text-[#1d1b2c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a53a26]/30"
                />
              </div>
              <div class="flex items-center gap-1.5">
                <label for="deliveryToDate" class="font-bold text-[#6f6d85]">To:</label>
                <input
                  id="deliveryToDate"
                  type="date"
                  [(ngModel)]="deliveryToDate"
                  (change)="onDeliveryDateChange()"
                  class="rounded-full bg-[#faf8f6] border border-[#e8e2dc] px-3.5 py-1.5 text-xs font-semibold text-[#1d1b2c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a53a26]/30"
                />
              </div>
              <button
                type="button"
                id="last-7-days-filter-btn"
                (click)="applyLast7DaysFilter()"
                [class.filter-active]="isLast7DaysActive()"
                [attr.aria-pressed]="isLast7DaysActive()"
                [attr.title]="isLast7DaysActive() ? 'Click again to remove the Last 7 Days filter' : 'Show deliveries from the last 7 days'"
                class="filter-pill inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer"
              >
                <svg *ngIf="isLast7DaysActive()" class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                Last 7 Days
              </button>
            </div>

            <!-- Deliveries Table Container -->
            <div class="min-h-[14rem] overflow-hidden rounded-2xl border border-[#f0ebe5]" [attr.aria-busy]="isLoadingDeliveries()">
              <div class="overflow-x-auto transition-opacity duration-200" *ngIf="deliveries().length > 0" [class.opacity-60]="isLoadingDeliveries()">
                <table class="w-full text-left text-xs text-[#6f6d85]">
                  <thead>
                    <tr class="bg-[#faf8f6] border-b border-[#eee7e0] text-[11px] font-black uppercase tracking-wider text-[#a09eaf]">
                      <th class="py-3.5 px-4">Parcel Update</th>
                      <th class="py-3.5 px-4">Tracking #</th>
                      <th class="py-3.5 px-4">Notification</th>
                      <th class="py-3.5 px-4">Store Response</th>
                      <th class="py-3.5 px-4">Attempts</th>
                      <th class="py-3.5 px-4">Sent</th>
                      <th class="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#f4efe9]">
                    <tr *ngFor="let d of deliveries(); trackBy: trackDelivery" class="hover:bg-[#faf8f6]/80 transition-colors">
                      <td class="py-3.5 px-4">
                        <span class="delivery-event-label font-semibold text-xs text-[#1d1b2c] block whitespace-nowrap">
                          {{ deliveryEventLabel(d) }}
                        </span>
                        <span class="font-mono text-[10px] text-[#a09eaf]" [attr.title]="'Delivery ID ' + d.deliveryId">
                          {{ d.eventType }}
                        </span>
                      </td>
                      <td class="py-3.5 px-4">
                        <span class="font-mono text-xs font-semibold text-[#1d1b2c] break-all">
                          {{ d.trackingNumber }}
                        </span>
                      </td>
                      <td class="py-3.5 px-4 whitespace-nowrap">
                        <span [ngClass]="getDeliveryBadgeClass(d.status)" [attr.title]="notificationStatusSummary(d.status)" class="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                          {{ getDeliveryStatusLabel(d.status) }}
                        </span>
                      </td>
                      <td class="py-3.5 px-4 text-xs">
                        <div class="flex flex-col gap-1">
                          <span class="font-semibold text-[#1d1b2c] whitespace-nowrap">{{ storeResponseSummary(d.httpStatusCode) }}</span>
                          <span
                            class="self-start font-mono font-bold px-1.5 py-0.5 rounded-md text-[10px] whitespace-nowrap"
                            [ngClass]="d.httpStatusCode && d.httpStatusCode < 300 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'"
                          >
                            {{ getHttpCodeExplanation(d.httpStatusCode) }}
                          </span>
                        </div>
                      </td>
                      <td class="py-3.5 px-4 text-xs whitespace-nowrap">
                        @if (d.manualRetryCount) {
                          <span class="delivery-attempts block font-bold text-[#1d1b2c]" [attr.title]="(d.totalAttempts ?? d.attempts) + ' attempts in total'">{{ automaticAttemptCount(d) }} of 5 automatic</span>
                          <span class="delivery-manual-retries block text-[11px] font-semibold text-[#a53a26]">+ {{ d.manualRetryCount }} manual {{ d.manualRetryCount === 1 ? 'retry' : 'retries' }}</span>
                        } @else {
                          <span class="delivery-attempts font-bold text-[#1d1b2c]">{{ d.attempts }} of 5</span>
                        }
                      </td>
                      <td class="py-3.5 px-4 text-xs text-[#6f6d85] whitespace-nowrap">
                        {{ d.createdAt | date: 'MMM d, y, h:mm:ss a' }}
                      </td>
                      <td class="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          (click)="inspectDelivery(d)"
                          [attr.aria-label]="'Inspect notification for ' + d.trackingNumber"
                          class="px-3 py-1 text-xs font-bold text-[#a53a26] hover:bg-[#faf6f0] border border-[#a53a26]/30 rounded-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a53a26]/40"
                        >
                          Inspect
                        </button>
                        <button
                          *ngIf="d.status === 'FAILED'"
                          type="button"
                          [id]="'retry-delivery-btn-' + d.deliveryId"
                          (click)="retryDelivery(d.deliveryId)"
                          [disabled]="retryingDeliveryId() === d.deliveryId"
                          class="px-3 py-1 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-full transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                        >
                          <svg *ngIf="retryingDeliveryId() === d.deliveryId" class="w-3 h-3 animate-spin text-amber-800" viewBox="0 0 24 24" fill="none">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>{{ retryingDeliveryId() === d.deliveryId ? 'Retrying...' : 'Retry' }}</span>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Distinct Empty States Container -->
              <div *ngIf="deliveries().length === 0 && isLoadingDeliveries() && !deliveriesLoaded()" class="p-10 sm:p-14">
                <ui-loading-state message="Loading webhook deliveries..." />
              </div>
              <div *ngIf="deliveries().length === 0 && (deliveriesLoaded() || !isLoadingDeliveries())" class="p-10 sm:p-14 text-center space-y-4 transition-opacity duration-200" [class.opacity-60]="isLoadingDeliveries()">
                <!-- Case C: Filter mismatch -->
                <div *ngIf="hasActiveDeliveryFilters()" id="empty-state-filters" class="max-w-md mx-auto space-y-3">
                  <div class="mx-auto w-12 h-12 rounded-2xl bg-[#faf8f6] border border-[#e8e2dc] flex items-center justify-center text-[#6f6d85]">
                    <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                    </svg>
                  </div>
                  <h3 class="text-base font-black text-[#1d1b2c]">No matching deliveries.</h3>
                  <p class="text-xs text-[#6f6d85]">
                    No delivery notifications match your current filter criteria.
                  </p>
                  <div>
                    <button
                      type="button"
                      id="clear-delivery-filters-btn"
                      (click)="resetDeliveryFilters()"
                      class="px-5 py-2 bg-[#a53a26] hover:bg-[#7e2615] text-white text-xs font-bold rounded-full transition-colors cursor-pointer shadow-xs"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>

                <!-- Case A: Webhook Not Configured -->
                <div *ngIf="!hasActiveDeliveryFilters() && !settings()?.url" id="empty-state-unconfigured" class="max-w-md mx-auto space-y-3">
                  <div class="mx-auto w-12 h-12 rounded-2xl bg-[#faf8f6] border border-[#e8e2dc] flex items-center justify-center text-[#a53a26]">
                    <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                    </svg>
                  </div>
                  <h3 class="text-base font-black text-[#1d1b2c]">No webhook configured yet.</h3>
                  <p class="text-xs text-[#6f6d85]">
                    Add a webhook destination to start receiving automatic delivery updates.
                  </p>
                  <div>
                    <button
                      type="button"
                      id="goto-webhook-config-btn"
                      (click)="selectTab('settings')"
                      class="px-5 py-2 bg-[#a53a26] hover:bg-[#7e2615] text-white text-xs font-bold rounded-full transition-colors cursor-pointer shadow-xs"
                    >
                      Configure Webhook
                    </button>
                  </div>
                </div>

                <!-- Case B: No Deliveries Yet (Configured but 0 deliveries) -->
                <div *ngIf="!hasActiveDeliveryFilters() && settings()?.url" id="empty-state-no-deliveries" class="max-w-md mx-auto space-y-3">
                  <div class="mx-auto w-12 h-12 rounded-2xl bg-[#faf8f6] border border-[#e8e2dc] flex items-center justify-center text-[#6f6d85]">
                    <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                  </div>
                  <h3 class="text-base font-black text-[#1d1b2c]">No delivery notifications yet.</h3>
                  <p class="text-xs text-[#6f6d85]">
                    When SwiftDrop sends updates to your connected store, they will appear here.
                  </p>
                </div>
              </div>

              <!-- Pagination Toolbar -->
              <div *ngIf="deliveryTotalElements() > 0" class="p-4 border-t border-[#f0ebe5] bg-[#faf8f6]">
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
          <div *ngIf="selectedDelivery() as sd" class="fixed inset-0 !mt-0 bg-[#1d1b2c]/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" (click)="closeDiagnostics()">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="webhook-diagnostics-title"
              tabindex="-1"
              id="webhook-diagnostics-dialog"
              (click)="$event.stopPropagation()"
              (keydown.escape)="closeDiagnostics()"
              class="bg-white rounded-t-3xl sm:rounded-3xl shadow-xl max-w-2xl w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden border border-[#eee7e0] focus:outline-none"
            >
              <!-- Modal Header: merchant-facing summary -->
              <div class="shrink-0 p-5 sm:p-6 border-b border-[#f4efe9] flex justify-between items-start gap-4 bg-[#faf8f6]">
                <div class="min-w-0">
                  <span class="text-[10px] font-black uppercase tracking-widest text-[#a53a26]">Webhook Diagnostics</span>
                  <h3 id="webhook-diagnostics-title" class="text-base sm:text-lg font-black text-[#1d1b2c] mt-0.5">{{ deliveryEventLabel(sd) }}</h3>
                  <p class="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#6f6d85]">
                    <span class="font-mono font-semibold text-[#1d1b2c] break-all">{{ sd.trackingNumber }}</span>
                    <span [ngClass]="getDeliveryBadgeClass(sd.status)" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                      {{ notificationStatusSummary(sd.status) }}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  id="close-diagnostics-x-btn"
                  (click)="closeDiagnostics()"
                  aria-label="Close diagnostics"
                  class="w-9 h-9 shrink-0 rounded-full bg-white border border-[#eee7e0] text-[#6f6d85] hover:text-[#1d1b2c] flex items-center justify-center font-bold text-sm cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a53a26]/40"
                >
                  &times;
                </button>
              </div>

              <!-- Modal Tab Navigation (WAI-ARIA tabs pattern) -->
              <div role="tablist" aria-label="Diagnostic sections" class="diag-tablist shrink-0 flex items-stretch gap-1 px-3 sm:px-5 border-b border-[#f0ebe5] bg-white overflow-x-auto">
                <button
                  *ngFor="let tab of diagnosticTabs"
                  type="button"
                  role="tab"
                  [id]="'diag-tab-' + tab.id"
                  [attr.aria-controls]="'diag-panel-' + tab.id"
                  [attr.aria-selected]="diagnosticTab() === tab.id"
                  [attr.tabindex]="diagnosticTab() === tab.id ? 0 : -1"
                  [class.diag-tab-active]="diagnosticTab() === tab.id"
                  (click)="diagnosticTab.set(tab.id)"
                  (keydown)="onDiagnosticTabKeydown($event)"
                  class="diag-tab"
                >
                  {{ tab.label }}
                </button>
              </div>

              <!-- Modal Body Content -->
              <div class="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs flex-1 min-h-0">
                <!-- Tab: Overview -->
                <div *ngIf="diagnosticTab() === 'overview'" role="tabpanel" id="diag-panel-overview" aria-labelledby="diag-tab-overview" tabindex="0" class="space-y-4 focus:outline-none">
                  <!-- Merchant-facing summary -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#faf8f6] rounded-2xl border border-[#e8e2dc]">
                    <div>
                      <span class="text-[10px] uppercase font-bold text-[#a09eaf] block">Parcel Update</span>
                      <span id="diag-parcel-update" class="font-bold text-[#1d1b2c] text-sm mt-0.5 block">{{ deliveryEventLabel(sd) }}</span>
                    </div>
                    <div>
                      <span class="text-[10px] uppercase font-bold text-[#a09eaf] block">Store Notification</span>
                      <span id="diag-notification-summary" class="font-bold text-sm mt-0.5 block" [class.text-emerald-700]="sd.status === 'SUCCESS'" [class.text-rose-700]="sd.status === 'FAILED'" [class.text-[#1d1b2c]]="sd.status !== 'SUCCESS' && sd.status !== 'FAILED'">
                        {{ notificationStatusSummary(sd.status) }}
                      </span>
                      <span class="text-[11px] text-[#6f6d85]">{{ storeResponseSummary(sd.httpStatusCode) }}</span>
                    </div>
                    <div *ngIf="sd.errorSummary" class="sm:col-span-2 text-rose-700">
                      <span class="text-[10px] uppercase font-bold text-rose-500 block">Failure Reason</span>
                      <p class="font-semibold mt-0.5 break-words">{{ sd.errorSummary }}</p>
                    </div>
                  </div>

                  <!-- Technical details (progressive disclosure: always available, visually secondary) -->
                  <section aria-labelledby="diag-technical-heading" class="rounded-2xl border border-[#eee7e0] p-4">
                    <h4 id="diag-technical-heading" class="text-[10px] uppercase font-black tracking-widest text-[#a09eaf]">Technical details</h4>
                    <dl class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                      <div>
                        <dt class="text-[10px] uppercase font-bold text-[#a09eaf]">HTTP status</dt>
                        <dd id="diag-http-status" class="font-mono font-bold text-[#1d1b2c] mt-0.5">{{ getHttpCodeExplanation(sd.httpStatusCode) }}</dd>
                      </div>
                      <div>
                        <dt class="text-[10px] uppercase font-bold text-[#a09eaf]">Raw event type</dt>
                        <dd id="diag-raw-event-type" class="font-mono text-[#a53a26] mt-0.5 break-all">{{ sd.eventType }}</dd>
                      </div>
                      <div class="sm:col-span-2">
                        <dt class="text-[10px] uppercase font-bold text-[#a09eaf]">Delivery ID</dt>
                        <dd class="font-mono text-[#1d1b2c] mt-0.5 break-all">{{ sd.deliveryId }}</dd>
                      </div>
                      <div>
                        <dt class="text-[10px] uppercase font-bold text-[#a09eaf]">Last request</dt>
                        <dd class="font-mono text-[#1d1b2c] mt-0.5">{{ (sd.lastAttemptAt || sd.createdAt) | date: 'MMM d, y, h:mm:ss a' }}</dd>
                      </div>
                      <div>
                        <dt class="text-[10px] uppercase font-bold text-[#a09eaf]">Attempts in current cycle</dt>
                        <dd class="font-bold text-[#1d1b2c] mt-0.5">{{ sd.attempts }} of 5</dd>
                      </div>
                      <div>
                        <dt class="text-[10px] uppercase font-bold text-[#a09eaf]">Total attempts</dt>
                        <dd id="diag-total-attempts" class="font-bold text-[#1d1b2c] mt-0.5">{{ sd.retryHistory?.length || sd.totalAttempts || sd.attempts }}</dd>
                      </div>
                      <div class="sm:col-span-2">
                        <dt class="text-[10px] uppercase font-bold text-[#a09eaf]">Target destination URL</dt>
                        <dd class="font-mono text-[11px] text-[#1d1b2c] mt-0.5 break-all">{{ sd.targetUrl }}</dd>
                      </div>
                      <div *ngIf="signatureHeader(sd) as sig" class="sm:col-span-2">
                        <dt class="text-[10px] uppercase font-bold text-[#a09eaf]">Signature header</dt>
                        <dd class="font-mono text-[11px] text-[#1d1b2c] mt-0.5 break-all">{{ sig }}</dd>
                      </div>
                    </dl>
                  </section>

                  <!-- Attempt history (chronological, automatic vs manual retry cycles) -->
                  <div *ngIf="sd.retryHistory?.length" class="space-y-2">
                    <span class="text-[10px] uppercase font-bold text-[#a09eaf] block">Delivery Attempt History</span>
                    <ol class="space-y-2" id="diag-attempt-history">
                      <li *ngFor="let row of selectedAttemptRows()" class="attempt-row flex flex-wrap justify-between items-center gap-x-3 gap-y-1 p-3 rounded-xl border" [ngClass]="row.manual ? 'bg-[#faf6f0] border-[#a53a26]/25' : 'bg-[#faf8f6] border-[#e8e2dc]'">
                        <span class="flex items-center gap-2">
                          <span class="attempt-label font-bold text-[#1d1b2c]">{{ row.label }}</span>
                          <span class="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider" [ngClass]="row.manual ? 'bg-[#a53a26]/10 text-[#a53a26]' : 'bg-slate-100 text-slate-500'">{{ row.manual ? 'Manual' : 'Automatic' }}</span>
                        </span>
                        <span class="font-mono text-[#6f6d85]">{{ getHttpCodeExplanation(row.attempt.httpStatusCode) }}</span>
                        <span class="font-mono text-[#6f6d85]">{{ row.attempt.latencyMs }}ms</span>
                        <time class="text-[11px] text-[#a09eaf]">{{ row.attempt.attemptedAt | date: 'MMM d, h:mm:ss a' }}</time>
                        <span [class.text-emerald-700]="row.attempt.success" [class.text-rose-700]="!row.attempt.success" class="font-bold">
                          {{ row.attempt.success ? 'Success' : row.attempt.errorMessage || 'Failed' }}
                        </span>
                      </li>
                    </ol>
                  </div>
                </div>

                <!-- Tab: Headers -->
                <div *ngIf="diagnosticTab() === 'headers'" role="tabpanel" id="diag-panel-headers" aria-labelledby="diag-tab-headers" tabindex="0" class="space-y-3 focus:outline-none">
                  <div class="flex justify-between items-center">
                    <span class="text-xs font-bold text-[#1d1b2c]">Outbound Request Headers</span>
                    <button
                      type="button"
                      (click)="copyDeliveryHeaders()"
                      class="px-3 py-1 bg-[#faf8f6] hover:bg-[#e8e2dc] text-[#1d1b2c] text-[11px] font-bold rounded-full border border-[#e8e2dc] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a53a26]/40"
                    >
                      Copy Headers
                    </button>
                  </div>
                  <pre class="bg-[#1d1b2c] text-white p-4 rounded-2xl overflow-x-auto text-[11px] font-mono leading-relaxed">{{ sd.requestHeaders | json }}</pre>
                </div>

                <!-- Tab: Payload -->
                <div *ngIf="diagnosticTab() === 'payload'" role="tabpanel" id="diag-panel-payload" aria-labelledby="diag-tab-payload" tabindex="0" class="space-y-3 focus:outline-none">
                  <div class="flex justify-between items-center">
                    <span class="text-xs font-bold text-[#1d1b2c]">Signed JSON Payload</span>
                    <button
                      type="button"
                      (click)="copyDeliveryPayload()"
                      class="px-3 py-1 bg-[#faf8f6] hover:bg-[#e8e2dc] text-[#1d1b2c] text-[11px] font-bold rounded-full border border-[#e8e2dc] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a53a26]/40"
                    >
                      Copy Payload
                    </button>
                  </div>
                  <pre class="bg-[#1d1b2c] text-white p-4 rounded-2xl overflow-x-auto text-[11px] font-mono leading-relaxed">{{ sd.payloadJson }}</pre>
                </div>

                <!-- Tab: Response -->
                <div *ngIf="diagnosticTab() === 'response'" role="tabpanel" id="diag-panel-response" aria-labelledby="diag-tab-response" tabindex="0" class="space-y-3 focus:outline-none">
                  <div class="flex justify-between items-center">
                    <span class="text-xs font-bold text-[#1d1b2c]">Endpoint Response Body</span>
                    <button
                      *ngIf="sd.responseBody"
                      type="button"
                      (click)="copyDeliveryResponse()"
                      class="px-3 py-1 bg-[#faf8f6] hover:bg-[#e8e2dc] text-[#1d1b2c] text-[11px] font-bold rounded-full border border-[#e8e2dc] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a53a26]/40"
                    >
                      Copy Response
                    </button>
                  </div>
                  <pre *ngIf="sd.responseBody" class="bg-[#faf8f6] text-[#1d1b2c] p-4 rounded-2xl border border-[#e8e2dc] overflow-x-auto text-[11px] font-mono leading-relaxed">{{ sd.responseBody }}</pre>
                  <p *ngIf="!sd.responseBody" class="text-xs text-[#a09eaf] p-4 text-center">
                    No response body returned from the destination endpoint.
                  </p>
                </div>
              </div>

              <!-- Modal Footer -->
              <div class="shrink-0 p-4 border-t border-[#f4efe9] bg-[#faf8f6] flex justify-end">
                <button
                  type="button"
                  (click)="closeDiagnostics()"
                  class="px-6 py-2.5 bg-[#1d1b2c] hover:bg-black text-white text-xs font-bold rounded-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a53a26]/40 focus-visible:ring-offset-2"
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

        <!-- ========================================================================= -->
        <!-- TAB 5: ACCOUNT SETTINGS                                                  -->
        <!-- ========================================================================= -->
        @if (activeTab() === 'account') {
          <app-merchant-settings
            [businessName]="merchantProfile()?.businessName"
            [status]="merchantProfile()?.status"
            [emailFallback]="merchantEmail()"
            [startInEditMode]="accountEditRequested()"
            (profileSaved)="onProfileSaved()"
            (profileSaveFailed)="onProfileSaveFailed($event)"
          />
        }
        </div>
        }
      </main>

      @if (logoutConfirmOpen()) {
        <div class="fixed inset-0 !mt-0 z-[100] flex items-center justify-center bg-[#1d1b2c]/40 backdrop-blur-sm p-4"
          (click)="cancelLogout()">
          <div role="alertdialog" aria-modal="true" aria-labelledby="merchant-logout-title"
            aria-describedby="merchant-logout-description"
            class="w-full max-w-sm rounded-3xl bg-white border border-[#eee7e0] shadow-xl p-6 space-y-5"
            (click)="$event.stopPropagation()">
            <div class="w-12 h-12 rounded-2xl bg-[#faf6f0] text-[#a53a26] flex items-center justify-center">
              <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
            <div>
              <h3 id="merchant-logout-title" class="text-base font-black text-[#1d1b2c]">Log out of SwiftDrop?</h3>
              <p id="merchant-logout-description" class="text-xs text-[#6f6d85] font-medium mt-1">You'll need to sign in again to manage your orders.</p>
            </div>
            <div class="flex justify-end gap-3">
              <button type="button" id="merchant-logout-cancel-btn" (click)="cancelLogout()"
                class="px-5 py-2.5 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#1d1b2c] text-xs font-bold rounded-full transition-all cursor-pointer">Cancel</button>
              <button type="button" id="merchant-logout-confirm-btn" (click)="logOut()"
                class="px-5 py-2.5 bg-[#a53a26] hover:bg-[#7e2615] text-white text-xs font-bold rounded-full transition-all cursor-pointer">Log out</button>
            </div>
          </div>
        </div>
      }

      <!-- Order Detail Modal for Dashboard -->
      @if (selectedOrder()) {
        <div class="fixed inset-0 !mt-0 bg-[#1d1b2c]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-3xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#eee7e0]">
            <div class="p-6 border-b border-[#f4efe9] flex justify-between items-center bg-[#faf8f6]">
              <div>
                <span class="text-[10px] font-black uppercase tracking-widest text-[#a53a26]">Parcel Order Details</span>
                <h3 class="text-lg font-black text-[#1d1b2c] font-mono mt-0.5">{{ selectedOrder()?.trackingNumber }}</h3>
              </div>
              <button
                type="button"
                (click)="closeOrderDetails()"
                class="w-8 h-8 rounded-full bg-white border border-[#eee7e0] text-[#6f6d85] hover:text-[#1d1b2c] flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
              >
                &times;
              </button>
            </div>

            <div class="p-6 space-y-4 text-xs">
              @if (isLoadingOrderDetails()) {
                <div role="status" aria-live="polite" class="rounded-xl bg-[#faf8f6] p-4 text-sm text-[#6f6d85]">Loading current delivery details and history…</div>
              }
              @if (orderDetailsError(); as detailError) {
                <div role="alert" class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                  <p>{{ detailError }}</p>
                  <button type="button" class="mt-2 rounded-full border border-rose-300 bg-white px-3 py-1.5 text-xs font-bold text-rose-800 transition-colors hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400" (click)="retryOrderDetails()">Retry</button>
                </div>
              }
              <div class="grid grid-cols-2 gap-4 p-4 bg-[#faf8f6] rounded-2xl border border-[#e8e2dc]">
                <div>
                  <span class="text-[10px] uppercase font-bold text-[#a09eaf] block">Status</span>
                  <span [ngClass]="getStatusBadgeClass(orderDetails()?.status || selectedOrder()!.status)" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mt-1">
                    {{ orderDetails()?.status || selectedOrder()?.status }}
                  </span>
                </div>
                <div>
                  <span class="text-[10px] uppercase font-bold text-[#a09eaf] block">Delivery Fee</span>
                  <span class="font-mono font-bold text-sm text-[#1d1b2c] mt-1 block">
                    {{ (orderDetails()?.fee ?? selectedOrder()?.fee) != null ? 'LKR ' + ((orderDetails()?.fee ?? selectedOrder()?.fee) | number:'1.2-2') : '—' }}
                  </span>
                </div>
                <div class="col-span-2">
                  <span class="text-[10px] uppercase font-bold text-[#a09eaf] block">Merchant Order Reference</span>
                  <p class="font-mono text-[#1d1b2c] mt-0.5">{{ orderDetails()?.externalReference || selectedOrder()?.externalReference || '—' }}</p>
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

              @if (orderDetails(); as details) {
                <section aria-label="Delivery status timeline" class="rounded-2xl border border-[#eee7e0] p-4">
                  <h4 class="font-bold text-sm text-[#1d1b2c]">Delivery status timeline</h4>
                  @if (details.history.length === 0) {
                    <p class="mt-3 text-[#6f6d85]">No status history is available yet.</p>
                  } @else {
                    <ol class="mt-4 space-y-4">
                      @for (entry of details.history; track $index) {
                        <li class="relative border-l-2 pl-4 pb-1" [class.border-emerald-500]="isCurrentHistoryEntry($index)" [class.border-slate-200]="!isCurrentHistoryEntry($index)">
                          <span class="absolute -left-[5px] top-0 h-2 w-2 rounded-full" [class.bg-emerald-500]="isCurrentHistoryEntry($index)" [class.bg-slate-300]="!isCurrentHistoryEntry($index)"></span>
                          <div class="flex flex-wrap items-center gap-2">
                            <span class="font-black text-[#1d1b2c]">{{ entry.toStatus }}</span>
                            @if (isCurrentHistoryEntry($index)) { <span class="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">CURRENT</span> }
                            @else { <span class="text-[9px] font-bold text-slate-500">RECORDED</span> }
                          </div>
                          <time class="mt-1 block text-[11px] text-[#6f6d85]">{{ entry.occurredAt | date:'medium' }}</time>
                          @if (entry.reason) { <p class="mt-1 text-[11px] text-[#6f6d85]">{{ entry.reason }}</p> }
                        </li>
                      }
                    </ol>
                  }
                  @if (pendingDeliveryStages().length > 0) {
                    <div class="mt-4 border-t border-slate-100 pt-3">
                      <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Not reached yet</p>
                      <p class="mt-1 text-[#6f6d85]">{{ pendingDeliveryStages().join(' · ') }}</p>
                    </div>
                  }
                </section>
              }
            </div>

            <div class="p-4 border-t border-[#f4efe9] bg-[#faf8f6] flex justify-end">
              <button
                type="button"
                (click)="closeOrderDetails()"
                class="px-5 py-2.5 rounded-full bg-[#1d1b2c] hover:bg-black text-white font-bold text-xs transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL: CONFIRM WEBHOOK SIGNING-SECRET REGENERATION -->
      @if (isRegenerateConfirmOpen()) {
        <div class="fixed inset-0 !mt-0 z-50 flex items-center justify-center bg-[#211f32]/45 p-4 backdrop-blur-sm" (click)="cancelRegenerateSecret()">
          <div
            #regenerateDialog
            id="regenerate-secret-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="regenerate-secret-title"
            aria-describedby="regenerate-secret-description"
            (click)="$event.stopPropagation()"
            (keydown)="onRegenerateDialogKeydown($event)"
            class="w-full max-w-md space-y-5 rounded-[1.5rem] border border-[#e9e3dd] bg-[#fbfaf8] p-6 sm:p-7 shadow-2xl"
          >
            <div class="flex items-start gap-3">
              <span class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#fff1f2] text-[#be123c]" aria-hidden="true">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </span>
              <div>
                <h3 id="regenerate-secret-title" class="text-lg font-black tracking-tight text-[#1d1b2c]">Regenerate Webhook Signing Secret?</h3>
                <p id="regenerate-secret-description" class="mt-2 text-xs leading-relaxed text-[#6f6d85]">
                  A new signing secret will replace your current secret. Future webhook notifications will use the new secret immediately. Your store's webhook receiver must be updated to verify them.
                </p>
              </div>
            </div>
            <div class="flex flex-col-reverse gap-2 border-t border-[#e9e3dd] pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                id="cancel-regenerate-secret-btn"
                (click)="cancelRegenerateSecret()"
                [disabled]="isRegeneratingSecret()"
                class="rounded-full border border-[#e8e2dc] bg-white px-5 py-2.5 text-xs font-bold text-[#1d1b2c] transition-colors hover:bg-[#f4efe9] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a53a26]/40"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-regenerate-secret-btn"
                (click)="confirmRegenerateSecret()"
                [disabled]="isRegeneratingSecret()"
                class="inline-flex items-center justify-center gap-2 rounded-full bg-[#be123c] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#9f1239] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#be123c]/50 focus-visible:ring-offset-2"
              >
                {{ isRegeneratingSecret() ? 'Regenerating…' : 'Regenerate Secret' }}
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

    .filter-pill:focus-visible {
      outline: none;
      box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px rgba(165, 58, 38, 0.45);
    }

    /* Text-style actions: read as buttons (pill hover surface), never as underlined links. */
    .action-link {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      min-height: 2rem;
      padding: 0.375rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      color: #a53a26;
      text-decoration: none;
      cursor: pointer;
      transition: background-color 0.15s ease, color 0.15s ease;
    }

    .action-link:hover {
      background: #faf0ec;
      color: #7e2615;
    }

    .action-link:active {
      background: #f2ded8;
    }

    .action-link:focus-visible {
      outline: none;
      box-shadow: 0 0 0 2px rgba(165, 58, 38, 0.4);
    }

    .action-link:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Diagnostics modal tabs */
    .diag-tab {
      position: relative;
      flex-shrink: 0;
      min-height: 2.75rem;
      padding: 0.625rem 0.875rem;
      margin-bottom: -1px;
      border-bottom: 2px solid transparent;
      border-radius: 0.75rem 0.75rem 0 0;
      font-size: 0.75rem;
      font-weight: 700;
      color: #6f6d85;
      white-space: nowrap;
      cursor: pointer;
      transition: color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;
    }

    .diag-tab:hover {
      color: #1d1b2c;
      background: #faf8f6;
    }

    .diag-tab:focus-visible {
      outline: none;
      box-shadow: inset 0 0 0 2px rgba(165, 58, 38, 0.45);
    }

    .diag-tab.diag-tab-active {
      color: #a53a26;
      background: #faf0ec;
      border-bottom-color: #a53a26;
    }
  `],
})
export class MerchantComponent implements OnInit, OnDestroy {
  private merchantService = inject(MerchantService);
  private merchantNotifications = inject(MerchantNotificationsService);
  private authService = inject(AuthService, { optional: true });
  private router = inject(Router, { optional: true });

  private orderSubscription?: Subscription;
  private countsSubscription?: Subscription;
  private deliverySubscription?: Subscription;
  private detailSubscription?: Subscription;
  private orderDetailsSubscription?: Subscription;
  private directSearchSubscription?: Subscription;
  private parcelStatusLookups = new Subscription();
  private readonly parcelStatusLookupsInFlight = new Set<string>();
  private readonly parcelStatusLookupsFailed = new Set<string>();
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private autoRefreshTimer: ReturnType<typeof setInterval> | null = null;
  private appliedSearchQuery = '';
  private regenerateTrigger: HTMLElement | null = null;
  private diagnosticsTrigger: HTMLElement | null = null;
  private readonly regenerateDialog = viewChild<ElementRef<HTMLElement>>('regenerateDialog');
  private readonly onVisibilityChange = (): void => {
    if (this.isDocumentHidden()) {
      this.stopAutoRefresh();
    } else {
      // Revalidate immediately when the merchant returns to the tab, then resume polling.
      this.backgroundRefresh();
      this.startAutoRefresh();
    }
  };

  activeTab = signal<ActiveTab>('orders');
  integrationsMenuOpen = signal(false);
  readonly integrationTabs: ReadonlyArray<{ tab: ActiveTab; label: string }> = [
    { tab: 'settings', label: 'Webhook Settings' },
    { tab: 'deliveries', label: 'Webhook Delivery Logs' },
    { tab: 'credentials', label: 'API Credentials' },
  ];
  readonly bulkPageActive = signal(false);
  readonly logoutConfirmOpen = signal(false);
  notification = signal<string | null>(null);
  selectedOrder = signal<MerchantOrder | null>(null);
  orderDetails = signal<MerchantOrderDetails | null>(null);
  isLoadingOrderDetails = signal(false);
  orderDetailsError = signal<string | null>(null);
  diagnosticTab = signal<DiagnosticTab>('overview');
  readonly diagnosticTabs: ReadonlyArray<{ id: DiagnosticTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'headers', label: 'Request Headers' },
    { id: 'payload', label: 'Signed Payload' },
    { id: 'response', label: 'Response Body' },
  ];

  isLoadingProfile = signal(false);
  profileError = signal<string | null>(null);
  profileSubscription?: Subscription;

  readonly isEmailLoading = computed(() => {
    return this.isLoadingProfile() || (this.authService ? !this.authService.isInitialized() : false);
  });
  readonly merchantName = computed(() => this.authService?.currentUser()?.fullName || 'Merchant Partner');
  readonly merchantEmail = computed(() => {
    const user = this.authService?.currentUser();
    const email = user?.email;
    if (email && email.trim().length > 0) {
      return email.trim();
    }
    if (this.isEmailLoading()) {
      return 'Loading email...';
    }
    return 'Email unavailable';
  });
  readonly merchantPhone = computed(() => this.authService?.currentUser()?.phoneNumber || '');

  /** True when Settings was opened from an "Edit profile" shortcut, so it starts in edit mode. */
  readonly accountEditRequested = signal(false);

  /** Opens Settings › Personal information; profile editing lives only there. */
  openAccountSettings(edit = false): void {
    this.selectTab('account');
    this.accountEditRequested.set(edit);
  }

  onProfileSaved(): void {
    this.accountEditRequested.set(false);
    this.notifyMerchant('Profile updated', 'Your profile was updated successfully.');
  }

  onProfileSaveFailed(message: string): void {
    this.notifyMerchant('Profile update failed', message, 'error');
  }

  merchantStatusLabel(status: MerchantProfile['status']): string {
    return MERCHANT_STATUS_LABELS[status] ?? status;
  }

  merchantStatusClass(status: MerchantProfile['status']): string {
    switch (status) {
      case 'APPROVED': return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100';
      case 'PENDING': return 'bg-amber-50 text-amber-700 ring-1 ring-amber-100';
      default: return 'bg-rose-50 text-rose-700 ring-1 ring-rose-100';
    }
  }

  loadProfile(): void {
    if (!this.authService || (typeof this.authService.isAuthenticated === 'function' && !this.authService.isAuthenticated())) {
      return;
    }
    if (this.authService.currentUser()?.email) {
      return;
    }
    if (this.isLoadingProfile()) {
      return;
    }
    const fetch$ = typeof (this.authService as any).getProfile === 'function'
      ? (this.authService as any).getProfile()
      : typeof this.authService.getCurrentUser === 'function'
      ? this.authService.getCurrentUser()
      : null;

    if (!fetch$) {
      return;
    }
    this.isLoadingProfile.set(true);
    this.profileError.set(null);
    this.profileSubscription?.unsubscribe();
    this.profileSubscription = fetch$.subscribe({
      next: () => {
        this.isLoadingProfile.set(false);
      },
      error: () => {
        this.isLoadingProfile.set(false);
        this.profileError.set('Unable to load profile');
      },
    });
  }
  /** Business identity from GET /api/v1/merchant/profile; only shown if it belongs to the signed-in user. */
  merchantProfile = signal<MerchantProfile | null>(null);
  private merchantProfileSubscription?: Subscription;
  private merchantProfileKey: string | null | undefined = undefined;

  /** Header identity: the business name when available, otherwise the account display name. */
  readonly headerName = computed(() => {
    const profile = this.merchantProfile();
    const tokenMerchantId = this.authService?.currentUser()?.merchantId;
    const belongsToUser = !!profile && (!tokenMerchantId || profile.merchantId === tokenMerchantId);
    return (belongsToUser && profile!.businessName?.trim()) || this.merchantName();
  });

  /** Reloads the business profile whenever the signed-in account changes; clears it on sign-out. */
  private readonly merchantProfileSync = effect(() => {
    const user = this.authService?.currentUser();
    // Only merchant accounts with a merchantId claim have a business profile to fetch.
    const key = user?.merchantId ? `${user.id ?? ''}|${user.merchantId}` : null;
    untracked(() => {
      if (key === this.merchantProfileKey) return;
      this.merchantProfileKey = key;
      this.merchantProfileSubscription?.unsubscribe();
      this.merchantProfile.set(null);
      if (key) this.loadMerchantProfile();
    });
  });

  loadMerchantProfile(): void {
    if (!this.authService || (typeof this.authService.isAuthenticated === 'function' && !this.authService.isAuthenticated())) {
      return;
    }
    const requestedKey = this.merchantProfileKey;
    this.merchantProfileSubscription?.unsubscribe();
    this.merchantProfileSubscription = this.merchantService.getMerchantProfile().subscribe({
      next: (profile) => {
        // Ignore a response that arrives after the account changed.
        if (requestedKey === this.merchantProfileKey) this.merchantProfile.set(profile);
      },
      // Non-blocking: the header falls back to the account display name.
      error: () => undefined,
    });
  }

  readonly merchantInitials = computed(() => {
    const name = this.headerName();
    if (!name) return 'M';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  });

  // Orders State
  orders = signal<MerchantOrder[]>([]);
  counts = signal<OrderCounts>({ total: 0, created: 0, inTransit: 0, delivered: 0, failed: 0, cancelled: 0 });
  selectedStatusFilter = signal<string>('ALL');
  /** Top bar: filters the orders table by (partial) tracking number. */
  searchQuery = '';
  /** Direct Search card: looks up one parcel by exact tracking number; never filters the table. */
  directSearchQuery = '';
  directSearchError = signal<string | null>(null);
  isDirectSearching = signal(false);
  fromDate = '';
  toDate = '';
  hasLoadedOrders = signal(false);
  countsLoaded = signal(false);
  lastUpdatedAt = signal<Date | null>(null);
  readonly activeDeliveryCount = computed(() => {
    const c = this.counts();
    return (c.pickedUp || 0) + (c.inTransit || 0) + (c.outForDelivery || 0);
  });

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
  isRegenerateConfirmOpen = signal(false);
  isRegeneratingSecret = signal(false);
  isEditingWebhook = signal<boolean>(false);
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
  /** Errors from inspect/retry actions; shown above the table without hiding it. */
  deliveryActionError = signal<string | null>(null);
  isLoadingDeliveries = signal(false);
  deliveriesLoaded = signal(false);
  last7DaysActive = signal(false);
  /** Parcel status carried by each PARCEL_STATUS_CHANGED delivery, read from its signed payload. */
  parcelStatusByDelivery = signal<ReadonlyMap<string, ParcelLifecycleStatus>>(new Map());
  readonly selectedAttemptRows = computed(() => this.attemptHistoryRows(this.selectedDelivery()?.retryHistory ?? []));
  deliveryPage = signal(0);
  deliveryPageSize = signal(20);
  deliveryTotalElements = signal(0);
  retryingDeliveryId = signal<string | null>(null);

  deliveryFilterOptions = [
    { label: 'All', value: 'ALL' },
    { label: 'Delivered', value: 'SUCCESS' },
    { label: 'Failed', value: 'FAILED' },
    { label: 'Retrying', value: 'PENDING_RETRY' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  deliveryEventFilterOptions = [
    { label: 'All events', value: 'ALL' },
    { label: 'Parcel created', value: 'PARCEL_CREATED' },
    { label: 'Parcel status changed', value: 'PARCEL_STATUS_CHANGED' },
    { label: 'Test event', value: 'TEST_EVENT' },
  ];

  ngOnInit(): void {
    this.loadProfile();
    this.loadOrders();
    this.loadOrderCounts();
    this.loadSettings();
    this.loadDeliveries();
    this.startAutoRefresh();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
    this.clearSearchDebounce();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
    this.orderSubscription?.unsubscribe();
    this.countsSubscription?.unsubscribe();
    this.deliverySubscription?.unsubscribe();
    this.detailSubscription?.unsubscribe();
    this.orderDetailsSubscription?.unsubscribe();
    this.directSearchSubscription?.unsubscribe();
    this.parcelStatusLookups.unsubscribe();
    this.merchantProfileSubscription?.unsubscribe();
    this.profileSubscription?.unsubscribe();
  }

  // ---------------------------------------------------------------------------
  // Background refresh (orders dashboard)
  // ---------------------------------------------------------------------------

  /** Starts polling unless the tab is hidden or polling is already running. */
  startAutoRefresh(): void {
    if (this.autoRefreshTimer !== null || this.isDocumentHidden()) return;
    this.autoRefreshTimer = setInterval(() => this.backgroundRefresh(), MERCHANT_DASHBOARD_REFRESH_MS);
  }

  stopAutoRefresh(): void {
    if (this.autoRefreshTimer !== null) {
      clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = null;
    }
  }

  /**
   * Silently re-syncs dashboard data, keeping filters, page, scroll position and current rows.
   * Skipped while the tab is hidden, the session is gone, another tab is shown, or a
   * merchant-initiated request is already in flight (that request wins).
   */
  backgroundRefresh(): void {
    if (this.isDocumentHidden() || this.activeTab() !== 'orders') return;
    if (this.authService && typeof this.authService.isAuthenticated === 'function' && !this.authService.isAuthenticated()) {
      return;
    }
    this.loadOrders(this.currentPage(), { background: true });
    this.loadOrderCounts(true);
    this.refreshOpenOrderDetails();
  }

  private isDocumentHidden(): boolean {
    return typeof document !== 'undefined' && document.visibilityState === 'hidden';
  }

  trackOrder(_index: number, order: MerchantOrder): string {
    return order.orderId;
  }

  trackDelivery(_index: number, delivery: WebhookDeliveryItem): string {
    return delivery.deliveryId;
  }

  navigateToBulk(): void {
    if (this.router) {
      this.router.navigate(['/merchant/bulk']);
    } else {
      window.location.assign('/merchant/bulk');
    }
  }

  onBulkOpened(): void {
    this.dismissSecret();
    this.activeTab.set('orders');
    this.integrationsMenuOpen.set(false);
    this.bulkPageActive.set(true);
  }

  onBulkClosed(): void {
    this.bulkPageActive.set(false);
    this.loadOrders();
    this.loadOrderCounts();
  }

  openLogoutConfirm(): void {
    this.logoutConfirmOpen.set(true);
  }

  cancelLogout(): void {
    this.logoutConfirmOpen.set(false);
  }

  logOut(): void {
    this.cancelLogout();
    this.profileSubscription?.unsubscribe();
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
      this.isEditingWebhook.set(false);
    }
    const previous = this.activeTab();
    this.activeTab.set(tab);
    this.accountEditRequested.set(false);
    this.integrationsMenuOpen.set(this.isIntegrationTab(tab));
    if (tab === 'orders' && previous !== 'orders' && this.hasLoadedOrders()) {
      // Data may have changed while another section was open; revalidate silently.
      this.backgroundRefresh();
    }
    if (this.bulkPageActive()) {
      void this.router?.navigate(['/merchant']);
    }
  }

  isIntegrationTab(tab: ActiveTab = this.activeTab()): boolean {
    return this.integrationTabs.some((link) => link.tab === tab);
  }

  toggleIntegrationsMenu(): void {
    this.integrationsMenuOpen.update((isOpen) => !isOpen);
  }

  dismissSecret(): void {
    const current = this.settings();
    if (current?.rawSecret) {
      this.settings.set({ ...current, rawSecret: null });
    }
  }

  viewOrderDetails(order: MerchantOrder): void {
    this.selectedOrder.set(order);
    this.loadOrderDetails(order.orderId);
  }

  closeOrderDetails(): void {
    this.orderDetailsSubscription?.unsubscribe();
    this.selectedOrder.set(null);
    this.orderDetails.set(null);
    this.orderDetailsError.set(null);
    this.isLoadingOrderDetails.set(false);
  }

  retryOrderDetails(): void {
    const order = this.selectedOrder();
    if (order) this.loadOrderDetails(order.orderId);
  }

  /** Silently refreshes an open parcel-details modal without clearing its content. */
  private refreshOpenOrderDetails(): void {
    const order = this.selectedOrder();
    if (!order || !this.orderDetails() || this.isLoadingOrderDetails()) return;
    const orderId = order.orderId;
    this.orderDetailsSubscription?.unsubscribe();
    this.orderDetailsSubscription = this.merchantService.getOrderDetails(orderId).subscribe({
      next: (details) => this.applyOrderDetails(orderId, details),
      // Background failures keep the last good details on screen.
      error: () => undefined,
    });
  }

  private applyOrderDetails(orderId: string, details: MerchantOrderDetails): void {
    if (this.selectedOrder()?.orderId !== orderId) return;
    this.orderDetails.set(details);
    this.selectedOrder.update((order) => order?.orderId === orderId
      ? { ...order, status: details.status, updatedAt: details.updatedAt }
      : order);
    this.orders.update((orders) => orders.map((order) => order.orderId === orderId
      ? { ...order, status: details.status, updatedAt: details.updatedAt }
      : order));
  }

  private loadOrderDetails(orderId: string): void {
    this.orderDetailsSubscription?.unsubscribe();
    this.orderDetails.set(null);
    this.orderDetailsError.set(null);
    this.isLoadingOrderDetails.set(true);
    this.orderDetailsSubscription = this.merchantService.getOrderDetails(orderId).pipe(
      finalize(() => this.isLoadingOrderDetails.set(false)),
    ).subscribe({
      next: (details) => this.applyOrderDetails(orderId, details),
      error: (error: HttpErrorResponse) => {
        if (this.selectedOrder()?.orderId === orderId) {
          this.orderDetailsError.set(this.apiErrorMessage(error, 'Unable to load order details.'));
          this.notifyMerchant('Order details unavailable', this.orderDetailsError()!, 'error');
        }
      },
    });
  }

  isCurrentHistoryEntry(index: number): boolean {
    const details = this.orderDetails();
    return !!details && index === details.history.length - 1
      && details.history[index]?.toStatus === details.status;
  }

  pendingDeliveryStages(): string[] {
    const details = this.orderDetails();
    if (!details || ['DELIVERED', 'FAILED', 'CANCELLED'].includes(details.status)) return [];
    const stages = ['CREATED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    const currentIndex = stages.indexOf(details.status);
    return currentIndex < 0 ? [] : stages.slice(currentIndex + 1);
  }

  /**
   * Loads one page of orders using the current filters. A newer call always cancels an older
   * in-flight request, so stale responses never overwrite newer filter results.
   * Background loads are silent: no loading state, no error banner, existing rows are kept,
   * and they never interrupt a merchant-initiated request.
   */
  loadOrders(page: number = this.currentPage(), options: { background?: boolean } = {}): void {
    const background = !!options.background;
    if (background && this.isLoadingOrders()) return;
    this.orderSubscription?.unsubscribe();
    this.currentPage.set(page);
    if (!background) {
      this.isLoadingOrders.set(true);
      this.orderError.set(null);
    }

    const trackingNumber = this.searchQuery?.trim() || undefined;
    this.appliedSearchQuery = trackingNumber ?? '';
    const params: MerchantOrderFilterParams = {
      status: this.selectedStatusFilter() !== 'ALL' ? this.selectedStatusFilter() : undefined,
      trackingNumber,
      // Merchant-local calendar days, matching the delivery-log date filters.
      from: this.localDayBoundary(this.fromDate, false),
      to: this.localDayBoundary(this.toDate, true),
      page,
      size: this.pageSize(),
    };

    this.orderSubscription = this.merchantService.getOrders(params).subscribe({
      next: (res) => {
        this.orders.set(res.content);
        this.totalElements.set(res.totalElements);
        this.totalPages.set(res.totalPages);
        this.isLoadingOrders.set(false);
        this.orderError.set(null);
        this.hasLoadedOrders.set(true);
        this.lastUpdatedAt.set(new Date());
      },
      error: () => {
        this.isLoadingOrders.set(false);
        if (background) return;
        this.orderError.set('Unable to load merchant orders. Please check network connection and retry.');
        this.notifyMerchant('Orders could not be loaded', this.orderError()!, 'error');
      },
    });
  }

  loadOrderCounts(background = false): void {
    if (background && this.isLoadingCounts()) return;
    this.countsSubscription?.unsubscribe();
    if (!background) {
      this.isLoadingCounts.set(true);
      this.countsError.set(null);
    }
    this.countsSubscription = this.merchantService.getOrderCounts().subscribe({
      next: (c) => {
        this.counts.set(c);
        this.countsLoaded.set(true);
        this.countsError.set(null);
        this.isLoadingCounts.set(false);
      },
      error: () => {
        this.isLoadingCounts.set(false);
        if (background) return;
        this.countsError.set('Unable to load order counts.');
        this.notifyMerchant('Order summary unavailable', this.countsError()!, 'error');
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

  /** Top search typing: debounced so each keystroke does not trigger a request. */
  onSearchInput(): void {
    this.clearSearchDebounce();
    this.searchDebounceTimer = setTimeout(() => {
      this.searchDebounceTimer = null;
      if ((this.searchQuery?.trim() ?? '') !== this.appliedSearchQuery) {
        this.loadOrders(0);
      }
    }, SEARCH_DEBOUNCE_MS);
  }

  /** Top search submit (Enter): applies the filter immediately. */
  onSearchChange(): void {
    this.clearSearchDebounce();
    this.loadOrders(0);
  }

  private clearSearchDebounce(): void {
    if (this.searchDebounceTimer !== null) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }
  }

  /**
   * Direct Search: finds exactly one of this merchant's parcels by tracking number and opens
   * its details. It uses its own state and never changes the table filters.
   */
  submitDirectSearch(): void {
    const query = this.directSearchQuery.trim();
    if (!query) {
      this.directSearchError.set('Enter a parcel number to track.');
      return;
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9-]{2,63}$/.test(query)) {
      this.directSearchError.set('Parcel numbers contain only letters, numbers and hyphens.');
      return;
    }
    if (this.isDirectSearching()) return;
    this.directSearchError.set(null);
    this.isDirectSearching.set(true);
    this.directSearchSubscription?.unsubscribe();
    this.directSearchSubscription = this.merchantService
      .getOrders({ trackingNumber: query, page: 0, size: 10 })
      .pipe(finalize(() => this.isDirectSearching.set(false)))
      .subscribe({
        next: (res) => {
          const match = res.content.find((order) => order.trackingNumber.toLowerCase() === query.toLowerCase());
          if (match) {
            this.viewOrderDetails(match);
          } else {
            this.directSearchError.set(`No parcel found with number ${query}. Check the number and try again.`);
          }
        },
        error: (error: HttpErrorResponse) => {
          this.directSearchError.set(error?.status === 401
            ? 'Your session has expired. Sign in and try again.'
            : 'Parcel search is unavailable right now. Please try again.');
        },
      });
  }

  onDateFilterChange(): void {
    this.loadOrders(0);
  }

  resetFilters(): void {
    this.clearSearchDebounce();
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
        this.notifyMerchant('Webhook settings unavailable', this.settingsError()!, 'error');
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

  webhookStatusLabel(): 'Enabled' | 'Disabled' | 'Not Configured' {
    const s = this.settings();
    if (!s || !s.url) {
      return 'Not Configured';
    }
    return s.active ? 'Enabled' : 'Disabled';
  }

  webhookStatusTone(): 'success' | 'warning' | 'neutral' {
    const s = this.settings();
    if (!s || !s.url) {
      return 'neutral';
    }
    return s.active ? 'success' : 'warning';
  }

  startEditingWebhook(): void {
    const s = this.settings();
    if (s) {
      this.settingsForm = {
        url: s.url || '',
        active: s.active,
        subscribedEvents: [...s.subscribedEvents],
      };
    }
    this.settingsError.set(null);
    this.isEditingWebhook.set(true);
  }

  cancelEditingWebhook(): void {
    const s = this.settings();
    if (s) {
      this.settingsForm = {
        url: s.url || '',
        active: s.active,
        subscribedEvents: [...s.subscribedEvents],
      };
    }
    this.settingsError.set(null);
    this.isEditingWebhook.set(false);
  }

  humanReadableEvent(eventType: string): string {
    switch (eventType) {
      case 'PARCEL_STATUS_CHANGED':
        return 'Parcel Status Changes';
      case 'PARCEL_CREATED':
        return 'Order Creation';
      default:
        return eventType;
    }
  }

  saveSettings(): void {
    this.submitSettings(false);
  }

  /** Opens the SwiftDrop confirmation dialog. Nothing is regenerated until the merchant confirms. */
  regenerateSecret(): void {
    if (this.isSavingSettings() || this.isLoadingSettings() || this.isRegenerateConfirmOpen()) return;
    this.regenerateTrigger = typeof document !== 'undefined' ? document.activeElement as HTMLElement | null : null;
    this.isRegenerateConfirmOpen.set(true);
    setTimeout(() => this.regenerateDialog()?.nativeElement.querySelector<HTMLElement>('#cancel-regenerate-secret-btn')?.focus());
  }

  cancelRegenerateSecret(): void {
    if (this.isRegeneratingSecret()) return;
    this.closeRegenerateDialog();
  }

  confirmRegenerateSecret(): void {
    if (this.isRegeneratingSecret() || !this.isRegenerateConfirmOpen()) return;
    this.isRegeneratingSecret.set(true);
    const started = this.submitSettings(true, (succeeded) => {
      this.isRegeneratingSecret.set(false);
      // Close on success; on failure the error is shown on the page and in notifications.
      this.closeRegenerateDialog(succeeded ? '#dismiss-signing-secret-btn' : null);
    });
    if (!started) {
      this.isRegeneratingSecret.set(false);
      this.closeRegenerateDialog();
    }
  }

  /** Escape closes, Tab cycles focus within the dialog. */
  onRegenerateDialogKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelRegenerateSecret();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      this.regenerateDialog()?.nativeElement.querySelectorAll<HTMLElement>('button:not([disabled])') ?? []);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private closeRegenerateDialog(focusSelector: string | null = null): void {
    this.isRegenerateConfirmOpen.set(false);
    const trigger = this.regenerateTrigger;
    this.regenerateTrigger = null;
    setTimeout(() => {
      const target = focusSelector && typeof document !== 'undefined'
        ? document.querySelector<HTMLElement>(focusSelector)
        : null;
      (target ?? trigger)?.focus?.();
    });
  }

  /** Returns false when the request was not sent (busy or invalid form). */
  private submitSettings(regenerateSecret: boolean, onDone?: (succeeded: boolean) => void): boolean {
    if (this.isSavingSettings() || this.isLoadingSettings() || !this.settings()) return false;
    this.settingsError.set(null);
    const url = this.settingsForm.url.trim();
    if (!this.isHttpsUrl(url)) {
      this.settingsError.set('Enter a valid public HTTPS destination URL.');
      this.notifyMerchant(regenerateSecret ? 'Signing secret not regenerated' : 'Webhook settings not saved',
        this.settingsError()!, 'error');
      return false;
    }
    this.isSavingSettings.set(true);
    this.merchantService.updateWebhookSettings(
      url, this.settingsForm.active, [...this.settingsForm.subscribedEvents], regenerateSecret
    ).pipe(finalize(() => this.isSavingSettings.set(false))).subscribe({
      next: (updated) => {
        this.settings.set(updated);
        this.settingsForm.url = updated.url || '';
        this.isEditingWebhook.set(false);
        if (regenerateSecret) {
          this.notifyMerchant('Signing secret regenerated', updated.rawSecret
            ? 'Copy the new signing secret now. It is shown only once.'
            : 'Your webhook signing secret was regenerated.');
        } else {
          this.notifyMerchant('Webhook settings saved', updated.rawSecret
            ? 'Copy the new signing secret now.'
            : 'Your webhook configuration was saved successfully.');
        }
        onDone?.(true);
      },
      error: (error: HttpErrorResponse) => {
        this.settingsError.set(this.apiErrorMessage(error,
          regenerateSecret ? 'Unable to regenerate the signing secret.' : 'Unable to save webhook settings.'));
        this.notifyMerchant(regenerateSecret ? 'Signing secret not regenerated' : 'Webhook settings not saved',
          this.settingsError()!, 'error');
        onDone?.(false);
      },
    });
    return true;
  }

  runTestWebhook(): void {
    if (this.isTestingWebhook() || !this.settings()) return;
    this.testError.set(null);
    const override = this.testUrlOverride.trim();
    if (override && !this.isHttpsUrl(override)) {
      this.testError.set('Enter a valid public HTTPS test URL or leave the override empty.');
      this.notifyMerchant('Webhook test not sent', this.testError()!, 'error');
      return;
    }
    this.isTestingWebhook.set(true);
    this.testResult.set(null);

    this.merchantService.triggerTestWebhook(override).pipe(finalize(() => this.isTestingWebhook.set(false))).subscribe({
      next: (res) => {
        this.testResult.set(res);
        this.notifyMerchant(res.success ? 'Webhook test delivered' : 'Webhook test failed',
          res.success ? `The endpoint returned HTTP ${res.statusCode}.` : (res.errorMessage || `The endpoint returned HTTP ${res.statusCode}.`),
          res.success ? 'success' : 'error');
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 502 && this.isTestResult(error.error)) {
          this.testResult.set(error.error);
        } else {
          this.testError.set(this.apiErrorMessage(error, 'Unable to send the test event.'));
          this.notifyMerchant('Webhook test not sent', this.testError()!, 'error');
        }
      },
    });
  }

  /**
   * Loads one page of delivery logs. Each call cancels the previous in-flight request so a
   * slower, older response can never overwrite newer filter results. Existing rows stay on
   * screen (dimmed) until the new page arrives.
   */
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
      this.localDayBoundary(this.deliveryFromDate, false),
      this.localDayBoundary(this.deliveryToDate, true))
      .pipe(finalize(() => this.isLoadingDeliveries.set(false))).subscribe({
      next: (result) => {
        this.deliveries.set(result.content);
        this.deliveryTotalElements.set(result.totalElements);
        this.deliveriesLoaded.set(true);
        this.lookUpParcelStatuses(result.content);
      },
      error: (error: HttpErrorResponse) => {
        this.deliveries.set([]);
        this.deliveryTotalElements.set(0);
        this.deliveryError.set(this.apiErrorMessage(error, 'Unable to load webhook deliveries.'));
        this.notifyMerchant('Delivery logs unavailable', this.deliveryError()!, 'error');
      },
    });
  }

  onDeliveryFilterChange(): void {
    this.loadDeliveries(0);
  }

  hasActiveDeliveryFilters(): boolean {
    return this.selectedDeliveryFilter() !== 'ALL' ||
      this.selectedDeliveryEvent !== 'ALL' ||
      !!this.deliveryFromDate ||
      !!this.deliveryToDate;
  }

  onDeliveryStatusFilterChange(status: string): void {
    if (this.selectedDeliveryFilter() === status) return;
    this.selectedDeliveryFilter.set(status);
    this.loadDeliveries(0);
  }

  /** Manual date edits keep the merchant's dates and deselect the preset once it no longer matches. */
  onDeliveryDateChange(): void {
    if (this.last7DaysActive()) {
      const range = this.last7DaysRange();
      if (this.deliveryFromDate !== range.from || this.deliveryToDate !== range.to) {
        this.last7DaysActive.set(false);
      }
    }
    this.loadDeliveries(0);
  }

  resetDeliveryFilters(): void {
    this.selectedDeliveryFilter.set('ALL');
    this.selectedDeliveryEvent = 'ALL';
    this.deliveryFromDate = '';
    this.deliveryToDate = '';
    this.last7DaysActive.set(false);
    this.loadDeliveries(0);
  }

  isLast7DaysActive(): boolean {
    return this.last7DaysActive();
  }

  /** Toggles the Last 7 Days preset (merchant-local calendar dates). Clicking again removes it. */
  applyLast7DaysFilter(): void {
    if (this.last7DaysActive()) {
      this.last7DaysActive.set(false);
      this.deliveryFromDate = '';
      this.deliveryToDate = '';
      this.loadDeliveries(0);
      return;
    }
    const range = this.last7DaysRange();
    this.deliveryFromDate = range.from;
    this.deliveryToDate = range.to;
    this.last7DaysActive.set(true);
    this.loadDeliveries(0);
  }

  private last7DaysRange(): { from: string; to: string } {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    return { from: this.toLocalDateInput(sevenDaysAgo), to: this.toLocalDateInput(today) };
  }

  /** Converts a yyyy-MM-dd date input (merchant local calendar day) to a UTC instant boundary. */
  private localDayBoundary(date: string, endOfDay: boolean): string | undefined {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date?.trim() ?? '');
    if (!match) {
      return undefined;
    }
    const [year, month, day] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
    const boundary = endOfDay
      ? new Date(year, month, day, 23, 59, 59, 999)
      : new Date(year, month, day, 0, 0, 0, 0);
    return boundary.toISOString();
  }

  private toLocalDateInput(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  copyToClipboard(text: string, label: string): void {
    if (!text) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.notifyMerchant(`${label} copied`, `${label} copied to clipboard.`);
      }).catch(() => {
        this.notifyMerchant(`${label} ready`, `${label} is ready to copy manually.`, 'info');
      });
    } else {
      this.notifyMerchant(`${label} ready`, `${label} is ready to copy manually.`, 'info');
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
    this.deliveryActionError.set(null);
    if (!this.selectedDelivery() && typeof document !== 'undefined') {
      this.diagnosticsTrigger = document.activeElement as HTMLElement | null;
    }
    this.detailSubscription = this.merchantService.getDeliveryDetail(item.deliveryId).subscribe({
      next: (detail) => {
        this.rememberParcelStatus(item.deliveryId, detail.payload);
        const wasOpen = !!this.selectedDelivery();
        this.selectedDelivery.set({
          ...item,
          ...detail,
          httpStatusCode: detail.httpStatusCode === null ? undefined : detail.httpStatusCode,
          lastAttemptAt: detail.lastAttemptAt ?? undefined,
          payloadJson: detail.payload == null ? undefined : JSON.stringify(detail.payload, null, 2),
          requestHeaders: detail.requestHeaders || undefined,
          responseHeaders: detail.responseHeaders || undefined,
          responseBody: detail.responseBody || undefined,
        });
        if (!wasOpen) {
          setTimeout(() => document.getElementById('webhook-diagnostics-dialog')?.focus());
        }
      },
      error: (error: HttpErrorResponse) => {
        this.deliveryActionError.set(this.apiErrorMessage(error, 'Unable to load delivery details.'));
        this.notifyMerchant('Delivery details unavailable', this.deliveryActionError()!, 'error');
      },
    });
  }

  closeDiagnostics(): void {
    this.detailSubscription?.unsubscribe();
    this.selectedDelivery.set(null);
    const trigger = this.diagnosticsTrigger;
    this.diagnosticsTrigger = null;
    if (trigger) setTimeout(() => trigger.focus?.());
  }

  /** Arrow/Home/End keyboard navigation between diagnostics tabs (WAI-ARIA tabs pattern). */
  onDiagnosticTabKeydown(event: KeyboardEvent): void {
    const ids = this.diagnosticTabs.map((tab) => tab.id);
    const index = ids.indexOf(this.diagnosticTab());
    let next: number | null = null;
    if (event.key === 'ArrowRight') next = (index + 1) % ids.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + ids.length) % ids.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = ids.length - 1;
    if (next === null) return;
    event.preventDefault();
    this.diagnosticTab.set(ids[next]);
    if (typeof document !== 'undefined') {
      document.getElementById(`diag-tab-${ids[next]}`)?.focus();
    }
  }

  /**
   * Reads the parcel status from each status-change delivery's own signed payload (via the
   * merchant-scoped detail endpoint) so the log can say "Out for Delivery" instead of a
   * generic label. Results are cached per delivery; failures fall back to the generic label.
   */
  private lookUpParcelStatuses(items: WebhookDeliveryItem[]): void {
    const known = this.parcelStatusByDelivery();
    const pending = items
      // Only for servers that predate the list-level parcelStatus field (undefined, not null).
      .filter((d) => d.eventType === 'PARCEL_STATUS_CHANGED'
        && d.parcelStatus === undefined
        && !known.has(d.deliveryId)
        && !this.parcelStatusLookupsInFlight.has(d.deliveryId)
        && !this.parcelStatusLookupsFailed.has(d.deliveryId))
      .map((d) => d.deliveryId);
    if (pending.length === 0) return;
    pending.forEach((id) => this.parcelStatusLookupsInFlight.add(id));
    const lookup = from(pending).pipe(
      mergeMap((deliveryId) => this.merchantService.getDeliveryDetail(deliveryId).pipe(
        map((detail) => ({ deliveryId, payload: detail.payload as unknown, ok: true })),
        catchError(() => of({ deliveryId, payload: null as unknown, ok: false })),
      ), PARCEL_STATUS_LOOKUP_CONCURRENCY),
    ).subscribe(({ deliveryId, payload, ok }) => {
      this.parcelStatusLookupsInFlight.delete(deliveryId);
      if (!ok || !this.rememberParcelStatus(deliveryId, payload)) {
        this.parcelStatusLookupsFailed.add(deliveryId);
      }
    });
    this.parcelStatusLookups.add(lookup);
  }

  /** Stores a payload's parcel status if (and only if) it is a known lifecycle status. */
  private rememberParcelStatus(deliveryId: string, payload: unknown): boolean {
    const status = this.extractParcelStatus(payload);
    if (!status) return false;
    if (this.parcelStatusByDelivery().get(deliveryId) !== status) {
      this.parcelStatusByDelivery.update((current) => new Map(current).set(deliveryId, status));
    }
    return true;
  }

  private extractParcelStatus(payload: unknown): ParcelLifecycleStatus | null {
    if (typeof payload !== 'object' || payload === null) return null;
    const parcel = (payload as { parcel?: unknown }).parcel;
    if (typeof parcel !== 'object' || parcel === null) return null;
    const { toStatus, status } = parcel as { toStatus?: unknown; status?: unknown };
    const candidate = typeof toStatus === 'string' ? toStatus : status;
    return typeof candidate === 'string' && (PARCEL_STATUSES as readonly string[]).includes(candidate)
      ? candidate as ParcelLifecycleStatus
      : null;
  }

  /** Merchant-facing description of what happened to the parcel (not the notification). */
  deliveryEventLabel(delivery: Pick<WebhookDeliveryItem, 'deliveryId' | 'eventType' | 'parcelStatus'>): string {
    if (delivery.eventType === 'PARCEL_STATUS_CHANGED') {
      const listed = delivery.parcelStatus;
      const status = listed && (PARCEL_STATUSES as readonly string[]).includes(listed)
        ? listed
        : this.parcelStatusByDelivery().get(delivery.deliveryId);
      return status ? PARCEL_UPDATE_LABELS[status] : this.humanReadableDeliveryEvent(delivery.eventType);
    }
    return this.humanReadableDeliveryEvent(delivery.eventType);
  }

  /** Attempts made by the automatic cycle (each manual retry is a single attempt). */
  automaticAttemptCount(delivery: WebhookDeliveryItem): number {
    const total = delivery.totalAttempts ?? delivery.attempts;
    return Math.max(0, total - (delivery.manualRetryCount ?? 0));
  }

  /** Whether the notification reached the merchant's store (not the physical parcel). */
  notificationStatusSummary(status: WebhookDeliveryStatus): string {
    switch (status) {
      case 'SUCCESS':
        return 'Notification Delivered';
      case 'FAILED':
        return 'Notification Failed';
      case 'PENDING_RETRY':
        return 'Retry Scheduled';
      case 'PENDING':
        return 'Sending';
      case 'CANCELLED':
        return 'Notification Cancelled';
      default:
        return status;
    }
  }

  /** Plain-language reading of the store's HTTP response; the raw code is shown alongside. */
  storeResponseSummary(statusCode?: number | null): string {
    if (!statusCode) return 'No response from store';
    if (statusCode >= 200 && statusCode < 300) return 'Accepted by your store';
    if (statusCode === 408 || statusCode === 504) return 'Store timed out';
    if (statusCode === 429) return 'Store is rate limiting';
    if (statusCode === 502 || statusCode === 503) return 'Store unavailable';
    if (statusCode >= 500) return 'Store error';
    if (statusCode >= 400) return 'Rejected by your store';
    return 'Unexpected response';
  }

  /** The X-SwiftDrop-Signature request header (the HMAC signature, not the secret). */
  signatureHeader(delivery: WebhookDeliveryItem): string | null {
    const headers = delivery.requestHeaders;
    if (!headers) return null;
    const key = Object.keys(headers).find((name) => name.toLowerCase() === 'x-swiftdrop-signature');
    return key ? headers[key] : null;
  }

  /**
   * Labels attempts by retry cycle. The backend numbers the automatic cycle 1..5 and restarts
   * at 1 for each manual retry (only a manual retry resets the counter), so an attempt number
   * that does not increase marks the start of a new, manual cycle. Order stays chronological.
   */
  attemptHistoryRows(history: readonly DeliveryAttempt[]): AttemptHistoryRow[] {
    const chronological = history
      .map((attempt, index) => ({ attempt, index }))
      .sort((a, b) => (Date.parse(a.attempt.attemptedAt) - Date.parse(b.attempt.attemptedAt)) || (a.index - b.index))
      .map(({ attempt }) => attempt);
    let cycle = 0;
    let previous: number | null = null;
    return chronological.map((attempt) => {
      if (previous !== null && attempt.attemptNumber <= previous) cycle++;
      previous = attempt.attemptNumber;
      const manual = cycle > 0;
      const label = !manual
        ? `Attempt #${attempt.attemptNumber}`
        : attempt.attemptNumber > 1
          ? `Manual Retry #${cycle} · Attempt #${attempt.attemptNumber}`
          : `Manual Retry #${cycle}`;
      return { attempt, cycle, manual, label };
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
        this.notifyMerchant('Delivery retry accepted', `Retry status: ${this.getDeliveryStatusLabel(updated.status)}.`);
        this.loadDeliveries();
        const selected = this.selectedDelivery();
        if (selected?.deliveryId === deliveryId) {
          this.inspectDelivery(selected);
        }
      },
      error: (error: HttpErrorResponse) => {
        this.deliveryActionError.set(this.apiErrorMessage(error, 'Unable to retry delivery.'));
        this.notifyMerchant('Delivery retry failed', this.deliveryActionError()!, 'error');
      },
    });
  }

  getDeliveryStatusLabel(status: WebhookDeliveryStatus): string {
    switch (status) {
      case 'SUCCESS':
        return 'Delivered';
      case 'PENDING_RETRY':
        return 'Retrying';
      case 'FAILED':
        return 'Failed';
      case 'CANCELLED':
        return 'Cancelled';
      case 'PENDING':
        return 'Pending';
      default:
        return status;
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
      case 'PENDING':
        return 'bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]';
      case 'CANCELLED':
      default:
        return 'bg-[#f1f5f9] text-[#64748b] border border-[#cbd5e1]';
    }
  }

  getHttpCodeExplanation(statusCode?: number): string {
    if (!statusCode) {
      return 'Connection Failed';
    }
    switch (statusCode) {
      case 200:
        return '200 OK';
      case 201:
        return '201 Created';
      case 202:
        return '202 Accepted';
      case 204:
        return '204 No Content';
      case 400:
        return '400 Bad Request';
      case 401:
        return '401 Unauthorized';
      case 403:
        return '403 Forbidden';
      case 404:
        return '404 Not Found';
      case 408:
        return '408 Request Timeout';
      case 410:
        return '410 Gone';
      case 422:
        return '422 Unprocessable';
      case 429:
        return '429 Rate Limited';
      case 500:
        return '500 Server Error';
      case 502:
        return '502 Bad Gateway';
      case 503:
        return '503 Unavailable';
      case 504:
        return '504 Gateway Timeout';
      default:
        if (statusCode >= 200 && statusCode < 300) return `${statusCode} Success`;
        if (statusCode >= 400 && statusCode < 500) return `${statusCode} Client Error`;
        if (statusCode >= 500 && statusCode < 600) return `${statusCode} Server Error`;
        return `${statusCode}`;
    }
  }

  humanReadableDeliveryEvent(eventType: string): string {
    switch (eventType) {
      case 'PARCEL_STATUS_CHANGED':
        return 'Parcel Status Changed';
      case 'PARCEL_CREATED':
        return 'Order Created';
      case 'TEST_EVENT':
        return 'Test Notification';
      default:
        return eventType;
    }
  }

  private isHttpsUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password;
    } catch {
      return false;
    }
  }

  private notifyMerchant(title: string, message: string, kind: 'success' | 'error' | 'info' = 'success'): void {
    this.notification.set(message);
    this.merchantNotifications.add(title, message, kind);
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
}
