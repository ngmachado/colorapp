import { describe, expect, test } from 'vitest';
import { simulateCvd } from './cvd';
import {
  colour,
  contrastRatio,
  convert,
  deltaE,
  hueDistance,
  inGamut,
  mix,
  nearNeutral,
  steps,
  toCss,
  toGamut,
  toHex,
} from './engine';

const red = colour('srgb', [1, 0, 0], { kind: 'manual' });

describe('colour values keep their origin and path', () => {
  test('origin survives a chain of conversions and records adaptation', () => {
    const lab = convert(convert(red, 'oklch'), 'lab');
    expect(lab.origin).toEqual({ space: 'srgb', coords: [1, 0, 0], white: 'D65' });
    expect(lab.white).toBe('D50');
    expect(lab.conversionPath).toEqual(['srgb', 'oklch', 'adapt:bradford:D65->D50', 'lab']);
    expect(lab.source).toEqual({ kind: 'manual' });
  });

  test('coordinates are copied, not shared', () => {
    const coords: [number, number, number] = [0.2, 0.3, 0.4];
    const v = colour('srgb', coords);
    coords[0] = 9;
    expect(v.coords[0]).toBe(0.2);
    expect(v.origin.coords[0]).toBe(0.2);
  });

  test('rejects non-finite coordinates', () => {
    expect(() => colour('srgb', [1, Number.NaN, 0])).toThrow(/Invalid srgb/);
  });

  test('achromatic colours get hue 0 and a flag instead of NaN', () => {
    const grey = convert(colour('srgb', [0.5, 0.5, 0.5]), 'oklch');
    expect(grey.coords[2]).toBe(0);
    expect(grey.achromatic).toBe(true);
    expect(convert(red, 'oklch').achromatic).toBeUndefined();
  });

  test('xyY round-trips through XYZ', () => {
    const xyy = convert(red, 'xyy');
    expect(xyy.coords[0]).toBeCloseTo(0.64, 3);
    expect(xyy.coords[1]).toBeCloseTo(0.33, 3);
    const back = convert(xyy, 'srgb');
    expect(back.coords[0]).toBeCloseTo(1, 6);
    expect(back.coords[1]).toBeCloseTo(0, 6);
    expect(convert(colour('srgb', [0, 0, 0]), 'xyy').coords).toEqual([0.3127, 0.329, 0]);
  });
});

describe('gamut', () => {
  const wild = colour('oklch', [0.7, 0.4, 30]);

  test('out-of-gamut input keeps original, mapped, policy and delta', () => {
    expect(inGamut(wild, 'srgb')).toBe(false);
    const m = toGamut(wild, 'srgb', 'oklch-chroma');
    expect(inGamut(m, 'srgb')).toBe(true);
    expect(m.mapped?.policy).toBe('oklch-chroma');
    expect(m.mapped?.space).toBe('srgb');
    expect(m.mapped?.from.some((n) => n > 1 || n < 0)).toBe(true);
    expect(m.mapped?.delta.metric).toBe('oklab');
    expect(m.mapped?.delta.value).toBeGreaterThan(0);
    expect(m.origin).toEqual(wild.origin);
    expect(m.conversionPath.at(-1)).toBe('gamut:oklch-chroma:srgb');
  });

  test('policies give different results', () => {
    const a = toGamut(wild, 'srgb', 'clip').coords;
    const b = toGamut(wild, 'srgb', 'css').coords;
    expect(a).not.toEqual(b);
  });

  test('in-gamut input is returned without a mapping record', () => {
    const v = toGamut(red, 'srgb', 'css');
    expect(v.mapped).toBeUndefined();
    expect(v.coords).toEqual([1, 0, 0]);
  });
});

describe('differences and descriptors', () => {
  test('deltaE carries metric, version and space', () => {
    const d = deltaE(red, colour('srgb', [0, 1, 0]), 'oklab');
    expect(d).toMatchObject({ metric: 'oklab', version: '1', space: 'oklab' });
    expect(d.value).toBeCloseTo(0.5198, 3);
    expect(deltaE(red, red).value).toBe(0);
  });

  test('hue distance is circular', () => {
    expect(hueDistance(10, 350)).toBe(20);
    expect(hueDistance(0, 180)).toBe(180);
    expect(hueDistance(-30, 30)).toBe(60);
    expect(hueDistance(725, 5)).toBe(0);
  });

  test('near-neutral exposes its threshold', () => {
    expect(nearNeutral(colour('srgb', [0.5, 0.5, 0.5]))).toEqual({
      neutral: true,
      chroma: 0,
      threshold: 0.02,
      space: 'oklch',
    });
    expect(nearNeutral(red).neutral).toBe(false);
    expect(nearNeutral(red, 1).neutral).toBe(true);
  });

  test('WCAG contrast', () => {
    expect(contrastRatio(colour('srgb', [1, 1, 1]), colour('srgb', [0, 0, 0]))).toBeCloseTo(21, 6);
    expect(contrastRatio(red, colour('srgb', [1, 1, 1]))).toBeCloseTo(3.998, 3);
  });
});

describe('interpolation and display strings', () => {
  test('mix in oklch with the shorter hue arc', () => {
    const m = mix(red, colour('srgb', [0, 0, 1]), 0.5);
    expect(m.space).toBe('oklch');
    expect(m.coords[2]).toBeCloseTo(326.64, 1);
    expect(m.conversionPath.at(-1)).toBe('mix:oklch:shorter:0.5');
    const longer = mix(red, colour('srgb', [0, 0, 1]), 0.5, { hue: 'longer' });
    expect(hueDistance(longer.coords[2], m.coords[2])).toBeCloseTo(180, 6);
  });

  test('steps are inclusive', () => {
    const s = steps(red, colour('srgb', [0, 0, 1]), 5, { space: 'oklab' });
    expect(s).toHaveLength(5);
    expect(convert(s[0]!, 'srgb').coords[0]).toBeCloseTo(1, 6);
    expect(convert(s[4]!, 'srgb').coords[2]).toBeCloseTo(1, 6);
  });

  test('hex and css are derived strings', () => {
    expect(toHex(red)).toBe('#ff0000');
    expect(toHex(colour('oklch', [0.7, 0.4, 30]))).toMatch(/^#[0-9a-f]{6}$/);
    expect(toCss(convert(red, 'oklch'))).toMatch(/^oklch\(/);
  });
});

describe('colour-vision simulation', () => {
  test('is labelled an approximation and keeps the origin', () => {
    const sim = simulateCvd(red, 'protan');
    expect(sim.space).toBe('srgb-linear');
    expect(sim.source?.note).toMatch(/approximation/);
    expect(sim.origin).toEqual(red.origin);
    expect(deltaE(sim, red, 'oklab').value).toBeGreaterThan(0.1);
  });
});
