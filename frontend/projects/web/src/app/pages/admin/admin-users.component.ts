import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from 'shared-auth';
import { AdminSearchService } from './admin-search.service';
import {
  CreateStaffUserRequest,
  DeliveryZoneOption,
  UserSummary,
} from './admin-users.model';
import { AdminUsersService } from './admin-users.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="mx-auto max-w-[1320px] px-4 py-3 sm:px-6 lg:px-8 space-y-6 pb-16 text-[#211f32]">
      <!-- Top Bar Header -->
      <div
        class="mt-8 flex flex-col justify-between gap-4 rounded-[1.5rem] border border-[#e9e3dd] bg-white p-7 shadow-[0_8px_24px_rgba(42,32,25,0.04)] md:flex-row md:items-center"
      >
        <div class="flex items-center gap-4">
          <div
            class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#9b432f] text-xl font-black text-white shadow-[0_8px_18px_rgba(155,67,47,0.2)]"
          >
            <span class="h-6 w-6 bg-current [mask-image:url('/staff-admin-icon.png')] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] [-webkit-mask-image:url('/staff-admin-icon.png')] [-webkit-mask-position:center] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:contain]" aria-hidden="true"></span>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-2xl font-black tracking-tight text-[#211f32]">
                Staff User Administration
              </h1>
              <span
                class="inline-flex items-center rounded-full border border-[#efcfc3] bg-[#fff5ef] px-2 py-0.5 text-xs font-bold text-[#9b432f]"
              >
                ADMIN Only
              </span>
            </div>
            <p class="text-xs font-medium text-[#77748a] sm:text-sm">
              SwiftDrop Governance: Provision & Manage COURIER and DISPATCHER Accounts
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <a
            routerLink="/admin"
            class="rounded-full border border-[#e8e4df] px-4 py-2.5 text-sm font-bold text-[#77748a] transition hover:border-[#d7b4a7] hover:text-[#9b432f]"
          >
            ← Admin Overview
          </a>
          <button
            type="button"
            id="open-create-user-modal-btn"
            (click)="openCreateUserModal()"
            class="inline-flex items-center justify-center gap-2 rounded-full bg-[#9b432f] px-4 py-2.5 text-sm font-bold text-white shadow-[0_7px_16px_rgba(155,67,47,0.18)] transition hover:bg-[#833724]"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
            <span>Provision Staff Member</span>
          </button>
        </div>
      </div>

      <!-- Toast Feedback -->
      <div
        *ngIf="toastMessage()"
        class="flex items-center justify-between rounded-2xl border p-4 text-sm font-semibold animate-fade-in"
        [class.bg-green-50]="toastType() === 'success'"
        [class.text-green-800]="toastType() === 'success'"
        [class.border-green-200]="toastType() === 'success'"
        [class.bg-red-50]="toastType() === 'error'"
        [class.text-red-800]="toastType() === 'error'"
        [class.border-red-200]="toastType() === 'error'"
      >
        <div class="flex items-center gap-2">
          <svg *ngIf="toastType() === 'success'" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>
          <svg *ngIf="toastType() === 'error'" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5M12 17h.01"/></svg>
          <span>{{ toastMessage() }}</span>
        </div>
        <button
          type="button"
          (click)="toastMessage.set(null)"
          class="text-xs hover:opacity-75 font-bold"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
        </button>
      </div>

      <!-- Error State Alert & Retry -->
      <div
        *ngIf="adminUsersService.error() && !adminUsersService.loading()"
        id="admin-users-error"
        class="flex items-center justify-between rounded-2xl border border-[#efc7c2] bg-[#fff4f2] p-4 text-sm font-semibold text-[#b23b32]"
      >
        <div class="flex items-center gap-2">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5M12 17h.01"/></svg>
          <span>{{ adminUsersService.error() }}</span>
        </div>
        <button
          type="button"
          id="admin-users-retry-btn"
          (click)="reloadUsers()"
          class="rounded-full bg-[#b23b32] px-3 py-1 text-xs font-bold text-white transition hover:bg-[#922d27]"
        >
          Retry
        </button>
      </div>

      <!-- User Filters & Total Stats -->
      <div
        class="mt-6 mb-6 flex flex-col justify-between gap-3 rounded-[1.5rem] border border-[#e9e3dd] bg-white p-5 shadow-[0_8px_24px_rgba(42,32,25,0.04)] sm:flex-row sm:items-center"
      >
        <div class="flex items-center gap-3 flex-1 flex-wrap">
          <select
            id="user-role-filter"
            [ngModel]="userRoleFilter()"
            (ngModelChange)="onRoleFilterChange($event)"
            class="rounded-full border border-[#e8e4df] bg-[#fbfaf8] px-3 py-2 text-sm outline-none focus:border-[#9b432f] focus:ring-2 focus:ring-[#f2e4de]"
          >
            <option value="">All Roles</option>
            <option value="CUSTOMER">CUSTOMER</option>
            <option value="MERCHANT">MERCHANT</option>
            <option value="DISPATCHER">DISPATCHER</option>
            <option value="COURIER">COURIER</option>
          </select>

          <select
            id="user-status-filter"
            [ngModel]="userStatusFilter()"
            (ngModelChange)="onStatusFilterChange($event)"
            class="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">All Statuses</option>
            <option value="true">Active Accounts Only</option>
            <option value="false">Disabled Accounts Only</option>
          </select>

          <button
            type="button"
            (click)="reloadUsers()"
            class="inline-flex items-center gap-1.5 rounded-full border border-[#e8e4df] bg-[#fbfaf8] px-3.5 py-2 text-xs font-bold text-[#77748a] transition hover:border-[#d7b4a7] hover:text-[#9b432f]"
            title="Refresh User List"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.8-4L3 10"/><path d="M3 5v5h5"/><path d="M4 13a8 8 0 0 0 14.8 4L21 14"/><path d="M21 19v-5h-5"/></svg>
            <span>Refresh</span>
          </button>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          @if (adminSearchService.query().trim()) {
            <span class="text-xs font-medium text-[#77748a]">
              Showing <strong class="text-[#211f32]">{{ filteredUsers().length }}</strong> of
            </span>
          }
          <div class="flex flex-wrap items-center gap-2 text-xs font-medium text-[#77748a]">
            <span>Merchants: <strong class="font-bold text-[#211f32]">{{ roleCounts().MERCHANT ?? 0 }}</strong></span>
            <span class="text-[#ccc8d6]">•</span>
            <span>Dispatchers: <strong class="font-bold text-[#211f32]">{{ roleCounts().DISPATCHER ?? 0 }}</strong></span>
            <span class="text-[#ccc8d6]">•</span>
            <span>Couriers: <strong class="font-bold text-[#211f32]">{{ roleCounts().COURIER ?? 0 }}</strong></span>
            <span class="text-[#ccc8d6]">•</span>
            <span>Users: <strong class="font-bold text-[#211f32]">{{ roleCounts().CUSTOMER ?? 0 }}</strong></span>
          </div>
          @if (adminSearchService.query().trim()) {
            <button
              type="button"
              (click)="adminSearchService.clear()"
              class="rounded-full border border-[#e8e4df] px-2.5 py-1 text-[11px] font-bold text-[#9b432f] hover:bg-[#fff5ef]"
            >
              Clear Search
            </button>
          }
        </div>
      </div>

      <!-- Loading State -->
      <div
        *ngIf="adminUsersService.loading()"
        id="admin-users-loading"
        class="mt-6 rounded-[1.5rem] border border-[#e9e3dd] bg-white p-12 text-center shadow-[0_8px_24px_rgba(42,32,25,0.04)]"
      >
        <div class="mb-3 inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#9b432f] border-t-transparent"></div>
        <p class="text-sm font-semibold text-[#77748a]">Loading user accounts from auth service...</p>
      </div>

      <!-- Users Table -->
      <div
        *ngIf="!adminUsersService.loading()"
        class="mt-6 overflow-hidden rounded-[1.5rem] border border-[#e9e3dd] bg-white shadow-[0_8px_24px_rgba(42,32,25,0.04)]"
      >
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs sm:text-sm">
            <thead
              class="border-b border-[#eeeae5] bg-[#f8f6f3] text-[11px] font-bold uppercase tracking-wider text-[#77748a]"
            >
              <tr>
                <th class="px-5 py-3.5">User</th>
                <th class="px-5 py-3.5">Phone Number</th>
                <th class="px-5 py-3.5">Role</th>
                <th class="px-5 py-3.5">Zone</th>
                <th class="px-5 py-3.5">Status</th>
                <th class="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#eeeae5] text-[#211f32]">
              <tr
                *ngFor="let user of filteredUsers()"
                class="transition-colors hover:bg-[#fffaf7]"
              >
                <td class="px-5 py-4">
                  <div class="font-extrabold text-slate-900">{{ user.fullName }}</div>
                  <div class="text-xs text-slate-400 font-medium">{{ user.email }}</div>
                </td>
                <td class="px-5 py-4 font-mono text-xs text-slate-600">
                  {{ user.phoneNumber }}
                </td>
                <td class="px-5 py-4">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border"
                    [class.bg-purple-50]="user.role === 'ADMIN'"
                    [class.text-purple-700]="user.role === 'ADMIN'"
                    [class.border-purple-200]="user.role === 'ADMIN'"
                    [class.bg-blue-50]="user.role === 'DISPATCHER'"
                    [class.text-blue-700]="user.role === 'DISPATCHER'"
                    [class.border-blue-200]="user.role === 'DISPATCHER'"
                    [class.bg-emerald-50]="user.role === 'COURIER'"
                    [class.text-emerald-700]="user.role === 'COURIER'"
                    [class.border-emerald-200]="user.role === 'COURIER'"
                    [class.bg-amber-50]="user.role === 'MERCHANT'"
                    [class.text-amber-700]="user.role === 'MERCHANT'"
                    [class.border-amber-200]="user.role === 'MERCHANT'"
                    [class.bg-slate-50]="user.role === 'CUSTOMER'"
                    [class.text-slate-600]="user.role === 'CUSTOMER'"
                    [class.border-slate-200]="user.role === 'CUSTOMER'"
                  >
                    {{ user.role }}
                  </span>
                </td>
                <td class="px-5 py-4">
                  <span
                    *ngIf="user.zone"
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#fff5ef] text-[#9b432f] border border-[#efcfc3]"
                  >
                    {{ user.zone }}
                  </span>
                  <span *ngIf="!user.zone" class="text-xs text-slate-400 font-medium">
                    —
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
                  <!-- Loading / Updating state -->
                  <span
                    *ngIf="updatingUserId() === user.id"
                    class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-500"
                  >
                    Updating...
                  </span>

                  <!-- Action Button (Triggers Confirmation Modal) -->
                  <button
                    *ngIf="updatingUserId() !== user.id"
                    type="button"
                    [attr.id]="'toggle-user-' + user.id + '-btn'"
                    (click)="startConfirmToggle(user)"
                    class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer"
                    [class.border-rose-200]="user.enabled"
                    [class.text-rose-600]="user.enabled"
                    [class.hover:bg-rose-50]="user.enabled"
                    [class.border-emerald-200]="!user.enabled"
                    [class.text-emerald-600]="!user.enabled"
                    [class.hover:bg-emerald-50]="!user.enabled"
                  >
                    {{ user.enabled ? 'Disable Account' : 'Enable Account' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Search Empty State -->
        <div
          *ngIf="filteredUsers().length === 0 && adminUsersService.users().length > 0"
          id="admin-users-search-empty"
          class="p-12 text-center text-slate-500"
        >
          <div class="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-400">
            <span class="text-lg">⌕</span>
          </div>
          <p class="text-base font-bold text-slate-700">No matching staff accounts found</p>
          <p class="text-xs text-slate-400 mt-1">
            No accounts match "{{ adminSearchService.query() }}". Try a different name, email, or phone.
          </p>
          <button
            type="button"
            (click)="adminSearchService.clear()"
            class="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#e8e4df] bg-white px-3 py-1.5 text-xs font-bold text-[#9b432f] hover:bg-[#fff5ef]"
          >
            Clear Search
          </button>
        </div>

        <!-- Empty State -->
        <div
          *ngIf="adminUsersService.users().length === 0"
          id="admin-users-empty"
          class="p-12 text-center text-slate-500"
        >
          <p class="text-base font-bold text-slate-700">No users found</p>
          <p class="text-xs text-slate-400 mt-1">Try clearing or adjusting your search filters.</p>
        </div>

        <!-- Pagination Controls -->
        <div
          *ngIf="adminUsersService.totalPages() > 1"
          class="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs"
        >
          <span id="page-info" class="text-slate-500 font-medium">
            Page <strong>{{ adminUsersService.currentPage() + 1 }}</strong> of <strong>{{ adminUsersService.totalPages() }}</strong>
            ({{ adminUsersService.totalElements() }} users)
          </span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              id="prev-page-btn"
              [disabled]="adminUsersService.currentPage() === 0"
              (click)="goToPage(adminUsersService.currentPage() - 1)"
              class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              type="button"
              id="next-page-btn"
              [disabled]="adminUsersService.currentPage() >= adminUsersService.totalPages() - 1"
              (click)="goToPage(adminUsersService.currentPage() + 1)"
              class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <!-- ================================================================= -->
      <!-- MODAL: CONFIRM TOGGLE USER STATUS (MATCHING LOGOUT DIALOG UI) -->
      <!-- ================================================================= -->
      @if (pendingConfirmUser(); as confirmUser) {
        <div
          class="fixed inset-0 !mt-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in"
          (click)="cancelConfirmToggle()"
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-toggle-user-title"
            aria-describedby="confirm-toggle-user-desc"
            class="w-full max-w-sm rounded-3xl bg-white border border-[#eee7e0] shadow-xl p-6 space-y-5"
            (click)="$event.stopPropagation()"
          >
            <div
              class="w-12 h-12 rounded-2xl flex items-center justify-center"
              [class.bg-[#faf6f0]]="confirmUser.enabled"
              [class.text-[#9b432f]]="confirmUser.enabled"
              [class.bg-emerald-50]="!confirmUser.enabled"
              [class.text-emerald-600]="!confirmUser.enabled"
            >
              <!-- User Status Toggle Icon in rounded-2xl container like logout dialog -->
              <svg *ngIf="confirmUser.enabled" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
              </svg>
              <svg *ngIf="!confirmUser.enabled" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>

            <div>
              <h3 id="confirm-toggle-user-title" class="text-base font-black text-[#1d1b2c]">
                {{ confirmUser.enabled ? 'Disable staff account?' : 'Enable staff account?' }}
              </h3>
              <p id="confirm-toggle-user-desc" class="text-xs text-[#6f6d85] font-medium mt-1">
                {{ confirmUser.enabled
                  ? 'Are you sure you want to disable ' + confirmUser.fullName + ' (' + confirmUser.email + ')? The user will no longer be able to sign in.'
                  : 'Are you sure you want to enable ' + confirmUser.fullName + ' (' + confirmUser.email + ')? The user will regain access to the administration portal.' }}
              </p>
            </div>

            <div class="flex justify-end gap-3">
              <button
                type="button"
                [attr.id]="'cancel-toggle-user-' + confirmUser.id + '-btn'"
                (click)="cancelConfirmToggle()"
                class="px-5 py-2.5 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#1d1b2c] text-xs font-bold rounded-full transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                [attr.id]="'confirm-toggle-user-' + confirmUser.id + '-btn'"
                (click)="confirmToggleUserStatus(confirmUser)"
                class="px-5 py-2.5 text-white text-xs font-bold rounded-full transition-all cursor-pointer"
                [class.bg-[#9b432f]]="confirmUser.enabled"
                [class.hover:bg-[#833724]]="confirmUser.enabled"
                [class.bg-emerald-600]="!confirmUser.enabled"
                [class.hover:bg-emerald-700]="!confirmUser.enabled"
              >
                {{ confirmUser.enabled ? 'Confirm Disable' : 'Confirm Enable' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ================================================================= -->
      <!-- MODAL: CREATE STAFF USER (COURIER / DISPATCHER) -->
      <!-- ================================================================= -->
      <div
        *ngIf="isCreateUserModalOpen()"
        class="fixed inset-0 !mt-0 z-50 flex items-center justify-center bg-[#211f32]/45 p-4 backdrop-blur-sm animate-fade-in"
      >
        <div
          class="w-full max-w-md space-y-5 rounded-[1.5rem] border border-[#e9e3dd] bg-[#fbfaf8] p-7 shadow-[0_20px_50px_rgba(42,32,25,0.2)]"
        >
          <div class="flex items-center justify-between border-b border-[#e9e3dd] pb-4">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.16em] text-[#9b432f]">Staff management</p>
              <h3 class="mt-1 text-xl font-black tracking-[-0.03em] text-[#211f32]">Provision staff account</h3>
              <p class="mt-1 text-xs text-[#77748a]">Create a COURIER or DISPATCHER account.</p>
            </div>
            <button
              type="button"
              (click)="closeCreateUserModal()"
              class="flex h-9 w-9 items-center justify-center rounded-full text-[#77748a] transition hover:bg-[#f2e4de] hover:text-[#9b432f]"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
            </button>
          </div>

          <!-- Modal Error Banner -->
          <div
            *ngIf="modalError()"
            class="rounded-2xl border border-[#efc7c2] bg-[#fff4f2] p-3 text-xs font-semibold text-[#b23b32]"
          >
            <svg class="mr-1 inline h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5M12 17h.01"/></svg>{{ modalError() }}
          </div>

          <form (ngSubmit)="submitCreateStaffUser()" class="space-y-3.5">
            <div>
              <label class="mb-1 block text-xs font-bold text-[#77748a]">Full Name <span class="text-red-500 font-bold ml-0.5">*</span></label>
              <input
                type="text"
                id="staff-fullname-input"
                [(ngModel)]="newUserFullName"
                name="fullName"
                required
                placeholder="e.g. Sunil Perera"
                class="w-full rounded-xl border border-[#e8e4df] bg-white px-3 py-2.5 text-sm text-[#211f32] outline-none placeholder:text-[#aaa6b5] focus:border-[#9b432f] focus:ring-2 focus:ring-[#f2e4de]"
              />
            </div>

            <div>
              <label class="mb-1 block text-xs font-bold text-[#77748a]">Email Address <span class="text-red-500 font-bold ml-0.5">*</span></label>
              <input
                type="email"
                id="staff-email-input"
                [(ngModel)]="newUserEmail"
                (input)="onStaffEmailInput()"
                name="email"
                required
                placeholder="e.g. courier.sunil@swiftdrop.lk"
                [class.!border-[#b23b32]]="emailAlreadyExistsError()"
                [class.!bg-[#fff5f5]]="emailAlreadyExistsError()"
                class="w-full rounded-xl border border-[#e8e4df] bg-white px-3 py-2.5 text-sm text-[#211f32] outline-none placeholder:text-[#aaa6b5] focus:border-[#9b432f] focus:ring-2 focus:ring-[#f2e4de]"
              />
              <p
                *ngIf="emailAlreadyExistsError()"
                class="mt-1 text-[11px] font-medium text-[#b23b32]"
              >
                An account with this email address already exists. Please choose a different email.
              </p>
            </div>

            <div>
              <label class="mb-1 block text-xs font-bold text-[#77748a]">Phone Number <span class="text-red-500 font-bold ml-0.5">*</span></label>
              <input
                type="tel"
                inputmode="numeric"
                maxlength="10"
                id="staff-phone-input"
                [(ngModel)]="newUserPhone"
                (input)="onPhoneInput($event)"
                name="phoneNumber"
                required
                placeholder="0771234567"
                class="w-full rounded-xl border border-[#e8e4df] bg-white px-3 py-2.5 text-sm text-[#211f32] outline-none placeholder:text-[#aaa6b5] focus:border-[#9b432f] focus:ring-2 focus:ring-[#f2e4de]"
              />
              <p
                *ngIf="newUserPhone && !isPhoneValid()"
                class="mt-1 text-[11px] font-medium text-[#b23b32]"
              >
                Phone number must be exactly 10 digits (e.g. 0771234567)
              </p>
            </div>

            <div>
              <label class="mb-1 block text-xs font-bold text-[#77748a]">Staff Role <span class="text-red-500 font-bold ml-0.5">*</span></label>
              <select
                id="staff-role-select"
                [(ngModel)]="newUserRole"
                name="role"
                class="w-full rounded-xl border border-[#e8e4df] bg-white px-3 py-2.5 text-sm text-[#211f32] outline-none focus:border-[#9b432f] focus:ring-2 focus:ring-[#f2e4de]"
              >
                <option value="COURIER">COURIER (Delivery Personnel)</option>
                <option value="DISPATCHER">DISPATCHER (Queue & Workload Manager)</option>
              </select>
            </div>

            <!-- Delivery Zone Selection & Autocomplete -->
            <div class="relative">
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-bold text-[#77748a]">
                  Delivery Zone <span class="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <span *ngIf="availableZones().length > 0" class="text-[11px] font-semibold text-[#9b432f]">
                  {{ availableZones().length }} zones available
                </span>
              </div>
              <input
                type="text"
                id="staff-zone-input"
                [ngModel]="newUserZone()"
                (ngModelChange)="onZoneInputChange($event)"
                (focus)="showZoneDropdown.set(true)"
                (blur)="onZoneBlur()"
                name="zone"
                required
                autocomplete="off"
                placeholder="e.g. COLOMBO_ZONE, GAMPAHA_ZONE"
                class="w-full rounded-xl border border-[#e8e4df] bg-white px-3 py-2.5 text-sm text-[#211f32] outline-none placeholder:text-[#aaa6b5] focus:border-[#9b432f] focus:ring-2 focus:ring-[#f2e4de]"
              />

              <!-- Interactive Suggestion Dropdown as user types (Showing only zone) -->
              <div
                *ngIf="showZoneDropdown() && matchingZones().length > 0"
                class="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-[#e9e3dd] bg-white p-1.5 shadow-[0_10px_25px_rgba(42,32,25,0.12)]"
              >
                <div
                  *ngFor="let zone of matchingZones()"
                  (mousedown)="selectZone(zone.name)"
                  class="flex cursor-pointer items-center rounded-lg px-3 py-2 text-xs transition hover:bg-[#fff5ef] hover:text-[#9b432f]"
                >
                  <span class="font-bold text-[#211f32]">{{ zone.name }}</span>
                </div>
              </div>
            </div>

            <!-- Modal Action Buttons -->
            <div class="flex items-center justify-end gap-2 border-t border-[#e9e3dd] pt-4">
              <button
                type="button"
                (click)="closeCreateUserModal()"
                class="rounded-full px-4 py-2 text-xs font-bold text-[#77748a] transition hover:bg-[#f2e4de] hover:text-[#9b432f]"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="submit-staff-btn"
                [disabled]="!isFormValid() || isSubmitting()"
                class="rounded-full bg-[#9b432f] px-5 py-2.5 text-xs font-bold text-white shadow-[0_7px_16px_rgba(155,67,47,0.18)] transition hover:bg-[#833724] disabled:cursor-not-allowed disabled:opacity-50"
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
  public adminSearchService = inject(AdminSearchService);
  public authService = inject(AuthService, { optional: true });

  public userRoleFilter = signal('');
  public userStatusFilter = signal('');
  public isCreateUserModalOpen = signal(false);
  public isSubmitting = signal(false);
  public updatingUserId = signal<string | null>(null);
  public pendingConfirmUserId = signal<string | null>(null);
  public pendingConfirmUser = signal<UserSummary | null>(null);
  public modalError = signal<string | null>(null);
  public emailAlreadyExistsError = signal(false);

  public roleCounts = computed(() => {
    if (typeof this.adminUsersService.roleCounts === 'function') {
      return this.adminUsersService.roleCounts() || {};
    }
    return {
      MERCHANT: 0,
      CUSTOMER: 0,
      DISPATCHER: 0,
      COURIER: 0,
    };
  });

  public filteredUsers = computed(() => {
    const users = this.adminUsersService.users();
    const q = this.adminSearchService.query().trim().toLowerCase();
    if (!q) {
      return users;
    }
    return users.filter((u) => {
      const name = (u.fullName || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const phone = (u.phoneNumber || '').toLowerCase();
      const role = (u.role || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q) || role.includes(q);
    });
  });

  // Form State
  public newUserFullName = '';
  public newUserEmail = '';
  public newUserPhone = '';
  public newUserRole: 'COURIER' | 'DISPATCHER' = 'COURIER';
  public newUserZone = signal('');

  // Zones State
  public availableZones = signal<DeliveryZoneOption[]>([]);
  public showZoneDropdown = signal(false);

  public matchingZones = computed(() => {
    const raw = this.newUserZone().trim().toLowerCase();
    const zones = this.availableZones();
    if (!raw) {
      return zones;
    }
    const q = raw.replace(/\s+/g, '_');
    const qSpaced = raw.replace(/_/g, ' ');

    return zones.filter((z) => {
      const name = (z.name || '').toLowerCase();
      const nameSpaced = name.replace(/_/g, ' ');
      const matchName = name.includes(q) || nameSpaced.includes(qSpaced) || name.includes(raw);
      const matchDistrict = (z.districts || []).some((d) => (d || '').toLowerCase().includes(raw));
      return matchName || matchDistrict;
    });
  });

  // Toast State
  public toastMessage = signal<string | null>(null);
  public toastType = signal<'success' | 'error'>('success');

  private toastTimeout: any;

  ngOnInit(): void {
    this.reloadUsers();
    this.loadZones();
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

    this.adminUsersService.loadUsers(page, 15, role, enabled).subscribe({
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

  public startConfirmToggle(user: UserSummary | string): void {
    if (typeof user === 'string') {
      const found = this.adminUsersService.users().find((u) => u.id === user) || null;
      this.pendingConfirmUser.set(found);
      this.pendingConfirmUserId.set(user);
    } else {
      this.pendingConfirmUser.set(user);
      this.pendingConfirmUserId.set(user.id);
    }
  }

  public cancelConfirmToggle(): void {
    this.pendingConfirmUserId.set(null);
    this.pendingConfirmUser.set(null);
  }

  public confirmToggleUserStatus(user: UserSummary): void {
    this.toggleUserStatus(user);
  }

  public toggleUserStatus(user: UserSummary): void {
    if (this.updatingUserId()) {
      return; // prevent duplicate clicks
    }

    this.pendingConfirmUserId.set(null);
    this.pendingConfirmUser.set(null);
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

  public onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digitsOnly = input.value.replace(/\D/g, '').slice(0, 10);
    if (input.value !== digitsOnly) {
      input.value = digitsOnly;
    }
    this.newUserPhone = digitsOnly;
  }

  public isPhoneValid(): boolean {
    const phone = this.newUserPhone.trim();
    return /^[0-9]{10}$/.test(phone);
  }

  public isFormValid(): boolean {
    return (
      this.newUserFullName.trim().length > 0 &&
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(this.newUserEmail.trim()) &&
      this.isPhoneValid() &&
      (this.newUserRole === 'COURIER' || this.newUserRole === 'DISPATCHER') &&
      this.newUserZone().trim().length > 0
    );
  }

  public onStaffEmailInput(): void {
    if (this.emailAlreadyExistsError()) {
      this.emailAlreadyExistsError.set(false);
      if (this.modalError()?.includes('already')) {
        this.modalError.set(null);
      }
    }
  }

  public loadZones(): void {
    this.adminUsersService.loadDeliveryZones().subscribe({
      next: (zones) => {
        this.availableZones.set(zones || []);
      },
      error: () => {
        this.availableZones.set([]);
      },
    });
  }

  public selectZone(zoneName: string): void {
    this.newUserZone.set(zoneName);
    this.showZoneDropdown.set(false);
  }

  public onZoneInputChange(val: string): void {
    this.newUserZone.set(val || '');
    this.showZoneDropdown.set(true);
  }

  public onZoneBlur(): void {
    setTimeout(() => {
      this.showZoneDropdown.set(false);
    }, 250);
  }

  public openCreateUserModal(): void {
    this.modalError.set(null);
    this.emailAlreadyExistsError.set(false);
    this.newUserZone.set('');
    this.showZoneDropdown.set(false);
    this.isCreateUserModalOpen.set(true);
  }

  public closeCreateUserModal(): void {
    this.isCreateUserModalOpen.set(false);
    this.modalError.set(null);
    this.emailAlreadyExistsError.set(false);
    this.newUserZone.set('');
    this.showZoneDropdown.set(false);
  }

  public submitCreateStaffUser(): void {
    if (!this.isFormValid() || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.modalError.set(null);
    this.emailAlreadyExistsError.set(false);

    const zoneVal = this.newUserZone().trim();
    const payload: CreateStaffUserRequest = {
      fullName: this.newUserFullName.trim(),
      email: this.newUserEmail.trim().toLowerCase(),
      phoneNumber: this.newUserPhone.trim(),
      role: this.newUserRole,
      zone: zoneVal ? zoneVal : undefined,
    };

    this.adminUsersService.createStaffUser(payload).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.emailAlreadyExistsError.set(false);
        this.showToast(
          `Staff account for ${created.fullName} (${created.role}) provisioned! A 6-letter temporary password has been emailed to ${created.email}.`,
          'success'
        );

        // Clear form inputs on confirmed success
        this.newUserFullName = '';
        this.newUserEmail = '';
        this.newUserPhone = '';
        this.newUserZone.set('');
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
          this.emailAlreadyExistsError.set(true);
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
