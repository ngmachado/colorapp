import type { NamePoint } from './nearest';
import { knowledge } from './knowledge';
import type { SpaceEdge } from '@/components/space/space-map';

/** Documented complementary pairs between plotted records: the only lines the map draws. Server only. */
export function documentedEdges(points: NamePoint[]): SpaceEdge[] {
  const withPoint = new Set(points.map((p) => p.conceptId));
  return knowledge()
    .byType('relationship')
    .filter((r) => r.edge === 'complement-of' && withPoint.has(r.from) && withPoint.has(r.to))
    .map((r) => ({ from: r.from, to: r.to, label: 'Chevreul’s complementary pairs' }));
}
