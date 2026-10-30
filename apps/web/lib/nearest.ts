import type { StatusKind } from '@/components/badges';

/** Where a point's value comes from, for exports and comparisons that must cite it. */
export interface PointProvenance {
  /** The representation's own space and coordinates, as recorded. */
  space: string;
  coords: [number, number, number];
  approximation: 'measured' | 'published-value' | 'modern-approximation' | 'unknown';
  method: string;
  source: string;
  locator?: string;
}

/** One displayable representation with the concept it belongs to: enough for a "nearest documented colour" lookup. */
export interface NamePoint {
  id: string;
  conceptId: string;
  label: string;
  tradition: string | null;
  /** Grouping shown in selectors: a naming standard such as jis-z8102, or the tradition. */
  group: string;
  status: StatusKind;
  queue: boolean;
  oklab: [number, number, number];
  hex: string;
  provenance?: PointProvenance;
}

/** Nearest point by Euclidean distance in OKLab. Pure, so client components can call it. */
export function nearestPoint(
  points: NamePoint[],
  oklab: [number, number, number],
  excludeConcept?: string,
  group?: string,
): (NamePoint & { distance: number }) | null {
  let best: (NamePoint & { distance: number }) | null = null;
  for (const p of points) {
    if (excludeConcept && p.conceptId === excludeConcept) continue;
    if (group && group !== 'all' && p.group !== group) continue;
    const d = Math.hypot(p.oklab[0] - oklab[0], p.oklab[1] - oklab[1], p.oklab[2] - oklab[2]);
    if (!best || d < best.distance) best = { ...p, distance: d };
  }
  return best;
}
