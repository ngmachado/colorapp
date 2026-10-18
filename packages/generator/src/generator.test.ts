import { describe, expect, test } from 'vitest';
import { candidateId } from './id';
import { ConstraintError, generate, run } from './pipeline';
import { Rng, deriveSeed } from './rng';
import { diverseSubset } from './subset';
import type { GeneratorParamsInput } from './types';
import { validateParams } from './validate';

const base: GeneratorParamsInput = {
  seed: 4027,
  count: 200,
  structure: 'triadic',
  bounds: { lightness: { min: 0.3, max: 0.85 }, chroma: { min: 0.02, max: 0.2 } },
  garment: { preset: 'preset-1-classic', view: 'front' },
  subset: 10,
  batchSize: 50,
};

describe('determinism', () => {
  test('the seeded generator gives the same sequence twice', () => {
    const a = new Rng(deriveSeed(1, 7));
    const b = new Rng(deriveSeed(1, 7));
    expect(Array.from({ length: 5 }, () => a.next())).toEqual(
      Array.from({ length: 5 }, () => b.next()),
    );
    expect(new Rng(deriveSeed(1, 8)).next()).not.toBe(new Rng(deriveSeed(1, 7)).next());
  });

  test('same seed and params reproduce ids and coordinates; a different seed does not', () => {
    const r1 = run(base, { contentVersion: 'v1' });
    const r2 = run(base, { contentVersion: 'v1' });
    expect(r1.manifest.candidate_ids).toEqual(r2.manifest.candidate_ids);
    expect(r1.candidates.map((c) => c.colours.map((x) => x.mapped.oklab))).toEqual(
      r2.candidates.map((c) => c.colours.map((x) => x.mapped.oklab)),
    );
    expect(r1.manifest.subset_ids).toEqual(r2.manifest.subset_ids);
    const r3 = run({ ...base, seed: 4028 }, { contentVersion: 'v1' });
    expect(r3.manifest.candidate_ids).not.toEqual(r1.manifest.candidate_ids);
    expect(run(base, { contentVersion: 'v2' }).manifest.candidate_ids[0]).not.toBe(
      r1.manifest.candidate_ids[0],
    );
  });

  test('candidate ids do not depend on batch size', () => {
    const { params } = validateParams(base);
    const { params: p2 } = validateParams({ ...base, batchSize: 7 });
    expect(candidateId(params, 'v1', 3)).toBe(candidateId(p2, 'v1', 3));
    expect(candidateId(params, 'v1', 3)).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('constraints are explained, never relaxed', () => {
  test('a lock outside the bounds names both', () => {
    const { problems } = validateParams({ ...base, locks: { accent: [0.95, 0.1, 30] } });
    expect(problems).toEqual([
      {
        field: 'locks.accent',
        message: 'accent is locked to lightness 0.95 but the lightness bounds are 0.3..0.85',
      },
    ]);
    expect(() => run({ ...base, locks: { accent: [0.95, 0.1, 30] } })).toThrow(ConstraintError);
  });

  test('a lock outside the hue arc is refused', () => {
    const { problems } = validateParams({
      ...base,
      bounds: { ...base.bounds, hue: { from: 350, to: 40 } },
      locks: { dominant: [0.5, 0.1, 180] },
    });
    expect(problems[0]?.message).toMatch(/hue 180° but the hue arc is 350° to 40°/);
  });

  test('structures state what they need', () => {
    expect(
      validateParams({
        ...base,
        structure: 'neutral-accent',
        bounds: { chroma: { min: 0.05, max: 0.2 } },
      }).problems[0]?.message,
    ).toMatch(/needs chroma below 0.02/);
    expect(
      validateParams({ ...base, structure: 'complementary', bounds: { hue: { from: 0, to: 90 } } })
        .problems[0]?.message,
    ).toMatch(/spans only 90°/);
    expect(validateParams({ ...base, structure: 'mutation' }).problems[0]?.message).toMatch(
      /needs a seedPalette/,
    );
    expect(validateParams({ ...base, structure: 'source-led' }).problems[0]?.message).toMatch(
      /at least one source colour/,
    );
    expect(
      validateParams({ ...base, bounds: { lightness: { min: 0.9, max: 0.1 } } }).problems[0]?.field,
    ).toBe('bounds.lightness');
  });

  test('locked roles keep their value in every candidate', () => {
    const { candidates } = run({ ...base, locks: { dominant: [0.5, 0.1, 30] } });
    for (const c of candidates) expect(c.colours[0]!.oklch).toEqual([0.5, 0.1, 30]);
    expect(candidates.length).toBeGreaterThan(50);
  });
});

describe('structures and bounds', () => {
  test('triadic hues are 120° apart before mapping', () => {
    const { candidates } = run(base);
    for (const c of candidates.slice(0, 20)) {
      const h = c.colours.map((x) => x.oklch[2]);
      const d = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
      expect(d(h[0]!, h[1]!)).toBeCloseTo(120, 6);
      expect(d(h[1]!, h[2]!)).toBeCloseTo(120, 6);
    }
  });

  test('a base hue pins the first role and the structure follows from it', () => {
    const { candidates } = run({ ...base, structure: 'complementary', baseHue: 200, count: 20 });
    for (const c of candidates) {
      expect(c.colours[0]!.oklch[2]).toBeCloseTo(200, 6);
      expect(c.colours[1]!.oklch[2]).toBeCloseTo(20, 6);
    }
    expect(
      validateParams({
        ...base,
        structure: 'monochromatic',
        baseHue: 200,
        bounds: { ...base.bounds, hue: { from: 0, to: 90 } },
      }).problems[0]?.field,
    ).toBe('baseHue');
  });

  test('neutral-accent keeps all but the accent under the threshold', () => {
    const { candidates } = run({
      ...base,
      structure: 'neutral-accent',
      bounds: { chroma: { min: 0, max: 0.2 } },
    });
    for (const c of candidates) {
      expect(c.colours[0]!.oklch[1]).toBeLessThan(0.02);
      expect(c.colours[1]!.oklch[1]).toBeLessThan(0.02);
      expect(c.colours[2]!.oklch[1]).toBeGreaterThanOrEqual(0.02);
      expect(c.features.chroma.neutralRoles).toBeGreaterThanOrEqual(2);
    }
  });

  test('a hue arc is respected, including one that crosses 0°', () => {
    const { candidates } = run({
      ...base,
      structure: 'analogous',
      bounds: { ...base.bounds, hue: { from: 340, to: 20 } },
    });
    for (const c of candidates)
      for (const x of c.colours)
        expect(x.oklch[2] >= 340 || x.oklch[2] <= 20, `${x.oklch[2]}`).toBe(true);
  });

  test('source-led draws only from the given colours and records their ids', () => {
    const sourceColours = [
      { id: 'rec-a', oklch: [0.6, 0.1, 40] as [number, number, number] },
      { id: 'rec-b', oklch: [0.4, 0.05, 250] as [number, number, number] },
    ];
    const { candidates } = run({ ...base, structure: 'source-led', sourceColours, count: 50 });
    for (const c of candidates)
      for (const x of c.colours) expect(['rec-a', 'rec-b']).toContain(x.sourceId);
  });

  test('nearby mutation stays close to the seed palette; distant moves far in hue', () => {
    const seedPalette: [number, number, number][] = [
      [0.5, 0.1, 30],
      [0.7, 0.05, 200],
      [0.4, 0.15, 100],
    ];
    const near = run({
      ...base,
      structure: 'mutation',
      strategy: 'nearby',
      seedPalette,
      count: 50,
    });
    for (const c of near.candidates)
      c.colours.forEach((x, i) =>
        expect(Math.abs(x.oklch[0] - seedPalette[i]![0])).toBeLessThanOrEqual(0.05 + 1e-9),
      );
    const far = run({
      ...base,
      structure: 'free-form',
      strategy: 'distant',
      seedPalette,
      count: 50,
    });
    const d = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
    for (const c of far.candidates)
      expect(d(c.colours[0]!.oklch[2], 30)).toBeGreaterThanOrEqual(89.9);
  });
});

describe('gamut, dedupe, features and manifest', () => {
  test('out-of-gamut draws are mapped with the policy recorded, or rejected when approximation is off', () => {
    const wide = {
      ...base,
      structure: 'free-form' as const,
      bounds: { lightness: { min: 0.5, max: 0.8 }, chroma: { min: 0, max: 0.35 } },
      count: 100,
    };
    const mapped = run(wide);
    expect(mapped.candidates.some((c) => c.features.gamut.mappedRoles > 0)).toBe(true);
    expect(
      mapped.candidates.every((c) =>
        c.colours.every((x) => x.output.coords.every((n) => n >= -1e-9 && n <= 1 + 1e-9)),
      ),
    ).toBe(true);
    const strict = run({ ...wide, output: { allowApproximate: false } });
    expect(strict.manifest.rejection_log.some((r) => r.reason.startsWith('out-of-gamut:'))).toBe(
      true,
    );
    expect(strict.manifest.counts.rejected + strict.manifest.counts.kept).toBe(100);
  });

  test('near duplicates are rejected with the id they duplicate; role order is preserved', () => {
    const { manifest, candidates } = run({
      ...base,
      structure: 'monochromatic',
      count: 400,
      bounds: { lightness: { min: 0.5, max: 0.52 }, chroma: { min: 0.05, max: 0.06 } },
      dedupe: { nearThreshold: 0.05 },
    });
    const near = manifest.rejection_log.filter((r) => r.reason.startsWith('near-duplicate-of:'));
    expect(near.length).toBeGreaterThan(0);
    const ids = new Set(manifest.candidate_ids);
    for (const r of near) expect(ids.has(r.reason.split(':')[1]!)).toBe(true);
    for (const c of candidates)
      expect(c.colours.map((x) => x.role)).toEqual(['dominant', 'secondary', 'accent']);
  });

  test('features carry versions, spaces and garment areas', () => {
    const { candidates } = run(base);
    const f = candidates[0]!.features;
    expect(f.version).toBe('1');
    expect(f.hue.space).toBe('oklch');
    expect(f.lightness.space).toBe('oklab-L');
    expect(f.differences).toHaveLength(3);
    expect(f.differences[0]!.ciede2000).toBeGreaterThan(0);
    expect(f.area?.map((a) => a.role)).toEqual(['dominant', 'secondary', 'accent']);
    expect(f.area!.reduce((s, a) => s + a.measured, 0)).toBeCloseTo(1, 9);
    expect(f.adjacencyContrast).toBeGreaterThan(0);
    expect(f.chroma.neutralThreshold).toBe(0.02);
  });

  test('the manifest records everything needed to replay', () => {
    const { manifest } = run(base, { contentVersion: 'abc' });
    expect(manifest).toMatchObject({
      schema_version: 1,
      generator: { name: 'sca-generator', version: '1' },
      seed: 4027,
      content_version: 'abc',
      status: 'complete',
    });
    expect(manifest.garment).toEqual({
      id: 'colour-block-jacket-v1',
      preset: 'preset-1-classic',
      view: 'front',
    });
    expect(manifest.counts.drawn).toBe(200);
    expect(manifest.counts.kept + manifest.counts.rejected).toBe(200);
    expect(manifest.candidate_ids).toHaveLength(manifest.counts.kept);
    expect(manifest.subset_ids).toHaveLength(10);
  });

  test('the diverse subset is deterministic and spreads out', () => {
    const { candidates } = run({ ...base, subset: 0 });
    const s = diverseSubset(candidates, 5);
    expect(s.map((c) => c.id)).toEqual(diverseSubset(candidates, 5).map((c) => c.id));
    expect(new Set(s.map((c) => c.id)).size).toBe(5);
    expect(diverseSubset(candidates, 0)).toEqual([]);
  });

  test('cancelling stops within one batch and marks the manifest', () => {
    let batches = 0;
    const { manifest, candidates } = run(base, {
      onProgress: () => batches++,
      shouldCancel: () => batches >= 2,
    });
    expect(manifest.status).toBe('cancelled');
    expect(manifest.counts.drawn).toBe(100);
    expect(candidates.length).toBe(manifest.counts.kept);
    expect(manifest.subset_ids).toEqual([]);
  });

  test('generate yields batches with the kept candidates', () => {
    const g = generate({ ...base, count: 60, batchSize: 25 });
    const sizes: number[] = [];
    let step = g.next();
    while (!step.done) {
      sizes.push(step.value.batch.length + step.value.rejections.length);
      step = g.next();
    }
    expect(sizes).toEqual([25, 25, 10]);
  });
});

describe('locks on roles other than the first', () => {
  test('a complementary palette with the secondary locked lands the dominant opposite it', () => {
    const { candidates } = run({
      seed: 3,
      count: 1,
      roles: ['dominant', 'secondary'],
      structure: 'complementary',
      locks: { secondary: [0.6, 0.15, 30] },
      bounds: { lightness: { min: 0.2, max: 0.9 }, chroma: { min: 0.05, max: 0.3 } },
    });
    const [dominant, secondary] = candidates[0]!.colours.map((c) => c.oklch[2]);
    expect(secondary).toBeCloseTo(30, 5);
    expect((((dominant! - 210) % 360) + 360) % 360).toBeCloseTo(0, 5);
  });
  test('a triadic palette with the accent locked keeps the three hues 120° apart', () => {
    const { candidates } = run({
      seed: 3,
      count: 1,
      roles: ['dominant', 'secondary', 'accent'],
      structure: 'triadic',
      locks: { accent: [0.6, 0.15, 100] },
      bounds: { lightness: { min: 0.2, max: 0.9 }, chroma: { min: 0.05, max: 0.3 } },
    });
    const hues = candidates[0]!.colours.map((c) => c.oklch[2]);
    expect(hues[2]).toBeCloseTo(100, 5);
    expect((((hues[0]! - 220) % 360) + 360) % 360).toBeCloseTo(0, 5);
    expect((((hues[1]! - 340) % 360) + 360) % 360).toBeCloseTo(0, 5);
  });
});
