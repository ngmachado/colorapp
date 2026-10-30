import { describe, expect, test } from 'vitest';
import { distinctness } from './distinct';

describe('palette distinctness under simulation', () => {
  test('every pair is measured in four views and the weakest pair is named', () => {
    const views = distinctness([
      [0.6, 0.2, 30],
      [0.6, 0.2, 140],
      [0.9, 0, 0],
    ]);
    expect(views.map((v) => v.view)).toEqual(['normal', 'protan', 'deutan', 'tritan']);
    for (const v of views) {
      expect(v.pairs).toHaveLength(3);
      expect(v.hexes).toHaveLength(3);
      expect(v.pairs.map((p) => p.distance)).toContain(v.weakest.distance);
    }
  });
  test('red and green move closer under protan simulation than as drawn', () => {
    const views = distinctness([
      [0.6, 0.2, 30],
      [0.6, 0.2, 140],
    ]);
    const normal = views[0]!.pairs[0]!.distance;
    const protan = views[1]!.pairs[0]!.distance;
    expect(protan).toBeLessThan(normal);
  });
  test('identical colours have zero distance everywhere', () => {
    for (const v of distinctness([
      [0.5, 0.1, 200],
      [0.5, 0.1, 200],
    ]))
      expect(v.weakest.distance).toBe(0);
  });
});
