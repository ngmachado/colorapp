/**
 * A modular scale: a base size multiplied by one ratio per step. The ratios are numbers; what they are called,
 * and who calls them that, is a matter for the knowledge records, not for this module.
 */

export interface ScaleStep {
  step: number;
  px: number;
}

/** Sizes from `from` to `to` steps around the base, rounded to two decimals of a pixel. */
export function scale(base: number, ratio: number, from = -2, to = 5): ScaleStep[] {
  if (!(base > 0) || !(ratio > 0)) throw new RangeError('base and ratio must be positive');
  const out: ScaleStep[] = [];
  for (let step = from; step <= to; step++)
    out.push({ step, px: Math.round(base * ratio ** step * 100) / 100 });
  return out;
}

/** The size at one step, unrounded. */
export const sizeAt = (base: number, ratio: number, step: number) => base * ratio ** step;
