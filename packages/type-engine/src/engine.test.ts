import { describe, expect, test } from 'vitest';
import {
  TEXT_SPACING,
  apcaLc,
  averageCharWidth,
  charactersPerLine,
  isLargeText,
  leadingRatio,
  place,
  scale,
  wcagForStyle,
  wcagRatio,
} from './index';

describe('scale', () => {
  test('multiplies the base by the ratio per step and rounds to a hundredth of a pixel', () => {
    const s = scale(16, 1.25, -1, 3);
    expect(s.map((x) => x.px)).toEqual([12.8, 16, 20, 25, 31.25]);
    expect(s[1]!.step).toBe(0);
  });
  test('refuses a non-positive base or ratio', () => {
    expect(() => scale(0, 1.25)).toThrow(RangeError);
    expect(() => scale(16, -1)).toThrow(RangeError);
  });
});

describe('measure', () => {
  test('counts whole characters and places a count against a given range', () => {
    expect(charactersPerLine(640, averageCharWidth(27 * 8.5))).toBe(75);
    expect(place(75, { min: 45, max: 75, ideal: 66 })).toBe('within');
    expect(place(44, { min: 45, max: 75 })).toBe('below');
    expect(place(90, { min: 45, max: 75 })).toBe('above');
    expect(leadingRatio(24, 16)).toBe(1.5);
  });
});

describe('WCAG 2', () => {
  test('black on white is 21:1 and the large-text rule follows size and weight', () => {
    expect(wcagRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(wcagRatio('#ffffff', '#000000')).toBeCloseTo(21, 5);
    expect(isLargeText(24, 400)).toBe(true);
    expect(isLargeText(23.9, 400)).toBe(false);
    expect(isLargeText(18.67, 700)).toBe(true);
    expect(isLargeText(18.67, 600)).toBe(false);
  });
  test('a style verdict applies the thresholds its size selects', () => {
    const normal = wcagForStyle('#767676', '#ffffff', 16, 400);
    expect(normal.ratio).toBeCloseTo(4.54, 2);
    expect(normal.aa).toMatchObject({ minimum: 4.5, passes: true, criterion: '1.4.3' });
    expect(normal.aaa).toMatchObject({ minimum: 7, passes: false, criterion: '1.4.6' });
    const large = wcagForStyle('#949494', '#ffffff', 24, 400);
    expect(large.large).toBe(true);
    expect(large.aa.minimum).toBe(3);
    expect(large.aa.passes).toBe(true);
  });
});

describe('APCA 0.0.98G-4g', () => {
  // Values published with apca-w3 for these pairs; the sign says which way round the colours are.
  test.each([
    ['#888888', '#ffffff', 63.056],
    ['#ffffff', '#888888', -68.541],
    ['#000000', '#aaaaaa', 58.146],
    ['#aaaaaa', '#000000', -56.241],
    ['#112233', '#ddeeff', 91.668],
    ['#ddeeff', '#112233', -93.068],
  ])('%s on %s is Lc %d', (text, bg, lc) => {
    expect(apcaLc(text, bg)).toBeCloseTo(lc, 2);
  });
  test('identical colours and faint differences are reported as zero', () => {
    expect(apcaLc('#808080', '#808080')).toBe(0);
    expect(apcaLc('#808080', '#818181')).toBe(0);
  });
});

test('text spacing carries the criterion and the four values it names', () => {
  expect(TEXT_SPACING).toEqual({
    criterion: '1.4.12',
    lineHeight: 1.5,
    paragraphSpacingEm: 2,
    letterSpacingEm: 0.12,
    wordSpacingEm: 0.16,
  });
});
