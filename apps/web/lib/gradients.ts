/**
 * Two-space gradients. The same pair of colours interpolated in sRGB (gamma-encoded, as CSS `in srgb`)
 * and in OKLCh with a declared hue path. Pure; the engine's `mix` records the space and arc on every value.
 */
import { colour, inGamut, mix, toGamut, toHex, type HueArc } from '@sca/colour-engine';
import { parseHex } from './contrast';

export type GradientSpace = 'srgb' | 'oklch';
export const HUE_ARCS: HueArc[] = ['shorter', 'longer', 'increasing', 'decreasing'];

export interface GradientStop {
  /** Position 0..1. */
  t: number;
  /** sRGB display approximation; gamut-mapped (CSS policy) when `mapped` is true. */
  hex: string;
  mapped: boolean;
}

const srgbOf = (hex: string) => {
  const h = parseHex(hex);
  if (!h) throw new Error(`not a hex colour: ${hex}`);
  return colour(
    'srgb',
    [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number],
    { kind: 'manual' },
  );
};

/** `n` evenly spaced stops from a to b, inclusive, in the given space. OKLCh stops can leave sRGB; those are mapped and flagged. */
export function gradientStops(
  a: string,
  b: string,
  space: GradientSpace,
  hue: HueArc = 'shorter',
  n = 9,
): GradientStop[] {
  const va = srgbOf(a);
  const vb = srgbOf(b);
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const v = mix(va, vb, t, { space, hue });
    const inside = inGamut(v, 'srgb');
    return { t, hex: toHex(inside ? v : toGamut(v, 'srgb', 'css')), mapped: !inside };
  });
}

/** The CSS for each space: the native interpolation syntax, and a stop list of the mapped sRGB values for older engines. */
export function gradientCss(
  a: string,
  b: string,
  space: GradientSpace,
  hue: HueArc = 'shorter',
  n = 9,
) {
  const stops = gradientStops(a, b, space, hue, n);
  const ha = parseHex(a)!;
  const hb = parseHex(b)!;
  const native =
    space === 'srgb'
      ? `linear-gradient(90deg in srgb, ${ha}, ${hb})`
      : `linear-gradient(90deg in oklch ${hue} hue, ${ha}, ${hb})`;
  const fallback = `linear-gradient(90deg, ${stops.map((s) => `${s.hex} ${Math.round(s.t * 100)}%`).join(', ')})`;
  return { native, fallback, stops };
}

/** A stylesheet snippet with both gradients, the fallback first so a supporting engine takes the native line. */
export function gradientSnippet(a: string, b: string, hue: HueArc = 'shorter', n = 9): string {
  const s = gradientCss(a, b, 'srgb', hue, n);
  const o = gradientCss(a, b, 'oklch', hue, n);
  return [
    `/* ${parseHex(a)} → ${parseHex(b)} · two interpolations of the same pair; neither is "correct" for every use */`,
    `.gradient-srgb {`,
    `  background: ${s.fallback}; /* ${n} sRGB stops */`,
    `  background: ${s.native};`,
    `}`,
    `.gradient-oklch {`,
    `  background: ${o.fallback}; /* ${n} stops computed in OKLCh (${hue} hue), gamut-mapped to sRGB${o.stops.some((x) => x.mapped) ? '; some stops were outside sRGB' : ''} */`,
    `  background: ${o.native};`,
    `}`,
    '',
  ].join('\n');
}
