import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { AuthService } from 'shared-auth';
import { NotificationBellComponent } from './notification/notification-bell/notification-bell.component';
import { AdminSearchService } from './pages/admin/admin-search.service';
import { MerchantApprovalService } from './pages/admin/merchant-approval.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, NotificationBellComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  public authService = inject(AuthService);
  private readonly router = inject(Router);
  public readonly merchantApprovalService = inject(MerchantApprovalService);
  public readonly adminSearchService = inject(AdminSearchService);
  protected readonly title = signal('web');

  readonly pendingMerchantCount = computed(() => this.merchantApprovalService.pendingCount());
  readonly isNotificationOpen = signal(false);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects || e.url)
    ),
    { initialValue: this.router.url }
  );

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        this.closeAdminNotifications();
        if (!this.isAdminPage()) {
          this.adminSearchService.clear();
        }
        if (this.isAdminPage() && this.authService.hasRole('ADMIN')) {
          this.refreshMerchantPendingCount();
        }
      });
  }

  toggleAdminNotifications(): void {
    this.isNotificationOpen.update((open) => !open);
    if (this.isNotificationOpen()) {
      this.refreshMerchantPendingCount();
    }
  }

  closeAdminNotifications(): void {
    this.isNotificationOpen.set(false);
  }

  refreshMerchantPendingCount(): void {
    if (this.authService.hasRole('ADMIN')) {
      this.merchantApprovalService.loadPendingCount().subscribe({
        error: () => undefined,
      });
    }
  }

  isAuthPage(): boolean {
    const url = this.currentUrl() || this.router.url || '';
    const cleanUrl = url.split('?')[0].split('#')[0];
    return (
      cleanUrl === '' ||
      cleanUrl === '/' ||
      cleanUrl === '/login' ||
      cleanUrl === '/register' ||
      cleanUrl === '/merchant-registration' ||
      cleanUrl === '/forgot-password' ||
      cleanUrl === '/reset-password' ||
      cleanUrl === '/auth/callback' ||
      cleanUrl.startsWith('/auth/') ||
      cleanUrl === '/customer' ||
      cleanUrl.startsWith('/customer/') ||
      cleanUrl === '/courier' ||
      cleanUrl.startsWith('/courier/') ||
      cleanUrl === '/track' ||
      cleanUrl.startsWith('/track/') ||
      cleanUrl === '/dispatch' ||
      cleanUrl.startsWith('/dispatch/')
    );
  }

  isAdminPage(): boolean {
    const url = this.currentUrl() || this.router.url || '';
    const cleanUrl = url.split('?')[0].split('#')[0];
    return cleanUrl === '/admin' || cleanUrl.startsWith('/admin/');
  }

  isAdminSection(path: string): boolean {
    const url = this.currentUrl() || this.router.url || '';
    const cleanUrl = url.split('?')[0].split('#')[0];
    return path === '/admin' ? cleanUrl === path : cleanUrl.startsWith(path);
  }

  isMerchantPage(): boolean {
    const url = this.currentUrl() || this.router.url || '';
    const cleanUrl = url.split('?')[0].split('#')[0];
    return cleanUrl === '/merchant' || cleanUrl.startsWith('/merchant/');
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/']),
      error: () => this.router.navigate(['/']),
    });
  }
}
