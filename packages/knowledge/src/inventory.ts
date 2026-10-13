import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { RECORD_TYPES, type KnowledgeRecord, type RecordType } from './schema';

function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    return (
      '{' +
      Object.keys(o)
        .sort()
        .map((k) => JSON.stringify(k) + ':' + canonical(o[k]))
        .join(',') +
      '}'
    );
  }
  return JSON.stringify(value);
}

/** Deterministic hash of the records' content. The same records always give the same version. */
export function contentVersion(records: KnowledgeRecord[]): string {
  const sorted = [...records].sort((a, b) => a.id.localeCompare(b.id));
  return bytesToHex(sha256(new TextEncoder().encode(canonical(sorted)))).slice(0, 16);
}

export interface Inventory {
  content_version: string;
  total: number;
  by_type: Record<RecordType, number>;
  by_review_state: Record<string, number>;
  by_rights_status: Record<string, number>;
  /** Every record id with its statuses, so the inventory is an exact list, not a summary. */
  records: { id: string; type: RecordType; review_state: string; rights_status: string }[];
}

export function inventory(records: KnowledgeRecord[]): Inventory {
  const count = (key: (r: KnowledgeRecord) => string) =>
    records.reduce<Record<string, number>>(
      (acc, r) => ((acc[key(r)] = (acc[key(r)] ?? 0) + 1), acc),
      {},
    );
  const by_type = Object.fromEntries(RECORD_TYPES.map((t) => [t, 0])) as Record<RecordType, number>;
  for (const r of records) by_type[r.type]++;
  return {
    content_version: contentVersion(records),
    total: records.length,
    by_type,
    by_review_state: count((r) => r.review_state),
    by_rights_status: count((r) => r.rights_status),
    records: [...records]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((r) => ({
        id: r.id,
        type: r.type,
        review_state: r.review_state,
        rights_status: r.rights_status,
      })),
  };
}

export function inventoryMarkdown(inv: Inventory): string {
  const table = (title: string, rows: Record<string, number>) =>
    `### ${title}\n\n| ${title} | Records |\n| --- | --- |\n` +
    Object.entries(rows)
      .map(([k, v]) => `| ${k} | ${v} |`)
      .join('\n');
  return [
    `# Knowledge release ${inv.content_version}`,
    `Total records: ${inv.total}`,
    table('Type', inv.by_type),
    table('Review state', inv.by_review_state),
    table('Rights status', inv.by_rights_status),
    '### Records\n\n| id | type | review | rights |\n| --- | --- | --- | --- |\n' +
      inv.records
        .map((r) => `| ${r.id} | ${r.type} | ${r.review_state} | ${r.rights_status} |`)
        .join('\n'),
  ].join('\n\n');
}
