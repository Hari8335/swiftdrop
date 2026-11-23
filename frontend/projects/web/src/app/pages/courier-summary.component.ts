import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { AvatarComponent } from 'ui';
import { Router } from '@angular/router';
import { AuthService } from 'shared-auth';
import { NotificationBellComponent } from '../notification/notification-bell/notification-bell.component';
import { CourierDailySummary } from './courier/courier.model';
import { CourierService } from './courier/courier.service';

@Component({
  selector: 'app-courier-summary',
  standalone: true,
  imports: [CommonModule, NotificationBellComponent, AvatarComponent],
  template: `
    <!-- Full-Screen Courier Layout (Matching Courier Run Sheet & Customer Portal) -->
    <!-- Full-Screen Courier Layout (Matching Admin/Customer Design) -->
    <div class="w-full min-h-screen bg-white">
      <!-- Mobile Top Navigation Header (Visible only on < md screens) -->
      <header class="md:hidden flex items-center justify-between px-4 py-3 border-b border-[#ece9e4] bg-white sticky top-0 z-30">
        <a
          href="/courier"
          (click)="$event.preventDefault(); navigateTo('/courier')"
          class="flex items-center gap-2.5"
        >
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-[#a53a26] text-white">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </div>
          <span class="text-sm font-extrabold text-[#211f32]">SwiftDrop Courier</span>
        </a>
        <div class="flex items-center gap-1">
          <a
            href="/courier"
            (click)="$event.preventDefault(); navigateTo('/courier')"
            class="p-2 rounded-lg text-[#6f6d85]"
            title="Run Sheet"
          >
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <rect x="3" y="3" width="7" height="7" rx="1.5"/>
              <rect x="14" y="3" width="7" height="7" rx="1.5"/>
              <rect x="14" y="14" width="7" height="7" rx="1.5"/>
              <rect x="3" y="14" width="7" height="7" rx="1.5"/>
            </svg>
          </a>
          <a
            href="/courier/summary"
            (click)="$event.preventDefault(); navigateTo('/courier/summary')"
            class="p-2 rounded-lg text-[#a53a26]"
            title="Daily Summary"
          >
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </a>
          <a
            href="/courier?tab=tracking"
            (click)="$event.preventDefault(); navigateTo('/courier?tab=tracking')"
            class="p-2 rounded-lg text-[#6f6d85]"
            title="Live Tracking"
          >
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="m7.5 4.27 9 5.15"/>
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
              <path d="m3.3 7 8.7 5 8.7-5"/>
              <path d="M12 22V12"/>
            </svg>
          </a>
          <button
            type="button"
            (click)="navigateTo('/courier?tab=settings')"
            class="p-2 rounded-lg text-[#6f6d85]"
            title="Settings"
          >
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
          <button
            type="button"
            (click)="openLogoutModal()"
            class="p-2 rounded-lg text-[#6f6d85]"
            title="Sign Out"
          >
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </header>

      <!-- Fixed Expandable Left Sidebar (Matching Admin Sidebar Design) -->
      <aside
        class="fixed inset-y-0 left-0 z-40 hidden h-screen w-20 flex-col justify-between overflow-y-auto overflow-x-hidden border-r border-[#ece9e4] bg-white py-5 px-3 transition-all duration-300 ease-in-out hover:w-[272px] hover:shadow-[0_15px_35px_rgba(0,0,0,0.08)] group md:flex"
        aria-label="Courier sidebar"
      >
        <!-- Top Brand Header -->
        <div>
          <div class="flex items-center px-1">
            <a
              href="/courier"
              (click)="$event.preventDefault(); navigateTo('/courier')"
              aria-label="SwiftDrop courier home"
              class="flex items-center gap-3 cursor-pointer"
            >
              <div class="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#a53a26] text-white shadow-[0_8px_18px_rgba(165,58,38,0.25)]">
                <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </div>
              <span class="whitespace-nowrap text-base font-extrabold tracking-tight text-[#211f32] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                SwiftDrop Courier
              </span>
            </a>
          </div>

          <!-- Main Navigation -->
          <nav class="mt-8 flex flex-col gap-1.5" aria-label="Courier primary navigation">
            <!-- 1. Grid / Deliveries Run Sheet -->
            <a
              href="/courier"
              (click)="$event.preventDefault(); navigateTo('/courier')"
              aria-label="Courier run sheet"
              class="relative flex h-11 w-full items-center rounded-2xl px-3 text-[#6f6d85] hover:bg-[#fbf7f5] hover:text-[#a53a26] transition-all duration-200 cursor-pointer no-underline"
            >
              <div class="grid h-5 w-5 shrink-0 place-items-center">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="7" rx="1.5"/>
                  <rect x="14" y="3" width="7" height="7" rx="1.5"/>
                  <rect x="14" y="14" width="7" height="7" rx="1.5"/>
                  <rect x="3" y="14" width="7" height="7" rx="1.5"/>
                </svg>
              </div>
              <span class="ml-3.5 whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                Run Sheet
              </span>
            </a>

            <!-- 2. Daily Summary (Active) -->
            <a
              href="/courier/summary"
              (click)="$event.preventDefault(); navigateTo('/courier/summary')"
              aria-label="Daily summary"
              class="relative flex h-11 w-full items-center rounded-2xl px-3 bg-[#faf0ec] text-[#a53a26] font-bold shadow-xs ring-1 ring-[#f2ded8] transition-all duration-200 cursor-pointer no-underline"
            >
              <div class="grid h-5 w-5 shrink-0 place-items-center">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <span class="ml-3.5 whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                Daily Summary
              </span>
            </a>

            <!-- 3. Live Tracking -->
            <a
              href="/courier?tab=tracking"
              (click)="$event.preventDefault(); navigateTo('/courier?tab=tracking')"
              aria-label="Live tracking"
              class="relative flex h-11 w-full items-center rounded-2xl px-3 text-[#6f6d85] hover:bg-[#fbf7f5] hover:text-[#a53a26] transition-all duration-200 cursor-pointer no-underline"
            >
              <div class="grid h-5 w-5 shrink-0 place-items-center">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="m7.5 4.27 9 5.15"/>
                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                  <path d="m3.3 7 8.7 5 8.7-5"/>
                  <path d="M12 22V12"/>
                </svg>
              </div>
              <span class="ml-3.5 whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                Live Tracking
              </span>
            </a>
          </nav>
        </div>

        <!-- Bottom Utilities: Settings & Sign out -->
        <div class="border-t border-[#f0ece8] pt-3 space-y-1">
          <!-- Settings Button -->
          <button
            type="button"
            id="courier-sidebar-settings-btn"
            (click)="navigateTo('/courier?tab=settings')"
            aria-label="Settings"
            class="relative flex h-11 w-full items-center rounded-2xl px-3 text-[#6f6d85] hover:bg-[#fbf7f5] hover:text-[#a53a26] transition-all duration-200 cursor-pointer"
          >
            <div class="grid h-5 w-5 shrink-0 place-items-center">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </div>
            <span class="ml-3.5 whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              Settings
            </span>
          </button>

          <!-- Sign Out Button -->
          <button
            type="button"
            id="courier-signout-btn"
            (click)="openLogoutModal()"
            aria-label="Log out"
            class="relative flex h-11 w-full items-center rounded-2xl px-3 text-[#6f6d85] hover:bg-[#faf0ec] hover:text-[#a53a26] transition-all duration-200 cursor-pointer"
          >
            <div class="grid h-5 w-5 shrink-0 place-items-center">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>
            <span class="ml-3.5 whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              Sign out
            </span>
          </button>
        </div>
      </aside>

      <!-- Main Content Area (Edge-to-Edge Full Screen with md:ml-20 to clear fixed sidebar) -->
      <main class="flex-1 md:ml-20 min-h-screen p-6 sm:p-8 lg:p-10 space-y-7 min-w-0 bg-white">
        <!-- Top Header: Search Bar & User Profile (Vertically Aligned Matching Customer Portal) -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#f4efe9]">
          <!-- Quick search / back link -->
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
              placeholder="Search or press Enter to return to Run Sheet..."
              (keydown.enter)="navigateTo('/courier')"
              class="w-full pl-11 pr-8 py-2.5 rounded-full bg-[#faf8f6] border border-[#e8e2dc] text-xs font-semibold text-[#1d1b2c] placeholder-[#a09eaf] focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] transition-all"
            />
          </div>

          <!-- Notification Bell & Static User Profile (No Dropdown, Vertically Centered) -->
          <div class="flex items-center gap-3 self-end sm:self-auto">
            <app-notification-bell *ngIf="authService?.hasRole('CUSTOMER')" placement="below"></app-notification-bell>

            <div
              id="profile-badge"
              class="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#faf8f6] border border-[#e8e2dc] select-none"
            >
              <ui-avatar class="w-8 h-8 rounded-full bg-[#a53a26] text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm" [src]="courierAvatarUrl()" [initials]="courierInitials()" />
              <span class="text-xs font-bold text-[#1d1b2c]">{{ courierDisplayName() }}</span>
            </div>
          </div>
        </div>

        <!-- LOGOUT CONFIRMATION MODAL -->
        <div
          *ngIf="showLogoutModal()"
          id="logout-confirmation-modal"
          class="fixed inset-0 !mt-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in"
        >
          <div class="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl space-y-4">
            <div class="w-12 h-12 rounded-2xl bg-[#faf2f0] flex items-center justify-center text-[#a53a26]">
              <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-black text-[#1d1b2c] tracking-tight">Log out of SwiftDrop?</h3>
              <p class="text-xs text-[#6f6d85] font-medium mt-1 leading-relaxed">
                You'll need to sign in again to access your assigned deliveries.
              </p>
            </div>
            <div class="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                id="logout-cancel-btn"
                (click)="closeLogoutModal()"
                class="px-5 py-2.5 rounded-full bg-[#f4efe9] hover:bg-[#eae3dc] text-xs font-bold text-[#1d1b2c] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="logout-confirm-btn"
                (click)="confirmSignOut()"
                class="px-5 py-2.5 rounded-full bg-[#a53a26] hover:bg-[#8c2e1d] text-xs font-bold text-white transition-all shadow-xs cursor-pointer"
              >
                Log out
              </button>
            </div>
          </div>
        </div>

        <!-- Page Content Section -->
        <div class="space-y-6">
          <div
            class="bg-white rounded-3xl p-6 sm:p-7 border border-[#e8e2dc] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl bg-[#a53a26] text-white flex items-center justify-center shadow-md shadow-[#a53a26]/20 flex-shrink-0">
                <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <div>
                <span class="portal-pill">Daily Summary</span>
                <h1 class="portal-title text-2xl font-black text-[#1d1b2c] tracking-tight mt-0.5">
                  Daily Delivery Summary
                </h1>
                <p class="text-xs font-semibold text-[#6f6d85] mt-0.5">{{ summary()?.date || 'Sri Lanka business date' }}</p>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <label class="flex items-center gap-2 text-xs font-bold text-[#6f6d85]">
                View date
                <input
                  type="date"
                  [value]="selectedDate()"
                  (change)="selectDate($any($event.target).value)"
                  class="rounded-full border border-[#e8e2dc] bg-[#faf8f6] px-4 py-2 text-xs font-bold text-[#1d1b2c] focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] transition-all"
                />
              </label>
              <a
                href="/courier"
                (click)="$event.preventDefault(); navigateTo('/courier')"
                class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#e8e2dc] hover:border-[#a53a26] text-xs font-bold text-[#6f6d85] hover:text-[#a53a26] transition-colors cursor-pointer"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                Back to Run Sheet
              </a>
            </div>
          </div>

          <p
            *ngIf="loading()"
            class="rounded-3xl border border-[#e8e2dc] bg-white p-8 text-[#6f6d85] font-semibold text-center shadow-sm"
          >
            Loading daily summary...
          </p>

          <div *ngIf="error()" class="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800 shadow-sm">
            <p class="font-bold">{{ error() }}</p>
            <button
              type="button"
              class="mt-3 rounded-full bg-rose-700 hover:bg-rose-800 px-5 py-2 text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
              (click)="load()"
            >
              Retry
            </button>
          </div>

          <div
            *ngIf="!loading() && !error() && !summary()"
            class="rounded-3xl border border-dashed border-[#e8e2dc] bg-white p-10 text-center text-[#6f6d85] font-medium shadow-sm"
          >
            Summary unavailable.
          </div>

          <ng-container *ngIf="summary() as daily">
            <!-- Stat Cards Grid -->
            <div class="grid gap-4 sm:grid-cols-3">
              <div class="rounded-3xl border border-[#e8e2dc] bg-white p-6 shadow-sm">
                <p class="text-[10px] font-bold uppercase tracking-wider text-[#a09eaf]">Total deliveries</p>
                <p class="mt-2 text-3xl font-black text-[#1d1b2c]">{{ daily.totalDeliveries }}</p>
              </div>
              <div class="rounded-3xl border border-[#fef3c7] bg-[#fffbeb] p-6 shadow-sm">
                <p class="text-[10px] font-bold uppercase tracking-wider text-amber-700">Pending</p>
                <p class="mt-2 text-3xl font-black text-amber-800">{{ daily.pendingCount }}</p>
              </div>
              <div class="rounded-3xl border border-[#d1fae5] bg-[#ecfdf5] p-6 shadow-sm">
                <p class="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Completed</p>
                <p class="mt-2 text-3xl font-black text-emerald-800">{{ daily.completedCount }}</p>
              </div>
            </div>

            <div
              *ngIf="daily.deliveries.length === 0"
              class="rounded-3xl border border-dashed border-[#e8e2dc] bg-white p-10 text-center text-[#6f6d85] font-medium shadow-sm"
            >
              No deliveries for this business date.
            </div>

            <div
              *ngIf="daily.deliveries.length > 0"
              class="overflow-hidden rounded-3xl border border-[#eee7e0] bg-white shadow-sm"
            >
              <div class="border-b border-[#f4efe9] px-6 py-4 bg-[#faf8f6]/60">
                <h2 class="font-black text-sm text-[#1d1b2c] uppercase tracking-wider">Delivery cards</h2>
              </div>
              <div
                *ngFor="let delivery of daily.deliveries"
                class="grid gap-3 border-b border-[#f4efe9] px-6 py-4.5 last:border-0 sm:grid-cols-5 sm:items-center hover:bg-[#faf8f6]/40 transition-colors"
              >
                <div>
                  <p class="font-mono text-xs font-black text-[#1d1b2c]">{{ delivery.trackingNumber }}</p>
                  <p class="text-xs text-[#6f6d85] font-medium mt-0.5">{{ delivery.recipientName }}</p>
                </div>
                <p class="text-xs font-semibold text-[#1d1b2c] sm:col-span-2">{{ delivery.dropoffAddress }}</p>
                <span
                  class="w-fit rounded-full px-3 py-0.5 text-xs font-extrabold uppercase tracking-wider"
                  [class.bg-[#ecfdf5]]="delivery.status === 'DELIVERED'"
                  [class.text-emerald-800]="delivery.status === 'DELIVERED'"
                  [class.bg-amber-50]="delivery.status !== 'DELIVERED'"
                  [class.text-amber-800]="delivery.status !== 'DELIVERED'"
                >
                  ● {{ delivery.status }}
                </span>
                <p class="text-xs font-bold text-[#a09eaf]">
                  Attempt {{ delivery.attemptCount }} · #{{ delivery.sequenceOrder }}
                </p>
              </div>
            </div>
          </ng-container>
        </div>
      </main>
    </div>
  `,
  styles: [
    `
      :host {
        --terracotta: #a53a26;
        --terracotta-dark: #7e2615;
        --ink: #1d1b2c;
        --ink-3: #6f6d85;
        --sand: #faf6f0;
        --disp: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        display: block;
        font-family: var(--disp);
      }
      .portal-title {
        font-family: var(--disp);
      }
      .portal-pill {
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
    `,
  ],
})
export class CourierSummaryComponent {
  private readonly service = inject(CourierService);
  private readonly router = inject(Router, { optional: true });
  readonly authService = inject(AuthService, { optional: true });

  readonly summary = signal<CourierDailySummary | null>(null);
  readonly selectedDate = signal('');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly profileMenuOpen = signal<boolean>(false);
  readonly showLogoutModal = signal<boolean>(false);

  readonly courierDisplayName = computed(() => {
    return this.authService?.currentUser()?.fullName || 'Courier';
  });

  readonly courierEmail = computed(() => {
    return this.authService?.currentUser()?.email || 'courier@swiftdrop.lk';
  });

  /** Courier's profile picture from the auth profile; initials are shown when unset. */
  readonly courierAvatarUrl = computed(() => this.authService?.currentUser?.()?.avatarUrl ?? null);

  readonly courierInitials = computed(() => {
    const name = this.courierDisplayName();
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.getDailySummary(this.selectedDate() || undefined).subscribe({
      next: (summary) => this.summary.set(summary),
      error: (error) => {
        this.summary.set(null);
        this.error.set(error?.error?.message || 'Unable to load the daily summary.');
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  selectDate(date: string): void {
    this.selectedDate.set(date);
    this.load();
  }

  openLogoutModal(): void {
    this.showLogoutModal.set(true);
  }

  closeLogoutModal(): void {
    this.showLogoutModal.set(false);
  }

  confirmSignOut(): void {
    this.showLogoutModal.set(false);
    this.signOut();
  }

  navigateTo(path: string): void {
    if (this.router) {
      if (path.includes('?')) {
        const [url, queryString] = path.split('?');
        const params: Record<string, string> = {};
        const searchParams = new URLSearchParams(queryString);
        searchParams.forEach((val, key) => {
          params[key] = val;
        });
        this.router.navigate([url], { queryParams: params });
      } else {
        this.router.navigate([path]);
      }
    } else if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  }

  signOut(): void {
    if (this.authService) {
      this.authService.logout().subscribe({
        next: () => this.navigateTo('/login'),
        error: () => this.navigateTo('/login'),
      });
    } else {
      this.navigateTo('/login');
    }
  }
}
