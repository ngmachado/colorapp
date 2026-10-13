import { describe, expect, test } from 'vitest';
import { colour, deltaE } from './engine';
import data from './fixtures/sharma-ciede2000.json';

type Pair = [number, number, number, number, number, number, number];
const pairs = data.pairs as Pair[];

describe('CIEDE2000 against the Sharma, Wu and Dalal test pairs', () => {
  test.each(pairs.map((p, i) => [i + 1, p] as const))('pair %i', (_i, p) => {
    const a = colour('lab', [p[0], p[1], p[2]]);
    const b = colour('lab', [p[3], p[4], p[5]]);
    const d = deltaE(a, b, 'ciede2000');
    expect(d.metric).toBe('ciede2000');
    expect(d.params).toEqual({ kL: 1, kC: 1, kH: 1 });
    // Published values are rounded to 4 decimal places.
    expect(d.value).toBeCloseTo(p[6], 4);
    // CIEDE2000 is symmetric.
    expect(deltaE(b, a, 'ciede2000').value).toBeCloseTo(d.value, 10);
  });
});
