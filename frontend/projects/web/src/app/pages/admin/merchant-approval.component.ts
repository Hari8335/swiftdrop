import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BadgeTone, StatusBadgeComponent } from 'ui';
import { MerchantApprovalService } from './merchant-approval.service';
import { MerchantCredentialHandoff, MerchantListFilter, MerchantStatus, MerchantSummary } from './merchant-approval.model';
import { MerchantCredentialHandoffComponent } from './merchant-credential-handoff.component';

type Action = 'approve' | 'reject' | 'recover' | 'suspend' | 'reactivate';

const LIST_FILTERS: readonly { value: MerchantListFilter; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'ALL', label: 'All merchants' },
];

const STATUS_TONES: Record<MerchantStatus, BadgeTone> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  SUSPENDED: 'neutral',
};

const ACTION_TITLES: Record<Action, string> = {
  approve: 'Approve merchant?',
  reject: 'Reject merchant?',
  recover: 'Replace lost credentials?',
  suspend: 'Suspend merchant?',
  reactivate: 'Reactivate merchant?',
};

const ACTION_CONFIRM_LABELS: Record<Action, string> = {
  approve: 'Confirm approval',
  reject: 'Confirm rejection',
  recover: 'Replace credentials',
  suspend: 'Confirm suspension',
  reactivate: 'Confirm reactivation',
};

@Component({
  selector: 'app-merchant-approval',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StatusBadgeComponent, MerchantCredentialHandoffComponent],
  template: `
    <main class="mx-auto max-w-[1320px] space-y-6 px-4 py-6 pb-16 text-[#211f32] sm:px-6 lg:px-8">
      <!-- A. Page header -->
      <header class="rounded-[1.5rem] border border-[#e9e3dd] bg-white p-5 shadow-[0_8px_24px_rgba(42,32,25,0.04)] sm:p-7">
        <div class="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div class="min-w-0">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-[#9b432f]">SwiftDrop governance</p>
            <h1 class="mt-2 text-2xl font-black tracking-[-0.04em] sm:text-3xl">Merchant Approvals</h1>
            <p class="mt-2 max-w-2xl text-sm text-[#77748a]">Review merchant registrations, manage approval decisions, and securely hand over integration credentials.</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span id="merchant-pending-count" class="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
              <span class="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true"></span>
              {{ merchantService.pendingCount() }} pending review
            </span>
            <span class="inline-flex items-center rounded-full border border-[#efcfc3] bg-[#fff5ef] px-3 py-1 text-xs font-bold text-[#9b432f]">ADMIN only</span>
          </div>
        </div>

        <div class="mt-5 flex flex-col gap-3 border-t border-[#eeeae5] pt-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <label for="merchant-list-status" class="block text-xs font-bold uppercase tracking-wide text-[#77748a]">Merchant status</label>
            <div class="mt-1 flex items-center gap-3">
              <select id="merchant-list-status" [ngModel]="listStatus()" (ngModelChange)="changeStatus($event)"
                class="rounded-full border border-[#e8e4df] bg-[#fbfaf8] px-3 py-2 text-sm font-semibold outline-none focus:border-[#9b432f] focus:ring-2 focus:ring-[#f2e4de]">
                @for (filter of filters; track filter.value) {
                  <option [value]="filter.value">{{ filter.label }}</option>
                }
              </select>
              <p class="text-xs text-[#77748a]" aria-live="polite">{{ merchantService.totalElements() }} {{ merchantService.totalElements() === 1 ? 'merchant' : 'merchants' }}</p>
            </div>
          </div>
          <div class="flex gap-2">
            <a routerLink="/admin" class="rounded-full border border-[#e8e4df] bg-white px-4 py-2 text-sm font-bold text-[#77748a] hover:border-[#d7b4a7] hover:text-[#9b432f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d7b4a7]">Admin overview</a>
            <button id="merchant-approval-refresh" type="button" [disabled]="merchantService.loading()"
              class="rounded-full border border-[#e8e4df] bg-white px-4 py-2 text-sm font-bold text-[#77748a] hover:border-[#d7b4a7] hover:text-[#9b432f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d7b4a7] disabled:opacity-50"
              (click)="reload()">Refresh</button>
          </div>
        </div>
      </header>

      @if (feedback(); as message) {
        <div id="merchant-approval-feedback" role="status" class="flex items-start justify-between gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">
          <span>{{ message }}</span>
          <button type="button" class="text-green-700 hover:text-green-900" aria-label="Dismiss message" (click)="feedback.set(null)">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
          </button>
        </div>
      }

      <!-- E. One-time secure credential handoff -->
      @if (handoff(); as credentials) {
        <app-merchant-credential-handoff [credentials]="credentials" (done)="clearHandoff()" />
      }

      @if (merchantService.error() && !merchantService.loading()) {
        <div id="merchant-approval-error" class="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">
          <span>{{ merchantService.error() }}</span>
          <button id="merchant-approval-retry" type="button" class="rounded-full bg-[#b23b32] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#922d27]" (click)="reload()">Retry</button>
        </div>
      }

      <!-- B. Merchant registration list -->
      @if (merchantService.loading()) {
        <div id="merchant-approval-loading" class="rounded-[1.5rem] border border-[#e9e3dd] bg-white p-12 text-center shadow-[0_8px_24px_rgba(42,32,25,0.04)]" role="status">
          <div class="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-[#9b432f] border-t-transparent" aria-hidden="true"></div>
          <p class="text-sm font-semibold text-[#77748a]">Loading {{ filterLabel().toLowerCase() }}...</p>
        </div>
      } @else if (merchantService.merchants().length === 0 && !merchantService.error()) {
        <div id="merchant-approval-empty" class="rounded-[1.5rem] border border-dashed border-[#d9d3cd] bg-[#f8f6f3] p-12 text-center">
          <h2 class="text-lg font-black text-[#211f32]">{{ emptyTitle() }}</h2>
          <p class="mt-2 text-sm text-[#77748a]">{{ emptyMessage() }}</p>
        </div>
      } @else if (!merchantService.error()) {
        <section aria-label="Merchant registrations" class="overflow-hidden rounded-[1.5rem] border border-[#e9e3dd] bg-white shadow-[0_8px_24px_rgba(42,32,25,0.04)]">
          <!-- Desktop / tablet table -->
          <div class="hidden overflow-x-auto md:block">
            <table class="w-full text-left text-sm">
              <caption class="sr-only">{{ filterLabel() }}</caption>
              <thead class="border-b border-[#eeeae5] bg-[#f8f6f3] text-xs font-bold uppercase tracking-wide text-[#77748a]">
                <tr>
                  <th scope="col" class="px-5 py-3">Business</th>
                  <th scope="col" class="px-5 py-3">Contact</th>
                  <th scope="col" class="px-5 py-3">Submitted</th>
                  <th scope="col" class="px-5 py-3">Status</th>
                  <th scope="col" class="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#eeeae5]">
                @for (merchant of merchantService.merchants(); track merchant.id) {
                  <tr class="align-top hover:bg-[#fffaf7]">
                    <td class="px-5 py-4">
                      <p class="font-bold text-[#211f32]">{{ merchant.businessName }}</p>
                      <p class="break-all text-xs text-[#77748a]">{{ merchant.email }}</p>
                    </td>
                    <td class="px-5 py-4">
                      <p class="text-[#211f32]">{{ merchant.contactName }}</p>
                      <p class="text-xs text-[#77748a]">{{ merchant.phoneNumber }}</p>
                    </td>
                    <td class="whitespace-nowrap px-5 py-4">
                      <p class="font-medium text-[#211f32]">{{ merchant.createdAt | date: 'mediumDate' }}</p>
                      <p class="text-xs text-[#77748a]">{{ merchant.createdAt | date: 'shortTime' }}</p>
                    </td>
                    <td class="px-5 py-4"><ui-status-badge [status]="merchant.status" [tone]="toneFor(merchant.status)" /></td>
                    <td class="px-5 py-4">
                      <div class="flex flex-wrap justify-end gap-2">
                        <ng-container *ngTemplateOutlet="rowActions; context: { $implicit: merchant }" />
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Mobile cards -->
          <ul class="divide-y divide-[#eeeae5] md:hidden">
            @for (merchant of merchantService.merchants(); track merchant.id) {
              <li class="space-y-3 p-4">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="font-bold text-[#211f32]">{{ merchant.businessName }}</p>
                    <p class="text-xs text-[#77748a]">{{ merchant.contactName }} · {{ merchant.createdAt | date: 'mediumDate' }}</p>
                  </div>
                  <ui-status-badge [status]="merchant.status" [tone]="toneFor(merchant.status)" />
                </div>
                <p class="break-all text-xs text-[#77748a]">{{ merchant.email }} · {{ merchant.phoneNumber }}</p>
                <div class="flex flex-wrap gap-2">
                  <ng-container *ngTemplateOutlet="rowActions; context: { $implicit: merchant }" />
                </div>
              </li>
            }
          </ul>
        </section>

        @if (merchantService.totalPages() > 1) {
          <nav class="flex items-center justify-between" aria-label="Merchant pages">
            <button type="button" class="rounded-full border border-[#e8e4df] bg-white px-4 py-2 text-sm font-semibold text-[#77748a] disabled:opacity-40" [disabled]="merchantService.currentPage() === 0 || merchantService.loading()" (click)="goToPage(merchantService.currentPage() - 1)">Previous</button>
            <span class="text-sm text-[#77748a]">Page {{ merchantService.currentPage() + 1 }} of {{ merchantService.totalPages() }}</span>
            <button type="button" class="rounded-full border border-[#e8e4df] bg-white px-4 py-2 text-sm font-semibold text-[#77748a] disabled:opacity-40" [disabled]="merchantService.currentPage() >= merchantService.totalPages() - 1 || merchantService.loading()" (click)="goToPage(merchantService.currentPage() + 1)">Next</button>
          </nav>
        }
      }

      <!-- G. Concise admin-only guidance -->
      <details id="merchant-admin-guide" class="group rounded-[1.5rem] border border-[#e9e3dd] bg-white p-5 text-sm text-[#77748a] shadow-[0_8px_24px_rgba(42,32,25,0.04)]">
        <summary class="cursor-pointer list-none font-bold text-[#211f32] focus:outline-none focus-visible:underline">
          <span class="inline-block transition-transform group-open:rotate-90" aria-hidden="true">›</span>
          Administrator guide
        </summary>
        <dl class="mt-4 grid gap-4 md:grid-cols-2">
          <div><dt class="font-bold text-[#211f32]">Reviewing applications</dt><dd class="mt-1">Open <em>Details</em> to check the business, contact and submission date. Approve only verified businesses; each merchant can be approved once.</dd></div>
          <div><dt class="font-bold text-[#211f32]">Handing over credentials</dt><dd class="mt-1">After approval the OAuth Client ID and Client Secret are shown once. Copy them and deliver them through separate secure channels before clicking Done.</dd></div>
          <div><dt class="font-bold text-[#211f32]">Recovery and replacement</dt><dd class="mt-1">If a secret is lost, <em>Recover credentials</em> issues a replacement on the same client. The old secret stops issuing new tokens; stored secrets are never redisplayed.</dd></div>
          <div><dt class="font-bold text-[#211f32]">Rejection and suspension</dt><dd class="mt-1">Rejection requires a reason and is final for that application. Suspension blocks new API tokens and merchant writes until reactivated; existing orders are preserved.</dd></div>
        </dl>
      </details>
    </main>

    <ng-template #rowActions let-merchant>
      <button type="button" class="rounded-full border border-[#e8e4df] px-3 py-1.5 text-xs font-bold text-[#211f32] hover:border-[#d7b4a7] hover:text-[#9b432f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d7b4a7]" [attr.aria-label]="'View details for ' + merchant.businessName" (click)="openDetails(merchant)">Details</button>
      @if (merchant.status === 'PENDING') {
        <button type="button" class="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-50" [disabled]="actionsLocked()" [attr.aria-label]="'Approve ' + merchant.businessName" (click)="openApprove(merchant)">Approve</button>
        <button type="button" class="rounded-full bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-not-allowed disabled:opacity-50" [disabled]="actionsLocked()" [attr.aria-label]="'Reject ' + merchant.businessName" (click)="openReject(merchant)">Reject</button>
      }
      @if (merchant.status === 'APPROVED') {
        <button type="button" class="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-not-allowed disabled:opacity-50" [disabled]="actionsLocked()" (click)="openStatusAction(merchant, 'suspend')">Suspend</button>
      }
      @if (merchant.status === 'SUSPENDED') {
        <button type="button" class="rounded-full border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-50" [disabled]="actionsLocked()" (click)="openStatusAction(merchant, 'reactivate')">Reactivate</button>
      }
      @if (canRecover(merchant)) {
        <button type="button" class="rounded-full border border-[#efcfc3] px-3 py-1.5 text-xs font-bold text-[#9b432f] hover:bg-[#fff5ef] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d7b4a7] disabled:cursor-not-allowed disabled:opacity-50" [disabled]="actionsLocked()" (click)="openRecover(merchant)">Recover credentials</button>
      }
    </ng-template>

    <!-- C. Merchant details -->
    @if (!action() && selected(); as merchant) {
      <div class="fixed inset-0 z-30 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" role="presentation" (click)="closeDetails()">
        <section class="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl outline-none sm:rounded-2xl" role="dialog" aria-modal="true" aria-labelledby="merchant-details-title" tabindex="-1" (click)="$event.stopPropagation()">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <h2 id="merchant-details-title" class="text-xl font-black text-[#211f32]">{{ merchant.businessName }}</h2>
              <div class="mt-1"><ui-status-badge [status]="merchant.status" [tone]="toneFor(merchant.status)" /></div>
            </div>
            <button type="button" class="rounded-full p-1 text-[#77748a] hover:text-[#211f32] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d7b4a7]" aria-label="Close details" (click)="closeDetails()"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
          </div>
          <dl class="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt class="font-semibold text-[#77748a]">Contact person</dt><dd>{{ display(merchant.contactName) }}</dd></div>
            <div><dt class="font-semibold text-[#77748a]">Phone</dt><dd>{{ display(merchant.phoneNumber) }}</dd></div>
            <div class="sm:col-span-2"><dt class="font-semibold text-[#77748a]">Email</dt><dd class="break-all">{{ display(merchant.email) }}</dd></div>
            <div><dt class="font-semibold text-[#77748a]">Registration submitted</dt><dd>{{ merchant.createdAt ? (merchant.createdAt | date: 'medium') : 'Not provided' }}</dd></div>
            <div><dt class="font-semibold text-[#77748a]">Merchant ID</dt><dd class="break-all font-mono text-xs">{{ display(merchant.id) }}</dd></div>
            <div class="sm:col-span-2"><dt class="font-semibold text-[#77748a]">API credentials</dt><dd id="merchant-details-credential-status">{{ credentialStatus(merchant) }}</dd></div>
            @if (merchant.status === 'REJECTED') {
              <div class="sm:col-span-2"><dt class="font-semibold text-[#77748a]">Rejection reason</dt><dd>{{ display(merchant.rejectionReason) }}</dd></div>
            }
          </dl>
          <p class="mt-4 text-xs text-[#77748a]">Registration number, business address and website are not captured by the current registration API.</p>
          @if (hasActions(merchant)) {
            <div class="mt-6 flex flex-wrap justify-end gap-2">
              <ng-container *ngTemplateOutlet="detailActions; context: { $implicit: merchant }" />
            </div>
          }
        </section>
      </div>
    }

    <ng-template #detailActions let-merchant>
      @if (merchant.status === 'PENDING') {
        <button type="button" class="rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50" [disabled]="actionsLocked()" (click)="openApprove(merchant)">Approve</button>
        <button type="button" class="rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50" [disabled]="actionsLocked()" (click)="openReject(merchant)">Reject</button>
      }
      @if (merchant.status === 'APPROVED') {
        <button type="button" class="rounded-full border border-rose-200 px-4 py-2 text-sm font-bold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50" [disabled]="actionsLocked()" (click)="openStatusAction(merchant, 'suspend')">Suspend</button>
      }
      @if (merchant.status === 'SUSPENDED') {
        <button type="button" class="rounded-full border border-emerald-200 px-4 py-2 text-sm font-bold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50" [disabled]="actionsLocked()" (click)="openStatusAction(merchant, 'reactivate')">Reactivate</button>
      }
      @if (canRecover(merchant)) {
        <button type="button" class="rounded-full border border-[#efcfc3] px-4 py-2 text-sm font-bold text-[#9b432f] disabled:cursor-not-allowed disabled:opacity-50" [disabled]="actionsLocked()" (click)="openRecover(merchant)">Recover credentials</button>
      }
    </ng-template>

    <!-- D/F. Confirmation dialogs -->
    @if (action(); as currentAction) {
      @if (selected(); as merchant) {
        <div class="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" role="presentation">
          <section class="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl outline-none sm:rounded-2xl" role="dialog" aria-modal="true" tabindex="-1" [attr.aria-labelledby]="currentAction + '-merchant-title'">
            <h2 [id]="currentAction + '-merchant-title'" class="text-xl font-black text-[#211f32]">{{ actionTitle(currentAction) }}</h2>
            <p class="mt-2 text-sm text-[#77748a]">Confirm this action for <strong class="text-[#211f32]">{{ merchant.businessName }}</strong>.</p>
            @if (currentAction === 'approve') {
              <div class="mt-4 space-y-1 rounded-xl border border-[#eeeae5] bg-[#faf8f6] p-3.5 text-xs text-[#77748a]">
                <p><strong>Contact:</strong> {{ merchant.contactName }}</p>
                <p><strong>Email:</strong> {{ merchant.email }}</p>
                <p><strong>Phone:</strong> {{ merchant.phoneNumber }}</p>
                <p class="pt-1 font-medium text-emerald-700">Approving will activate this merchant partnership and dispatch temporary sign-in credentials to their email. The OAuth Client Secret will be shown to you once for secure handoff.</p>
              </div>
            }
            @if (currentAction === 'recover') {
              <p class="mt-4 text-sm text-amber-900">This replaces the secret on the existing client. The old secret will stop obtaining new tokens. Already issued tokens keep their normal expiry.</p>
              <label class="mt-4 flex cursor-pointer items-center gap-2.5 text-sm font-medium text-[#211f32]">
                <input type="checkbox" id="confirm-replacement-checkbox" class="h-4 w-4 rounded border-slate-300 text-[#9b432f] focus:ring-[#9b432f]" [ngModel]="confirmReplacement()" (ngModelChange)="confirmReplacement.set($event)" />
                <span>I confirm replacement of the lost secret.</span>
              </label>
              <p class="mt-2 text-xs text-[#77748a]">Retry keeps the same recovery reference. If its one-time response was already lost, close this dialog and explicitly confirm a new recovery.</p>
            }
            @if (currentAction === 'reject') {
              <label for="rejection-reason" class="mt-5 block text-sm font-semibold text-[#211f32]">Rejection reason</label>
              <textarea id="rejection-reason" class="mt-2 min-h-28 w-full rounded-lg border border-[#e8e4df] p-3 text-sm focus:border-[#9b432f] focus:outline-none focus:ring-2 focus:ring-[#f2e4de]" maxlength="1000" [ngModel]="reason()" (ngModelChange)="reason.set($event)" aria-describedby="rejection-help"></textarea>
              <p id="rejection-help" class="mt-1 text-xs text-[#77748a]">{{ reason().length }}/1000 characters. A reason is required.</p>
            }
            @if (currentAction === 'suspend') { <p class="mt-4 text-sm text-amber-900">Merchant writes and new API tokens will be blocked. Existing orders and queued webhook deliveries will continue to be preserved.</p> }
            @if (currentAction === 'reactivate') { <p class="mt-4 text-sm text-[#77748a]">The merchant will be able to obtain API tokens and create orders again with its existing credentials.</p> }
            @if (reasonError()) { <p class="mt-2 text-xs font-semibold text-rose-600" role="alert">{{ reasonError() }}</p> }
            <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" class="rounded-full border border-[#e8e4df] px-4 py-2 text-sm font-semibold text-[#77748a] hover:bg-[#faf8f6]" [disabled]="isSubmitting()" (click)="closeAction()">Cancel</button>
              <button
                type="button"
                id="confirm-merchant-action-btn"
                class="rounded-full px-4 py-2 text-sm font-bold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50"
                [class.bg-emerald-600]="currentAction === 'approve' || currentAction === 'reactivate'"
                [class.hover:bg-emerald-700]="currentAction === 'approve' || currentAction === 'reactivate'"
                [class.bg-rose-600]="currentAction === 'reject' || currentAction === 'suspend'"
                [class.hover:bg-rose-700]="currentAction === 'reject' || currentAction === 'suspend'"
                [class.bg-[#9b432f]]="currentAction === 'recover'"
                [class.hover:bg-[#833724]]="currentAction === 'recover'"
                [disabled]="isSubmitting() || (currentAction === 'recover' && !confirmReplacement())"
                (click)="confirmAction()"
              >
                {{ isSubmitting() ? 'Submitting…' : confirmLabel(currentAction) }}
              </button>
            </div>
          </section>
        </div>
      }
    }
  `,
})
export class MerchantApprovalComponent implements OnInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router, { optional: true });
  private readonly route = inject(ActivatedRoute, { optional: true });
  readonly merchantService = inject(MerchantApprovalService);
  readonly filters = LIST_FILTERS;
  readonly listStatus = signal<MerchantListFilter>('PENDING');
  readonly confirmReplacement = signal(false);
  private replacementKey = '';
  readonly selected = signal<MerchantSummary | null>(null);
  readonly action = signal<Action | null>(null);
  readonly reason = signal('');
  readonly reasonError = signal<string | null>(null);
  readonly isSubmitting = signal(false);
  readonly feedback = signal<string | null>(null);
  /** One-time credentials from the latest approve/recover response. Memory only; cleared on Done or destroy. */
  readonly handoff = signal<MerchantCredentialHandoff | null>(null);
  private returnFocusTo: HTMLElement | null = null;

  ngOnInit(): void {
    const qParam = this.route?.snapshot?.queryParamMap?.get('status')?.toUpperCase();
    const requested = LIST_FILTERS.find((filter) => filter.value === qParam)?.value;
    if (requested && requested !== 'PENDING') {
      this.listStatus.set(requested);
      this.merchantService.loadMerchants(0, this.merchantService.pageSize(), requested).subscribe({ error: () => undefined });
    } else {
      this.reload();
    }
    this.refreshPendingCount();
  }

  ngOnDestroy(): void {
    this.clearHandoff();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.action()) {
      this.closeAction();
    } else if (this.selected()) {
      this.closeDetails();
    }
  }

  clearHandoff(): void {
    this.handoff.set(null);
  }

  actionsLocked(): boolean {
    return this.isSubmitting() || this.handoff() !== null;
  }

  filterLabel(): string {
    const status = this.listStatus();
    return status === 'ALL' ? 'All merchants' : `${LIST_FILTERS.find((f) => f.value === status)?.label ?? status} merchants`;
  }

  emptyTitle(): string {
    return this.listStatus() === 'ALL' ? 'No merchants yet' : `No ${this.filterLabel().toLowerCase()}`;
  }

  emptyMessage(): string {
    switch (this.listStatus()) {
      case 'PENDING': return 'New merchant registrations will appear here for review.';
      case 'APPROVED': return 'No approved merchants found.';
      case 'REJECTED': return 'No rejected applications found.';
      case 'SUSPENDED': return 'No suspended merchants found.';
      default: return 'Merchant registrations will appear here once submitted.';
    }
  }

  toneFor(status: MerchantStatus): BadgeTone {
    return STATUS_TONES[status] ?? 'neutral';
  }

  actionTitle(action: Action): string {
    return ACTION_TITLES[action];
  }

  confirmLabel(action: Action): string {
    return ACTION_CONFIRM_LABELS[action];
  }

  display(value: string | null | undefined): string {
    return value && value.trim().length > 0 ? value : 'Not provided';
  }

  canRecover(merchant: MerchantSummary): boolean {
    return !!merchant.credentialRecoveryAvailable && (merchant.status === 'PENDING' || merchant.status === 'APPROVED');
  }

  hasActions(merchant: MerchantSummary): boolean {
    return merchant.status !== 'REJECTED' || this.canRecover(merchant);
  }

  /** Administrative credential status derived only from list metadata; never exposes a secret. */
  credentialStatus(merchant: MerchantSummary): string {
    switch (merchant.status) {
      case 'PENDING':
        return merchant.credentialRecoveryAvailable
          ? 'Provisioning started but the one-time handoff was not completed. Use Recover credentials.'
          : 'Not issued — credentials are generated on approval.';
      case 'APPROVED':
        return merchant.credentialRecoveryAvailable
          ? 'Client issued. Secret is never stored for redisplay; recovery is available if the merchant lost it.'
          : 'Client issued. Secret is never stored for redisplay.';
      case 'SUSPENDED':
        return 'Client issued. New token requests are blocked while suspended.';
      case 'REJECTED':
        return 'Not issued — application was rejected.';
      default:
        return 'Not provided';
    }
  }

  reload(): void {
    this.merchantService.refresh().subscribe({
      next: (page) => {
        if (this.listStatus() === 'PENDING' && page && page.totalElements === 0) {
          this.changeStatus('APPROVED');
        }
      },
      error: () => undefined,
    });
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.merchantService.totalPages()) {
      this.merchantService.loadMerchants(page, this.merchantService.pageSize()).subscribe({ error: () => undefined });
    }
  }

  openDetails(merchant: MerchantSummary): void {
    this.rememberFocus();
    this.selected.set(merchant);
    this.focusDialog();
  }

  closeDetails(): void {
    this.selected.set(null);
    this.restoreFocus();
  }

  openApprove(merchant: MerchantSummary): void {
    if (merchant.status !== 'PENDING' || this.actionsLocked()) return;
    this.openAction(merchant, 'approve');
  }

  openReject(merchant: MerchantSummary): void {
    if (merchant.status !== 'PENDING' || this.actionsLocked()) return;
    this.reason.set('');
    this.openAction(merchant, 'reject');
  }

  changeStatus(status: MerchantListFilter): void {
    this.listStatus.set(status);
    if (this.router && this.route) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { status },
        queryParamsHandling: 'merge',
      });
    }
    this.merchantService.loadMerchants(0, this.merchantService.pageSize(), status).subscribe({ error: () => undefined });
  }

  openStatusAction(merchant: MerchantSummary, action: 'suspend' | 'reactivate'): void {
    if (this.actionsLocked()) return;
    if (action === 'suspend' && merchant.status !== 'APPROVED') return;
    if (action === 'reactivate' && merchant.status !== 'SUSPENDED') return;
    this.openAction(merchant, action);
  }

  openRecover(merchant: MerchantSummary): void {
    if (!this.canRecover(merchant) || this.actionsLocked()) return;
    this.confirmReplacement.set(false);
    this.replacementKey = crypto.randomUUID();
    this.openAction(merchant, 'recover');
  }

  closeAction(): void {
    if (!this.isSubmitting()) {
      this.action.set(null);
      this.selected.set(null);
      this.restoreFocus();
    }
  }

  confirmAction(): void {
    const merchant = this.selected();
    const currentAction = this.action();
    if (!merchant || !currentAction || this.isSubmitting()) return;
    if ((currentAction === 'approve' || currentAction === 'reject') && merchant.status !== 'PENDING') return;
    if (currentAction === 'suspend' && merchant.status !== 'APPROVED') return;
    if (currentAction === 'reactivate' && merchant.status !== 'SUSPENDED') return;
    if (currentAction === 'recover' && !this.confirmReplacement()) { this.reasonError.set('Confirm replacement of the lost secret.'); return; }

    const trimmedReason = this.reason().trim();
    if (currentAction === 'reject' && (trimmedReason.length < 1 || trimmedReason.length > 1000)) {
      this.reasonError.set(trimmedReason.length > 1000 ? 'Enter no more than 1000 characters.' : 'Enter a rejection reason.');
      return;
    }

    this.isSubmitting.set(true);
    this.reasonError.set(null);
    if (currentAction === 'suspend' || currentAction === 'reactivate') {
      const request = currentAction === 'suspend' ? this.merchantService.suspend(merchant.id) : this.merchantService.reactivate(merchant.id);
      request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (result) => this.completeAction(result), error: (error: unknown) => this.failAction(error) });
      return;
    }
    if (currentAction === 'approve' || currentAction === 'recover') {
      const request = currentAction === 'recover' ? this.merchantService.recover(merchant.id, this.replacementKey) : this.merchantService.approve(merchant.id);
      request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (result) => {
          this.handoff.set({
            merchantId: result.merchant.id,
            businessName: result.merchant.businessName,
            clientId: result.clientId,
            clientSecret: result.clientSecret ?? null,
            kind: currentAction === 'recover' ? 'recovery' : 'approval',
          });
          this.completeAction(result.merchant);
        },
        error: (error: unknown) => this.failAction(error),
      });
      return;
    }

    this.merchantService.reject(merchant.id, { reason: trimmedReason }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => this.completeAction(result),
      error: (error: unknown) => this.failAction(error),
    });
  }

  private openAction(merchant: MerchantSummary, action: Action): void {
    if (!this.selected()) this.rememberFocus();
    this.selected.set(merchant);
    this.action.set(action);
    this.reasonError.set(null);
    this.focusDialog();
  }

  private completeAction(updatedMerchant: MerchantSummary): void {
    this.feedback.set(`${updatedMerchant.businessName} is now ${updatedMerchant.status}.`);
    this.action.set(null);
    this.selected.set(null);
    this.isSubmitting.set(false);
    this.returnFocusTo = null;
    this.reload();
    this.refreshPendingCount();
  }

  private failAction(error: unknown): void {
    this.reasonError.set(this.merchantService.messageFor(error, 'The merchant action could not be completed.'));
    this.isSubmitting.set(false);
    this.reload();
  }

  private refreshPendingCount(): void {
    this.merchantService.loadPendingCount().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  private rememberFocus(): void {
    this.returnFocusTo = typeof document !== 'undefined' && document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }

  private restoreFocus(): void {
    const target = this.returnFocusTo;
    this.returnFocusTo = null;
    if (target?.isConnected) setTimeout(() => target.focus());
  }

  private focusDialog(): void {
    if (typeof document === 'undefined') return;
    setTimeout(() => document.querySelector<HTMLElement>('section[role="dialog"]')?.focus());
  }
}
