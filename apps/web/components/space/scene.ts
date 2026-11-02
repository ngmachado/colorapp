import * as THREE from 'three';
import { gamutSegments, scenePosition, type Triple } from '@/lib/space';

/**
 * The OKLab scene shared by the colour space map and the inspector's view: renderer, camera and orbit, the
 * sRGB solid as a wireframe, the axes with their labels, pointer orbit and zoom, and projection of OKLab
 * positions onto the canvas for HTML labels. What is drawn inside it is the caller's.
 */

export const AXIS_LABELS: { text: string; lab: Triple }[] = [
  { text: 'L 1 · light', lab: [1.04, 0, 0] },
  { text: 'L 0 · dark', lab: [-0.04, 0, 0] },
  { text: '+a · towards red', lab: [0.5, 0.44, 0] },
  { text: '−a · towards green', lab: [0.5, -0.44, 0] },
  { text: '+b · towards yellow', lab: [0.5, 0, 0.44] },
  { text: '−b · towards blue', lab: [0.5, 0, -0.44] },
];

export const v3 = (t: Triple) => new THREE.Vector3(t[0], t[1], t[2]);
export const at = (lab: Triple) => v3(scenePosition(lab));

/** A theme token as a Three colour, read when called so it follows the theme. */
export function tokenColour(name: string, fallback: string): THREE.Color {
  return new THREE.Color(
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback,
  );
}
export const inkColour = () => tokenColour('--fg', '#1a1a1a');
export const greyColour = () => tokenColour('--muted', '#6b6f76');

export interface Orbit {
  theta: number;
  phi: number;
  radius: number;
  auto: boolean;
}

export interface SceneHandle {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  target: THREE.Vector3;
  orbit: Orbit;
  /** The wireframe and axes, in the theme's grey; `retheme` recolours them. */
  lineMaterials: THREE.LineBasicMaterial[];
  project(lab: Triple): { x: number; y: number; behind: boolean };
  /** Moves an absolutely positioned label to a position's place on the canvas, hidden when behind the camera. */
  place(el: HTMLElement, lab: Triple): void;
  /** A pointer event as normalised device coordinates, for raycasting. */
  ndc(e: PointerEvent): THREE.Vector2;
  /** Turns the camera towards a position and stops the slow turn. */
  lookAt(lab: Triple): void;
  retheme(): void;
  dispose(): void;
}

export interface SceneOptions {
  canvas: HTMLCanvasElement;
  host: HTMLElement;
  labelsEl: HTMLElement;
  /** Called after each render, for the caller's own labels. */
  onFrame?: () => void;
  /** Pointer moved without dragging, or left the canvas (null). */
  onHover?: (e: PointerEvent | null) => void;
  /** A press and release without a drag. */
  onClick?: (e: PointerEvent) => void;
  /** Starting camera distance. */
  radius?: number;
}

/** Builds the scene, or returns null where WebGL is unavailable. */
export function createScene(opts: SceneOptions): SceneHandle | null {
  const { canvas, host, labelsEl } = opts;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 1, 2000);
  const target = new THREE.Vector3(0, 0, 0);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const orbit: Orbit = { theta: 0.6, phi: 1.15, radius: opts.radius ?? 215, auto: !reduced };
  scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 1.05));
  const key = new THREE.DirectionalLight(0xffffff, 0.35);
  key.position.set(80, 140, 120);
  scene.add(key);
  const grey = greyColour();
  const wireMat = new THREE.LineBasicMaterial({ color: grey, transparent: true, opacity: 0.35 });
  const axesMat = new THREE.LineBasicMaterial({ color: grey, transparent: true, opacity: 0.5 });
  scene.add(
    new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(gamutSegments().map(v3)), wireMat),
  );
  scene.add(
    new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(
        (
          [
            [0, 0, 0],
            [1, 0, 0],
            [0.5, -0.4, 0],
            [0.5, 0.4, 0],
            [0.5, 0, -0.4],
            [0.5, 0, 0.4],
          ] as Triple[]
        ).map(at),
      ),
      axesMat,
    ),
  );
  const labels = AXIS_LABELS.map((a) => {
    const d = document.createElement('div');
    d.className = 'space-axis';
    d.textContent = a.text;
    labelsEl.appendChild(d);
    return d;
  });

  const project = (lab: Triple) => {
    const v = at(lab).project(camera);
    return {
      x: ((v.x + 1) / 2) * canvas.clientWidth,
      y: ((1 - v.y) / 2) * canvas.clientHeight,
      behind: v.z > 1,
    };
  };
  const place = (el: HTMLElement, lab: Triple) => {
    const q = project(lab);
    el.style.left = `${q.x}px`;
    el.style.top = `${q.y}px`;
    el.style.opacity = q.behind ? '0' : '1';
  };
  let frame = 0;
  let failed = false;
  const loop = () => {
    frame = requestAnimationFrame(loop);
    try {
      draw();
    } catch (e) {
      // One bad frame must not stop the view; the first failure is reported.
      if (!failed) console.error('Colour space view: a frame failed to draw', e);
      failed = true;
    }
  };
  const draw = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    const pr = renderer.getPixelRatio();
    if (canvas.width !== Math.floor(w * pr) || canvas.height !== Math.floor(h * pr)) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    if (orbit.auto) orbit.theta += 0.0025;
    camera.position.set(
      target.x + orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta),
      target.y + orbit.radius * Math.cos(orbit.phi),
      target.z + orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta),
    );
    camera.lookAt(target);
    renderer.render(scene, camera);
    AXIS_LABELS.forEach((a, i) => place(labels[i]!, a.lab));
    opts.onFrame?.();
  };
  frame = requestAnimationFrame(loop);

  // Orbit by drag, zoom by wheel; a press without a drag is a click.
  const ndcVec = new THREE.Vector2();
  const ndc = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    return ndcVec.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1,
    );
  };
  let dragging = false;
  let last: [number, number] | null = null;
  let moved = 0;
  const onDown = (e: PointerEvent) => {
    dragging = true;
    moved = 0;
    last = [e.clientX, e.clientY];
    orbit.auto = false;
    canvas.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (dragging && last) {
      const dx = e.clientX - last[0];
      const dy = e.clientY - last[1];
      moved += Math.abs(dx) + Math.abs(dy);
      orbit.theta -= dx * 0.008;
      orbit.phi = Math.min(2.9, Math.max(0.25, orbit.phi - dy * 0.008));
      last = [e.clientX, e.clientY];
      return;
    }
    opts.onHover?.(e);
  };
  const onUp = (e: PointerEvent) => {
    dragging = false;
    if (moved < 4) opts.onClick?.(e);
  };
  const onLeave = () => opts.onHover?.(null);
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    orbit.radius = Math.min(700, Math.max(90, orbit.radius * (1 + Math.sign(e.deltaY) * 0.08)));
    orbit.auto = false;
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  const lineMaterials = [wireMat, axesMat];
  return {
    renderer,
    scene,
    camera,
    target,
    orbit,
    lineMaterials,
    project,
    place,
    ndc,
    lookAt(lab) {
      target.copy(at(lab));
      orbit.radius = Math.max(90, Math.min(orbit.radius, 160));
      orbit.auto = false;
    },
    retheme() {
      const g = greyColour();
      for (const m of lineMaterials) m.color.copy(g);
    },
    dispose() {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('wheel', onWheel);
      labels.forEach((d) => d.remove());
      renderer.dispose();
    },
  };
}
