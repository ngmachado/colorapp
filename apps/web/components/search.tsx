import type { KnowledgeRecord } from '@sca/knowledge';

export function recordHref(r: KnowledgeRecord): string {
  if (r.type === 'source') return `/dictionary/source/${r.id}`;
  if (r.type === 'combination') return `/dictionary/combination/${r.id}`;
  if ('concept' in r && r.concept) return `/dictionary/${r.concept}`;
  return `/dictionary/${r.id}`;
}

export function recordTitle(r: KnowledgeRecord): string {
  switch (r.type) {
    case 'source':
      return r.title;
    case 'concept':
    case 'combination':
      return r.label;
    case 'name':
      return r.script + (r.transliteration ? ` (${r.transliteration.value})` : '');
    default:
      return r.id;
  }
}
