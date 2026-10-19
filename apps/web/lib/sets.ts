import type { Concept, Relationship } from '@sca/knowledge';
import { knowledge } from './knowledge';
import { namePoints } from './palette-names';
import { WUXING_ORDER, type ColourSet } from './systems';

/** Source order for the systems the app draws; members of other groups keep id order. */
const KNOWN_ORDER = WUXING_ORDER;
const rank = (id: string) => {
  const i = KNOWN_ORDER.indexOf(id);
  return i < 0 ? KNOWN_ORDER.length : i;
};

/** The most columns the Laboratory holds. */
export const MAX_COLUMNS = 5;
const PAIR_WORDS: Record<string, string> = {
  'complement-of': 'complements',
  'characteristic-with': 'characteristic pair',
};

/**
 * Sets the Laboratory can load whole, read from the records: every group concept whose members fit in
 * the columns, and every documented complementary or characteristic pair. Nothing here is a wheel rule.
 */
export function documentedSets(): ColourSet[] {
  const k = knowledge();
  const shown = new Set(namePoints().map((p) => p.conceptId));
  const label = (id: string) => (k.record(id) as Concept | undefined)?.label ?? id;
  const rels = k.byType('relationship') as Relationship[];
  const out: ColourSet[] = [];
  const groups = new Map<string, string[]>();
  for (const r of rels)
    if (r.edge === 'member-of') groups.set(r.to, [...(groups.get(r.to) ?? []), r.from]);
  for (const [group, members] of groups) {
    if (members.length > MAX_COLUMNS || members.filter((m) => shown.has(m)).length < 2) continue;
    out.push({
      id: group,
      label: label(group),
      conceptIds: [...members].sort((a, b) => rank(a) - rank(b)),
    });
  }
  for (const r of rels) {
    const word = PAIR_WORDS[r.edge];
    if (!word || !shown.has(r.from) || !shown.has(r.to)) continue;
    out.push({
      id: r.id,
      label: `${label(r.from)} · ${label(r.to)}, ${word}`,
      conceptIds: [r.from, r.to],
    });
  }
  return out;
}
