import { describe, expect, test } from 'vitest';
import type { NamePoint } from './nearest';
import {
  gamutSegments,
  nearestPoints,
  parseHexList,
  readState,
  scenePosition,
  writeState,
} from './space';

const point = (id: string, group: string, oklab: [number, number, number]): NamePoint => ({
  id,
  conceptId: id.replace(/-srgb.*$/, ''),
  label: id,
  tradition: null,
  group,
  status: 'display-approximation',
  queue: false,
  oklab,
  hex: '#000000',
});

describe('space helpers', () => {
  test('hex lists parse once each, lowercase, at most eight, with OKLab positions', () => {
    const got = parseHexList('#663399, 663399 FFFFFF junk 00000');
    expect(got.map((c) => c.hex)).toEqual(['#663399', '#ffffff']);
    expect(got[1]!.lab[0]).toBeCloseTo(1, 3);
    expect(
      parseHexList(
        Array(12)
          .fill(0)
          .map((_, i) => `#${String(i).padStart(6, '0')}`)
          .join(' '),
      ).length,
    ).toBe(8);
  });

  test('scene positions put lightness up, a across and b in depth, centred on mid lightness', () => {
    expect(scenePosition([0.5, 0, 0])).toEqual([0, 0, -0]);
    expect(scenePosition([1, 0.2, -0.1])).toEqual([20, 50, 10]);
  });

  test('nearest points respect the collection and the excluded concept', () => {
    const pts = [
      point('a-srgb', 'web', [0.5, 0, 0]),
      point('b-srgb', 'japanese', [0.5, 0.01, 0]),
      point('c-srgb', 'web', [0.5, 0.1, 0]),
    ];
    expect(nearestPoints(pts, [0.5, 0, 0], 2).map((p) => p.id)).toEqual(['a-srgb', 'b-srgb']);
    expect(nearestPoints(pts, [0.5, 0, 0], 2, 'web').map((p) => p.id)).toEqual([
      'a-srgb',
      'c-srgb',
    ]);
    expect(nearestPoints(pts, [0.5, 0, 0], 1, 'all', 'a').map((p) => p.id)).toEqual(['b-srgb']);
  });

  test('the gamut wireframe is twelve curved edges of segment pairs inside the solid', () => {
    const seg = gamutSegments(8);
    expect(seg.length).toBe(12 * 8 * 2);
    for (const [x, y, z] of seg) {
      expect(Math.abs(x)).toBeLessThan(45);
      expect(y).toBeGreaterThanOrEqual(-50.01);
      expect(y).toBeLessThanOrEqual(50.01);
      expect(Math.abs(z)).toBeLessThan(45);
    }
  });

  test('state round-trips through the URL and falls back to defaults', () => {
    expect(readState({})).toEqual({ hexes: [], set: 'all', band: false, l: 0.72, focus: null });
    const s = readState({
      hex: '663399,FFFFFF',
      set: 'jis-z8102',
      band: '1',
      l: '0.4',
      focus: 'ja-ai',
    });
    expect(s).toEqual({
      hexes: ['#663399', '#ffffff'],
      set: 'jis-z8102',
      band: true,
      l: 0.4,
      focus: 'ja-ai',
    });
    expect(writeState(s)).toBe(
      '/space?hex=663399%2Cffffff&set=jis-z8102&band=1&l=0.40&focus=ja-ai',
    );
    expect(writeState(readState({}))).toBe('/space');
    expect(readState({ l: '7' }).l).toBe(1);
  });
});
