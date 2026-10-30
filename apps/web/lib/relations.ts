/**
 * Documented relations near a palette. The method is declared and simple: each member of a documented
 * set is represented by its displayable point (the record an entry shows), and the set is listed when
 * every member lies within a stated OKLab distance of some palette column, each member matched to its
 * nearest column. Distance is a search criterion. It never makes a palette "mean" the relation.
 */
import type { NamePoint } from './nearest';
import type { ColourSet } from './systems';

export const DEFAULT_RELATION_DISTANCE = 0.1;
export type Oklab = [number, number, number];

export interface RelationMatch {
  set: ColourSet;
  members: {
    conceptId: string;
    label: string;
    /** The representation record whose value was compared. */
    record: string;
    hex: string;
    /** Nearest palette column and its distance in OKLab. */
    column: number;
    distance: number;
  }[];
  /** The largest member distance: how loosely the palette matches. */
  worst: number;
}

const dist = (a: Oklab, b: Oklab) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export function relationsNear(
  sets: ColourSet[],
  points: NamePoint[],
  palette: Oklab[],
  maxDistance = DEFAULT_RELATION_DISTANCE,
): RelationMatch[] {
  const out: RelationMatch[] = [];
  for (const set of sets) {
    const members: RelationMatch['members'] = [];
    let complete = true;
    for (const cid of set.conceptIds) {
      // namePoints() lists the preferred representation of a concept first.
      const p = points.find((x) => x.conceptId === cid);
      if (!p) {
        complete = false;
        break;
      }
      let column = -1;
      let best = Infinity;
      palette.forEach((c, i) => {
        const d = dist(c, p.oklab);
        if (d < best) {
          best = d;
          column = i;
        }
      });
      if (best > maxDistance) {
        complete = false;
        break;
      }
      members.push({
        conceptId: cid,
        label: p.label,
        record: p.id,
        hex: p.hex,
        column,
        distance: best,
      });
    }
    if (!complete || members.length < 2) continue;
    out.push({ set, members, worst: Math.max(...members.map((m) => m.distance)) });
  }
  return out.sort((a, b) => a.worst - b.worst);
}
