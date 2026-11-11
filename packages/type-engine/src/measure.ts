/**
 * Line length and leading as measurements. A range to check against comes from a documented source and is
 * passed in; this module never carries a recommendation of its own.
 */

/** Characters per line for a column width and an average character width, both in the same unit. */
export function charactersPerLine(columnWidth: number, averageCharWidth: number): number {
  if (!(averageCharWidth > 0)) throw new RangeError('average character width must be positive');
  return Math.max(0, Math.floor(columnWidth / averageCharWidth));
}

/** Average advance of the lowercase alphabet plus a space, from the widths a renderer measured. */
export function averageCharWidth(alphabetWithSpaceWidth: number): number {
  return alphabetWithSpaceWidth / 27;
}

export interface Range {
  min: number;
  max: number;
  /** A single preferred value within the range, where the source names one. */
  ideal?: number;
}

export type Placement = 'below' | 'within' | 'above';

/** Where a value falls against a documented range. */
export function place(value: number, range: Range): Placement {
  if (value < range.min) return 'below';
  if (value > range.max) return 'above';
  return 'within';
}

/** Leading as a ratio of line height to font size. */
export const leadingRatio = (lineHeightPx: number, fontSizePx: number) => lineHeightPx / fontSizePx;

/** A value in font units as a fraction of the em. */
export const asEm = (units: number, unitsPerEm: number) => units / unitsPerEm;
