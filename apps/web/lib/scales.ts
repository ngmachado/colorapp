/**
 * Tonal scales: one column extended to the 50–950 steps design systems use, by even OKLCh lightness
 * steps with the column's own chroma and hue. Steps that leave sRGB are gamut-mapped and flagged.
 * The column itself sits wherever its lightness falls; nothing here claims the steps look even.
 */
import { colour, inGamut, toGamut, toHex } from '@sca/colour-engine';
import type { Oklch } from './palette-param';

export const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type ScaleStep = (typeof SCALE_STEPS)[number];
/** L = 1 − SLOPE × step/100: 50 → 0.956, 500 → 0.563, 950 → 0.169. Even in L by construction. */
const SLOPE = 0.0875;

export interface ScaleStop {
  step: ScaleStep;
  /** Target OKLCh lightness. */
  l: number;
  oklch: Oklch;
  hex: string;
  /** True when the stop at the column's chroma lies outside sRGB and was mapped. */
  mapped: boolean;
}

export const lightnessOf = (step: ScaleStep) => 1 - (SLOPE * step) / 100;

export function scaleOf(c: Oklch): ScaleStop[] {
  return SCALE_STEPS.map((step) => {
    const l = lightnessOf(step);
    const v = colour('oklch', [l, c[1], c[2]]);
    const inside = inGamut(v, 'srgb');
    const shown = inside ? v : toGamut(v, 'srgb', 'css');
    return { step, l, oklch: [l, c[1], c[2]], hex: toHex(shown), mapped: !inside };
  });
}

/** The step whose target lightness is nearest the column's own. */
export function nearestStep(c: Oklch): ScaleStep {
  return SCALE_STEPS.reduce((best, s) =>
    Math.abs(lightnessOf(s) - c[0]) < Math.abs(lightnessOf(best) - c[0]) ? s : best,
  );
}
