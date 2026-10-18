import { SVG } from './svg.generated';
import {
  REGION_IDS,
  type PatternFill,
  type Preset,
  type RegionId,
  type Role,
  type View,
} from './types';

export type Palette = Record<Role, string>;

export interface RegionFill {
  region: RegionId;
  fill: string | { pattern: PatternFill; fills: [string, string] };
}

/**
 * Maps a palette (one display colour string per role) onto a preset's regions.
 * Pure data out: the host draws it. A region's fill depends only on its own assignment.
 */
export function applyPalette(preset: Preset, palette: Palette): RegionFill[] {
  return REGION_IDS.map((region) => {
    const a = preset.roles[region];
    if (typeof a === 'string') return { region, fill: palette[a] };
    return { region, fill: { pattern: a, fills: [palette[a.roles[0]], palette[a.roles[1]]] } };
  });
}

function patternDef(region: RegionId, p: PatternFill, fills: [string, string]): string {
  const half = p.scale / 2;
  return (
    `<pattern id="pat-${region}" patternUnits="userSpaceOnUse" width="${p.scale}" height="${p.scale}" patternTransform="rotate(${p.orientation})">` +
    `<rect width="${p.scale}" height="${half}" fill="${fills[0]}"/><rect y="${half}" width="${p.scale}" height="${half}" fill="${fills[1]}"/></pattern>`
  );
}

/** Renders a view with the given fills as an SVG string. Every placeholder is replaced; none may remain. */
export function renderSvg(view: View, fills: RegionFill[]): string {
  let svg = SVG[view];
  const defs: string[] = [];
  for (const f of fills) {
    const value = typeof f.fill === 'string' ? f.fill : `url(#pat-${f.region})`;
    if (typeof f.fill !== 'string') defs.push(patternDef(f.region, f.fill.pattern, f.fill.fills));
    svg = svg.replaceAll(`{{${f.region}}}`, value);
  }
  if (defs.length) svg = svg.replace('<title>', `<defs>${defs.join('')}</defs><title>`);
  if (/\{\{[a-z-]+\}\}/.test(svg))
    throw new Error(`unfilled region in ${view}: ${svg.match(/\{\{[a-z-]+\}\}/)![0]}`);
  return svg;
}

/** Convenience: preset + palette → SVG string for a view. */
export function renderPreset(view: View, preset: Preset, palette: Palette): string {
  return renderSvg(view, applyPalette(preset, palette));
}
