import type { Combination, Concept, Relationship } from '@sca/knowledge';
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
 * the columns, every documented complementary or characteristic pair, and every layering whose layers
 * fit. Nothing here is a wheel rule.
 */
export function documentedSets(): ColourSet[] {
  const k = knowledge();
  const shown = new Set(namePoints().map((p) => p.conceptId));
  const label = (id: string) => (k.record(id) as Concept | undefined)?.label ?? id;
  const rels = k.byType('relationship') as Relationship[];
  const out: ColourSet[] = [];
  const groups = new Map<string, { members: string[]; source: string }>();
  for (const r of rels)
    if (r.edge === 'member-of') {
      const g = groups.get(r.to) ?? { members: [], source: r.evidence.source };
      g.members.push(r.from);
      groups.set(r.to, g);
    }
  for (const [group, g] of groups) {
    if (g.members.length > MAX_COLUMNS || g.members.filter((m) => shown.has(m)).length < 2)
      continue;
    out.push({
      id: group,
      label: label(group),
      conceptIds: [...g.members].sort((a, b) => rank(a) - rank(b)),
      kind: 'group',
      source: g.source,
    });
  }
  for (const r of rels) {
    const word = PAIR_WORDS[r.edge];
    if (!word || !shown.has(r.from) || !shown.has(r.to)) continue;
    out.push({
      id: r.id,
      label: `${label(r.from)} · ${label(r.to)}, ${word}`,
      conceptIds: [r.from, r.to],
      kind: 'pair',
      source: r.evidence.source,
    });
  }
  for (const c of k.byType('combination') as Combination[]) {
    const items = c.order_documented
      ? [...c.items].sort((a, b) => (a.layer_index ?? 0) - (b.layer_index ?? 0))
      : c.items;
    const ids = items.map((i) => i.concept);
    if (ids.length > MAX_COLUMNS || ids.filter((m) => shown.has(m)).length < 2) continue;
    out.push({
      id: c.id,
      label: `${c.label}, layering`,
      conceptIds: ids,
      kind: 'layering',
      source: c.evidence.source,
    });
  }
  return out;
}
