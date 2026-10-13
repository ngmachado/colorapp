import { parseContent } from '@sca/knowledge';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, expect, test } from 'vitest';
import { buildKnowledgeDb, openKnowledge, readContentDir } from './knowledge';

const dir = mkdtempSync(join(tmpdir(), 'sca-knowledge-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const contentDir = join(import.meta.dirname, '..', '..', '..', 'content', 'knowledge');

test('the repository content builds to a release and search works', () => {
  const extra = `
- type: name
  id: css-rebeccapurple-ja-test
  review_state: discovered
  rights_status: unreviewed
  evidence: { source: w3c-css-color-4 }
  concept: css-rebeccapurple
  script: レベッカパープル
  language: ja
  transliteration: { system: Hepburn, value: rebekka pāpuru }
- type: relationship
  id: rel-test
  review_state: discovered
  rights_status: unreviewed
  evidence: { source: w3c-css-color-4 }
  from: css-rebeccapurple-ja-test
  to: css-rebeccapurple-en
  edge: translation-of
`;
  const { records, problems } = parseContent([
    ...readContentDir(contentDir),
    { path: 'extra.yaml', text: extra },
  ]);
  expect(problems).toEqual([]);

  const out = join(dir, 'k.sqlite');
  const inv = buildKnowledgeDb(records, out);
  const k = openKnowledge(out);
  expect(k.release.content_version).toBe(inv.content_version);
  expect(k.inventory().total).toBe(records.length);

  // Transliteration fragment, Latin.
  const hits = k.search('ekka');
  expect(hits.map((h) => h.id)).toContain('css-rebeccapurple-ja-test');
  expect(hits.find((h) => h.id === 'css-rebeccapurple-ja-test')?.field).toBe('transliteration');
  // Script fragment, katakana.
  expect(k.search('ベッカ').map((h) => h.id)).toContain('css-rebeccapurple-ja-test');
  // Alias and a hyphenated query are safe.
  expect(k.search('rebecca pur').map((h) => h.id)).toContain('css-rebeccapurple-en');
  expect(k.search('a-b-"c')).toEqual([]);

  // Perceptual neighbours come from OKLab columns.
  const near = k.nearest([0.44, 0.09, -0.14], 5);
  expect(near[0]?.id).toBe('css-rebeccapurple-srgb');
  expect(near[0]?.distance).toBeLessThan(0.05);

  expect(k.edges('css-rebeccapurple-en')).toEqual([
    {
      record_id: 'rel-test',
      from_id: 'css-rebeccapurple-ja-test',
      to_id: 'css-rebeccapurple-en',
      edge: 'translation-of',
    },
  ]);
  expect(k.record('css-rebeccapurple')?.type).toBe('concept');
  expect(k.record('nope')).toBeUndefined();
  k.close();
});

test('rebuilding the same content gives the same content version', () => {
  const { records } = parseContent(readContentDir(contentDir));
  const a = buildKnowledgeDb(records, join(dir, 'a.sqlite'));
  const b = buildKnowledgeDb(records, join(dir, 'b.sqlite'));
  expect(a.content_version).toBe(b.content_version);
});
