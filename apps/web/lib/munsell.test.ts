import { describe, expect, test } from 'vitest';
import {
  adapt,
  hexToXyzD65,
  hueNumber,
  lab,
  munsellAvailable,
  munsellForNotation,
  munsellInterpolate,
  munsellNearest,
  munsellTable,
  parseNotation,
  valueToY,
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

describe('Munsell interpolation', () => {
  test('the value polynomial reproduces the renotation anchors', () => {
    expect(valueToY(10)).toBeCloseTo(102.57, 2);
    expect(valueToY(5)).toBeCloseTo(19.77, 1);
    expect(valueToY(0)).toBe(0);
  });
  test('a chromatic notation needs the table', () => {
    if (!munsellAvailable()) expect(munsellInterpolate('5R 4/3')).toBeNull();
    else expect(munsellInterpolate('5R 4/3')!.exact).toBe(false);
  });
  test('neutrals need no table and sit on the illuminant; impossible values are refused', () => {
    const grey = munsellInterpolate('N 5/')!;
    expect(grey.asked).toBe('N 5');
    expect(grey.exact).toBe(true);
    expect(grey.xyzC[1]).toBeCloseTo((valueToY(5) * 0.975) / 100, 6);
    // Illuminant C white adapted to D65 is the sRGB white: a neutral is a grey on screen.
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(grey.hex.slice(i, i + 2), 16));
    expect(Math.max(r!, g!, b!) - Math.min(r!, g!, b!)).toBeLessThanOrEqual(2);
    expect(munsellInterpolate('N9.5')!.hex > '#e0e0e0').toBe(true);
    expect(munsellInterpolate('N 11')).toBeNull();
    expect(munsellInterpolate('5R 12/2')).toBeNull();
    expect(munsellInterpolate('nonsense')).toBeNull();
  });
});

describe.skipIf(!munsellAvailable())('Munsell interpolation against the table', () => {
  test('a tabulated sample interpolates to itself; a point between pages lands between them', () => {
    const tab = munsellForNotation('5R 4/14')!.hit;
    const same = munsellInterpolate('5R 4/14')!;
    expect(same.exact).toBe(true);
    expect(same.hex).toBe(tab.hex);
    const a = munsellInterpolate('5R 4/14')!;
    const b = munsellInterpolate('7.5R 4/14')!;
    const mid = munsellInterpolate('6.25R 4/14')!;
    expect(mid.exact).toBe(false);
    expect(mid.xyzC[0]).toBeGreaterThan(Math.min(a.xyzC[0], b.xyzC[0]) - 1e-9);
    expect(mid.xyzC[0]).toBeLessThan(Math.max(a.xyzC[0], b.xyzC[0]) + 1e-9);
    // Half values: between the two whole-value planes.
    const half = munsellInterpolate('7RP 7.5/8')!;
    expect(half.xyzC[1]).toBeGreaterThan(munsellInterpolate('7RP 7/8')!.xyzC[1]);
    expect(half.xyzC[1]).toBeLessThan(munsellInterpolate('7RP 8/8')!.xyzC[1]);
    // Beyond the tabulated chroma or value: clamped and flagged.
    expect(munsellInterpolate('5R 4/40')!.beyond).toBe(true);
    expect(munsellInterpolate('2.5Y 9.2/0.5')!.beyond).toBe(true);
    expect(munsellInterpolate('5R 9/2')!.beyond).toBe(false);
    // The hue circle closes: 10RP neighbours 2.5R.
    expect(munsellInterpolate('1R 5/6')!.beyond).toBe(false);
  });
});
