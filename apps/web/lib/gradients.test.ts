import { describe, expect, test } from 'vitest';
import { gradientCss, gradientSnippet, gradientStops } from './gradients';

describe('two-space gradients', () => {
  test('sRGB interpolation is gamma-encoded, as CSS in srgb', () => {
    const stops = gradientStops('#000000', '#ffffff', 'srgb', 'shorter', 3);
    expect(stops.map((s) => s.hex)).toEqual(['#000000', '#808080', '#ffffff']);
    expect(stops.every((s) => !s.mapped)).toBe(true);
  });
  test('OKLCh follows the declared hue path: longer goes the other way round', () => {
    const shorter = gradientStops('#ff0000', '#0000ff', 'oklch', 'shorter', 3)[1]!.hex;
    const longer = gradientStops('#ff0000', '#0000ff', 'oklch', 'longer', 3)[1]!.hex;
    expect(shorter).not.toBe(longer);
    // Red to blue the short way passes through purple; the long way passes through green.
    const g = (h: string) => parseInt(h.slice(3, 5), 16);
    expect(g(longer)).toBeGreaterThan(g(shorter));
  });
  test('stops that leave sRGB are mapped and flagged', () => {
    const stops = gradientStops('#00ff00', '#ff00ff', 'oklch', 'shorter', 9);
    expect(stops.some((s) => s.mapped)).toBe(true);
    for (const s of stops) expect(s.hex).toMatch(/^#[0-9a-f]{6}$/);
  });
  test('CSS carries the native syntax and a stop-list fallback', () => {
    const css = gradientCss('#ff0000', '#0000ff', 'oklch', 'longer', 3);
    expect(css.native).toBe('linear-gradient(90deg in oklch longer hue, #ff0000, #0000ff)');
    expect(css.fallback).toMatch(
      /^linear-gradient\(90deg, #ff0000 0%, #[0-9a-f]{6} 50%, #0000ff 100%\)$/,
    );
    const snippet = gradientSnippet('#ff0000', '#0000ff', 'longer', 3);
    expect(snippet).toContain('.gradient-srgb');
    expect(snippet).toContain('in oklch longer hue');
    expect(snippet).toContain('neither is "correct"');
  });
});
