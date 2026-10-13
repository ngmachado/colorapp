import { describe, expect, test } from 'vitest';
import { colour, convert } from './engine';
import oracle from './fixtures/oracle.json';
import type { Triple } from './types';

/**
 * Declared tolerances for the independent cross-check (colour-science, see scripts/oracle.py).
 * XYZ and Lab agree to numerical noise. OKLab differs by up to ~2e-4 because colour-science uses
 * Ottosson's original matrices while Color.js uses the higher-precision CSS Color 4 matrices.
 */
const TOLERANCE = { 'xyz-d65': 1e-6, 'xyz-d50': 1e-6, lab: 1e-4, oklab: 3e-4 } as const;

function expectClose(actual: Triple, expected: number[], tol: number, label: string) {
  for (let i = 0; i < 3; i++) {
    expect(
      Math.abs(actual[i]! - expected[i]!),
      `${label}[${i}] got ${actual[i]} want ${expected[i]}`,
    ).toBeLessThan(tol);
  }
}

describe(`conversions against ${oracle.generator}`, () => {
  test.each(oracle.samples.map((s) => [s.srgb.join(','), s] as const))('srgb(%s)', (_label, s) => {
    const v = colour('srgb', s.srgb as Triple);
    expectClose(convert(v, 'xyz-d65').coords, s.xyz_d65, TOLERANCE['xyz-d65'], 'xyz-d65');
    expectClose(convert(v, 'xyz-d50').coords, s.xyz_d50, TOLERANCE['xyz-d50'], 'xyz-d50');
    expectClose(convert(v, 'lab').coords, s.lab_d50, TOLERANCE.lab, 'lab');
    expectClose(convert(v, 'oklab').coords, s.oklab, TOLERANCE.oklab, 'oklab');
  });
});
