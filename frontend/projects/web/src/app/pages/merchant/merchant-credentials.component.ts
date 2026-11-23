import { CommonModule } from '@angular/common';
import { Component, inject, input, output, signal } from '@angular/core';
import { ButtonComponent, CardComponent, StatusBadgeComponent } from 'ui';
import { MerchantApiCredentials } from './merchant.model';
import { MerchantNotificationsService } from './merchant-notifications.service';

@Component({
  selector: 'app-merchant-credentials',
  standalone: true,
  imports: [CommonModule, CardComponent, ButtonComponent, StatusBadgeComponent],
  template: `
    <section class="mx-auto w-full max-w-7xl min-w-0 space-y-6" aria-labelledby="merchant-api-credentials-title">
      <!-- Section Header -->
      <div>
        <h1 id="merchant-api-credentials-title" class="text-2xl sm:text-3xl font-black text-[#1d1b2c] tracking-tight">
          {{ credentials() ? 'API Credentials & Authentication' : 'API Credentials' }}
        </h1>
        @if (credentials()) {
          <p class="text-xs text-[#6f6d85] font-medium mt-1">
            OAuth 2.0 Client Credentials, access tokens, and integration specifications for merchant APIs.
          </p>
        }
      </div>

      <!-- Main Credentials Card -->
      <ui-card
        [title]="credentials() ? 'API credentials' : 'Connect to the merchant API'"
        [subtitle]="credentials() ? 'Use these OAuth 2.0 client credentials to request an access token for your merchant integration.' : ''"
      >
        @if (credentials(); as item) {
          <div uiCardActions>
            <ui-status-badge
              [status]="item.status"
              [tone]="item.status === 'APPROVED' ? 'success' : 'warning'"
              [label]="item.status"
            />
          </div>
        }

        @if (credentials(); as item) {
          @if (item.status === 'PENDING') {
            <div class="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-xs text-amber-900 leading-relaxed font-medium" role="status">
              Your merchant registration is awaiting administrator approval. An administrator will securely hand over your API credentials after approval.
            </div>
          } @else {
            <div class="grid grid-cols-1 xl:grid-cols-2 items-start gap-4 pt-2">
              <!-- Client ID Row -->
              <div class="p-4 rounded-2xl bg-[#faf8f6] border border-[#e8e2dc] space-y-2">
                <div class="flex items-center justify-between">
                  <label for="clientId" class="block text-xs font-bold text-[#1d1b2c]">Client ID</label>
                  <span
                    *ngIf="item.clientId"
                    (click)="copyText(item.clientId, 'Client ID')"
                    class="text-[11px] font-bold text-[#a53a26] hover:text-[#7e2615] transition-colors cursor-pointer select-none"
                  >
                    {{ copiedField() === 'Client ID' ? '✓ Copied' : 'Copy ID' }}
                  </span>
                </div>
                <code id="clientId" class="block break-all rounded-xl bg-white border border-[#e8e2dc] px-3.5 py-2.5 text-xs font-mono font-bold text-[#1d1b2c] select-all shadow-sm">
                  {{ item.clientId }}
                </code>
              </div>

              <!-- Client Secret Row -->
              <div class="p-4 rounded-2xl bg-[#faf8f6] border border-[#e8e2dc] space-y-2">
                <div class="flex items-center justify-between gap-3">
                  <label for="clientSecret" class="block text-xs font-bold text-[#1d1b2c]">Client secret</label>
                  @if (item.secretAvailableOnce) {
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800">
                      Shown once
                    </span>
                  }
                </div>
                @if (item.clientSecret) {
                  <div class="p-4 rounded-xl border border-amber-200 bg-amber-50/80 space-y-3">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-1.5 text-[11px] font-bold text-amber-900">
                        <svg class="w-3.5 h-3.5 text-amber-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                          <line x1="12" y1="9" x2="12" y2="13"></line>
                          <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        <span>Active One-Time Client Secret</span>
                      </div>
                      <span
                        (click)="copyText(item.clientSecret, 'Client Secret')"
                        class="text-[11px] font-bold text-amber-900 hover:text-black transition-colors cursor-pointer underline select-none"
                      >
                        {{ copiedField() === 'Client Secret' ? '✓ Copied' : 'Copy Secret' }}
                      </span>
                    </div>
                    <code id="clientSecret" class="block break-all rounded-lg border border-amber-300 bg-white px-3 py-2.5 text-xs font-mono font-bold text-slate-900 select-all shadow-sm">
                      {{ item.clientSecret }}
                    </code>
                    <p class="text-[11px] text-slate-600 leading-normal">
                      Copy and store this secret securely. It will not be shown again after you hide it or leave this page.
                    </p>
                    <div class="pt-1">
                      <ui-button variant="secondary" (click)="hideSecret()">Done</ui-button>
                    </div>
                  </div>
                } @else {
                  <p class="rounded-xl bg-white border border-[#e8e2dc] px-4 py-3 text-xs text-[#6f6d85] leading-relaxed">
                    The secret is unavailable in this view. Use the copy saved during the one-time administrator handoff.
                  </p>
                }
              </div>

              @if (showTokenRequest()) {
                <!-- Token Request Guide -->
                <div class="xl:col-span-2 rounded-2xl border border-[#eee7e0] p-5 bg-white space-y-3">
                  <div class="flex items-center justify-between">
                    <div>
                      <h3 class="text-xs font-black uppercase tracking-wider text-[#1d1b2c]">Token request</h3>
                      <p class="text-xs text-[#6f6d85] mt-0.5">
                        Request a short-lived bearer token using the client credentials grant. Send the token in the Authorization header when calling merchant APIs.
                      </p>
                    </div>
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#a53a26]/10 text-[#a53a26]">
                      OAuth 2.0
                    </span>
                  </div>

                  <div class="space-y-2 pt-1">
                    <span class="text-[10px] uppercase font-bold text-[#a09eaf] block">Request Header Format</span>
                    <code class="block overflow-x-auto rounded-xl bg-[#1d1b2c] px-4 py-3 text-xs font-mono text-[#faf8f6] shadow-sm">Authorization: Bearer &lt;access-token&gt;</code>
                  </div>

                  <!-- Integration Quick Reference -->
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-[11px]">
                    <div class="p-3 rounded-xl bg-[#faf8f6] border border-[#e8e2dc]">
                      <span class="font-bold text-[#1d1b2c] block">Base API URL</span>
                      <span class="font-mono text-[#6f6d85] text-[10px] break-all block mt-0.5">/api/v1/merchant</span>
                    </div>
                    <div class="p-3 rounded-xl bg-[#faf8f6] border border-[#e8e2dc]">
                      <span class="font-bold text-[#1d1b2c] block">Grant Type</span>
                      <span class="font-mono text-[#6f6d85] text-[10px] block mt-0.5">client_credentials</span>
                    </div>
                    <div class="p-3 rounded-xl bg-[#faf8f6] border border-[#e8e2dc]">
                      <span class="font-bold text-[#1d1b2c] block">Rate Limit</span>
                      <span class="font-mono text-[#6f6d85] text-[10px] block mt-0.5">60 requests / min</span>
                    </div>
                  </div>
                </div>
              }

              <p class="xl:col-span-2 text-xs text-slate-500 font-medium">
                Hand over these credentials securely to the merchant. The secret cannot be retrieved again from this page.
              </p>
            </div>
          }
        } @else {
          <dl class="divide-y divide-[#eee7e0]">
            <div class="grid gap-2 pb-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
              <dt class="text-sm font-bold text-[#1d1b2c]">Get an access token</dt>
              <dd class="min-w-0 space-y-2">
                <code class="block break-all rounded-xl bg-[#faf8f6] px-3 py-2.5 text-xs font-semibold text-[#1d1b2c]">POST /api/v1/auth/token</code>
                <p class="text-xs leading-relaxed text-[#6f6d85]">
                  Use the client ID and secret from your administrator with <code>grant_type=client_credentials</code>.
                </p>
              </dd>
            </div>
            <div class="grid gap-2 py-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
              <dt class="text-sm font-bold text-[#1d1b2c]">Send the token</dt>
              <dd class="min-w-0">
                <code class="block break-all rounded-xl bg-[#faf8f6] px-3 py-2.5 text-xs font-semibold text-[#1d1b2c]">Authorization: Bearer &lt;access-token&gt;</code>
              </dd>
            </div>
            <div class="grid gap-2 pt-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
              <dt class="text-sm font-bold text-[#1d1b2c]">Lost your secret?</dt>
              <dd class="text-xs leading-relaxed text-[#6f6d85]">
                Ask an administrator for a replacement. Claim it once from the notification bell within 24 hours.
              </dd>
            </div>
          </dl>
        }
      </ui-card>
    </section>
  `,
})
export class MerchantCredentialsComponent {
  readonly credentials = input<MerchantApiCredentials | null>(null);
  readonly showTokenRequest = input<boolean>(false);
  readonly secretSaved = output<void>();
  readonly copiedField = signal<string | null>(null);
  private readonly notifications = inject(MerchantNotificationsService);

  hideSecret(): void {
    this.secretSaved.emit();
    this.notifications.add('Client secret hidden', 'The one-time client secret was removed from this view.', 'info');
  }

  copyText(text: string | null | undefined, label: string): void {
    if (!text) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.copiedField.set(label);
        this.notifications.add(`${label} copied`, `${label} copied to clipboard.`);
        setTimeout(() => this.copiedField.set(null), 2000);
      }).catch(() => this.notifications.add(`${label} not copied`, 'Clipboard access was unavailable; copy the value manually.', 'error'));
    } else {
      this.notifications.add(`${label} not copied`, 'Clipboard access was unavailable; copy the value manually.', 'error');
    }
  }
}
