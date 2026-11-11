/**
 * Contrast of a text style on its background. WCAG 2 is the standard; its large-text rule is applied from the
 * style's size and weight. APCA is the method in the WCAG 3 draft and is labelled as such wherever it is shown.
 */

type Rgb = [number, number, number];

/** A 6-digit hex as sRGB channels 0–1. */
export function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(h)) throw new RangeError(`not a 6-digit hex colour: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as Rgb;
}

const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** Relative luminance as WCAG 2 defines it. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The WCAG 2 contrast ratio, from 1 to 21. */
export function wcagRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * WCAG 2's large text: at least 18 point, or 14 point bold, which the W3C maps to 24 and 18.67 CSS px.
 * Bold means a weight of 700 or more.
 */
export function isLargeText(fontSizePx: number, weight: number): boolean {
  return fontSizePx >= 24 || (fontSizePx >= 18.67 && weight >= 700);
}

export interface WcagVerdict {
  ratio: number;
  large: boolean;
  /** The AA and AAA minimums that apply to this size and weight, with their criteria. */
  aa: { minimum: number; passes: boolean; criterion: '1.4.3' };
  aaa: { minimum: number; passes: boolean; criterion: '1.4.6' };
}

/** The WCAG 2 verdict for a text style: ratio and both levels at the thresholds its size and weight select. */
export function wcagForStyle(
  text: string,
  background: string,
  fontSizePx: number,
  weight: number,
): WcagVerdict {
  const ratio = wcagRatio(text, background);
  const large = isLargeText(fontSizePx, weight);
  const aaMin = large ? 3 : 4.5;
  const aaaMin = large ? 4.5 : 7;
  return {
    ratio,
    large,
    aa: { minimum: aaMin, passes: ratio >= aaMin, criterion: '1.4.3' },
    aaa: { minimum: aaaMin, passes: ratio >= aaaMin, criterion: '1.4.6' },
  };
}

/**
 * APCA, algorithm 0.0.98G-4g (the constants published with apca-w3 0.1.9), text on background. Positive Lc is
 * dark text on a light ground, negative is light on dark. Labelled as the WCAG 3 draft method wherever shown.
 */
export function apcaLc(text: string, background: string): number {
  const toY = (hex: string) => {
    const [r, g, b] = hexToRgb(hex).map((c) => c ** 2.4) as Rgb;
    return 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  };
  const clamp = (y: number) => (y > 0.022 ? y : y + (0.022 - y) ** 1.414);
  const yText = clamp(toY(text));
  const yBg = clamp(toY(background));
  if (Math.abs(yBg - yText) < 0.0005) return 0;
  const sapc =
    yBg > yText ? (yBg ** 0.56 - yText ** 0.57) * 1.14 : (yBg ** 0.65 - yText ** 0.62) * 1.14;
  if (Math.abs(sapc) < 0.1) return 0;
  return (sapc > 0 ? sapc - 0.027 : sapc + 0.027) * 100;
}

/**
 * WCAG 2.1 success criterion 1.4.12, Text Spacing: the values a page must survive without loss of content or
 * function. They are a test to apply, not a setting to recommend.
 */
export const TEXT_SPACING = {
  criterion: '1.4.12',
  lineHeight: 1.5,
  paragraphSpacingEm: 2,
  letterSpacingEm: 0.12,
  wordSpacingEm: 0.16,
} as const;
