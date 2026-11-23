import { Component, computed, inject, input, signal } from '@angular/core';
import { AuthService } from 'shared-auth';
import { AVATAR_ACCEPT, AvatarImageError, AvatarImageOptions, prepareAvatarImage } from 'ui';

/**
 * Upload / change / remove control for the signed-in user's profile picture, used on the Settings
 * page of every portal (business logo on the merchant portal). Saving updates
 * `AuthService.currentUser`, so every `<ui-avatar>` bound to `avatarUrl` refreshes immediately.
 */
@Component({
  selector: 'app-profile-photo-control',
  standalone: true,
  template: `
    <div id="profile-photo-control" class="mt-4">
      <input
        #fileInput
        type="file"
        id="profile-photo-input"
        class="sr-only"
        [accept]="accept"
        [attr.aria-label]="'Choose ' + label()"
        (change)="onFileSelected($event)"
      />
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          id="profile-photo-upload-btn"
          (click)="fileInput.click()"
          [disabled]="busy()"
          class="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#eee7e0] hover:border-[#a53a26] text-[#a53a26] text-xs font-bold rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg aria-hidden="true" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          {{ busy() === 'upload' ? 'Uploading…' : (hasPhoto() ? 'Change ' : 'Upload ') + label() }}
        </button>
        @if (hasPhoto()) {
          <button
            type="button"
            id="profile-photo-remove-btn"
            (click)="remove()"
            [disabled]="busy()"
            class="px-4 py-2 bg-white border border-[#eee7e0] hover:bg-[#faf8f6] text-[#6f6d85] hover:text-[#1d1b2c] text-xs font-bold rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ busy() === 'remove' ? 'Removing…' : 'Remove' }}
          </button>
        }
      </div>
      <p class="mt-2 text-[11px] text-[#8a8799] font-medium">PNG, JPG or WebP. It is resized to a square and shown everywhere you appear in SwiftDrop.</p>
      @if (error()) {
        <p id="profile-photo-error" role="alert" class="mt-2 text-xs font-semibold text-rose-700">{{ error() }}</p>
      }
      @if (status()) {
        <p id="profile-photo-status" role="status" class="mt-2 text-xs font-semibold text-emerald-700">{{ status() }}</p>
      }
    </div>
  `,
})
export class ProfilePhotoControlComponent {
  private readonly authService = inject(AuthService, { optional: true });

  /** Lower-case noun used in button text, e.g. "photo" or "logo". */
  readonly label = input('photo');
  /** 'cover' crops photos to fill the circle; 'contain' keeps whole logos visible. */
  readonly fit = input<NonNullable<AvatarImageOptions['fit']>>('cover');

  readonly accept = AVATAR_ACCEPT;
  readonly busy = signal<'upload' | 'remove' | null>(null);
  readonly error = signal<string | null>(null);
  readonly status = signal<string | null>(null);
  readonly hasPhoto = computed(() => !!this.authService?.currentUser?.()?.avatarUrl);

  /** Resizes the picked file; separated so tests can stub canvas work that jsdom cannot do. */
  prepare(file: File): Promise<string> {
    return prepareAvatarImage(file, { fit: this.fit() });
  }

  async onFileSelected(event: Event): Promise<void> {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    // Reset so choosing the same file again still fires (change).
    inputEl.value = '';
    if (!file || !this.authService) return;

    this.error.set(null);
    this.status.set(null);
    this.busy.set('upload');
    let image: string;
    try {
      image = await this.prepare(file);
    } catch (e) {
      this.busy.set(null);
      this.error.set(e instanceof AvatarImageError ? e.message : 'That image could not be processed.');
      return;
    }
    this.authService.uploadAvatar(image).subscribe({
      next: () => {
        this.busy.set(null);
        this.status.set(`Your ${this.label()} has been updated.`);
      },
      error: (err) => {
        this.busy.set(null);
        this.error.set(this.messageFrom(err, `Could not upload your ${this.label()}.`));
      },
    });
  }

  remove(): void {
    if (!this.authService) return;
    this.error.set(null);
    this.status.set(null);
    this.busy.set('remove');
    this.authService.removeAvatar().subscribe({
      next: () => {
        this.busy.set(null);
        this.status.set(`Your ${this.label()} has been removed.`);
      },
      error: (err) => {
        this.busy.set(null);
        this.error.set(this.messageFrom(err, `Could not remove your ${this.label()}.`));
      },
    });
  }

  private messageFrom(err: unknown, fallback: string): string {
    const e = err as { error?: { message?: string } } | null;
    return e?.error?.message || fallback;
  }
}
