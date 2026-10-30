import { colour, convert } from '@sca/colour-engine';
import type { NamePoint } from './nearest';

/** The colour space map: pure helpers shared by the page, the client scene and the tests. */

export type Triple = [number, number, number];

/** One OKLab unit is this many scene units; L is centred so the solid turns about its middle. */
export const SCALE = 100;
export const scenePosition = (lab: Triple): Triple => [
  lab[1] * SCALE,
  (lab[0] - 0.5) * SCALE,
  -lab[2] * SCALE,
];

/** Same band as the wheels: points further than this from the chosen lightness fade back. */
export const BAND = 0.15;

export interface PaletteColour {
  hex: string;
  lab: Triple;
}

export function parseHexList(text: string): PaletteColour[] {
  const out: PaletteColour[] = [];
  for (const m of text.matchAll(/(?:#|\b)([0-9a-f]{6})\b/gi)) {
    const hex = `#${m[1]!.toLowerCase()}`;
    if (out.some((c) => c.hex === hex) || out.length >= 8) continue;
    const rgb = [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255) as Triple;
    out.push({ hex, lab: convert(colour('srgb', rgb), 'oklab').coords as Triple });
  }
  return out;
}

export const distance = (p: Triple, q: Triple) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

/** Closest documented points to a position, within the chosen collection, excluding a concept. */
export function nearestPoints(
  points: NamePoint[],
  lab: Triple,
  n: number,
  group = 'all',
  excludeConcept?: string,
): (NamePoint & { distance: number })[] {
  return points
    .filter((p) => (group === 'all' || p.group === group) && p.conceptId !== excludeConcept)
    .map((p) => ({ ...p, distance: distance(p.oklab, lab) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, n);
}

/**
 * The sRGB solid as its twelve cube edges mapped through OKLab, as pairs of scene positions.
 * Straight in RGB, these curve in OKLab; 24 samples per edge keep the curves smooth.
 */
export function gamutSegments(samples = 24): Triple[] {
  const corners: Triple[] = [
    [0, 0, 0],
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
    [1, 1, 0],
    [1, 0, 1],
    [0, 1, 1],
    [1, 1, 1],
  ];
  const edges = [
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 4],
    [1, 5],
    [2, 4],
    [2, 6],
    [3, 5],
    [3, 6],
    [4, 7],
    [5, 7],
    [6, 7],
  ] as const;
  const out: Triple[] = [];
  const at = (i: number, j: number, t: number): Triple => {
    const rgb = corners[i]!.map((v, n) => v + (corners[j]![n]! - v) * t) as Triple;
    return scenePosition(convert(colour('srgb', rgb), 'oklab').coords as Triple);
  };
  for (const [i, j] of edges)
    for (let k = 0; k < samples; k++) out.push(at(i, j, k / samples), at(i, j, (k + 1) / samples));
  return out;
}

/** The map's state, as it travels in the URL. */
export interface SpaceState {
  hexes: string[];
  set: string;
  band: boolean;
  l: number;
  focus: string | null;
}

export function readState(sp: Record<string, string | string[] | undefined>): SpaceState {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
  const l = Number(one(sp.l));
  return {
    hexes: parseHexList(one(sp.hex)).map((c) => c.hex),
    set: one(sp.set) || 'all',
    band: one(sp.band) === '1',
    l: Number.isFinite(l) && one(sp.l) !== '' ? Math.min(1, Math.max(0, l)) : 0.72,
    focus: one(sp.focus) || null,
  };
}

export function writeState(s: SpaceState): string {
  const q = new URLSearchParams();
  if (s.hexes.length) q.set('hex', s.hexes.map((h) => h.replace('#', '')).join(','));
  if (s.set !== 'all') q.set('set', s.set);
  if (s.band) {
    q.set('band', '1');
    q.set('l', s.l.toFixed(2));
  }
  if (s.focus) q.set('focus', s.focus);
  const text = q.toString();
  return text ? `/space?${text}` : '/space';
}
