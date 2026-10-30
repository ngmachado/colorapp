'use client';

import Link from 'next/link';
import { useThemeVersion } from '@/lib/theme';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { nearestPoint, type NamePoint } from '@/lib/nearest';
import type { Oklch } from '@/lib/palette-param';
import {
  fromXY,
  gamutOutline,
  hslOf,
  hslToRgb8,
  inSrgb,
  oklchOfRgb8,
  ruleOffsets,
  srgb8,
  toXY,
} from '@/lib/wheel-math';

export interface WheelDot {
  oklch: Oklch;
  /** Display hex, from the colour engine; the wheel paints the dot with it. */
  hex: string;
  label: string;
  locked?: boolean;
}
export interface OverlayPoint {
  id: string;
  oklch: Oklch;
  hex: string;
  label: string;
  href: string;
}
export interface WheelAngles {
  span_deg: number;
  split_deg: number;
  angle_deg: number;
}

interface Props {
  size: number;
  dots: WheelDot[];
  /** Lightness of the slice painted on the disc. */
  slice: number;
  onSlice?: (L: number) => void;
  /** The rule whose spokes are drawn and whose constellation turns together. */
  structure?: string;
  angles?: WheelAngles;
  /** Moves one dot; the wheel sends the gesture key so the caller can collapse undo steps. */
  onMove?: (i: number, oklch: Oklch, key: string) => void;
  /** Turns every unlocked dot by delta degrees. */
  onRotate?: (deltaDeg: number, key: string) => void;
  /** Alt-drag freed one dot from the rule. */
  onFree?: () => void;
  onLock?: (i: number) => void;
  /** A click on empty disc; the caller decides whether to add a colour there. */
  onAdd?: (oklch: Oklch) => void;
  /** Documented colours drawn as small points; clicking one calls onPick, else follows its link. */
  overlay?: OverlayPoint[];
  onPick?: (p: OverlayPoint) => void;
  /** Draw the same rule at equal HSL angles as dashed rings. */
  ghost?: boolean;
  /** Documented colours for the readout. */
  points?: NamePoint[];
  readOnly?: boolean;
  /** Chroma at the rim. */
  maxChroma?: number;
  className?: string;
}

/** The grey painted where sRGB cannot show a colour; read from the theme so it sits right on either background. */
function beyondGrey(el: Element): [number, number, number] {
  const v = getComputedStyle(el)
    .getPropertyValue('--wheel-beyond')
    .split(',')
    .map((n) => Number(n.trim()));
  return v.length === 3 && v.every((n) => Number.isFinite(n))
    ? (v as [number, number, number])
    : [236, 236, 236];
}

/** Documented points further than this from the slice's lightness are not drawn: a dot on a slice means "at this lightness". */
export const OVERLAY_BAND = 0.15;
export const inBand = (p: OverlayPoint, slice: number) =>
  Math.abs(p.oklch[0] - slice) <= OVERLAY_BAND;
const DRAG_PX = 3;

/** Wheel coordinates rounded to 1/100 px, so server and browser trig agree and hydration stays clean. */
const xy = (c: number, h: number, scale: number, centre: number): [number, number] => {
  const [x, y] = toXY(c, h, scale, centre);
  return [Math.round(x * 100) / 100, Math.round(y * 100) / 100];
};
const fmt = (c: Oklch) => `L ${c[0].toFixed(3)} · C ${c[1].toFixed(3)} · h ${c[2].toFixed(0)}°`;

/**
 * An OKLCh wheel: hue by angle, chroma by radius, one lightness per slice. The disc is painted pixel by pixel
 * and the sRGB gamut edge at that lightness is drawn as it is, with grey beyond it. Dots render in their own
 * colour at their own lightness. Rule spokes, a documented-colour overlay and an HSL ghost are optional.
 */
export function Wheel({
  size,
  dots,
  slice,
  onSlice,
  structure,
  angles = { span_deg: 30, split_deg: 30, angle_deg: 60 },
  onMove,
  onRotate,
  onFree,
  onLock,
  onAdd,
  overlay,
  onPick,
  ghost,
  points,
  readOnly,
  maxChroma = 0.3,
  className,
}: Props) {
  const centre = size / 2;
  const radius = size / 2 - 4;
  const scale = radius / maxChroma;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(dots.length ? 0 : null);
  const drag = useRef<{
    i: number;
    startX: number;
    startY: number;
    lastH: number;
    moved: boolean;
    shift: boolean;
    free: boolean;
    key: string;
  } | null>(null);
  const themeVersion = useThemeVersion();
  const [pressOnDisc, setPressOnDisc] = useState<{ x: number; y: number } | null>(null);

  const offsets = structure ? ruleOffsets(structure, angles) : null;
  const turnsTogether = !!offsets && !!onRotate;

  // Paint the slice: every pixel inside the rim is its OKLCh colour, or grey when sRGB cannot show it.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(size, size);
    const d = img.data;
    const BEYOND = beyondGrey(canvas);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const { c, h } = fromXY(x + 0.5, y + 0.5, scale, centre);
        const o = (y * size + x) * 4;
        if (c > maxChroma) {
          d[o + 3] = 0;
          continue;
        }
        const rgb = inSrgb(slice, c, h) ? srgb8(slice, c, h) : BEYOND;
        d[o] = rgb[0];
        d[o + 1] = rgb[1];
        d[o + 2] = rgb[2];
        d[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [size, slice, scale, centre, maxChroma, themeVersion]);

  const outline = useMemo(() => {
    const pts = gamutOutline(slice, 3).map(({ c, h }) =>
      xy(Math.min(c, maxChroma), h, scale, centre),
    );
    return pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  }, [slice, scale, centre, maxChroma]);

  // The same rule on the HSL wheel: the dominant's HSL hue plus the rule's offsets, shown where OKLCh puts them.
  const ghosts = useMemo(() => {
    if (!ghost || !offsets || !dots[0]) return [];
    const dom = dots[0].hex;
    const [h0, s, l] = hslOf(
      parseInt(dom.slice(1, 3), 16),
      parseInt(dom.slice(3, 5), 16),
      parseInt(dom.slice(5, 7), 16),
    );
    return offsets.slice(1).map((off) => {
      const [r, g, b] = hslToRgb8((h0 + off + 360) % 360, s, l);
      const o = oklchOfRgb8(r, g, b);
      return {
        oklch: o,
        hex: `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`,
      };
    });
  }, [ghost, offsets, dots]);

  const local = (e: { clientX: number; clientY: number }) => {
    const r = svgRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * size,
      y: ((e.clientY - r.top) / r.height) * size,
    };
  };

  const onDotDown = (i: number) => (e: React.PointerEvent<SVGGElement>) => {
    if (readOnly || (!onMove && !onRotate)) return;
    e.preventDefault();
    e.stopPropagation();
    setActive(i);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const { x, y } = local(e);
    drag.current = {
      i,
      startX: x,
      startY: y,
      lastH: fromXY(x, y, scale, centre).h,
      moved: false,
      shift: e.shiftKey,
      free: e.altKey,
      key: `wheel-${i}-${Date.now()}`,
    };
  };

  const onDotMove = (e: React.PointerEvent<SVGGElement>) => {
    const g = drag.current;
    if (!g) return;
    const { x, y } = local(e);
    if (!g.moved && Math.hypot(x - g.startX, y - g.startY) < DRAG_PX) return;
    if (!g.moved && g.free && turnsTogether) onFree?.();
    g.moved = true;
    const { c, h } = fromXY(x, y, scale, centre);
    const dot = dots[g.i]!;
    if (turnsTogether && !g.free && !dot.locked) {
      let delta = h - g.lastH;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      g.lastH = h;
      onRotate!(delta, g.key);
    } else if (onMove && !dot.locked) {
      onMove(g.i, [dot.oklch[0], g.shift ? dot.oklch[1] : Math.min(maxChroma, c), h], g.key);
    }
  };

  const onDotUp = (e: React.PointerEvent<SVGGElement>) => {
    const g = drag.current;
    drag.current = null;
    if (g) (e.currentTarget as Element).releasePointerCapture(e.pointerId);
  };

  const onDotKey = (i: number) => (e: React.KeyboardEvent<SVGGElement>) => {
    if (readOnly) return;
    const dot = dots[i]!;
    const big = e.shiftKey ? 10 : 1;
    const key = `wheel-key-${i}`;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const d = (e.key === 'ArrowLeft' ? 1 : -1) * big;
      if (turnsTogether) onRotate!(d, key);
      else if (onMove && !dot.locked)
        onMove(i, [dot.oklch[0], dot.oklch[1], (dot.oklch[2] + d + 360) % 360], key);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (!onMove || dot.locked) return;
      const d = (e.key === 'ArrowUp' ? 0.005 : -0.005) * big;
      onMove(
        i,
        [dot.oklch[0], Math.min(maxChroma, Math.max(0, dot.oklch[1] + d)), dot.oklch[2]],
        key,
      );
    } else if (e.key === 'Enter' && onLock) {
      e.preventDefault();
      onLock(i);
    }
  };

  const onDiscDown = (e: React.PointerEvent<SVGCircleElement>) => {
    if (readOnly || !onAdd) return;
    setPressOnDisc(local(e));
  };
  const onDiscUp = (e: React.PointerEvent<SVGCircleElement>) => {
    const p = pressOnDisc;
    setPressOnDisc(null);
    if (!p || readOnly || !onAdd) return;
    const { x, y } = local(e);
    if (Math.hypot(x - p.x, y - p.y) > DRAG_PX) return;
    const { c, h } = fromXY(x, y, scale, centre);
    if (c <= maxChroma) onAdd([slice, c, h]);
  };

  const activeDot = active !== null ? dots[active] : undefined;
  const near = activeDot && points ? nearestPoint(points, oklabOf(activeDot.oklch)) : null;

  const spoke = useCallback(
    (c: Oklch) => {
      const [x1, y1] = xy(Math.min(c[1], maxChroma), c[2], scale, centre);
      return { x1: centre, y1: centre, x2: x1, y2: y1 };
    },
    [scale, centre, maxChroma],
  );

  const hint =
    readOnly || (!onMove && !onRotate)
      ? null
      : turnsTogether
        ? 'Drag turns the set; ⇧ keeps chroma; ⌥ frees one dot.'
        : 'Drag moves a dot; ⇧ keeps chroma.';

  return (
    <div className={`flex flex-col gap-2.5 ${className ?? ''}`} data-testid="wheel">
      {/* Drawn at `size`, shown no wider than its container: pointer maths scale by the rendered width. */}
      <div className="relative w-full self-center" style={{ maxWidth: size, aspectRatio: '1 / 1' }}>
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="absolute inset-0 h-full w-full rounded-full"
          aria-hidden="true"
        />
        <svg
          ref={svgRef}
          viewBox={`0 0 ${size} ${size}`}
          className="absolute inset-0 h-full w-full touch-none select-none"
          role="group"
          aria-label={`OKLCh wheel at lightness ${slice.toFixed(2)}`}
        >
          <circle
            cx={centre}
            cy={centre}
            r={radius}
            fill="transparent"
            onPointerDown={onDiscDown}
            onPointerUp={onDiscUp}
            style={{ cursor: onAdd && !readOnly ? 'crosshair' : undefined }}
            data-testid="wheel-disc"
          />
          <polygon
            points={outline}
            fill="none"
            stroke="#1a1a1a"
            strokeOpacity={0.4}
            strokeWidth={1}
            pointerEvents="none"
            data-testid="wheel-edge"
          />
          {[0.1, 0.2, 0.3].map((c) =>
            c <= maxChroma ? (
              <circle
                key={c}
                cx={centre}
                cy={centre}
                r={c * scale}
                fill="none"
                stroke="#1a1a1a"
                strokeOpacity={0.12}
                strokeDasharray="2 3"
                pointerEvents="none"
              />
            ) : null,
          )}
          {Array.from({ length: 12 }, (_, i) => i * 30).map((h) => {
            const [x1, y1] = xy(maxChroma, h, scale, centre);
            const [x2, y2] = xy(maxChroma * 0.96, h, scale, centre);
            return (
              <line
                key={h}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#1a1a1a"
                strokeOpacity={0.4}
                pointerEvents="none"
              />
            );
          })}
          {overlay?.map((p) => {
            const [x, y] = xy(Math.min(p.oklch[1], maxChroma), p.oklch[2], scale, centre);
            const inner = (
              <>
                <circle cx={x} cy={y} r={5} fill={p.hex} stroke="#1a1a1a" strokeOpacity={0.6} />
                <title>{p.label}</title>
              </>
            );
            return onPick && !readOnly ? (
              <g
                key={p.id}
                role="button"
                tabIndex={0}
                aria-label={`Add ${p.label}`}
                className="cursor-pointer focus:outline-none"
                onClick={() => onPick(p)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onPick(p);
                  }
                }}
                data-testid="wheel-overlay-point"
              >
                {inner}
              </g>
            ) : (
              <Link
                key={p.id}
                href={p.href}
                aria-label={`Open ${p.label}`}
                data-testid="wheel-overlay-point"
              >
                {inner}
              </Link>
            );
          })}
          {offsets
            ? dots.map((d, i) =>
                d.oklch[1] > 0.01 ? (
                  <line
                    key={i}
                    {...spoke(d.oklch)}
                    stroke="#1a1a1a"
                    strokeOpacity={0.55}
                    strokeWidth={1.5}
                    pointerEvents="none"
                    data-testid="wheel-spoke"
                  />
                ) : null,
              )
            : null}
          {ghosts.map((g, i) => {
            const [x, y] = xy(Math.min(g.oklch[1], maxChroma), g.oklch[2], scale, centre);
            return (
              <g key={i} pointerEvents="none" data-testid="wheel-ghost">
                <line
                  x1={centre}
                  y1={centre}
                  x2={x}
                  y2={y}
                  stroke="#1a1a1a"
                  strokeOpacity={0.35}
                  strokeDasharray="3 3"
                />
                <circle
                  cx={x}
                  cy={y}
                  r={7}
                  fill={g.hex}
                  fillOpacity={0.5}
                  stroke="#1a1a1a"
                  strokeWidth={1.5}
                  strokeDasharray="3 2"
                />
              </g>
            );
          })}
          {dots.map((d, i) => {
            const [x, y] = xy(Math.min(d.oklch[1], maxChroma), d.oklch[2], scale, centre);
            const r = i === 0 ? 10 : 8;
            const beyond = !inSrgb(d.oklch[0], d.oklch[1], d.oklch[2]);
            return (
              <g
                key={i}
                tabIndex={readOnly ? -1 : 0}
                role={readOnly ? 'img' : 'button'}
                aria-label={`${d.label} ${d.hex}${d.locked ? ', locked' : ''}`}
                className={readOnly ? undefined : 'cursor-grab focus:outline-none'}
                onPointerDown={onDotDown(i)}
                onPointerMove={onDotMove}
                onPointerUp={onDotUp}
                onPointerCancel={onDotUp}
                onDoubleClick={() => onLock?.(i)}
                onKeyDown={onDotKey(i)}
                onFocus={() => setActive(i)}
                data-testid="wheel-dot"
                data-hex={d.hex}
                data-oklch={d.oklch.map((n) => n.toFixed(3)).join(',')}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={r + 3}
                  fill="none"
                  stroke="#1a1a1a"
                  strokeOpacity={active === i ? 0.9 : 0.45}
                  strokeWidth={active === i ? 2 : 1}
                  strokeDasharray={beyond ? '2 2' : undefined}
                />
                <circle cx={x} cy={y} r={r} fill={d.hex} stroke="#ffffff" strokeWidth={2} />
                {d.locked ? (
                  <g transform={`translate(${x - 5} ${y - r - 15})`} aria-hidden="true">
                    <rect x={0} y={4} width={10} height={7} rx={1.5} fill="#1a1a1a" />
                    <path
                      d="M2 4V3a3 3 0 0 1 6 0v1"
                      fill="none"
                      stroke="#1a1a1a"
                      strokeWidth={1.5}
                    />
                  </g>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>

      {onSlice ? (
        <div className="flex flex-col gap-1 text-xs">
          <label htmlFor={`slice-${size}`} className="flex justify-between">
            <span>Lightness of the slice</span>
            <span className="font-mono">{slice.toFixed(2)}</span>
          </label>
          <input
            id={`slice-${size}`}
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={slice}
            onChange={(e) => onSlice(Number(e.target.value))}
            className="w-full"
            data-testid="wheel-slice"
          />
        </div>
      ) : null}

      {activeDot && !readOnly ? (
        <div
          className="flex items-center gap-2.5 rounded-md border border-[var(--line)] px-2.5 py-2 text-[13px]"
          data-testid="wheel-readout"
        >
          <span
            aria-hidden="true"
            className="h-5 w-5 shrink-0 rounded-full border border-[var(--line)]"
            style={{ background: activeDot.hex }}
          />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span>
              <span className="font-semibold">{activeDot.label}</span> ·{' '}
              <span className="font-mono">{activeDot.hex.slice(1).toUpperCase()}</span>
            </span>
            <span className="font-mono text-[11px] text-[var(--muted)]">
              {fmt(activeDot.oklch)}
            </span>
            {near && near.distance < 0.25 ? (
              <Link
                href={`/dictionary/${near.conceptId}`}
                className="text-xs underline underline-offset-2"
              >
                {near.distance < 0.02 ? '' : 'near '}
                {near.label}
              </Link>
            ) : null}
          </span>
        </div>
      ) : null}

      {hint ? (
        <p className="m-0 text-[11px] leading-[1.45] text-[var(--muted)]">
          {hint} Grey is outside sRGB at this lightness; a dashed ring marks a dot that is.
        </p>
      ) : null}
    </div>
  );
}

function oklabOf(c: Oklch): [number, number, number] {
  const rad = (c[2] * Math.PI) / 180;
  return [c[0], c[1] * Math.cos(rad), c[1] * Math.sin(rad)];
}
