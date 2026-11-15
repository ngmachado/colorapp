import { hexesIn } from './lab-links';

/**
 * The Type laboratory's state as it travels in the address, so a setting can be shared and opened from the
 * Laboratory: face, base size, ratio, measure, the palette, which palette colours each text style uses, and
 * whether the 1.4.12 spacing test is applied.
 */

export const STYLE_IDS = ['display', 'heading', 'body', 'caption'] as const;
export type StyleId = (typeof STYLE_IDS)[number];

export interface StyleSetting {
  id: StyleId;
  label: string;
  /** Steps from the base size on the scale. */
  step: number;
  weight: number;
  /** Line height as a ratio of the size. */
  leading: number;
  /** Palette indices for the text and its ground. */
  fg: number;
  bg: number;
}

export interface TypeState {
  face: string | null;
  base: number;
  ratio: number;
  /** Width of the body column in CSS px. */
  measure: number;
  hexes: string[];
  styles: StyleSetting[];
  spacing: boolean;
}

/** The palette a reader meets before bringing one from the Laboratory: a blue, a warm paper, an ink, a gold and white. */
export const DEFAULT_HEXES = ['#2a6fbd', '#f4efe6', '#1b1b1f', '#e2b23a', '#ffffff'];

export const DEFAULT_STYLES: StyleSetting[] = [
  { id: 'display', label: 'Display', step: 4, weight: 700, leading: 1.05, fg: 0, bg: 1 },
  { id: 'heading', label: 'Heading', step: 2, weight: 600, leading: 1.2, fg: 2, bg: 1 },
  { id: 'body', label: 'Body', step: 0, weight: 400, leading: 1.5, fg: 2, bg: 4 },
  { id: 'caption', label: 'Caption', step: -1, weight: 500, leading: 1.4, fg: 2, bg: 4 },
];

/** Musical intervals as ratios; the names and their use are the cited source's, the numbers are arithmetic. */
export const RATIOS: { value: number; name: string }[] = [
  { value: 1.125, name: 'major second 9:8' },
  { value: 1.2, name: 'minor third 6:5' },
  { value: 1.25, name: 'major third 5:4' },
  { value: 1.333, name: 'perfect fourth 4:3' },
  { value: 1.5, name: 'perfect fifth 3:2' },
  { value: 1.618, name: 'golden section' },
];
/** Bringhurst's range for a single-column text page; the citation is shown beside the count. */
export const MEASURE_RANGE = { min: 45, max: 75, ideal: 66 };
/** Padding of the body column on the page, in CSS px; the count per line is taken inside it. */
export const PAD = 18;

export const LIMITS = { base: [10, 32], ratio: [1.05, 2], measure: [240, 1200] } as const;
const clamp = (v: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, v));
const num = (s: string | undefined, fallback: number, range: readonly [number, number]) => {
  const n = Number(s);
  return s !== undefined && s !== '' && Number.isFinite(n) ? clamp(n, range) : fallback;
};

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function readTypeState(sp: Params): TypeState {
  const hexes = hexesIn(one(sp.hex) ?? '').slice(0, 8);
  const palette = hexes.length >= 2 ? hexes : DEFAULT_HEXES;
  const face = (one(sp.face) ?? '').trim();
  // Each style as "fg-bg" by palette index, in STYLE_IDS order; anything malformed keeps the default.
  const pairs = (one(sp.styles) ?? '').split(',');
  // A shorter palette than the defaults expect: grounds fall back to the last colour, text to the first,
  // and never the same colour for both.
  const fit = (s: StyleSetting): StyleSetting => {
    const bg = s.bg < palette.length ? s.bg : palette.length - 1;
    let fg = s.fg < palette.length ? s.fg : 0;
    if (fg === bg) fg = bg === 0 ? palette.length - 1 : 0;
    return { ...s, fg, bg };
  };
  const styles = DEFAULT_STYLES.map((s, i) => {
    const m = /^(\d+)-(\d+)$/.exec(pairs[i] ?? '');
    if (!m) return fit(s);
    const fg = Number(m[1]);
    const bg = Number(m[2]);
    return fg < palette.length && bg < palette.length && fg !== bg ? { ...s, fg, bg } : fit(s);
  });
  return {
    face: face && face.length <= 60 ? face : null,
    base: num(one(sp.base), 16, LIMITS.base),
    ratio: num(one(sp.ratio), 1.25, LIMITS.ratio),
    measure: num(one(sp.measure), 640, LIMITS.measure),
    hexes: palette,
    styles,
    spacing: one(sp.spacing) === '1',
  };
}

/** The state as an address under /type; defaults are left out so a fresh page has a short link. */
export function writeTypeState(s: TypeState): string {
  // Built by hand, as the Laboratory's is, so commas stay readable in the address bar.
  const parts: string[] = [];
  if (s.face) parts.push(`face=${encodeURIComponent(s.face)}`);
  if (s.base !== 16) parts.push(`base=${s.base}`);
  if (s.ratio !== 1.25) parts.push(`ratio=${s.ratio}`);
  if (s.measure !== 640) parts.push(`measure=${s.measure}`);
  if (s.hexes.join() !== DEFAULT_HEXES.join())
    parts.push(`hex=${s.hexes.map((h) => h.slice(1)).join(',')}`);
  const styles = s.styles.map((x) => `${x.fg}-${x.bg}`).join(',');
  if (styles !== DEFAULT_STYLES.map((x) => `${x.fg}-${x.bg}`).join(','))
    parts.push(`styles=${styles}`);
  if (s.spacing) parts.push('spacing=1');
  return parts.length ? `/type?${parts.join('&')}` : '/type';
}
