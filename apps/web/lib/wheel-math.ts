/**
 * Fast OKLCh to sRGB for painting a wheel pixel by pixel. Björn Ottosson's OKLab matrices; the colour
 * engine stays the source of truth for everything the user reads, this only decides what a pixel looks like.
 */
import type { Oklch } from '@/lib/palette-param';

const EPS = 1e-4;

/** Linear sRGB of an OKLCh colour; components may fall outside 0..1 when the colour is out of gamut. */
export function oklchToLinearSrgb(L: number, C: number, h: number): [number, number, number] {
  const rad = (h * Math.PI) / 180;
  const a = C * Math.cos(rad);
  const b = C * Math.sin(rad);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const encode = (x: number) => {
  const v = Math.min(1, Math.max(0, x));
  return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
};

/** Whether the colour displays on sRGB without mapping. */
export function inSrgb(L: number, C: number, h: number): boolean {
  const [r, g, b] = oklchToLinearSrgb(L, C, h);
  return r >= -EPS && r <= 1 + EPS && g >= -EPS && g <= 1 + EPS && b >= -EPS && b <= 1 + EPS;
}

/** 8-bit sRGB of an OKLCh colour, clipped; for painting only. */
export function srgb8(L: number, C: number, h: number): [number, number, number] {
  const [r, g, b] = oklchToLinearSrgb(L, C, h);
  return [Math.round(encode(r) * 255), Math.round(encode(g) * 255), Math.round(encode(b) * 255)];
}

/** The largest chroma that still displays at this lightness and hue, by bisection. */
export function gamutEdge(L: number, h: number, max = 0.4): number {
  let lo = 0;
  let hi = max;
  if (inSrgb(L, hi, h)) return hi;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (inSrgb(L, mid, h)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** The gamut outline at one lightness as (chroma, hue) pairs, every `step` degrees. */
export function gamutOutline(L: number, step = 3): { c: number; h: number }[] {
  const out: { c: number; h: number }[] = [];
  for (let h = 0; h < 360; h += step) out.push({ c: gamutEdge(L, h), h });
  return out;
}

/** Wheel geometry: hue 0 points right, hues increase counter-clockwise, chroma is the radius. */
export function toXY(c: number, h: number, scale: number, centre: number): [number, number] {
  const rad = (h * Math.PI) / 180;
  return [centre + c * scale * Math.cos(rad), centre - c * scale * Math.sin(rad)];
}

/** Chroma and hue of a wheel position; hue is 0..360. */
export function fromXY(
  x: number,
  y: number,
  scale: number,
  centre: number,
): { c: number; h: number } {
  const dx = x - centre;
  const dy = centre - y;
  const c = Math.hypot(dx, dy) / scale;
  const h = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
  return { c, h };
}

/** Hue offsets of each wheel rule, dominant first, in degrees; rules without hue geometry give null. */
export function ruleOffsets(
  structure: string,
  angles: { span_deg: number; split_deg: number; angle_deg: number },
): number[] | null {
  switch (structure) {
    case 'monochromatic':
      return [0];
    case 'analogous':
      return [0, -angles.span_deg, angles.span_deg];
    case 'complementary':
      return [0, 180];
    case 'split-complementary':
      return [0, 180 - angles.split_deg, 180 + angles.split_deg];
    case 'triadic':
      return [0, 120, 240];
    case 'tetradic':
      return [0, angles.angle_deg, 180, 180 + angles.angle_deg];
    default:
      return null;
  }
}

/** HSL hue and saturation/lightness of an 8-bit sRGB triple. */
export function hslOf(r: number, g: number, b: number): [number, number, number] {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  if (d < 1e-6) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  h = (h * 60 + 360) % 360;
  return [h, s, l];
}

/** 8-bit sRGB of an HSL colour. */
export function hslToRgb8(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const k = Math.floor((((h % 360) + 360) % 360) / 60);
  const [r, g, b] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][k]!;
  return [Math.round((r! + m) * 255), Math.round((g! + m) * 255), Math.round((b! + m) * 255)];
}

/** OKLCh of an 8-bit sRGB triple; grey hue is 0. */
export function oklchOfRgb8(r: number, g: number, b: number): Oklch {
  const lin = (v: number) => {
    const x = v / 255;
    return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  const R = lin(r);
  const G = lin(g);
  const B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(a, bb);
  const h = C < 1e-4 ? 0 : ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
  return [L, C, h];
}
