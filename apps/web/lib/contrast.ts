import { colour, convert } from '@sca/colour-engine';
import type { Oklch } from '@/lib/palette-param';

/** A typed or pasted hex: 3 or 6 digits, with or without the hash. Returns the 6-digit form or null. */
export function parseHex(text: string): string | null {
  const t = text.trim().replace(/^#/, '');
  if (/^[0-9a-f]{6}$/i.test(t)) return `#${t.toLowerCase()}`;
  if (/^[0-9a-f]{3}$/i.test(t))
    return `#${t
      .toLowerCase()
      .split('')
      .map((ch) => ch + ch)
      .join('')}`;
  return null;
}

/** OKLCh of a 6-digit hex, in the generator's domain: L within 0..1, C at least 0, grey hue 0. */
export function oklchOfHex(hex: string): Oklch {
  const h = hex.replace('#', '');
  const rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
  const c = convert(colour('srgb', rgb, { kind: 'manual' }), 'oklch').coords;
  return [Math.min(1, Math.max(0, c[0])), Math.max(0, c[1]), Number.isNaN(c[2]) ? 0 : c[2]];
}

export type ContrastGrade = 'AAA' | 'AA' | 'AA large' | 'below 3';

/** WCAG 2.1 success-criterion thresholds for a contrast ratio: 7 for AAA, 4.5 for AA, 3 for large text and UI. */
export function contrastGrade(ratio: number): ContrastGrade {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA large';
  return 'below 3';
}

/**
 * The WCAG 2.1 thresholds an intended text/background pair is checked against, each named with its
 * success criterion so the number on screen is never a bare grade.
 */
export const THRESHOLDS: {
  use: string;
  level: 'AA' | 'AAA';
  minimum: number;
  criterion: string;
}[] = [
  { use: 'normal text', level: 'AA', minimum: 4.5, criterion: '1.4.3' },
  { use: 'normal text', level: 'AAA', minimum: 7, criterion: '1.4.6' },
  { use: 'large text', level: 'AA', minimum: 3, criterion: '1.4.3' },
  { use: 'large text', level: 'AAA', minimum: 4.5, criterion: '1.4.6' },
  { use: 'interface parts and graphics', level: 'AA', minimum: 3, criterion: '1.4.11' },
];

export function thresholdReport(ratio: number) {
  return THRESHOLDS.map((t) => ({ ...t, passes: ratio >= t.minimum }));
}
