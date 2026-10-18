import type { Preset, RegionId, Role, View } from './types';
import { REGION_IDS, ROLES } from './types';
import measurements from './measurements.generated.json' with { type: 'json' };

export interface ViewMeasurement {
  pixels: number;
  /** Share of garment pixels per region (background excluded). Regions absent from the view are 0. */
  regionShare: Record<RegionId, number>;
  /** Shared boundary between region pairs as a share of all internal boundaries in the view. */
  adjacency: { a: RegionId; b: RegionId; share: number }[];
}

export interface Measurements {
  garment: string;
  /** Hash of the SVG sources the numbers were measured from. A mismatch means re-run the asset script. */
  svgHash: string;
  width: number;
  views: Record<View, ViewMeasurement>;
}

export const MEASUREMENTS = measurements as Measurements;

/** Visible share per role for a preset in a view. A two-role stripe panel is split equally. */
export function roleShares(preset: Preset, view: View): Record<Role, number> {
  const out: Record<Role, number> = { dominant: 0, secondary: 0, accent: 0 };
  const shares = MEASUREMENTS.views[view].regionShare;
  for (const region of REGION_IDS) {
    const a = preset.roles[region];
    const s = shares[region] ?? 0;
    if (typeof a === 'string') out[a] += s;
    else {
      out[a.roles[0]] += s / 2;
      out[a.roles[1]] += s / 2;
    }
  }
  return out;
}

/** Boundary share between roles that touch, for adjacency-contrast features. */
export function roleAdjacency(preset: Preset, view: View): { a: Role; b: Role; share: number }[] {
  const acc = new Map<string, number>();
  const roleOf = (r: RegionId): Role[] => {
    const a = preset.roles[r];
    return typeof a === 'string' ? [a] : a.roles;
  };
  for (const edge of MEASUREMENTS.views[view].adjacency) {
    for (const ra of roleOf(edge.a)) {
      for (const rb of roleOf(edge.b)) {
        if (ra === rb) continue;
        const key = [ra, rb].sort().join('|');
        acc.set(key, (acc.get(key) ?? 0) + edge.share);
      }
    }
  }
  return [...acc.entries()].map(([k, share]) => {
    const [a, b] = k.split('|') as [Role, Role];
    return { a, b, share };
  });
}

/** Nominal target versus measured share, for the area panel. */
export function targetVsMeasured(preset: Preset, view: View) {
  const measured = roleShares(preset, view);
  return ROLES.map((role) => ({ role, target: preset.target[role], measured: measured[role] }));
}
