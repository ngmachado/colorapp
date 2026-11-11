import { describe, expect, test } from 'vitest';
import { parse } from './opentype';
import { makeTestFont } from './testing';
import { asEm } from './measure';
import { averageAdvance, openFont, readFont, summarize } from './font';

const makeFont = () => ({
  toArrayBuffer: () => makeTestFont({ chars: 'abcdefghijklmnopqrstuvwxyz\u03b1' }),
});

describe('font reading', () => {
  test('reads names, metrics, glyph count and coverage from a parsed file', () => {
    const buffer = makeFont().toArrayBuffer();
    const r = readFont(buffer);
    expect(r.family).toBe('Test Sans');
    expect(r.style).toBe('Regular');
    expect(r.designer).toBe('A tester');
    expect(r.license).toContain('Open Font License');
    expect(r.unitsPerEm).toBe(1000);
    expect(r.ascender).toBe(800);
    expect(r.descender).toBe(-200);
    expect(r.glyphs).toBe(29);
    expect(r.axes).toEqual([]);
    expect(r.coverage.map((c) => c.block)).toEqual(['Basic Latin', 'Greek and Coptic']);
    expect(r.coverage[0]!.mapped).toBe(27);
    expect(asEm(500, r.unitsPerEm)).toBe(0.5);
  });
  test('a missing OS/2 x-height or cap height is reported as unknown, not as zero', () => {
    const r = summarize(parse(makeFont().toArrayBuffer()));
    expect(r.xHeight === null || r.xHeight > 0).toBe(true);
    expect(r.capHeight === null || r.capHeight > 0).toBe(true);
  });
  test('the average advance comes from the file at the given size', () => {
    const font = parse(makeFont().toArrayBuffer());
    // 26 letters at 500 units and a space at 250, over 27, at 1000 px per em.
    expect(averageAdvance(font, 1000)).toBeCloseTo((26 * 500 + 250) / 27, 6);
    const opened = openFont(makeFont().toArrayBuffer());
    expect(opened.reading.family).toBe('Test Sans');
    expect(opened.averageAdvance(16)).toBeCloseTo(((26 * 500 + 250) / 27) * 0.016, 6);
  });
});
