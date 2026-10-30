/**
 * Munsell reference lookup against the 1943 renotation table (RIT's real.dat, see
 * content/reference/munsell/README.md). Server only: the table is read from disk and never sent whole.
 *
 * Conditions are kept explicit. The table is illuminant C, 2° observer. An sRGB input is converted to
 * XYZ under D65, adapted to C with the Bradford transform, and compared in CIELAB (white point C) by the
 * CIE76 Euclidean difference. The result is the nearest tabulated sample and its distance: not an
 * interpolated notation, and no perceptibility band is attached to the distance.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { colour, inGamut, toHex, type Triple } from '@sca/colour-engine';
import { parseHex } from './contrast';

export interface MunsellSample {
  notation: string;
  hue: string;
  value: number;
  chroma: number;
  /** As published: CIE x, y and Y under illuminant C, 2° observer, Y on the renotation scale. */
  x: number;
  y: number;
  Y: number;
}
export interface MunsellHit extends MunsellSample {
  /** CIE76 ΔE*ab in CIELAB under illuminant C. */
  deltaE: number;
  /** sRGB display approximation after adaptation to D65; mapped when the sample lies outside sRGB. */
  hex: string;
  mapped: boolean;
}

export const CONDITIONS = {
  table:
    'Munsell renotation (1943), RIT real.dat transcription, 2734 chromatic samples, values 1–9',
  illuminant: 'illuminant C, CIE 1931 2° observer',
  scale: 'published Y × 0.975 to reference the perfect reflecting diffuser (RIT note)',
  adaptation: 'sRGB → XYZ (D65) → Bradford chromatic adaptation to C',
  metric: 'CIE76 ΔE*ab in CIELAB with white point C',
};

const WHITE_D65: Triple = [0.95047, 1, 1.08883];
const WHITE_C: Triple = [0.98074, 1, 1.18232];
const BRADFORD = [
  [0.8951, 0.2664, -0.1614],
  [-0.7502, 1.7135, 0.0367],
  [0.0389, -0.0685, 1.0296],
];
const BRADFORD_INV = [
  [0.9869929, -0.1470543, 0.1599627],
  [0.4323053, 0.5183603, 0.0492912],
  [-0.0085287, 0.0400428, 0.9684867],
];
const mul = (m: number[][], v: Triple): Triple =>
  m.map((r) => r[0]! * v[0] + r[1]! * v[1] + r[2]! * v[2]) as Triple;

/** Bradford adaptation of an XYZ triple from one white to another. */
export function adapt(xyz: Triple, from: Triple, to: Triple): Triple {
  const [rf, gf, bf] = mul(BRADFORD, from);
  const [rt, gt, bt] = mul(BRADFORD, to);
  const [r, g, b] = mul(BRADFORD, xyz);
  return mul(BRADFORD_INV, [(r * rt) / rf, (g * gt) / gf, (b * bt) / bf]);
}

const SRGB_TO_XYZ = [
  [0.4124564, 0.3575761, 0.1804375],
  [0.2126729, 0.7151522, 0.072175],
  [0.0193339, 0.119192, 0.9503041],
];
const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
export function hexToXyzD65(hex: string): Triple {
  const rgb = [1, 3, 5].map((i) => linear(parseInt(hex.slice(i, i + 2), 16) / 255)) as Triple;
  return mul(SRGB_TO_XYZ, rgb);
}

/** CIELAB from XYZ under a given white. */
export function lab(xyz: Triple, white: Triple): Triple {
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
  const [fx, fy, fz] = [f(xyz[0] / white[0]), f(xyz[1] / white[1]), f(xyz[2] / white[2])];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function sampleXyz(s: MunsellSample): Triple {
  const Y = (s.Y * 0.975) / 100;
  return [(s.x * Y) / s.y, Y, ((1 - s.x - s.y) * Y) / s.y];
}

let table: (MunsellSample & { lab: Triple })[] | null = null;
function root(): string {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    try {
      readFileSync(join(dir, 'pnpm-workspace.yaml'));
      return dir;
    } catch {
      dir = join(dir, '..');
    }
  }
  return process.cwd();
}
/** Where the table is read from: the repository copy a developer fetched, or a path given by the environment. */
export function munsellPath(): string {
  return process.env.MUNSELL_DATA_PATH ?? join(root(), 'content/reference/munsell/real.dat');
}
/** The file is not in the repository (RIT's terms allow one personal copy); the page says so when it is absent. */
export function munsellAvailable(): boolean {
  return existsSync(munsellPath());
}
export function munsellTable(text?: string) {
  if (table && !text) return table;
  if (!text && !munsellAvailable()) return [];
  const src = text ?? readFileSync(munsellPath(), 'utf8');
  const rows = src
    .split('\n')
    .slice(1)
    .map((l) => l.trim().split(/\s+/))
    .filter((p) => p.length === 6)
    .map((p) => {
      const s: MunsellSample = {
        hue: p[0]!,
        value: Number(p[1]),
        chroma: Number(p[2]),
        x: Number(p[3]),
        y: Number(p[4]),
        Y: Number(p[5]),
        notation: `${p[0]} ${p[1]}/${p[2]}`,
      };
      return { ...s, lab: lab(sampleXyz(s), WHITE_C) };
    });
  if (!text) table = rows;
  return rows;
}

function hit(s: MunsellSample & { lab: Triple }, deltaE: number): MunsellHit {
  const xyz = adapt(sampleXyz(s), WHITE_C, WHITE_D65);
  const v = colour('xyz-d65', xyz, {
    kind: 'derived',
    note: 'Munsell renotation xyY (C) adapted to D65',
  });
  const { lab: _lab, ...rest } = s;
  void _lab;
  return { ...rest, deltaE, hex: toHex(v), mapped: !inGamut(v, 'srgb') };
}

/** The n nearest tabulated samples to an sRGB hex, by CIE76 ΔE*ab under illuminant C. */
export function munsellNearest(hexText: string, n = 5): MunsellHit[] | null {
  const hex = parseHex(hexText);
  if (!hex) return null;
  const target = lab(adapt(hexToXyzD65(hex), WHITE_D65, WHITE_C), WHITE_C);
  return munsellTable()
    .map((s) => ({
      s,
      d: Math.hypot(s.lab[0] - target[0], s.lab[1] - target[1], s.lab[2] - target[2]),
    }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map(({ s, d }) => hit(s, d));
}

const FAMILIES = ['R', 'YR', 'Y', 'GY', 'G', 'BG', 'B', 'PB', 'P', 'RP'];
/** A hue page as a number on the 100-step Munsell circle, for nearest-page lookups. */
export function hueNumber(hue: string): number | null {
  const m = /^(\d+(?:\.\d+)?)([A-Z]+)$/.exec(hue.trim().toUpperCase());
  if (!m) return null;
  const i = FAMILIES.indexOf(m[2]!);
  const step = Number(m[1]);
  if (i < 0 || step <= 0 || step > 10) return null;
  return i * 10 + step;
}
export function parseNotation(text: string): { hue: string; value: number; chroma: number } | null {
  const m = /^\s*(\d+(?:\.\d+)?[A-Za-z]+)\s+(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/.exec(text);
  if (!m || hueNumber(m[1]!) === null) return null;
  return { hue: m[1]!.toUpperCase(), value: Number(m[2]), chroma: Number(m[3]) };
}

/**
 * The tabulated sample for a notation, or the nearest tabulated one: nearest value, then nearest hue
 * page on the 100-step circle, then nearest chroma. Says which it was.
 */
export function munsellForNotation(
  text: string,
): { exact: boolean; hit: MunsellHit; asked: string } | null {
  const q = parseNotation(text);
  if (!q) return null;
  const asked = `${q.hue} ${q.value}/${q.chroma}`;
  const h = hueNumber(q.hue)!;
  const rows = munsellTable();
  if (!rows.length) return null;
  const exact = rows.find((s) => s.hue === q.hue && s.value === q.value && s.chroma === q.chroma);
  if (exact) return { exact: true, hit: hit(exact, 0), asked };
  const circ = (a: number, b: number) => Math.min(Math.abs(a - b), 100 - Math.abs(a - b));
  const best = [...rows].sort(
    (a, b) =>
      Math.abs(a.value - q.value) - Math.abs(b.value - q.value) ||
      circ(hueNumber(a.hue)!, h) - circ(hueNumber(b.hue)!, h) ||
      Math.abs(a.chroma - q.chroma) - Math.abs(b.chroma - q.chroma),
  )[0]!;
  return { exact: false, hit: hit(best, NaN), asked };
}
