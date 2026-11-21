import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from 'shared-auth';
import { DispatchPage, DispatchPortalState } from './dispatch-portal.state';
import { DispatchService } from './dispatch.service';

interface NavItem {
  page: DispatchPage;
  title: string;
  path: string;
  tab?: string;
}

/**
 * Shell for the whole dispatcher portal: one sidebar, one top header (search + profile) and a
 * router outlet for the six pages (home, queue, failed, workload, zones, pricing).
 */
@Component({
  selector: 'app-dispatch-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterOutlet],
  template: `
    <div class="w-full min-h-screen flex flex-col md:flex-row bg-white">
      <!-- Sidebar -->
      <aside
        class="w-full md:w-20 flex-shrink-0 flex md:flex-col items-center justify-between md:justify-start py-4 md:py-7 px-4 md:px-0 border-b md:border-b-0 md:border-r border-[#f0ebe5] bg-[#faf8f6] md:sticky md:top-0 md:h-screen md:space-y-7 z-20"
      >
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

        <nav class="flex md:flex-col items-center gap-3 sm:gap-4" aria-label="Dispatcher Navigation">
          @for (item of navItems; track item.page) {
            <a
              [routerLink]="item.path"
              [queryParams]="item.tab ? { tab: item.tab } : {}"
              [attr.id]="'tab-' + item.page + '-link'"
              [attr.aria-current]="portal.page() === item.page ? 'page' : null"
              [title]="item.title"
              class="rail-icon-btn relative w-10 h-10 rounded-xl flex items-center justify-center hover:text-[#a53a26] hover:bg-white transition-all cursor-pointer no-underline"
              [class.text-[#a53a26]]="portal.page() === item.page"
              [class.bg-white]="portal.page() === item.page"
              [class.shadow-xs]="portal.page() === item.page"
              [class.text-[#6f6d85]]="portal.page() !== item.page"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                @switch (item.page) {
                  @case ('home') {
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  }
                  @case ('queue') {
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                    <path d="M9 12h6"></path>
                    <path d="M9 16h6"></path>
                  }
                  @case ('failed') {
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  }
                  @case ('workload') {
                    <rect x="3" y="3" width="7" height="7" rx="2"></rect>
                    <rect x="14" y="3" width="7" height="7" rx="2"></rect>
                    <rect x="14" y="14" width="7" height="7" rx="2"></rect>
                    <rect x="3" y="14" width="7" height="7" rx="2"></rect>
                  }
                  @case ('zones') {
                    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
                    <line x1="8" y1="2" x2="8" y2="18"></line>
                    <line x1="16" y1="6" x2="16" y2="22"></line>
                  }
                  @case ('pricing') {
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                    <line x1="7" y1="7" x2="7.01" y2="7"></line>
                  }
                }
              </svg>
              @if (portal.page() === item.page) {
                <span class="hidden md:block absolute -right-[1px] top-2 bottom-2 w-1 bg-[#a53a26] rounded-l-full"></span>
              }
              @if (item.page === 'queue' && dispatchService.unassignedCount() > 0) {
                <span class="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#a53a26] text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                  {{ dispatchService.unassignedCount() }}
                </span>
              }
              @if (item.page === 'failed' && dispatchService.totalFailedCount() > 0) {
                <span class="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                  {{ dispatchService.totalFailedCount() }}
                </span>
              }
            </a>
          }
        </nav>

        <div class="hidden md:flex flex-col items-center gap-3 pt-4 md:!mt-auto pb-4 border-t border-[#f0ebe5]/60">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title="Live Sync Active"></span>
        </div>
      </aside>

      <main class="flex-1 min-h-screen p-6 sm:p-8 lg:p-10 space-y-7 min-w-0 bg-white">
        <!-- Top header: page-aware search + profile -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#f4efe9]">
          <div class="relative flex-1 max-w-lg">
            <svg
              class="w-4 h-4 text-[#a09eaf] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="search"
              id="top-quick-search-input"
              [ngModel]="portal.query()"
              (ngModelChange)="portal.setQuery($event)"
              [placeholder]="portal.placeholder()"
              [attr.aria-label]="portal.placeholder()"
              class="w-full h-10 pl-11 pr-4 rounded-full bg-[#faf8f6] border border-[#e8e2dc] text-xs font-semibold text-[#1d1b2c] focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 focus:border-[#a53a26] transition-all"
            />
          </div>

          <div class="relative self-end sm:self-auto">
            <button
              type="button"
              id="profile-menu-btn"
              (click)="profileMenuOpen.set(!profileMenuOpen())"
              class="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#faf8f6] border border-[#e8e2dc] hover:border-[#a53a26]/40 transition-colors cursor-pointer"
            >
              <span class="w-8 h-8 rounded-full bg-[#a53a26] text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                {{ initials() }}
              </span>
              <span class="text-xs font-bold text-[#1d1b2c]">{{ displayName() }}</span>
              <svg
                class="w-3.5 h-3.5 text-[#6f6d85] transition-transform"
                [class.rotate-180]="profileMenuOpen()"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            @if (profileMenuOpen()) {
              <div role="menu" class="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-[#e8e2dc] shadow-lg shadow-[#1d1b2c]/5 py-2 z-30">
                <div class="px-4 py-2 border-b border-[#f0ebe5]">
                  <p class="text-xs font-bold text-[#1d1b2c] truncate">{{ displayName() }}</p>
                  <p class="text-[11px] text-[#6f6d85] truncate">Role: DISPATCHER</p>
                </div>
                <button
                  type="button"
                  id="logout-btn"
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
            }
          </div>
        </div>

        <router-outlet />
      </main>
    </div>
  `,
})
export class DispatchLayoutComponent implements OnInit {
  readonly dispatchService = inject(DispatchService);
  readonly portal = inject(DispatchPortalState);
  private readonly authService = inject(AuthService, { optional: true });
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly profileMenuOpen = signal(false);

  readonly navItems: NavItem[] = [
    { page: 'home', title: 'Dispatcher Home', path: '/dispatch' },
    { page: 'queue', title: 'Unassigned Queue', path: '/dispatch', tab: 'queue' },
    { page: 'failed', title: 'Failed Deliveries', path: '/dispatch', tab: 'failed' },
    { page: 'workload', title: 'Courier Workload Board', path: '/dispatch', tab: 'workload' },
    { page: 'zones', title: 'Delivery Zones', path: '/dispatch/zones' },
    { page: 'pricing', title: 'Pricing Rules', path: '/dispatch/pricing' },
  ];

  readonly displayName = computed(() => this.authService?.currentUser?.()?.fullName || 'Dispatcher');
  readonly initials = computed(() =>
    this.displayName()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p.charAt(0))
      .join('') || 'DP'
  );

  ngOnInit(): void {
    this.syncPageFromUrl(this.router.url);
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((e) => {
        this.profileMenuOpen.set(false);
        this.syncPageFromUrl(e.urlAfterRedirects);
      });

    // Zones and pricing pages don't load parcels themselves; load once so sidebar badges show.
    if (this.portal.page() === 'zones' || this.portal.page() === 'pricing') {
      this.dispatchService.loadUnassignedParcels(undefined, undefined, 0, 100).subscribe({ error: () => {} });
      this.dispatchService.loadFailedParcels(undefined, undefined, 0, 100).subscribe({ error: () => {} });
    }
  }

  /** Works out which of the six pages is showing from a URL like /dispatch/zones or /dispatch?tab=failed. */
  static pageFromUrl(url: string): DispatchPage {
    const tree = url.split('#')[0];
    const [path, query = ''] = tree.split('?');
    if (/\/dispatch\/zones\/?$/.test(path)) return 'zones';
    if (/\/dispatch\/pricing\/?$/.test(path)) return 'pricing';
    const tab = new URLSearchParams(query).get('tab');
    if (tab === 'queue' || tab === 'failed' || tab === 'workload') return tab;
    if (tab) return 'queue';
    return 'home';
  }

  private syncPageFromUrl(url: string): void {
    this.portal.page.set(DispatchLayoutComponent.pageFromUrl(url));
  }

  logout(): void {
    if (this.authService) {
      this.authService.logout().subscribe({
        next: () => this.router.navigate(['/login']),
        error: () => this.router.navigate(['/login']),
      });
    } else {
      this.router.navigate(['/login']);
    }
  }
}
