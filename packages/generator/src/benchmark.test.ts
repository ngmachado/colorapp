import { expect, test } from 'vitest';
import { run } from './pipeline';

/**
 * Chunk 5 acceptance: 10,000 candidates generate, dedupe and feature within a stated budget.
 * Measured on the development laptop; see README for the recorded figure.
 */
test('10,000 candidates in under 60 seconds', () => {
  const t0 = performance.now();
  const { manifest } = run({
    seed: 1,
    count: 10000,
    structure: 'free-form',
    bounds: { lightness: { min: 0.2, max: 0.9 }, chroma: { min: 0, max: 0.25 } },
    garment: { preset: 'preset-2-sleeves', view: 'front' },
    subset: 200,
    batchSize: 1000,
  });
  const ms = performance.now() - t0;
  console.log(
    `benchmark: 10,000 drawn, ${manifest.counts.kept} kept, ${manifest.counts.rejected} rejected, subset ${manifest.counts.subset}, ${Math.round(ms)} ms`,
  );
  expect(manifest.status).toBe('complete');
  expect(manifest.counts.kept).toBeGreaterThan(9000);
  expect(ms).toBeLessThan(60000);
}, 120000);
