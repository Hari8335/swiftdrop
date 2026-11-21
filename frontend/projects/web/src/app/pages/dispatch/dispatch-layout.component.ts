import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from 'shared-auth';
import { DispatchNotification, DispatchNotificationsService } from './dispatch-notifications.service';
import { DispatchPage, DispatchPortalState } from './dispatch-portal.state';

interface NavItem {
  page: DispatchPage;
  title: string;
  path: string;
  tab?: string;
}

/**
 * Shell for the whole dispatcher portal, laid out like the customer portal: an icon rail on the
 * left (names slide out on hover, Settings and Log out at the bottom), a sticky top bar with
 * search, notifications and the profile chip, one heading per page, and the toast stack.
 */
@Component({
  selector: 'app-dispatch-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterOutlet],
  template: `
    <div class="w-full min-h-screen flex flex-col md:flex-row bg-white">
      <!-- ============================== Sidebar ============================== -->
      <aside
        class="w-full md:w-20 flex-shrink-0 flex md:flex-col items-center justify-between md:justify-start gap-6 py-4 md:py-7 px-4 md:px-0 border-b md:border-b-0 md:border-r border-[#f0ebe5] bg-[#faf8f6] md:sticky md:top-0 md:h-screen z-40"
      >
        <a
          routerLink="/dispatch"
          id="dispatch-brand-link"
          class="w-11 h-11 rounded-2xl bg-[#a53a26] text-white flex items-center justify-center shadow-md shadow-[#a53a26]/20 shrink-0 hover:scale-105 transition-transform"
          title="SwiftDrop Dispatch"
          aria-label="SwiftDrop Dispatch home"
        >
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
        </a>

        <span class="hidden md:block w-10 h-px bg-[#e8e2dc]" aria-hidden="true"></span>

        <nav class="flex md:flex-col items-center gap-3 sm:gap-4" aria-label="Dispatcher navigation">
          @for (item of navItems; track item.page) {
            <div class="group relative w-11 h-11">
              <a
                [routerLink]="item.path"
                [queryParams]="item.tab ? { tab: item.tab } : {}"
                [attr.id]="'tab-' + item.page + '-link'"
                [attr.aria-current]="portal.page() === item.page ? 'page' : null"
                [attr.aria-label]="item.title"
                class="rail-link"
                [class.rail-active]="portal.page() === item.page"
              >
                <span class="rail-icon">
                  <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    @switch (item.page) {
                      @case ('home') {
                        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <polyline points="9 22 9 12 15 12 15 22"/>
                      }
                      @case ('queue') {
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                        <path d="M9 12h6"/>
                        <path d="M9 16h6"/>
                      }
                      @case ('failed') {
                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                      }
                      @case ('workload') {
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      }
                      @case ('zones') {
                        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                        <line x1="8" y1="2" x2="8" y2="18"/>
                        <line x1="16" y1="6" x2="16" y2="22"/>
                      }
                      @case ('pricing') {
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                        <line x1="7" y1="7" x2="7.01" y2="7"/>
                      }
                    }
                  </svg>
                  @if (item.page === 'queue' && notifications.queueCount() > 0) {
                    <span class="rail-badge bg-[#a53a26]">{{ badge(notifications.queueCount()) }}</span>
                  }
                  @if (item.page === 'failed' && notifications.failedCount() > 0) {
                    <span class="rail-badge bg-rose-600">{{ badge(notifications.failedCount()) }}</span>
                  }
                </span>
                <span class="rail-label">{{ item.title }}</span>
              </a>
            </div>
          }
        </nav>

        <!-- Footer: Settings above Log out, pinned to the bottom -->
        <div class="flex md:flex-col items-center gap-3 sm:gap-4 md:mt-auto">
          <span class="hidden md:block w-10 h-px bg-[#e8e2dc]" aria-hidden="true"></span>
          <div class="group relative w-11 h-11">
            <a
              routerLink="/dispatch/settings"
              id="tab-settings-link"
              [attr.aria-current]="portal.page() === 'settings' ? 'page' : null"
              aria-label="Settings"
              class="rail-link"
              [class.rail-active]="portal.page() === 'settings'"
            >
              <span class="rail-icon">
                <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </span>
              <span class="rail-label">Settings</span>
            </a>
          </div>
          <div class="group relative w-11 h-11">
            <button type="button" id="sidebar-logout-btn" (click)="logoutConfirmOpen.set(true)" aria-label="Log out" class="rail-link">
              <span class="rail-icon">
                <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </span>
              <span class="rail-label">Log out</span>
            </button>
          </div>
        </div>
      </aside>

      <!-- ============================== Main column ============================== -->
      <div class="flex-1 min-w-0 flex flex-col">
        <header
          class="w-full h-[72px] flex-shrink-0 flex items-center justify-between gap-4 px-4 sm:px-8 lg:px-10 border-b border-[#f0ebe5] bg-white sticky top-0 z-30"
        >
          <div class="flex-1 min-w-0">
            @if (portal.searchable()) {
              <div class="relative max-w-lg">
                <svg class="w-4 h-4 text-[#a09eaf] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="search"
                  id="top-quick-search-input"
                  [ngModel]="portal.query()"
                  (ngModelChange)="portal.setQuery($event)"
                  [placeholder]="portal.placeholder()"
                  [attr.aria-label]="portal.placeholder()"
                  class="w-full h-11 pl-11 pr-4 rounded-full bg-[#faf8f6] border border-[#e8e2dc] text-xs font-semibold text-[#1d1b2c] focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] transition-all"
                />
              </div>
            }
          </div>

          <div class="flex items-center gap-3 flex-shrink-0">
            <!-- Notifications (admin portal style) -->
            <div class="relative" id="dispatch-notifications">
              <button
                type="button"
                id="dispatch-notification-bell-btn"
                (click)="toggleNotifications()"
                [attr.aria-expanded]="notificationsOpen()"
                [attr.aria-label]="notifications.unreadCount() ? notifications.unreadCount() + ' unread notifications' : 'Notifications'"
                class="relative grid h-11 w-11 place-items-center rounded-xl border border-[#e8e2dc] bg-white text-[#6f6d85] shadow-sm transition hover:border-[#a53a26]/40 hover:text-[#a53a26] focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 cursor-pointer"
              >
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/>
                  <path d="M10 21h4"/>
                </svg>
                @if (notifications.unreadCount() > 0) {
                  <span
                    id="dispatch-notification-badge"
                    class="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#a53a26] px-1 text-[11px] font-bold text-white shadow ring-2 ring-white"
                  >{{ badge(notifications.unreadCount()) }}</span>
                }
              </button>

              @if (notificationsOpen()) {
                <div
                  id="dispatch-notification-dropdown"
                  role="dialog"
                  aria-label="Notifications"
                  class="absolute right-0 top-14 z-50 w-80 sm:w-96 rounded-2xl border border-[#e8e2dc] bg-white shadow-[0_12px_32px_rgba(33,31,50,0.12)] overflow-hidden"
                >
                  <div class="flex items-center justify-between px-4 py-3 border-b border-[#f0ebe5] bg-[#faf8f6]">
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-black text-[#1d1b2c]">Notifications</span>
                      @if (notifications.unreadCount() > 0) {
                        <span class="rounded-full bg-[#a53a26] px-2 py-0.5 text-[10px] font-bold text-white">{{ notifications.unreadCount() }} new</span>
                      }
                    </div>
                    @if (notifications.unreadCount() > 0) {
                      <button type="button" id="dispatch-notification-mark-all" (click)="notifications.markAllRead()" class="text-xs font-bold text-[#a53a26] hover:underline cursor-pointer">
                        Mark all read
                      </button>
                    }
                  </div>

                  @if (notifications.notifications().length === 0) {
                    <div id="dispatch-notification-empty" class="px-4 py-8 text-center">
                      <p class="text-sm font-bold text-[#1d1b2c]">You're all caught up</p>
                      <p class="mt-1 text-xs text-[#6f6d85]">New queue parcels and failed deliveries will appear here.</p>
                    </div>
                  } @else {
                    <ul class="max-h-[360px] overflow-y-auto divide-y divide-[#f0ebe5]" role="list">
                      @for (n of notifications.notifications(); track n.id) {
                        <li>
                          <button
                            type="button"
                            (click)="openNotification(n)"
                            class="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[#faf8f6] transition-colors cursor-pointer"
                            [class.bg-[#fff8f5]]="!n.read"
                          >
                            <span
                              class="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white"
                              [class.bg-[#a53a26]]="n.kind === 'queue'"
                              [class.bg-rose-600]="n.kind === 'failed'"
                            >
                              @if (n.kind === 'queue') {
                                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                              } @else {
                                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                              }
                            </span>
                            <span class="flex-1 min-w-0">
                              <span class="block text-xs font-bold text-[#1d1b2c]">{{ n.title }}</span>
                              <span class="block mt-0.5 text-xs text-[#6f6d85] truncate">{{ n.message }}</span>
                              <span class="block mt-1 text-[11px] text-[#a09eaf]">{{ n.createdAt | date: 'shortTime' }}</span>
                            </span>
                            @if (!n.read) {
                              <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#a53a26]" aria-label="Unread"></span>
                            }
                          </button>
                        </li>
                      }
                    </ul>
                    <div class="px-4 py-2.5 border-t border-[#f0ebe5] text-right">
                      <button type="button" (click)="notifications.clearAll()" class="text-xs font-semibold text-[#6f6d85] hover:text-[#a53a26] cursor-pointer">Clear all</button>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Profile chip: display only (Settings is reached from the sidebar icon) -->
            <div
              id="profile-chip"
              class="h-11 flex items-center gap-2.5 pl-1.5 pr-4 rounded-full bg-[#faf8f6] border border-[#e8e2dc] select-none"
            >
              <span class="w-8 h-8 rounded-full bg-[#a53a26] text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">{{ initials() }}</span>
              <span class="hidden sm:flex flex-col leading-tight">
                <span class="text-xs font-bold text-[#1d1b2c]">{{ displayName() }}</span>
                <span class="text-[10px] font-semibold text-[#6f6d85]">Dispatcher</span>
              </span>
            </div>
          </div>
        </header>

        <main class="flex-1 px-4 sm:px-8 lg:px-10 pt-8 pb-12 min-w-0">
          <h1 id="dispatch-page-title" class="text-2xl sm:text-3xl font-black text-[#1d1b2c] tracking-tight mb-8">{{ portal.title() }}</h1>
          <router-outlet />
        </main>
      </div>
    </div>

    <!-- ============================== Logout confirmation ============================== -->
    @if (logoutConfirmOpen()) {
      <div id="logout-confirm-modal" class="fixed inset-0 z-[70] flex items-center justify-center bg-[#1d1b2c]/40 backdrop-blur-sm p-4" (click)="logoutConfirmOpen.set(false)">
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="logout-confirm-title"
          aria-describedby="logout-confirm-desc"
          class="w-full max-w-sm rounded-3xl bg-white border border-[#eee7e0] shadow-xl p-6 space-y-5"
          (click)="$event.stopPropagation()"
        >
          <div class="w-12 h-12 rounded-2xl bg-[#faf6f0] text-[#a53a26] flex items-center justify-center">
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </div>
          <div>
            <h3 id="logout-confirm-title" class="text-base font-black text-[#1d1b2c]">Log out of SwiftDrop?</h3>
            <p id="logout-confirm-desc" class="text-xs text-[#6f6d85] font-medium mt-1">You'll need to sign in again to manage the dispatch queue.</p>
          </div>
          <div class="flex justify-end gap-3">
            <button type="button" id="logout-cancel-btn" (click)="logoutConfirmOpen.set(false)" class="px-5 py-2.5 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#1d1b2c] text-xs font-bold rounded-full transition-all cursor-pointer">
              Cancel
            </button>
            <button type="button" id="logout-confirm-btn" (click)="logout()" class="px-5 py-2.5 bg-[#a53a26] hover:bg-[#7e2615] text-white text-xs font-bold rounded-full transition-all cursor-pointer">
              Log out
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ============================== Toasts ============================== -->
    <div class="fixed bottom-6 right-6 z-[80] flex flex-col gap-3 w-[calc(100%-3rem)] sm:w-96" aria-live="polite" role="status">
      @for (t of notifications.toasts(); track t.id) {
        <div class="dispatch-toast flex items-start gap-3 rounded-2xl border border-[#eee7e0] bg-white p-4 shadow-[0_12px_32px_rgba(33,31,50,0.14)]">
          <span
            class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white"
            [class.bg-[#a53a26]]="t.kind === 'queue'"
            [class.bg-rose-600]="t.kind === 'failed' || t.kind === 'error'"
            [class.bg-emerald-600]="t.kind === 'success'"
          >
            @switch (t.kind) {
              @case ('success') {
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
              }
              @case ('queue') {
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              }
              @default {
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              }
            }
          </span>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-bold text-[#1d1b2c]">{{ t.title }}</p>
            @if (t.message) {
              <p class="mt-0.5 text-xs text-[#6f6d85] break-words">{{ t.message }}</p>
            }
          </div>
          <button type="button" (click)="notifications.dismissToast(t.id)" aria-label="Dismiss" class="grid h-6 w-6 shrink-0 place-items-center rounded-md text-[#a09eaf] hover:bg-[#faf8f6] hover:text-[#1d1b2c] cursor-pointer">
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      /* Icon button that slides out into a labelled pill on hover/focus. */
      .rail-link {
        position: absolute;
        left: 0;
        top: 0;
        height: 2.75rem;
        display: flex;
        align-items: center;
        border-radius: 1rem;
        color: #a53a26;
        background: transparent;
        text-decoration: none;
        white-space: nowrap;
        cursor: pointer;
        transition: background-color 0.18s ease, box-shadow 0.18s ease;
        z-index: 1;
      }
      .rail-icon {
        position: relative;
        width: 2.75rem;
        height: 2.75rem;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .rail-label {
        max-width: 0;
        overflow: hidden;
        opacity: 0;
        font-size: 0.75rem;
        font-weight: 700;
        color: #1d1b2c;
        transition: max-width 0.22s ease, opacity 0.18s ease, padding 0.22s ease;
      }
      .rail-badge {
        position: absolute;
        top: -0.25rem;
        right: -0.25rem;
        min-width: 1.1rem;
        height: 1.1rem;
        padding: 0 0.25rem;
        border-radius: 9999px;
        color: #fff;
        font-size: 0.6rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 0 2px #faf8f6;
      }
      .rail-link.rail-active {
        background: #ffffff;
        box-shadow: 0 4px 14px rgba(29, 27, 44, 0.06);
      }
      @media (min-width: 768px) {
        .group:hover .rail-link,
        .rail-link:focus-visible {
          background: #ffffff;
          box-shadow: 0 8px 24px rgba(29, 27, 44, 0.12);
          z-index: 50;
        }
        .group:hover .rail-label,
        .rail-link:focus-visible .rail-label {
          max-width: 12rem;
          opacity: 1;
          padding-right: 1rem;
        }
      }
      .rail-link:focus-visible {
        outline: 2px solid rgba(165, 58, 38, 0.35);
        outline-offset: 2px;
      }
      .dispatch-toast {
        animation: dispatch-toast-in 0.22s ease-out;
      }
      @keyframes dispatch-toast-in {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `,
  ],
})
export class DispatchLayoutComponent implements OnInit, OnDestroy {
  readonly portal = inject(DispatchPortalState);
  readonly notifications = inject(DispatchNotificationsService);
  private readonly authService = inject(AuthService, { optional: true });
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly logoutConfirmOpen = signal(false);
  readonly notificationsOpen = signal(false);

  readonly navItems: NavItem[] = [
    { page: 'home', title: 'Overview', path: '/dispatch' },
    { page: 'queue', title: 'Unassigned Parcels', path: '/dispatch', tab: 'queue' },
    { page: 'failed', title: 'Failed Deliveries', path: '/dispatch', tab: 'failed' },
    { page: 'workload', title: 'Courier Workload', path: '/dispatch', tab: 'workload' },
    { page: 'zones', title: 'Delivery Zones', path: '/dispatch/zones' },
    { page: 'pricing', title: 'Pricing Rules', path: '/dispatch/pricing' },
  ];

  readonly displayName = computed(() => this.authService?.currentUser?.()?.fullName || 'Dispatcher');
  readonly initials = computed(() => {
    const parts = this.displayName().trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (parts[0] ?? 'DP').slice(0, 2).toUpperCase();
  });

  ngOnInit(): void {
    this.syncPageFromUrl(this.router.url);
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((e) => {
        this.notificationsOpen.set(false);
        this.syncPageFromUrl(e.urlAfterRedirects);
      });
    this.notifications.start();
  }

  ngOnDestroy(): void {
    this.notifications.stop();
  }

  /** Works out which page is showing from a URL like /dispatch/zones or /dispatch?tab=failed. */
  static pageFromUrl(url: string): DispatchPage {
    const [path, query = ''] = url.split('#')[0].split('?');
    if (/\/dispatch\/zones\/?$/.test(path)) return 'zones';
    if (/\/dispatch\/pricing\/?$/.test(path)) return 'pricing';
    if (/\/dispatch\/settings\/?$/.test(path)) return 'settings';
    const tab = new URLSearchParams(query).get('tab');
    if (tab === 'queue' || tab === 'failed' || tab === 'workload') return tab;
    if (tab) return 'queue';
    return 'home';
  }

  private syncPageFromUrl(url: string): void {
    this.portal.page.set(DispatchLayoutComponent.pageFromUrl(url));
  }

  badge(count: number): string {
    return count > 99 ? '99+' : String(count);
  }

  toggleNotifications(): void {
    this.notificationsOpen.update((open) => !open);
  }

  /** Opens the parcel's page with its tracking number in that page's search. */
  openNotification(n: DispatchNotification): void {
    this.notifications.markRead(n.id);
    this.notificationsOpen.set(false);
    this.portal.queries[n.kind].set(n.trackingNumber);
    this.router.navigate(['/dispatch'], { queryParams: { tab: n.kind } });
  }

  logout(): void {
    this.logoutConfirmOpen.set(false);
    if (this.authService) {
      this.authService.logout().subscribe({
        next: () => this.router.navigate(['/login']),
        error: () => this.router.navigate(['/login']),
      });
    } else {
      this.router.navigate(['/login']);
    }
  }

  @HostListener('document:click', ['$event'])
  closeOnOutsideClick(event: MouseEvent): void {
    const target = event.target as Element | null;
    if (this.notificationsOpen() && !target?.closest('#dispatch-notifications')) {
      this.notificationsOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.notificationsOpen.set(false);
    this.logoutConfirmOpen.set(false);
  }
}
