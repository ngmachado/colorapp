import { parseContent, parseCurriculum, parseExperiments } from '@sca/knowledge';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { describe, expect, test } from 'vitest';
import { readContentDir } from './knowledge';

const root = join(import.meta.dirname, '..', '..', '..', 'content');
const { records, problems } = parseContent(readContentDir(join(root, 'knowledge')));
const byId = new Map(records.map((r) => [r.id, r]));

describe('repository content (chunk 3 acceptance)', () => {
  test('knowledge, curriculum and experiment content all validate', () => {
    expect(problems).toEqual([]);
    const sourceIds = new Set(records.filter((r) => r.type === 'source').map((r) => r.id));
    const cur = parseCurriculum(readContentDir(join(root, 'curriculum')), sourceIds, parseYaml);
    const exp = parseExperiments(readContentDir(join(root, 'experiments')), parseYaml);
    expect(cur.problems).toEqual([]);
    expect(exp.problems).toEqual([]);
    expect(exp.templates).toHaveLength(10);
    expect(cur.topics.filter((t) => t.kind === 'structure').map((t) => t.id)).toContain(
      'structure-free-form',
    );
    expect(cur.topics.filter((t) => t.kind === 'exercise')).toHaveLength(4);
  });

  test('no representation carries a value without an approximation status and a method', () => {
    for (const r of records) {
      if (r.type !== 'representation') continue;
      expect(r.method.length, r.id).toBeGreaterThan(10);
      expect(r.approximation_status, r.id).toBeDefined();
      if (r.space !== 'spectral') expect(r.coords, r.id).toBeDefined();
    }
  });

  test('Wada records are bibliographic only: no combination or representation cites them', () => {
    const wada = records.filter((r) => r.type === 'source' && /wada/.test(r.id));
    expect(wada).toHaveLength(2);
    for (const w of wada) {
      expect(w.type === 'source' && w.rights_status).toBe('verified-restricted');
      const citing = records.filter((r) => r.type !== 'source' && r.evidence.source === w.id);
      expect(citing, `records citing ${w.id}`).toEqual([]);
    }
  });

  test('every Wuxing relationship traces to a cited passage or a flagged uncited table', () => {
    const rels = records.filter((r) => r.type === 'relationship' && r.id.startsWith('zh-wuxing'));
    expect(rels.length).toBe(15);
    for (const r of rels) {
      if (r.type !== 'relationship') continue;
      const src = byId.get(r.evidence.source);
      expect(src?.type, r.id).toBe('source');
      expect(r.evidence.locator, r.id).toBeTruthy();
      if (src?.id === 'iep-wuxing-littlejohn')
        expect(r.evidence.locator, r.id).toMatch(/^section \d: "/);
      else expect(r.review_state, r.id).toBe('discovered');
    }
    const cycles = rels.filter(
      (r) => r.type === 'relationship' && (r.edge === 'generates' || r.edge === 'controls'),
    );
    expect(cycles).toHaveLength(10);
  });

  test('kasane layerings keep documented order and the source wording for season', () => {
    const combos = records.filter((r) => r.type === 'combination');
    expect(combos.length).toBeGreaterThanOrEqual(2);
    for (const c of combos) {
      if (c.type !== 'combination') continue;
      expect(c.order_documented).toBe(true);
      expect(c.items.map((i) => i.layer_index)).toEqual([0, 1]);
      expect(c.season).toMatch(/[぀-ヿ一-鿿]/);
      expect(c.interpretation).toBe('historical-description');
    }
  });

  test('nothing above "discovered" cites a Wikipedia or Wiktionary page', () => {
    for (const r of records) {
      if (r.type === 'source') continue;
      if (/^(wikipedia|wiktionary)/.test(r.evidence.source))
        expect(r.review_state, r.id).toBe('discovered');
    }
  });
});
