import type { StatusKind } from '@/components/badges';

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
