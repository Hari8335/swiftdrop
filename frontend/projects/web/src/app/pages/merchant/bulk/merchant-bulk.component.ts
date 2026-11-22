import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription, finalize } from 'rxjs';
import { BulkResult, MerchantBulkService } from './merchant-bulk.service';
import { CSV_HEADER, MAX_CSV_BYTES, PreviewRow, encodeMerchantCsv, parseMerchantCsv } from './merchant-csv';
import { MerchantNotificationBellComponent } from '../merchant-notification-bell.component';
import { MerchantNotificationsService } from '../merchant-notifications.service';

@Component({
  selector: 'app-merchant-bulk',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MerchantNotificationBellComponent],
  template: `
    <div class="min-h-screen bg-[#faf8f6] text-[#1d1b2c] flex flex-col font-sans">
      <!-- Top Navigation Bar -->
      <header class="bg-white border-b border-[#f4efe9] px-6 sm:px-10 py-4 flex items-center justify-between sticky top-0 z-20">
        <div class="flex items-center gap-4">
          <a
            routerLink="/merchant"
            class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#e8e2dc] bg-[#faf8f6] hover:bg-white text-xs font-bold text-[#1d1b2c] hover:text-[#a53a26] transition-colors cursor-pointer shadow-sm"
          >
            <svg class="w-3.5 h-3.5 text-[#a53a26]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Back to merchant portal</span>
          </a>
        </div>

        <div class="flex items-center gap-2">
          <app-merchant-notification-bell />
          <span class="h-11 inline-flex items-center rounded-full border border-[#e8e2dc] bg-[#faf8f6] px-4 text-xs font-bold text-[#1d1b2c]">Sample Merchant</span>
          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#a53a26]/10 text-[#a53a26]">
            Bulk Dispatch
          </span>
        </div>
      </header>

      <!-- Main Container -->
      <main class="flex-1 max-w-6xl w-full mx-auto px-6 sm:px-10 py-8 space-y-8">
        <!-- Hero Title Banner -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#f0ebe5]">
          <div>
            <h1 class="text-2xl sm:text-3xl font-black text-[#1d1b2c] tracking-tight">
              Bulk CSV orders
            </h1>
            <p class="text-xs text-[#6f6d85] font-medium mt-1">
              Upload a CSV, review the preview, then confirm to create the orders.
            </p>
          </div>

          <!-- Template Download Button -->
          <a
            [href]="templateUrl"
            download="merchant-orders-template.csv"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#a53a26]/30 bg-[#faf6f0] hover:bg-white text-xs font-bold text-[#a53a26] transition-colors cursor-pointer shadow-sm self-start sm:self-auto"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Download CSV template</span>
          </a>
        </div>

        <section aria-labelledby="csv-guide-title" class="space-y-4 rounded-3xl border border-[#eee7e0] bg-white p-6 shadow-sm sm:p-8">
          <h2 id="csv-guide-title" class="text-lg font-black text-[#1d1b2c]">How to fill the CSV</h2>
          <ul class="list-disc space-y-2 pl-5 text-sm text-[#6f6d85]">
            <li><strong class="text-[#1d1b2c]">Template.</strong> Keep all 15 columns in the same order. Replace the sample row with your own details.</li>
            <li><strong class="text-[#1d1b2c]">Order.</strong> Use one row per order and a new order reference each time (up to 128 characters).</li>
            <li><strong class="text-[#1d1b2c]">Recipient.</strong> Enter the name and phone number, for example <code>+94771234567</code>.</li>
            <li><strong class="text-[#1d1b2c]">Addresses.</strong> Enter the street, city, Sri Lankan district and postal code for both pickup and drop-off. Only <code>pickupLine2</code> and <code>dropoffLine2</code> can be blank.</li>
            <li><strong class="text-[#1d1b2c]">Parcel.</strong> Pick <code>SMALL</code>, <code>MEDIUM</code> or <code>LARGE</code>. Enter the weight in kg, for example <code>1.50</code> (minimum <code>0.10</code> kg).</li>
            <li><strong class="text-[#1d1b2c]">File.</strong> Save as UTF-8 CSV. Upload up to 100 orders per file (5 MiB max).</li>
          </ul>
          <p class="text-xs text-[#6f6d85]">Spreadsheet tip. Format phone numbers and postal codes as text to keep the + sign and leading zeros.</p>
          <div class="space-y-1">
            <h3 class="text-sm font-bold">Example order row</h3>
            <code data-testid="csv-example-row" class="block break-all rounded-xl bg-[#faf8f6] p-3 text-xs text-[#1d1b2c]">{{ templateExampleRow }}</code>
          </div>
        </section>

        <!-- Upload File Drop Card -->
        <div class="bg-white rounded-3xl border border-[#eee7e0] p-6 sm:p-8 shadow-sm space-y-4">
          <div>
            <span class="text-[10px] font-black uppercase tracking-widest text-[#a53a26]">Batch Ingestion</span>
            <h2 class="text-lg font-black text-[#1d1b2c] tracking-tight mt-0.5">Select CSV File</h2>
          </div>

          <div class="p-6 rounded-2xl border-2 border-dashed border-[#e8e2dc] bg-[#faf8f6] hover:border-[#a53a26]/50 transition-colors space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div class="space-y-1">
                <label for="csv-file" class="block font-bold text-xs text-[#1d1b2c]">CSV file</label>
                <p class="text-[11px] text-[#6f6d85]">
                  Select your completed template to check each row before creating orders.
                </p>
              </div>

              <input
                #csvFile
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                [disabled]="busy() || !!submittedCsv"
                (change)="loadFile($event)"
                class="text-xs text-[#6f6d85] file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#a53a26] file:text-white hover:file:bg-[#7e2615] file:cursor-pointer file:transition-colors file:shadow-sm"
              />
            </div>
          </div>

          <!-- Reading Status Banner -->
          <div *ngIf="reading()" role="status" class="p-4 rounded-2xl bg-[#faf8f6] border border-[#e8e2dc] text-xs font-bold text-[#6f6d85] flex items-center gap-2">
            <div class="w-4 h-4 rounded-full border-2 border-[#a53a26] border-t-transparent animate-spin"></div>
            <span>Reading CSV…</span>
          </div>

          <!-- Error Alert Banner -->
          <div *ngIf="error()" role="alert" class="p-4 rounded-2xl border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-800 flex items-center gap-2">
            <svg class="w-4 h-4 text-rose-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{{ error() }}</span>
          </div>
        </div>

        <!-- Preview & Validation Grid -->
        <section *ngIf="rows().length" class="space-y-6">
          <div class="bg-white rounded-3xl border border-[#eee7e0] p-6 sm:p-8 shadow-sm space-y-6">
            <!-- Preview Header & Counts -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span class="text-[10px] font-black uppercase tracking-widest text-[#a53a26]">Data Validation</span>
                <h2 class="text-xl font-black text-[#1d1b2c] tracking-tight mt-0.5">Preview</h2>
                <p class="text-xs text-[#6f6d85] font-medium mt-1">
                  {{ validRows().length }} valid / {{ rows().length - validRows().length }} invalid rows. Invalid rows will not be submitted. Correct them in the source file and upload again, or remove them here.
                </p>
              </div>

              <!-- Remove Invalid Button -->
              <button
                type="button"
                class="px-4 py-2 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-800 transition-colors cursor-pointer disabled:opacity-50 self-start sm:self-auto"
                [disabled]="busy() || !!submittedCsv"
                (click)="removeInvalid()"
              >
                Remove invalid rows
              </button>
            </div>

            <!-- KPI Summary Cards -->
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div class="p-4 rounded-2xl bg-[#ecfdf5] border border-[#a7f3d0]">
                <span class="text-[10px] uppercase font-bold text-emerald-800 block">Valid Orders</span>
                <span class="text-xl font-black text-emerald-900 block mt-0.5">{{ validRows().length }}</span>
                <span class="text-[11px] text-emerald-700 font-medium">Ready for creation</span>
              </div>
              <div class="p-4 rounded-2xl" [ngClass]="rows().length - validRows().length > 0 ? 'bg-[#fff1f2] border border-[#fecdd3]' : 'bg-[#faf8f6] border border-[#e8e2dc]'">
                <span class="text-[10px] uppercase font-bold block" [ngClass]="rows().length - validRows().length > 0 ? 'text-rose-800' : 'text-[#6f6d85]'">Invalid Rows</span>
                <span class="text-xl font-black block mt-0.5" [ngClass]="rows().length - validRows().length > 0 ? 'text-rose-900' : 'text-[#1d1b2c]'">{{ rows().length - validRows().length }}</span>
                <span class="text-[11px] font-medium" [ngClass]="rows().length - validRows().length > 0 ? 'text-rose-700' : 'text-[#a09eaf]'">Requires correction</span>
              </div>
              <div class="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-[#faf8f6] border border-[#e8e2dc]">
                <span class="text-[10px] uppercase font-bold text-[#6f6d85] block">Total Manifest</span>
                <span class="text-xl font-black text-[#1d1b2c] block mt-0.5">{{ rows().length }}</span>
                <span class="text-[11px] text-[#a09eaf] font-medium">Parsed rows</span>
              </div>
            </div>

            <!-- Preview Table Container -->
            <div class="overflow-hidden rounded-2xl border border-[#f0ebe5]">
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-[#6f6d85]">
                  <thead>
                    <tr class="bg-[#faf8f6] border-b border-[#eee7e0] text-[11px] font-black uppercase tracking-wider text-[#a09eaf]">
                      <th class="py-3 px-4">Source row</th>
                      <th class="py-3 px-4">Reference</th>
                      <th class="py-3 px-4">Recipient</th>
                      <th class="py-3 px-4">Pickup → Dropoff</th>
                      <th class="py-3 px-4">Weight / size</th>
                      <th class="py-3 px-4">Validation</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#f4efe9]">
                    <tr *ngFor="let row of rows()" [class.bg-rose-50]="row.errors.length" class="hover:bg-[#faf8f6]/80 transition-colors">
                      <td class="py-3.5 px-4 font-bold text-[#1d1b2c]">{{ row.rowNumber }}</td>
                      <td class="py-3.5 px-4 font-mono font-bold text-[#a53a26]">{{ row.cells[0] }}</td>
                      <td class="py-3.5 px-4 font-medium text-[#1d1b2c]">{{ row.cells[1] }}</td>
                      <td class="py-3.5 px-4 whitespace-nowrap">{{ row.cells[6] }} → {{ row.cells[11] }}</td>
                      <td class="py-3.5 px-4 whitespace-nowrap font-mono">{{ row.cells[14] }} kg / {{ row.cells[13] }}</td>
                      <td class="py-3.5 px-4">
                        <span
                          *ngIf="!row.errors.length"
                          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#ecfdf5] text-emerald-800"
                        >
                          Valid
                        </span>
                        <span
                          *ngIf="row.errors.length"
                          class="text-rose-700 font-bold block"
                        >
                          {{ row.errors.join('; ') }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Upload Reference / Idempotency Key Card -->
            <div class="p-5 rounded-2xl bg-[#faf8f6] border border-[#e8e2dc] space-y-3">
              <div>
                <label for="upload-key" class="block font-bold text-xs text-[#1d1b2c]">
                  Upload reference (keep this to identify retries)
                </label>
                <p class="text-[11px] text-[#6f6d85] mt-0.5">
                  After confirmation, retry uses the same file and reference. Never use a new reference to repeat an uncertain parcel creation.
                </p>
              </div>

              <input
                id="upload-key"
                class="w-full text-xs font-mono font-bold border border-[#e8e2dc] bg-white rounded-xl px-4 py-2.5 text-[#1d1b2c] focus:outline-none focus:ring-2 focus:ring-[#a53a26]/20 shadow-sm"
                maxlength="128"
                [ngModel]="uploadKey()"
                (ngModelChange)="uploadKey.set($event)"
                [disabled]="busy() || !!submittedCsv"
              />

              <div class="pt-2 flex justify-end">
                <button
                  type="button"
                  class="px-6 py-3 bg-[#a53a26] hover:bg-[#7e2615] text-white font-bold text-xs rounded-full transition-all shadow-md shadow-[#a53a26]/20 disabled:opacity-50 cursor-pointer"
                  (click)="confirm()"
                  [disabled]="busy() || reading() || !validRows().length || !uploadKey().trim() || !!submittedCsv"
                >
                  Confirm {{ validRows().length }} valid orders
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Busy / Ingestion Status -->
        <div *ngIf="busy()" role="status" class="p-6 rounded-3xl bg-white border border-[#eee7e0] text-center shadow-sm space-y-2">
          <div class="w-8 h-8 rounded-full border-2 border-[#a53a26] border-t-transparent animate-spin mx-auto"></div>
          <p class="text-xs font-bold text-[#1d1b2c]">Creating orders…</p>
          <p class="text-[11px] text-[#6f6d85]">Dispatching parcel batch with idempotency lock...</p>
        </div>

        <!-- Ingestion Results Section -->
        <section *ngIf="result() as report" class="bg-white rounded-3xl border border-[#eee7e0] p-6 sm:p-8 shadow-sm space-y-6" aria-live="polite">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f4efe9] pb-4">
            <div>
              <span class="text-[10px] font-black uppercase tracking-widest text-[#a53a26]">Execution Report</span>
              <h2 class="text-xl font-black text-[#1d1b2c] tracking-tight mt-0.5">Upload results</h2>
            </div>
            <div class="text-xs font-bold px-3 py-1.5 rounded-full bg-[#faf8f6] border border-[#e8e2dc] text-[#1d1b2c]">
              {{ report.acceptedRows }} successful / {{ report.rejectedRows }} failed or unresolved / {{ report.totalRows }} total
            </div>
          </div>

          <!-- Results List -->
          <ul class="divide-y divide-[#f4efe9] text-xs">
            <li *ngFor="let item of report.results" class="border-t py-3.5 flex flex-wrap items-center justify-between gap-3">
              <span class="font-bold text-[#1d1b2c]">
                Source row {{ sourceRows[item.rowNumber] || item.rowNumber }}:
              </span>
              <span *ngIf="item.accepted && item.order as order" class="font-mono font-bold text-emerald-800 bg-[#ecfdf5] px-3 py-1 rounded-full">
                {{ order.trackingNumber }} — {{ order.status }} — {{ order.fee | number:'1.2-2' }} LKR
              </span>
              <span *ngIf="!item.accepted" class="text-rose-700 font-bold bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                {{ item.errors.join('; ') }}
              </span>
            </li>
          </ul>
        </section>

        <!-- Success confirmation appears only after every submitted order is accepted. -->
        @if (showSuccessPopup()) {
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-[#1d1b2c]/50 p-4" role="presentation">
            <section class="w-full max-w-md rounded-3xl border border-[#eee7e0] bg-white p-6 shadow-2xl sm:p-8" role="dialog" aria-modal="true" aria-labelledby="bulk-upload-success-title">
              <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700" aria-hidden="true">
                <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="m5 12 4 4L19 6"></path>
                </svg>
              </div>
              <h2 id="bulk-upload-success-title" class="mt-4 text-center text-xl font-black text-[#1d1b2c]">Orders created successfully</h2>
              <p class="mt-2 text-center text-sm text-[#6f6d85]">
                All {{ result()?.acceptedRows }} orders were accepted. You can review them in your merchant dashboard.
              </p>
              <button
                id="bulk-upload-success-ok"
                type="button"
                class="mt-6 w-full rounded-full bg-[#a53a26] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#7e2615] focus:outline-none focus:ring-2 focus:ring-[#a53a26]/30 focus:ring-offset-2"
                (click)="goToDashboard()"
              >
                OK, go to dashboard
              </button>
            </section>
          </div>
        }

        <!-- Bottom Action Toolbar -->
        <div class="flex flex-wrap items-center gap-3 pt-2">
          <button
            *ngIf="submittedCsv"
            type="button"
            class="px-5 py-2.5 rounded-full border border-[#1d1b2c] bg-[#1d1b2c] hover:bg-black text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
            [disabled]="busy()"
            (click)="retry()"
          >
            Check / replay this upload
          </button>
          <button
            *ngIf="rows().length || submittedCsv"
            type="button"
            class="px-5 py-2.5 rounded-full border border-[#e8e2dc] bg-[#faf8f6] hover:bg-white text-[#1d1b2c] text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
            [disabled]="busy()"
            (click)="reset()"
          >
            Start another upload
          </button>
        </div>
      </main>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      font-family: "Plus Jakarta Sans", system-ui, -apple-system, sans-serif;
    }
  `],
})
export class MerchantBulkComponent implements OnDestroy {
  private readonly api = inject(MerchantBulkService);
  private readonly notifications = inject(MerchantNotificationsService);
  private readonly router = inject(Router);
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('csvFile');
  private subscription?: Subscription;
  private reader?: FileReader;
  private generation = 0;
  private submittedKey: string | null = null;
  readonly rows = signal<PreviewRow[]>([]);
  readonly validRows = computed(() => this.rows().filter((row) => !row.errors.length));
  readonly result = signal<BulkResult | null>(null);
  readonly showSuccessPopup = signal(false);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly reading = signal(false);
  readonly uploadKey = signal('');
  readonly templateExampleRow =
    'example-001,Recipient Name,+94771234567,12 Main Road,,Colombo,Colombo,00700,45 Lake Road,,Gampaha,Gampaha,11000,SMALL,1.50';
  readonly templateUrl =
    'data:text/csv;charset=utf-8,' + encodeURIComponent(`${CSV_HEADER}\n${this.templateExampleRow}\n`);
  submittedCsv: string | null = null;
  sourceRows: Record<number, number> = {};

  loadFile(event: Event): void {
    if (this.busy() || this.submittedCsv) return;
    const file = (event.target as HTMLInputElement).files?.[0];
    this.reset();
    if (!file) return;
    if (file.size > MAX_CSV_BYTES) {
      this.error.set('CSV exceeds 5 MiB.');
      this.notifications.add('CSV file not accepted', this.error(), 'error');
      return;
    }
    const generation = ++this.generation;
    const reader = new FileReader();
    this.reader = reader;
    this.reading.set(true);
    reader.onload = () => {
      if (generation !== this.generation) return;
      try {
        this.preview(new TextDecoder('utf-8', { fatal: true }).decode(reader.result as ArrayBuffer));
      } catch {
        this.error.set('CSV must be valid UTF-8.');
        this.notifications.add('CSV file not accepted', this.error(), 'error');
      }
      this.reading.set(false);
    };
    reader.onerror = () => {
      if (generation === this.generation) {
        this.error.set('CSV could not be read.');
        this.notifications.add('CSV file could not be read', this.error(), 'error');
        this.reading.set(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  preview(text: string): void {
    try {
      this.rows.set(parseMerchantCsv(text));
      this.uploadKey.set(crypto.randomUUID());
      this.error.set('');
      this.notifications.add('CSV preview ready', `${this.validRows().length} valid order(s) ready for review.`, 'info');
    } catch (error) {
      this.rows.set([]);
      this.error.set(error instanceof Error ? error.message : 'Invalid CSV.');
      this.notifications.add('CSV preview failed', this.error(), 'error');
    }
  }

  removeInvalid(): void {
    if (!this.busy() && !this.submittedCsv) {
      this.rows.set(this.validRows());
    }
  }

  confirm(): void {
    if (
      this.busy() ||
      this.reading() ||
      this.submittedCsv ||
      !this.validRows().length ||
      !this.uploadKey().trim()
    ) {
      return;
    }
    const payload = encodeMerchantCsv(this.validRows());
    this.submittedCsv = payload.csv;
    this.submittedKey = this.uploadKey();
    this.sourceRows = payload.sourceRows;
    this.retry();
  }

  retry(): void {
    if (this.busy() || !this.submittedCsv || !this.submittedKey) return;
    this.busy.set(true);
    this.showSuccessPopup.set(false);
    this.error.set('');
    this.subscription = this.api
      .submit(this.submittedCsv, this.submittedKey)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (report) => {
          this.result.set(report);
          this.showSuccessPopup.set(
            report.totalRows > 0 &&
            report.acceptedRows === report.totalRows &&
            report.rejectedRows === 0 &&
            report.results.length === report.totalRows &&
            report.results.every((item) => item.accepted)
          );
          this.notifications.add(
            this.showSuccessPopup() ? 'Bulk orders created' : 'Bulk upload needs review',
            `${report.acceptedRows} accepted, ${report.rejectedRows} rejected out of ${report.totalRows} order(s).`,
            this.showSuccessPopup() ? 'success' : 'error'
          );
        },
        error: (response) => {
          this.error.set(
            response?.error?.message ||
              'Upload response was not received. Check this upload with the same reference; do not submit it again with a new one.'
          );
          this.notifications.add('Bulk upload response unavailable', this.error(), 'error');
        },
      });
  }

  reset(): void {
    if (this.busy()) return;
    const input = this.fileInput()?.nativeElement;
    if (input) input.value = '';
    this.generation++;
    this.reader?.abort();
    this.reading.set(false);
    this.rows.set([]);
    this.result.set(null);
    this.showSuccessPopup.set(false);
    this.error.set('');
    this.uploadKey.set('');
    this.submittedCsv = null;
    this.submittedKey = null;
    this.sourceRows = {};
  }

  goToDashboard(): void {
    this.showSuccessPopup.set(false);
    void this.router.navigate(['/merchant']);
  }

  ngOnDestroy(): void {
    this.generation++;
    this.reader?.abort();
    this.subscription?.unsubscribe();
  }
}
