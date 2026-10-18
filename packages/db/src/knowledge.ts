import Database from 'better-sqlite3';
import { colour, convert } from '@sca/colour-engine';
import {
  inventory,
  parseContent,
  searchableText,
  type ContentText,
  type Inventory,
  type KnowledgeRecord,
} from '@sca/knowledge';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export const KNOWLEDGE_SCHEMA_VERSION = '1';

/** Reads every .yaml/.yml file under a directory, recursively, sorted for determinism. */
export function readContentDir(dir: string): ContentText[] {
  const out: ContentText[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.ya?ml$/.test(name))
        out.push({ path: relative(dir, p), text: readFileSync(p, 'utf8') });
    }
  };
  walk(dir);
  return out;
}

const DDL = `
CREATE TABLE release (
  content_version TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  built_at TEXT NOT NULL,
  inventory TEXT NOT NULL
);
CREATE TABLE record (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  review_state TEXT NOT NULL,
  rights_status TEXT NOT NULL,
  source_id TEXT,
  concept_id TEXT,
  json TEXT NOT NULL
);
CREATE INDEX record_type ON record(type);
CREATE INDEX record_concept ON record(concept_id);
CREATE TABLE representation_oklab (
  record_id TEXT PRIMARY KEY REFERENCES record(id),
  concept_id TEXT NOT NULL,
  l REAL NOT NULL, a REAL NOT NULL, b REAL NOT NULL
);
CREATE TABLE relationship (
  record_id TEXT PRIMARY KEY REFERENCES record(id),
  from_id TEXT NOT NULL, to_id TEXT NOT NULL, edge TEXT NOT NULL
);
CREATE INDEX relationship_from ON relationship(from_id);
CREATE INDEX relationship_to ON relationship(to_id);
CREATE VIRTUAL TABLE search USING fts5(record_id UNINDEXED, field UNINDEXED, text, tokenize='trigram');
`;

/** Writes a read-only knowledge release. The content version depends on the records only. */
export function buildKnowledgeDb(records: KnowledgeRecord[], outPath: string): Inventory {
  const inv = inventory(records);
  const db = new Database(outPath);
  db.exec(DDL);
  const insRecord = db.prepare(
    'INSERT INTO record (id, type, review_state, rights_status, source_id, concept_id, json) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  const insOklab = db.prepare(
    'INSERT INTO representation_oklab (record_id, concept_id, l, a, b) VALUES (?, ?, ?, ?, ?)',
  );
  const insRel = db.prepare(
    'INSERT INTO relationship (record_id, from_id, to_id, edge) VALUES (?, ?, ?, ?)',
  );
  const insSearch = db.prepare('INSERT INTO search (record_id, field, text) VALUES (?, ?, ?)');
  db.transaction(() => {
    for (const r of records) {
      const sourceId = r.type === 'source' ? null : r.evidence.source;
      const conceptId = 'concept' in r && r.concept ? r.concept : null;
      insRecord.run(
        r.id,
        r.type,
        r.review_state,
        r.rights_status,
        sourceId,
        conceptId,
        JSON.stringify(r),
      );
      if (r.type === 'representation' && r.space !== 'spectral' && r.coords) {
        const [l, a, b] = convert(colour(r.space, r.coords), 'oklab').coords;
        insOklab.run(r.id, r.concept, l, a, b);
      }
      if (r.type === 'relationship') insRel.run(r.id, r.from, r.to, r.edge);
      for (const { field, text } of searchableText(r)) insSearch.run(r.id, field, text);
    }
    db.prepare('INSERT INTO release VALUES (?, ?, ?, ?)').run(
      inv.content_version,
      KNOWLEDGE_SCHEMA_VERSION,
      new Date().toISOString(),
      JSON.stringify(inv),
    );
  })();
  db.close();
  return inv;
}

export interface SearchHit {
  id: string;
  type: string;
  /** Which field matched, so the UI can say why. */
  field: string;
  text: string;
}

export interface NearestHit {
  id: string;
  concept_id: string;
  /** Euclidean OKLab distance; a perceptual match, never a cultural one. */
  distance: number;
}

/** Typed read access to a knowledge release. */
export function openKnowledge(path: string) {
  const db = new Database(path, { readonly: true, fileMustExist: true });
  const release = db
    .prepare('SELECT content_version, schema_version, built_at FROM release')
    .get() as {
    content_version: string;
    schema_version: string;
    built_at: string;
  };
  const qRecord = db.prepare('SELECT json FROM record WHERE id = ?');
  const qSearch = db.prepare(
    'SELECT s.record_id AS id, r.type, s.field, s.text FROM search s JOIN record r ON r.id = s.record_id WHERE search MATCH ? ORDER BY rank LIMIT ?',
  );
  const qNearest = db.prepare(
    'SELECT record_id AS id, concept_id, sqrt((l-?)*(l-?)+(a-?)*(a-?)+(b-?)*(b-?)) AS distance FROM representation_oklab ORDER BY distance LIMIT ?',
  );
  const qEdges = db.prepare(
    'SELECT record_id, from_id, to_id, edge FROM relationship WHERE from_id = ? OR to_id = ?',
  );
  const qInventory = db.prepare('SELECT inventory FROM release');
  const qByType = db.prepare('SELECT json FROM record WHERE type = ? ORDER BY id');
  const qByConcept = db.prepare('SELECT json FROM record WHERE concept_id = ? ORDER BY type, id');
  const qBySource = db.prepare('SELECT json FROM record WHERE source_id = ? ORDER BY type, id');
  const qOklab = db.prepare(
    'SELECT record_id AS id, concept_id, l, a, b FROM representation_oklab',
  );
  const parse = (rows: unknown[]) =>
    (rows as { json: string }[]).map((r) => JSON.parse(r.json) as KnowledgeRecord);
  return {
    release,
    record(id: string): KnowledgeRecord | undefined {
      const row = qRecord.get(id) as { json: string } | undefined;
      return row ? (JSON.parse(row.json) as KnowledgeRecord) : undefined;
    },
    /** Trigram text search over names, transliterations, aliases, labels and titles. Needs 3+ characters. */
    search(text: string, limit = 20): SearchHit[] {
      const q = '"' + text.replace(/"/g, '""') + '"';
      return qSearch.all(q, limit) as SearchHit[];
    },
    /** Perceptual neighbours by OKLab distance. Labelled as such by the caller. */
    nearest(oklab: [number, number, number], limit = 20): NearestHit[] {
      const [l, a, b] = oklab;
      return qNearest.all(l, l, a, a, b, b, limit) as NearestHit[];
    },
    edges(id: string) {
      return qEdges.all(id, id) as {
        record_id: string;
        from_id: string;
        to_id: string;
        edge: string;
      }[];
    },
    /** All records of one type, in id order. The release is small enough to filter in memory. */
    byType<T extends KnowledgeRecord['type']>(type: T): Extract<KnowledgeRecord, { type: T }>[] {
      return parse(qByType.all(type)) as Extract<KnowledgeRecord, { type: T }>[];
    },
    /** Names, representations, samples and assertions attached to a concept. */
    forConcept(conceptId: string): KnowledgeRecord[] {
      return parse(qByConcept.all(conceptId));
    },
    /** Records that cite a source. Empty for a restricted source whose content is not reproduced. */
    citing(sourceId: string): KnowledgeRecord[] {
      return parse(qBySource.all(sourceId));
    },
    /** Combinations that include a concept. */
    combinationsFor(conceptId: string) {
      return this.byType('combination').filter((c) => c.items.some((i) => i.concept === conceptId));
    },
    /** Every representation's OKLab point, for the colour-space map. */
    oklabPoints() {
      return qOklab.all() as { id: string; concept_id: string; l: number; a: number; b: number }[];
    },
    inventory(): Inventory {
      return JSON.parse((qInventory.get() as { inventory: string }).inventory) as Inventory;
    },
    close() {
      db.close();
    },
  };
}

export type Knowledge = ReturnType<typeof openKnowledge>;

/** Parses a content directory and returns records and problems. */
export function loadContent(dir: string) {
  return parseContent(readContentDir(dir));
}
