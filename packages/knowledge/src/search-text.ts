import type { KnowledgeRecord } from './schema';

/** Text fields worth indexing for search, with the field that matched so results can explain themselves. */
export function searchableText(rec: KnowledgeRecord): { field: string; text: string }[] {
  switch (rec.type) {
    case 'source':
      return [
        { field: 'title', text: rec.title },
        { field: 'author', text: rec.author },
      ];
    case 'concept':
      return [{ field: 'label', text: rec.label }];
    case 'name':
      return [
        { field: 'script', text: rec.script },
        ...(rec.transliteration
          ? [{ field: 'transliteration', text: rec.transliteration.value }]
          : []),
        ...(rec.aliases ?? []).map((a) => ({ field: 'alias', text: a })),
      ];
    case 'combination':
      return [{ field: 'label', text: rec.label }];
    default:
      return [];
  }
}
