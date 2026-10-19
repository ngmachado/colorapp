import { colour, type ColourValue } from '@sca/colour-engine';
import type { Concept, KnowledgeRecord, Representation } from '@sca/knowledge';
import { statusKind, type StatusKind } from '@/components/badges';

/** A representation as an engine value whose source points back at the record. */
export function representationValue(rep: Representation): ColourValue | null {
  if (rep.space === 'spectral' || !rep.coords) return null;
  return colour(rep.space, rep.coords, { kind: 'record', ref: rep.id, note: rep.method });
}

export function recordStatus(r: KnowledgeRecord): StatusKind {
  return statusKind(
    r.review_state,
    r.rights_status,
    r.type === 'representation' ? r.approximation_status : undefined,
  );
}

/** Rights gate: restricted records show bibliographic fields only; unreviewed ones live in the research queue. */
export function isRestricted(r: KnowledgeRecord): boolean {
  return r.rights_status === 'verified-restricted' && r.type !== 'source';
}

export function inQueue(r: KnowledgeRecord): boolean {
  return r.rights_status === 'unreviewed' || r.review_state === 'discovered';
}

export const notDocumented = 'not documented';

/** A system and its parts (such as the Five Phases) have entries but are not colours. */
const NOT_COLOUR = new Set(['system', 'side', 'phase']);
export function isColour(c: Concept): boolean {
  return !NOT_COLOUR.has(String(c.tags?.kind ?? ''));
}
/** What a non-colour concept is, in one word. */
export const KIND_WORDS: Record<string, string> = {
  system: 'system',
  side: 'side of the circle',
  phase: 'phase',
};

export function evidenceOf(r: KnowledgeRecord): { source: string; locator?: string } | null {
  return r.type === 'source' ? null : r.evidence;
}
