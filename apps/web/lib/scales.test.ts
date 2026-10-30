import { describe, expect, test } from 'vitest';
import { lightnessOf, nearestStep, SCALE_STEPS, scaleOf } from './scales';

describe('tonal scales', () => {
  test('eleven steps, even in OKLCh lightness, lightest first', () => {
    const s = scaleOf([0.5, 0.1, 30]);
    expect(s.map((x) => x.step)).toEqual([...SCALE_STEPS]);
    expect(s[0]!.l).toBeCloseTo(0.95625, 5);
    expect(s[5]!.l).toBeCloseTo(0.5625, 5);
    expect(s[10]!.l).toBeCloseTo(0.16875, 5);
    expect(lightnessOf(300) - lightnessOf(400)).toBeCloseTo(
      lightnessOf(700) - lightnessOf(800),
      10,
    );
    for (const x of s) expect(x.hex).toMatch(/^#[0-9a-f]{6}$/);
  });
  test('a saturated colour has mapped stops at the extremes; a grey has none', () => {
    const red = scaleOf([0.63, 0.26, 29]);
    expect(red.some((x) => x.mapped)).toBe(true);
    expect(red[0]!.mapped).toBe(true);
    expect(scaleOf([0.5, 0, 0]).every((x) => !x.mapped)).toBe(true);
  });
  test('the nearest step follows the column lightness', () => {
    expect(nearestStep([0.95, 0, 0])).toBe(50);
    expect(nearestStep([0.56, 0.1, 10])).toBe(500);
    expect(nearestStep([0.2, 0.1, 10])).toBe(900);
  });
});
