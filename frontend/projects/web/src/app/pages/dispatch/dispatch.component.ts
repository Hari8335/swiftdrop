import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from 'shared-auth';
import {
  AssignParcelRequest,
  BulkAssignResponse,
  CourierWorkloadItem,
  DispatchParcelSummary,
  RequeueResponse,
  Zone,
} from './dispatch.model';
import { DispatchService } from './dispatch.service';

type DispatchTab = 'home' | 'queue' | 'workload' | 'failed';

@Component({
  selector: 'app-dispatch',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
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
          <button
            type="button"
            id="tab-home-btn"
            (click)="setTab('home')"
            [class.rail-active]="activeTab() === 'home'"
            [class.text-[#a53a26]]="activeTab() === 'home'"
            [class.bg-white]="activeTab() === 'home'"
            [class.shadow-xs]="activeTab() === 'home'"
            [class.text-[#6f6d85]]="activeTab() !== 'home'"
            class="rail-icon-btn relative w-10 h-10 rounded-xl flex items-center justify-center hover:text-[#a53a26] hover:bg-white transition-all cursor-pointer"
            title="Dispatcher Home"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span *ngIf="activeTab() === 'home'" class="hidden md:block absolute -right-[1px] top-2 bottom-2 w-1 bg-[#a53a26] rounded-l-full"></span>
          </button>

          <!-- 1. Unassigned Queue -->
          <button
            type="button"
            id="tab-queue-btn"
            (click)="setTab('queue')"
            [class.rail-active]="activeTab() === 'queue'"
            [class.text-[#a53a26]]="activeTab() === 'queue'"
            [class.bg-white]="activeTab() === 'queue'"
            [class.shadow-xs]="activeTab() === 'queue'"
            [class.text-[#6f6d85]]="activeTab() !== 'queue'"
            class="rail-icon-btn relative w-10 h-10 rounded-xl flex items-center justify-center hover:text-[#a53a26] hover:bg-white transition-all cursor-pointer"
            title="Unassigned Queue"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
              <path d="M9 12h6"></path>
              <path d="M9 16h6"></path>
            </svg>
            <span *ngIf="activeTab() === 'queue'" class="hidden md:block absolute -right-[1px] top-2 bottom-2 w-1 bg-[#a53a26] rounded-l-full"></span>
            <span
              *ngIf="dispatchService.unassignedCount() > 0"
              class="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#a53a26] text-white text-[9px] font-bold flex items-center justify-center shadow-xs"
            >
              {{ dispatchService.unassignedCount() }}
            </span>
          </button>

          <!-- 2. Failed Deliveries -->
          <button
            type="button"
            id="tab-failed-btn"
            (click)="setTab('failed')"
            [class.rail-active]="activeTab() === 'failed'"
            [class.text-[#a53a26]]="activeTab() === 'failed'"
            [class.bg-white]="activeTab() === 'failed'"
            [class.shadow-xs]="activeTab() === 'failed'"
            [class.text-[#6f6d85]]="activeTab() !== 'failed'"
            class="rail-icon-btn relative w-10 h-10 rounded-xl flex items-center justify-center hover:text-[#a53a26] hover:bg-white transition-all cursor-pointer"
            title="Failed Deliveries"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span *ngIf="activeTab() === 'failed'" class="hidden md:block absolute -right-[1px] top-2 bottom-2 w-1 bg-[#a53a26] rounded-l-full"></span>
            <span
              *ngIf="dispatchService.totalFailedCount() > 0"
              class="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center shadow-xs"
            >
              {{ dispatchService.totalFailedCount() }}
            </span>
          </button>

          <!-- 3. Courier Workload Board -->
          <button
            type="button"
            id="tab-workload-btn"
            (click)="setTab('workload')"
            [class.rail-active]="activeTab() === 'workload'"
            [class.text-[#a53a26]]="activeTab() === 'workload'"
            [class.bg-white]="activeTab() === 'workload'"
            [class.shadow-xs]="activeTab() === 'workload'"
            [class.text-[#6f6d85]]="activeTab() !== 'workload'"
            class="rail-icon-btn relative w-10 h-10 rounded-xl flex items-center justify-center hover:text-[#a53a26] hover:bg-white transition-all cursor-pointer"
            title="Courier Workload Board"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <rect x="3" y="3" width="7" height="7" rx="2"></rect>
              <rect x="14" y="3" width="7" height="7" rx="2"></rect>
              <rect x="14" y="14" width="7" height="7" rx="2"></rect>
              <rect x="3" y="14" width="7" height="7" rx="2"></rect>
            </svg>
            <span *ngIf="activeTab() === 'workload'" class="hidden md:block absolute -right-[1px] top-2 bottom-2 w-1 bg-[#a53a26] rounded-l-full"></span>
          </button>

          <!-- 4. Delivery Zones -->
          <a
            routerLink="/dispatch/zones"
            id="tab-zones-link"
            class="rail-icon-btn relative w-10 h-10 rounded-xl flex items-center justify-center text-[#6f6d85] hover:text-[#a53a26] hover:bg-white transition-all cursor-pointer no-underline"
            title="Delivery Zones"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
              <line x1="8" y1="2" x2="8" y2="18"></line>
              <line x1="16" y1="6" x2="16" y2="22"></line>
            </svg>
          </a>

          <!-- 5. Pricing Rules -->
          <a
            routerLink="/dispatch/pricing"
            id="tab-pricing-link"
            class="rail-icon-btn relative w-10 h-10 rounded-xl flex items-center justify-center text-[#6f6d85] hover:text-[#a53a26] hover:bg-white transition-all cursor-pointer no-underline"
            title="Pricing Rules"
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
              id="top-quick-search-input"
              [ngModel]="searchQuery()"
              (ngModelChange)="searchQuery.set($event)"
              (keyup.enter)="searchQuery() ? setTab('queue') : null"
              placeholder="Search for parcel numbers, tracking ID, address... (Press Enter to search queue)"
              class="w-full pl-11 pr-4 py-2.5 rounded-full bg-[#faf8f6] border border-[#e8e2dc] text-xs font-semibold text-[#1d1b2c] focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] transition-all"
            />
          </div>

          <!-- User Profile & Sign Out Dropdown -->
          <div class="flex items-center gap-3 self-end sm:self-auto">
            <div class="relative">
              <button
                type="button"
                id="profile-menu-btn"
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

        <!-- ================================================================= -->
        <!-- TAB 0: HOME PAGE (Interactive Hero Cards & Operations Launchpad) -->
        <!-- ================================================================= -->
        <div *ngIf="activeTab() === 'home'" class="space-y-8 animate-fade-in">
          <!-- Greeting Banner -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 class="text-2xl sm:text-3xl font-black text-[#1d1b2c] tracking-tight">
                Welcome back, Dispatcher!
              </h1>
              <p class="text-xs sm:text-sm text-[#6f6d85] font-medium mt-1">
                SwiftDrop Live Queue Management & Courier Workload Board • Port 8083
              </p>
            </div>
            <div class="flex items-center gap-2">
              <span
                id="live-sync-indicator"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
              >
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Live Sync (10s)
              </span>
            </div>
          </div>

          <!-- Two Hero Cards Grid (Matching Customer Portal Design) -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <!-- Hero Card 1: Active In-Queue Card with 3D Isometric Graphic -->
            <div
              class="hero-summary-card bg-white rounded-3xl p-6 sm:p-7 border border-[#eee7e0] shadow-sm flex flex-col justify-between relative overflow-hidden space-y-6"
            >
              <div class="flex items-start justify-between relative z-10">
                <div>
                  <span class="text-[10px] font-black uppercase tracking-widest text-[#a53a26] block mb-1">
                    DISPATCH QUEUE OVERVIEW
                  </span>
                  <div class="flex items-baseline">
                    <span class="text-5xl font-black text-[#1d1b2c] tracking-tight">
                      {{ dispatchService.unassignedCount() }}
                    </span>
                    <span class="text-sm font-bold text-[#6f6d85] ml-2">in queue awaiting assignment</span>
                  </div>
                  <p class="text-xs text-[#6f6d85] font-medium mt-3 max-w-xs leading-relaxed">
                    <strong class="text-[#1d1b2c]">{{ dispatchService.totalWorkloadActive() }} deliveries active</strong> across
                    <strong class="text-[#1d1b2c]">{{ dispatchService.availableCouriersCount() }} online couriers</strong>. Ready to optimize parcel dispatch routes?
                  </p>
                </div>

                <!-- 3D Isometric Parcels Graphic (Terracotta & White Cubes) -->
                <div class="relative w-28 h-28 flex-shrink-0 -mt-2 -mr-1">
                  <svg class="w-full h-full drop-shadow-md" viewBox="0 0 160 140" fill="none">
                    <g transform="translate(68, 15)">
                      <polygon points="40,0 80,20 40,40 0,20" fill="#a53a26" />
                      <polygon points="0,20 40,40 40,84 0,64" fill="#7e2615" />
                      <polygon points="40,40 80,20 80,64 40,84" fill="#5c1b0f" />
                    </g>
                    <g transform="translate(15, 45)">
                      <polygon points="34,0 68,17 34,34 0,17" fill="#ffffff" stroke="#eee7e0" stroke-width="0.5" />
                      <polygon points="0,17 34,34 34,72 0,55" fill="#f8f6f4" stroke="#eee7e0" stroke-width="0.5" />
                      <polygon points="34,34 68,17 68,55 34,72" fill="#e8e2dc" stroke="#eee7e0" stroke-width="0.5" />
                    </g>
                  </svg>
                </div>
              </div>

              <!-- Quick Launch Buttons in Hero Card 1 -->
              <div class="flex flex-wrap items-center gap-3 pt-2 relative z-10">
                <button
                  type="button"
                  id="home-review-queue-btn"
                  (click)="setTab('queue')"
                  class="px-5 py-2.5 rounded-full bg-[#a53a26] hover:bg-[#7e2615] text-white font-bold text-xs transition-all shadow-sm hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <span>Review Queue ({{ dispatchService.unassignedCount() }})</span>
                  <span>→</span>
                </button>
                <button
                  type="button"
                  id="home-courier-workloads-btn"
                  (click)="setTab('workload')"
                  class="px-5 py-2.5 rounded-full border border-[#a53a26] text-[#a53a26] hover:bg-[#faf6f0] font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>👷</span>
                  <span>Courier Workloads</span>
                </button>
              </div>
            </div>

            <!-- Hero Card 2: Operations Monitor (Terracotta Card #a53a26) -->
            <div
              class="hero-track-card bg-[#a53a26] rounded-3xl p-6 sm:p-7 text-white shadow-md shadow-[#a53a26]/20 flex flex-col justify-between space-y-6"
            >
              <div>
                <span class="text-[10px] font-black uppercase tracking-widest text-white/70 block mb-1">
                  OPERATIONS MONITOR
                </span>
                <h3 class="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug max-w-sm">
                  Live Fleet Status & Failed Queue
                </h3>
                <p class="text-xs text-white/80 mt-1">
                  Real-time courier load balancing, bulk batch assignments, and re-queuing failed deliveries.
                </p>
              </div>

              <!-- Fleet & Failed Delivery Metrics (3 Interactive Buttons) -->
              <div class="grid grid-cols-3 gap-2.5 pt-1">
                <button
                  type="button"
                  id="home-online-couriers-btn"
                  (click)="setTab('workload')"
                  class="bg-white/10 hover:bg-white/20 active:scale-95 transition-all rounded-2xl p-3 text-center border border-white/10 cursor-pointer group"
                  title="View Online Couriers"
                >
                  <p class="text-[10px] font-bold uppercase tracking-wider text-white/70 group-hover:text-white transition-colors">
                    Online Couriers
                  </p>
                  <p class="text-xl font-black text-white mt-0.5">
                    {{ dispatchService.availableCouriersCount() }}/{{ dispatchService.couriers().length }}
                  </p>
                </button>
                <button
                  type="button"
                  id="home-active-load-btn"
                  (click)="setTab('workload')"
                  class="bg-white/10 hover:bg-white/20 active:scale-95 transition-all rounded-2xl p-3 text-center border border-white/10 cursor-pointer group"
                  title="View Active Deliveries"
                >
                  <p class="text-[10px] font-bold uppercase tracking-wider text-white/70 group-hover:text-white transition-colors">
                    Active Load
                  </p>
                  <p class="text-xl font-black text-white mt-0.5">
                    {{ dispatchService.totalWorkloadActive() }}
                  </p>
                </button>
                <button
                  type="button"
                  id="home-failed-parcels-btn"
                  (click)="setTab('failed')"
                  class="bg-white/10 hover:bg-white/20 active:scale-95 transition-all rounded-2xl p-3 text-center border border-white/10 cursor-pointer group"
                  title="View Failed Deliveries"
                >
                  <p class="text-[10px] font-bold uppercase tracking-wider text-white/70 group-hover:text-white transition-colors">
                    Failed Parcels
                  </p>
                  <p class="text-xl font-black text-white mt-0.5">
                    {{ dispatchService.totalFailedCount() }}
                  </p>
                </button>
              </div>
            </div>
          </div>

          <!-- Regional Logistics & Pricing Configuration (Space-Efficient 2-Box Row) -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            <!-- Delivery Zones Box -->
            <a
              routerLink="/dispatch/zones"
              id="home-delivery-zones-btn"
              class="bg-white rounded-3xl p-6 border border-[#eee7e0] shadow-xs hover:border-[#a53a26]/40 hover:shadow-md transition-all cursor-pointer group flex items-center justify-between gap-4 no-underline"
              title="Configure Delivery Zones"
            >
              <div class="flex items-center gap-4 min-w-0">
                <div class="w-12 h-12 rounded-2xl bg-[#faf8f6] border border-[#f0ebe5] flex items-center justify-center text-xl text-[#a53a26] group-hover:scale-105 transition-transform shrink-0">
                  🗺️
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <h3 class="text-base font-black text-[#1d1b2c] group-hover:text-[#a53a26] transition-colors truncate">
                      Delivery Zones
                    </h3>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#faf8f6] text-[#a53a26] border border-[#f0ebe5]">
                      Coverage Areas
                    </span>
                  </div>
                  <p class="text-xs text-[#6f6d85] font-medium mt-0.5 truncate">
                    Configure municipal coverage boundaries and regional base fees
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#faf8f6] group-hover:bg-[#a53a26] text-[#a53a26] group-hover:text-white border border-[#f0ebe5] group-hover:border-[#a53a26] text-xs font-bold transition-all shrink-0">
                <span>Configure</span>
                <span class="group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </a>

            <!-- Pricing Rules Box -->
            <a
              routerLink="/dispatch/pricing"
              id="home-pricing-rules-btn"
              class="bg-white rounded-3xl p-6 border border-[#eee7e0] shadow-xs hover:border-[#a53a26]/40 hover:shadow-md transition-all cursor-pointer group flex items-center justify-between gap-4 no-underline"
              title="Configure Pricing Rules"
            >
              <div class="flex items-center gap-4 min-w-0">
                <div class="w-12 h-12 rounded-2xl bg-[#faf8f6] border border-[#f0ebe5] flex items-center justify-center text-xl text-[#a53a26] group-hover:scale-105 transition-transform shrink-0">
                  🏷️
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <h3 class="text-base font-black text-[#1d1b2c] group-hover:text-[#a53a26] transition-colors truncate">
                      Pricing Rules
                    </h3>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#faf8f6] text-[#a53a26] border border-[#f0ebe5]">
                      Tariff Models
                    </span>
                  </div>
                  <p class="text-xs text-[#6f6d85] font-medium mt-0.5 truncate">
                    Configure weight brackets, size surcharges, and rate tiers
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#faf8f6] group-hover:bg-[#a53a26] text-[#a53a26] group-hover:text-white border border-[#f0ebe5] group-hover:border-[#a53a26] text-xs font-bold transition-all shrink-0">
                <span>Configure</span>
                <span class="group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </a>
          </div>
        </div>

        <!-- ================================================================= -->
        <!-- TAB 1: UNASSIGNED QUEUE -->
        <!-- ================================================================= -->
        <div *ngIf="activeTab() === 'queue'" class="space-y-7 animate-fade-in">
          <!-- Queue Title Banner -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 class="text-2xl sm:text-3xl font-black text-[#1d1b2c] tracking-tight">
                Unassigned Parcels Queue
              </h1>
              <p class="text-xs sm:text-sm text-[#6f6d85] font-medium mt-1">
                Parcels awaiting courier dispatch and route assignment • Port 8083
              </p>
            </div>
            <div class="flex items-center gap-2">
              <span
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#faf8f6] text-[#a53a26] border border-[#f0ebe5]"
              >
                <span>📦</span>
                <span>{{ filteredParcels().length }} unassigned</span>
              </span>
            </div>
          </div>

          <!-- Queue Operations Data Card -->
          <div class="bg-white rounded-3xl border border-[#f0ebe5] p-6 sm:p-8 shadow-xs space-y-6">
            <!-- Header Row with Tools -->
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#f4efe9] pb-5">
              <div>
                <h2 class="text-xl sm:text-2xl font-black text-[#1d1b2c] tracking-tight">
                  Queue Dispatch Management
                </h2>
                <p class="text-xs text-[#6f6d85] font-medium mt-1">
                  Filter by delivery zone, select batches, and assign available fleet couriers
                </p>
              </div>

              <!-- Contextual Tools: Search + Zone Filter + Select All + Refresh -->
              <div class="flex flex-wrap items-center gap-2.5">
                <div class="relative min-w-[200px]">
                  <input
                    type="text"
                    id="queue-search-input"
                    [ngModel]="searchQuery()"
                    (ngModelChange)="searchQuery.set($event)"
                    placeholder="Search tracking # or address..."
                    class="w-full pl-8 pr-3 py-2 rounded-full border border-[#e8e2dc] bg-[#faf8f6] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] text-[#1d1b2c]"
                  />
                  <span class="absolute left-2.5 top-2 text-[#a09eaf] text-xs">🔍</span>
                </div>

                <select
                  id="queue-zone-filter"
                  [ngModel]="selectedZone()"
                  (ngModelChange)="onQueueZoneChange($event)"
                  class="px-3.5 py-2 rounded-full border border-[#e8e2dc] bg-[#faf8f6] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] text-[#1d1b2c] cursor-pointer"
                >
                  <option value="">All Delivery Zones</option>
                  <ng-container *ngIf="availableZones().length > 0; else defaultQueueZoneOptions">
                    <option *ngFor="let z of availableZones()" [value]="z.name">
                      {{ z.name }} ({{ z.districts.join(', ') }})
                    </option>
                  </ng-container>
                  <ng-template #defaultQueueZoneOptions>
                    <option value="E2E western">E2E western (Colombo)</option>
                    <option value="E2E central">E2E central (Kandy)</option>
                  </ng-template>
                  <option value="ZONE-COLOMBO-NORTH">Colombo North</option>
                  <option value="ZONE-COLOMBO-SOUTH">Colombo South</option>
                  <option value="ZONE-KANDY">Kandy Central</option>
                </select>

                <label class="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-[#e8e2dc] bg-[#faf8f6] text-xs font-bold text-[#6f6d85] cursor-pointer hover:bg-[#f3eee9] transition-colors">
                  <input
                    type="checkbox"
                    id="select-all-queue-checkbox"
                    [checked]="isAllSelected()"
                    (change)="toggleSelectAll()"
                    class="rounded text-[#a53a26] focus:ring-[#a53a26]"
                  />
                  <span>Select All</span>
                </label>

                <button
                  type="button"
                  id="refresh-queue-btn"
                  (click)="retryLoadQueue()"
                  class="px-3.5 py-2 rounded-full border border-[#e8e2dc] bg-[#faf8f6] text-[#6f6d85] hover:text-[#a53a26] hover:bg-[#f3eee9] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🔄</span>
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            <!-- Bulk Assign Action Bar -->
            <div *ngIf="selectedParcelIds().size > 0" class="bg-[#fff8f5] border border-[#fcd9cf] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
              <div class="flex items-center gap-3">
                <span class="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-[#a53a26] text-white font-black text-sm shadow-sm">
                  {{ selectedParcelIds().size }}
                </span>
                <div>
                  <p class="text-sm font-bold text-[#1d1b2c]">{{ selectedParcelIds().size }} Parcel(s) Selected for Bulk Assignment</p>
                  <p class="text-xs text-[#a53a26] font-medium">Assign all selected parcels to a single courier simultaneously</p>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-2.5">
                <select
                  id="bulk-courier-select"
                  [ngModel]="bulkCourierId()"
                  (ngModelChange)="bulkCourierId.set($event)"
                  class="px-3 py-1.5 rounded-xl border border-[#fcd9cf] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#a53a26] bg-white text-[#1d1b2c]"
                >
                  <option value="">Select Target Courier...</option>
                  <option *ngFor="let c of dispatchService.availableCouriers()" [value]="c.courierId">
                    {{ c.name }} ({{ c.activeCount }} active) • {{ c.zone }}
                  </option>
                </select>

                <button
                  type="button"
                  id="submit-bulk-assign-btn"
                  [disabled]="!bulkCourierId() || isSubmittingBulk()"
                  (click)="submitBulkAssign()"
                  class="px-4 py-1.5 rounded-xl bg-[#a53a26] hover:bg-[#8c2e1d] text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <span *ngIf="isSubmittingBulk()" class="animate-spin text-xs">⏳</span>
                  <span>{{ isSubmittingBulk() ? 'Assigning...' : 'Assign Selected' }}</span>
                </button>

                <button
                  type="button"
                  id="clear-selection-btn"
                  (click)="clearSelection()"
                  class="px-3 py-1.5 rounded-xl border border-[#f0ebe5] bg-white hover:bg-[#faf8f6] text-[#6f6d85] text-xs font-semibold transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            <!-- Loading State -->
            <div *ngIf="dispatchService.isLoadingParcels()" class="bg-white rounded-2xl border border-[#f0ebe5] p-12 text-center space-y-3">
              <div class="inline-block animate-spin text-3xl">⏳</div>
              <p class="text-sm font-semibold text-[#6f6d85]">Loading unassigned dispatch queue...</p>
            </div>

            <!-- Error State with Retry -->
            <div *ngIf="!dispatchService.isLoadingParcels() && dispatchService.parcelsError()" class="bg-rose-50 rounded-2xl border border-rose-200 p-6 text-center space-y-3">
              <div class="text-3xl">⚠️</div>
              <h3 class="text-sm font-bold text-rose-800">Failed to Load Dispatch Queue</h3>
              <p class="text-xs text-rose-600 max-w-md mx-auto">{{ dispatchService.parcelsError() }}</p>
              <button
                type="button"
                id="retry-queue-btn"
                (click)="retryLoadQueue()"
                class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                Retry Loading Queue
              </button>
            </div>

            <!-- Parcels Grid / Table -->
            <div *ngIf="!dispatchService.isLoadingParcels() && !dispatchService.parcelsError()">
              <div *ngIf="filteredParcels().length > 0; else emptyQueueTemplate" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  *ngFor="let parcel of filteredParcels()"
                  class="bg-white rounded-2xl border border-[#f0ebe5] shadow-sm p-5 hover:border-[#a53a26]/40 hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                >
                  <div>
                    <div class="flex items-center justify-between gap-2">
                      <div class="flex items-center gap-2">
                        <input
                          type="checkbox"
                          [attr.id]="'select-parcel-' + parcel.parcelId"
                          [checked]="isParcelSelected(parcel.parcelId)"
                          (change)="toggleSelectParcel(parcel.parcelId)"
                          class="rounded text-[#a53a26] focus:ring-[#a53a26] w-4 h-4 cursor-pointer"
                        />
                        <span class="font-mono text-sm font-black text-[#a53a26] bg-[#a53a26]/10 px-2.5 py-1 rounded-lg border border-[#a53a26]/20">
                          {{ parcel.trackingNumber }}
                        </span>
                      </div>
                      <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        ● {{ parcel.status }} (Unassigned)
                      </span>
                    </div>

                    <!-- Pickup & Dropoff Routing -->
                    <div class="mt-4 space-y-2.5 text-xs text-[#6f6d85]">
                      <div class="flex items-start gap-2">
                        <span class="text-emerald-600 font-bold mt-0.5">🟢 PICKUP:</span>
                        <div>
                          <p class="font-bold text-[#1d1b2c]">{{ parcel.pickupAddress || 'Address on file' }}</p>
                          <p class="text-[11px] text-[#6f6d85]">{{ parcel.pickupZone }}</p>
                        </div>
                      </div>
                      <div class="flex items-start gap-2">
                        <span class="text-[#a53a26] font-bold mt-0.5">📍 DROPOFF:</span>
                        <div>
                          <p class="font-bold text-[#1d1b2c]">{{ parcel.dropoffAddress || 'Address on file' }}</p>
                          <p class="text-[11px] text-[#6f6d85]">
                            {{ parcel.dropoffZone }}
                            <span *ngIf="parcel.recipientName"> • Recipient: {{ parcel.recipientName }}</span>
                            <span *ngIf="parcel.recipientPhone"> ({{ parcel.recipientPhone }})</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Footer Specs & Assign Trigger -->
                  <div class="pt-3 border-t border-[#f0ebe5] flex items-center justify-between gap-2">
                    <div class="flex items-center gap-3 text-xs text-[#6f6d85] font-medium">
                      <span *ngIf="parcel.weightKg !== undefined">⚖️ {{ parcel.weightKg }} kg</span>
                      <span>•</span>
                      <span>Attempts: {{ parcel.attemptCount ?? 0 }}</span>
                    </div>

                    <button
                      type="button"
                      [attr.id]="'assign-parcel-' + parcel.parcelId + '-btn'"
                      (click)="openAssignModal(parcel)"
                      class="px-4 py-2 rounded-xl bg-[#a53a26] hover:bg-[#8c2e1d] text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Assign Courier</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              </div>

              <ng-template #emptyQueueTemplate>
                <div class="bg-white rounded-2xl border border-[#f0ebe5] p-12 text-center space-y-3">
                  <div class="text-4xl">🎉</div>
                  <h3 class="text-base font-bold text-[#1d1b2c]">All Parcels Assigned!</h3>
                  <p class="text-xs text-[#6f6d85] max-w-sm mx-auto">
                    There are currently no parcels in the unassigned queue awaiting courier assignment.
                  </p>
                </div>
              </ng-template>
            </div>
          </div>
        </div>

        <!-- ================================================================= -->
        <!-- TAB 2: COURIER WORKLOAD BOARD -->
        <!-- ================================================================= -->
        <div *ngIf="activeTab() === 'workload'" class="space-y-7 animate-fade-in">
          <!-- Workload Title Banner -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 class="text-2xl sm:text-3xl font-black text-[#1d1b2c] tracking-tight">
                Courier Fleet & Workload Board
              </h1>
              <p class="text-xs sm:text-sm text-[#6f6d85] font-medium mt-1">
                Real-time workload distribution and capacity across the courier fleet • Port 8083
              </p>
            </div>
            <div class="flex items-center gap-2">
              <span
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#faf8f6] text-[#a53a26] border border-[#f0ebe5]"
              >
                <span>👷</span>
                <span>{{ filteredCouriers().length }} couriers</span>
              </span>
            </div>
          </div>

          <!-- Workload Operations Data Card -->
          <div class="bg-white rounded-3xl border border-[#f0ebe5] p-6 sm:p-8 shadow-xs space-y-6">
            <!-- Header Row with Tools -->
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#f4efe9] pb-5">
              <div>
                <h2 class="text-xl sm:text-2xl font-black text-[#1d1b2c] tracking-tight">
                  Fleet Availability & Capacity
                </h2>
                <p class="text-xs text-[#6f6d85] font-medium mt-1">
                  Monitor active delivery counts, manage online/offline status, and balance route density
                </p>
              </div>

              <!-- Contextual Tools: Zone Filter + Online Only + Refresh -->
              <div class="flex flex-wrap items-center gap-2.5">
                <select
                  id="workload-zone-filter"
                  [ngModel]="workloadZone()"
                  (ngModelChange)="onWorkloadZoneChange($event)"
                  class="px-3.5 py-2 rounded-full border border-[#e8e2dc] bg-[#faf8f6] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] text-[#1d1b2c] cursor-pointer"
                >
                  <option value="">All Delivery Zones</option>
                  <ng-container *ngIf="availableZones().length > 0; else defaultWorkloadZoneOptions">
                    <option *ngFor="let z of availableZones()" [value]="z.name">
                      {{ z.name }} ({{ z.districts.join(', ') }})
                    </option>
                  </ng-container>
                  <ng-template #defaultWorkloadZoneOptions>
                    <option value="E2E western">E2E western (Colombo)</option>
                    <option value="E2E central">E2E central (Kandy)</option>
                  </ng-template>
                  <option value="ZONE-COLOMBO-NORTH">Colombo North</option>
                  <option value="ZONE-COLOMBO-SOUTH">Colombo South</option>
                  <option value="ZONE-KANDY">Kandy Central</option>
                </select>

                <label class="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-[#e8e2dc] bg-[#faf8f6] text-xs font-bold text-[#1d1b2c] cursor-pointer hover:bg-[#f3eee9] transition-colors">
                  <input
                    type="checkbox"
                    id="available-only-toggle"
                    [ngModel]="availableOnly()"
                    (ngModelChange)="onAvailableOnlyChange($event)"
                    class="rounded text-[#a53a26] focus:ring-[#a53a26]"
                  />
                  <span>Online Only</span>
                </label>

                <button
                  type="button"
                  id="refresh-workload-btn"
                  (click)="retryLoadWorkload()"
                  class="px-3.5 py-2 rounded-full border border-[#e8e2dc] bg-[#faf8f6] text-[#6f6d85] hover:text-[#a53a26] hover:bg-[#f3eee9] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🔄</span>
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            <!-- Workload Loading State -->
            <div *ngIf="dispatchService.isLoadingCouriers()" class="bg-[#faf8f6] rounded-2xl border border-[#f0ebe5] p-12 text-center space-y-3">
              <div class="inline-block animate-spin text-3xl">⏳</div>
              <p class="text-sm font-semibold text-[#6f6d85]">Loading courier workload board...</p>
            </div>

            <!-- Workload Error State -->
            <div *ngIf="!dispatchService.isLoadingCouriers() && dispatchService.couriersError()" class="bg-rose-50 rounded-2xl border border-rose-200 p-6 text-center space-y-3">
              <div class="text-3xl">⚠️</div>
              <h3 class="text-sm font-bold text-rose-800">Failed to Load Workload Board</h3>
              <p class="text-xs text-rose-600 max-w-md mx-auto">{{ dispatchService.couriersError() }}</p>
              <button
                type="button"
                id="retry-workload-btn"
                (click)="retryLoadWorkload()"
                class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                Retry Loading Workload
              </button>
            </div>

            <!-- Couriers Grid -->
            <div *ngIf="!dispatchService.isLoadingCouriers() && !dispatchService.couriersError()">
              <div *ngIf="filteredCouriers().length > 0; else emptyWorkloadTemplate" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div
                  *ngFor="let courier of filteredCouriers()"
                  class="bg-white rounded-2xl border border-[#f0ebe5] shadow-sm p-5 space-y-4 hover:border-[#a53a26]/30 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex items-center gap-3">
                        <div
                          class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base"
                          [class.bg-emerald-100]="courier.available"
                          [class.text-emerald-700]="courier.available"
                          [class.bg-[#f0ebe5]]="!courier.available"
                          [class.text-[#6f6d85]]="!courier.available"
                        >
                          {{ courier.vehicleType === 'VAN' ? '🚐' : courier.vehicleType === 'THREE_WHEELER' ? '🛺' : '🏍️' }}
                        </div>
                        <div>
                          <h3 class="text-sm font-extrabold text-[#1d1b2c]">{{ courier.name }}</h3>
                          <p class="text-[11px] text-[#6f6d85] font-medium">{{ courier.phoneNumber || 'No phone' }}</p>
                        </div>
                      </div>

                      <span
                        class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold"
                        [class.bg-emerald-50]="courier.available"
                        [class.text-emerald-700]="courier.available"
                        [class.border]="courier.available"
                        [class.border-emerald-200]="courier.available"
                        [class.bg-[#faf8f6]]="!courier.available"
                        [class.text-[#6f6d85]]="!courier.available"
                        [class.border-[#f0ebe5]]="!courier.available"
                      >
                        {{ courier.available ? '● Online' : '○ Offline' }}
                      </span>
                    </div>

                    <!-- Zone & Vehicle Info -->
                    <div class="mt-4 pt-3 border-t border-[#f0ebe5] space-y-1 text-xs text-[#6f6d85]">
                      <p><span class="font-semibold text-[#6f6d85]/70">Zone:</span> {{ courier.zone || 'Unassigned' }}</p>
                      <p><span class="font-semibold text-[#6f6d85]/70">Vehicle:</span> {{ courier.vehicleType || 'Standard' }}</p>
                    </div>
                  </div>

                  <!-- Workload Counter Display & Toggle -->
                  <div class="pt-3 border-t border-[#f0ebe5] flex items-center justify-between gap-2">
                    <div>
                      <p class="text-[10px] uppercase font-bold text-[#6f6d85]">Active Load</p>
                      <div class="flex items-center gap-1.5 mt-0.5">
                        <span
                          class="inline-flex items-center justify-center px-2.5 py-0.5 rounded-lg text-xs font-black"
                          [class.bg-emerald-100]="courier.activeCount <= 2"
                          [class.text-emerald-800]="courier.activeCount <= 2"
                          [class.bg-amber-100]="courier.activeCount > 2 && courier.activeCount <= 4"
                          [class.text-amber-800]="courier.activeCount > 2 && courier.activeCount <= 4"
                          [class.bg-rose-100]="courier.activeCount > 4"
                          [class.text-rose-800]="courier.activeCount > 4"
                        >
                          {{ courier.activeCount }} active
                        </span>
                        <span class="text-[11px] text-[#6f6d85] font-medium">
                          {{ courier.activeCount <= 2 ? 'Light' : courier.activeCount <= 4 ? 'Moderate' : 'Heavy' }}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      [attr.id]="'toggle-courier-' + courier.courierId + '-btn'"
                      (click)="toggleCourierAvailability(courier)"
                      class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer"
                      [class.border-[#f0ebe5]]="courier.available"
                      [class.text-[#6f6d85]]="courier.available"
                      [class.hover:bg-[#faf8f6]]="courier.available"
                      [class.bg-emerald-600]="!courier.available"
                      [class.text-white]="!courier.available"
                      [class.hover:bg-emerald-700]="!courier.available"
                    >
                      {{ courier.available ? 'Set Offline' : 'Set Online' }}
                    </button>
                  </div>
                </div>
              </div>

              <ng-template #emptyWorkloadTemplate>
                <div class="bg-white rounded-2xl border border-[#f0ebe5] p-12 text-center space-y-3">
                  <div class="text-4xl">👷</div>
                  <h3 class="text-base font-bold text-[#1d1b2c]">No Couriers Found</h3>
                  <p class="text-xs text-[#6f6d85] max-w-sm mx-auto">
                    No active couriers match the selected zone or availability criteria.
                  </p>
                </div>
              </ng-template>
            </div>
          </div>
        </div>

        <!-- ================================================================= -->
        <!-- TAB 3: FAILED DELIVERIES -->
        <!-- ================================================================= -->
        <div *ngIf="activeTab() === 'failed'" class="space-y-7 animate-fade-in">
          <!-- Failed Deliveries Title Banner -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 class="text-2xl sm:text-3xl font-black text-[#1d1b2c] tracking-tight">
                Failed Deliveries Queue
              </h1>
              <p class="text-xs sm:text-sm text-[#6f6d85] font-medium mt-1">
                Delivery exceptions requiring review, re-queue, or courier reassignment • Port 8083
              </p>
            </div>
            <div class="flex items-center gap-2">
              <span
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200"
              >
                <span>⚠️</span>
                <span>{{ filteredFailedParcels().length }} failed</span>
              </span>
            </div>
          </div>

          <!-- Failed Deliveries Operations Data Card -->
          <div class="bg-white rounded-3xl border border-[#f0ebe5] p-6 sm:p-8 shadow-xs space-y-6">
            <!-- Header Row with Tools -->
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#f4efe9] pb-5">
              <div>
                <h2 class="text-xl sm:text-2xl font-black text-[#1d1b2c] tracking-tight">
                  Exception Review & Re-queue
                </h2>
                <p class="text-xs text-[#6f6d85] font-medium mt-1">
                  Inspect failure causes and re-queue parcels back to CREATED status for new attempts
                </p>
              </div>

              <!-- Contextual Tools: Search + Zone Filter + Refresh -->
              <div class="flex flex-wrap items-center gap-2.5">
                <div class="relative min-w-[200px]">
                  <input
                    type="text"
                    id="failed-search-input"
                    [ngModel]="failedSearchQuery()"
                    (ngModelChange)="failedSearchQuery.set($event)"
                    placeholder="Search failed tracking #, reason..."
                    class="w-full pl-8 pr-3 py-2 rounded-full border border-[#e8e2dc] bg-[#faf8f6] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-[#1d1b2c]"
                  />
                  <span class="absolute left-2.5 top-2 text-[#a09eaf] text-xs">🔍</span>
                </div>

                <select
                  id="failed-zone-filter"
                  [ngModel]="failedSelectedZone()"
                  (ngModelChange)="onFailedZoneChange($event)"
                  class="px-3.5 py-2 rounded-full border border-[#e8e2dc] bg-[#faf8f6] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-[#1d1b2c] cursor-pointer"
                >
                  <option value="">All Delivery Zones</option>
                  <ng-container *ngIf="availableZones().length > 0; else defaultFailedZoneOptions">
                    <option *ngFor="let z of availableZones()" [value]="z.name">
                      {{ z.name }} ({{ z.districts.join(', ') }})
                    </option>
                  </ng-container>
                  <ng-template #defaultFailedZoneOptions>
                    <option value="E2E western">E2E western (Colombo)</option>
                    <option value="E2E central">E2E central (Kandy)</option>
                  </ng-template>
                  <option value="ZONE-COLOMBO-NORTH">Colombo North</option>
                  <option value="ZONE-COLOMBO-SOUTH">Colombo South</option>
                  <option value="ZONE-KANDY">Kandy Central</option>
                </select>

                <button
                  type="button"
                  id="refresh-failed-btn"
                  (click)="retryLoadFailed()"
                  class="px-3.5 py-2 rounded-full border border-[#e8e2dc] bg-[#faf8f6] text-[#6f6d85] hover:text-rose-600 hover:bg-[#f3eee9] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🔄</span>
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            <!-- Loading State -->
            <div *ngIf="dispatchService.isLoadingFailed()" class="bg-[#faf8f6] rounded-2xl border border-[#f0ebe5] p-12 text-center space-y-3">
              <div class="inline-block animate-spin text-3xl">⏳</div>
              <p class="text-sm font-semibold text-[#6f6d85]">Loading failed delivery parcels...</p>
            </div>

            <!-- Error State with Retry -->
            <div *ngIf="!dispatchService.isLoadingFailed() && dispatchService.failedError()" class="bg-rose-50 rounded-2xl border border-rose-200 p-6 text-center space-y-3">
              <div class="text-3xl">⚠️</div>
              <h3 class="text-sm font-bold text-rose-800">Failed to Load Failed Deliveries</h3>
              <p class="text-xs text-rose-600 max-w-md mx-auto">{{ dispatchService.failedError() }}</p>
              <button
                type="button"
                id="retry-failed-btn"
                (click)="retryLoadFailed()"
                class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                Retry Loading
              </button>
            </div>

            <!-- Failed Parcels Grid -->
            <div *ngIf="!dispatchService.isLoadingFailed() && !dispatchService.failedError()">
              <div *ngIf="filteredFailedParcels().length > 0; else emptyFailedTemplate" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  *ngFor="let parcel of filteredFailedParcels()"
                  class="bg-white rounded-2xl border border-rose-200/80 shadow-sm p-5 hover:border-rose-300 transition-all space-y-4 flex flex-col justify-between"
                >
                  <div>
                    <div class="flex items-center justify-between gap-2">
                      <span class="font-mono text-sm font-black text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                        {{ parcel.trackingNumber }}
                      </span>
                      <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        ● FAILED
                      </span>
                    </div>

                    <!-- Failure Reason Alert Box -->
                    <div class="mt-3 p-3 rounded-xl bg-rose-50/70 border border-rose-200 text-xs text-rose-900 space-y-1">
                      <div class="flex items-center gap-1.5 font-bold">
                        <span>⚠️</span>
                        <span>Failure Reason:</span>
                      </div>
                      <p class="text-rose-700 font-medium pl-5">{{ parcel.failureReason || 'Delivery attempt failed' }}</p>
                    </div>

                    <!-- Routing -->
                    <div class="mt-3 space-y-2 text-xs text-[#6f6d85]">
                      <div class="flex items-start gap-2">
                        <span class="text-emerald-600 font-bold mt-0.5">🟢 PICKUP:</span>
                        <div>
                          <p class="font-bold text-[#1d1b2c]">{{ parcel.pickupAddress || 'Address on file' }}</p>
                          <p class="text-[11px] text-[#6f6d85]">{{ parcel.pickupZone }}</p>
                        </div>
                      </div>
                      <div class="flex items-start gap-2">
                        <span class="text-[#a53a26] font-bold mt-0.5">📍 DROPOFF:</span>
                        <div>
                          <p class="font-bold text-[#1d1b2c]">{{ parcel.dropoffAddress || 'Address on file' }}</p>
                          <p class="text-[11px] text-[#6f6d85]">
                            {{ parcel.dropoffZone }}
                            <span *ngIf="parcel.recipientName"> • Recipient: {{ parcel.recipientName }}</span>
                            <span *ngIf="parcel.recipientPhone"> ({{ parcel.recipientPhone }})</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Footer & Re-queue Trigger -->
                  <div class="pt-3 border-t border-[#f0ebe5] flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2 text-xs text-[#6f6d85] font-medium">
                      <span class="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-bold">
                        Attempt #{{ parcel.attemptCount ?? 1 }}
                      </span>
                      <span *ngIf="parcel.weightKg !== undefined">• {{ parcel.weightKg }} kg</span>
                    </div>

                    <button
                      type="button"
                      [attr.id]="'requeue-parcel-' + parcel.parcelId + '-btn'"
                      (click)="openRequeueModal(parcel)"
                      class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>🔄 Re-queue Parcel</span>
                    </button>
                  </div>
                </div>
              </div>

              <ng-template #emptyFailedTemplate>
                <div class="bg-white rounded-2xl border border-[#f0ebe5] p-12 text-center space-y-3">
                  <div class="text-4xl">✨</div>
                  <h3 class="text-base font-bold text-[#1d1b2c]">No Failed Deliveries</h3>
                  <p class="text-xs text-[#6f6d85] max-w-sm mx-auto">
                    There are no failed parcels requiring dispatcher attention at this time.
                  </p>
                </div>
              </ng-template>
            </div>
          </div>
        </div>

      <!-- Toast Feedback -->
      <div
        *ngIf="toastMessage()"
        class="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg border text-sm font-semibold transition-all transform animate-fade-in"
        [class.bg-emerald-50]="toastType() === 'success'"
        [class.border-emerald-300]="toastType() === 'success'"
        [class.text-emerald-800]="toastType() === 'success'"
        [class.bg-rose-50]="toastType() === 'error'"
        [class.border-rose-300]="toastType() === 'error'"
        [class.text-rose-800]="toastType() === 'error'"
      >
        <span>{{ toastType() === 'success' ? '✅' : '⚠️' }}</span>
        <span>{{ toastMessage() }}</span>
        <button
          type="button"
          (click)="toastMessage.set(null)"
          class="ml-2 text-[#6f6d85] hover:text-[#1d1b2c] cursor-pointer"
        >
          ✕
        </button>
      </div>



      <!-- ================================================================= -->
      <!-- MODAL: ASSIGN PARCEL DIALOG -->
      <!-- ================================================================= -->
      <div
        *ngIf="selectedParcelForAssign()"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1d1b2c]/40 backdrop-blur-sm animate-fade-in"
      >
        <div class="bg-white rounded-2xl shadow-xl border border-[#f0ebe5] w-full max-w-lg p-6 space-y-5">
          <div class="flex items-center justify-between border-b border-[#f0ebe5] pb-3">
            <div>
              <h3 class="text-base font-extrabold text-[#1d1b2c]">Assign Courier to Parcel</h3>
              <p class="text-xs text-[#a53a26] font-mono font-bold">{{ selectedParcelForAssign()?.trackingNumber }}</p>
            </div>
            <button
              type="button"
              [disabled]="isSubmittingAssignment()"
              (click)="selectedParcelForAssign.set(null)"
              class="w-8 h-8 rounded-lg flex items-center justify-center text-[#6f6d85] hover:text-[#1d1b2c] hover:bg-[#faf8f6] text-sm disabled:opacity-50 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <!-- Parcel Route Card -->
          <div class="bg-[#faf8f6] rounded-xl p-3.5 border border-[#f0ebe5] text-xs space-y-1.5 text-[#1d1b2c]">
            <p><strong>Route:</strong> {{ selectedParcelForAssign()?.pickupZone }} → {{ selectedParcelForAssign()?.dropoffZone }}</p>
            <p><strong>Dropoff Address:</strong> {{ selectedParcelForAssign()?.dropoffAddress }}</p>
            <p *ngIf="selectedParcelForAssign()?.weightKg !== undefined"><strong>Weight:</strong> {{ selectedParcelForAssign()?.weightKg }} kg</p>
          </div>

          <!-- Select Courier -->
          <div class="space-y-2">
            <label class="block text-xs font-bold text-[#1d1b2c] uppercase tracking-wider">
              Select Available Courier
            </label>
            <div class="max-h-56 overflow-y-auto space-y-2 pr-1">
              <div
                *ngFor="let courier of dispatchService.couriers()"
                (click)="courier.available && !isSubmittingAssignment() ? selectedCourierId.set(courier.courierId) : null"
                class="p-3 rounded-xl border flex items-center justify-between gap-3 transition-all"
                [class.cursor-pointer]="courier.available && !isSubmittingAssignment()"
                [class.cursor-not-allowed]="!courier.available || isSubmittingAssignment()"
                [class.opacity-50]="!courier.available"
                [class.border-[#a53a26]]="selectedCourierId() === courier.courierId"
                [class.bg-[#fff8f5]]="selectedCourierId() === courier.courierId"
                [class.border-[#f0ebe5]]="selectedCourierId() !== courier.courierId"
              >
                <div class="flex items-center gap-3">
                  <input
                    type="radio"
                    name="courierSelection"
                    [value]="courier.courierId"
                    [checked]="selectedCourierId() === courier.courierId"
                    [disabled]="!courier.available || isSubmittingAssignment()"
                    class="text-[#a53a26] focus:ring-[#a53a26]"
                  />
                  <div>
                    <p class="text-xs font-bold text-[#1d1b2c]">{{ courier.name }}</p>
                    <p class="text-[11px] text-[#6f6d85]">{{ courier.zone || 'Zone N/A' }} • {{ courier.vehicleType || 'Standard' }}</p>
                  </div>
                </div>

                <div class="text-right">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold"
                    [class.bg-emerald-100]="courier.activeCount <= 2"
                    [class.text-emerald-800]="courier.activeCount <= 2"
                    [class.bg-amber-100]="courier.activeCount > 2"
                    [class.text-amber-800]="courier.activeCount > 2"
                  >
                    {{ courier.activeCount }} active
                  </span>
                  <p class="text-[10px] text-[#6f6d85] mt-0.5">
                    {{ courier.available ? '● Available' : '○ Offline' }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Dialog Actions -->
          <div class="pt-3 border-t border-[#f0ebe5] flex items-center justify-end gap-2">
            <button
              type="button"
              [disabled]="isSubmittingAssignment()"
              (click)="selectedParcelForAssign.set(null)"
              class="px-4 py-2 rounded-xl text-xs font-semibold text-[#6f6d85] hover:bg-[#faf8f6] transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              id="confirm-assignment-btn"
              [disabled]="!selectedCourierId() || isSubmittingAssignment()"
              (click)="confirmAssignment()"
              class="px-5 py-2 rounded-xl bg-[#a53a26] hover:bg-[#8c2e1d] text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
            >
              <span *ngIf="isSubmittingAssignment()" class="animate-spin text-xs">⏳</span>
              <span>{{ isSubmittingAssignment() ? 'Assigning...' : 'Confirm Assignment' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ================================================================= -->
      <!-- MODAL: BULK ASSIGN RESULTS -->
      <!-- ================================================================= -->
      <div
        *ngIf="bulkResult()"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1d1b2c]/40 backdrop-blur-sm animate-fade-in"
      >
        <div class="bg-white rounded-2xl shadow-xl border border-[#f0ebe5] w-full max-w-lg p-6 space-y-4">
          <div class="flex items-center justify-between border-b border-[#f0ebe5] pb-3">
            <h3 class="text-base font-extrabold text-[#1d1b2c]">Bulk Assignment Summary</h3>
            <button
              type="button"
              (click)="bulkResult.set(null)"
              class="w-8 h-8 rounded-lg flex items-center justify-center text-[#6f6d85] hover:text-[#1d1b2c] text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div class="grid grid-cols-3 gap-3 text-center">
            <div class="p-3 rounded-xl bg-[#faf8f6] border border-[#f0ebe5]">
              <p class="text-[11px] font-bold text-[#6f6d85] uppercase">Total</p>
              <p class="text-lg font-black text-[#1d1b2c]">{{ bulkResult()?.totalRequested }}</p>
            </div>
            <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <p class="text-[11px] font-bold text-emerald-600 uppercase">Succeeded</p>
              <p class="text-lg font-black text-emerald-800">{{ bulkResult()?.successfulCount }}</p>
            </div>
            <div class="p-3 rounded-xl bg-rose-50 border border-rose-200">
              <p class="text-[11px] font-bold text-rose-600 uppercase">Failed</p>
              <p class="text-lg font-black text-rose-800">{{ bulkResult()?.failedCount }}</p>
            </div>
          </div>

          <div class="max-h-60 overflow-y-auto space-y-2 pr-1">
            <div
              *ngFor="let item of bulkResult()?.results"
              class="p-2.5 rounded-xl border text-xs flex items-center justify-between gap-3"
              [class.bg-emerald-50/50]="item.success"
              [class.border-emerald-200]="item.success"
              [class.bg-rose-50/50]="!item.success"
              [class.border-rose-200]="!item.success"
            >
              <div class="flex items-center gap-2">
                <span>{{ item.success ? '✅' : '❌' }}</span>
                <div>
                  <p class="font-mono font-bold text-[#1d1b2c]">{{ item.parcelId }}</p>
                  <p *ngIf="!item.success" class="text-[11px] text-rose-600">
                    {{ item.errorMessage || item.errorCode }}
                  </p>
                </div>
              </div>
              <span
                class="px-2 py-0.5 rounded text-[11px] font-bold"
                [class.bg-emerald-100]="item.success"
                [class.text-emerald-800]="item.success"
                [class.bg-rose-100]="!item.success"
                [class.text-rose-800]="!item.success"
              >
                {{ item.success ? 'Assigned' : 'Failed' }}
              </span>
            </div>
          </div>

          <div class="pt-3 border-t border-[#f0ebe5] flex justify-end">
            <button
              type="button"
              id="close-bulk-results-btn"
              (click)="bulkResult.set(null)"
              class="px-5 py-2 rounded-xl bg-[#a53a26] hover:bg-[#8c2e1d] text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <!-- ================================================================= -->
      <!-- MODAL: RE-QUEUE PARCEL CONFIRMATION -->
      <!-- ================================================================= -->
      <div
        *ngIf="selectedParcelForRequeue()"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1d1b2c]/40 backdrop-blur-sm animate-fade-in"
      >
        <div class="bg-white rounded-2xl shadow-xl border border-[#f0ebe5] w-full max-w-lg p-6 space-y-5">
          <div class="flex items-center justify-between border-b border-[#f0ebe5] pb-3">
            <div>
              <h3 class="text-base font-extrabold text-[#1d1b2c]">Re-queue Failed Parcel</h3>
              <p class="text-xs text-[#a53a26] font-mono font-bold">{{ selectedParcelForRequeue()?.trackingNumber }}</p>
            </div>
            <button
              type="button"
              [disabled]="isSubmittingRequeue()"
              (click)="selectedParcelForRequeue.set(null)"
              class="w-8 h-8 rounded-lg flex items-center justify-center text-[#6f6d85] hover:text-[#1d1b2c] hover:bg-[#faf8f6] text-sm disabled:opacity-50 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <!-- Warning info box -->
          <div class="bg-amber-50 rounded-xl p-3.5 border border-amber-200 text-xs space-y-1.5 text-amber-900">
            <p class="font-bold flex items-center gap-1.5">
              <span>ℹ️</span>
              <span>Re-queue Confirmation</span>
            </p>
            <p>
              This action will return the parcel from <strong>FAILED</strong> to <strong>CREATED</strong> status,
              remove previous courier assignment, and increment the delivery attempt count
              (from <strong>{{ selectedParcelForRequeue()?.attemptCount ?? 1 }}</strong> to <strong>{{ (selectedParcelForRequeue()?.attemptCount ?? 1) + 1 }}</strong>).
            </p>
            <p class="text-[#6f6d85] mt-1">
              Previous Failure Reason: <em>"{{ selectedParcelForRequeue()?.failureReason || 'N/A' }}"</em>
            </p>
          </div>

          <!-- Reason Input -->
          <div class="space-y-1.5">
            <label for="requeue-reason-input" class="block text-xs font-bold text-[#1d1b2c] uppercase tracking-wider">
              Dispatcher Reason (Optional)
            </label>
            <input
              type="text"
              id="requeue-reason-input"
              [ngModel]="requeueReason()"
              (ngModelChange)="requeueReason.set($event)"
              placeholder="e.g. Customer requested redelivery tomorrow morning"
              class="w-full px-3.5 py-2.5 rounded-xl border border-[#f0ebe5] text-sm focus:outline-none focus:ring-2 focus:ring-[#a53a26] text-[#1d1b2c]"
            />
          </div>

          <!-- Actions -->
          <div class="pt-3 border-t border-[#f0ebe5] flex items-center justify-end gap-2">
            <button
              type="button"
              [disabled]="isSubmittingRequeue()"
              (click)="selectedParcelForRequeue.set(null)"
              class="px-4 py-2 rounded-xl text-xs font-semibold text-[#6f6d85] hover:bg-[#faf8f6] transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              id="confirm-requeue-btn"
              [disabled]="isSubmittingRequeue()"
              (click)="confirmRequeue()"
              class="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              <span *ngIf="isSubmittingRequeue()" class="animate-spin text-xs">⏳</span>
              <span>{{ isSubmittingRequeue() ? 'Re-queueing...' : 'Confirm Re-queue' }}</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
  `,
})
export class DispatchComponent implements OnInit, OnDestroy {
  public dispatchService = inject(DispatchService);
  private readonly route = inject(ActivatedRoute, { optional: true });
  public authService = inject(AuthService, { optional: true });
  private readonly router = inject(Router, { optional: true });

  public activeTab = signal<DispatchTab>('home');
  public profileMenuOpen = signal(false);
  private pollIntervalId: any = null;

  public toggleProfileMenu(): void {
    this.profileMenuOpen.update((open) => !open);
  }

  public logout(): void {
    if (this.authService) {
      this.authService.logout().subscribe({
        next: () => this.router?.navigate(['/login']),
        error: () => this.router?.navigate(['/login']),
      });
    } else {
      this.router?.navigate(['/login']);
    }
  }

  public dispatcherDisplayName(): string {
    return 'Sample Dispatcher';
  }

  // Search & Filter Signals
  public searchQuery = signal('');
  public selectedZone = signal('');
  public workloadZone = signal('');
  public availableOnly = signal(false);
  public failedSearchQuery = signal('');
  public failedSelectedZone = signal('');
  public availableZones = signal<Zone[]>([]);

  // Modals & Submitting state
  public selectedParcelForAssign = signal<DispatchParcelSummary | null>(null);
  public selectedCourierId = signal<string>('');
  public isSubmittingAssignment = signal(false);

  // Re-queue state
  public selectedParcelForRequeue = signal<DispatchParcelSummary | null>(null);
  public requeueReason = signal('');
  public isSubmittingRequeue = signal(false);

  // Bulk assignment state
  public selectedParcelIds = signal<Set<string>>(new Set());
  public bulkCourierId = signal('');
  public isSubmittingBulk = signal(false);
  public bulkResult = signal<BulkAssignResponse | null>(null);

  // Toast state
  public toastMessage = signal<string | null>(null);
  public toastType = signal<'success' | 'error'>('success');

  constructor() {
    this.route?.queryParamMap.subscribe((params) => {
      const tab = params.get('tab');
      if (tab === 'workload') {
        this.activeTab.set('workload');
      } else if (tab === 'failed') {
        this.activeTab.set('failed');
      } else if (tab === 'queue') {
        this.activeTab.set('queue');
      } else if (tab === 'home') {
        this.activeTab.set('home');
      } else if (tab !== null && tab !== undefined && tab !== '') {
        this.activeTab.set('queue');
      } else {
        this.activeTab.set('home');
      }
    });
  }

  public setTab(tab: DispatchTab): void {
    this.activeTab.set(tab);
    if (this.router && this.route) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { tab: tab === 'home' ? null : tab },
        queryParamsHandling: 'merge',
      });
    }
  }

  public ngOnInit(): void {
    this.loadAvailableZones();
    this.retryLoadQueue();
    this.retryLoadWorkload();
    this.retryLoadFailed();
    this.startLiveQueuePolling();
  }

  public loadAvailableZones(): void {
    if (typeof this.dispatchService?.listZones === 'function') {
      this.dispatchService.listZones().subscribe({
        next: (zones) => {
          if (zones && zones.length > 0) {
            this.availableZones.set(zones);
          } else {
            this.availableZones.set(this.defaultZones());
          }
        },
        error: () => {
          this.availableZones.set(this.defaultZones());
        },
      });
    } else {
      this.availableZones.set(this.defaultZones());
    }
  }

  public defaultZones(): Zone[] {
    return [
      {
        id: 'z-western',
        name: 'E2E western',
        districts: ['Colombo'],
        served: true,
        baseFeeLkr: 350,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'z-central',
        name: 'E2E central',
        districts: ['Kandy'],
        served: true,
        baseFeeLkr: 450,
        createdAt: '',
        updatedAt: '',
      },
    ];
  }

  public resolveBackendDistrict(zone: string): string | undefined {
    if (!zone || !zone.trim()) return undefined;
    if (zone.startsWith('ZONE-')) return zone;

    const zLower = zone.trim().toLowerCase();
    const zoneObj = this.availableZones().find(
      (z) =>
        z.name.toLowerCase() === zLower ||
        zLower.includes(z.name.toLowerCase()) ||
        z.name.toLowerCase().includes(zLower)
    );
    if (zoneObj && zoneObj.districts && zoneObj.districts.length > 0) {
      return zoneObj.districts[0];
    }

    if (zLower.includes('colombo') || zLower.includes('western')) return 'Colombo';
    if (zLower.includes('kandy') || zLower.includes('central')) return 'Kandy';

    return zone;
  }

  public matchesZone(targetZone: string | undefined | null, filterZone: string): boolean {
    if (!filterZone || !filterZone.trim()) return true;
    if (!targetZone || !targetZone.trim()) return false;

    const filterNorm = filterZone.trim().toLowerCase();
    const targetNorm = targetZone.trim().toLowerCase();

    if (filterNorm === targetNorm) return true;

    if (filterZone.startsWith('ZONE-') || targetZone.startsWith('ZONE-')) {
      return filterNorm === targetNorm;
    }

    const zoneObj = this.availableZones().find(
      (z) =>
        z.name.toLowerCase() === filterNorm ||
        filterNorm.includes(z.name.toLowerCase()) ||
        z.name.toLowerCase().includes(filterNorm)
    );
    if (zoneObj) {
      if (zoneObj.name.toLowerCase() === targetNorm) return true;
      if (
        zoneObj.districts?.some(
          (d) => d.toLowerCase() === targetNorm || targetNorm.includes(d.toLowerCase())
        )
      ) {
        return true;
      }
    }

    const isFilterColombo = filterNorm.includes('colombo') || filterNorm.includes('western');
    const isTargetColombo = targetNorm.includes('colombo') || targetNorm.includes('western');
    if (isFilterColombo && isTargetColombo) return true;

    const isFilterKandy = filterNorm.includes('kandy') || filterNorm.includes('central');
    const isTargetKandy = targetNorm.includes('kandy') || targetNorm.includes('central');
    if (isFilterKandy && isTargetKandy) return true;

    return false;
  }

  public matchesParcelZone(p: DispatchParcelSummary, filterZone: string): boolean {
    if (!filterZone || !filterZone.trim()) return true;
    if (filterZone.startsWith('ZONE-')) {
      return this.matchesZone(p.dropoffZone, filterZone) || this.matchesZone(p.pickupZone, filterZone);
    }
    return this.matchesZone(p.dropoffZone || p.pickupZone, filterZone);
  }

  public ngOnDestroy(): void {
    this.stopLiveQueuePolling();
  }

  public startLiveQueuePolling(): void {
    this.stopLiveQueuePolling();
    this.pollIntervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      this.performPeriodicSync();
    }, 10000);
  }

  public stopLiveQueuePolling(): void {
    if (this.pollIntervalId !== null) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
  }

  public performPeriodicSync(): void {
    const tab = this.activeTab();
    if (tab === 'home') {
      if (!this.dispatchService.isLoadingParcels()) this.retryLoadQueue();
      if (!this.dispatchService.isLoadingCouriers()) this.retryLoadWorkload();
      if (!this.dispatchService.isLoadingFailed()) this.retryLoadFailed();
    } else if (tab === 'queue' && !this.dispatchService.isLoadingParcels()) {
      this.retryLoadQueue();
    } else if (tab === 'workload' && !this.dispatchService.isLoadingCouriers()) {
      this.retryLoadWorkload();
    } else if (tab === 'failed' && !this.dispatchService.isLoadingFailed()) {
      this.retryLoadFailed();
    }
  }

  public retryLoadQueue(): void {
    const backendZone = this.resolveBackendDistrict(this.selectedZone());
    this.dispatchService.loadUnassignedParcels(backendZone).subscribe({
      error: () => {},
    });
  }

  public retryLoadWorkload(): void {
    const backendZone = this.resolveBackendDistrict(this.workloadZone());
    this.dispatchService.loadCourierWorkload(backendZone, this.availableOnly()).subscribe({
      error: () => {},
    });
  }

  public retryLoadFailed(): void {
    const backendZone = this.resolveBackendDistrict(this.failedSelectedZone());
    this.dispatchService.loadFailedParcels(backendZone).subscribe({
      error: () => {},
    });
  }

  public onQueueZoneChange(zone: string): void {
    this.selectedZone.set(zone);
    this.retryLoadQueue();
  }

  public onWorkloadZoneChange(zone: string): void {
    this.workloadZone.set(zone);
    this.retryLoadWorkload();
  }

  public onFailedZoneChange(zone: string): void {
    this.failedSelectedZone.set(zone);
    this.retryLoadFailed();
  }

  public onAvailableOnlyChange(availableOnly: boolean): void {
    this.availableOnly.set(availableOnly);
    this.retryLoadWorkload();
  }

  public filteredParcels = computed(() => {
    let list = this.dispatchService.unassignedParcels();
    const zone = this.selectedZone();
    if (zone) {
      list = list.filter((p) => this.matchesParcelZone(p, zone));
    }
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.trackingNumber.toLowerCase().includes(q) ||
          (p.pickupAddress && p.pickupAddress.toLowerCase().includes(q)) ||
          (p.dropoffAddress && p.dropoffAddress.toLowerCase().includes(q)) ||
          (p.recipientName && p.recipientName.toLowerCase().includes(q))
      );
    }
    return list;
  });

  public filteredCouriers = computed(() => {
    let list = this.dispatchService.couriers();
    const zone = this.workloadZone();
    if (zone) {
      list = list.filter((c) => this.matchesZone(c.zone, zone));
    }
    if (this.availableOnly()) {
      list = list.filter((c) => c.available);
    }
    return list;
  });

  public filteredFailedParcels = computed(() => {
    let list = this.dispatchService.failedParcels();
    const zone = this.failedSelectedZone();
    if (zone) {
      list = list.filter((p) => this.matchesParcelZone(p, zone));
    }
    const q = this.failedSearchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.trackingNumber.toLowerCase().includes(q) ||
          (p.failureReason && p.failureReason.toLowerCase().includes(q)) ||
          (p.pickupAddress && p.pickupAddress.toLowerCase().includes(q)) ||
          (p.dropoffAddress && p.dropoffAddress.toLowerCase().includes(q)) ||
          (p.recipientName && p.recipientName.toLowerCase().includes(q))
      );
    }
    return list;
  });

  // -------------------------------------------------------------------------
  // Bulk Assignment Logic
  // -------------------------------------------------------------------------
  public isParcelSelected(parcelId: string): boolean {
    return this.selectedParcelIds().has(parcelId);
  }

  public toggleSelectParcel(parcelId: string): void {
    const updated = new Set(this.selectedParcelIds());
    if (updated.has(parcelId)) {
      updated.delete(parcelId);
    } else {
      updated.add(parcelId);
    }
    this.selectedParcelIds.set(updated);
  }

  public isAllSelected = computed(() => {
    const current = this.filteredParcels();
    if (current.length === 0) return false;
    const selected = this.selectedParcelIds();
    return current.every((p) => selected.has(p.parcelId));
  });

  public toggleSelectAll(): void {
    if (this.isAllSelected()) {
      this.clearSelection();
    } else {
      const allIds = new Set(this.filteredParcels().map((p) => p.parcelId));
      this.selectedParcelIds.set(allIds);
    }
  }

  public clearSelection(): void {
    this.selectedParcelIds.set(new Set());
    this.bulkCourierId.set('');
  }

  public submitBulkAssign(): void {
    const courierId = this.bulkCourierId();
    const parcelIds = Array.from(this.selectedParcelIds());
    if (!courierId || parcelIds.length === 0 || this.isSubmittingBulk()) {
      return;
    }

    this.isSubmittingBulk.set(true);

    const assignments: AssignParcelRequest[] = parcelIds.map((id) => ({
      parcelId: id,
      courierId,
    }));

    this.dispatchService.bulkAssignParcels(assignments).subscribe({
      next: (response) => {
        this.isSubmittingBulk.set(false);
        this.bulkResult.set(response);
        this.clearSelection();
        this.showToast(
          `Bulk assignment completed: ${response.successfulCount} succeeded, ${response.failedCount} failed.`,
          response.failedCount === 0 ? 'success' : 'error'
        );
      },
      error: (err: any) => {
        this.isSubmittingBulk.set(false);
        const msg = err?.error?.message || err?.message || 'Bulk assignment failed.';
        this.showToast(msg, 'error');
      },
    });
  }

  // -------------------------------------------------------------------------
  // Re-queue Parcel Logic
  // -------------------------------------------------------------------------
  public openRequeueModal(parcel: DispatchParcelSummary): void {
    this.selectedParcelForRequeue.set(parcel);
    this.requeueReason.set('');
    this.isSubmittingRequeue.set(false);
  }

  public confirmRequeue(): void {
    const parcel = this.selectedParcelForRequeue();
    if (!parcel || this.isSubmittingRequeue()) {
      return;
    }

    this.isSubmittingRequeue.set(true);

    this.dispatchService.requeueParcel(parcel.parcelId, this.requeueReason()).subscribe({
      next: (res) => {
        this.isSubmittingRequeue.set(false);
        this.selectedParcelForRequeue.set(null);
        this.showToast(
          `Parcel ${parcel.trackingNumber} successfully re-queued to CREATED (Attempt #${res.attemptCount})!`,
          'success'
        );
      },
      error: (err: any) => {
        this.isSubmittingRequeue.set(false);
        const errorMsg =
          err?.error?.message ||
          err?.message ||
          'Failed to re-queue parcel. Please try again.';
        this.showToast(errorMsg, 'error');

        if (err?.status === 400 || err?.status === 409) {
          this.retryLoadFailed();
          this.retryLoadQueue();
        }
      },
    });
  }

  // -------------------------------------------------------------------------
  // Single Assignment Logic
  // -------------------------------------------------------------------------
  public openAssignModal(parcel: DispatchParcelSummary): void {
    this.selectedParcelForAssign.set(parcel);
    const firstAvailable = this.dispatchService.availableCouriers()[0];
    this.selectedCourierId.set(firstAvailable ? firstAvailable.courierId : '');
    this.isSubmittingAssignment.set(false);
  }

  public confirmAssignment(): void {
    const parcel = this.selectedParcelForAssign();
    const courierId = this.selectedCourierId();
    if (!parcel || !courierId || this.isSubmittingAssignment()) {
      return;
    }

    this.isSubmittingAssignment.set(true);

    this.dispatchService.assignParcel(parcel.parcelId, courierId).subscribe({
      next: () => {
        this.showToast(
          `Assignment accepted for parcel ${parcel.trackingNumber}; updating workload via event stream...`,
          'success'
        );
        this.selectedParcelForAssign.set(null);
        this.selectedCourierId.set('');
        this.isSubmittingAssignment.set(false);
      },
      error: (err: any) => {
        this.isSubmittingAssignment.set(false);
        const errorMsg =
          err?.error?.message ||
          err?.message ||
          'Failed to assign parcel. Please try again.';
        this.showToast(errorMsg, 'error');

        if (err?.status === 409) {
          this.retryLoadQueue();
          this.retryLoadWorkload();
        }
      },
    });
  }

  public toggleCourierAvailability(courier: CourierWorkloadItem): void {
    const nextStatus = !courier.available;
    this.dispatchService.updateCourierAvailability(courier.courierId, nextStatus).subscribe({
      next: () => {
        this.showToast(
          `${courier.name} is now ${nextStatus ? 'Online' : 'Offline'}.`,
          'success'
        );
      },
      error: (err: any) => {
        const msg = err?.error?.message || err?.message || 'Failed to update courier availability.';
        this.showToast(msg, 'error');
      },
    });
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toastMessage.set(message);
    this.toastType.set(type);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 4500);
  }
}
