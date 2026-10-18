import { colour, deltaE, hueDistance } from '@sca/colour-engine';
import { preset as getPreset, roleAdjacency, roleShares } from '@sca/garment';
import type { CandidateColour, Features, GeneratorParams } from './types';
import { FEATURES_VERSION } from './types';

type Lab = [number, number, number];

export const oklabDistance = (a: Lab, b: Lab) =>
  Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);

const chromaOf = (lab: Lab) => Math.hypot(lab[1], lab[2]);
const hueOf = (lab: Lab) => ((Math.atan2(lab[2], lab[1]) * 180) / Math.PI + 360) % 360;

/** Measured features of one candidate. Every number names its space; nothing here is a beauty score. */
export function features(colours: CandidateColour[], params: GeneratorParams): Features {
  const labs = colours.map((c) => c.mapped.oklab);
  const L = labs.map((l) => l[0]);
  const C = labs.map(chromaOf);
  const t = params.neutralThreshold;

  const chromatic = labs.filter((l) => chromaOf(l) >= t);
  const seps: number[] = [];
  for (let i = 0; i < chromatic.length; i++)
    for (let j = i + 1; j < chromatic.length; j++)
      seps.push(hueDistance(hueOf(chromatic[i]!), hueOf(chromatic[j]!)));

  const sortedL = [...L].sort((a, b) => a - b);
  const steps = sortedL.slice(1).map((v, i) => v - sortedL[i]!);

  const differences: Features['differences'] = [];
  for (let i = 0; i < colours.length; i++) {
    for (let j = i + 1; j < colours.length; j++) {
      const a = colour('oklab', labs[i]!);
      const b = colour('oklab', labs[j]!);
      differences.push({
        a: colours[i]!.role,
        b: colours[j]!.role,
        oklab: oklabDistance(labs[i]!, labs[j]!),
        ciede2000: deltaE(a, b, 'ciede2000').value,
      });
    }
  }

  let area: Features['area'] = null;
  let areaWeighted: number | null = null;
  let adjacencyContrast: number | null = null;
  if (params.garment) {
    const p = getPreset(params.garment.preset);
    const shares = roleShares(p, params.garment.view);
    // Only the three garment roles have regions; extra roles have no area on the garment.
    const share = (r: string) => (r in shares ? shares[r as keyof typeof shares] : 0);
    const target = (r: string) => (r in p.target ? p.target[r as keyof typeof p.target] : 0);
    area = colours.map((c) => ({ role: c.role, target: target(c.role), measured: share(c.role) }));
    areaWeighted = colours.reduce((acc, c, i) => acc + share(c.role) * L[i]!, 0);
    const labByRole = Object.fromEntries(colours.map((c) => [c.role, c.mapped.oklab])) as Record<
      string,
      Lab
    >;
    adjacencyContrast = roleAdjacency(p, params.garment.view).reduce((acc, e) => {
      const a = labByRole[e.a];
      const b = labByRole[e.b];
      return a && b ? acc + e.share * oklabDistance(a, b) : acc;
    }, 0);
  }

  const mapped = colours.filter((c) => c.mapped.policy !== null);
  return {
    version: FEATURES_VERSION,
    hue: {
      minSeparationDeg: seps.length ? Math.min(...seps) : null,
      meanSeparationDeg: seps.length ? seps.reduce((a, b) => a + b, 0) / seps.length : null,
      space: 'oklch',
    },
    lightness: {
      min: Math.min(...L),
      max: Math.max(...L),
      range: Math.max(...L) - Math.min(...L),
      steps,
      areaWeighted,
      space: 'oklab-L',
    },
    chroma: {
      min: Math.min(...C),
      max: Math.max(...C),
      spread: Math.max(...C) - Math.min(...C),
      neutralRoles: C.filter((c) => c < t).length,
      neutralThreshold: t,
      space: 'oklch-C',
    },
    differences,
    area,
    adjacencyContrast,
    gamut: {
      mappedRoles: mapped.length,
      maxDelta: mapped.reduce((m, c) => Math.max(m, c.mapped.delta), 0),
      policy: params.output.policy,
    },
  };
}
