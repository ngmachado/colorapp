import { describe, expect, test } from 'vitest';
import {
  checkPalette,
  contrastPair,
  findRecords,
  inspectColour,
  lessonText,
  listLessons,
  listSystems,
  lookupRecord,
  parseColour,
  Refusal,
  requestPalette,
} from './tools';

describe('colours an agent may send', () => {
  test('hex in either form, and oklch() mapped into sRGB when it must be', () => {
    expect(parseColour('639').hex).toBe('#663399');
    expect(parseColour('#663399').mapped).toBe(false);
    const inside = parseColour('oklch(0.5 0.1 300)');
    expect(inside.mapped).toBe(false);
    expect(inside.requested).toEqual({ space: 'oklch', coords: [0.5, 0.1, 300] });
    const outside = parseColour('oklch(0.9 0.4 150)');
    expect(outside.mapped).toBe(true);
    expect(outside.hex).toMatch(/^#[0-9a-f]{6}$/);
    expect(() => parseColour('warm red')).toThrow(Refusal);
  });
});

describe('inspect_colour', () => {
  test('values carry their conditions; nearby records carry a distance and a citation, never a name', () => {
    const r = inspectColour('#960018');
    expect(r.hex).toBe('#960018');
    expect(r.values.map((v) => v.label)).toEqual(['HEX', 'RGB', 'HSL', 'OKLCh', 'Lab', 'XYZ']);
    expect(r.values.find((v) => v.label === 'Lab')!.conditions).toContain('D50');
    expect(r.coordinates.srgb).toEqual([150, 0, 24]);
    expect(r.nearby).toHaveLength(5);
    const first = r.nearby[0]!;
    expect(first.distance.metric).toContain('OKLab');
    expect(first.distance.value).toBeLessThanOrEqual(r.nearby[4]!.distance.value);
    expect(first.citation?.text).toBeTruthy();
    expect(first.status.label).toBeTruthy();
    expect(r.nearbyNote).toContain('not an identification');
    expect(r.links.laboratory).toContain('/lab?hex=960018');
    expect(typeof r.munsell.available).toBe('boolean');
  });
  test('a neutral has no hue', () => {
    const r = inspectColour('#808080');
    expect(r.neutral).toBe(true);
    expect(r.coordinates.oklch.h).toBeNull();
  });
});

describe('contrast_pair', () => {
  test('black on white: 21:1, every threshold named, differences with conditions', () => {
    const r = contrastPair('#000', '#fff');
    expect(r.contrast.ratio).toBe(21);
    expect(r.contrast.grade).toBe('AAA');
    expect(r.contrast.thresholds.every((t) => t.passes && t.criterion)).toBe(true);
    expect(r.differences.map((d) => d.id)).toEqual(['ciede2000', 'oklab']);
    expect(r.differences[0]!.conditions).toContain('kL');
    expect(r.oklchDelta.h).toBeNull();
  });
});

describe('check_palette', () => {
  test('measures the intended pairs, every pair, distinctness and the closest pair', () => {
    const r = checkPalette({
      colours: ['#1a1a1a', '#ffffff', 'oklch(0.6 0.15 30)'],
      names: ['text', 'paper', 'accent'],
      pairs: [{ text: 0, background: 1 }],
    });
    expect(r.colours.map((c) => c.name)).toEqual(['text', 'paper', 'accent']);
    expect(r.contrast.pairs[0]).toMatchObject({ text: 'text', background: 'paper', grade: 'AAA' });
    expect(r.contrast.every).toHaveLength(6);
    expect(r.distinctness.views.map((v) => v.view)).toEqual([
      'as drawn',
      'protan',
      'deutan',
      'tritan',
    ]);
    expect(r.separation.closestPair).toHaveLength(2);
    expect(r.lightness.max).toBeCloseTo(1, 2);
    expect(r.nearby).toHaveLength(3);
    expect(r.relations.method).toContain('not that pair');
    expect(r.links.laboratory).toContain('pairs=0-1');
    expect(r.links.laboratory).toContain('names=');
  });
  test('refuses a bad pair index and a lone colour', () => {
    expect(() => checkPalette({ colours: ['#000'] })).toThrow(Refusal);
    expect(() =>
      checkPalette({ colours: ['#000', '#fff'], pairs: [{ text: 0, background: 2 }] }),
    ).toThrow('indexes run from 0 to 1');
  });
});

describe('request_palette', () => {
  test('is deterministic, reports a pass or fail per requirement, and links the Laboratory', () => {
    const input = {
      roles: ['dominant', 'secondary', 'accent'] as const,
      rule: 'complementary' as const,
      fixed: { dominant: '#f4f1ea' },
      contrast: [{ text: 'accent' as const, background: 'dominant' as const, minimum: 4.5 }],
      minimumSeparation: 0.1,
      seed: 7,
      count: 120,
    };
    const a = requestPalette({ ...input, roles: [...input.roles] });
    const b = requestPalette({ ...input, roles: [...input.roles] });
    expect(a).toEqual(b);
    expect(a.palette).not.toBeNull();
    expect(a.palette![0]).toMatchObject({ role: 'dominant', hex: '#f4f1ea' });
    const reqs = a.requirements.map((r) => r.requirement);
    expect(reqs.some((r) => r.startsWith('contrast of accent on dominant at least 4.5'))).toBe(
      true,
    );
    expect(reqs.some((r) => r.startsWith('every pair at least 0.1 apart'))).toBe(true);
    expect(reqs.some((r) => r.startsWith('every colour inside srgb'))).toBe(true);
    expect(a.allPassed).toBe(a.requirements.every((r) => r.passes));
    expect(a.links.laboratory).toContain('structure=complementary');
    expect(a.links.laboratory).toContain('n=7');
    expect(a.links.laboratory).toContain('locks=100');
    expect(a.links.laboratory).toContain('pairs=2-0');
  });
  test('a record to start from fixes the first role to its value and cites it', () => {
    const r = requestPalette({ startFrom: 'zh-yanzhi', seed: 1, count: 50 });
    expect(r.startedFrom).toMatchObject({ concept: 'zh-yanzhi', hex: '#960018' });
    expect(r.startedFrom!.citation?.locator).toContain('胭脂');
    expect(r.palette![0]!.hex).toBe('#960018');
  });
  test('an impossible contrast is reported as the fewest failures, never hidden', () => {
    const r = requestPalette({
      roles: ['dominant', 'accent'],
      lightness: { min: 0.9, max: 0.95 },
      contrast: [{ text: 'accent', background: 'dominant', minimum: 7 }],
      seed: 3,
      count: 40,
    });
    expect(r.allPassed).toBe(false);
    expect(r.requirements.find((q) => q.requirement.startsWith('contrast'))!.passes).toBe(false);
    expect(r.note).toContain('fewest failures');
  });
  test('words are refused with their measurable form', () => {
    try {
      requestPalette({ words: 'warm, trustworthy' });
      throw new Error('not refused');
    } catch (e) {
      expect(e).toBeInstanceOf(Refusal);
      const d = (e as Refusal).detail as { refused: { word: string; instead: string }[] };
      expect(d.refused[0]).toMatchObject({
        word: 'warm',
        instead: expect.stringContaining('hue arc'),
      });
      expect(d.refused[1]!.instead).toContain('ask the person');
    }
    expect(() => requestPalette({ roles: ['accent'], fixed: { dominant: '#fff' } })).toThrow(
      'not in roles',
    );
  });
});

describe('records', () => {
  test('find then look up: a concept with names, representations and citations', () => {
    const hits = findRecords('胭脂');
    expect(hits.hits.some((h) => h.id === 'zh-yanzhi' || h.id === 'zh-yanzhi-name')).toBe(true);
    expect(findRecords('yanzhi').hits.some((h) => h.id === 'zh-yanzhi')).toBe(true);
    expect(findRecords('sakura').hits[0]).toMatchObject({ concept: 'ja-sakura-iro' });
    const r = lookupRecord('zh-yanzhi');
    expect(r).toMatchObject({
      type: 'concept',
      label: '胭脂 (yānzhi)',
      displayed: 'zh-yanzhi-srgb-zhwiki',
    });
    const concept = r as Extract<ReturnType<typeof lookupRecord>, { names: unknown }>;
    expect(concept.names[0]).toMatchObject({ script: '胭脂', language: 'zh' });
    expect(concept.representations[0]).toMatchObject({
      space: 'srgb',
      approximation: 'modern-approximation',
      display: { hex: '#960018', mapped: false },
    });
    expect(concept.citation?.locator).toBe('entry 胭脂 (红色系)');
    expect(concept.status.label).toBe('Unreviewed');
    expect('review_state' in concept).toBe(false);
  });
  test('a source is bibliographic; an unknown id and a short search are refused', () => {
    const s = lookupRecord('wikipedia-zh-chinese-traditional-colours');
    expect(s).toMatchObject({ type: 'source', cited: expect.any(Number) });
    expect(() => lookupRecord('no-such-record')).toThrow(Refusal);
    expect(() => findRecords('  ')).toThrow(Refusal);
  });
  test('systems list their members; lessons read as markdown with references', () => {
    const systems = listSystems();
    expect(systems.map((s) => s.id)).toContain('chevreul-circle');
    const circle = lookupRecord('chevreul-circle') as { members?: { concept: string }[] };
    expect(circle.members!.length).toBe(6);
    // A restricted system keeps its bibliographic record and nothing of its text.
    const wuxing = lookupRecord('zh-wuxing') as { status: { kind: string }; description?: string };
    expect(wuxing.status.kind).toBe('restricted');
    expect(wuxing.description).toBeUndefined();
    const lessons = listLessons();
    expect(lessons.length).toBeGreaterThan(0);
    const text = lessonText(lessons[0]!.id)!;
    expect(text.startsWith(`# ${lessons[0]!.title}`)).toBe(true);
    expect(text).toContain('## References');
    expect(lessonText('nope')).toBeNull();
  });
});
