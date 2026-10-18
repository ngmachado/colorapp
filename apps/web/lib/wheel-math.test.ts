import { colour, inGamut, toHex } from '@sca/colour-engine';
import { describe, expect, test } from 'vitest';
import {
  fromXY,
  gamutEdge,
  hslOf,
  hslToRgb8,
  inSrgb,
  oklchOfRgb8,
  ruleOffsets,
  srgb8,
  toXY,
} from './wheel-math';

const samples: [number, number, number][] = [
  [0.75, 0.1, 40],
  [0.75, 0.3, 40],
  [0.5, 0.2, 265],
  [0.9, 0.2, 100],
  [0.3, 0.1, 150],
  [0.72, 0.16, 280],
];

describe('inSrgb agrees with the colour engine', () => {
  test.each(samples)('oklch %s %s %s', (L, C, h) => {
    expect(inSrgb(L, C, h)).toBe(inGamut(colour('oklch', [L, C, h]), 'srgb'));
  });
});

describe('srgb8 matches the engine hex for displayable colours', () => {
  test.each(samples.filter(([L, C, h]) => inSrgb(L, C, h)))('oklch %s %s %s', (L, C, h) => {
    const [r, g, b] = srgb8(L, C, h);
    const hex = `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
    const engine = toHex(colour('oklch', [L, C, h]));
    // Allow one step of rounding per channel.
    for (let i = 0; i < 3; i++) {
      const a = parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16);
      const e = parseInt(engine.slice(1 + 2 * i, 3 + 2 * i), 16);
      expect(Math.abs(a - e)).toBeLessThanOrEqual(1);
    }
  });
});

test('the gamut edge is inside and a hair beyond it is outside', () => {
  const c = gamutEdge(0.75, 40);
  expect(c).toBeGreaterThan(0.1);
  expect(inSrgb(0.75, c, 40)).toBe(true);
  expect(inSrgb(0.75, c + 0.002, 40)).toBe(false);
});

test('wheel geometry round-trips', () => {
  const [x, y] = toXY(0.2, 135, 400, 150);
  const back = fromXY(x, y, 400, 150);
  expect(back.c).toBeCloseTo(0.2, 6);
  expect(back.h).toBeCloseTo(135, 6);
  expect(toXY(0.1, 0, 100, 50)).toEqual([60, 50]);
});

test('rule offsets follow the options and free rules have none', () => {
  const angles = { span_deg: 30, split_deg: 30, angle_deg: 60 };
  expect(ruleOffsets('triadic', angles)).toEqual([0, 120, 240]);
  expect(ruleOffsets('analogous', angles)).toEqual([0, -30, 30]);
  expect(ruleOffsets('tetradic', angles)).toEqual([0, 60, 180, 240]);
  expect(ruleOffsets('free-form', angles)).toBeNull();
  expect(ruleOffsets('source-led', angles)).toBeNull();
});

test('HSL round-trips and sRGB red, green and blue land where OKLCh puts them', () => {
  expect(hslOf(255, 0, 0)[0]).toBe(0);
  expect(hslOf(0, 255, 0)[0]).toBe(120);
  expect(hslToRgb8(240, 1, 0.5)).toEqual([0, 0, 255]);
  expect(oklchOfRgb8(255, 0, 0)[2]).toBeCloseTo(29.2, 0);
  expect(oklchOfRgb8(0, 255, 0)[2]).toBeCloseTo(142.5, 0);
  expect(oklchOfRgb8(0, 0, 255)[2]).toBeCloseTo(264.1, 0);
  expect(oklchOfRgb8(128, 128, 128)[1]).toBeLessThan(1e-4);
});
