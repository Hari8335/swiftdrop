import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'shared-auth';
import { CustomerChangePasswordComponent } from './customer/customer-change-password.component';
import { NotificationBellComponent } from '../notification/notification-bell/notification-bell.component';
import { CourierProfile } from './courier/courier.model';
import { CourierService } from './courier/courier.service';

export type CourierSettingsSection = 'profile' | 'duty' | 'security';

@Component({
  selector: 'app-courier-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, NotificationBellComponent, CustomerChangePasswordComponent],
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
            class="p-2 rounded-lg text-[#a53a26]"
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
          <!-- Settings Button (Active) -->
          <button
            type="button"
            id="courier-sidebar-settings-btn"
            aria-label="Settings"
            class="relative flex h-11 w-full items-center rounded-2xl px-3 bg-[#faf0ec] text-[#a53a26] font-bold shadow-xs ring-1 ring-[#f2ded8] transition-all duration-200 cursor-pointer"
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
              <span
                class="w-8 h-8 rounded-full bg-[#a53a26] text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm"
              >
                {{ courierInitials() }}
              </span>
              <span class="text-xs font-bold text-[#1d1b2c]">{{ courierDisplayName() }}</span>
            </div>
          </div>
        </div>

        <!-- LOGOUT CONFIRMATION MODAL -->
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

        <!-- Settings Panel (2-Column Layout matching Customer Settings) -->
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
            @if (loading()) {
              <div class="rounded-3xl border border-[#e8e2dc] bg-white p-8 text-[#6f6d85] font-semibold text-center shadow-sm">
                Loading courier profile...
              </div>
            } @else if (error()) {
              <div class="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800 shadow-sm">
                <p class="font-bold">{{ error() }}</p>
                <button
                  type="button"
                  class="mt-3 rounded-full bg-rose-700 hover:bg-rose-800 px-5 py-2 text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
                  (click)="load()"
                >
                  Retry
                </button>
              </div>
            } @else if (!profile()) {
              <div class="rounded-3xl border border-dashed border-[#e8e2dc] bg-white p-10 text-center text-[#6f6d85] font-medium shadow-sm">
                Profile unavailable for this courier account.
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
                          <p id="settings-name" class="text-sm font-bold text-[#1d1b2c] truncate">{{ courierDisplayName() }}</p>
                          <div class="flex items-center gap-2 mt-0.5 flex-wrap">
                            <p class="text-xs text-[#6f6d85] font-medium">Courier account • SwiftDrop Logistics</p>
                            @if (profile()?.zone) {
                              <span class="text-xs text-[#6f6d85] font-medium">• {{ profile()?.zone }}</span>
                            }
                            @if (profile() !== null) {
                              <span
                                class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                                [class.bg-emerald-100]="profile()?.availability"
                                [class.text-emerald-800]="profile()?.availability"
                                [class.bg-gray-100]="!profile()?.availability"
                                [class.text-gray-600]="!profile()?.availability"
                              >
                                {{ profile()?.availability ? 'Available' : 'Unavailable' }}
                              </span>
                            }
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

                  @if (profile(); as courier) {
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
                                [class.bg-[#ecfdf5]]="courier.availability"
                                [class.text-emerald-800]="courier.availability"
                                [class.border-[#d1fae5]]="courier.availability"
                                [class.bg-[#f1f5f9]]="!courier.availability"
                                [class.text-[#6f6d85]]="!courier.availability"
                                [class.border-[#e2e8f0]]="!courier.availability"
                              >
                                <span class="w-2 h-2 rounded-full" [class.bg-emerald-600]="courier.availability" [class.bg-[#6f6d85]]="!courier.availability"></span>
                                {{ courier.availability ? 'Available' : 'Unavailable' }}
                              </span>
                            </div>
                            <p class="text-xs text-[#6f6d85] font-medium mt-2 leading-relaxed">
                              {{ courier.availability ? 'You are active on duty and receiving assigned deliveries.' : 'You are currently off duty and marked unavailable for new dispatches.' }}
                            </p>
                            @if (availabilityError()) {
                            <p class="text-xs text-rose-700 font-bold mt-2">{{ availabilityError() }}</p>
                            }
                          </div>
                          <button
                            type="button"
                            id="settings-availability-btn"
                            class="px-6 py-2.5 rounded-full text-xs font-bold text-white transition-all cursor-pointer whitespace-nowrap shadow-sm disabled:opacity-40"
                            [class.bg-[#a53a26]]="courier.availability"
                            [class.hover:bg-[#7e2615]]="courier.availability"
                            [class.bg-emerald-600]="!courier.availability"
                            [class.hover:bg-emerald-700]="!courier.availability"
                            [disabled]="availabilityPending()"
                            (click)="toggleAvailability()"
                          >
                            {{ availabilityPending() ? 'Saving...' : ('Set ' + (courier.availability ? 'unavailable' : 'available')) }}
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
                          <p id="settings-zone" class="text-sm font-black text-[#1d1b2c] mt-1">{{ courier.zone || 'Colombo Central' }}</p>
                        </div>
                        <div class="rounded-2xl border border-[#eee7e0] bg-white p-4">
                          <p class="text-[11px] font-bold text-[#6f6d85] uppercase tracking-wider">Vehicle Type</p>
                          <p id="settings-vehicle" class="text-sm font-black text-[#1d1b2c] mt-1">{{ courier.vehicle || 'MOTORBIKE' }}</p>
                        </div>
                        <div class="rounded-2xl border border-[#eee7e0] bg-white p-4">
                          <p class="text-[11px] font-bold text-[#6f6d85] uppercase tracking-wider">Courier ID</p>
                          <p class="text-sm font-black text-[#1d1b2c] mt-1 truncate" [title]="courier.userId">{{ courier.userId }}</p>
                        </div>
                      </div>
                    </div>

                    <!-- Quick action to Run Sheet -->
                    <div class="flex justify-end border-t border-[#f0ebe5] pt-6 mt-8">
                      <button
                        type="button"
                        id="settings-runsheet-btn"
                        (click)="navigateTo('/courier')"
                        class="px-5 py-2.5 bg-[#a53a26] hover:bg-[#7e2615] text-white text-xs font-bold rounded-full transition-all cursor-pointer whitespace-nowrap"
                      >
                        View today's Run Sheet
                      </button>
                    </div>
                  </div>
                  }
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
      .action-pill-btn {
        transition: all 0.2s ease;
      }
      .action-pill-btn:hover:not(:disabled) {
        transform: translateY(-1px);
      }
    `,
  ],
})
export class CourierProfileComponent {
  private readonly service = inject(CourierService);
  private readonly router = inject(Router, { optional: true });
  readonly authService = inject(AuthService, { optional: true });

  readonly profile = signal<CourierProfile | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly availabilityPending = signal(false);
  readonly availabilityError = signal<string | null>(null);
  readonly profileMenuOpen = signal<boolean>(false);
  readonly showLogoutModal = signal<boolean>(false);

  readonly courierDisplayName = computed(() => {
    return this.authService?.currentUser()?.fullName || this.profile()?.name || 'Courier';
  });

  readonly courierEmail = computed(() => {
    return this.authService?.currentUser()?.email || 'courier@swiftdrop.lk';
  });

  readonly courierPhone = computed(() => {
    return this.authService?.currentUser()?.phoneNumber || this.profile()?.phone || '';
  });

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
    this.editProfileFullName = this.courierDisplayName();
    this.editProfilePhone = this.courierPhone();
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
      next: (updated) => {
        this.isSavingProfile.set(false);
        this.isEditingProfile.set(false);
        this.profileSaved.set(true);
        const cur = this.profile();
        if (cur) {
          this.profile.set({
            ...cur,
            name: updated.fullName,
            phone: updated.phoneNumber || cur.phone,
          });
        }
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

  openEditModal(): void {
    this.startEditingProfile();
  }

  closeEditModal(): void {
    this.cancelEditingProfile();
  }

  saveEdit(): void {
    this.saveProfile();
  }

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
    this.service.getProfile().subscribe({
      next: (profile) => this.profile.set(profile),
      error: (error) => {
        this.profile.set(null);
        this.error.set(this.messageFor(error, 'Unable to load the courier profile.'));
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  toggleAvailability(): void {
    const profile = this.profile();
    if (!profile || this.availabilityPending()) return;
    this.availabilityPending.set(true);
    this.availabilityError.set(null);
    this.service.setAvailability(!profile.availability).subscribe({
      next: (updated) => this.profile.set(updated),
      error: (error) => {
        this.availabilityError.set(this.messageFor(error, 'Unable to update availability.'));
        this.availabilityPending.set(false);
      },
      complete: () => this.availabilityPending.set(false),
    });
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

  private messageFor(error: { status?: number; error?: { message?: string } }, fallback: string): string {
    if (error?.status === 401) return 'Your session has expired. Please sign in again.';
    if (error?.status === 403) return 'Only authenticated couriers can access this profile.';
    if (error?.status === 404) return 'No courier profile is available for this account.';
    return error?.error?.message || fallback;
  }
}
