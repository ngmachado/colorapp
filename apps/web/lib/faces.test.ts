import { describe, expect, test } from 'vitest';
import type { CatalogueFace } from '@/app/api/fonts/route';
import {
  NO_FILTERS,
  cssHref,
  cssParam,
  facts,
  hasWeights,
  matches,
  order,
  staticWeights,
  tally,
} from './faces';

const vf: CatalogueFace = {
  family: 'Inter',
  category: 'sans-serif',
  axes: [
    { tag: 'opsz', start: 14, end: 32 },
    { tag: 'wght', start: 100, end: 900 },
  ],
  subsets: ['latin', 'latin-ext', 'cyrillic', 'greek'],
  files: {
    regular: 'https://fonts.gstatic.com/inter.ttf',
    italic: 'https://fonts.gstatic.com/i.ttf',
  },
};
const st: CatalogueFace = {
  family: 'Alegreya Sans',
  category: 'sans-serif',
  subsets: ['latin', 'latin-ext'],
  files: {
    regular: 'https://fonts.gstatic.com/a.ttf',
    '500': 'https://fonts.gstatic.com/a5.ttf',
    '700': 'https://fonts.gstatic.com/a7.ttf',
    italic: 'https://fonts.gstatic.com/ai.ttf',
  },
};
const one: CatalogueFace = {
  family: 'Abril Fatface',
  category: 'display',
  subsets: ['latin'],
  files: { regular: 'https://fonts.gstatic.com/ab.ttf' },
};
const mono: CatalogueFace = {
  family: 'Zed Mono',
  category: 'monospace',
  subsets: ['latin', 'japanese'],
  files: { '300': 'https://fonts.gstatic.com/z3.ttf' },
};

describe('faces finder', () => {
  test('weights come from the axis range or the shipped files', () => {
    expect(staticWeights(st)).toEqual([400, 500, 700]);
    expect(hasWeights(vf, [400, 500, 600, 700])).toBe(true);
    expect(hasWeights(st, [400, 500, 600, 700])).toBe(false);
    expect(hasWeights(st, [400, 700])).toBe(true);
    expect(hasWeights(one, [])).toBe(true);
  });
  test('filters are facts and all must hold', () => {
    expect(matches(vf, NO_FILTERS)).toBe(true);
    expect(matches(vf, { ...NO_FILTERS, category: 'serif' })).toBe(false);
    expect(matches(st, { ...NO_FILTERS, built: 'variable' })).toBe(false);
    expect(matches(st, { ...NO_FILTERS, built: 'static' })).toBe(true);
    expect(matches(vf, { ...NO_FILTERS, axes: ['opsz'] })).toBe(true);
    expect(matches(st, { ...NO_FILTERS, axes: ['opsz'] })).toBe(false);
    expect(matches(mono, { ...NO_FILTERS, subsets: ['japanese', 'latin'] })).toBe(true);
    expect(matches(vf, { ...NO_FILTERS, subsets: ['japanese'] })).toBe(false);
  });
  test('order is by name either way, or a shuffle that repeats from its seed', () => {
    const list = [mono, st, vf, one];
    expect(order(list, 'name').map((f) => f.family)).toEqual([
      'Abril Fatface',
      'Alegreya Sans',
      'Inter',
      'Zed Mono',
    ]);
    expect(order(list, 'name-desc')[0]!.family).toBe('Zed Mono');
    const a = order(list, 'shuffle', 7).map((f) => f.family);
    expect(order(list, 'shuffle', 7).map((f) => f.family)).toEqual(a);
    expect([...a].sort()).toEqual(['Abril Fatface', 'Alegreya Sans', 'Inter', 'Zed Mono']);
    expect(list.map((f) => f.family)).toEqual([
      'Zed Mono',
      'Alegreya Sans',
      'Inter',
      'Abril Fatface',
    ]);
  });
  test('the stylesheet address never asks a family for a weight it lacks', () => {
    expect(cssParam(vf, [400, 700])).toBe('family=Inter:wght@100..900');
    expect(cssParam(st, [400, 700])).toBe('family=Alegreya+Sans:wght@400;700');
    expect(cssParam(st, [600])).toBe('family=Alegreya+Sans:wght@400');
    expect(cssParam(mono, [400, 700])).toBe('family=Zed+Mono:wght@300');
    expect(cssHref([vf, one], [400, 700])).toBe(
      'https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Abril+Fatface:wght@400&display=swap',
    );
  });
  test('facts and tallies state what the catalogue states', () => {
    expect(facts(vf)).toBe('variable · opsz 14–32 · wght 100–900');
    expect(facts(st)).toBe('static · 3 weights');
    expect(facts(one)).toBe('static · 1 weight');
    expect(tally([vf, st, one, mono], (f) => f.subsets)).toEqual([
      ['latin', 4],
      ['latin-ext', 2],
      ['cyrillic', 1],
      ['greek', 1],
      ['japanese', 1],
    ]);
  });
});
