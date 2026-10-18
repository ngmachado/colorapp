import { colour, convert, toHex } from '@sca/colour-engine';
import { knowledge } from './knowledge';
import type { NamePoint } from './nearest';

export { nearestPoint, type NamePoint } from './nearest';
import { inQueue, isRestricted, recordStatus } from './records';

export function namePoints(): NamePoint[] {
  const k = knowledge();
  const out: NamePoint[] = [];
  for (const p of k.oklabPoints()) {
    const rep = k.record(p.id);
    const concept = k.record(p.concept_id);
    if (!rep || !concept || concept.type !== 'concept' || isRestricted(rep)) continue;
    out.push({
      id: p.id,
      conceptId: p.concept_id,
      label: concept.label,
      tradition: concept.tags?.tradition ?? null,
      status: recordStatus(rep),
      queue: inQueue(rep) || inQueue(concept),
      oklab: [p.l, p.a, p.b],
      hex: toHex(convert(colour('oklab', [p.l, p.a, p.b]), 'srgb')),
    });
  }
  return out;
}
