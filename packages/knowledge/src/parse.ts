import { parse as parseYaml } from 'yaml';
import { Record, type KnowledgeRecord } from './schema';

export interface ContentText {
  /** Path shown in error messages. */
  path: string;
  text: string;
}

export interface ContentProblem {
  path: string;
  recordId?: string;
  field?: string;
  message: string;
}

export interface ParsedContent {
  records: KnowledgeRecord[];
  problems: ContentProblem[];
}

const REF_FIELDS: Record<string, string[]> = {
  concept: [],
  name: ['concept'],
  representation: ['concept'],
  'material-sample': ['concept'],
  'cultural-assertion': ['concept'],
  relationship: ['from', 'to'],
};

/**
 * Parses YAML content files, validates every record against the schema and checks references.
 * Never throws for content errors: every problem is returned with its file, record and field.
 */
export function parseContent(files: ContentText[]): ParsedContent {
  const records: KnowledgeRecord[] = [];
  const problems: ContentProblem[] = [];
  const origin = new Map<string, string>();

  for (const file of files) {
    let raw: unknown;
    try {
      raw = parseYaml(file.text);
    } catch (e) {
      problems.push({ path: file.path, message: `YAML: ${(e as Error).message}` });
      continue;
    }
    const list = Array.isArray(raw) ? raw : [raw];
    list.forEach((item, index) => {
      const result = Record.safeParse(item);
      const rec = item as { id?: unknown } | null;
      const recordId = rec && typeof rec.id === 'string' ? rec.id : undefined;
      if (!result.success) {
        for (const issue of result.error.issues) {
          const keys = issue.code === 'unrecognized_keys' ? issue.keys : [];
          const field = [...issue.path.map(String), ...keys].join('.');
          const problem: ContentProblem = { path: file.path, message: issue.message };
          if (recordId) problem.recordId = recordId;
          else if (Array.isArray(raw)) problem.recordId = `#${index}`;
          if (field) problem.field = field;
          problems.push(problem);
        }
        return;
      }
      const record = result.data;
      if (origin.has(record.id)) {
        problems.push({
          path: file.path,
          recordId: record.id,
          field: 'id',
          message: `duplicate id, first seen in ${origin.get(record.id)}`,
        });
        return;
      }
      origin.set(record.id, file.path);
      records.push(record);
    });
  }

  const byId = new Map(records.map((r) => [r.id, r]));
  const ref = (
    path: string,
    rec: KnowledgeRecord,
    field: string,
    id: string | undefined,
    expectType?: string,
  ) => {
    if (id === undefined) return;
    const target = byId.get(id);
    if (!target)
      problems.push({ path, recordId: rec.id, field, message: `unknown record "${id}"` });
    else if (expectType && target.type !== expectType)
      problems.push({
        path,
        recordId: rec.id,
        field,
        message: `"${id}" is a ${target.type}, expected ${expectType}`,
      });
  };

  for (const rec of records) {
    const path = origin.get(rec.id)!;
    if (rec.type !== 'source') {
      ref(path, rec, 'evidence.source', rec.evidence.source, 'source');
      for (const f of REF_FIELDS[rec.type] ?? [])
        ref(
          path,
          rec,
          f,
          (rec as unknown as Record<string, string | undefined>)[f],
          f === 'concept' ? 'concept' : undefined,
        );
    }
    if (rec.type === 'combination')
      rec.items.forEach((item, i) => ref(path, rec, `items.${i}.concept`, item.concept, 'concept'));
  }

  return { records, problems };
}

export function formatProblem(p: ContentProblem): string {
  return [p.path, p.recordId, p.field].filter(Boolean).join(' › ') + ': ' + p.message;
}
