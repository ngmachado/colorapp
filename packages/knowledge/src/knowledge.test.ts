import { describe, expect, test } from 'vitest';
import { contentVersion, inventory, inventoryMarkdown } from './inventory';
import { formatProblem, parseContent } from './parse';
import { jsonSchema } from './schema';

const source = `
- type: source
  id: test-source
  review_state: bibliographic
  rights_status: verified-restricted
  author: A. Author
  title: A Test Dictionary
  access_date: "2026-10-13"
`;

const concept = `
- type: concept
  id: kachi-iro
  review_state: discovered
  rights_status: unreviewed
  evidence: { source: test-source, locator: "p. 12" }
  label: Kachi-iro
- type: name
  id: kachi-iro-ja
  review_state: discovered
  rights_status: unreviewed
  evidence: { source: test-source }
  concept: kachi-iro
  script: 勝色
  language: ja
  transliteration: { system: Hepburn, value: kachi-iro }
`;

describe('parseContent', () => {
  test('valid files give records and no problems', () => {
    const r = parseContent([
      { path: 'a.yaml', text: source },
      { path: 'b.yaml', text: concept },
    ]);
    expect(r.problems).toEqual([]);
    expect(r.records.map((x) => x.id)).toEqual(['test-source', 'kachi-iro', 'kachi-iro-ja']);
  });

  test('a record without a source fails, naming file, record and field', () => {
    const bad = `
- type: concept
  id: no-source
  review_state: discovered
  rights_status: unreviewed
  label: Nothing
`;
    const r = parseContent([{ path: 'bad.yaml', text: bad }]);
    expect(r.records).toEqual([]);
    expect(r.problems).toHaveLength(1);
    expect(r.problems[0]).toMatchObject({
      path: 'bad.yaml',
      recordId: 'no-source',
      field: 'evidence',
    });
    expect(formatProblem(r.problems[0]!)).toMatch(/^bad.yaml › no-source › evidence: /);
  });

  test('an unknown field fails', () => {
    const bad = source.replace('title:', 'hex: "#fff"\n  title:');
    const r = parseContent([{ path: 'x.yaml', text: bad }]);
    expect(r.problems[0]?.field).toBe('hex');
    expect(r.problems[0]?.message).toMatch(/unrecognized/i);
  });

  test('references must exist and have the right type', () => {
    const r = parseContent([
      { path: 'a.yaml', text: source },
      {
        path: 'b.yaml',
        text: concept
          .replace('source: test-source, locator: "p. 12"', 'source: missing')
          .replace('concept: kachi-iro', 'concept: test-source'),
      },
    ]);
    const msgs = r.problems.map(formatProblem);
    expect(msgs).toContain('b.yaml › kachi-iro › evidence.source: unknown record "missing"');
    expect(msgs).toContain(
      'b.yaml › kachi-iro-ja › concept: "test-source" is a source, expected concept',
    );
  });

  test('duplicate ids are reported', () => {
    const r = parseContent([
      { path: 'a.yaml', text: source },
      { path: 'b.yaml', text: source },
    ]);
    expect(r.problems[0]).toMatchObject({ path: 'b.yaml', recordId: 'test-source', field: 'id' });
  });

  test('a representation needs coords or a spectrum, and never an RGB value without a method', () => {
    const rep = `
- type: representation
  id: rep
  review_state: discovered
  rights_status: approximate
  evidence: { source: test-source }
  concept: kachi-iro
  space: srgb
  method: guess
  approximation_status: modern-approximation
`;
    const r = parseContent([
      { path: 'a.yaml', text: source },
      { path: 'b.yaml', text: concept },
      { path: 'c.yaml', text: rep },
    ]);
    expect(r.problems.map((p) => p.field)).toEqual(['coords']);
    expect(
      parseContent([{ path: 'c.yaml', text: rep.replace('  method: guess\n', '') }]).problems.some(
        (p) => p.field === 'method',
      ),
    ).toBe(true);
  });

  test('layer_index requires documented order', () => {
    const combo = `
- type: combination
  id: combo
  review_state: discovered
  rights_status: unreviewed
  evidence: { source: test-source }
  label: Two layers
  order_documented: false
  items:
    - { concept: kachi-iro, layer_index: 0 }
    - { concept: kachi-iro, layer_index: 1 }
`;
    const r = parseContent([
      { path: 'a.yaml', text: source },
      { path: 'b.yaml', text: concept },
      { path: 'c.yaml', text: combo },
    ]);
    expect(r.problems.map(formatProblem)).toEqual([
      'c.yaml › combo › items: layer_index requires order_documented: true',
    ]);
  });
});

describe('inventory and content version', () => {
  const files = [
    { path: 'a.yaml', text: source },
    { path: 'b.yaml', text: concept },
  ];

  test('same content gives the same version; any change gives a different one', () => {
    const a = contentVersion(parseContent(files).records);
    const b = contentVersion(parseContent([...files].reverse()).records);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    const c = contentVersion(
      parseContent([files[0]!, { path: 'b.yaml', text: concept.replace('p. 12', 'p. 13') }])
        .records,
    );
    expect(c).not.toBe(a);
  });

  test('inventory lists every record and totals match', () => {
    const inv = inventory(parseContent(files).records);
    expect(inv.total).toBe(3);
    expect(inv.records).toHaveLength(3);
    expect(inv.by_type).toMatchObject({ source: 1, concept: 1, name: 1, representation: 0 });
    expect(Object.values(inv.by_review_state).reduce((a, b) => a + b, 0)).toBe(inv.total);
    expect(Object.values(inv.by_rights_status).reduce((a, b) => a + b, 0)).toBe(inv.total);
    const md = inventoryMarkdown(inv);
    expect(md).toContain('| kachi-iro-ja | name | discovered | unreviewed |');
  });
});

test('JSON schema is emitted from the same definitions', () => {
  const s = JSON.stringify(jsonSchema());
  expect(s).toContain('"review_state"');
  expect(s).toContain('specialist-reviewed');
});
