import type { GeneratorParams, Role } from './types';

export const norm = (h: number) => ((h % 360) + 360) % 360;

/** Default structure angles, in OKLCh degrees. Product proposals, not laws. */
export const DEFAULTS = { span_deg: 30, split_deg: 30, angle_deg: 60 };

/**
 * Hue angle per role for a wheel structure, given the base hue. The first role is the base.
 * Structures with fewer named hues than roles cycle through their hue set.
 */
export function structureHues(
  params: GeneratorParams,
  baseHue: number,
  rng: { between(a: number, b: number): number },
): number[] {
  const n = params.roles.length;
  const p = { ...DEFAULTS, ...params.structureParams };
  let hues: number[];
  switch (params.structure) {
    case 'monochromatic':
    case 'neutral-accent':
      hues = [baseHue];
      break;
    case 'analogous':
      hues = [
        baseHue,
        ...Array.from({ length: n - 1 }, () => baseHue + rng.between(-p.span_deg, p.span_deg)),
      ];
      break;
    case 'complementary':
      hues = [baseHue, baseHue + 180];
      break;
    case 'split-complementary':
      hues = [baseHue, baseHue + 180 - p.split_deg, baseHue + 180 + p.split_deg];
      break;
    case 'triadic':
      hues = [baseHue, baseHue + 120, baseHue + 240];
      break;
    case 'tetradic':
      hues = [baseHue, baseHue + p.angle_deg, baseHue + 180, baseHue + 180 + p.angle_deg];
      break;
    case 'free-form':
    case 'source-led':
    case 'mutation':
      return Array.from({ length: n }, (_, i) => (i === 0 ? baseHue : Number.NaN));
  }
  return Array.from({ length: n }, (_, i) => norm(hues[i % hues.length]!));
}

/** Roles that must stay near-neutral under the neutral-accent structure: every role except the accent. */
export function neutralRoles(params: GeneratorParams): Role[] {
  if (params.structure !== 'neutral-accent') return [];
  return params.roles.filter((r) => r !== 'accent');
}
