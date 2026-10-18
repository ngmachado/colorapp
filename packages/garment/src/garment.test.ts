import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { describe, expect, test } from 'vitest';
import { applyPalette, renderPreset, renderSvg, type Palette } from './apply';
import { MEASUREMENTS, roleAdjacency, roleShares, targetVsMeasured } from './measure';
import { PRESETS, preset } from './presets';
import { SVG } from './svg.generated';
import { REGIONS, REGION_IDS, ROLES, VIEWS, type RegionId } from './types';

const palette: Palette = { dominant: '#2f4858', secondary: '#c9b79c', accent: '#d1495b' };

describe('regions are stable', () => {
  test.each(VIEWS)(
    '%s view: every region drawn in it appears exactly once, and nothing else',
    (view) => {
      const found = [...SVG[view].matchAll(/data-region="([a-z-]+)"/g)].map((m) => m[1]!);
      const expected = REGION_IDS.filter((r) => REGIONS[r].views.includes(view));
      expect([...found].sort()).toEqual([...expected].sort());
      for (const r of expected)
        expect(SVG[view].split(`{{${r}}}`).length - 1, `${view} fill placeholder for ${r}`).toBe(1);
    },
  );

  test('the ten region ids are the documented set', () => {
    expect(REGION_IDS).toEqual([
      'body',
      'sleeve-left',
      'sleeve-right',
      'collar',
      'lining',
      'cuffs',
      'trim',
      'buttons',
      'panel-a',
      'panel-b',
    ]);
  });
});

describe('measurements', () => {
  test('were measured from the current SVG sources', () => {
    const hash = bytesToHex(sha256(new TextEncoder().encode(SVG.front + SVG.back))).slice(0, 16);
    expect(
      MEASUREMENTS.svgHash,
      'run `pnpm --filter @sca/garment asset` after editing assets/*.svg',
    ).toBe(hash);
  });

  test.each(VIEWS)(
    '%s: region shares sum to 1 excluding background; absent regions are 0',
    (view) => {
      const m = MEASUREMENTS.views[view];
      const sum = Object.values(m.regionShare).reduce((a, b) => a + b, 0);
      expect(Math.abs(sum - 1)).toBeLessThan(1e-9);
      for (const r of REGION_IDS) {
        if (REGIONS[r].views.includes(view)) expect(m.regionShare[r], r).toBeGreaterThan(0);
        else expect(m.regionShare[r], r).toBe(0);
      }
      const adj = m.adjacency.reduce((a, e) => a + e.share, 0);
      expect(Math.abs(adj - 1)).toBeLessThan(1e-9);
      expect(m.pixels).toBeGreaterThan(100000);
    },
  );
});

describe('presets', () => {
  test('there are four, each assigning every region', () => {
    expect(PRESETS).toHaveLength(4);
    for (const p of PRESETS) {
      expect(Object.keys(p.roles).sort()).toEqual([...REGION_IDS].sort());
      expect(Math.abs(ROLES.reduce((a, r) => a + p.target[r], 0) - 1)).toBeLessThan(1e-9);
    }
  });

  test.each(PRESETS.map((p) => [p.id] as const))(
    '%s: role shares sum to 1 in both views and differ between views',
    (id) => {
      const p = preset(id);
      const front = roleShares(p, 'front');
      const back = roleShares(p, 'back');
      for (const s of [front, back])
        expect(Math.abs(ROLES.reduce((a, r) => a + s[r], 0) - 1)).toBeLessThan(1e-9);
      expect(front).not.toEqual(back);
      const t = targetVsMeasured(p, 'front');
      expect(t.map((x) => x.role)).toEqual(ROLES);
    },
  );

  test('front and back of one preset share the role mapping; only measured areas differ', () => {
    const p = preset('preset-2-sleeves');
    const fillsFront = applyPalette(p, palette);
    const fillsBack = applyPalette(p, palette);
    expect(fillsFront).toEqual(fillsBack);
    expect(roleShares(p, 'front').secondary).not.toBeCloseTo(roleShares(p, 'back').secondary, 3);
  });

  test('role adjacency only lists roles that touch', () => {
    const adj = roleAdjacency(preset('preset-1-classic'), 'front');
    expect(adj.every((e) => e.a !== e.b)).toBe(true);
    expect(adj.some((e) => [e.a, e.b].includes('accent'))).toBe(true);
  });
});

describe('applying a palette', () => {
  test('changing one role moves only the regions mapped to that role', () => {
    const p = preset('preset-3-panels');
    const before = applyPalette(p, palette);
    const after = applyPalette(p, { ...palette, accent: '#000000' });
    const accentRegions = REGION_IDS.filter((r) => p.roles[r] === 'accent');
    for (let i = 0; i < before.length; i++) {
      const region = before[i]!.region as RegionId;
      if (accentRegions.includes(region)) expect(after[i]!.fill).toBe('#000000');
      else expect(after[i]).toEqual(before[i]);
    }
  });

  test('a stripe panel carries both role colours', () => {
    const f = applyPalette(preset('preset-4-stripe-band'), palette).find(
      (x) => x.region === 'panel-b',
    )!;
    expect(typeof f.fill).toBe('object');
    if (typeof f.fill !== 'string')
      expect(f.fill.fills).toEqual([palette.dominant, palette.accent]);
  });

  test('renderSvg replaces every placeholder and inserts pattern defs', () => {
    const svg = renderPreset('front', preset('preset-4-stripe-band'), palette);
    expect(svg).not.toMatch(/\{\{/);
    expect(svg).toContain('<pattern id="pat-panel-b"');
    expect(svg).toContain('fill="url(#pat-panel-b)"');
    expect(renderPreset('back', preset('preset-1-classic'), palette)).toContain(
      `fill="${palette.accent}"`,
    );
  });

  test('renderSvg refuses an incomplete fill list', () => {
    expect(() => renderSvg('front', [{ region: 'body', fill: '#fff' }])).toThrow(
      /unfilled region in front/,
    );
  });
});
