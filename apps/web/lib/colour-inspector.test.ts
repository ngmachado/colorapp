import { describe, expect, test } from 'vitest';
import { HUE_RULES, colourSteps, inspectHex, inspectorSpace } from './colour-inspector';

describe('colour inspector', () => {
  test('normalizes opaque hex while rejecting alpha, CSS and malformed input', () => {
    expect(inspectHex(' #Fc2 ')?.hex).toBe('#ffcc22');
    for (const input of ['ff000080', 'rgba(0,0,0,0)', 'zzzzzz', '12', '1234567', 'red', ''])
      expect(inspectHex(input)).toBeNull();
  });
  test('sRGB red has explicit CSS coordinates and D50/D65 assumptions', () => {
    const values = inspectHex('ff0000')!.values;
    expect(values.find((v) => v.label === 'RGB')?.text).toBe('rgb(255 0 0)');
    expect(values.find((v) => v.label === 'HSL')?.text).toBe('hsl(0 100% 50%)');
    expect(values.find((v) => v.label === 'XYZ')?.text).toBe(
      'color(xyz-d65 0.412391 0.212639 0.019331)',
    );
    expect(values.find((v) => v.label === 'Lab')?.note).toContain('D50');
  });
  test('neutrals never invent a hue in copied polar coordinates', () => {
    for (const hex of ['000000', '808080', 'ffffff']) {
      const input = inspectHex(hex)!;
      expect(input.values.find((v) => v.label === 'HSL')?.text).toContain('none');
      expect(input.values.find((v) => v.label === 'OKLCh')?.text).toContain('0 none)');
      expect(input.values.map((v) => v.text).join('')).not.toMatch(/NaN|Infinity/);
    }
  });
  test('variations disclose mapping and retain finite display values at gamut boundaries', () => {
    const red = inspectHex('ff0000')!;
    const steps = colourSteps(red.value, 'chroma');
    expect(steps).toHaveLength(9);
    expect(steps.some((s) => s.mapped)).toBe(true);
    expect(steps[0]!.mapped).toBe(false);
    for (const hex of ['000000', 'ffffff', 'ff0000'])
      for (const dimension of ['lightness', 'chroma'] as const) {
        for (const s of colourSteps(inspectHex(hex)!.value, dimension))
          expect(s.hex).toMatch(/^#[a-f0-9]{6}$/i);
      }
  });
});

describe('inspector space', () => {
  test('plots every step and each rule’s turns at the inspected lightness and chroma', () => {
    const s = inspectorSpace(inspectHex('2a6fbd')!.value);
    expect(s.neutral).toBe(false);
    expect(s.lightness).toHaveLength(9);
    expect(s.chroma).toHaveLength(9);
    expect(Object.keys(s.rules)).toEqual([...HUE_RULES]);
    expect(s.rules.complementary).toHaveLength(1);
    expect(s.rules['split-complementary']).toHaveLength(2);
    expect(s.rules.triadic).toHaveLength(2);
    expect(s.rules.tetradic).toHaveLength(3);
    expect(s.rules.analogous).toHaveLength(2);
    const comp = s.rules.complementary[0]!;
    expect(comp.requested.L).toBeCloseTo(s.base.L, 10);
    expect(comp.requested.C).toBeCloseTo(s.base.C, 10);
    expect((comp.requested.h - s.base.h + 360) % 360).toBeCloseTo(180, 6);
    expect(comp.label).toBe('+180°');
    expect(s.rules.analogous.map((p) => p.label)).toEqual(['-30°', '+30°']);
    for (const p of [...s.lightness, ...s.chroma, ...Object.values(s.rules).flat()]) {
      expect(p.hex).toMatch(/^#[a-f0-9]{6}$/);
      expect(p.lab.every((n) => Number.isFinite(n))).toBe(true);
    }
  });
  test('a mapped point is drawn where its rendered value sits, not where it was requested', () => {
    const s = inspectorSpace(inspectHex('ff0000')!.value);
    const far = s.chroma[8]!; // C 0.4 is outside sRGB for every hue
    expect(far.mapped).toBe(true);
    expect(Math.hypot(far.lab[1], far.lab[2])).toBeLessThan(far.requested.C);
    const inside = s.chroma[0]!;
    expect(inside.mapped).toBe(false);
  });
  test('an achromatic input has no hue to turn', () => {
    const s = inspectorSpace(inspectHex('808080')!.value);
    expect(s.neutral).toBe(true);
    for (const rule of HUE_RULES) expect(s.rules[rule]).toEqual([]);
    expect(s.lightness).toHaveLength(9);
  });
});
