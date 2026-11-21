import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  inject,
  input,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { ScooterCourierScene } from './scooter-courier-3d';

/**
 * 3D scooter courier for the landing hero (Angular wrapper for `createScooterCourier`).
 * three.js and the scene are lazy-loaded in the browser only, after WebGL is confirmed,
 * and the render loop runs outside Angular so it never triggers change detection.
 * The canvas fills this element, so give the host a height.
 */
@Component({
  selector: 'app-scooter-courier-3d',
  standalone: true,
  template: `<div #stage class="stage"></div>`,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
      .stage {
        width: 100%;
        height: 100%;
      }
    `,
  ],
})
export class ScooterCourier3dComponent implements AfterViewInit, OnDestroy {
  readonly interactive = input(true);
  readonly speedLines = input(true);

  @ViewChild('stage', { static: true }) private stageRef!: ElementRef<HTMLDivElement>;

  private readonly zone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);
  private scene: ScooterCourierScene | null = null;
  private destroyed = false;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined' || !this.supportsWebGl()) {
      return;
    }
    this.zone.runOutsideAngular(async () => {
      try {
        const { createScooterCourier } = await import('./scooter-courier-3d');
        if (this.destroyed) return;
        this.scene = createScooterCourier(this.stageRef.nativeElement, {
          interactive: this.interactive(),
          speedLines: this.speedLines(),
        });
      } catch (e) {
        console.warn('3D scooter courier skipped:', e);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.scene?.destroy();
    this.scene = null;
  }

  /** Avoids WebGL errors in tests and old browsers (the hero just shows its glow instead). */
  private supportsWebGl(): boolean {
    try {
      const probe = document.createElement('canvas');
      return !!(probe.getContext('webgl2') || probe.getContext('webgl'));
    } catch {
      return false;
    }
  }
}
