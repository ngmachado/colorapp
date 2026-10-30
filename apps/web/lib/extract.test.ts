import { describe, expect, test } from 'vitest';
import { extractColours, hexOfOklab, oklabOfRgb, samplePixels } from './extract';

const pixels = (colours: [number, number, number][], each: number) => {
  const data = new Uint8ClampedArray(colours.length * each * 4);
  colours.forEach((c, i) => {
    for (let j = 0; j < each; j++) {
      const o = (i * each + j) * 4;
      data.set([...c, 255], o);
    }
  });
  return data;
};

describe('image colour extraction', () => {
  test('sRGB to OKLab and back agrees with the reference values', () => {
    const white = oklabOfRgb(255, 255, 255);
    expect(white[0]).toBeCloseTo(1, 3);
    expect(Math.abs(white[1])).toBeLessThan(1e-3);
    const red = oklabOfRgb(255, 0, 0);
    expect(red[0]).toBeCloseTo(0.628, 3);
    expect(red[1]).toBeCloseTo(0.2249, 3);
    expect(hexOfOklab(oklabOfRgb(102, 51, 153))).toBe('#663399');
  });
  test('an image of two flat colours yields two observations with their shares', () => {
    const data = pixels(
      [
        [255, 0, 0],
        [0, 0, 255],
        [0, 0, 255],
        [0, 0, 255],
      ],
      100,
    );
    const got = extractColours(samplePixels(data), 5);
    expect(got.map((o) => o.hex)).toEqual(['#0000ff', '#ff0000']);
    expect(got[0]!.share).toBeCloseTo(0.75, 6);
    expect(got[1]!.count).toBe(100);
  });
  test('sampling honours the limit and skips transparent pixels; the result is deterministic', () => {
    const data = pixels(
      [
        [10, 20, 30],
        [200, 100, 50],
      ],
      500,
    );
    data[3] = 0;
    const s = samplePixels(data, 100);
    expect(s.length).toBeLessThanOrEqual(100);
    expect(s.length).toBeGreaterThan(90);
    const a = extractColours(samplePixels(data), 3);
    const b = extractColours(samplePixels(data), 3);
    expect(a).toEqual(b);
    expect(a).toHaveLength(2);
    expect(extractColours([], 5)).toEqual([]);
  });
});
