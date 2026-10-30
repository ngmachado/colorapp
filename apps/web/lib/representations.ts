import type { Representation } from '@sca/knowledge';

/** Rights gate, duplicated from records.ts so this module stays free of app imports (unit tests load it directly). */
const restricted = (r: Representation) => r.rights_status === 'verified-restricted';

/**
 * When a concept has several displayable values, the one shown first comes from a source whose values are tied to a
 * published notation (the JIS Z 8102 page lists each name's Munsell notation); page values without a stated method
 * follow. Within a source, record ids order.
 */
const PREFERRED_SOURCES = ['wikipedia-ja-jis-kanyo-shikimei'];
const sourceRank = (r: Representation) => {
  const i = PREFERRED_SOURCES.indexOf(r.evidence.source);
  return i < 0 ? PREFERRED_SOURCES.length : i;
};
export function orderRepresentations<T extends Representation>(reps: T[]): T[] {
  return [...reps].sort((a, b) => sourceRank(a) - sourceRank(b) || a.id.localeCompare(b.id));
}
/** The value an entry, a card or a Laboratory column shows for a concept, if it has one. */
export function primaryRepresentation(reps: Representation[]): Representation | undefined {
  return orderRepresentations(reps).find((r) => !restricted(r) && r.coords);
}
