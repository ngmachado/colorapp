import { colour, convert, toHex } from '@sca/colour-engine';
import type { Representation, Source } from '@sca/knowledge';
import { knowledge } from './knowledge';
import type { NamePoint } from './nearest';

export { nearestPoint, type NamePoint } from './nearest';
import { inQueue, isRestricted, orderRepresentations, pointGroup, recordStatus } from './records';

export function namePoints(): NamePoint[] {
  const k = knowledge();
  const out: NamePoint[] = [];
  const points = k.oklabPoints();
  const byId = new Map(points.map((p) => [p.id, p]));
  // Preferred representations first, so `points.find(conceptId)` picks the value an entry shows.
  const reps = orderRepresentations(
    points
      .map((p) => k.record(p.id))
      .filter((r): r is Representation => !!r && r.type === 'representation'),
  );
  for (const rep of reps) {
    const p = byId.get(rep.id)!;
    const concept = k.record(p.concept_id);
    if (!concept || concept.type !== 'concept' || isRestricted(rep)) continue;
    out.push({
      id: p.id,
      conceptId: p.concept_id,
      label: concept.label,
      tradition: concept.tags?.tradition ?? null,
      group: pointGroup(concept),
      status: recordStatus(rep),
      queue: inQueue(rep) || inQueue(concept),
      oklab: [p.l, p.a, p.b],
      hex: toHex(convert(colour('oklab', [p.l, p.a, p.b]), 'srgb')),
      ...(rep.coords
        ? {
            provenance: {
              space: rep.space,
              coords: rep.coords,
              approximation: rep.approximation_status,
              method: rep.method,
              source: rep.evidence.source,
              ...(rep.evidence.locator ? { locator: rep.evidence.locator } : {}),
            },
          }
        : {}),
    });
  }
  return out;
}

/** A citation for each source the points rely on, keyed by source id, for exports and comparisons. */
export interface SourceCitation {
  id: string;
  title: string;
  author: string;
  date?: string;
  url?: string;
}
export function sourceCitations(points: NamePoint[]): Record<string, SourceCitation> {
  const k = knowledge();
  const out: Record<string, SourceCitation> = {};
  for (const p of points) {
    const id = p.provenance?.source;
    if (!id || out[id]) continue;
    const s = k.record(id) as Source | undefined;
    if (!s || s.type !== 'source') continue;
    out[id] = {
      id,
      title: s.title,
      author: s.author,
      ...(s.date ? { date: s.date } : {}),
      ...(s.url ? { url: s.url } : {}),
    };
  }
  return out;
}
