import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription, finalize } from 'rxjs';
import { BulkResult, MerchantBulkService } from './merchant-bulk.service';
import { CSV_HEADER, MAX_CSV_BYTES, PreviewRow, encodeMerchantCsv, parseMerchantCsv } from './merchant-csv';

@Component({
  selector: 'app-merchant-bulk',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
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
              Upload up to 100 orders in a UTF-8 CSV file (maximum 5 MiB). Preview makes no parcels. Review the rows, then confirm creation.
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
                  Select a standardized SwiftDrop 15-column UTF-8 CSV file containing up to 100 delivery manifests.
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
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('csvFile');
  private subscription?: Subscription;
  private reader?: FileReader;
  private generation = 0;
  private submittedKey: string | null = null;
  readonly rows = signal<PreviewRow[]>([]);
  readonly validRows = computed(() => this.rows().filter((row) => !row.errors.length));
  readonly result = signal<BulkResult | null>(null);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly reading = signal(false);
  readonly uploadKey = signal('');
  readonly templateUrl =
    'data:text/csv;charset=utf-8,' +
    encodeURIComponent(
      CSV_HEADER +
        '\nexample-001,Recipient Name,+94771234567,12 Main Road,,Colombo,Colombo,00700,45 Lake Road,,Gampaha,Gampaha,11000,SMALL,1.50\n'
    );
  submittedCsv: string | null = null;
  sourceRows: Record<number, number> = {};

  loadFile(event: Event): void {
    if (this.busy() || this.submittedCsv) return;
    const file = (event.target as HTMLInputElement).files?.[0];
    this.reset();
    if (!file) return;
    if (file.size > MAX_CSV_BYTES) {
      this.error.set('CSV exceeds 5 MiB.');
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
      }
      this.reading.set(false);
    };
    reader.onerror = () => {
      if (generation === this.generation) {
        this.error.set('CSV could not be read.');
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
    } catch (error) {
      this.rows.set([]);
      this.error.set(error instanceof Error ? error.message : 'Invalid CSV.');
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
    this.error.set('');
    this.subscription = this.api
      .submit(this.submittedCsv, this.submittedKey)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (report) => this.result.set(report),
        error: (response) =>
          this.error.set(
            response?.error?.message ||
              'Upload response was not received. Check this upload with the same reference; do not submit it again with a new one.'
          ),
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
    this.error.set('');
    this.uploadKey.set('');
    this.submittedCsv = null;
    this.submittedKey = null;
    this.sourceRows = {};
  }

  ngOnDestroy(): void {
    this.generation++;
    this.reader?.abort();
    this.subscription?.unsubscribe();
  }
}
