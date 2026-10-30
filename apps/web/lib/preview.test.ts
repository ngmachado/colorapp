import { describe, expect, test } from 'vitest';
import { defaultSlots, derivedDark, parseSlots, shownPairs, slotsParam } from './preview';

const palette: [number, number, number][] = [
  [0.95, 0.01, 90], // light
  [0.25, 0.02, 260], // dark
  [0.6, 0.2, 30], // chromatic
  [0.85, 0.03, 200], // light-ish
];

describe('applied preview', () => {
  test('defaults put the lightest column behind, the darkest as text and the most chromatic as primary', () => {
    const s = defaultSlots(palette);
    expect(s).toMatchObject({ background: 0, text: 1, primary: 2, link: 2, surface: 3, border: 3 });
  });
  test('an intended pair overrides text and background', () => {
    const s = defaultSlots(palette, [[2, 0]]);
    expect(s.text).toBe(2);
    expect(s.background).toBe(0);
  });
  test('slots round-trip through the address and ignore bad entries', () => {
    const s = parseSlots('text:3,primary:9,nope:1,border', palette);
    expect(s.text).toBe(3);
    expect(s.primary).toBe(2);
    expect(parseSlots(slotsParam(s), palette)).toEqual(s);
  });
  test('the dark counterpart reflects lightness and keeps hue', () => {
    const dark = derivedDark(palette);
    expect(dark[0]![0]).toBeCloseTo(0.05, 1);
    expect(dark[1]![0]).toBeCloseTo(0.75, 1);
    expect(Math.abs(dark[2]![2] - 30)).toBeLessThan(2);
    for (const c of dark) expect(c[0]).toBeLessThanOrEqual(1);
  });
  test('shown pairs measure what the mockup draws, text and non-text with their own thresholds', () => {
    const pairs = shownPairs(palette, defaultSlots(palette));
    const text = pairs.find((p) => p.id === 'text-background')!;
    expect(text.ratio).toBeGreaterThan(10);
    expect(text.passes).toBe(true);
    expect(pairs.find((p) => p.id === 'border-background')!.use).toBe('non-text');
    expect(pairs).toHaveLength(8);
    expect(pairs.find((p) => p.id === 'primary-surface')!.use).toBe('text');
  });
});
