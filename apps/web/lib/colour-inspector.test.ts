import { describe, expect, test } from 'vitest';
import { colourSteps, inspectHex } from './colour-inspector';

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
