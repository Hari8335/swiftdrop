/**
 * SwiftDrop — 3D scooter courier (three.js)
 * -----------------------------------------
 * A soft "clay toy" 3D courier riding an amber scooter with a SwiftDrop box on the back.
 * Built entirely from three.js primitives — no model files to load.
 *
 *   const scene = createScooterCourier(containerElement);
 *   // later: scene.destroy();
 *
 * The canvas is transparent, so it sits on the rust hero background.
 */
import * as THREE from 'three';

const C = {
  amber: 0xf2a23a,
  amberDeep: 0xd9852a,
  rust: 0x8b2e1f,
  rustDeep: 0x6b2416,
  ink: 0x1c1a22,
  steel: 0xc9c4cf,
  skin: 0xa8693f,
  pants: 0x2b2d42,
  cream: 0xfff1d0,
  card: 0xd6a56b,
  cardDeep: 0xb9844c,
};

export interface ScooterCourierOptions {
  /** Tilt the scooter towards the pointer. */
  interactive?: boolean;
  /** Animated speed lines behind the scooter. */
  speedLines?: boolean;
  /** Solid scene background; transparent when omitted. */
  background?: THREE.ColorRepresentation | null;
  preserveDrawingBuffer?: boolean;
}

export interface ScooterCourierScene {
  renderer: THREE.WebGLRenderer;
  destroy(): void;
}

function mat(color: THREE.ColorRepresentation, opts: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.0, ...opts });
}

function paint(color: THREE.ColorRepresentation): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.32, metalness: 0.05, clearcoat: 0.8, clearcoatRoughness: 0.25 });
}

/** Capsule stretched between two points. */
function limb(a: THREE.Vector3, b: THREE.Vector3, r: number, material: THREE.Material): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const g = new THREE.CapsuleGeometry(r, Math.max(0.001, len), 8, 16);
  const m = new THREE.Mesh(g, material);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

/** Extrude a side profile (x/y) into a rounded solid centred on z. */
function extrudeProfile(shape: THREE.Shape, depth: number, bevel: number, material: THREE.Material): THREE.Mesh {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 6,
    curveSegments: 24,
  });
  g.translate(0, 0, -depth / 2);
  return new THREE.Mesh(g, material);
}

function roundedBox(w: number, h: number, d: number, r: number, material: THREE.Material): THREE.Mesh {
  const s = new THREE.Shape();
  const x = -w / 2 + r, y = -h / 2 + r, iw = w - 2 * r, ih = h - 2 * r;
  s.moveTo(x, y - r);
  s.lineTo(x + iw, y - r); s.quadraticCurveTo(x + iw + r, y - r, x + iw + r, y);
  s.lineTo(x + iw + r, y + ih); s.quadraticCurveTo(x + iw + r, y + ih + r, x + iw, y + ih + r);
  s.lineTo(x, y + ih + r); s.quadraticCurveTo(x - r, y + ih + r, x - r, y + ih);
  s.lineTo(x - r, y); s.quadraticCurveTo(x - r, y - r, x, y - r);
  return extrudeProfile(s, Math.max(0.001, d - 2 * r), r, material);
}

function logoTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#8B2E1F';
  g.beginPath();
  if (typeof g.roundRect === 'function') g.roundRect(0, 0, 256, 256, 48);
  else g.rect(0, 0, 256, 256);
  g.fill();
  g.strokeStyle = '#FFFFFF'; g.lineWidth = 16; g.lineJoin = 'round';
  const cx = 128, cy = 128, r = 70;
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (i * Math.PI) / 3;
    if (i) g.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    else g.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  g.closePath(); g.stroke();
  g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx, cy + r); g.stroke();
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function wheel(): THREE.Group {
  const g = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.17, 20, 48), mat(C.ink, { roughness: 0.8 }));
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 40), mat(C.steel, { roughness: 0.35, metalness: 0.4 }));
  rim.rotation.x = Math.PI / 2;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.3, 24), mat(C.ink));
  hub.rotation.x = Math.PI / 2;
  // spokes so the spin reads
  const spokeM = mat(0x8e8895, { roughness: 0.4, metalness: 0.3 });
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.06), spokeM);
    s.position.z = 0.11;
    s.rotation.z = (i * Math.PI * 2) / 5;
    const s2 = s.clone(); s2.position.z = -0.11;
    g.add(s, s2);
  }
  g.add(tyre, rim, hub);
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  return g;
}

function buildCourier() {
  const root = new THREE.Group();
  const bike = new THREE.Group();
  root.add(bike);

  const amberPaint = paint(C.amber);
  const WY = 0.59; // wheel centre height

  // wheels
  const rear = wheel(); rear.position.set(-1.15, WY, 0);
  const front = wheel(); front.position.set(1.2, WY, 0);
  bike.add(rear, front);

  // rear body (side profile, extruded)
  const body = new THREE.Shape();
  body.moveTo(-1.75, 0.95);
  body.quadraticCurveTo(-1.8, 1.32, -1.35, 1.35);
  body.lineTo(-0.25, 1.3);
  body.quadraticCurveTo(0.02, 1.28, 0.05, 0.98);
  body.lineTo(0.05, 0.78);
  body.lineTo(0.85, 0.78);
  body.lineTo(0.85, 0.55);
  body.lineTo(-0.55, 0.55);
  body.quadraticCurveTo(-1.1, 0.5, -1.4, 0.75);
  body.quadraticCurveTo(-1.62, 0.8, -1.75, 0.95);
  bike.add(extrudeProfile(body, 0.62, 0.12, amberPaint));

  // trim line
  const trim = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 0.9), mat(C.cream));
  trim.position.set(-0.85, 1.02, 0);
  bike.add(trim);

  // front leg shield
  const shield = new THREE.Shape();
  shield.moveTo(0.72, 0.55);
  shield.lineTo(0.98, 0.55);
  shield.quadraticCurveTo(1.3, 1.15, 1.2, 1.78);
  shield.lineTo(0.98, 1.78);
  shield.quadraticCurveTo(0.98, 1.1, 0.72, 0.82);
  shield.lineTo(0.72, 0.55);
  bike.add(extrudeProfile(shield, 0.5, 0.1, amberPaint));

  // front fender
  const fender = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.09, 12, 32, Math.PI * 0.75), paint(C.amberDeep));
  fender.scale.z = 2.2;
  fender.position.set(1.2, WY, 0);
  fender.rotation.z = Math.PI * 0.12;
  bike.add(fender);

  // fork + steering column
  bike.add(limb(new THREE.Vector3(1.2, WY, 0), new THREE.Vector3(1.06, 2.02, 0), 0.07, mat(C.steel, { metalness: 0.5, roughness: 0.3 })));
  bike.add(limb(new THREE.Vector3(1.1, 1.55, 0), new THREE.Vector3(1.04, 2.0, 0), 0.13, amberPaint));

  // handlebar + grips
  const bar = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 1.05, 6, 12), mat(C.ink));
  bar.rotation.x = Math.PI / 2;
  bar.position.set(1.02, 2.05, 0);
  bike.add(bar);
  for (const z of [-0.5, 0.5]) {
    const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.18, 6, 12), mat(C.ink, { roughness: 0.9 }));
    grip.rotation.x = Math.PI / 2;
    grip.position.set(1.02, 2.05, z);
    bike.add(grip);
  }
  // mirrors
  for (const z of [-0.42, 0.42]) {
    bike.add(limb(new THREE.Vector3(1.0, 2.07, z), new THREE.Vector3(0.95, 2.35, z * 1.15), 0.02, mat(C.ink)));
    const mir = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), mat(C.ink));
    mir.scale.set(0.5, 0.8, 1.2);
    mir.position.set(0.95, 2.4, z * 1.15);
    bike.add(mir);
  }

  // headlight
  const lampHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.16, 32), amberPaint);
  lampHousing.rotation.z = Math.PI / 2;
  lampHousing.position.set(1.2, 1.88, 0);
  const lamp = new THREE.Mesh(
    new THREE.CircleGeometry(0.14, 32),
    new THREE.MeshStandardMaterial({ color: C.cream, emissive: 0xfff2c8, emissiveIntensity: 1.2 })
  );
  lamp.rotation.y = Math.PI / 2;
  lamp.position.set(1.285, 1.88, 0);
  bike.add(lampHousing, lamp);

  // seat
  const seat = roundedBox(1.15, 0.2, 0.58, 0.09, mat(C.ink, { roughness: 0.7 }));
  seat.position.set(-0.75, 1.47, 0);
  bike.add(seat);

  // rear rack + delivery box
  const rack = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.05, 0.8), mat(C.ink));
  rack.position.set(-1.4, 1.42, 0);
  bike.add(rack);
  const box = roundedBox(0.95, 0.9, 0.95, 0.06, mat(C.card, { roughness: 0.85 }));
  box.position.set(-1.42, 1.9, 0);
  bike.add(box);
  const tape = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.02, 0.2), mat(C.cardDeep, { roughness: 0.6 }));
  tape.position.set(-1.42, 2.36, 0);
  bike.add(tape);
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshStandardMaterial({ map: logoTexture(), roughness: 0.6 }));
  logo.position.set(-1.42, 1.92, 0.484);
  bike.add(logo);
  const logo2 = logo.clone(); logo2.position.z = -0.484; logo2.rotation.y = Math.PI;
  bike.add(logo2);

  // tail light + exhaust
  const tail = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xc0392b, emissive: 0x9b1c10, emissiveIntensity: 0.8 })
  );
  tail.scale.set(0.6, 1, 1.6);
  tail.position.set(-1.84, 1.08, 0);
  bike.add(tail);
  bike.add(limb(new THREE.Vector3(-0.6, 0.55, -0.4), new THREE.Vector3(-1.45, 0.65, -0.42), 0.07, mat(C.steel, { metalness: 0.6, roughness: 0.25 })));

  // ---------- rider ----------
  const rider = new THREE.Group();
  root.add(rider);
  const jacket = mat(C.rust, { roughness: 0.6 });
  const pants = mat(C.pants, { roughness: 0.7 });
  const skin = mat(C.skin, { roughness: 0.6 });
  const black = mat(C.ink, { roughness: 0.6 });

  // legs
  for (const z of [-0.2, 0.2]) {
    const hip = new THREE.Vector3(-0.55, 1.68, z);
    const knee = new THREE.Vector3(0.22, 1.78, z * 1.25);
    const foot = new THREE.Vector3(0.38, 0.98, z * 1.25);
    rider.add(limb(hip, knee, 0.15, pants));
    rider.add(limb(knee, foot, 0.13, pants));
    const shoe = roundedBox(0.36, 0.14, 0.2, 0.06, black);
    shoe.position.set(0.48, 0.9, z * 1.25);
    rider.add(shoe);
  }

  // torso (leaning forward)
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.55, 10, 20), jacket);
  torso.position.set(-0.42, 2.2, 0);
  torso.rotation.z = -0.32;
  torso.scale.set(1, 1, 1.12);
  rider.add(torso);
  const stripe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.355, 0.355, 0.08, 32, 1, true),
    mat(C.cream, { side: THREE.DoubleSide })
  );
  stripe.position.set(-0.46, 2.08, 0);
  stripe.rotation.z = -0.32;
  stripe.scale.set(1, 1, 1.12);
  rider.add(stripe);
  // back badge
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.26), new THREE.MeshStandardMaterial({ map: logoTexture() }));
  badge.position.set(-0.3, 2.35, 0.385);
  rider.add(badge);

  // arms -> handlebar
  for (const z of [-0.36, 0.36]) {
    const shoulder = new THREE.Vector3(-0.22, 2.55, z);
    const elbow = new THREE.Vector3(0.38, 2.28, z * 1.25);
    const hand = new THREE.Vector3(0.98, 2.08, z * 1.38);
    rider.add(limb(shoulder, elbow, 0.11, jacket));
    rider.add(limb(elbow, hand, 0.1, jacket));
    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), black);
    glove.position.copy(hand);
    rider.add(glove);
  }

  // head
  const head = new THREE.Group();
  head.position.set(-0.08, 3.02, 0);
  rider.add(head);
  rider.add(limb(new THREE.Vector3(-0.2, 2.7, 0), new THREE.Vector3(-0.1, 2.9, 0), 0.1, skin));
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.32, 32, 24), skin));
  // helmet shell
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.37, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.55), paint(C.amber));
  helmet.position.y = 0.04;
  helmet.rotation.z = 0.25;
  head.add(helmet);
  const helmetStripe = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 10, 40, Math.PI), mat(C.rust));
  helmetStripe.rotation.y = Math.PI / 2;
  helmetStripe.rotation.x = 0.0;
  helmetStripe.position.y = 0.07;
  helmetStripe.scale.set(1.18, 1.18, 1.18);
  helmetStripe.rotation.z = 0.25;
  head.add(helmetStripe);
  // visor
  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(0.385, 32, 16, -Math.PI * 0.32, Math.PI * 0.64, Math.PI * 0.2, Math.PI * 0.13),
    new THREE.MeshPhysicalMaterial({ color: 0x2a2833, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.45, clearcoat: 1 })
  );
  visor.rotation.y = Math.PI / 2;
  visor.rotation.z = 0.25;
  head.add(visor);
  // face details (facing +x)
  const eyeM = mat(C.ink, { roughness: 0.3 });
  for (const z of [-0.11, 0.11]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), eyeM);
    eye.position.set(0.29, -0.02, z);
    head.add(eye);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.016, 8, 20, Math.PI), eyeM);
  smile.rotation.y = Math.PI / 2;
  smile.rotation.z = Math.PI;
  smile.position.set(0.3, -0.13, 0);
  head.add(smile);
  for (const z of [-0.3, 0.3]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), skin);
    ear.position.set(-0.02, -0.03, z);
    head.add(ear);
  }

  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return { root, bike, rider, head, wheels: [rear, front] };
}

export function createScooterCourier(container: HTMLElement, options: ScooterCourierOptions = {}): ScooterCourierScene {
  const o = { interactive: true, speedLines: true, background: null, ...options };
  const reduced = !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: !!o.preserveDrawingBuffer });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', 'SwiftDrop courier riding a scooter');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  if (o.background) scene.background = new THREE.Color(o.background);

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(4.2, 3.1, 7.8);
  camera.lookAt(0, 1.45, 0);

  // lights: warm key, cool-ish fill, amber rim
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x7e2a1c, 1.25));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(4, 8, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -4; key.shadow.camera.right = 4;
  key.shadow.camera.top = 4; key.shadow.camera.bottom = -4;
  key.shadow.radius = 6;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.03;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffb45a, 1.6);
  rim.position.set(-6, 4, -5);
  scene.add(rim);

  // ground: shadow catcher
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: 0.28 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const courier = buildCourier();
  const pivot = new THREE.Group();
  pivot.add(courier.root);
  scene.add(pivot);
  pivot.rotation.y = -0.18;

  // speed lines
  const lines: THREE.Mesh<THREE.CapsuleGeometry, THREE.MeshBasicMaterial>[] = [];
  if (o.speedLines) {
    const lm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    for (let i = 0; i < 6; i++) {
      const l = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.9 + Math.random() * 0.8, 4, 8), lm.clone());
      l.rotation.z = Math.PI / 2;
      l.userData = { y: 0.8 + Math.random() * 1.9, z: -0.6 + Math.random() * 1.2, speed: 4 + Math.random() * 3, phase: Math.random() };
      pivot.add(l);
      lines.push(l);
    }
    lm.dispose();
  }

  // pointer tilt
  let tx = 0, ty = 0;
  function onMove(e: PointerEvent): void {
    const r = container.getBoundingClientRect();
    tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / (r.width || 1) - 0.5) * 2));
    ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / (r.height || 1) - 0.5) * 2));
  }
  if (o.interactive) window.addEventListener('pointermove', onMove);

  function resize(): void {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  const clock = new THREE.Clock();
  let raf = 0;
  function frame(): void {
    const t = clock.getElapsedTime();
    const motion = reduced ? 0 : 1;
    courier.wheels.forEach((w) => { w.rotation.z -= 0.16 * motion; });
    courier.root.position.y = Math.sin(t * 7) * 0.018 * motion + Math.sin(t * 1.3) * 0.02 * motion;
    courier.root.rotation.z = Math.sin(t * 1.6) * 0.012 * motion;
    courier.head.rotation.z = Math.sin(t * 1.1) * 0.05 * motion;
    courier.head.rotation.y = Math.sin(t * 0.7) * 0.12 * motion;
    lines.forEach((l) => {
      const u = l.userData as { y: number; z: number; speed: number; phase: number };
      const p = (t * u.speed * 0.25 + u.phase) % 1;
      l.position.set(-1.9 - p * 3.2, u.y, u.z);
      l.material.opacity = 0.55 * Math.sin(p * Math.PI) * motion;
    });
    pivot.rotation.y += (-0.18 + tx * 0.25 - pivot.rotation.y) * 0.05;
    pivot.rotation.x += (ty * 0.06 - pivot.rotation.x) * 0.05;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  frame();

  return {
    renderer,
    destroy(): void {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          ([] as THREE.Material[]).concat(mesh.material).forEach((m) => {
            const map = (m as THREE.MeshStandardMaterial).map;
            if (map) map.dispose();
            m.dispose();
          });
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

export default createScooterCourier;
