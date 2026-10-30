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
    expect(
      cur.topics.filter((t) => t.kind === 'exercise').map((t) => [t.id, t.availability]),
    ).toEqual([['exercise-one-colour-two-surroundings', 'available']]);
  });

  test('no Goethe record is in the release (removed by decision, 2026-10-19)', () => {
    expect(records.some((r) => /goethe/i.test(r.id))).toBe(false);
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

  test('Chevreul pairs retain historical provenance while display values remain editorial', () => {
    const system = byId.get('chevreul-circle');
    expect(system?.type === 'concept' && system.tags?.kind).toBe('system');
    const pairs = records.filter(
      (r) =>
        r.type === 'relationship' && r.id.startsWith('chevreul-') && r.edge === 'complement-of',
    );
    expect(pairs).toHaveLength(3);
    for (const pair of pairs) {
      if (pair.type !== 'relationship') continue;
      expect(pair.evidence.source).toBe('chevreul-1890-principles-martel');
      expect(pair.evidence.locator).toContain('170');
      for (const id of [pair.from, pair.to]) {
        const rep = byId.get(`${id}-srgb-editorial`);
        expect(rep?.type).toBe('representation');
        if (rep?.type !== 'representation') continue;
        expect(rep.evidence.source).toBe('super-colour-chevreul-display');
        expect(rep.approximation_status).toBe('modern-approximation');
        expect(rep.rights_status).toBe('user-adaptation');
      }
    }
    expect(byId.get('chevreul-law-of-simultaneous-contrast')).toMatchObject({
      concept: 'chevreul-circle',
      review_state: 'extracted',
    });
  });

  test('JIS Z 8102 names: 269 rows, each with the Munsell notation except gold and silver, all discovered', () => {
    const page = 'wikipedia-ja-jis-kanyo-shikimei';
    const concepts = records.filter(
      (r) => r.type === 'concept' && r.tags?.standard === 'jis-z8102',
    );
    const attached = records.filter(
      (r) => r.type === 'representation' && r.evidence.source === page,
    );
    // 259 new concepts + 10 values attached to concepts that already existed = 269 rows of the appendix.
    expect(concepts.length).toBe(259);
    expect(attached.length).toBe(267);
    for (const c of concepts) {
      expect(c.review_state, c.id).toBe('discovered');
      if (c.type !== 'concept') continue;
      if (c.id === 'ja-kin-iro' || c.id === 'ja-gin-iro') expect(c.tags?.munsell).toBeUndefined();
      else
        expect(c.tags?.munsell, c.id).toMatch(
          /^(\d+(\.\d+)?[A-Z]{1,2} \d+(\.\d+)?\/\d+(\.\d+)?|N\d+(\.\d+)?)$/,
        );
    }
    for (const r of attached) {
      if (r.type !== 'representation') continue;
      expect(r.approximation_status).toBe('modern-approximation');
      expect(r.method).toContain('for reference only');
    }
  });

  test('Chinese traditional colours: 24 page entries with a value, classical quotations kept as discovered assertions', () => {
    const page = 'wikipedia-zh-chinese-traditional-colours';
    const concepts = records.filter(
      (r) =>
        r.type === 'concept' && r.tags?.kind === 'colour-term' && r.tags?.tradition === 'chinese',
    );
    expect(concepts.length).toBe(24);
    for (const c of concepts) {
      expect(c.review_state, c.id).toBe('discovered');
      if (c.type === 'concept') expect(c.evidence.source).toBe(page);
      expect(
        records.some((r) => r.type === 'representation' && r.concept === c.id),
        c.id,
      ).toBe(true);
    }
    const quoted = records.filter(
      (r) => r.type === 'cultural-assertion' && r.evidence.source === page,
    );
    expect(quoted.length).toBe(9);
    for (const a of quoted) {
      expect(a.review_state, a.id).toBe('discovered');
      if (a.type === 'cultural-assertion') expect(a.passage, a.id).toBeTruthy();
    }
  });

  test('CSS named colours: 148 keywords as 141 concepts, every value published, not approximated', () => {
    const concepts = records.filter(
      (r) => r.type === 'concept' && r.tags?.standard === 'css-color-4',
    );
    const names = records.filter(
      (r) => r.type === 'name' && r.evidence.source === 'w3c-css-color-4',
    );
    const values = records.filter(
      (r) => r.type === 'representation' && r.evidence.source === 'w3c-css-color-4',
    );
    expect(concepts.length).toBe(141);
    expect(names.length).toBe(148);
    expect(values.length).toBe(141);
    for (const v of values) {
      if (v.type !== 'representation') continue;
      expect(v.approximation_status, v.id).toBe('published-value');
      expect(v.rights_status, v.id).toBe('verified-reusable');
    }
    expect(byId.get('css-gray-grey')).toMatchObject({ concept: 'css-gray', script: 'grey' });
    expect(byId.get('css-rebeccapurple-srgb')).toMatchObject({ coords: [0.4, 0.2, 0.6] });
  });

  test('nothing above "discovered" cites a Wikipedia or Wiktionary page', () => {
    for (const r of records) {
      if (r.type === 'source') continue;
      if (/^(wikipedia|wiktionary)/.test(r.evidence.source))
        expect(r.review_state, r.id).toBe('discovered');
    }
  });

  test('Western passages quote only public-domain sources, with a paragraph locator and the passage text', () => {
    const western = records.filter(
      (r) => r.type === 'cultural-assertion' && /^chevreul-/.test(r.id),
    );
    expect(western).toHaveLength(2);
    for (const a of western) {
      if (a.type !== 'cultural-assertion') continue;
      const src = byId.get(a.evidence.source);
      expect(src?.type, a.id).toBe('source');
      expect(src?.rights_status, a.id).toBe('verified-reusable');
      expect(a.evidence.locator, a.id).toBeTruthy();
      expect(a.passage?.length ?? 0, a.id).toBeGreaterThan(40);
    }
    const restricted = records.filter((r) => r.type === 'source' && /^(itten|albers)-/.test(r.id));
    expect(restricted).toHaveLength(2);
    for (const s of restricted) {
      const citing = records.filter((r) => r.type !== 'source' && r.evidence.source === s.id);
      expect(citing, `records citing ${s.id}`).toEqual([]);
    }
  });
});
