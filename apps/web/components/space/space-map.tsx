'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { NamePoint } from '@/lib/nearest';
import { groupLabel } from '@/lib/records';
import {
  BAND,
  distance,
  gamutSegments,
  nearestPoints,
  parseHexList,
  scenePosition,
  writeState,
  type PaletteColour,
  type SpaceState,
  type Triple,
} from '@/lib/space';

export interface SpaceEdge {
  from: string;
  to: string;
  label: string;
}

const BASE_RADIUS = 1.35;
const AXIS_LABELS: { text: string; lab: Triple }[] = [
  { text: 'L 1 · light', lab: [1.04, 0, 0] },
  { text: 'L 0 · dark', lab: [-0.04, 0, 0] },
  { text: '+a · towards red', lab: [0.5, 0.44, 0] },
  { text: '−a · towards green', lab: [0.5, -0.44, 0] },
  { text: '+b · towards yellow', lab: [0.5, 0, 0.44] },
  { text: '−b · towards blue', lab: [0.5, 0, -0.44] },
];
const v3 = (t: Triple) => new THREE.Vector3(t[0], t[1], t[2]);

/**
 * The colour space map: every documented colour as a sphere at its OKLab position, the sRGB solid as a
 * wireframe, the palette as larger ringed spheres, and documented relations as dashed lines. The scene is
 * built once; state changes update instance matrices and colours in place. Everything measured is also in the
 * panel as text, which is what a reader without WebGL gets.
 */
export function SpaceMap({
  points,
  edges,
  initial,
}: {
  points: NamePoint[];
  edges: SpaceEdge[];
  initial: SpaceState;
}) {
  const [set, setSet] = useState(initial.set);
  const [band, setBand] = useState(initial.band);
  const [l, setL] = useState(initial.l);
  const [paletteText, setPaletteText] = useState(initial.hexes.join(' '));
  const [showEdges, setShowEdges] = useState(true);
  const [selected, setSelected] = useState<NamePoint | null>(
    () => points.find((p) => p.conceptId === initial.focus) ?? null,
  );
  const [hover, setHover] = useState<{ p: NamePoint; x: number; y: number } | null>(null);
  const [webgl, setWebgl] = useState<'unknown' | 'yes' | 'no'>('unknown');
  const palette = useMemo(() => parseHexList(paletteText), [paletteText]);
  const groups = useMemo(() => [...new Set(points.map((p) => p.group))].sort(), [points]);
  const visible = useCallback(
    (p: NamePoint) =>
      set === 'all' || p.group === set ? (band && Math.abs(p.oklab[0] - l) > BAND ? 0.45 : 1) : 0,
    [set, band, l],
  );

  // URL mirrors the state so a view can be shared; written a beat after the last change.
  useEffect(() => {
    const t = setTimeout(() => {
      const url = writeState({
        hexes: palette.map((c) => c.hex),
        set,
        band,
        l,
        focus: selected?.conceptId ?? null,
      });
      if (window.location.pathname + window.location.search !== url)
        window.history.replaceState(null, '', url);
    }, 150);
    return () => clearTimeout(t);
  }, [palette, set, band, l, selected]);

  const host = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const scene = useRef<{
    renderer: THREE.WebGLRenderer;
    camera: THREE.PerspectiveCamera;
    mesh: THREE.InstancedMesh;
    paletteGroup: THREE.Group;
    edgeGroup: THREE.Group;
    target: THREE.Vector3;
    orbit: { theta: number; phi: number; radius: number; auto: boolean };
    labels: HTMLDivElement[];
    pins: HTMLDivElement[];
  } | null>(null);
  const stateRef = useRef({ visible, hover: -1, palette, points });
  stateRef.current = { visible, hover: hover ? points.indexOf(hover.p) : -1, palette, points };

  // Build the scene once.
  useEffect(() => {
    const canvas = canvasRef.current;
    const el = host.current;
    if (!canvas || !el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      setWebgl('no');
      return;
    }
    setWebgl('yes');
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    const sc = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 1, 2000);
    const target = new THREE.Vector3(0, 0, 0);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const orbit = { theta: 0.6, phi: 1.15, radius: 215, auto: !reduced };
    sc.add(new THREE.HemisphereLight(0xffffff, 0x888888, 1.05));
    const key = new THREE.DirectionalLight(0xffffff, 0.35);
    key.position.set(80, 140, 120);
    sc.add(key);
    const grey = new THREE.Color('#6b6f76');
    const wire = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(gamutSegments().map(v3)),
      new THREE.LineBasicMaterial({ color: grey, transparent: true, opacity: 0.35 }),
    );
    sc.add(wire);
    sc.add(
      new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(
          [
            [0, 0, 0],
            [1, 0, 0],
            [0.5, -0.4, 0],
            [0.5, 0.4, 0],
            [0.5, 0, -0.4],
            [0.5, 0, 0.4],
          ].map((t) => v3(scenePosition(t as Triple))),
        ),
        new THREE.LineBasicMaterial({ color: grey, transparent: true, opacity: 0.5 }),
      ),
    );
    const mesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 14, 10),
      new THREE.MeshLambertMaterial(),
      points.length,
    );
    const dummy = new THREE.Object3D();
    points.forEach((p, i) => {
      dummy.position.copy(v3(scenePosition(p.oklab)));
      dummy.scale.setScalar(BASE_RADIUS);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, new THREE.Color(p.hex));
    });
    sc.add(mesh);
    const edgeGroup = new THREE.Group();
    const byConcept = new Map(points.map((p) => [p.conceptId, p]));
    for (const e of edges) {
      const a = byConcept.get(e.from);
      const b = byConcept.get(e.to);
      if (!a || !b) continue;
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          v3(scenePosition(a.oklab)),
          v3(scenePosition(b.oklab)),
        ]),
        new THREE.LineDashedMaterial({
          color: 0x1a1a1a,
          dashSize: 2,
          gapSize: 1.5,
          transparent: true,
          opacity: 0.8,
        }),
      );
      line.computeLineDistances();
      edgeGroup.add(line);
    }
    sc.add(edgeGroup);
    const paletteGroup = new THREE.Group();
    sc.add(paletteGroup);
    const labelsEl = labelsRef.current!;
    const labels = AXIS_LABELS.map((a) => {
      const d = document.createElement('div');
      d.className = 'space-axis';
      d.textContent = a.text;
      labelsEl.appendChild(d);
      return d;
    });
    scene.current = {
      renderer,
      camera,
      mesh,
      paletteGroup,
      edgeGroup,
      target,
      orbit,
      labels,
      pins: [],
    };

    const project = (lab: Triple) => {
      const v = v3(scenePosition(lab)).project(camera);
      return {
        x: ((v.x + 1) / 2) * canvas.clientWidth,
        y: ((1 - v.y) / 2) * canvas.clientHeight,
        behind: v.z > 1,
      };
    };
    let frame = 0;
    const loop = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
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
      renderer.render(sc, camera);
      const s = scene.current!;
      AXIS_LABELS.forEach((a, i) => {
        const q = project(a.lab);
        const d = s.labels[i]!;
        d.style.left = `${q.x}px`;
        d.style.top = `${q.y}px`;
        d.style.opacity = q.behind ? '0' : '1';
      });
      stateRef.current.palette.forEach((c, i) => {
        const d = s.pins[i];
        if (!d) return;
        const q = project(c.lab);
        d.style.left = `${q.x}px`;
        d.style.top = `${q.y}px`;
        d.style.opacity = q.behind ? '0' : '1';
      });
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    // Orbit, zoom, hover and pick.
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let dragging = false;
    let last: [number, number] | null = null;
    let moved = 0;
    const hitAt = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      for (const h of ray.intersectObject(mesh)) {
        const i = h.instanceId ?? -1;
        if (i >= 0 && stateRef.current.visible(stateRef.current.points[i]!) > 0) return i;
      }
      return -1;
    };
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
      const i = hitAt(e);
      const r = canvas.getBoundingClientRect();
      setHover(
        i < 0
          ? null
          : { p: stateRef.current.points[i]!, x: e.clientX - r.left, y: e.clientY - r.top },
      );
      canvas.style.cursor = i < 0 ? 'grab' : 'pointer';
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      if (moved < 4) {
        const i = hitAt(e);
        if (i >= 0) setSelected(stateRef.current.points[i]!);
      }
    };
    const onLeave = () => setHover(null);
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
    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('wheel', onWheel);
      labels.forEach((d) => d.remove());
      scene.current?.pins.forEach((d) => d.remove());
      renderer.dispose();
      scene.current = null;
    };
    // The scene is built once from the initial points and edges; later changes update it in place below.
  }, []);

  // Visibility and hover: scale and tint every instance.
  useEffect(() => {
    const s = scene.current;
    if (!s) return;
    const dummy = new THREE.Object3D();
    const bg = new THREE.Color('#ffffff');
    const hoverIndex = hover ? points.indexOf(hover.p) : -1;
    points.forEach((p, i) => {
      const vis = visible(p);
      dummy.position.copy(v3(scenePosition(p.oklab)));
      dummy.scale.setScalar(BASE_RADIUS * (vis || 0.0001) * (i === hoverIndex ? 1.6 : 1));
      dummy.updateMatrix();
      s.mesh.setMatrixAt(i, dummy.matrix);
      s.mesh.setColorAt(
        i,
        vis > 0 && vis < 1 ? new THREE.Color(p.hex).lerp(bg, 0.75) : new THREE.Color(p.hex),
      );
    });
    s.mesh.instanceMatrix.needsUpdate = true;
    if (s.mesh.instanceColor) s.mesh.instanceColor.needsUpdate = true;
  }, [points, visible, hover, webgl]);

  // Palette spheres and their pins.
  useEffect(() => {
    const s = scene.current;
    const labelsEl = labelsRef.current;
    if (!s || !labelsEl) return;
    s.paletteGroup.clear();
    s.pins.forEach((d) => d.remove());
    s.pins = palette.map((c, i) => {
      const at = v3(scenePosition(c.lab));
      const ring = new THREE.Mesh(
        new THREE.SphereGeometry(3.4, 20, 14),
        new THREE.MeshBasicMaterial({ color: 0x1a1a1a, side: THREE.BackSide }),
      );
      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(2.8, 20, 14),
        new THREE.MeshLambertMaterial({ color: c.hex }),
      );
      ring.position.copy(at);
      ball.position.copy(at);
      s.paletteGroup.add(ring, ball);
      const d = document.createElement('div');
      d.className = 'space-pin';
      d.textContent = `${i + 1} · ${c.hex.toUpperCase()}`;
      labelsEl.appendChild(d);
      return d;
    });
  }, [palette, webgl]);

  useEffect(() => {
    if (scene.current) scene.current.edgeGroup.visible = showEdges;
  }, [showEdges, webgl]);

  const lookAt = (p: NamePoint) => {
    const s = scene.current;
    if (!s) return;
    s.target.copy(v3(scenePosition(p.oklab)));
    s.orbit.radius = Math.max(90, Math.min(s.orbit.radius, 160));
    s.orbit.auto = false;
  };
  const addToPalette = (hex: string) => setPaletteText((t) => `${t} ${hex}`.trim());
  const near = selected ? nearestPoints(points, selected.oklab, 5, set, selected.conceptId) : [];
  const count = (g: string) => points.filter((p) => p.group === g).length;
  const inBand = points.filter((p) => visible(p) === 1).length;
  const shown = points.filter((p) => visible(p) > 0).length;

  return (
    <div
      className="grid min-h-[560px] flex-1 grid-cols-1 md:grid-cols-[1fr_320px]"
      data-testid="space"
    >
      <div ref={host} className="relative min-h-[420px] overflow-hidden md:min-h-0">
        {webgl === 'no' ? (
          <div
            className="flex h-full items-center justify-center p-8 text-center text-sm text-[var(--muted)]"
            data-testid="space-fallback"
          >
            This browser cannot draw the map (no WebGL). The panel still lists every measured value.
          </div>
        ) : null}
        <canvas
          ref={canvasRef}
          className="block h-full w-full touch-none"
          aria-label="Three-dimensional map of documented colours in OKLab"
          hidden={webgl === 'no'}
        />
        <div ref={labelsRef} />
        {hover ? (
          <div
            className="pointer-events-none absolute min-w-[180px] rounded-md border border-[var(--line)] bg-[var(--surface)] px-2.5 py-2 text-[13px] shadow-sm"
            style={{ left: hover.x + 12, top: hover.y + 12 }}
            data-testid="space-tip"
          >
            <span className="flex items-center gap-1.5 font-semibold">
              <span
                className="inline-block h-3 w-3 rounded-sm border border-black/15"
                style={{ background: hover.p.hex }}
              />
              {hover.p.label}
            </span>
            <span className="block font-mono text-[11px] leading-relaxed text-[var(--muted)]">
              {groupLabel(hover.p.group)} · {hover.p.hex.toUpperCase()}
              <br />L {hover.p.oklab[0].toFixed(3)} · a {hover.p.oklab[1].toFixed(3)} · b{' '}
              {hover.p.oklab[2].toFixed(3)}
              {palette.length ? (
                <>
                  <br />
                  nearest palette colour · distance{' '}
                  {Math.min(...palette.map((c) => distance(c.lab, hover.p.oklab))).toFixed(3)}
                </>
              ) : null}
            </span>
          </div>
        ) : null}
        {webgl !== 'no' ? (
          <p className="pointer-events-none absolute bottom-2.5 left-3 m-0 rounded bg-white/80 px-2 py-1 text-xs text-[var(--muted)]">
            Drag to turn · scroll to zoom · hover a point · click to select
          </p>
        ) : null}
      </div>
      <aside className="flex min-w-0 flex-col gap-5 overflow-y-auto border-t border-[var(--line)] bg-[var(--panel,#fafafa)] px-5 py-4 md:border-t-0 md:border-l">
        <section>
          <h2 className="mb-2 font-mono text-[11px] tracking-[1px] text-[var(--muted)] uppercase">
            Collections
          </h2>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Collection">
            {['all', ...groups].map((g) => (
              <button
                key={g}
                type="button"
                role="radio"
                aria-checked={set === g}
                onClick={() => setSet(g)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium ${set === g ? 'border-[var(--fg)] bg-[var(--fg)] text-white' : 'border-[var(--line)] bg-[var(--surface)]'}`}
                data-testid="space-set"
              >
                {g === 'all' ? `all ${points.length}` : `${groupLabel(g)} ${count(g)}`}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]" data-testid="space-shown">
            {shown} shown{band ? `, ${inBand} within L ±${BAND} of ${l.toFixed(2)}` : ''}.
          </p>
        </section>
        <section>
          <h2 className="mb-2 font-mono text-[11px] tracking-[1px] text-[var(--muted)] uppercase">
            Lightness band
          </h2>
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={band}
              onChange={(e) => setBand(e.target.checked)}
              data-testid="space-band"
            />{' '}
            Only points near one lightness
          </label>
          <label className="mt-2 flex items-center justify-between text-[13px]" htmlFor="space-l">
            <span>L centre</span>
            <span className="font-mono text-xs">{l.toFixed(2)}</span>
          </label>
          <input
            id="space-l"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={l}
            onChange={(e) => {
              setL(Number(e.target.value));
              setBand(true);
            }}
            className="w-full"
          />
          <p className="m-0 mt-1 text-xs text-[var(--muted)]">
            Points further than ±{BAND} L fade back, the same band the wheels use.
          </p>
        </section>
        <section>
          <h2 className="mb-2 font-mono text-[11px] tracking-[1px] text-[var(--muted)] uppercase">
            Your palette
          </h2>
          <input
            id="space-palette"
            value={paletteText}
            onChange={(e) => setPaletteText(e.target.value)}
            className="field w-full font-mono text-[13px]"
            aria-label="Palette as hex codes"
            placeholder="#663399 #ffffff"
            data-testid="space-palette"
          />
          <div className="mt-2.5 flex flex-col gap-2" data-testid="space-palette-list">
            {palette.map((c) => {
              const [n] = nearestPoints(points, c.lab, 1, set);
              return <PaletteRow key={c.hex} c={c} near={n} />;
            })}
          </div>
          <p className="m-0 mt-2 text-xs text-[var(--muted)]">
            Each colour is plotted large; its nearest documented record is named with the OKLab
            distance.
          </p>
        </section>
        <section>
          <h2 className="mb-2 font-mono text-[11px] tracking-[1px] text-[var(--muted)] uppercase">
            Documented relations
          </h2>
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={showEdges}
              onChange={(e) => setShowEdges(e.target.checked)}
            />{' '}
            {edges[0]?.label ?? 'Documented pairs'} ({edges.length})
          </label>
          <p className="m-0 mt-1 text-xs text-[var(--muted)]">
            Lines are drawn only where a record documents the relation. Nothing is linked by
            distance alone.
          </p>
        </section>
        {selected ? (
          <section className="border-t border-[var(--line)] pt-4" data-testid="space-selected">
            <h2 className="mb-2 font-mono text-[11px] tracking-[1px] text-[var(--muted)] uppercase">
              Selected
            </h2>
            <div className="flex items-center gap-2.5">
              <span
                className="h-10 w-10 rounded-lg border border-black/10"
                style={{ background: selected.hex }}
              />
              <div>
                <Link href={`/dictionary/${selected.conceptId}`} className="font-semibold">
                  {selected.label}
                </Link>
                <div className="font-mono text-[11px] leading-relaxed text-[var(--muted)]">
                  {groupLabel(selected.group)} · {selected.hex.toUpperCase()}
                  <br />L {selected.oklab[0].toFixed(3)} · a {selected.oklab[1].toFixed(3)} · b{' '}
                  {selected.oklab[2].toFixed(3)}
                </div>
              </div>
            </div>
            <p className="m-0 mt-2.5 text-xs text-[var(--muted)]">
              Closest documented colours, by OKLab distance.
            </p>
            <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0">
              {near.map((n) => (
                <li key={n.id} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-3.5 w-3.5 flex-none rounded-sm border border-black/10"
                    style={{ background: n.hex }}
                  />
                  <Link href={`/dictionary/${n.conceptId}`}>{n.label}</Link>
                  <span className="text-[var(--muted)]">{groupLabel(n.group)}</span>
                  <span className="ml-auto font-mono text-[11px] text-[var(--muted)]">
                    {n.distance.toFixed(3)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn h-8 text-xs"
                onClick={() => addToPalette(selected.hex)}
                data-testid="space-add"
              >
                Add to palette
              </button>
              <button
                type="button"
                className="btn h-8 text-xs"
                onClick={() => lookAt(selected)}
                disabled={webgl !== 'yes'}
              >
                Look at it
              </button>
              <Link href={`/dictionary/${selected.conceptId}`} className="btn h-8 text-xs">
                Open entry
              </Link>
            </div>
          </section>
        ) : null}
      </aside>
    </div>
  );
}

function PaletteRow({ c, near }: { c: PaletteColour; near?: NamePoint & { distance: number } }) {
  return (
    <div className="grid grid-cols-[28px_1fr] items-start gap-2.5" data-testid="space-palette-row">
      <span className="h-7 w-7 rounded-md border border-black/10" style={{ background: c.hex }} />
      <div className="min-w-0">
        <div className="font-mono text-xs font-medium">
          {c.hex.toUpperCase()} <span className="text-[var(--muted)]">L {c.lab[0].toFixed(2)}</span>
        </div>
        <div className="text-xs text-[var(--muted)]">
          {near ? (
            <>
              near{' '}
              <Link href={`/dictionary/${near.conceptId}`} className="font-medium text-[var(--fg)]">
                {near.label}
              </Link>{' '}
              · {groupLabel(near.group)} · distance {near.distance.toFixed(3)}
            </>
          ) : (
            'no documented colour in this collection'
          )}
        </div>
      </div>
    </div>
  );
}
