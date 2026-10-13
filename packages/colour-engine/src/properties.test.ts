import fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { colour, contrastRatio, convert, deltaE, hueDistance } from './engine';
import type { SpaceId } from './types';

const unit = fc.double({ min: 0, max: 1, noNaN: true });
const srgb = fc.tuple(unit, unit, unit).map(([r, g, b]) => colour('srgb', [r, g, b]));

const ROUND_TRIP_SPACES: SpaceId[] = [
  'srgb-linear',
  'display-p3',
  'hsl',
  'hsv',
  'xyz-d65',
  'xyz-d50',
  'xyy',
  'lab',
  'lch',
  'oklab',
  'oklch',
];

describe('property tests', () => {
  test('sRGB round-trips through every space within 1e-6, or 1e-3 when the hue was dropped as achromatic', () => {
    // Color.js reports no hue when chroma is under a small epsilon (0.02 in CIELCh, 0.0002 in OKLCh).
    // The engine flags that value as achromatic; the direction of such a tiny chroma cannot survive the trip.
    fc.assert(
      fc.property(srgb, fc.constantFrom(...ROUND_TRIP_SPACES), (v, space) => {
        const mid = convert(v, space);
        const back = convert(mid, 'srgb');
        const tolerance = mid.achromatic ? 1e-3 : 1e-6;
        for (let i = 0; i < 3; i++)
          expect(Math.abs(back.coords[i]! - v.coords[i]!)).toBeLessThan(tolerance);
      }),
      { numRuns: 500 },
    );
  });

  test('no conversion produces NaN or Infinity, including black and white', () => {
    const all: SpaceId[] = [...ROUND_TRIP_SPACES, 'cam16-jmh'];
    const edge = fc.constantFrom(
      colour('srgb', [0, 0, 0]),
      colour('srgb', [1, 1, 1]),
      colour('srgb', [0.5, 0.5, 0.5]),
    );
    fc.assert(
      fc.property(fc.oneof(srgb, edge), fc.constantFrom(...all), (v, space) => {
        for (const n of convert(v, space).coords) expect(Number.isFinite(n)).toBe(true);
      }),
      { numRuns: 300 },
    );
  });

  test('hue distance is symmetric, non-negative and at most 180', () => {
    const deg = fc.double({ min: -1000, max: 1000, noNaN: true });
    fc.assert(
      fc.property(deg, deg, (a, b) => {
        const d = hueDistance(a, b);
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThanOrEqual(180);
        expect(hueDistance(b, a)).toBeCloseTo(d, 9);
      }),
    );
  });

  test('deltaE is zero for identical colours and symmetric', () => {
    fc.assert(
      fc.property(srgb, srgb, (a, b) => {
        expect(deltaE(a, a, 'ciede2000').value).toBeCloseTo(0, 9);
        expect(deltaE(a, b, 'ciede2000').value).toBeCloseTo(deltaE(b, a, 'ciede2000').value, 9);
        expect(deltaE(a, b, 'oklab').value).toBeCloseTo(deltaE(b, a, 'oklab').value, 9);
      }),
      { numRuns: 200 },
    );
  });

  test('contrast ratio stays within 1 and 21', () => {
    fc.assert(
      fc.property(srgb, srgb, (a, b) => {
        const c = contrastRatio(a, b);
        expect(c).toBeGreaterThanOrEqual(1);
        expect(c).toBeLessThanOrEqual(21);
      }),
    );
  });
});
