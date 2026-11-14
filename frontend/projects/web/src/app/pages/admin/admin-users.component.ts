import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from 'shared-auth';
import {
  CreateStaffUserRequest,
  UserSummary,
} from './admin-users.model';
import { AdminUsersService } from './admin-users.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="max-w-7xl mx-auto space-y-6 pb-16 px-4 sm:px-6">
      <!-- Top Bar Header (SwiftDrop Brand Theme) -->
      <div
        class="bg-white rounded-2xl shadow-sm border border-[#f0ebe5] p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div class="flex items-center gap-3.5">
          <div
            class="w-12 h-12 rounded-2xl bg-[#a53a26] flex items-center justify-center text-white shadow-md shadow-[#a53a26]/20 text-xl font-black"
          >
            <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-xl sm:text-2xl font-extrabold text-[#1d1b2c] tracking-tight">
                Staff User Administration
              </h1>
              <span
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#a53a26]/10 text-[#a53a26] border border-[#a53a26]/20"
              >
                ADMIN Only • Port 8081
              </span>
            </div>
            <p class="text-xs sm:text-sm text-[#6f6d85] font-medium mt-0.5">
              SwiftDrop Governance: Provision & Manage COURIER and DISPATCHER Accounts
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <a
            routerLink="/admin"
            class="px-4 py-2.5 rounded-xl border border-[#f0ebe5] text-[#6f6d85] hover:text-[#1d1b2c] hover:bg-[#faf8f6] text-sm font-semibold transition-colors"
          >
            ← Admin Overview
          </a>
          <button
            type="button"
            id="open-create-user-modal-btn"
            (click)="openCreateUserModal()"
            class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#a53a26] hover:bg-[#8c2e1d] text-white font-semibold text-sm shadow-sm shadow-[#a53a26]/20 transition-colors cursor-pointer"
          >
            <span>➕</span>
            <span>Provision Staff Member</span>
          </button>
        </div>
      </div>

      <!-- Toast Feedback -->
      <div
        *ngIf="toastMessage()"
        class="p-4 rounded-xl text-sm font-semibold flex items-center justify-between border animate-fade-in"
        [class.bg-emerald-50]="toastType() === 'success'"
        [class.text-emerald-800]="toastType() === 'success'"
        [class.border-emerald-200]="toastType() === 'success'"
        [class.bg-rose-50]="toastType() === 'error'"
        [class.text-rose-800]="toastType() === 'error'"
        [class.border-rose-200]="toastType() === 'error'"
      >
        <div class="flex items-center gap-2">
          <span>{{ toastType() === 'success' ? '✅' : '⚠️' }}</span>
          <span>{{ toastMessage() }}</span>
        </div>
        <button
          type="button"
          (click)="toastMessage.set(null)"
          class="text-xs hover:opacity-75 font-bold cursor-pointer"
        >
          ✕
        </button>
      </div>

      <!-- Error State Alert & Retry -->
      <div
        *ngIf="adminUsersService.error() && !adminUsersService.loading()"
        id="admin-users-error"
        class="p-4 rounded-xl text-sm font-semibold flex items-center justify-between border bg-rose-50 text-rose-800 border-rose-200"
      >
        <div class="flex items-center gap-2">
          <span>⚠️</span>
          <span>{{ adminUsersService.error() }}</span>
        </div>
        <button
          type="button"
          id="admin-users-retry-btn"
          (click)="reloadUsers()"
          class="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors cursor-pointer"
        >
          Retry
        </button>
      </div>

      <!-- User Filters & Total Stats -->
      <div
        class="bg-white rounded-2xl shadow-sm border border-[#f0ebe5] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div class="flex items-center gap-3 flex-1 flex-wrap">
          <select
            id="user-role-filter"
            [ngModel]="userRoleFilter()"
            (ngModelChange)="onRoleFilterChange($event)"
            class="px-3.5 py-2 rounded-xl border border-[#f0ebe5] text-sm focus:outline-none focus:ring-2 focus:ring-[#a53a26] bg-[#faf8f6] text-[#1d1b2c] font-medium"
          >
            <option value="">All Roles</option>
            <option value="ADMIN">ADMIN</option>
            <option value="DISPATCHER">DISPATCHER</option>
            <option value="COURIER">COURIER</option>
          </select>

          <select
            id="user-status-filter"
            [ngModel]="userStatusFilter()"
            (ngModelChange)="onStatusFilterChange($event)"
            class="px-3.5 py-2 rounded-xl border border-[#f0ebe5] text-sm focus:outline-none focus:ring-2 focus:ring-[#a53a26] bg-[#faf8f6] text-[#1d1b2c] font-medium"
          >
            <option value="">All Statuses</option>
            <option value="true">Active Accounts Only</option>
            <option value="false">Disabled Accounts Only</option>
          </select>

          <button
            type="button"
            (click)="reloadUsers()"
            class="px-3.5 py-2 rounded-xl border border-[#f0ebe5] text-[#6f6d85] hover:text-[#1d1b2c] hover:bg-[#faf8f6] text-xs font-semibold transition-colors cursor-pointer"
            title="Refresh User List"
          >
            🔄 Refresh
          </button>
        </div>

        <p class="text-xs text-[#6f6d85] font-medium">
          Total Staff & Users: <strong class="text-[#1d1b2c]">{{ adminUsersService.totalElements() }}</strong>
        </p>
      </div>

      <!-- Loading State -->
      <div
        *ngIf="adminUsersService.loading()"
        id="admin-users-loading"
        class="bg-white rounded-2xl border border-[#f0ebe5] p-12 text-center shadow-sm"
      >
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#a53a26] border-t-transparent mb-3"></div>
        <p class="text-sm font-semibold text-[#6f6d85]">Loading user accounts from auth service...</p>
      </div>

      <!-- Users Table -->
      <div
        *ngIf="!adminUsersService.loading()"
        class="bg-white rounded-2xl border border-[#f0ebe5] shadow-sm overflow-hidden"
      >
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs sm:text-sm">
            <thead
              class="bg-[#faf8f6] border-b border-[#f0ebe5] text-[#6f6d85] font-bold uppercase tracking-wider text-[11px]"
            >
              <tr>
                <th class="px-5 py-3.5">User</th>
                <th class="px-5 py-3.5">Phone Number</th>
                <th class="px-5 py-3.5">Role</th>
                <th class="px-5 py-3.5">Status</th>
                <th class="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#f0ebe5] text-[#1d1b2c]">
              <tr
                *ngFor="let user of adminUsersService.users()"
                class="hover:bg-[#faf8f6] transition-colors"
              >
                <td class="px-5 py-4">
                  <div class="font-extrabold text-[#1d1b2c]">{{ user.fullName }}</div>
                  <div class="text-xs text-[#6f6d85] font-medium">{{ user.email }}</div>
                </td>
                <td class="px-5 py-4 font-mono text-xs text-[#6f6d85]">
                  {{ user.phoneNumber }}
                </td>
                <td class="px-5 py-4">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border"
                    [class.bg-[#a53a26]/10]="user.role === 'ADMIN'"
                    [class.text-[#a53a26]]="user.role === 'ADMIN'"
                    [class.border-[#a53a26]/20]="user.role === 'ADMIN'"
                    [class.bg-blue-50]="user.role === 'DISPATCHER'"
                    [class.text-blue-700]="user.role === 'DISPATCHER'"
                    [class.border-blue-200]="user.role === 'DISPATCHER'"
                    [class.bg-emerald-50]="user.role === 'COURIER'"
                    [class.text-emerald-700]="user.role === 'COURIER'"
                    [class.border-emerald-200]="user.role === 'COURIER'"
                  >
                    {{ user.role }}
                  </span>
                </td>
                <td class="px-5 py-4">
                  <span
                    class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold"
                    [class.bg-emerald-50]="user.enabled"
                    [class.text-emerald-700]="user.enabled"
                    [class.bg-rose-50]="!user.enabled"
                    [class.text-rose-700]="!user.enabled"
                  >
                    <span>{{ user.enabled ? '●' : '○' }}</span>
                    <span>{{ user.enabled ? 'Active' : 'Disabled' }}</span>
                  </span>
                </td>
                <td class="px-5 py-4 text-right">
                  <button
                    type="button"
                    [attr.id]="'toggle-user-' + user.id + '-btn'"
                    [disabled]="updatingUserId() === user.id"
                    (click)="toggleUserStatus(user)"
                    class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    [class.border-rose-200]="user.enabled"
                    [class.text-rose-600]="user.enabled"
                    [class.hover:bg-rose-50]="user.enabled"
                    [class.border-emerald-200]="!user.enabled"
                    [class.text-emerald-600]="!user.enabled"
                    [class.hover:bg-emerald-50]="!user.enabled"
                  >
                    <span *ngIf="updatingUserId() === user.id">Updating...</span>
                    <span *ngIf="updatingUserId() !== user.id">
                      {{ user.enabled ? 'Disable Account' : 'Enable Account' }}
                    </span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div
          *ngIf="adminUsersService.users().length === 0"
          id="admin-users-empty"
          class="p-12 text-center text-[#6f6d85]"
        >
          <p class="text-base font-bold text-[#1d1b2c]">No users found</p>
          <p class="text-xs text-[#6f6d85] mt-1">Try clearing or adjusting your search filters.</p>
        </div>

        <!-- Pagination Controls -->
        <div
          *ngIf="adminUsersService.totalPages() > 1"
          class="p-4 bg-[#faf8f6] border-t border-[#f0ebe5] flex items-center justify-between text-xs"
        >
          <span id="page-info" class="text-[#6f6d85] font-medium">
            Page <strong>{{ adminUsersService.currentPage() + 1 }}</strong> of <strong>{{ adminUsersService.totalPages() }}</strong>
            ({{ adminUsersService.totalElements() }} users)
          </span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              id="prev-page-btn"
              [disabled]="adminUsersService.currentPage() === 0"
              (click)="goToPage(adminUsersService.currentPage() - 1)"
              class="px-3 py-1.5 rounded-lg border border-[#f0ebe5] bg-white font-semibold text-[#1d1b2c] hover:bg-[#faf8f6] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Previous
            </button>
            <button
              type="button"
              id="next-page-btn"
              [disabled]="adminUsersService.currentPage() >= adminUsersService.totalPages() - 1"
              (click)="goToPage(adminUsersService.currentPage() + 1)"
              class="px-3 py-1.5 rounded-lg border border-[#f0ebe5] bg-white font-semibold text-[#1d1b2c] hover:bg-[#faf8f6] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <!-- ================================================================= -->
      <!-- MODAL: CREATE STAFF USER (COURIER / DISPATCHER) -->
      <!-- ================================================================= -->
      <div
        *ngIf="isCreateUserModalOpen()"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1d1b2c]/40 backdrop-blur-sm animate-fade-in"
      >
        <div
          class="bg-white rounded-2xl shadow-xl border border-[#f0ebe5] w-full max-w-md p-6 space-y-4"
        >
          <div class="flex items-center justify-between border-b border-[#f0ebe5] pb-3">
            <div>
              <h3 class="text-base font-extrabold text-[#1d1b2c]">Provision Staff Account</h3>
              <p class="text-xs text-[#6f6d85]">Create a COURIER or DISPATCHER account (Decision 001)</p>
            </div>
            <button
              type="button"
              (click)="closeCreateUserModal()"
              class="w-8 h-8 rounded-lg flex items-center justify-center text-[#6f6d85] hover:text-[#1d1b2c] hover:bg-[#faf8f6] text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>

          <!-- Modal Error Banner -->
          <div
            *ngIf="modalError()"
            class="p-3 rounded-xl text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200"
          >
            ⚠️ {{ modalError() }}
          </div>

          <form (ngSubmit)="submitCreateStaffUser()" class="space-y-3.5">
            <div>
              <label class="block text-xs font-bold text-[#1d1b2c] mb-1">Full Name</label>
              <input
                type="text"
                id="staff-fullname-input"
                [(ngModel)]="newUserFullName"
                name="fullName"
                required
                placeholder="e.g. Sunil Perera"
                class="w-full px-3.5 py-2.5 rounded-xl border border-[#f0ebe5] text-sm focus:outline-none focus:ring-2 focus:ring-[#a53a26] bg-[#faf8f6] text-[#1d1b2c]"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-[#1d1b2c] mb-1">Email Address</label>
              <input
                type="email"
                id="staff-email-input"
                [(ngModel)]="newUserEmail"
                name="email"
                required
                placeholder="e.g. courier.sunil@swiftdrop.lk"
                class="w-full px-3.5 py-2.5 rounded-xl border border-[#f0ebe5] text-sm focus:outline-none focus:ring-2 focus:ring-[#a53a26] bg-[#faf8f6] text-[#1d1b2c]"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-[#1d1b2c] mb-1">
                Phone Number <span class="text-[#6f6d85] font-normal">(10-14 digits, e.g. +94771234567)</span>
              </label>
              <input
                type="text"
                id="staff-phone-input"
                [(ngModel)]="newUserPhone"
                name="phoneNumber"
                required
                placeholder="+94771234567"
                class="w-full px-3.5 py-2.5 rounded-xl border border-[#f0ebe5] text-sm focus:outline-none focus:ring-2 focus:ring-[#a53a26] bg-[#faf8f6] text-[#1d1b2c]"
              />
              <p
                *ngIf="newUserPhone && !isPhoneValid()"
                class="text-[11px] text-rose-600 font-medium mt-1"
              >
                Phone number must be 10–14 digits with optional leading '+'
              </p>
            </div>

            <div>
              <label class="block text-xs font-bold text-[#1d1b2c] mb-1">
                Password <span class="text-[#6f6d85] font-normal">(min 8 characters)</span>
              </label>
              <input
                type="password"
                id="staff-password-input"
                [(ngModel)]="newUserPassword"
                name="password"
                required
                placeholder="Minimum 8 characters"
                class="w-full px-3.5 py-2.5 rounded-xl border border-[#f0ebe5] text-sm focus:outline-none focus:ring-2 focus:ring-[#a53a26] bg-[#faf8f6] text-[#1d1b2c]"
              />
              <p
                *ngIf="newUserPassword && newUserPassword.length < 8"
                class="text-[11px] text-rose-600 font-medium mt-1"
              >
                Password must be at least 8 characters
              </p>
            </div>

            <div>
              <label class="block text-xs font-bold text-[#1d1b2c] mb-1">Staff Role</label>
              <select
                id="staff-role-select"
                [(ngModel)]="newUserRole"
                name="role"
                class="w-full px-3.5 py-2.5 rounded-xl border border-[#f0ebe5] text-sm focus:outline-none focus:ring-2 focus:ring-[#a53a26] bg-[#faf8f6] text-[#1d1b2c] font-medium"
              >
                <option value="COURIER">COURIER (Delivery Personnel)</option>
                <option value="DISPATCHER">DISPATCHER (Queue & Workload Manager)</option>
              </select>
            </div>

            <!-- Modal Action Buttons -->
            <div class="pt-3 border-t border-[#f0ebe5] flex items-center justify-end gap-2">
              <button
                type="button"
                (click)="closeCreateUserModal()"
                class="px-4 py-2 rounded-xl text-xs font-semibold text-[#6f6d85] hover:bg-[#faf8f6] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="submit-staff-btn"
                [disabled]="!isFormValid() || isSubmitting()"
                class="px-5 py-2 rounded-xl bg-[#a53a26] hover:bg-[#8c2e1d] text-white text-xs font-bold shadow-sm shadow-[#a53a26]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span *ngIf="isSubmitting()">Provisioning...</span>
                <span *ngIf="!isSubmitting()">Provision Account</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class AdminUsersComponent implements OnInit, OnDestroy {
  public adminUsersService = inject(AdminUsersService);
  public authService = inject(AuthService, { optional: true });

  public userRoleFilter = signal('');
  public userStatusFilter = signal('');
  public isCreateUserModalOpen = signal(false);
  public isSubmitting = signal(false);
  public updatingUserId = signal<string | null>(null);
  public modalError = signal<string | null>(null);

  // Form State
  public newUserFullName = '';
  public newUserEmail = '';
  public newUserPhone = '';
  public newUserPassword = '';
  public newUserRole: 'COURIER' | 'DISPATCHER' = 'COURIER';

  // Toast State
  public toastMessage = signal<string | null>(null);
  public toastType = signal<'success' | 'error'>('success');

  private toastTimeout: any;

  ngOnInit(): void {
    this.reloadUsers();
  }

  ngOnDestroy(): void {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
  }

  public reloadUsers(page: number = 0): void {
    const role = this.userRoleFilter() || undefined;
    const statusVal = this.userStatusFilter();
    const enabled = statusVal !== '' ? statusVal === 'true' : undefined;

    this.adminUsersService.loadUsers(page, 20, role, enabled).subscribe({
      error: () => {
        // error signal in service is automatically updated
      },
    });
  }

  public onRoleFilterChange(newRole: string): void {
    this.userRoleFilter.set(newRole);
    this.reloadUsers(0);
  }

  public onStatusFilterChange(newStatus: string): void {
    this.userStatusFilter.set(newStatus);
    this.reloadUsers(0);
  }

  public goToPage(page: number): void {
    if (page >= 0 && page < this.adminUsersService.totalPages()) {
      this.reloadUsers(page);
    }
  }

  public toggleUserStatus(user: UserSummary): void {
    if (this.updatingUserId()) {
      return; // prevent duplicate clicks
    }

    this.updatingUserId.set(user.id);
    const targetStatus = !user.enabled;

    this.adminUsersService.updateUserStatus(user.id, targetStatus).subscribe({
      next: (updated) => {
        this.updatingUserId.set(null);
        this.showToast(
          `User account ${user.email} is now ${updated.enabled ? 'Active' : 'Disabled'}.`,
          'success'
        );
      },
      error: (err) => {
        this.updatingUserId.set(null);
        const errorMsg =
          err?.error?.message ||
          err?.message ||
          `Failed to update status for ${user.email}.`;
        this.showToast(errorMsg, 'error');
      },
    });
  }

  public isPhoneValid(): boolean {
    const phone = this.newUserPhone.trim();
    return /^\+?[0-9]{10,14}$/.test(phone);
  }

  public isFormValid(): boolean {
    return (
      this.newUserFullName.trim().length > 0 &&
      this.newUserEmail.trim().includes('@') &&
      this.isPhoneValid() &&
      this.newUserPassword.length >= 8 &&
      (this.newUserRole === 'COURIER' || this.newUserRole === 'DISPATCHER')
    );
  }

  public openCreateUserModal(): void {
    this.modalError.set(null);
    this.isCreateUserModalOpen.set(true);
  }

  public closeCreateUserModal(): void {
    this.isCreateUserModalOpen.set(false);
    this.modalError.set(null);
  }

  public submitCreateStaffUser(): void {
    if (!this.isFormValid() || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.modalError.set(null);

    const payload: CreateStaffUserRequest = {
      fullName: this.newUserFullName.trim(),
      email: this.newUserEmail.trim().toLowerCase(),
      phoneNumber: this.newUserPhone.trim(),
      password: this.newUserPassword,
      role: this.newUserRole,
    };

    this.adminUsersService.createStaffUser(payload).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.showToast(
          `Staff account for ${created.fullName} (${created.role}) created successfully!`,
          'success'
        );

        // Clear password and form inputs on confirmed success
        this.newUserFullName = '';
        this.newUserEmail = '';
        this.newUserPhone = '';
        this.newUserPassword = '';
        this.closeCreateUserModal();

        // Refresh users to reconcile authoritative backend list
        this.reloadUsers(this.adminUsersService.currentPage());
      },
      error: (err) => {
        this.isSubmitting.set(false);
        let errorMsg =
          err?.error?.message ||
          err?.message ||
          'Failed to create staff account.';

        if (err?.status === 409) {
          errorMsg = `Email '${payload.email}' already exists. Please choose a different email.`;
        } else if (err?.status === 400) {
          errorMsg = err?.error?.message || 'Invalid input: only COURIER and DISPATCHER staff roles are permitted.';
        }

        this.modalError.set(errorMsg);
        this.showToast(errorMsg, 'error');
        // Do NOT close modal or clear entered values, allowing correction
      },
    });
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toastMessage.set(message);
    this.toastType.set(type);
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastTimeout = setTimeout(() => {
      this.toastMessage.set(null);
    }, 4500);
  }
}
