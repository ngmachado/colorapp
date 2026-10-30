import { describe, expect, test } from 'vitest';
import { compareHexes } from './compare';

describe('two-colour comparison', () => {
  test('identical colours differ by nothing and contrast 1:1', () => {
    const c = compareHexes('#663399', '663399')!;
    expect(c.differences.map((d) => d.value)).toEqual([0, 0]);
    expect(c.contrast.ratio).toBe(1);
    expect(c.oklchDelta).toEqual({ l: 0, c: 0, h: 0 });
  });
  test('black and white: maximum contrast, named metrics with conditions, hue undefined', () => {
    const c = compareHexes('#000', '#fff')!;
    expect(c.contrast.ratio).toBe(21);
    expect(c.contrast.thresholds.every((t) => t.passes)).toBe(true);
    expect(c.differences[0]).toMatchObject({
      id: 'ciede2000',
      conditions: expect.stringContaining('D50'),
    });
    expect(c.differences[0]!.value).toBeCloseTo(100, 0);
    expect(c.differences[1]!.value).toBeCloseTo(1, 2);
    expect(c.oklchDelta.h).toBeNull();
    expect(c.a.neutral && c.b.neutral).toBe(true);
  });
  test('hue difference is the smaller arc', () => {
    const c = compareHexes('#ff0000', '#0000ff')!;
    expect(c.oklchDelta.h).toBeGreaterThan(90);
    expect(c.oklchDelta.h).toBeLessThan(180);
    expect(compareHexes('zz', '#fff')).toBeNull();
  });
});
