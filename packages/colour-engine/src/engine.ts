import Color from 'colorjs.io';
import type {
  ColourValue,
  Difference,
  DifferenceMetric,
  GamutPolicy,
  SpaceId,
  Source,
  Triple,
} from './types';
import { SPACES } from './types';

export const ENGINE_VERSION = '1';

/** Engine space id → Color.js space id. xyY is handled by the engine itself. */
const COLORJS_ID: Record<Exclude<SpaceId, 'xyy'>, string> = {
  srgb: 'srgb',
  'srgb-linear': 'srgb-linear',
  'display-p3': 'p3',
  hsl: 'hsl',
  hsv: 'hsv',
  'xyz-d65': 'xyz-d65',
  'xyz-d50': 'xyz-d50',
  lab: 'lab',
  lch: 'lch',
  oklab: 'oklab',
  oklch: 'oklch',
  'cam16-jmh': 'cam16-jmh',
};

const D65_XY: [number, number] = [0.3127, 0.329];

const HUE_INDEX: Partial<Record<SpaceId, number>> = {
  hsl: 0,
  hsv: 0,
  lch: 2,
  oklch: 2,
  'cam16-jmh': 2,
};

function xyzToXyy([X, Y, Z]: Triple): Triple {
  const sum = X + Y + Z;
  if (sum === 0) return [D65_XY[0], D65_XY[1], 0];
  return [X / sum, Y / sum, Y];
}

function xyyToXyz([x, y, Y]: Triple): Triple {
  if (y === 0) return [0, 0, 0];
  return [(x * Y) / y, Y, ((1 - x - y) * Y) / y];
}

/** Builds a Color.js object for any engine value. */
function toColorjs(v: ColourValue): Color {
  if (v.space === 'xyy') return new Color('xyz-d65', xyyToXyz(v.coords));
  return new Color(COLORJS_ID[v.space], v.coords);
}

function fromColorjs(c: Color, space: SpaceId): { coords: Triple; achromatic: boolean } {
  const raw =
    space === 'xyy'
      ? xyzToXyy(c.to('xyz-d65').coords as Triple)
      : (c.to(COLORJS_ID[space]).coords as (number | null)[]);
  const h = HUE_INDEX[space];
  // Color.js reports an undefined hue (chroma 0) as null or NaN; the engine sets 0 and says so.
  const achromatic = h !== undefined && (raw[h] == null || Number.isNaN(raw[h]));
  const coords = raw.map((n) => (n == null || Number.isNaN(n) ? 0 : n)) as Triple;
  return { coords, achromatic };
}

function assertFinite(coords: Triple, space: SpaceId) {
  for (const n of coords) {
    if (typeof n !== 'number' || !Number.isFinite(n))
      throw new Error(`Invalid ${space} coordinates: ${JSON.stringify(coords)}`);
  }
}

/** Creates a colour value in a declared space. This is the only way a colour enters the engine. */
export function colour(space: SpaceId, coords: Triple, source?: Source): ColourValue {
  assertFinite(coords, space);
  const white = SPACES[space].white;
  const c: Triple = [coords[0], coords[1], coords[2]];
  const v: ColourValue = {
    space,
    coords: c,
    white,
    origin: { space, coords: [...c] as Triple, white },
    conversionPath: [space],
  };
  if (source) v.source = source;
  return v;
}

/** Converts to another space, recording the step and any chromatic adaptation. */
export function convert(v: ColourValue, to: SpaceId): ColourValue {
  if (v.space === to) return v;
  const { coords, achromatic } = fromColorjs(toColorjs(v), to);
  const path = [...v.conversionPath];
  const toWhite = SPACES[to].white;
  if (v.white !== toWhite) path.push(`adapt:bradford:${v.white}->${toWhite}`);
  path.push(to);
  const out: ColourValue = { ...v, space: to, coords, white: toWhite, conversionPath: path };
  if (achromatic) out.achromatic = true;
  else delete out.achromatic;
  return out;
}

export function inGamut(v: ColourValue, space: SpaceId = 'srgb'): boolean {
  if (space === 'xyy') return true;
  return toColorjs(v).inGamut(COLORJS_ID[space]);
}

const COLORJS_METHOD: Record<GamutPolicy, string> = {
  clip: 'clip',
  css: 'css',
  'oklch-chroma': 'oklch.c',
};

/**
 * Converts into `space` and brings the value inside its gamut with a named policy.
 * The pre-mapping coordinates and the perceptual delta are kept on the result.
 */
export function toGamut(
  v: ColourValue,
  space: SpaceId = 'srgb',
  policy: GamutPolicy = 'css',
): ColourValue {
  const converted = convert(v, space);
  if (inGamut(converted, space)) return converted;
  if (space === 'xyy') return converted;
  const mappedColor = toColorjs(converted).toGamut({
    space: COLORJS_ID[space],
    method: COLORJS_METHOD[policy],
  });
  const { coords, achromatic } = fromColorjs(mappedColor, space);
  const result: ColourValue = {
    ...converted,
    coords,
    conversionPath: [...converted.conversionPath, `gamut:${policy}:${space}`],
    mapped: {
      policy,
      space,
      from: converted.coords,
      delta: deltaE(converted, { ...converted, coords }, 'oklab'),
    },
  };
  if (achromatic) result.achromatic = true;
  return result;
}

/** Colour difference. The metric name, version and parameters travel with the number. */
export function deltaE(
  a: ColourValue,
  b: ColourValue,
  metric: DifferenceMetric = 'ciede2000',
): Difference {
  const ca = toColorjs(a);
  const cb = toColorjs(b);
  if (metric === 'ciede2000') {
    const params = { kL: 1, kC: 1, kH: 1 };
    return {
      metric,
      version: ENGINE_VERSION,
      value: ca.deltaE(cb, { method: '2000', ...params }),
      space: 'lab',
      params,
    };
  }
  return {
    metric,
    version: ENGINE_VERSION,
    value: ca.deltaE(cb, { method: 'OK' }),
    space: 'oklab',
  };
}

/** Smaller circular separation between two hue angles, in degrees. */
export function hueDistance(h1: number, h2: number): number {
  const d = Math.abs((((h1 - h2) % 360) + 360) % 360);
  return Math.min(d, 360 - d);
}

/** Near-neutral is an operational category. The threshold is OKLCh chroma and is always reported. */
export function nearNeutral(
  v: ColourValue,
  threshold = 0.02,
): { neutral: boolean; chroma: number; threshold: number; space: 'oklch' } {
  const chroma = convert(v, 'oklch').coords[1];
  return { neutral: chroma < threshold, chroma, threshold, space: 'oklch' };
}

/** WCAG 2.x contrast ratio (1..21). For interface text, never a garment beauty score. */
export function contrastRatio(a: ColourValue, b: ColourValue): number {
  return toColorjs(a).contrast(toColorjs(b), 'WCAG21');
}

export type HueArc = 'shorter' | 'longer' | 'increasing' | 'decreasing';

export interface MixOptions {
  space?: SpaceId;
  hue?: HueArc;
}

/** Interpolates in a declared space. The result records the space and arc used. */
export function mix(
  a: ColourValue,
  b: ColourValue,
  t: number,
  options: MixOptions = {},
): ColourValue {
  const space = options.space ?? 'oklch';
  const hue = options.hue ?? 'shorter';
  if (space === 'xyy') throw new Error('Interpolation in xyY is not supported; use xyz-d65.');
  const c = toColorjs(a).mix(toColorjs(b), t, {
    space: COLORJS_ID[space],
    hue,
    outputSpace: COLORJS_ID[space],
  });
  const { coords, achromatic } = fromColorjs(c, space);
  const out: ColourValue = {
    space,
    coords,
    white: SPACES[space].white,
    origin: a.origin,
    source: { kind: 'derived', note: `mix(${t}) in ${space}, hue ${hue}` },
    conversionPath: [...a.conversionPath, `mix:${space}:${hue}:${t}`],
  };
  if (achromatic) out.achromatic = true;
  return out;
}

/** `n` evenly spaced steps from a to b, inclusive. */
export function steps(
  a: ColourValue,
  b: ColourValue,
  n: number,
  options: MixOptions = {},
): ColourValue[] {
  if (n < 2) throw new Error('steps needs n >= 2');
  return Array.from({ length: n }, (_, i) => mix(a, b, i / (n - 1), options));
}

/** Display approximation only: sRGB, gamut-mapped with the CSS policy. Never store this as a colour. */
export function toHex(v: ColourValue): string {
  return toColorjs(toGamut(v, 'srgb', 'css'))
    .to('srgb')
    .toString({ format: 'hex', collapse: false });
}

/** CSS string in the value's own space, for stylesheets that support it. */
export function toCss(v: ColourValue): string {
  return toColorjs(v).toString({ precision: 5 });
}
