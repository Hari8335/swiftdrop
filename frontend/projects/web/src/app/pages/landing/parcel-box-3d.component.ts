import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  NgZone,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

type ThreeType = typeof import('three');

@Component({
  selector: 'app-parcel-box-3d',
  standalone: true,
  template: `
    <div
      #container
      class="parcel-canvas-container"
      (pointerenter)="onPointerEnter()"
      (pointerleave)="onPointerLeave()"
      (pointermove)="onPointerMove($event)"
      (pointerdown)="onPointerDown($event)"
      (pointerup)="onPointerUp()"
      (pointercancel)="onPointerUp()"
    >
      <canvas #canvas class="parcel-canvas"></canvas>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        max-width: 500px;
        aspect-ratio: 1 / 0.95;
        margin: 0 auto;
        position: relative;
        touch-action: none;
        user-select: none;
      }
      .parcel-canvas-container {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: grab;
        background: transparent;
      }
      .parcel-canvas-container:active {
        cursor: grabbing;
      }
      .parcel-canvas {
        width: 100% !important;
        height: 100% !important;
        display: block;
        outline: none;
        background: transparent;
      }
    `,
  ],
})
export class ParcelBox3dComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private THREE: ThreeType | null = null;
  private renderer: any = null;
  private scene: any = null;
  private camera: any = null;
  private boxGroup: any = null;
  private shadowMesh: any = null;

  private animationFrameId: number | null = null;
  private isVisible = true;
  private intersectionObserver: IntersectionObserver | null = null;
  private resizeObserver: ResizeObserver | null = null;

  // Interaction & Physics state
  private isHovered = false;
  private isDragging = false;
  private previousPointerPos = { x: 0, y: 0 };
  private targetRotation = { x: 0.15, y: -0.45 };
  private currentRotation = { x: 0.15, y: -0.45 };
  private idleTime = 0;

  // Disposables
  private disposables: { dispose: () => void }[] = [];

  constructor(
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined') {
      return;
    }

    // Lazy load Three.js scene outside Angular zone so RAF loop does not trigger change detection
    this.ngZone.runOutsideAngular(() => {
      setTimeout(async () => {
        try {
          // Check for WebGL capability (prevents errors in headless/test environments like JSDOM)
          const canvas = this.canvasRef?.nativeElement;
          if (!canvas) return;
          const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
          if (!gl) return;

          // Dynamically lazy-load Three.js so first paint is unblocked
          this.THREE = await import('three');
          this.initThree(this.THREE);
          this.setupVisibilityObserver();
          this.animate();
        } catch (e) {
          console.warn('3D Parcel WebGL initialization skipped:', e);
        }
      }, 30);
    });
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    // Dispose Three.js objects
    for (const item of this.disposables) {
      try {
        item.dispose();
      } catch {}
    }
    this.disposables = [];

    if (this.renderer) {
      try {
        this.renderer.dispose();
        this.renderer.forceContextLoss();
      } catch {}
      this.renderer = null;
    }
  }

  private initThree(THREE: ThreeType): void {
    const container = this.containerRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;
    const width = container.clientWidth || 460;
    const height = container.clientHeight || 420;

    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    this.camera.position.set(0, 0.35, 5.2);
    this.camera.lookAt(0, 0, 0);

    // 3. Renderer with transparent background and clamped pixel ratio
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.15);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xfffaed, 2.1);
    mainLight.position.set(4, 6, 4.5);
    this.scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0xbad5ff, 0.85);
    rimLight.position.set(-4, -2, -3);
    this.scene.add(rimLight);

    const softFill = new THREE.DirectionalLight(0xffecd6, 0.65);
    softFill.position.set(-3, 3, 3);
    this.scene.add(softFill);

    // 5. Build procedural 3D box group
    this.boxGroup = new THREE.Group();
    this.buildProceduralBox(THREE, this.boxGroup);
    this.scene.add(this.boxGroup);

    // 6. Ground soft contact shadow plane
    this.buildGroundShadow(THREE, this.scene);

    // 7. Resize Observer
    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(container);
  }

  private buildProceduralBox(THREE: ThreeType, group: any): void {
    const boxW = 2.05;
    const boxH = 1.65;
    const boxD = 1.85;

    // A. Kraft textures
    const kraftTexture = this.createKraftTexture(THREE);
    const kraftBump = this.createKraftBumpTexture(THREE);
    this.disposables.push(kraftTexture, kraftBump);

    const kraftMaterial = new THREE.MeshStandardMaterial({
      map: kraftTexture,
      bumpMap: kraftBump,
      bumpScale: 0.012,
      roughness: 0.82,
      metalness: 0.04,
    });
    this.disposables.push(kraftMaterial);

    // Main Box Geometry
    const boxGeo = new THREE.BoxGeometry(boxW, boxH, boxD);
    this.disposables.push(boxGeo);
    const boxMesh = new THREE.Mesh(boxGeo, kraftMaterial);
    group.add(boxMesh);

    // B. Tape Strips (Top Seam & Wrapping over edges)
    const tapeTexture = this.createTapeTexture(THREE);
    this.disposables.push(tapeTexture);
    const tapeMaterial = new THREE.MeshStandardMaterial({
      map: tapeTexture,
      roughness: 0.32,
      metalness: 0.12,
      transparent: true,
      opacity: 0.94,
    });
    this.disposables.push(tapeMaterial);

    // Top center tape
    const topTapeGeo = new THREE.PlaneGeometry(0.38, boxD + 0.04);
    this.disposables.push(topTapeGeo);
    const topTape = new THREE.Mesh(topTapeGeo, tapeMaterial);
    topTape.rotation.x = -Math.PI / 2;
    topTape.position.set(0, boxH / 2 + 0.003, 0);
    group.add(topTape);

    // Front vertical tape wrap
    const frontTapeGeo = new THREE.PlaneGeometry(0.38, 0.45);
    this.disposables.push(frontTapeGeo);
    const frontTape = new THREE.Mesh(frontTapeGeo, tapeMaterial);
    frontTape.position.set(0, boxH / 2 - 0.22, boxD / 2 + 0.003);
    group.add(frontTape);

    // Back vertical tape wrap
    const backTape = new THREE.Mesh(frontTapeGeo, tapeMaterial);
    backTape.rotation.y = Math.PI;
    backTape.position.set(0, boxH / 2 - 0.22, -(boxD / 2 + 0.003));
    group.add(backTape);

    // C. Shipping Label (Front Face Decal)
    const labelTexture = this.createShippingLabelTexture(THREE);
    this.disposables.push(labelTexture);
    const labelMaterial = new THREE.MeshStandardMaterial({
      map: labelTexture,
      roughness: 0.45,
      metalness: 0.02,
    });
    this.disposables.push(labelMaterial);

    const labelGeo = new THREE.PlaneGeometry(1.05, 0.72);
    this.disposables.push(labelGeo);
    const labelMesh = new THREE.Mesh(labelGeo, labelMaterial);
    labelMesh.position.set(0.32, -0.05, boxD / 2 + 0.004);
    group.add(labelMesh);

    // D. Fragile / SwiftDrop Stamp Decal on front
    const stampTexture = this.createStampTexture(THREE);
    this.disposables.push(stampTexture);
    const stampMat = new THREE.MeshStandardMaterial({
      map: stampTexture,
      transparent: true,
      opacity: 0.88,
      roughness: 0.75,
    });
    this.disposables.push(stampMat);
    const stampGeo = new THREE.PlaneGeometry(0.48, 0.36);
    this.disposables.push(stampGeo);
    const stampMesh = new THREE.Mesh(stampGeo, stampMat);
    stampMesh.position.set(-0.58, 0.38, boxD / 2 + 0.004);
    stampMesh.rotation.z = -0.05;
    group.add(stampMesh);
  }

  private buildGroundShadow(THREE: ThreeType, scene: any): void {
    const shadowTexture = this.createShadowTexture(THREE);
    this.disposables.push(shadowTexture);

    const shadowGeo = new THREE.PlaneGeometry(3.6, 3.2);
    this.disposables.push(shadowGeo);

    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this.disposables.push(shadowMat);

    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.set(0, -1.35, 0);
    scene.add(this.shadowMesh);
  }

  // Procedural 2D Texture Generators (HTML5 Canvas)
  private createKraftTexture(THREE: ThreeType): any {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#bf8b5a';
    ctx.fillRect(0, 0, 512, 512);

    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 28;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise * 0.85));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.7));
    }
    ctx.putImageData(imgData, 0, 0);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.035)';
    for (let y = 0; y < 512; y += 14) {
      ctx.fillRect(0, y, 512, 4);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createKraftBumpTexture(THREE: ThreeType): any {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);

    const imgData = ctx.getImageData(0, 0, 256, 256);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 45;
      const v = Math.min(255, Math.max(0, 128 + n));
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
    }
    ctx.putImageData(imgData, 0, 0);

    return new THREE.CanvasTexture(canvas);
  }

  private createTapeTexture(THREE: ThreeType): any {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#9b6c43';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = 'rgba(255, 230, 200, 0.12)';
    ctx.lineWidth = 1;
    for (let x = -256; x < 512; x += 8) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 256, 256);
      ctx.stroke();
    }

    const grad = ctx.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.18)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createShippingLabelTexture(THREE: ThreeType): any {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 350;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 512, 350);

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, 496, 334);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(16, 16, 480, 52);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px -apple-system, sans-serif';
    ctx.fillText('SWIFTDROP PRIORITY', 32, 51);

    ctx.fillStyle = '#a53a26';
    ctx.fillRect(380, 22, 100, 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('EXPRESS', 390, 48);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('TRACK: SD-2026-EXP-COLOMBO', 24, 105);

    ctx.fillStyle = '#000000';
    let x = 24;
    const barcodeWidths = [3, 1, 4, 2, 5, 1, 3, 2, 4, 1, 2, 6, 2, 1, 4, 3, 2, 5, 1, 4, 2, 3, 1, 5, 2, 4];
    while (x < 360) {
      for (const w of barcodeWidths) {
        ctx.fillRect(x, 125, w, 80);
        x += w + Math.floor(Math.random() * 4 + 2);
        if (x >= 360) break;
      }
    }

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(385, 120, 85, 85);
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if ((r + c) % 2 === 0 || (r * c) % 3 === 0) {
          ctx.fillRect(392 + c * 14, 127 + r * 14, 11, 11);
        }
      }
    }

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 225);
    ctx.lineTo(492, 225);
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('TO: REGIONAL HUB — COLOMBO 03, SRI LANKA', 24, 255);
    ctx.font = '14px sans-serif';
    ctx.fillText('WEIGHT: 2.5 KG  •  TIER: STANDARD  •  DISPATCH: LIVE', 24, 285);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.fillText('* * S W I F T D R O P * *', 24, 320);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createStampTexture(THREE: ThreeType): any {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 180;
    const ctx = canvas.getContext('2d')!;

    ctx.strokeStyle = '#a53a26';
    ctx.lineWidth = 5;
    ctx.strokeRect(10, 10, 236, 160);

    ctx.fillStyle = '#a53a26';
    ctx.font = '900 36px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FRAGILE', 128, 75);

    ctx.font = 'bold 20px -apple-system, sans-serif';
    ctx.fillText('HANDLE WITH CARE', 128, 115);

    ctx.font = 'bold 14px -apple-system, sans-serif';
    ctx.fillText('SWIFTDROP LOGISTICS', 128, 145);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createShadowTexture(THREE: ThreeType): any {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 120);
    grad.addColorStop(0, 'rgba(20, 8, 4, 0.45)');
    grad.addColorStop(0.4, 'rgba(40, 15, 8, 0.22)');
    grad.addColorStop(0.8, 'rgba(50, 20, 10, 0.05)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(128, 128, 120, 0, Math.PI * 2);
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
  }

  // Visibility / Performance Management
  private setupVisibilityObserver(): void {
    const container = this.containerRef.nativeElement;
    this.intersectionObserver = new IntersectionObserver((entries) => {
      const entry = entries[0];
      this.isVisible = entry ? entry.isIntersecting : true;
    });
    this.intersectionObserver.observe(container);
  }

  // Animation Loop with Smooth Damping
  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    if (!this.isVisible || !this.renderer || !this.scene || !this.camera || !this.boxGroup) {
      return;
    }

    this.idleTime += 0.016;

    if (this.isHovered || this.isDragging) {
      this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * 0.07;
      this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * 0.07;
    } else {
      const idleYaw = Math.sin(this.idleTime * 0.7) * 0.35 - 0.3;
      const idlePitch = 0.18 + Math.cos(this.idleTime * 0.9) * 0.06;
      this.currentRotation.x += (idlePitch - this.currentRotation.x) * 0.04;
      this.currentRotation.y += (idleYaw - this.currentRotation.y) * 0.04;
    }

    this.boxGroup.rotation.x = this.currentRotation.x;
    this.boxGroup.rotation.y = this.currentRotation.y;

    const floatOffset = Math.sin(this.idleTime * 1.8) * 0.06;
    this.boxGroup.position.y = floatOffset;

    if (this.shadowMesh) {
      const shadowScale = 1 - floatOffset * 0.6;
      this.shadowMesh.scale.set(shadowScale, shadowScale, 1);
    }

    this.renderer.render(this.scene, this.camera);
  };

  // Pointer & Touch Events
  onPointerEnter(): void {
    this.isHovered = true;
  }

  onPointerLeave(): void {
    this.isHovered = false;
    this.isDragging = false;
  }

  onPointerMove(event: PointerEvent): void {
    const rect = this.containerRef.nativeElement.getBoundingClientRect();
    const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -(((event.clientY - rect.top) / rect.height) * 2 - 1);

    if (this.isDragging) {
      const deltaX = event.clientX - this.previousPointerPos.x;
      const deltaY = event.clientY - this.previousPointerPos.y;
      this.targetRotation.y += deltaX * 0.01;
      this.targetRotation.x += deltaY * 0.01;
      this.targetRotation.x = Math.max(-0.6, Math.min(0.65, this.targetRotation.x));
      this.previousPointerPos = { x: event.clientX, y: event.clientY };
    } else if (this.isHovered) {
      this.targetRotation.y = -0.35 + nx * 0.65;
      this.targetRotation.x = 0.18 - ny * 0.4;
    }
  }

  onPointerDown(event: PointerEvent): void {
    this.isDragging = true;
    this.previousPointerPos = { x: event.clientX, y: event.clientY };
    (event.target as HTMLElement)?.setPointerCapture?.(event.pointerId);
  }

  onPointerUp(): void {
    this.isDragging = false;
  }

  private onResize(): void {
    if (!this.containerRef || !this.renderer || !this.camera) return;
    const width = this.containerRef.nativeElement.clientWidth;
    const height = this.containerRef.nativeElement.clientHeight;
    if (width > 0 && height > 0) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }
}
