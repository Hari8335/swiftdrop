import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'shared-auth';
import { CustomerChangePasswordComponent } from './customer/customer-change-password.component';
import { CourierSettingsSection } from './courier-profile.component';
import { NotificationBellComponent } from '../notification/notification-bell/notification-bell.component';
import {
  CourierDelivery,
  CourierStats,
  DeliveryStatus,
  FailureReasonCode,
} from './courier/courier.model';
import { CourierService } from './courier/courier.service';
import { CourierLocationService } from './courier/courier-location.service';
import { TrackingMapComponent } from './tracking/tracking-map.component';
import { CourierLocation } from './tracking/tracking.model';
import { TrackingApiService } from './tracking/tracking-api.service';
import { NavigationRoute, RoutingService } from './tracking/routing.service';
import { EMPTY, Subject, catchError, switchMap, takeUntil, timer } from 'rxjs';

type FilterTab = 'ALL' | 'ACTIVE' | 'DELIVERED' | 'FAILED';

@Component({
  selector: 'app-courier',
  standalone: true,
  imports: [CommonModule, FormsModule, NotificationBellComponent, CustomerChangePasswordComponent, TrackingMapComponent],
  template: `
    <!-- Full-Screen Courier Dashboard Layout (Matching Admin/Customer Design) -->
    <div class="w-full min-h-screen bg-white">
      <!-- Mobile Top Navigation Header (Visible only on < md screens) -->
      <header class="md:hidden flex items-center justify-between px-4 py-3 border-b border-[#ece9e4] bg-white sticky top-0 z-30">
        <a
          href="/courier"
          (click)="$event.preventDefault(); activeTab.set('runsheet'); navigateTo('/courier')"
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
          <button
            type="button"
            (click)="activeTab.set('runsheet'); navigateTo('/courier')"
            [class.text-[#a53a26]]="activeTab() === 'runsheet'"
            class="p-2 rounded-lg text-[#6f6d85]"
            title="Run Sheet"
          >
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <rect x="3" y="3" width="7" height="7" rx="1.5"/>
              <rect x="14" y="3" width="7" height="7" rx="1.5"/>
              <rect x="14" y="14" width="7" height="7" rx="1.5"/>
              <rect x="3" y="14" width="7" height="7" rx="1.5"/>
            </svg>
          </button>
          <a
            href="/courier/summary"
            (click)="$event.preventDefault(); navigateTo('/courier/summary')"
            class="p-2 rounded-lg text-[#6f6d85]"
            title="Daily Summary"
          >
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </a>
          <button
            type="button"
            (click)="activeTab.set('tracking')"
            [class.text-[#a53a26]]="activeTab() === 'tracking'"
            class="p-2 rounded-lg text-[#6f6d85]"
            title="Live Tracking"
          >
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="m7.5 4.27 9 5.15"/>
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
              <path d="m3.3 7 8.7 5 8.7-5"/>
              <path d="M12 22V12"/>
            </svg>
          </button>
          <button
            type="button"
            (click)="activeTab.set('settings')"
            [class.text-[#a53a26]]="activeTab() === 'settings'"
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
        class="fixed inset-y-0 left-0 z-40 hidden h-screen w-20 flex-col justify-between overflow-y-auto overflow-x-hidden border-r border-[#ece9e4] bg-white py-5 px-3 transition-all duration-300 ease-in-out hover:w-[272px] hover:shadow-[0_15px_35px_rgba(0,0,0,0.08)] group lg:flex"
        aria-label="Courier sidebar"
      >
        <!-- Top Brand Header -->
        <div>
          <div class="flex items-center px-1">
            <a
              href="/courier"
              (click)="$event.preventDefault(); activeTab.set('runsheet'); navigateTo('/courier')"
              aria-label="SwiftDrop courier home"
              class="flex items-center gap-3 cursor-pointer"
            >
              <div class="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#9b432f] text-white shadow-[0_8px_18px_rgba(155,67,47,0.25)]">
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
            <button
              type="button"
              id="tab-runsheet-btn"
              (click)="activeTab.set('runsheet'); navigateTo('/courier')"
              aria-label="Courier run sheet"
              [ngClass]="activeTab() === 'runsheet' ? 'bg-[#faf0ec] text-[#9b432f] font-bold shadow-xs ring-1 ring-[#f2ded8]' : 'text-[#6f6d85] hover:bg-[#fbf7f5] hover:text-[#9b432f]'"
              class="relative flex h-11 w-full items-center rounded-2xl px-3 transition-all duration-200 cursor-pointer"
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
            </button>

            <!-- 2. Daily Summary -->
            <a
              href="/courier/summary"
              (click)="$event.preventDefault(); navigateTo('/courier/summary')"
              aria-label="Daily summary"
              class="relative flex h-11 w-full items-center rounded-2xl px-3 text-[#6f6d85] hover:bg-[#fbf7f5] hover:text-[#a53a26] transition-all duration-200 cursor-pointer no-underline"
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
            <button
              type="button"
              id="tab-tracking-btn"
              (click)="activeTab.set('tracking')"
              aria-label="Live tracking"
              [ngClass]="activeTab() === 'tracking' ? 'bg-[#faf0ec] text-[#9b432f] font-bold shadow-xs ring-1 ring-[#f2ded8]' : 'text-[#6f6d85] hover:bg-[#fbf7f5] hover:text-[#9b432f]'"
              class="relative flex h-11 w-full items-center rounded-2xl px-3 transition-all duration-200 cursor-pointer"
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
            </button>
          </nav>
        </div>

        <!-- Bottom Utilities: Settings & Sign out -->
        <div class="border-t border-[#f0ece8] pt-3 space-y-1">
          <!-- Settings Button -->
          <button
            type="button"
            id="courier-sidebar-settings-btn"
            (click)="activeTab.set('settings')"
            aria-label="Settings"
            [ngClass]="activeTab() === 'settings' ? 'bg-[#faf0ec] text-[#9b432f] font-bold shadow-xs ring-1 ring-[#f2ded8]' : 'text-[#6f6d85] hover:bg-[#fbf7f5] hover:text-[#9b432f]'"
            class="relative flex h-11 w-full items-center rounded-2xl px-3 transition-all duration-200 cursor-pointer"
          >
            <div class="grid h-5 w-5 shrink-0 place-items-center">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
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
            class="relative flex h-11 w-full items-center rounded-2xl px-3 text-[#6f6d85] hover:bg-[#faf0ec] hover:text-[#9b432f] transition-all duration-200 cursor-pointer"
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
      <main class="flex-1 lg:ml-20 min-h-screen p-6 sm:p-8 lg:p-10 space-y-7 min-w-0 bg-white">
        <!-- Top Header: Search Bar & User Profile (Vertically Aligned Matching Customer Portal) -->
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
              id="search-input"
              [ngModel]="searchQuery()"
              (ngModelChange)="searchQuery.set($event)"
              placeholder="Search for tracking numbers, recipients, addresses ..."
              class="w-full pl-11 pr-8 py-2.5 rounded-full bg-[#faf8f6] border border-[#e8e2dc] text-xs font-semibold text-[#1d1b2c] placeholder-[#a09eaf] focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] transition-all"
            />
            <button
              *ngIf="searchQuery()"
              type="button"
              (click)="searchQuery.set('')"
              class="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#a09eaf] hover:text-[#1d1b2c] text-xs font-bold"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Notification Bell & Static User Profile (No Dropdown, Vertically Centered) -->
          <div class="flex items-center gap-3 self-end sm:self-auto">
            <app-notification-bell *ngIf="authService?.hasRole('CUSTOMER')" placement="below"></app-notification-bell>

            <div
              id="profile-badge"
              class="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#faf8f6] border border-[#e8e2dc] select-none"
            >
              <span
                class="w-8 h-8 rounded-full bg-[#a53a26] text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm"
              >
                {{ courierInitials() }}
              </span>
              <span class="text-xs font-bold text-[#1d1b2c]">{{ courierDisplayName() }}</span>
            </div>
          </div>
        </div>

        <!-- Floating Toast Notification (Prominent Popup) -->
        <div
          *ngIf="toastMessage()"
          id="toast-notification"
          class="fixed top-6 right-6 z-50 max-w-md bg-white border border-[#e8e2dc] shadow-xl rounded-2xl p-4 flex items-center justify-between gap-3 animate-fade-in"
        >
          <div class="flex items-center gap-3 font-semibold text-xs text-[#1d1b2c]">
            <div class="w-7 h-7 rounded-full bg-[#a53a26]/10 text-[#a53a26] flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <span>{{ toastMessage() }}</span>
          </div>
          <button
            type="button"
            (click)="toastMessage.set('')"
            class="text-[#6f6d85] hover:text-[#1d1b2c] font-bold p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Dismiss notification"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- LOGOUT CONFIRMATION MODAL (Matching Design Reference) -->
        <div
          *ngIf="showLogoutModal()"
          id="logout-confirmation-modal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in"
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

        <!-- STAGE ACTION CONFIRMATION MODAL (Matching Design Reference) -->
        <div
          *ngIf="pendingStageAction()"
          id="stage-confirmation-modal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in"
          (click)="cancelStageConfirmation()"
        >
          <div
            class="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl space-y-4"
            (click)="$event.stopPropagation()"
          >
            <!-- Stage Icon Box -->
            <div
              class="w-12 h-12 rounded-2xl flex items-center justify-center"
              [ngClass]="{
                'bg-[#faf2f0] text-[#a53a26]': pendingStageAction()?.nextStatus === 'PICKED_UP',
                'bg-[#f4f2fa] text-[#1d1b2c]': pendingStageAction()?.nextStatus === 'IN_TRANSIT',
                'bg-[#fffbeb] text-amber-700': pendingStageAction()?.nextStatus === 'OUT_FOR_DELIVERY'
              }"
            >
              <!-- PICKED_UP Icon -->
              <svg *ngIf="pendingStageAction()?.nextStatus === 'PICKED_UP'" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>

              <!-- IN_TRANSIT Icon -->
              <svg *ngIf="pendingStageAction()?.nextStatus === 'IN_TRANSIT'" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
                <path d="M15 18H9"/>
                <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
                <circle cx="17" cy="18" r="2"/>
                <circle cx="7" cy="18" r="2"/>
              </svg>

              <!-- OUT_FOR_DELIVERY Icon -->
              <svg *ngIf="pendingStageAction()?.nextStatus === 'OUT_FOR_DELIVERY'" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>

            <!-- Content Details -->
            <div>
              <h3 id="stage-confirm-title" class="text-lg font-black text-[#1d1b2c] tracking-tight">
                {{ getStageConfirmTitle(pendingStageAction()?.nextStatus) }}
              </h3>
              <p id="stage-confirm-desc" class="text-xs text-[#6f6d85] font-medium mt-1.5 leading-relaxed">
                {{ getStageConfirmDescription(pendingStageAction()) }}
              </p>
              <div class="mt-3 p-2.5 rounded-xl bg-[#faf8f6] border border-[#f0ebe5] flex items-center justify-between text-xs">
                <span class="text-[#a09eaf] font-semibold">Tracking Number:</span>
                <span class="font-bold text-[#1d1b2c] font-mono">{{ pendingStageAction()?.delivery?.trackingNumber }}</span>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                id="stage-cancel-btn"
                (click)="cancelStageConfirmation()"
                class="px-5 py-2.5 rounded-full bg-[#f4efe9] hover:bg-[#eae3dc] text-xs font-bold text-[#1d1b2c] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="stage-confirm-btn"
                (click)="confirmStageAction()"
                [ngClass]="{
                  'bg-[#a53a26] hover:bg-[#8c2e1d] shadow-[#a53a26]/20': pendingStageAction()?.nextStatus === 'PICKED_UP',
                  'bg-[#1d1b2c] hover:bg-[#2d2b3d] shadow-[#1d1b2c]/20': pendingStageAction()?.nextStatus === 'IN_TRANSIT',
                  'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20': pendingStageAction()?.nextStatus === 'OUT_FOR_DELIVERY'
                }"
                class="px-5 py-2.5 rounded-full text-xs font-bold text-white transition-all shadow-md cursor-pointer"
              >
                {{ getStageConfirmActionLabel(pendingStageAction()?.nextStatus) }}
              </button>
            </div>
          </div>
        </div>

        <!-- ================================================================= -->
        <!-- TAB 1: RUN SHEET DELIVERIES VIEW -->
        <!-- ================================================================= -->
        <div *ngIf="activeTab() === 'runsheet'" class="space-y-7">
          <!-- Greeting Banner (Without Blue Refresh Button) -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 class="text-2xl sm:text-3xl font-black text-[#1d1b2c] tracking-tight">
                Welcome back, {{ profileLoaded() ? (profile().name || courierDisplayName()) : (profileLoading() ? 'Loading courier profile...' : 'Courier') }}!
              </h1>
              <p class="text-xs font-semibold text-[#6f6d85] mt-1">
                <ng-container *ngIf="profileLoaded()">
                  (ID: {{ profile().userId }}) • {{ profile().zone || 'Assigned Zone' }} •
                </ng-container>
                {{ stats().outForDelivery + stats().created + stats().inTransit }} active deliveries in progress
              </p>
            </div>
            <div class="flex items-center gap-2 self-start sm:self-auto">
              <span
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Shift Active
              </span>
            </div>
          </div>

          <!-- Two Hero Cards Grid (Matching Customer Portal Design) -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <!-- Hero Card 1: Active In-Delivery Card with 3D Isometric Graphic -->
            <div
              class="hero-summary-card bg-white rounded-3xl p-6 sm:p-7 border border-[#eee7e0] shadow-sm flex flex-col justify-between relative overflow-hidden"
            >
              <div class="flex items-start justify-between relative z-10">
                <div>
                  <div class="flex items-baseline">
                    <span class="text-5xl font-black text-[#1d1b2c] tracking-tight">
                      {{ stats().outForDelivery + stats().created + stats().inTransit }}
                    </span>
                    <span class="text-sm font-bold text-[#6f6d85] ml-2">in delivery {{ selectedDate() ? 'on ' + selectedDate() : 'today' }}</span>
                  </div>
                  <p class="text-xs text-[#6f6d85] font-medium mt-3 max-w-xs leading-relaxed">
                    Active route in <strong class="text-[#1d1b2c]">{{ profile().zone || 'Colombo Central' }}</strong>.
                    {{ stats().delivered }} completed out of {{ stats().total }} total assigned stops.
                  </p>
                </div>

                <!-- 3D Isometric Parcels Graphic (Terracotta & White Cubes matching Customer) -->
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
                  (click)="navigateTo('/courier/summary')"
                  class="px-5 py-2.5 rounded-full bg-[#a53a26] hover:bg-[#7e2615] text-white font-bold text-xs transition-all shadow-sm hover:scale-[1.02] active:scale-95 cursor-pointer"
                >
                  View Daily Summary
                </button>
                <button
                  type="button"
                  (click)="activeTab.set('settings')"
                  class="px-5 py-2.5 rounded-full border border-[#a53a26] text-[#a53a26] hover:bg-[#faf6f0] font-bold text-xs transition-all cursor-pointer"
                >
                  Duty & Settings
                </button>
              </div>
            </div>

            <!-- Hero Card 2: Quick Dispatch Search (Terracotta #a53a26, Matching Customer Portal) -->
            <div
              class="hero-dispatch-card rounded-3xl p-6 sm:p-7 text-white shadow-md relative overflow-hidden flex flex-col justify-between"
              style="background: linear-gradient(135deg, #a53a26 0%, #8c2e1d 100%);"
            >
              <div>
                <span class="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/15 text-white/90">
                  Direct Dispatch Search
                </span>
                <h2 class="text-xl sm:text-2xl font-black mt-3 leading-snug tracking-tight">
                  Enter parcel tracking number to look up stops or update status
                </h2>
              </div>

              <div class="mt-6 flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  #quickSearchInput
                  placeholder="Enter parcel number (e.g. SD-8942-COL)"
                  class="flex-1 px-5 py-3 rounded-full bg-white text-[#1d1b2c] placeholder-[#6f6d85] font-semibold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-white shadow-inner"
                  (keydown.enter)="searchQuery.set(quickSearchInput.value); quickSearchInput.value = ''"
                />
                <button
                  type="button"
                  (click)="searchQuery.set(quickSearchInput.value); quickSearchInput.value = ''"
                  class="px-6 py-3 rounded-full bg-[#1d1b2c] hover:bg-[#2d2b3d] text-white font-bold text-xs sm:text-sm shadow-md transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>

          <!-- Section Heading + Date Picker Row -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <div>
              <h2 class="text-xl sm:text-2xl font-black text-[#1d1b2c] tracking-tight">
                Today's Run Sheet Deliveries
              </h2>
              <p class="text-xs text-[#6f6d85] font-medium mt-0.5">
                Review assigned packages, execute routes, and record delivery confirmation.
              </p>
            </div>

            <!-- Date Selector Filter -->
            <div class="flex items-center gap-2 self-start sm:self-auto">
              <label for="run-sheet-date-filter" class="text-xs font-bold text-[#6f6d85] whitespace-nowrap">View date</label>
              <input
                id="run-sheet-date-filter"
                type="date"
                [value]="selectedDate()"
                (change)="selectDate($any($event.target).value)"
                class="px-3 py-1.5 rounded-xl border border-[#e8e2dc] bg-[#faf8f6] text-xs font-semibold text-[#1d1b2c] focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] transition-all cursor-pointer"
              />
              <button
                *ngIf="selectedDate()"
                type="button"
                (click)="resetToToday()"
                title="Reset to today"
                class="px-2.5 py-1.5 rounded-xl border border-[#e8e2dc] bg-white text-xs font-bold text-[#a53a26] hover:bg-[#faf6f0] transition-colors cursor-pointer"
              >
                Today
              </button>
            </div>
          </div>

          <!-- Filter Pills Row (All, Active, Delivered, Failed) -->
          <div class="flex items-center gap-2 overflow-x-auto pb-1">
            <div class="inline-flex p-1 bg-[#f4efe9] rounded-full text-xs font-bold">
              <button
                type="button"
                id="filter-all-btn"
                (click)="activeFilter.set('ALL')"
                [class.bg-white]="activeFilter() === 'ALL'"
                [class.text-[#1d1b2c]]="activeFilter() === 'ALL'"
                [class.shadow-xs]="activeFilter() === 'ALL'"
                [class.text-[#6f6d85]]="activeFilter() !== 'ALL'"
                class="tab-pill px-4 py-2 rounded-full transition-all flex items-center gap-2"
              >
                <span>All</span>
                <span
                  [class.active-badge]="activeFilter() === 'ALL'"
                  class="count-badge text-[11px] px-2 py-0.5 rounded-full"
                >
                  {{ stats().total }}
                </span>
              </button>
              <button
                type="button"
                id="filter-active-btn"
                (click)="activeFilter.set('ACTIVE')"
                [class.bg-white]="activeFilter() === 'ACTIVE'"
                [class.text-[#1d1b2c]]="activeFilter() === 'ACTIVE'"
                [class.shadow-xs]="activeFilter() === 'ACTIVE'"
                [class.text-[#6f6d85]]="activeFilter() !== 'ACTIVE'"
                class="tab-pill px-4 py-2 rounded-full transition-all flex items-center gap-2"
              >
                <span>Active</span>
                <span
                  [class.active-badge]="activeFilter() === 'ACTIVE'"
                  class="count-badge text-[11px] px-2 py-0.5 rounded-full"
                >
                  {{ stats().outForDelivery + stats().created + stats().inTransit }}
                </span>
              </button>
              <button
                type="button"
                id="filter-delivered-btn"
                (click)="activeFilter.set('DELIVERED')"
                [class.bg-white]="activeFilter() === 'DELIVERED'"
                [class.text-[#1d1b2c]]="activeFilter() === 'DELIVERED'"
                [class.shadow-xs]="activeFilter() === 'DELIVERED'"
                [class.text-[#6f6d85]]="activeFilter() !== 'DELIVERED'"
                class="tab-pill px-4 py-2 rounded-full transition-all flex items-center gap-2"
              >
                <span>Delivered</span>
                <span
                  [class.active-badge]="activeFilter() === 'DELIVERED'"
                  class="count-badge text-[11px] px-2 py-0.5 rounded-full"
                >
                  {{ stats().delivered }}
                </span>
              </button>
              <button
                type="button"
                id="filter-failed-btn"
                (click)="activeFilter.set('FAILED')"
                [class.bg-white]="activeFilter() === 'FAILED'"
                [class.text-[#1d1b2c]]="activeFilter() === 'FAILED'"
                [class.shadow-xs]="activeFilter() === 'FAILED'"
                [class.text-[#6f6d85]]="activeFilter() !== 'FAILED'"
                class="tab-pill px-4 py-2 rounded-full transition-all flex items-center gap-2"
              >
                <span>Failed</span>
                <span
                  [class.active-badge]="activeFilter() === 'FAILED'"
                  class="count-badge text-[11px] px-2 py-0.5 rounded-full"
                >
                  {{ stats().failed }}
                </span>
              </button>
            </div>
          </div>

          <!-- Error State Alert -->
          <div
            *ngIf="errorMessage() || profileError()"
            id="courier-error-banner"
            class="rounded-2xl p-4 bg-rose-50 border border-rose-200 text-rose-900 text-sm flex items-center justify-between shadow-sm"
          >
            <div class="flex items-center gap-2.5">
              <svg class="w-5 h-5 text-rose-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span class="font-semibold">{{ errorMessage() || profileError() }}</span>
            </div>
            <button
              type="button"
              (click)="refreshDashboard()"
              class="px-4 py-1.5 bg-white border border-rose-200 rounded-full text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors shadow-2xs cursor-pointer"
            >
              Retry
            </button>
          </div>

          <!-- Loading State Indicator -->
          <div
            *ngIf="isLoading() && filteredDeliveries().length === 0"
            id="courier-loading-spinner"
            class="bg-white rounded-3xl border border-[#e8e2dc] p-12 text-center shadow-sm"
          >
            <div
              class="w-16 h-16 rounded-2xl bg-[#faf6f0] text-[#a53a26] flex items-center justify-center mx-auto mb-4 shadow-sm"
            >
              <svg class="w-8 h-8 text-[#a53a26]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
                <path d="M15 18H9"/>
                <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
                <circle cx="17" cy="18" r="2"/>
                <circle cx="7" cy="18" r="2"/>
              </svg>
            </div>
            <h3 class="text-base font-bold text-[#1d1b2c]">Loading deliveries...</h3>
            <p class="text-xs text-[#6f6d85] mt-1">Fetching your assigned parcels from operations service.</p>
          </div>

          <!-- Deliveries List (Cards) -->
          <div *ngIf="!isLoading() || filteredDeliveries().length > 0" class="space-y-4">
            <div
              *ngFor="let delivery of filteredDeliveries()"
              [id]="'delivery-card-' + delivery.parcelId"
              class="delivery-run-card bg-white rounded-3xl shadow-sm border border-[#eee7e0] hover:border-[#a53a26]/40 hover:shadow-md transition-all overflow-hidden"
            >
              <!-- Card Header -->
              <div
                class="px-5 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#f4efe9] bg-[#faf8f6]/60"
              >
                <div class="flex items-center gap-3">
                  <span
                    class="text-xs font-mono font-black px-3 py-1 bg-white border border-[#e8e2dc] rounded-full text-[#1d1b2c] shadow-2xs"
                  >
                    {{ delivery.trackingNumber }}
                  </span>
                  <span
                    [ngClass]="getStatusBadgeClass(delivery.status)"
                    class="px-3 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-current opacity-80"></span>
                    {{ getStatusLabel(delivery.status) }}
                  </span>
                  <span
                    *ngIf="delivery.overdue"
                    class="px-3 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-[#fdecec] text-[#b42318] border border-[#f5c2c0]"
                    title="Assigned more than 2 days ago and not yet delivered"
                    data-testid="overdue-badge"
                  >
                    Overdue
                  </span>
                </div>

                <div class="flex items-center gap-2 text-xs text-[#6f6d85]">
                  <span
                    *ngIf="delivery.attemptCount !== undefined"
                    class="font-bold bg-white border border-[#e8e2dc] px-2.5 py-0.5 rounded-full"
                  >
                    Attempt: {{ delivery.attemptCount }}
                  </span>
                  <span
                    *ngIf="delivery.weightKg"
                    class="font-bold bg-white border border-[#e8e2dc] px-2.5 py-0.5 rounded-full inline-flex items-center gap-1"
                  >
                    <svg class="w-3.5 h-3.5 text-[#6f6d85]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
                      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
                      <path d="M7 21h10"/>
                      <path d="M12 3v18"/>
                      <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
                    </svg>
                    {{ delivery.weightKg }} kg
                  </span>
                </div>
              </div>

              <!-- Card Body -->
              <div class="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-5">
                <!-- Recipient & Destination -->
                <div class="md:col-span-7 space-y-3">
                  <div class="flex items-baseline justify-between gap-2">
                    <h3 class="text-base font-black text-[#1d1b2c] flex items-center gap-2">
                      <span
                        class="w-6 h-6 rounded-full bg-[#faf6f0] text-[#a53a26] flex items-center justify-center text-xs"
                      >
                        <svg class="w-3.5 h-3.5 text-[#a53a26]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                      </span>
                      {{ delivery.recipientName }}
                    </h3>
                    <a
                      *ngIf="delivery.recipientPhone"
                      [href]="'tel:' + delivery.recipientPhone"
                      class="inline-flex items-center gap-1.5 text-xs font-bold text-[#a53a26] hover:text-[#7e2615] bg-[#faf6f0] hover:bg-[#faf0e6] border border-[#a53a26]/20 px-3 py-1 rounded-full transition-colors"
                    >
                      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                      Call ({{ delivery.recipientPhone }})
                    </a>
                  </div>

                  <!-- Address -->
                  <div class="text-xs sm:text-sm text-[#6f6d85] flex items-start gap-2">
                    <svg class="w-4 h-4 text-[#a53a26] mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <div>
                      <p class="font-semibold text-[#1d1b2c]">
                        {{ delivery.dropoffAddress || (delivery.recipientAddress?.line1) }}
                        <span *ngIf="delivery.recipientAddress?.city">, {{ delivery.recipientAddress?.city }}</span>
                      </p>
                      <a
                        *ngIf="delivery.googleMapsUrl"
                        [href]="delivery.googleMapsUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-xs font-bold text-[#a53a26] hover:underline inline-flex items-center gap-1.5 mt-1"
                      >
                        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
                          <line x1="9" y1="3" x2="9" y2="18"/>
                          <line x1="15" y1="6" x2="15" y2="21"/>
                        </svg>
                        Open in Google Maps
                      </a>
                    </div>
                  </div>

                  <!-- Special Instructions -->
                  <div
                    *ngIf="delivery.specialInstructions"
                    class="p-3 bg-[#fffbeb] border border-[#fef3c7] rounded-2xl text-xs text-amber-900 flex items-start gap-2"
                  >
                    <svg class="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10 9 9 9 8 9"/>
                    </svg>
                    <p><span class="font-bold">Instructions:</span> {{ delivery.specialInstructions }}</p>
                  </div>

                  <!-- Failure Reason if any -->
                  <div
                    *ngIf="(delivery.status === 'FAILED' || delivery.status === 'FAILED_DELIVERY') && delivery.failureReason"
                    class="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 flex items-start gap-2"
                  >
                    <svg class="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <p><span class="font-bold">Failure Reason:</span> {{ delivery.failureReason }}</p>
                  </div>

                  <!-- Proof Thumbnail if delivered -->
                  <div
                    *ngIf="delivery.status === 'DELIVERED' && delivery.proof"
                    class="p-3 bg-[#ecfdf5] border border-[#d1fae5] rounded-2xl text-xs text-emerald-900 flex items-center justify-between gap-3"
                  >
                    <div class="flex items-center gap-2.5">
                      <svg class="w-5 h-5 text-emerald-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                        <circle cx="12" cy="13" r="3"/>
                      </svg>
                      <div>
                        <p class="font-extrabold text-[#1d1b2c]">Proof of Delivery Captured</p>
                        <p class="text-[11px] text-emerald-700 font-semibold">
                          Received by {{ delivery.proof.recipientName }}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      (click)="viewProofDetail(delivery)"
                      class="px-3 py-1.5 bg-white rounded-full border border-emerald-300 font-bold text-emerald-800 hover:bg-emerald-50 text-[11px] transition-colors shadow-2xs cursor-pointer"
                    >
                      View Details
                    </button>
                  </div>
                </div>

                <!-- Sender / Origin Info & Action Buttons -->
                <div
                  class="md:col-span-5 flex flex-col justify-between border-t md:border-t-0 md:border-l border-[#f4efe9] md:pl-5 pt-4 md:pt-0 space-y-4"
                >
                  <div class="text-xs text-[#6f6d85]">
                    <p class="text-[10px] uppercase font-black text-[#a09eaf] tracking-wider">Pickup Origin</p>
                    <p class="font-bold text-[#1d1b2c] mt-0.5">{{ delivery.senderName || 'SwiftDrop Merchant' }}</p>
                    <p class="text-xs text-[#6f6d85]">{{ delivery.pickupAddress || (delivery.senderAddress?.line1) }}</p>
                  </div>

                  <!-- Action Buttons -->
                  <div class="pt-2 space-y-2.5">
                    <button
                      type="button"
                      [id]="'view-map-btn-' + delivery.parcelId"
                      (click)="openDeliveryMap(delivery)"
                      class="w-full py-2.5 px-4 rounded-full bg-white border border-[#a53a26] text-[#a53a26] hover:bg-[#fff5f1] font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span aria-hidden="true">🗺️</span>
                      <span>View Map / Navigate</span>
                    </button>
                    <div class="flex items-center justify-between gap-2 rounded-xl border border-[#f0ebe5] bg-white px-3 py-2 text-[11px] text-[#6f6d85]">
                      <span>{{ locationState(delivery.parcelId) }}</span>
                      <button
                        type="button"
                        (click)="toggleLocationSharing(delivery.parcelId)"
                        class="font-bold text-[#a53a26] hover:underline cursor-pointer"
                      >
                        {{ sharingParcelId() === delivery.parcelId ? 'Stop Sharing Location' : 'Start Sharing Location' }}
                      </button>
                    </div>
                    <!-- If CREATED or ASSIGNED -> Can Confirm Picked Up -->
                    <button
                      *ngIf="delivery.status === 'CREATED' || delivery.status === 'ASSIGNED'"
                      type="button"
                      [id]="'pickup-btn-' + delivery.parcelId"
                      [disabled]="isActionPending(delivery.parcelId)"
                      (click)="requestStageConfirmation(delivery, 'PICKED_UP')"
                      class="action-pill-btn w-full py-2.5 px-4 rounded-full bg-[#a53a26] hover:bg-[#7e2615] disabled:opacity-40 text-white font-bold text-xs sm:text-sm shadow-md shadow-[#a53a26]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                        <line x1="12" y1="22.08" x2="12" y2="12"/>
                      </svg>
                      <span>Confirm Picked Up</span>
                    </button>

                    <!-- If PICKED_UP -> Can Start Delivery (In Transit) -->
                    <button
                      *ngIf="delivery.status === 'PICKED_UP'"
                      type="button"
                      [id]="'transit-btn-' + delivery.parcelId"
                      [disabled]="isActionPending(delivery.parcelId)"
                      (click)="requestStageConfirmation(delivery, 'IN_TRANSIT')"
                      class="action-pill-btn w-full py-2.5 px-4 rounded-full bg-[#1d1b2c] hover:bg-[#2d2b3d] disabled:opacity-40 text-white font-bold text-xs sm:text-sm shadow-md shadow-[#1d1b2c]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
                        <path d="M15 18H9"/>
                        <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
                        <circle cx="17" cy="18" r="2"/>
                        <circle cx="7" cy="18" r="2"/>
                      </svg>
                      <span>Start Delivery (In Transit)</span>
                    </button>

                    <!-- If IN_TRANSIT -> Can Advance to OUT_FOR_DELIVERY -->
                    <button
                      *ngIf="delivery.status === 'IN_TRANSIT'"
                      type="button"
                      [id]="'out-btn-' + delivery.parcelId"
                      [disabled]="isActionPending(delivery.parcelId)"
                      (click)="requestStageConfirmation(delivery, 'OUT_FOR_DELIVERY')"
                      class="action-pill-btn w-full py-2.5 px-4 rounded-full bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      <span>Out for Final Delivery</span>
                    </button>

                    <!-- If OUT_FOR_DELIVERY -> Can Complete (with Proof) or Fail -->
                    <div *ngIf="delivery.status === 'OUT_FOR_DELIVERY'" class="flex flex-col gap-2">
                      <button
                        type="button"
                        [id]="'deliver-btn-' + delivery.parcelId"
                        [disabled]="isActionPending(delivery.parcelId)"
                        (click)="openProofModal(delivery)"
                        class="action-pill-btn w-full py-2.5 px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                          <circle cx="12" cy="13" r="3"/>
                        </svg>
                        <span>Complete & Upload Proof</span>
                      </button>
                      <button
                        type="button"
                        [id]="'fail-btn-' + delivery.parcelId"
                        [disabled]="isActionPending(delivery.parcelId)"
                        (click)="openFailModal(delivery)"
                        class="w-full py-2 px-3 rounded-full bg-[#f1f5f9] hover:bg-rose-50 disabled:opacity-40 text-[#6f6d85] hover:text-rose-700 font-bold text-xs border border-[#e2e8f0] hover:border-rose-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="8" x2="12" y2="12"/>
                          <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <span>Mark Delivery Attempt Failed</span>
                      </button>
                    </div>

                    <!-- If DELIVERED -> Done Badge -->
                    <div
                      *ngIf="delivery.status === 'DELIVERED'"
                      class="w-full py-2.5 px-4 rounded-full bg-[#ecfdf5] text-emerald-800 text-xs font-extrabold text-center border border-[#d1fae5] shadow-2xs flex items-center justify-center gap-1.5"
                    >
                      <svg class="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span>Completed & Confirmed</span>
                    </div>

                    <!-- If FAILED -> Attempt Recorded -->
                    <div
                      *ngIf="delivery.status === 'FAILED' || delivery.status === 'FAILED_DELIVERY'"
                      class="w-full py-2.5 px-4 rounded-full bg-rose-50 text-rose-800 text-xs font-extrabold text-center border border-rose-200 shadow-2xs flex items-center justify-center gap-1.5"
                    >
                      <svg class="w-4 h-4 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                      <span>Delivery Attempt Failed</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div
              *ngIf="filteredDeliveries().length === 0 && !isLoading()"
              class="bg-white rounded-3xl border border-dashed border-[#e8e2dc] p-12 text-center shadow-sm"
            >
              <div
                class="w-16 h-16 rounded-2xl bg-[#faf6f0] text-[#a53a26] flex items-center justify-center mx-auto mb-3 shadow-sm"
              >
                <svg class="w-8 h-8 text-[#a53a26]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </div>
              <h3 class="text-base font-black text-[#1d1b2c]">No deliveries found</h3>
              <p class="text-xs text-[#6f6d85] mt-1 max-w-sm mx-auto">
                No parcels match the current filter or search criteria.
              </p>
              <button
                type="button"
                (click)="activeFilter.set('ALL'); searchQuery.set(''); selectDate('')"
                class="mt-4 px-5 py-2 bg-[#faf6f0] text-[#a53a26] hover:bg-[#a53a26] hover:text-white font-bold text-xs rounded-full border border-[#a53a26]/20 transition-all cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        <!-- ================================================================= -->
        <!-- TAB 2: SETTINGS (Matching Customer Portal Layout) -->
        <!-- ================================================================= -->
        <div *ngIf="activeTab() === 'settings'" id="settings-panel" class="grid grid-cols-1 md:grid-cols-[15rem_1fr] gap-6 lg:gap-10 items-start">
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
                    @case ('duty') {
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
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
            @if (profileLoading()) {
              <div class="rounded-3xl border border-[#e8e2dc] bg-white p-8 text-[#6f6d85] font-semibold text-center shadow-sm">
                Loading courier profile...
              </div>
            } @else if (profileError()) {
              <div class="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800 shadow-sm">
                <p class="font-bold">{{ profileError() }}</p>
                <button
                  type="button"
                  class="mt-3 rounded-full bg-rose-700 hover:bg-rose-800 px-5 py-2 text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
                  (click)="loadProfile()"
                >
                  Retry
                </button>
              </div>
            } @else {
              @switch (settingsSection()) {
                @case ('profile') {
                  <div class="flex items-center justify-between gap-4">
                    <h2 class="text-2xl font-black text-[#1d1b2c] tracking-tight">Personal information</h2>
                    @if (!isEditingProfile()) {
                    <button
                      type="button"
                      id="courier-edit-profile-btn"
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
                      <p class="text-xs text-[#6f6d85] font-medium mt-0.5">Used by dispatchers, merchants, and customers to identify you on deliveries.</p>

                      <div class="flex items-center gap-4 mt-5">
                        <span class="w-14 h-14 flex-shrink-0 rounded-full bg-[#a53a26] text-white flex items-center justify-center font-bold text-base uppercase shadow-sm">
                          {{ courierInitials() }}
                        </span>
                        <div class="min-w-0">
                          <p id="settings-name" class="text-sm font-bold text-[#1d1b2c] truncate">{{ profile().name || courierDisplayName() }}</p>
                          <div class="flex items-center gap-2 mt-0.5 flex-wrap">
                            <p class="text-xs text-[#6f6d85] font-medium">Courier account • SwiftDrop Logistics</p>
                            @if (profile().zone) {
                              <span class="text-xs text-[#6f6d85] font-medium">• {{ profile().zone }}</span>
                            }
                            <span
                              class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                              [class.bg-emerald-100]="profile().availability"
                              [class.text-emerald-800]="profile().availability"
                              [class.bg-gray-100]="!profile().availability"
                              [class.text-gray-600]="!profile().availability"
                            >
                              {{ profile().availability ? 'Available' : 'Unavailable' }}
                            </span>
                          </div>
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
                      <p class="text-xs text-[#6f6d85] font-medium mt-0.5">We use these to send dispatch updates and alerts.</p>

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

                @case ('duty') {
                  <h2 class="text-2xl font-black text-[#1d1b2c] tracking-tight">Duty & Operations</h2>
                  <div class="h-px bg-[#f0ebe5] my-6"></div>

                  <div class="space-y-8">
                    <!-- Availability status card -->
                    <div>
                      <h3 class="text-sm font-black text-[#1d1b2c]">Duty Status</h3>
                      <p class="text-xs text-[#6f6d85] font-medium mt-0.5">Control whether you are currently active and available to receive delivery dispatches.</p>

                      <div class="rounded-3xl border border-[#eee7e0] bg-[#faf8f6] p-6 mt-5">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div class="flex items-center gap-2.5">
                              <span class="text-sm font-bold text-[#1d1b2c]">Current Status:</span>
                              <span
                                id="courier-duty-badge"
                                class="rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider border inline-flex items-center gap-1.5"
                                [class.bg-[#ecfdf5]]="profile().availability"
                                [class.text-emerald-800]="profile().availability"
                                [class.border-[#d1fae5]]="profile().availability"
                                [class.bg-[#f1f5f9]]="!profile().availability"
                                [class.text-[#6f6d85]]="!profile().availability"
                                [class.border-[#e2e8f0]]="!profile().availability"
                              >
                                <span class="w-2 h-2 rounded-full" [class.bg-emerald-600]="profile().availability" [class.bg-[#6f6d85]]="!profile().availability"></span>
                                {{ profile().availability ? 'Available' : 'Unavailable' }}
                              </span>
                            </div>
                            <p class="text-xs text-[#6f6d85] font-medium mt-2 leading-relaxed">
                              {{ profile().availability ? 'You are active on duty and receiving assigned deliveries.' : 'You are currently off duty and marked unavailable for new dispatches.' }}
                            </p>
                            @if (availabilityError()) {
                            <p class="text-xs text-rose-700 font-bold mt-2">{{ availabilityError() }}</p>
                            }
                          </div>
                          <button
                            type="button"
                            id="settings-availability-btn"
                            class="px-6 py-2.5 rounded-full text-xs font-bold text-white transition-all cursor-pointer whitespace-nowrap shadow-sm disabled:opacity-40"
                            [class.bg-[#a53a26]]="profile().availability"
                            [class.hover:bg-[#7e2615]]="profile().availability"
                            [class.bg-emerald-600]="!profile().availability"
                            [class.hover:bg-emerald-700]="!profile().availability"
                            [disabled]="availabilityPending()"
                            (click)="toggleAvailability()"
                          >
                            {{ availabilityPending() ? 'Saving...' : ('Set ' + (profile().availability ? 'unavailable' : 'available')) }}
                          </button>
                        </div>
                      </div>
                    </div>

                    <!-- Operational details -->
                    <div>
                      <h3 class="text-sm font-black text-[#1d1b2c]">Operational Assignment</h3>
                      <p class="text-xs text-[#6f6d85] font-medium mt-0.5">Assigned route zone and transport details configured by dispatch.</p>

                      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
                        <div class="rounded-2xl border border-[#eee7e0] bg-white p-4">
                          <p class="text-[11px] font-bold text-[#6f6d85] uppercase tracking-wider">Assigned Zone</p>
                          <p id="settings-zone" class="text-sm font-black text-[#1d1b2c] mt-1">{{ profile().zone || 'Colombo Central' }}</p>
                        </div>
                        <div class="rounded-2xl border border-[#eee7e0] bg-white p-4">
                          <p class="text-[11px] font-bold text-[#6f6d85] uppercase tracking-wider">Vehicle Type</p>
                          <p id="settings-vehicle" class="text-sm font-black text-[#1d1b2c] mt-1">{{ profile().vehicle || 'MOTORBIKE' }}</p>
                        </div>
                        <div class="rounded-2xl border border-[#eee7e0] bg-white p-4">
                          <p class="text-[11px] font-bold text-[#6f6d85] uppercase tracking-wider">Courier ID</p>
                          <p class="text-sm font-black text-[#1d1b2c] mt-1 truncate" [title]="profile().userId">{{ profile().userId }}</p>
                        </div>
                      </div>
                    </div>

                    <!-- Quick action to Run Sheet -->
                    <div class="flex justify-end border-t border-[#f0ebe5] pt-6 mt-8">
                      <button
                        type="button"
                        id="settings-runsheet-btn"
                        (click)="activeTab.set('runsheet')"
                        class="px-5 py-2.5 bg-[#a53a26] hover:bg-[#7e2615] text-white text-xs font-bold rounded-full transition-all cursor-pointer whitespace-nowrap"
                      >
                        View today's Run Sheet
                      </button>
                    </div>
                  </div>
                }

                @case ('security') {
                  <h2 class="text-2xl font-black text-[#1d1b2c] tracking-tight">Security</h2>
                  <div class="h-px bg-[#f0ebe5] my-6"></div>
                  <app-customer-change-password [email]="courierEmail()"></app-customer-change-password>

                  <div class="border-t border-[#f0ebe5] pt-8 mt-8">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 class="text-sm font-black text-[#1d1b2c]">Sign out</h3>
                        <p class="text-xs text-[#6f6d85] font-medium mt-0.5">Log out of SwiftDrop on this device.</p>
                      </div>
                      <button
                        type="button"
                        id="settings-logout-btn"
                        (click)="openLogoutModal()"
                        class="px-5 py-2.5 bg-[#a53a26] hover:bg-[#7e2615] text-white text-xs font-bold rounded-full transition-all cursor-pointer whitespace-nowrap"
                      >
                        Log out
                      </button>
                    </div>
                  </div>
                }
              }
            }
          </section>
        </div>

        <!-- ================================================================= -->
        <!-- TAB 3: LIVE PARCEL TRACKING (Integrated in Courier Portal) -->
        <!-- ================================================================= -->
        <div *ngIf="activeTab() === 'tracking'" id="courier-tracking-panel" class="space-y-7">
          <!-- Heading + Live Stream Indicator -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 class="text-xl sm:text-2xl font-black text-[#1d1b2c] tracking-tight">
                Live Parcel Tracking
              </h2>
              <p class="text-xs text-[#6f6d85] font-medium mt-0.5">
                Real-time updates directly from courier telemetry, depot checkpoints, and status streams.
              </p>
            </div>

            <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#faf6f0] border border-[#a53a26]/20 text-[#a53a26] text-xs font-bold shadow-2xs">
              <span class="w-2 h-2 rounded-full bg-[#12b76a] animate-pulse"></span>
              <span>Live Telemetry Stream:</span>
              <span class="font-semibold text-[#1d1b2c]">Connected</span>
            </div>
          </div>

          <!-- Tracking Search Bar + Quick Selector -->
          <div class="bg-[#faf8f6] rounded-3xl border border-[#eee7e0] p-6 space-y-4">
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div class="relative flex-1">
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
                  #trackInput
                  [value]="trackingSearchNumber()"
                  (input)="trackingSearchNumber.set(trackInput.value)"
                  (keydown.enter)="performTrackingSearch(trackInput.value)"
                  placeholder="Enter tracking number (e.g. SD-8942-COL)"
                  class="w-full pl-11 pr-4 py-3 rounded-2xl border border-[#e8e2dc] bg-white text-xs sm:text-sm font-semibold text-[#1d1b2c] placeholder-[#a09eaf] focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] shadow-2xs transition-all"
                />
              </div>
              <button
                type="button"
                id="courier-track-submit-btn"
                (click)="performTrackingSearch(trackInput.value)"
                class="px-6 py-3 rounded-2xl bg-[#a53a26] hover:bg-[#7e2615] text-white font-bold text-xs sm:text-sm transition-all shadow-sm hover:scale-[1.02] active:scale-95 cursor-pointer whitespace-nowrap"
              >
                Track Live
              </button>
            </div>

            <!-- Error Banner -->
            <div *ngIf="trackingSearchError()" class="p-3 bg-[#fdecec] border border-[#f5c2c0] rounded-xl text-xs font-bold text-[#b42318] flex items-center justify-between">
              <span>{{ trackingSearchError() }}</span>
              <button type="button" (click)="trackingSearchError.set(null)" class="text-[#b42318] hover:underline cursor-pointer">Dismiss</button>
            </div>

            <!-- Quick-track pills of assigned stops -->
            <div *ngIf="deliveries().length > 0" class="pt-2 border-t border-[#f0ebe5]/60">
              <span class="text-[11px] font-bold text-[#6f6d85] uppercase tracking-wider block mb-2">
                Quick-select assigned stops:
              </span>
              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  *ngFor="let del of deliveries()"
                  (click)="selectTrackingParcel(del)"
                  [class.bg-[#a53a26]]="effectiveTrackedDelivery()?.parcelId === del.parcelId"
                  [class.text-white]="effectiveTrackedDelivery()?.parcelId === del.parcelId"
                  [class.border-[#a53a26]]="effectiveTrackedDelivery()?.parcelId === del.parcelId"
                  [class.bg-white]="effectiveTrackedDelivery()?.parcelId !== del.parcelId"
                  [class.text-[#1d1b2c]]="effectiveTrackedDelivery()?.parcelId !== del.parcelId"
                  [class.border-[#e8e2dc]]="effectiveTrackedDelivery()?.parcelId !== del.parcelId"
                  class="px-3 py-1.5 rounded-full border text-xs font-bold transition-all shadow-2xs hover:scale-105 cursor-pointer flex items-center gap-1.5"
                >
                  <span class="font-mono">{{ del.trackingNumber }}</span>
                  <span class="opacity-70">({{ del.recipientName }})</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Active Tracking Data Display -->
          <div *ngIf="effectiveTrackedDelivery(); let del" class="space-y-6">
            <!-- Two Hero Summary Cards -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <!-- Hero Card 1: Parcel Info & Live Status -->
              <div class="bg-white rounded-3xl p-6 sm:p-7 border border-[#eee7e0] shadow-sm flex flex-col justify-between space-y-5">
                <div>
                  <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#f4efe9]">
                    <div>
                      <span class="text-[11px] font-bold text-[#6f6d85] block uppercase tracking-wider">
                        Tracking Number
                      </span>
                      <span class="font-mono text-xl sm:text-2xl font-black text-[#1d1b2c] tracking-tight">
                        {{ del.trackingNumber }}
                      </span>
                    </div>

                    <span
                      [ngClass]="getStatusBadgeClass(del.status)"
                      class="px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5"
                    >
                      <span class="w-1.5 h-1.5 rounded-full bg-current opacity-80"></span>
                      {{ getStatusLabel(del.status) }}
                    </span>
                  </div>

                  <!-- Details Grid -->
                  <dl class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-xs">
                    <div class="p-3.5 rounded-2xl bg-[#faf8f6] border border-[#f0ebe5]">
                      <dt class="text-[#6f6d85] font-bold mb-1">Recipient</dt>
                      <dd class="font-bold text-[#1d1b2c] text-sm truncate">{{ del.recipientName }}</dd>
                    </div>
                    <div class="p-3.5 rounded-2xl bg-[#faf8f6] border border-[#f0ebe5]">
                      <dt class="text-[#6f6d85] font-bold mb-1">Delivery Stop</dt>
                      <dd class="font-bold text-[#1d1b2c] text-sm truncate" [title]="del.dropoffAddress">{{ del.dropoffAddress }}</dd>
                    </div>
                    <div class="p-3.5 rounded-2xl bg-[#faf8f6] border border-[#f0ebe5]">
                      <dt class="text-[#6f6d85] font-bold mb-1">Attempt Count</dt>
                      <dd class="font-bold text-[#1d1b2c] text-sm truncate">Attempt {{ del.attemptCount || 1 }}</dd>
                    </div>
                  </dl>
                </div>

                <!-- Live Indicator Banner -->
                <div class="pt-4 border-t border-[#f0ebe5] flex items-center justify-between text-xs text-[#6f6d85]">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-[#12b76a]"></span>
                    <span class="font-bold text-[#1d1b2c]">Live telemetry streaming</span>
                  </div>
                  <span class="font-semibold">{{ del.weightKg ? del.weightKg + ' kg' : 'Standard Parcel' }}</span>
                </div>
              </div>

              <!-- Hero Card 2: Actions & Navigation -->
              <div
                class="rounded-3xl p-6 sm:p-7 text-white shadow-md relative overflow-hidden flex flex-col justify-between space-y-4"
                style="background: linear-gradient(135deg, #a53a26 0%, #8c2e1d 100%);"
              >
                <div class="relative z-10">
                  <span class="text-[10px] font-black uppercase tracking-widest text-white/70 block mb-1">
                    Courier Route Action
                  </span>
                  <h3 class="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
                    {{ del.recipientName }}
                  </h3>
                  <p class="text-xs text-white/80 font-medium mt-1 leading-relaxed">
                    {{ del.dropoffAddress }}
                  </p>
                </div>

                <div class="flex flex-wrap items-center gap-3 pt-4 relative z-10">
                  <button
                    type="button"
                    (click)="jumpToRunSheet(del.trackingNumber)"
                    class="px-5 py-2.5 rounded-full bg-white hover:bg-[#faf6f0] text-[#a53a26] font-bold text-xs transition-all shadow-sm hover:scale-[1.02] active:scale-95 cursor-pointer"
                  >
                    View in Run Sheet
                  </button>
                  <a
                    *ngIf="del.googleMapsUrl"
                    [href]="del.googleMapsUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="px-4 py-2.5 rounded-full bg-black/20 hover:bg-black/30 border border-white/20 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer no-underline"
                  >
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                      <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                    </svg>
                    <span>Google Maps</span>
                  </a>
                  <a
                    *ngIf="del.recipientPhone"
                    [href]="'tel:' + del.recipientPhone"
                    class="px-4 py-2.5 rounded-full bg-black/20 hover:bg-black/30 border border-white/20 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer no-underline"
                  >
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    <span>Call Recipient</span>
                  </a>
                </div>
              </div>
            </div>

            <!-- Delivery Journey & Stepper Timeline Card -->
            <div class="bg-white rounded-3xl border border-[#eee7e0] p-6 sm:p-8 shadow-sm space-y-6">
              <div class="flex items-center justify-between border-b border-[#f4efe9] pb-4">
                <div>
                  <h3 class="text-lg font-black text-[#1d1b2c] tracking-tight">Delivery Journey & Progress</h3>
                  <p class="text-xs text-[#6f6d85] font-medium mt-0.5">Real-time status milestones recorded for this delivery.</p>
                </div>
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#faf6f0] text-[#a53a26] text-xs font-bold border border-[#a53a26]/10">
                  <span class="w-2 h-2 rounded-full bg-[#a53a26]"></span>
                  <span>{{ getStatusLabel(del.status) }}</span>
                </span>
              </div>

              <!-- Stepper Progress Bar -->
              <div class="py-4">
                <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
                  <!-- Step 1: Created -->
                  <div class="flex flex-col items-center sm:items-start text-center sm:text-left space-y-2 p-4 rounded-2xl bg-[#faf8f6] border border-[#f0ebe5]">
                    <div class="w-8 h-8 rounded-full bg-[#12b76a] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                    <span class="text-xs font-black text-[#1d1b2c]">1. Order Booked</span>
                    <span class="text-[11px] text-[#6f6d85]">Parcel registered & dispatched</span>
                  </div>

                  <!-- Step 2: Picked Up -->
                  <div
                    [class.bg-[#faf8f6]]="del.status === 'PICKED_UP' || del.status === 'IN_TRANSIT' || del.status === 'OUT_FOR_DELIVERY' || del.status === 'DELIVERED'"
                    [class.border-[#f0ebe5]]="del.status === 'PICKED_UP' || del.status === 'IN_TRANSIT' || del.status === 'OUT_FOR_DELIVERY' || del.status === 'DELIVERED'"
                    [class.bg-white]="del.status !== 'PICKED_UP' && del.status !== 'IN_TRANSIT' && del.status !== 'OUT_FOR_DELIVERY' && del.status !== 'DELIVERED'"
                    [class.border-[#e8e2dc]]="del.status !== 'PICKED_UP' && del.status !== 'IN_TRANSIT' && del.status !== 'OUT_FOR_DELIVERY' && del.status !== 'DELIVERED'"
                    class="flex flex-col items-center sm:items-start text-center sm:text-left space-y-2 p-4 rounded-2xl border"
                  >
                    <div
                      [class.bg-[#12b76a]]="del.status === 'PICKED_UP' || del.status === 'IN_TRANSIT' || del.status === 'OUT_FOR_DELIVERY' || del.status === 'DELIVERED'"
                      [class.text-white]="del.status === 'PICKED_UP' || del.status === 'IN_TRANSIT' || del.status === 'OUT_FOR_DELIVERY' || del.status === 'DELIVERED'"
                      [class.bg-[#e8e2dc]]="del.status !== 'PICKED_UP' && del.status !== 'IN_TRANSIT' && del.status !== 'OUT_FOR_DELIVERY' && del.status !== 'DELIVERED'"
                      [class.text-[#6f6d85]]="del.status !== 'PICKED_UP' && del.status !== 'IN_TRANSIT' && del.status !== 'OUT_FOR_DELIVERY' && del.status !== 'DELIVERED'"
                      class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-2xs"
                    >
                      <svg *ngIf="del.status === 'PICKED_UP' || del.status === 'IN_TRANSIT' || del.status === 'OUT_FOR_DELIVERY' || del.status === 'DELIVERED'" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span *ngIf="del.status !== 'PICKED_UP' && del.status !== 'IN_TRANSIT' && del.status !== 'OUT_FOR_DELIVERY' && del.status !== 'DELIVERED'">2</span>
                    </div>
                    <span class="text-xs font-black text-[#1d1b2c]">2. Picked Up</span>
                    <span class="text-[11px] text-[#6f6d85]">Collected from pickup point</span>
                  </div>

                  <!-- Step 3: In Transit -->
                  <div
                    [class.bg-[#faf8f6]]="del.status === 'IN_TRANSIT' || del.status === 'OUT_FOR_DELIVERY' || del.status === 'DELIVERED'"
                    [class.border-[#f0ebe5]]="del.status === 'IN_TRANSIT' || del.status === 'OUT_FOR_DELIVERY' || del.status === 'DELIVERED'"
                    [class.bg-white]="del.status !== 'IN_TRANSIT' && del.status !== 'OUT_FOR_DELIVERY' && del.status !== 'DELIVERED'"
                    [class.border-[#e8e2dc]]="del.status !== 'IN_TRANSIT' && del.status !== 'OUT_FOR_DELIVERY' && del.status !== 'DELIVERED'"
                    class="flex flex-col items-center sm:items-start text-center sm:text-left space-y-2 p-4 rounded-2xl border"
                  >
                    <div
                      [class.bg-[#12b76a]]="del.status === 'IN_TRANSIT' || del.status === 'OUT_FOR_DELIVERY' || del.status === 'DELIVERED'"
                      [class.text-white]="del.status === 'IN_TRANSIT' || del.status === 'OUT_FOR_DELIVERY' || del.status === 'DELIVERED'"
                      [class.bg-[#e8e2dc]]="del.status !== 'IN_TRANSIT' && del.status !== 'OUT_FOR_DELIVERY' && del.status !== 'DELIVERED'"
                      [class.text-[#6f6d85]]="del.status !== 'IN_TRANSIT' && del.status !== 'OUT_FOR_DELIVERY' && del.status !== 'DELIVERED'"
                      class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-2xs"
                    >
                      <svg *ngIf="del.status === 'IN_TRANSIT' || del.status === 'OUT_FOR_DELIVERY' || del.status === 'DELIVERED'" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span *ngIf="del.status !== 'IN_TRANSIT' && del.status !== 'OUT_FOR_DELIVERY' && del.status !== 'DELIVERED'">3</span>
                    </div>
                    <span class="text-xs font-black text-[#1d1b2c]">3. In Transit</span>
                    <span class="text-[11px] text-[#6f6d85]">Moving along Colombo route</span>
                  </div>

                  <!-- Step 4: Final Stop -->
                  <div
                    [class.bg-[#fdecec]]="del.status === 'FAILED'"
                    [class.border-[#f5c2c0]]="del.status === 'FAILED'"
                    [class.bg-[#faf8f6]]="del.status === 'DELIVERED'"
                    [class.border-[#f0ebe5]]="del.status === 'DELIVERED'"
                    [class.bg-white]="del.status !== 'DELIVERED' && del.status !== 'FAILED'"
                    [class.border-[#e8e2dc]]="del.status !== 'DELIVERED' && del.status !== 'FAILED'"
                    class="flex flex-col items-center sm:items-start text-center sm:text-left space-y-2 p-4 rounded-2xl border"
                  >
                    <div
                      [class.bg-[#b42318]]="del.status === 'FAILED'"
                      [class.bg-[#12b76a]]="del.status === 'DELIVERED'"
                      [class.text-white]="del.status === 'DELIVERED' || del.status === 'FAILED'"
                      [class.bg-[#a53a26]]="del.status === 'OUT_FOR_DELIVERY'"
                      [class.text-white]="del.status === 'OUT_FOR_DELIVERY'"
                      [class.bg-[#e8e2dc]]="del.status !== 'DELIVERED' && del.status !== 'FAILED' && del.status !== 'OUT_FOR_DELIVERY'"
                      [class.text-[#6f6d85]]="del.status !== 'DELIVERED' && del.status !== 'FAILED' && del.status !== 'OUT_FOR_DELIVERY'"
                      class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-2xs"
                    >
                      <svg *ngIf="del.status === 'DELIVERED'" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span *ngIf="del.status === 'FAILED'">!</span>
                      <span *ngIf="del.status !== 'DELIVERED' && del.status !== 'FAILED'">4</span>
                    </div>
                    <span class="text-xs font-black text-[#1d1b2c]">
                      {{ del.status === 'DELIVERED' ? '4. Delivered' : (del.status === 'FAILED' ? '4. Delivery Failed' : '4. Final Delivery') }}
                    </span>
                    <span class="text-[11px] text-[#6f6d85]">
                      {{ del.status === 'DELIVERED' ? 'Proof recorded & signed' : (del.status === 'FAILED' ? 'Attempt recorded' : 'Doorstep handover pending') }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section *ngIf="selectedMapDelivery(); let mapDelivery" class="space-y-3" data-testid="courier-selected-map">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h3 class="text-lg font-black text-[#1d1b2c]">{{ mapDelivery.trackingNumber }} route map</h3>
                <p class="text-xs text-[#6f6d85]">Verified endpoints and genuine courier GPS only.</p>
              </div>
              <button type="button" (click)="closeDeliveryMap()" class="rounded-full border border-[#e8e2dc] px-4 py-2 text-xs font-bold text-[#6f6d85] hover:bg-[#faf8f6] cursor-pointer">Close map</button>
              <button type="button" *ngIf="!navigationActive()" (click)="startNavigation()" class="rounded-full bg-[#2563eb] px-4 py-2 text-xs font-bold text-white hover:bg-[#1d4ed8]">Start Navigation</button>
            </div>
            <app-tracking-map
              [pickup]="mapPickup()"
              [destination]="mapDestination()"
              [location]="mapLocation()"
              [authorized]="true"
              [navigation]="navigationActive()"
              [route]="navigationRoute()"
              [heading]="navigationHeading()"
              [followLocation]="followLocation()"
              [destinationAddress]="mapDelivery.dropoffAddress || mapDelivery.recipientAddress?.line1 || null"
              [externalNavigationUrl]="mapDelivery.googleMapsUrl || null"
              [locationLabel]="mapLocationLabel()"
            />
            <div *ngIf="navigationActive()" class="flex flex-wrap items-center gap-2 rounded-2xl bg-[#f4f7ff] p-3 text-xs font-bold text-[#1d1b2c]">
              <span>{{ navigationMessage() }}</span>
              <span *ngIf="navigationRoute()">{{ (navigationRoute()!.distanceMeters / 1000) | number:'1.1-1' }} km route</span>
              <button type="button" (click)="recenterNavigation()" class="rounded-full border border-[#cbd5ff] px-3 py-1.5">Recenter</button>
              <button type="button" (click)="followLocation.set(!followLocation())" class="rounded-full border border-[#cbd5ff] px-3 py-1.5">{{ followLocation() ? 'Following location' : 'Follow my location' }}</button>
              <button type="button" (click)="stopNavigation()" class="rounded-full border border-[#cbd5ff] px-3 py-1.5">Stop Navigation</button>
            </div>
          </section>

          <!-- Empty State (No Parcel Selected) -->
          <div *ngIf="!effectiveTrackedDelivery()" class="bg-[#faf8f6] rounded-3xl border border-[#eee7e0] p-12 text-center space-y-3">
            <div class="w-14 h-14 rounded-2xl bg-[#faf6f0] text-[#a53a26] flex items-center justify-center mx-auto shadow-sm">
              <svg class="w-7 h-7 text-[#a53a26]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m7.5 4.27 9 5.15"/>
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                <path d="m3.3 7 8.7 5 8.7-5"/>
                <path d="M12 22V12"/>
              </svg>
            </div>
            <h3 class="text-base font-bold text-[#1d1b2c]">No Parcel Selected</h3>
            <p class="text-xs text-[#6f6d85] max-w-sm mx-auto">
              Enter a tracking number above to follow its live telemetry, journey stops, and recipient details.
            </p>
          </div>
        </div>

        <!-- MODAL: EDIT PROFILE (COURIER) -->
        <div
          *ngIf="isEditModalOpen()"
          class="fixed inset-0 z-50 flex items-center justify-center bg-[#211f32]/45 p-4 backdrop-blur-sm animate-fade-in"
        >
          <div class="w-full max-w-md space-y-5 rounded-[1.5rem] border border-[#e9e3dd] bg-[#fbfaf8] p-7 shadow-2xl">
            <div class="flex items-center justify-between border-b border-[#e9e3dd] pb-4">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.16em] text-[#a53a26]">Courier profile</p>
                <h3 class="mt-1 text-xl font-black tracking-[-0.03em] text-[#1d1b2c]">Edit Profile</h3>
                <p class="mt-1 text-xs text-[#6f6d85]">Update your personal contact details.</p>
              </div>
              <button
                type="button"
                (click)="closeEditModal()"
                class="flex h-9 w-9 items-center justify-center rounded-full text-[#6f6d85] hover:bg-[#f2e4de] hover:text-[#a53a26]"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div *ngIf="editError()" class="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              {{ editError() }}
            </div>

            <form (ngSubmit)="saveEdit()" class="space-y-3.5">
              <div>
                <label class="mb-1 block text-xs font-bold text-[#6f6d85]">Full Name</label>
                <input
                  type="text"
                  id="courier-edit-fullname"
                  [(ngModel)]="editFullName"
                  name="editFullName"
                  required
                  class="w-full rounded-xl border border-[#eee7e0] bg-white px-3 py-2.5 text-sm text-[#1d1b2c] outline-none focus:border-[#a53a26] focus:ring-2 focus:ring-[#f2e4de]"
                />
              </div>
              <div>
                <label class="mb-1 block text-xs font-bold text-[#6f6d85]">Phone Number</label>
                <input
                  type="tel"
                  id="courier-edit-phone"
                  [(ngModel)]="editPhone"
                  name="editPhone"
                  placeholder="0771234567"
                  class="w-full rounded-xl border border-[#eee7e0] bg-white px-3 py-2.5 text-sm text-[#1d1b2c] outline-none focus:border-[#a53a26] focus:ring-2 focus:ring-[#f2e4de]"
                />
              </div>
              <div>
                <label class="mb-1 block text-xs font-bold text-[#6f6d85]">Email Address</label>
                <input
                  type="email"
                  id="courier-edit-email"
                  [(ngModel)]="editEmail"
                  name="editEmail"
                  required
                  class="w-full rounded-xl border border-[#eee7e0] bg-white px-3 py-2.5 text-sm text-[#1d1b2c] outline-none focus:border-[#a53a26] focus:ring-2 focus:ring-[#f2e4de]"
                />
              </div>
              <div class="flex items-center justify-end gap-2 border-t border-[#e9e3dd] pt-4">
                <button
                  type="button"
                  (click)="closeEditModal()"
                  class="rounded-full px-4 py-2 text-xs font-bold text-[#6f6d85] hover:bg-[#eee7e0] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="save-courier-profile-btn"
                  [disabled]="!editFullName.trim() || !editEmail.trim() || isSavingEdit()"
                  class="rounded-full bg-[#a53a26] hover:bg-[#7e2615] px-5 py-2.5 text-xs font-bold text-white shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {{ isSavingEdit() ? 'Saving...' : 'Save Changes' }}
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Proof of Delivery Modal Dialog -->
        <div
          *ngIf="selectedDeliveryForProof()"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1d1b2c]/60 backdrop-blur-xs animate-fade-in"
        >
          <div
            class="bg-white rounded-3xl shadow-xl border border-[#e8e2dc] w-full max-w-md overflow-hidden transform transition-all"
          >
            <!-- Modal Header -->
            <div class="p-6 border-b border-[#f4efe9] flex items-center justify-between bg-[#faf8f6]/80">
              <div>
                <div class="flex items-center gap-2">
                  <span class="portal-pill">Proof of Delivery</span>
                </div>
                <h2 class="text-lg font-black text-[#1d1b2c] flex items-center gap-2 mt-1">
                  <svg class="w-5 h-5 text-[#a53a26]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                    <circle cx="12" cy="13" r="3"/>
                  </svg>
                  <span>Complete Delivery</span>
                </h2>
                <p class="text-xs text-[#6f6d85] font-mono mt-0.5">
                  Tracking: {{ selectedDeliveryForProof()?.trackingNumber }}
                </p>
              </div>
              <button
                type="button"
                id="close-proof-modal"
                (click)="closeProofModal()"
                class="w-8 h-8 rounded-full bg-white hover:bg-[#faf6f0] text-[#6f6d85] hover:text-[#1d1b2c] border border-[#e8e2dc] flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <!-- Modal Body Form -->
            <div class="p-6 space-y-4">
              <!-- Recipient Name -->
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-[#6f6d85] mb-1.5">
                  Received By (Full Name) *
                </label>
                <input
                  type="text"
                  id="proof-recipient-name"
                  [(ngModel)]="proofRecipientName"
                  placeholder="Enter recipient or signatory name"
                  class="w-full px-4 py-2.5 rounded-2xl border border-[#e8e2dc] text-sm font-semibold text-[#1d1b2c] placeholder-[#a09eaf] focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] transition-all"
                />
              </div>

              <!-- Notes -->
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-[#6f6d85] mb-1.5">
                  Delivery Notes / Remarks
                </label>
                <textarea
                  id="proof-notes"
                  [(ngModel)]="proofDeliveryNotes"
                  rows="2"
                  placeholder="e.g. Left with security, signed at front door"
                  class="w-full px-4 py-2.5 rounded-2xl border border-[#e8e2dc] text-sm font-semibold text-[#1d1b2c] placeholder-[#a09eaf] focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] transition-all"
                ></textarea>
              </div>

              <!-- Photo Upload Area -->
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-[#6f6d85] mb-1.5">
                  Photo Proof (JPEG, PNG, WEBP - Max 5MB)
                </label>

                <div
                  *ngIf="!proofImagePreview"
                  class="border-2 border-dashed border-[#e8e2dc] hover:border-[#a53a26] rounded-2xl p-6 text-center cursor-pointer transition-colors bg-[#faf8f6]/50"
                  (click)="fileInput.click()"
                >
                  <svg class="w-10 h-10 text-[#a53a26] mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                    <circle cx="12" cy="13" r="3"/>
                  </svg>
                  <p class="text-xs font-bold text-[#a53a26]">Click or tap to capture/upload photo</p>
                  <p class="text-[11px] text-[#a09eaf] mt-0.5">JPEG, PNG or WEBP up to 5MB</p>
                  <input
                    #fileInput
                    type="file"
                    id="proof-file-input"
                    accept="image/jpeg,image/png,image/webp"
                    (change)="onFileSelected($event)"
                    class="hidden"
                  />
                </div>

                <!-- Image Preview -->
                <div
                  *ngIf="proofImagePreview"
                  class="relative rounded-2xl overflow-hidden border border-[#e8e2dc] bg-[#faf8f6]"
                >
                  <img
                    [src]="proofImagePreview"
                    alt="Proof preview"
                    class="w-full h-48 object-cover"
                  />
                  <button
                    type="button"
                    (click)="clearProofFile()"
                    class="absolute top-2 right-2 px-3 py-1 bg-[#1d1b2c]/80 hover:bg-[#1d1b2c] text-white rounded-full text-xs font-bold transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                </div>

                <p *ngIf="fileError()" class="text-xs text-rose-600 mt-1 font-bold">
                  {{ fileError() }}
                </p>
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="p-5 border-t border-[#f4efe9] bg-[#faf8f6]/80 flex items-center justify-end gap-2.5">
              <button
                type="button"
                (click)="closeProofModal()"
                class="px-5 py-2 rounded-full border border-[#e8e2dc] text-[#6f6d85] hover:bg-white text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="submit-proof-btn"
                (click)="submitProof()"
                [disabled]="isSubmittingProof || !isProofFormValid()"
                class="action-pill-btn px-6 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <svg *ngIf="isSubmittingProof" class="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle class="opacity-25" cx="12" cy="12" r="10"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Confirm & Deliver</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Failure Modal Dialog -->
        <div
          *ngIf="selectedDeliveryForFailure()"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1d1b2c]/60 backdrop-blur-xs animate-fade-in"
        >
          <div
            class="bg-white rounded-3xl shadow-xl border border-[#e8e2dc] w-full max-w-md overflow-hidden transform transition-all"
          >
            <!-- Modal Header -->
            <div class="p-6 border-b border-rose-100 flex items-center justify-between bg-rose-50/50">
              <div>
                <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700">
                  Failed Attempt
                </span>
                <h2 class="text-lg font-black text-[#1d1b2c] flex items-center gap-2 mt-1">
                  <svg class="w-5 h-5 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span>Record Failed Attempt</span>
                </h2>
                <p class="text-xs text-[#6f6d85] font-mono mt-0.5">
                  Tracking: {{ selectedDeliveryForFailure()?.trackingNumber }}
                </p>
              </div>
              <button
                type="button"
                id="close-fail-modal"
                (click)="closeFailModal()"
                class="w-8 h-8 rounded-full bg-white hover:bg-rose-100 text-[#6f6d85] hover:text-rose-700 border border-rose-200 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <!-- Modal Body -->
            <div class="p-6 space-y-4">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-[#6f6d85] mb-1.5">
                  Reason Category *
                </label>
                <select
                  id="fail-reason-select"
                  [(ngModel)]="failureReasonCategory"
                  class="w-full px-4 py-2.5 rounded-2xl border border-[#e8e2dc] text-sm font-semibold text-[#1d1b2c] focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white transition-all"
                >
                  <option value="RECIPIENT_UNAVAILABLE">Recipient unavailable / phone unreachable</option>
                  <option value="INCORRECT_ADDRESS">Incorrect address / premises not found</option>
                  <option value="CUSTOMER_REJECTED">Customer refused delivery</option>
                  <option value="ACCESS_RESTRICTED">Premises closed / access restricted</option>
                  <option value="OTHER">Other reason (describe below)</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-[#6f6d85] mb-1.5">
                  Additional Notes
                </label>
                <textarea
                  id="fail-notes"
                  [(ngModel)]="failureNotes"
                  rows="3"
                  placeholder="Details of the delivery attempt..."
                  class="w-full px-4 py-2.5 rounded-2xl border border-[#e8e2dc] text-sm font-semibold text-[#1d1b2c] placeholder-[#a09eaf] focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                ></textarea>
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="p-5 border-t border-[#f4efe9] bg-[#faf8f6]/80 flex items-center justify-end gap-2.5">
              <button
                type="button"
                (click)="closeFailModal()"
                class="px-5 py-2 rounded-full border border-[#e8e2dc] text-[#6f6d85] hover:bg-white text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="submit-fail-btn"
                (click)="submitFailure()"
                [disabled]="isSubmittingFailure || (failureReasonCategory === 'OTHER' && !failureNotes.trim())"
                class="action-pill-btn px-6 py-2 rounded-full bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <svg *ngIf="isSubmittingFailure" class="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle class="opacity-25" cx="12" cy="12" r="10"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Save Failed Attempt</span>
              </button>
            </div>
          </div>
        </div>

        <!-- View Proof Modal Dialog -->
        <div
          *ngIf="selectedDeliveryForProofView()"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1d1b2c]/60 backdrop-blur-xs animate-fade-in"
        >
          <div
            class="bg-white rounded-3xl shadow-xl border border-[#e8e2dc] w-full max-w-lg overflow-hidden transform transition-all"
          >
            <!-- Modal Header -->
            <div class="p-6 border-b border-[#f4efe9] flex items-center justify-between bg-[#faf8f6]/80">
              <div>
                <div class="flex items-center gap-2">
                  <span class="portal-pill">Proof Verified</span>
                </div>
                <h2 class="text-lg font-black text-[#1d1b2c] flex items-center gap-2 mt-1">
                  <svg class="w-5 h-5 text-[#a53a26]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                    <circle cx="12" cy="13" r="3"/>
                  </svg>
                  <span>Delivery Proof Details</span>
                </h2>
                <p class="text-xs text-[#6f6d85] font-mono mt-0.5">
                  Tracking: {{ selectedDeliveryForProofView()?.trackingNumber }}
                </p>
              </div>
              <button
                type="button"
                id="close-proof-view-modal"
                (click)="closeProofViewModal()"
                class="w-8 h-8 rounded-full bg-white hover:bg-[#faf6f0] text-[#6f6d85] hover:text-[#1d1b2c] border border-[#e8e2dc] flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <!-- Modal Body -->
            <div class="p-6 space-y-4">
              <div class="bg-[#faf8f6] rounded-2xl p-4 border border-[#e8e2dc] text-xs space-y-1.5">
                <p>
                  <span class="font-bold text-[#6f6d85]">Recipient Name:</span>
                  <span class="font-black text-[#1d1b2c] ml-1">
                    {{ selectedDeliveryForProofView()?.proof?.recipientName }}
                  </span>
                </p>
                <p>
                  <span class="font-bold text-[#6f6d85]">Uploaded At:</span>
                  <span class="font-semibold text-[#1d1b2c] ml-1">
                    {{ selectedDeliveryForProofView()?.proof?.uploadedAt | date: 'medium' }}
                  </span>
                </p>
              </div>

              <div
                class="relative rounded-2xl overflow-hidden border border-[#e8e2dc] bg-[#faf8f6] min-h-[180px] flex items-center justify-center"
              >
                <div *ngIf="isLoadingProofImage()" class="text-xs text-[#6f6d85] font-bold flex items-center gap-2">
                  <svg class="w-4 h-4 animate-spin text-[#6f6d85]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <circle class="opacity-25" cx="12" cy="12" r="10"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Loading authorized proof photo...</span>
                </div>
                <img
                  *ngIf="!isLoadingProofImage() && viewProofImageUrl()"
                  [src]="viewProofImageUrl()"
                  alt="Delivery proof"
                  id="view-proof-image"
                  class="w-full max-h-72 object-contain bg-[#1d1b2c]"
                />
                <p *ngIf="!isLoadingProofImage() && !viewProofImageUrl()" class="text-xs text-[#a09eaf] font-semibold">
                  Photo preview not available.
                </p>
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="p-5 border-t border-[#f4efe9] bg-[#faf8f6]/80 flex items-center justify-end">
              <button
                type="button"
                (click)="closeProofViewModal()"
                class="action-pill-btn px-6 py-2 rounded-full bg-[#1d1b2c] hover:bg-[#2d2b3d] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [
    `
      :host {
        --terracotta: #a53a26;
        --terracotta-dark: #7e2615;
        --coral: #f2533a;
        --ink: #1d1b2c;
        --ink-2: #3a384e;
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
      .tab-pill {
        color: var(--ink-3);
        background: transparent;
        border: none;
        cursor: pointer;
      }
      .tab-pill:hover {
        color: var(--ink);
      }
      .tab-pill.active {
        background: #fff;
        color: var(--ink);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }
      .count-badge {
        background: #e2e8f0;
        color: var(--ink-3);
        font-weight: 700;
      }
      .count-badge.active-badge {
        background: rgba(165, 58, 38, 0.12);
        color: var(--terracotta);
      }
      .action-pill-btn {
        transition: all 0.2s ease;
      }
      .action-pill-btn:hover:not(:disabled) {
        transform: translateY(-1px);
      }
      .rail-icon-btn.rail-active {
        color: var(--terracotta);
        background: #fff;
      }
    `,
  ],
})
export class CourierComponent implements OnInit, OnDestroy {
  private courierService = inject(CourierService);
  readonly authService = inject(AuthService, { optional: true });
  private router = inject(Router, { optional: true });
  private activatedRoute = inject(ActivatedRoute, { optional: true });
  private readonly routingService = inject(RoutingService);
  private readonly locationService = inject(CourierLocationService);
  private readonly trackingApi = inject(TrackingApiService);
  private readonly mapStop$ = new Subject<void>();

  readonly stats = this.courierService.stats;
  readonly profile = this.courierService.profile;
  readonly deliveries = this.courierService.deliveries;
  readonly isLoading = this.courierService.isLoading;
  readonly errorMessage = this.courierService.error;

  profileLoading = signal(true);
  profileLoaded = signal(false);
  profileError = signal<string | null>(null);

  activeTab = signal<'runsheet' | 'settings' | 'tracking'>('runsheet');
  activeFilter = signal<FilterTab>('ALL');
  searchQuery = signal<string>('');
  toastMessage = signal<string>('');
  profileMenuOpen = signal<boolean>(false);
  readonly selectedDate = signal<string>('');
  readonly showLogoutModal = signal<boolean>(false);
  readonly pendingStageAction = signal<{ delivery: CourierDelivery; nextStatus: DeliveryStatus } | null>(null);
  readonly sharingParcelId = signal<string | null>(null);
  private readonly locationStates = new Map<string, string>();
  readonly selectedMapDelivery = signal<CourierDelivery | null>(null);
  readonly mapPickup = signal<[number, number] | null>(null);
  readonly mapDestination = signal<[number, number] | null>(null);
  readonly mapLocation = signal<CourierLocation | null>(null);
  readonly mapLocationLabel = signal('Loading verified parcel coordinates…');
  readonly navigationActive = signal(false);
  readonly navigationRoute = signal<NavigationRoute | null>(null);
  readonly navigationHeading = signal<number | null>(null);
  readonly followLocation = signal(false);
  readonly navigationMessage = signal('Waiting for a real GPS position…');
  private previousNavigationLocation: CourierLocation | null = null;
  private navigationRequestInFlight = false;
  private lastNavigationRequestAt = 0;

  trackingSearchNumber = signal<string>('');
  selectedTrackingDelivery = signal<CourierDelivery | null>(null);
  trackingSearchError = signal<string | null>(null);

  readonly effectiveTrackedDelivery = computed(() => {
    const selected = this.selectedTrackingDelivery();
    if (selected) return selected;
    const all = this.deliveries();
    return all.length > 0 ? all[0] : null;
  });

  readonly availabilityPending = signal(false);
  readonly availabilityError = signal<string | null>(null);

  readonly settingsSection = signal<CourierSettingsSection>('profile');
  readonly settingsSections: Array<{ id: CourierSettingsSection; label: string }> = [
    { id: 'profile', label: 'Personal information' },
    { id: 'duty', label: 'Duty & Operations' },
    { id: 'security', label: 'Security' },
  ];

  selectSettingsSection(section: CourierSettingsSection): void {
    this.settingsSection.set(section);
    if (section === 'profile') {
      this.resetProfileForm();
    }
  }

  readonly isEditingProfile = signal<boolean>(false);
  editProfileFullName = '';
  editProfilePhone = '';
  editProfileEmail = '';
  readonly editProfileError = signal<string | null>(null);
  readonly isSavingProfile = signal<boolean>(false);
  readonly profileSaved = signal<boolean>(false);

  startEditingProfile(): void {
    this.resetProfileForm();
    this.isEditingProfile.set(true);
  }

  cancelEditingProfile(): void {
    this.resetProfileForm();
    this.isEditingProfile.set(false);
  }

  resetProfileForm(): void {
    this.editProfileFullName = this.profile().name || this.courierDisplayName();
    this.editProfilePhone = this.profile().phone || this.courierPhone();
    this.editProfileEmail = this.courierEmail();
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
        this.showToast('Profile updated successfully');
        this.loadProfile();
      },
      error: (err) => {
        this.isSavingProfile.set(false);
        this.editProfileError.set(err?.error?.message || err?.message || 'Failed to update profile.');
      },
    });
  }

  readonly isEditModalOpen = signal(false);
  editFullName = '';
  editPhone = '';
  editEmail = '';
  readonly editError = signal<string | null>(null);
  readonly isSavingEdit = signal(false);

  readonly courierDisplayName = computed(() => {
    if (this.profileLoaded()) {
      return this.profile().name || this.authService?.currentUser()?.fullName || 'Courier';
    }
    if (this.profileLoading()) {
      return 'Loading courier profile...';
    }
    return this.authService?.currentUser()?.fullName || 'Courier';
  });

  readonly courierEmail = computed(() => {
    return this.authService?.currentUser()?.email || 'courier@swiftdrop.lk';
  });

  readonly courierPhone = computed(() => {
    return this.authService?.currentUser()?.phoneNumber || this.profile()?.phone || '';
  });

  readonly courierInitials = computed(() => {
    const name = this.courierDisplayName();
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  });

  // Pending actions state per parcelId
  private pendingActions = signal<Set<string>>(new Set<string>());

  // Modals state
  selectedDeliveryForProof = signal<CourierDelivery | null>(null);
  proofRecipientName = '';
  proofDeliveryNotes = '';
  selectedFile: File | null = null;
  proofImagePreview: string | null = null;
  fileError = signal<string>('');
  isSubmittingProof = false;

  selectedDeliveryForFailure = signal<CourierDelivery | null>(null);
  failureReasonCategory: FailureReasonCode = 'RECIPIENT_UNAVAILABLE';
  failureNotes = '';
  isSubmittingFailure = false;

  selectedDeliveryForProofView = signal<CourierDelivery | null>(null);
  viewProofImageUrl = signal<string | null>(null);
  isLoadingProofImage = signal<boolean>(false);

  ngOnInit(): void {
    const initialTab = this.activatedRoute?.snapshot.queryParamMap.get('tab');
    if (initialTab === 'settings') {
      this.activeTab.set('settings');
    } else if (initialTab === 'tracking') {
      this.activeTab.set('tracking');
    }

    this.refreshDashboard();

    this.activatedRoute?.queryParamMap.subscribe((params) => {
      const tab = params.get('tab');
      if (tab === 'settings') {
        this.activeTab.set('settings');
      } else if (tab === 'tracking') {
        this.activeTab.set('tracking');
      } else if (tab === 'runsheet') {
        this.activeTab.set('runsheet');
      }
    });
  }

  ngOnDestroy(): void {
    this.locationService.stop();
    this.mapStop$.next();
    this.mapStop$.complete();
  }

  openDeliveryMap(delivery: CourierDelivery): void {
    const parcelId = delivery?.parcelId?.trim();
    const trackingNumber = delivery?.trackingNumber?.trim().toUpperCase();
    if (!parcelId || !trackingNumber) {
      this.showToast('This delivery does not have a valid tracking selection.');
      return;
    }
    this.activeTab.set('tracking');
    this.selectTrackingParcel(delivery);
  }

  closeDeliveryMap(): void {
    this.stopNavigation();
    this.mapStop$.next();
    this.selectedMapDelivery.set(null);
    this.mapLocation.set(null);
  }

  startNavigation(): void {
    const delivery = this.selectedMapDelivery();
    if (!delivery) return;
    if (this.sharingParcelId() !== delivery.parcelId) this.toggleLocationSharing(delivery.parcelId);
    this.navigationActive.set(true);
    this.navigationRoute.set(null);
    this.followLocation.set(true);
    this.navigationMessage.set('Waiting for a real GPS position…');
    const location = this.mapLocation();
    if (location) this.requestNavigationRoute(location);
  }

  stopNavigation(): void {
    this.navigationActive.set(false);
    this.navigationRoute.set(null);
    this.followLocation.set(false);
    this.navigationHeading.set(null);
    this.previousNavigationLocation = null;
    this.navigationMessage.set('Navigation stopped.');
  }

  recenterNavigation(): void {
    this.followLocation.set(true);
  }

  private requestNavigationRoute(location: CourierLocation): void {
    const delivery = this.selectedMapDelivery();
    if (!delivery) {
      this.navigationMessage.set('Select an assigned delivery before starting navigation.');
      return;
    }
    const destination = delivery && (delivery.status === 'CREATED' || delivery.status === 'ASSIGNED')
      ? this.mapPickup()
      : this.mapDestination();
    if (!destination) {
      this.navigationMessage.set('A verified next-stop coordinate is required for navigation.');
      return;
    }
    if (this.routingService.providerName === 'unconfigured') {
      this.navigationMessage.set('Road route unavailable: no approved routing provider is configured.');
      return;
    }
    const now = Date.now();
    if (this.navigationRequestInFlight || now - this.lastNavigationRequestAt < 15_000) return;
    this.navigationRequestInFlight = true;
    this.lastNavigationRequestAt = now;
    this.navigationMessage.set('Calculating road route…');
    this.routingService.route({ parcelId: delivery.parcelId, origin: [location.latitude, location.longitude], recordedAt: location.recordedAt }).pipe(
      takeUntil(this.mapStop$),
      catchError(() => {
        this.navigationMessage.set('Road route unavailable. Use the validated external navigation link.');
        return EMPTY;
      }),
    ).subscribe({
      next: route => {
        if (this.navigationActive()) {
          this.navigationRoute.set(route);
          this.navigationMessage.set('Road route ready.');
        }
      },
      complete: () => { this.navigationRequestInFlight = false; },
    });
  }

  private updateNavigationHeading(location: CourierLocation): void {
    const previous = this.previousNavigationLocation;
    this.previousNavigationLocation = location;
    if (!previous) return;
    const distance = this.distanceMeters(previous.latitude, previous.longitude, location.latitude, location.longitude);
    if (distance < Math.max(10, location.accuracyMeters)) return;
    const dLon = (location.longitude - previous.longitude) * Math.PI / 180;
    const lat1 = previous.latitude * Math.PI / 180;
    const lat2 = location.latitude * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    this.navigationHeading.set((Math.atan2(y, x) * 180 / Math.PI + 360) % 360);
  }

  private distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const earth = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  locationState(parcelId: string): string {
    return this.locationStates.get(parcelId) ?? 'Not sharing';
  }

  toggleLocationSharing(parcelId: string): void {
    if (this.sharingParcelId() === parcelId) {
      this.locationService.stop();
      this.sharingParcelId.set(null);
      this.locationStates.set(parcelId, 'Stopped');
      return;
    }
    this.locationService.stop();
    this.sharingParcelId.set(parcelId);
    this.locationStates.set(parcelId, 'Starting…');
    this.locationService.start(parcelId, state => this.locationStates.set(parcelId, state), message => {
      this.locationStates.set(parcelId, message);
      this.sharingParcelId.set(null);
    });
  }

  selectTrackingParcel(delivery: CourierDelivery): void {
    this.mapStop$.next();
    this.stopNavigation();
    this.selectedTrackingDelivery.set(delivery);
    this.trackingSearchNumber.set(delivery.trackingNumber);
    this.trackingSearchError.set(null);
    this.selectedMapDelivery.set(delivery);
    this.mapPickup.set(null);
    this.mapDestination.set(null);
    this.mapLocation.set(null);
    this.mapLocationLabel.set('Loading verified parcel coordinates…');
    this.trackingApi.parcel(delivery.parcelId).pipe(
      takeUntil(this.mapStop$),
      catchError(() => {
        this.mapLocationLabel.set('Parcel coordinates are unavailable or access was denied.');
        return EMPTY;
      }),
    ).subscribe((parcel) => {
      const pickup = parcel.pickupAddress;
      const destination = parcel.dropoffAddress;
      this.mapPickup.set(pickup.latitude != null && pickup.longitude != null ? [pickup.latitude, pickup.longitude] : null);
      this.mapDestination.set(destination.latitude != null && destination.longitude != null ? [destination.latitude, destination.longitude] : null);
      this.mapLocationLabel.set('Waiting for courier GPS…');
      timer(0, 10000).pipe(
        switchMap(() => this.trackingApi.latestLocation(delivery.parcelId)),
        catchError(() => { this.mapLocationLabel.set('Courier GPS unavailable or outdated.'); return EMPTY; }),
        takeUntil(this.mapStop$),
      ).subscribe((location) => {
        this.mapLocation.set(location);
        this.mapLocationLabel.set('Location live');
        this.updateNavigationHeading(location);
        if (this.navigationActive()) this.requestNavigationRoute(location);
      });
    });
  }

  performTrackingSearch(term?: string): void {
    const val = (term ?? this.trackingSearchNumber()).trim().toUpperCase();
    if (!val) {
      this.trackingSearchError.set('Please enter a parcel tracking number.');
      return;
    }
    const found = this.deliveries().find(
      (d) => d.trackingNumber.toUpperCase() === val || d.parcelId.toUpperCase() === val
    );
    if (found) {
      this.selectedTrackingDelivery.set(found);
      this.trackingSearchNumber.set(found.trackingNumber);
      this.trackingSearchError.set(null);
      this.showToast(`Tracking live telemetry for ${found.trackingNumber}`);
    } else {
      this.trackingSearchError.set(`No assigned parcel found matching "${val}".`);
    }
  }

  jumpToRunSheet(trackingNumber: string): void {
    this.searchQuery.set(trackingNumber);
    this.activeTab.set('runsheet');
  }

  refreshDashboard(): void {
    this.refreshDeliveries();
    this.loadProfile();
  }

  refreshDeliveries(): void {
    const dateParam = this.selectedDate()?.trim() || undefined;
    this.courierService.loadDeliveries(dateParam).subscribe({
      error: () => {
        // Handled in service signal
      },
    });
  }

  selectDate(date: string): void {
    this.selectedDate.set(date);
    this.refreshDeliveries();
  }

  resetToToday(): void {
    this.selectedDate.set('');
    this.refreshDeliveries();
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

  toggleProfileMenu(): void {
    this.profileMenuOpen.update((open) => !open);
  }

  openSettings(): void {
    this.profileMenuOpen.set(false);
    this.activeTab.set('settings');
  }

  logOutFromMenu(): void {
    this.profileMenuOpen.set(false);
    this.openLogoutModal();
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

  requestStageConfirmation(delivery: CourierDelivery, nextStatus: DeliveryStatus): void {
    this.pendingStageAction.set({ delivery, nextStatus });
  }

  cancelStageConfirmation(): void {
    this.pendingStageAction.set(null);
  }

  confirmStageAction(): void {
    const pending = this.pendingStageAction();
    if (!pending) return;
    this.pendingStageAction.set(null);
    this.advanceStatus(pending.delivery, pending.nextStatus);
  }

  getStageConfirmTitle(status?: DeliveryStatus): string {
    switch (status) {
      case 'PICKED_UP':
        return 'Confirm Parcel Pickup?';
      case 'IN_TRANSIT':
        return 'Start Transit Delivery?';
      case 'OUT_FOR_DELIVERY':
        return 'Mark Out for Final Delivery?';
      default:
        return 'Confirm Status Update?';
    }
  }

  getStageConfirmDescription(action: { delivery: CourierDelivery; nextStatus: DeliveryStatus } | null): string {
    if (!action) return '';
    switch (action.nextStatus) {
      case 'PICKED_UP':
        return `Confirm pickup of parcel ${action.delivery.trackingNumber} from ${action.delivery.senderName || 'the merchant'}. This will update the status to Picked Up.`;
      case 'IN_TRANSIT':
        return `Move parcel ${action.delivery.trackingNumber} to In Transit. This indicates the parcel is loaded and moving toward the delivery destination.`;
      case 'OUT_FOR_DELIVERY':
        return `Mark parcel ${action.delivery.trackingNumber} as Out for Final Delivery. The recipient will be notified that their delivery is on the way.`;
      default:
        return `Are you sure you want to advance parcel ${action.delivery.trackingNumber} to ${this.getStatusLabel(action.nextStatus)}?`;
    }
  }

  getStageConfirmActionLabel(status?: DeliveryStatus): string {
    switch (status) {
      case 'PICKED_UP':
        return 'Confirm Pickup';
      case 'IN_TRANSIT':
        return 'Start Transit';
      case 'OUT_FOR_DELIVERY':
        return 'Mark Out for Delivery';
      default:
        return 'Confirm';
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

  loadProfile(): void {
    this.profileLoading.set(true);
    this.profileLoaded.set(false);
    this.profileError.set(null);

    this.courierService.getProfile().subscribe({
      next: () => {
        this.profileLoaded.set(true);
      },
      error: (error) => {
        this.profileError.set(this.profileErrorMessage(error));
        this.profileLoading.set(false);
      },
      complete: () => {
        this.profileLoading.set(false);
      },
    });
  }

  private profileErrorMessage(error: { status?: number; error?: { message?: string } }): string {
    if (error?.status === 401) return 'Your session has expired. Please sign in again.';
    if (error?.status === 403) return 'Only authenticated couriers can load this profile.';
    if (error?.status === 404) return 'No courier profile is available for this account.';
    return error?.error?.message || 'Unable to load the courier profile.';
  }

  toggleAvailability(): void {
    const prof = this.profile();
    if (!prof || this.availabilityPending()) return;
    this.availabilityPending.set(true);
    this.availabilityError.set(null);
    this.courierService.setAvailability(!prof.availability).subscribe({
      next: (updated) => {
        this.availabilityPending.set(false);
        this.showToast(`Duty status updated to ${updated.availability ? 'Available' : 'Unavailable'}`);
      },
      error: (error) => {
        this.availabilityError.set(error?.error?.message || 'Unable to update availability.');
        this.availabilityPending.set(false);
      },
    });
  }

  openEditModal(): void {
    this.editFullName = this.courierDisplayName();
    this.editPhone = this.courierPhone();
    this.editEmail = this.courierEmail();
    this.editError.set(null);
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.editError.set(null);
  }

  saveEdit(): void {
    if (!this.editFullName.trim() || !this.editEmail.trim()) return;
    this.isSavingEdit.set(true);
    this.editError.set(null);

    this.authService?.updateProfile({
      fullName: this.editFullName.trim(),
      phoneNumber: this.editPhone.trim() || undefined,
      email: this.editEmail.trim(),
    }).subscribe({
      next: () => {
        this.isSavingEdit.set(false);
        this.closeEditModal();
        this.showToast('Profile updated successfully');
        this.loadProfile();
      },
      error: (err) => {
        this.isSavingEdit.set(false);
        this.editError.set(err?.error?.message || err?.message || 'Failed to update profile.');
      },
    });
  }

  isActionPending(parcelId: string): boolean {
    return this.pendingActions().has(parcelId);
  }

  private setActionPending(parcelId: string, pending: boolean): void {
    this.pendingActions.update((set) => {
      const copy = new Set(set);
      if (pending) {
        copy.add(parcelId);
      } else {
        copy.delete(parcelId);
      }
      return copy;
    });
  }

  // Filtered list
  readonly filteredDeliveries = computed(() => {
    let list = this.courierService.deliveries();
    const filter = this.activeFilter();

    if (filter === 'ACTIVE') {
      list = list.filter((d) =>
        ['CREATED', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(d.status)
      );
    } else if (filter === 'DELIVERED') {
      list = list.filter((d) => d.status === 'DELIVERED');
    } else if (filter === 'FAILED') {
      list = list.filter((d) => d.status === 'FAILED' || d.status === 'FAILED_DELIVERY');
    }

    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(
        (d) =>
          d.trackingNumber.toLowerCase().includes(q) ||
          d.recipientName.toLowerCase().includes(q) ||
          (d.dropoffAddress && d.dropoffAddress.toLowerCase().includes(q)) ||
          (d.recipientAddress?.city && d.recipientAddress.city.toLowerCase().includes(q)) ||
          (d.recipientAddress?.line1 && d.recipientAddress.line1.toLowerCase().includes(q))
      );
    }

    return list;
  });

  getStatusLabel(status: DeliveryStatus): string {
    switch (status) {
      case 'CREATED':
      case 'ASSIGNED':
        return 'To Pick Up';
      case 'PICKED_UP':
        return 'Picked Up';
      case 'IN_TRANSIT':
        return 'In Transit';
      case 'OUT_FOR_DELIVERY':
        return 'Out for Delivery';
      case 'DELIVERED':
        return 'Delivered';
      case 'FAILED':
      case 'FAILED_DELIVERY':
        return 'Failed';
      default:
        return status;
    }
  }

  getStatusBadgeClass(status: DeliveryStatus): string {
    switch (status) {
      case 'CREATED':
      case 'ASSIGNED':
        return 'bg-amber-50 text-amber-800 border border-amber-200/80';
      case 'PICKED_UP':
        return 'bg-[#faf6f0] text-[#a53a26] border border-[#a53a26]/20';
      case 'IN_TRANSIT':
        return 'bg-blue-50 text-blue-800 border border-blue-200/80';
      case 'OUT_FOR_DELIVERY':
        return 'bg-[#fffbeb] text-amber-800 border border-amber-300';
      case 'DELIVERED':
        return 'bg-emerald-50 text-emerald-800 border border-emerald-200/80';
      case 'FAILED':
      case 'FAILED_DELIVERY':
        return 'bg-rose-50 text-rose-800 border border-rose-200/80';
      default:
        return 'bg-slate-50 text-slate-800 border border-slate-200';
    }
  }

  advanceStatus(delivery: CourierDelivery, nextStatus: DeliveryStatus): void {
    if (this.isActionPending(delivery.parcelId)) return;

    this.setActionPending(delivery.parcelId, true);
    const idempotencyKey = `ui-${delivery.parcelId}-${nextStatus}-${Date.now()}`;

    this.courierService.updateStatus(delivery.parcelId, { status: nextStatus, idempotencyKey }).subscribe({
      next: () => {
        this.setActionPending(delivery.parcelId, false);
        this.showToast(`Updated ${delivery.trackingNumber} to ${this.getStatusLabel(nextStatus)}`);
      },
      error: (err) => {
        this.setActionPending(delivery.parcelId, false);
        const msg = err?.error?.message || err?.message || 'Status update failed';
        this.showToast(`Error: ${msg}`);
      },
    });
  }

  openProofModal(delivery: CourierDelivery): void {
    this.selectedDeliveryForProof.set(delivery);
    this.proofRecipientName = delivery.recipientName;
    this.proofDeliveryNotes = '';
    this.selectedFile = null;
    this.proofImagePreview = null;
    this.fileError.set('');
  }

  closeProofModal(): void {
    this.selectedDeliveryForProof.set(null);
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

      if (!allowedTypes.includes(file.type)) {
        this.fileError.set('Only JPEG, PNG, and WEBP images are supported.');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        this.fileError.set('File size exceeds 5MB limit.');
        return;
      }

      this.fileError.set('');
      this.selectedFile = file;

      const reader = new FileReader();
      reader.onload = () => {
        this.proofImagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  clearProofFile(): void {
    this.selectedFile = null;
    this.proofImagePreview = null;
    this.fileError.set('');
  }

  isProofFormValid(): boolean {
    return !!this.proofRecipientName.trim() || !!this.selectedFile;
  }

  submitProof(): void {
    const delivery = this.selectedDeliveryForProof();
    if (!delivery) return;

    this.isSubmittingProof = true;
    const parcelId = delivery.parcelId;
    const recipientName = this.proofRecipientName.trim();
    const notes = this.proofDeliveryNotes.trim();

    // If file is attached, upload proof first, then mark DELIVERED
    if (this.selectedFile) {
      this.courierService
        .uploadProof(parcelId, {
          file: this.selectedFile,
          recipientName,
          notes,
        })
        .subscribe({
          next: () => {
            this.completeDeliveryStatus(parcelId, delivery.trackingNumber, recipientName);
          },
          error: (err) => {
            this.isSubmittingProof = false;
            const msg = err?.error?.message || err?.message || 'Proof upload failed';
            this.fileError.set(msg);
          },
        });
    } else {
      // Recipient name proof only
      this.completeDeliveryStatus(parcelId, delivery.trackingNumber, recipientName);
    }
  }

  private completeDeliveryStatus(parcelId: string, trackingNumber: string, recipientName: string): void {
    const idempotencyKey = `proof-del-${parcelId}-${Date.now()}`;
    this.courierService
      .updateStatus(parcelId, {
        status: 'DELIVERED',
        recipientName,
        idempotencyKey,
      })
      .subscribe({
        next: () => {
          this.isSubmittingProof = false;
          this.closeProofModal();
          this.showToast(`Delivery completed & proof recorded for ${trackingNumber}!`);
        },
        error: (err) => {
          this.isSubmittingProof = false;
          const msg = err?.error?.message || err?.message || 'Failed to complete delivery status';
          this.fileError.set(msg);
        },
      });
  }

  openFailModal(delivery: CourierDelivery): void {
    this.selectedDeliveryForFailure.set(delivery);
    this.failureReasonCategory = 'RECIPIENT_UNAVAILABLE';
    this.failureNotes = '';
  }

  closeFailModal(): void {
    this.selectedDeliveryForFailure.set(null);
  }

  submitFailure(): void {
    const delivery = this.selectedDeliveryForFailure();
    if (!delivery || this.isSubmittingFailure) return;

    if (this.failureReasonCategory === 'OTHER' && !this.failureNotes.trim()) {
      this.showToast('Notes are required when the reason is Other.');
      return;
    }

    this.isSubmittingFailure = true;
    this.courierService
      .reportFailedDelivery(delivery.parcelId, {
        reasonCode: this.failureReasonCategory,
        note: this.failureNotes.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.isSubmittingFailure = false;
          this.closeFailModal();
          this.showToast(`Marked ${delivery.trackingNumber} as delivery attempt failed.`);
        },
        error: (err) => {
          this.isSubmittingFailure = false;
          const msg = err?.error?.message || err?.message || 'Failed to update failure status';
          this.showToast(`Error: ${msg}`);
        },
      });
  }

  viewProofDetail(delivery: CourierDelivery): void {
    if (!delivery.proof) return;
    this.selectedDeliveryForProofView.set(delivery);
    this.viewProofImageUrl.set(null);

    const proof = delivery.proof as any;
    const proofId = proof.id || proof.proofId;
    if (proofId) {
      this.isLoadingProofImage.set(true);
      this.courierService.getProofPhoto(proofId).subscribe({
        next: (blob) => {
          this.isLoadingProofImage.set(false);
          if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
            try {
              this.viewProofImageUrl.set(URL.createObjectURL(blob));
              return;
            } catch {
              // fallback to reader or proofUrl
            }
          }
          const reader = new FileReader();
          reader.onload = () => {
            this.viewProofImageUrl.set(reader.result as string);
          };
          reader.readAsDataURL(blob);
          if (proof.proofUrl) {
            this.viewProofImageUrl.set(proof.proofUrl);
          }
        },
        error: () => {
          this.isLoadingProofImage.set(false);
          if (proof.proofUrl) {
            this.viewProofImageUrl.set(proof.proofUrl);
          }
        },
      });
    } else if (proof.proofUrl) {
      this.viewProofImageUrl.set(proof.proofUrl);
    }
  }

  closeProofViewModal(): void {
    const url = this.viewProofImageUrl();
    if (url && url.startsWith('blob:') && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(url);
    }
    this.selectedDeliveryForProofView.set(null);
    this.viewProofImageUrl.set(null);
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      if (this.toastMessage() === msg) {
        this.toastMessage.set('');
      }
    }, 4000);
  }
}
