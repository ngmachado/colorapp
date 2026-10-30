/**
 * Distinctness of a palette under colour-vision simulation: every pair's OKLab distance as drawn and
 * after protan, deutan and tritan simulation, with the weakest pair named per view. The distances are
 * reported as numbers; a flag threshold is a working setting, not a perceptibility claim.
 */
import { colour, convert, simulateCvd, type CvdType } from '@sca/colour-engine';
import type { Oklch } from './palette-param';

export const DISTINCT_VIEWS: ('normal' | CvdType)[] = ['normal', 'protan', 'deutan', 'tritan'];
export const DEFAULT_FLAG_DISTANCE = 0.1;
type Oklab = [number, number, number];

export interface PairDistance {
  a: number;
  b: number;
  distance: number;
}
export interface DistinctView {
  view: 'normal' | CvdType;
  /** Each colour as it appears in this view, sRGB display approximation. */
  hexes: string[];
  pairs: PairDistance[];
  /** The closest pair in this view. */
  weakest: PairDistance;
}

const dist = (a: Oklab, b: Oklab) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export function distinctness(palette: Oklch[]): DistinctView[] {
  return DISTINCT_VIEWS.map((view) => {
    const values = palette.map((c) => {
      const v = colour('oklch', c);
      return view === 'normal' ? v : simulateCvd(v, view);
    });
    const labs = values.map((v) => convert(v, 'oklab').coords as Oklab);
    const pairs: PairDistance[] = [];
    for (let a = 0; a < labs.length; a++)
      for (let b = a + 1; b < labs.length; b++)
        pairs.push({ a, b, distance: dist(labs[a]!, labs[b]!) });
    const weakest = pairs.reduce((w, p) => (p.distance < w.distance ? p : w), pairs[0]!);
    return {
      view,
      hexes: values.map((v) => convert(v, 'srgb')).map((v) => hexOf(v.coords as Oklab)),
      pairs,
      weakest,
    };
  });
}

const hexOf = (rgb: Oklab) =>
  `#${rgb
    .map((c) =>
      Math.max(0, Math.min(255, Math.round(c * 255)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
