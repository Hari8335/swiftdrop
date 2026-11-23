import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { BadgeTone, ButtonComponent, CardComponent, StatusBadgeComponent } from 'ui';
import { MerchantApiCredentials } from './merchant.model';
import { MerchantNotificationsService } from './merchant-notifications.service';

export type ConnectionStatusType =
  | 'Awaiting approval'
  | 'Credentials available through secure handoff'
  | 'Action required'
  | 'Credentials revoked or unavailable';

@Component({
  selector: 'app-merchant-credentials',
  standalone: true,
  imports: [CommonModule, CardComponent, ButtonComponent, StatusBadgeComponent],
  template: `
    <section class="mx-auto w-full max-w-7xl min-w-0 space-y-6" aria-labelledby="merchant-api-credentials-title">
      <!-- Section A: Page Header -->
      <header class="space-y-1">
        <h1 id="merchant-api-credentials-title" class="text-2xl sm:text-3xl font-black text-[#1d1b2c] tracking-tight">
          API Credentials
        </h1>
        <p class="text-xs sm:text-sm text-[#6f6d85] font-medium leading-relaxed max-w-2xl">
          Connect your online store to SwiftDrop to create and manage deliveries automatically.
        </p>
      </header>

      <!-- Section B: Connection Status -->
      <section aria-label="Connection Status">
        <div
          class="rounded-2xl border p-5 transition-all shadow-xs"
          [ngClass]="statusCardClasses()"
          role="status"
        >
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <span
                class="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                [ngClass]="statusIconContainerClasses()"
              >
                @if (connectionStatus().tone === 'warning') {
                  <svg class="h-5 w-5 text-amber-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                } @else if (connectionStatus().tone === 'info' || connectionStatus().tone === 'brand') {
                  <svg class="h-5 w-5 text-[#a53a26]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                } @else {
                  <svg class="h-5 w-5 text-[#6f6d85]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                }
              </span>
              <div>
                <span class="text-[10px] font-black uppercase tracking-wider text-[#6f6d85] block">
                  Integration Status
                </span>
                <h2 class="text-sm font-black text-[#1d1b2c] tracking-tight">
                  {{ connectionStatus().title }}
                </h2>
              </div>
            </div>

            <div class="self-start sm:self-auto">
              <ui-status-badge
                [status]="connectionStatus().badgeStatus"
                [tone]="connectionStatus().tone"
                [label]="connectionStatus().status"
              />
            </div>
          </div>
          <p class="mt-3 text-xs leading-relaxed text-[#6f6d85]">
            {{ connectionStatus().message }}
          </p>
        </div>
      </section>

      <!-- Section C: Getting Started Guide -->
      <section aria-labelledby="getting-started-heading" class="space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <h2 id="getting-started-heading" class="text-base font-black text-[#1d1b2c] tracking-tight">
              Getting Started Guide
            </h2>
            <p class="text-xs text-[#6f6d85] mt-0.5">
              Follow these three simple steps to integrate your online storefront with SwiftDrop.
            </p>
          </div>
          <span class="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#a53a26]/10 text-[#a53a26]">
            3-Step Integration
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Step 1 -->
          <div class="rounded-2xl border border-[#eee7e0] bg-white p-5 shadow-xs flex flex-col justify-between space-y-3 hover:border-[#a53a26]/30 transition-colors">
            <div class="space-y-2.5">
              <div class="flex items-center justify-between">
                <span class="flex h-7 w-7 items-center justify-center rounded-full bg-[#a53a26]/10 text-xs font-black text-[#a53a26]">
                  1
                </span>
                <span class="grid h-8 w-8 place-items-center rounded-xl bg-[#faf8f6] text-[#a53a26]" aria-hidden="true">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 2l-2 2m-1.5 1.5L14 9l-1.5-1.5L10 10.5 12 12.5l-2 2-2-2-5 5a2.12 2.12 0 0 0 3 3l5-5-2-2 2-2 1.5 1.5L19 7l1.5-1.5L22 4l-1-2z"/>
                  </svg>
                </span>
              </div>
              <h3 class="text-xs font-black text-[#1d1b2c] tracking-tight">
                Step 1 — Get Your Credentials
              </h3>
              <p class="text-xs text-[#6f6d85] leading-relaxed">
                After merchant approval, receive the OAuth Client ID and one-time Client Secret through the approved secure handoff.
              </p>
            </div>
          </div>

          <!-- Step 2 -->
          <div class="rounded-2xl border border-[#eee7e0] bg-white p-5 shadow-xs flex flex-col justify-between space-y-3 hover:border-[#a53a26]/30 transition-colors">
            <div class="space-y-2.5">
              <div class="flex items-center justify-between">
                <span class="flex h-7 w-7 items-center justify-center rounded-full bg-[#a53a26]/10 text-xs font-black text-[#a53a26]">
                  2
                </span>
                <span class="grid h-8 w-8 place-items-center rounded-xl bg-[#faf8f6] text-[#a53a26]" aria-hidden="true">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                    <line x1="8" y1="21" x2="16" y2="21"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
                  </svg>
                </span>
              </div>
              <h3 class="text-xs font-black text-[#1d1b2c] tracking-tight">
                Step 2 — Connect Your Store
              </h3>
              <p class="text-xs text-[#6f6d85] leading-relaxed">
                Configure the credentials in your online store's backend application.
              </p>
            </div>
          </div>

          <!-- Step 3 -->
          <div class="rounded-2xl border border-[#eee7e0] bg-white p-5 shadow-xs flex flex-col justify-between space-y-3 hover:border-[#a53a26]/30 transition-colors">
            <div class="space-y-2.5">
              <div class="flex items-center justify-between">
                <span class="flex h-7 w-7 items-center justify-center rounded-full bg-[#a53a26]/10 text-xs font-black text-[#a53a26]">
                  3
                </span>
                <span class="grid h-8 w-8 place-items-center rounded-xl bg-[#faf8f6] text-[#a53a26]" aria-hidden="true">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                  </svg>
                </span>
              </div>
              <h3 class="text-xs font-black text-[#1d1b2c] tracking-tight">
                Step 3 — Start Creating Deliveries
              </h3>
              <p class="text-xs text-[#6f6d85] leading-relaxed">
                Use SwiftDrop's authenticated Order API to create delivery requests automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Section D: Credential Management -->
      <ui-card
        title="API credentials"
        subtitle="Use these OAuth 2.0 client credentials to request an access token for your merchant integration."
      >
        <div uiCardActions>
          @if (credentials(); as item) {
            <ui-status-badge
              [status]="item.status"
              [tone]="item.status === 'APPROVED' ? 'success' : 'warning'"
              [label]="item.status"
            />
          }
        </div>

        @if (credentials(); as item) {
          @if (item.status === 'PENDING') {
            <div class="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-xs text-amber-900 leading-relaxed font-medium" role="status">
              Your merchant registration is awaiting administrator approval. An administrator will securely hand over your API credentials after approval.
            </div>
          } @else {
            <div class="space-y-4 pt-2">
              <div class="grid grid-cols-1 xl:grid-cols-2 items-start gap-4">
                <!-- Client ID Row -->
                <div class="p-4 rounded-2xl bg-[#faf8f6] border border-[#e8e2dc] space-y-2">
                  <div class="flex items-center justify-between">
                    <label for="clientId" class="block text-xs font-bold text-[#1d1b2c]">Client ID</label>
                    <button
                      *ngIf="item.clientId"
                      type="button"
                      id="copy-client-id-btn"
                      (click)="copyText(item.clientId, 'Client ID')"
                      class="text-[11px] font-bold text-[#a53a26] hover:text-[#7e2615] hover:bg-[#faf0ec] cursor-pointer select-none rounded-full px-2.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a53a26]/40"
                    >
                      {{ copiedField() === 'Client ID' ? '✓ Copied' : 'Copy ID' }}
                    </button>
                  </div>
                  <code id="clientId" class="block break-all rounded-xl bg-white border border-[#e8e2dc] px-3.5 py-2.5 text-xs font-mono font-bold text-[#1d1b2c] select-all shadow-xs">
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
                          <svg class="w-3.5 h-3.5 text-amber-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                          </svg>
                          <span>Active One-Time Client Secret</span>
                        </div>
                        <button
                          type="button"
                          id="copy-client-secret-btn"
                          (click)="copyText(item.clientSecret, 'Client Secret')"
                          class="text-[11px] font-bold text-amber-900 hover:text-black hover:bg-amber-100 cursor-pointer select-none rounded-full border border-amber-300 bg-white px-2.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                        >
                          {{ copiedField() === 'Client Secret' ? '✓ Copied' : 'Copy Secret' }}
                        </button>
                      </div>
                      <code id="clientSecret" class="block break-all rounded-lg border border-amber-300 bg-white px-3 py-2.5 text-xs font-mono font-bold text-slate-900 select-all shadow-xs">
                        {{ item.clientSecret }}
                      </code>
                      <p class="text-[11px] text-slate-600 leading-normal">
                        Copy and store this secret securely. It will not be shown again after you hide it or leave this page.
                      </p>
                      <div class="pt-1">
                        <ui-button id="hide-secret-btn" variant="secondary" (click)="hideSecret()">Done</ui-button>
                      </div>
                    </div>
                  } @else {
                    <p class="rounded-xl bg-white border border-[#e8e2dc] px-4 py-3 text-xs text-[#6f6d85] leading-relaxed">
                      The secret is unavailable in this view. Use the copy saved during the one-time administrator handoff.
                    </p>
                  }
                </div>
              </div>

              <!-- Security & Rotation Guidance Note -->
              <div class="rounded-2xl bg-[#faf8f6] border border-[#e8e2dc] p-4 text-xs text-[#6f6d85] space-y-1">
                <span class="font-bold text-[#1d1b2c] block">Credential Lifecycle & Governance</span>
                <p class="leading-relaxed">
                  SwiftDrop uses standard OAuth 2.0 client credentials. To rotate or recover credentials, an administrator must authorize a new one-time handoff through the secure recovery protocol. SwiftDrop never issues static API keys.
                </p>
              </div>
            </div>
          }
        } @else {
          <!-- Merchant Portal View (Credentials not loaded in memory) -->
          <div class="space-y-4 pt-2">
            <div class="rounded-2xl bg-[#faf8f6] border border-[#e8e2dc] p-5 text-xs text-[#6f6d85] leading-relaxed space-y-2" role="status">
              <p class="font-semibold text-[#1d1b2c]">OAuth 2.0 Integration Information</p>
              <p>
                After your registration is approved, an administrator will securely hand over your client ID and one-time client secret.
                Use your saved credentials to request an access token. This page does not retrieve or redisplay your secret.
              </p>
            </div>

            <!-- Security & Rotation Guidance Note -->
            <div class="rounded-2xl bg-[#faf8f6] border border-[#e8e2dc] p-4 text-xs text-[#6f6d85] space-y-1">
              <span class="font-bold text-[#1d1b2c] block">Credential Lifecycle & Governance</span>
              <p class="leading-relaxed">
                SwiftDrop uses standard OAuth 2.0 client credentials. To rotate or recover credentials, an administrator must authorize a new one-time handoff through the secure recovery protocol. SwiftDrop never issues static API keys.
              </p>
            </div>
          </div>
        }
      </ui-card>

      <!-- Section E: Developer Integration Guide (Expandable) -->
      @if (showTokenRequest()) {
        <section aria-labelledby="developer-guide-heading">
          <details
            class="group rounded-2xl border border-[#eee7e0] bg-white overflow-hidden shadow-xs transition-all"
            [open]="isDevGuideOpen()"
          >
            <summary
              class="flex items-center justify-between p-5 sm:p-6 cursor-pointer select-none bg-white hover:bg-[#faf8f6] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a53a26]"
              (click)="toggleDevGuide($event)"
            >
              <div class="flex items-center gap-3">
                <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#faf8f6] text-[#a53a26]" aria-hidden="true">
                  <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                  </svg>
                </span>
                <div>
                  <h2 id="developer-guide-heading" class="text-sm sm:text-base font-black text-[#1d1b2c] tracking-tight">
                    Developer Integration Guide
                  </h2>
                  <p class="text-xs text-[#6f6d85] mt-0.5">
                    Technical documentation, endpoints, token request formats, and order payload examples.
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2 pl-3">
                <span class="text-xs font-bold text-[#a53a26] hidden sm:inline">
                  {{ isDevGuideOpen() ? 'Hide Technical Docs' : 'Show Technical Docs' }}
                </span>
                <span
                  class="grid h-8 w-8 place-items-center rounded-full bg-[#faf8f6] text-[#6f6d85] group-open:rotate-180 transition-transform duration-200"
                  aria-hidden="true"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </span>
              </div>
            </summary>

            <div class="border-t border-[#f0ece8] p-5 sm:p-6 space-y-6 bg-[#faf8f6]/50">
              <!-- Token Endpoint & Exchange -->
              <div class="rounded-2xl border border-[#eee7e0] bg-white p-5 space-y-3">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span class="text-[10px] font-black uppercase tracking-wider text-[#a53a26] block">Step A — Token Exchange</span>
                    <h3 class="text-xs font-black text-[#1d1b2c] uppercase tracking-wide">OAuth Token Endpoint</h3>
                    <p class="text-xs text-[#6f6d85] mt-0.5">
                      Issue a POST request to exchange your client credentials for a signed 15-minute JWT bearer token.
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#a53a26]/10 text-[#a53a26]">
                      OAuth 2.0
                    </span>
                    <button
                      type="button"
                      (click)="copyText(tokenEndpoint, 'Token Endpoint')"
                      class="text-xs font-bold text-[#a53a26] hover:text-[#7e2615] hover:bg-[#faf0ec] cursor-pointer rounded-full px-2.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a53a26]/40"
                    >
                      {{ copiedField() === 'Token Endpoint' ? '✓ Copied' : 'Copy Endpoint' }}
                    </button>
                  </div>
                </div>

                <div class="space-y-1">
                  <span class="text-[10px] uppercase font-bold text-[#a09eaf] block">Endpoint</span>
                  <code class="block overflow-x-auto rounded-xl bg-[#1d1b2c] px-4 py-2.5 text-xs font-mono font-bold text-[#faf8f6]">
                    {{ tokenEndpoint }}
                  </code>
                </div>

                <!-- Token Request Snippets -->
                <div class="space-y-2 pt-2">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] uppercase font-bold text-[#a09eaf]">Token Request Example (cURL)</span>
                    <button
                      type="button"
                      (click)="copyText(tokenCurlSnippet, 'Token cURL Snippet')"
                      class="text-[11px] font-bold text-[#a53a26] hover:text-[#7e2615] hover:bg-[#faf0ec] cursor-pointer rounded-full px-2.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a53a26]/40"
                    >
                      {{ copiedField() === 'Token cURL Snippet' ? '✓ Copied snippet' : 'Copy cURL' }}
                    </button>
                  </div>
                  <pre class="block overflow-x-auto rounded-xl bg-[#1d1b2c] p-4 text-xs font-mono text-[#faf8f6] leading-relaxed"><code>{{ tokenCurlSnippet }}</code></pre>
                </div>

                <!-- Token JSON Request Body -->
                <div class="space-y-2 pt-1">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] uppercase font-bold text-[#a09eaf]">Request JSON Body</span>
                    <button
                      type="button"
                      (click)="copyText(tokenJsonSnippet, 'Token JSON Snippet')"
                      class="text-[11px] font-bold text-[#a53a26] hover:text-[#7e2615] hover:bg-[#faf0ec] cursor-pointer rounded-full px-2.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a53a26]/40"
                    >
                      {{ copiedField() === 'Token JSON Snippet' ? '✓ Copied JSON' : 'Copy JSON' }}
                    </button>
                  </div>
                  <pre class="block overflow-x-auto rounded-xl bg-[#1d1b2c] p-4 text-xs font-mono text-[#faf8f6] leading-relaxed"><code>{{ tokenJsonSnippet }}</code></pre>
                </div>
              </div>

              <!-- Order Creation Endpoint & Headers -->
              <div class="rounded-2xl border border-[#eee7e0] bg-white p-5 space-y-3">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span class="text-[10px] font-black uppercase tracking-wider text-[#a53a26] block">Step B — Create Deliveries</span>
                    <h3 class="text-xs font-black text-[#1d1b2c] uppercase tracking-wide">Merchant Order Creation Endpoint</h3>
                    <p class="text-xs text-[#6f6d85] mt-0.5">
                      Call SwiftDrop's Order API using your bearer token to register automated parcels.
                    </p>
                  </div>
                  <button
                    type="button"
                    (click)="copyText(orderEndpoint, 'Order Endpoint')"
                    class="text-xs font-bold text-[#a53a26] hover:text-[#7e2615] hover:bg-[#faf0ec] cursor-pointer self-start sm:self-auto rounded-full px-2.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a53a26]/40"
                  >
                    {{ copiedField() === 'Order Endpoint' ? '✓ Copied' : 'Copy Endpoint' }}
                  </button>
                </div>

                <div class="space-y-1">
                  <span class="text-[10px] uppercase font-bold text-[#a09eaf] block">Endpoint</span>
                  <code class="block overflow-x-auto rounded-xl bg-[#1d1b2c] px-4 py-2.5 text-xs font-mono font-bold text-[#faf8f6]">
                    {{ orderEndpoint }}
                  </code>
                </div>

                <!-- Authorization Header -->
                <div class="space-y-2 pt-2">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] uppercase font-bold text-[#a09eaf]">Authorization Header Format</span>
                    <button
                      type="button"
                      (click)="copyText(authHeaderSnippet, 'Auth Header')"
                      class="text-[11px] font-bold text-[#a53a26] hover:text-[#7e2615] hover:bg-[#faf0ec] cursor-pointer rounded-full px-2.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a53a26]/40"
                    >
                      {{ copiedField() === 'Auth Header' ? '✓ Copied header' : 'Copy Header' }}
                    </button>
                  </div>
                  <code class="block overflow-x-auto rounded-xl bg-[#1d1b2c] px-4 py-3 text-xs font-mono text-[#faf8f6]">
                    {{ authHeaderSnippet }}
                  </code>
                </div>

                <!-- Idempotency-Key Header & Guarantee -->
                <div class="space-y-2 pt-2">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] uppercase font-bold text-[#a09eaf]">Idempotency-Key Header (Required)</span>
                    <button
                      type="button"
                      (click)="copyText(idempotencySnippet, 'Idempotency Header')"
                      class="text-[11px] font-bold text-[#a53a26] hover:text-[#7e2615] hover:bg-[#faf0ec] cursor-pointer rounded-full px-2.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a53a26]/40"
                    >
                      {{ copiedField() === 'Idempotency Header' ? '✓ Copied header' : 'Copy Header' }}
                    </button>
                  </div>
                  <code class="block overflow-x-auto rounded-xl bg-[#1d1b2c] px-4 py-3 text-xs font-mono text-[#faf8f6]">
                    {{ idempotencySnippet }}
                  </code>
                  <div class="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-950 space-y-1">
                    <span class="font-bold block">Why Idempotency Matters</span>
                    <p class="leading-relaxed text-[11px] text-amber-900">
                      Supply a unique UUID for each delivery creation request. If a connection fails or times out, replaying the exact same request with the same <code>Idempotency-Key</code> is guaranteed not to create duplicate orders or double-charge delivery fees.
                    </p>
                  </div>
                </div>

                <!-- Order Payload Example -->
                <div class="space-y-2 pt-2">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] uppercase font-bold text-[#a09eaf]">Create Order Request Payload</span>
                    <button
                      type="button"
                      (click)="copyText(orderJsonSnippet, 'Order Payload')"
                      class="text-[11px] font-bold text-[#a53a26] hover:text-[#7e2615] hover:bg-[#faf0ec] cursor-pointer rounded-full px-2.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a53a26]/40"
                    >
                      {{ copiedField() === 'Order Payload' ? '✓ Copied JSON' : 'Copy Payload' }}
                    </button>
                  </div>
                  <pre class="block overflow-x-auto rounded-xl bg-[#1d1b2c] p-4 text-xs font-mono text-[#faf8f6] leading-relaxed"><code>{{ orderJsonSnippet }}</code></pre>
                </div>
              </div>
            </div>
          </details>
        </section>
      }
    </section>
  `,
})
export class MerchantCredentialsComponent {
  readonly credentials = input<MerchantApiCredentials | null>(null);
  readonly showTokenRequest = input<boolean>(true);
  readonly statusOverride = input<ConnectionStatusType | null>(null);
  readonly secretSaved = output<void>();
  readonly copiedField = signal<string | null>(null);
  readonly isDevGuideOpen = signal<boolean>(false);
  private readonly notifications = inject(MerchantNotificationsService);

  readonly tokenEndpoint = 'POST /api/v1/auth/token';
  readonly orderEndpoint = 'POST /api/v1/merchant/orders';
  readonly authHeaderSnippet = 'Authorization: Bearer <access_token>';
  readonly idempotencySnippet = 'Idempotency-Key: <unique-uuid>';

  readonly tokenCurlSnippet = `curl -X POST https://api.swiftdrop.lk/api/v1/auth/token \\
  -H "Content-Type: application/json" \\
  -d '{
    "grant_type": "client_credentials",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET"
  }'`;

  readonly tokenJsonSnippet = `{
  "grant_type": "client_credentials",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET"
}`;

  readonly orderJsonSnippet = `{
  "externalReference": "ORDER-10042",
  "recipientName": "Kasun Perera",
  "recipientPhone": "+94771234567",
  "pickupAddress": {
    "street": "123 Warehouse Rd",
    "city": "Colombo",
    "district": "Colombo",
    "postalCode": "00100"
  },
  "dropoffAddress": {
    "street": "45 Galle Road",
    "city": "Dehiwala",
    "district": "Colombo",
    "postalCode": "10350"
  },
  "size": "MEDIUM",
  "weightKg": 2.5
}`;

  readonly connectionStatus = computed<{
    status: ConnectionStatusType;
    tone: BadgeTone;
    badgeStatus: string;
    title: string;
    message: string;
  }>(() => {
    const override = this.statusOverride();
    if (override) {
      switch (override) {
        case 'Awaiting approval':
          return {
            status: 'Awaiting approval',
            badgeStatus: 'PENDING',
            tone: 'warning',
            title: 'Registration Pending Approval',
            message: 'Your merchant registration is currently awaiting administrator review. API credentials will be issued through secure handoff upon approval.',
          };
        case 'Credentials available through secure handoff':
          return {
            status: 'Credentials available through secure handoff',
            badgeStatus: 'APPROVED',
            tone: 'info',
            title: 'Credentials Ready for Handoff',
            message: 'Your OAuth 2.0 client credentials are ready for collection. Securely copy your credentials below or claim them via your merchant notifications.',
          };
        case 'Action required':
          return {
            status: 'Action required',
            badgeStatus: 'ACTION_REQUIRED',
            tone: 'warning',
            title: 'Action Required',
            message: 'Your credentials require attention. Copy and securely store your one-time client secret before acknowledging this screen.',
          };
        case 'Credentials revoked or unavailable':
          return {
            status: 'Credentials revoked or unavailable',
            badgeStatus: 'UNAVAILABLE',
            tone: 'neutral',
            title: 'Credentials Issued & Secret Unavailable',
            message: 'Client secrets are not stored in the browser and cannot be re-displayed. Use the credentials saved during your administrator handoff.',
          };
      }
    }

    const creds = this.credentials();
    if (creds) {
      if (creds.status === 'PENDING') {
        return {
          status: 'Awaiting approval',
          badgeStatus: 'PENDING',
          tone: 'warning',
          title: 'Registration Pending Approval',
          message: 'Your merchant registration is awaiting administrator approval. An administrator will securely hand over your API credentials after approval.',
        };
      }
      if (creds.clientSecret) {
        return {
          status: 'Credentials available through secure handoff',
          badgeStatus: 'APPROVED',
          tone: 'info',
          title: 'One-Time Credentials Ready',
          message: 'Your OAuth 2.0 client credentials are ready for collection. Copy your client ID and secret securely now — secrets cannot be redisplayed after you leave or hide this view.',
        };
      }
      return {
        status: 'Credentials revoked or unavailable',
        badgeStatus: 'APPROVED',
        tone: 'neutral',
        title: 'Credentials Issued & Secret Unavailable',
        message: 'The secret is unavailable in this view. Use the copy saved during the one-time administrator handoff.',
      };
    }

    const pendingClaim = this.notifications.notifications().find((item) => item.credentialAvailable);
    if (pendingClaim) {
      return {
        status: 'Credentials available through secure handoff',
        badgeStatus: 'ACTION_REQUIRED',
        tone: 'info',
        title: 'Credentials Available for Collection',
        message: 'A replacement credential handoff is available to claim through your merchant notifications.',
      };
    }

    return {
      status: 'Credentials revoked or unavailable',
      badgeStatus: 'UNAVAILABLE',
      tone: 'neutral',
      title: 'OAuth 2.0 Integration Information',
      message: 'After your registration is approved, an administrator will securely hand over your client ID and one-time client secret. Use your saved credentials to request an access token. This page does not retrieve or redisplay your secret.',
    };
  });

  statusCardClasses(): string {
    const tone = this.connectionStatus().tone;
    if (tone === 'warning') {
      return 'border-amber-200 bg-amber-50/60';
    }
    if (tone === 'info' || tone === 'brand') {
      return 'border-[#efcfc3] bg-[#fff5ef]';
    }
    return 'border-[#e8e2dc] bg-[#faf8f6]';
  }

  statusIconContainerClasses(): string {
    const tone = this.connectionStatus().tone;
    if (tone === 'warning') {
      return 'bg-amber-100 text-amber-800';
    }
    if (tone === 'info' || tone === 'brand') {
      return 'bg-[#a53a26]/10 text-[#a53a26]';
    }
    return 'bg-[#e8e2dc] text-[#6f6d85]';
  }

  toggleDevGuide(event: MouseEvent): void {
    event.preventDefault();
    this.isDevGuideOpen.update((v) => !v);
  }

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
      }).catch(() => {
        this.copiedField.set(label);
        setTimeout(() => this.copiedField.set(null), 2000);
      });
    } else {
      this.copiedField.set(label);
      setTimeout(() => this.copiedField.set(null), 2000);
    }
  }
}
