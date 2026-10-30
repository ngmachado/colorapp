import { describe, expect, test } from 'vitest';
import {
  adapt,
  hexToXyzD65,
  hueNumber,
  lab,
  munsellAvailable,
  munsellForNotation,
  munsellNearest,
  munsellTable,
  parseNotation,
} from './munsell';

describe('Munsell conversions and notations', () => {
  test('Bradford adaptation maps one white to the other and back', () => {
    const d65: [number, number, number] = [0.95047, 1, 1.08883];
    const c: [number, number, number] = [0.98074, 1, 1.18232];
    const there = adapt(d65, d65, c);
    expect(there[0]).toBeCloseTo(c[0], 4);
    expect(there[2]).toBeCloseTo(c[2], 4);
    const back = adapt(there, c, d65);
    expect(back[0]).toBeCloseTo(d65[0], 5);
    // sRGB white is the D65 white, and L* of a white is 100.
    expect(lab(hexToXyzD65('#ffffff'), d65)[0]).toBeCloseTo(100, 2);
  });
  test('notations parse and hue pages sit on a 100-step circle', () => {
    expect(parseNotation('5R 4/14')).toEqual({ hue: '5R', value: 4, chroma: 14 });
    expect(parseNotation('7.5pb 3 / 6')).toEqual({ hue: '7.5PB', value: 3, chroma: 6 });
    expect(parseNotation('N 5/')).toBeNull();
    expect(hueNumber('10RP')).toBe(100);
    expect(hueNumber('2.5R')).toBe(2.5);
    expect(munsellNearest('nope')).toBeNull();
  });
  test('a pasted table parses without the file', () => {
    const rows = munsellTable('h V C x y Y\n 5R 4 14 0.5 0.3 12.0\n');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.notation).toBe('5R 4/14');
  });
});

// The table is a personal download (see content/reference/munsell/README.md); these tests need it.
describe.skipIf(!munsellAvailable())('Munsell renotation table', () => {
  test('the table has every chromatic sample of real.dat, under illuminant C', () => {
    const rows = munsellTable();
    expect(rows).toHaveLength(2734);
    expect(rows[0]).toMatchObject({ hue: '10RP', value: 1, chroma: 2, notation: '10RP 1/2' });
    expect(rows.some((r) => r.hue === 'N')).toBe(false);
  });
  test('a sample converted to sRGB finds itself first at a small distance', () => {
    const inside = munsellNearest('#808080', 1)!;
    expect(inside).toHaveLength(1);
    const back = munsellNearest(inside[0]!.hex, 3)!;
    // Round trip through 8-bit sRGB: the same notation, within a fraction of a unit.
    expect(back[0]!.notation).toBe(inside[0]!.notation);
    expect(back[0]!.deltaE).toBeLessThan(0.5);
    expect(back[0]!.mapped).toBe(false);
  });
  test('an exact notation is tabulated; a non-tabulated one gets its nearest page, and says so', () => {
    const exact = munsellForNotation('5R 4/14')!;
    expect(exact.exact).toBe(true);
    expect(exact.hit.notation).toBe('5R 4/14');
    const near = munsellForNotation('7RP 7.5/8')!;
    expect(near.exact).toBe(false);
    expect(near.asked).toBe('7RP 7.5/8');
    expect(['7.5RP 7/8', '7.5RP 8/8']).toContain(near.hit.notation);
  });
});
