import { AfterViewInit, Component, ElementRef, OnDestroy, input, output, signal, viewChild } from '@angular/core';
import { MerchantCredentialHandoff } from './merchant-approval.model';

type CopyField = 'clientId' | 'clientSecret';

/**
 * Admin-only, one-time credential handoff shown directly after an approve or recover response.
 *
 * Security notes:
 * - Credentials arrive only through the `credentials` input (the authorized approval/recovery response).
 * - Nothing is written to storage, the URL, analytics, or the console.
 * - The parent clears its in-memory copy when `done` is emitted or the page is destroyed.
 */
@Component({
  selector: 'app-merchant-credential-handoff',
  standalone: true,
  template: `
    @if (credentials(); as item) {
      <section
        id="merchant-credential-handoff"
        class="rounded-[1.5rem] border border-[#efcfc3] bg-white p-5 shadow-[0_8px_24px_rgba(42,32,25,0.06)] sm:p-7"
        aria-labelledby="merchant-handoff-title"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-[#9b432f]">
              {{ item.kind === 'recovery' ? 'Replacement credentials issued' : 'Approval complete' }}
            </p>
            <h2 #heading id="merchant-handoff-title" tabindex="-1" class="mt-1 text-xl font-black tracking-[-0.02em] text-[#211f32] outline-none sm:text-2xl">
              {{ item.kind === 'recovery' ? 'Credentials Replaced — Secure Credential Handoff' : 'Merchant Approved — Secure Credential Handoff' }}
            </h2>
            <p class="mt-1 text-sm text-[#77748a]">
              <strong class="text-[#211f32]">{{ item.businessName }}</strong>
              {{ item.kind === 'recovery' ? 'now has a replacement client secret on its existing client.' : 'is approved and can now be issued API access.' }}
            </p>
          </div>
          <span class="inline-flex w-fit shrink-0 items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            {{ item.kind === 'recovery' ? 'Recovered' : 'Approved' }}
          </span>
        </div>

        @if (item.clientSecret) {
          <div class="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
            <svg class="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>
            </svg>
            <p><strong>This client secret is shown only once.</strong> It cannot be displayed again after you click Done or leave this page. Copy it now and hand it to the merchant through an approved secure channel.</p>
          </div>
        }

        <dl class="mt-5 grid gap-4 lg:grid-cols-2">
          <div class="min-w-0 rounded-2xl border border-[#e8e2dc] bg-[#faf8f6] p-4">
            <div class="flex items-center justify-between gap-3">
              <dt class="text-xs font-bold text-[#211f32]">OAuth Client ID</dt>
              <button id="handoff-copy-client-id" type="button"
                class="rounded-full px-2 py-1 text-xs font-bold text-[#9b432f] hover:bg-[#fff5ef] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d7b4a7]"
                (click)="copy('clientId', item.clientId)">
                {{ copied() === 'clientId' ? 'Copied' : 'Copy Client ID' }}
              </button>
            </div>
            <dd><code id="handoff-client-id" class="mt-2 block break-all rounded-xl border border-[#e8e2dc] bg-white px-3 py-2.5 font-mono text-xs font-bold text-[#211f32]">{{ item.clientId }}</code></dd>
          </div>

          <div class="min-w-0 rounded-2xl border border-[#e8e2dc] bg-[#faf8f6] p-4">
            <div class="flex items-center justify-between gap-3">
              <dt class="text-xs font-bold text-[#211f32]">
                Client Secret
                @if (item.clientSecret) {
                  <span class="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-800">Shown once</span>
                }
              </dt>
              @if (item.clientSecret) {
                <button id="handoff-copy-client-secret" type="button"
                  class="rounded-full px-2 py-1 text-xs font-bold text-[#9b432f] hover:bg-[#fff5ef] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d7b4a7]"
                  (click)="copy('clientSecret', item.clientSecret)">
                  {{ copied() === 'clientSecret' ? 'Copied' : 'Copy Client Secret' }}
                </button>
              }
            </div>
            <dd>
              @if (item.clientSecret) {
                <code id="handoff-client-secret" class="mt-2 block break-all rounded-xl border border-amber-300 bg-white px-3 py-2.5 font-mono text-xs font-bold text-[#211f32]">{{ item.clientSecret }}</code>
              } @else {
                <p id="handoff-secret-unavailable" class="mt-2 rounded-xl border border-[#e8e2dc] bg-white px-3 py-2.5 text-xs text-[#77748a]">
                  The secret is unavailable in this response. It is never stored for redisplay; use credential recovery if the merchant did not receive it.
                </p>
              }
            </dd>
          </div>
        </dl>

        @if (copyError()) {
          <p class="mt-3 text-xs font-semibold text-rose-700" role="alert">{{ copyError() }}</p>
        }

        <div class="mt-5 rounded-2xl border border-[#e8e2dc] bg-[#faf8f6] p-4 text-xs leading-relaxed text-[#77748a]">
          <p class="font-bold text-[#211f32]">Secure handoff</p>
          <ul class="mt-1 list-disc space-y-0.5 pl-4">
            <li>Send the Client ID and Client Secret through separate approved secure channels — never in the same plain email or chat message.</li>
            <li>Do not paste the secret into tickets, screenshots or shared documents.</li>
            <li>If the merchant loses the secret, use <em>Recover credentials</em> to issue a replacement; the old secret stops issuing new tokens.</li>
          </ul>
        </div>

        <div class="mt-5 flex justify-end">
          <button id="handoff-done" type="button"
            class="rounded-full bg-[#9b432f] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#833724] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d7b4a7] focus-visible:ring-offset-2"
            (click)="finish()">
            {{ item.clientSecret ? 'Done — I have handed over the credentials' : 'Done' }}
          </button>
        </div>
      </section>
    }
  `,
})
export class MerchantCredentialHandoffComponent implements AfterViewInit, OnDestroy {
  readonly credentials = input<MerchantCredentialHandoff | null>(null);
  readonly done = output<void>();
  readonly copied = signal<CopyField | null>(null);
  readonly copyError = signal<string | null>(null);
  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');
  private copiedTimer: ReturnType<typeof setTimeout> | null = null;

  ngAfterViewInit(): void {
    // Move focus to the handoff so keyboard and screen-reader users land on it.
    this.heading()?.nativeElement.focus();
  }

  ngOnDestroy(): void {
    this.resetCopyState();
  }

  copy(field: CopyField, value: string | null): void {
    if (!value) return;
    this.copyError.set(null);
    const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
    if (!clipboard) {
      this.copyError.set('Clipboard is unavailable in this browser. Select the value and copy it manually.');
      return;
    }
    clipboard.writeText(value).then(
      () => this.markCopied(field),
      () => this.copyError.set('Copy failed. Select the value and copy it manually.'),
    );
  }

  finish(): void {
    this.resetCopyState();
    this.done.emit();
  }

  private markCopied(field: CopyField): void {
    this.copied.set(field);
    if (this.copiedTimer) clearTimeout(this.copiedTimer);
    this.copiedTimer = setTimeout(() => this.copied.set(null), 2000);
  }

  private resetCopyState(): void {
    if (this.copiedTimer) clearTimeout(this.copiedTimer);
    this.copiedTimer = null;
    this.copied.set(null);
    this.copyError.set(null);
  }
}
