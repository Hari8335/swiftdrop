import { Component, input, signal, effect } from '@angular/core';

/**
 * Round (or rounded) user avatar: shows the profile picture / business logo when `src` is set,
 * otherwise the given initials. Size, shape and fallback colours come from the classes the host
 * page puts on `<ui-avatar>`, so it drops into existing badges without layout changes.
 *
 *   <ui-avatar class="w-8 h-8 rounded-full bg-[#a53a26] text-white text-xs font-bold"
 *              [src]="user()?.avatarUrl" [initials]="initials()" />
 */
@Component({
  selector: 'ui-avatar',
  standalone: true,
  host: {
    class: 'inline-flex shrink-0 items-center justify-center overflow-hidden select-none',
    '[attr.data-has-image]': 'showImage() ? "true" : null',
  },
  template: `
    @if (showImage()) {
      <img [src]="src()!" [alt]="alt()" class="block h-full w-full bg-white object-cover" (error)="failed.set(true)" />
    } @else {
      <span aria-hidden="true">{{ initials() }}</span>
    }
  `,
})
export class AvatarComponent {
  /** Image URL (data URL from the auth profile). Null/empty shows the initials. */
  readonly src = input<string | null | undefined>(null);
  readonly initials = input('');
  /** Accessible description of the picture; empty when the name is already shown next to it. */
  readonly alt = input('');

  /** Broken images fall back to initials instead of showing a broken-image icon. */
  protected readonly failed = signal(false);

  constructor() {
    effect(() => {
      this.src();
      this.failed.set(false);
    });
  }

  protected showImage(): boolean {
    return !!this.src() && !this.failed();
  }
}
