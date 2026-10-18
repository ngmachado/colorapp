import { z } from 'zod';

export const GENERATOR_VERSION = '1';
export const FEATURES_VERSION = '1';

export const Role = z.enum(['dominant', 'secondary', 'accent', 'support', 'highlight']);
export type Role = z.infer<typeof Role>;

export const Structure = z.enum([
  'monochromatic',
  'analogous',
  'complementary',
  'split-complementary',
  'triadic',
  'tetradic',
  'neutral-accent',
  'free-form',
  'source-led',
  'mutation',
]);
export type Structure = z.infer<typeof Structure>;

export const Strategy = z.enum(['stratified', 'sweep', 'nearby', 'distant']);
export type Strategy = z.infer<typeof Strategy>;

/** OKLCh triple: L 0..1, C >= 0, h degrees. */
export const Oklch = z.tuple([z.number().min(0).max(1), z.number().min(0), z.number()]);
export type Oklch = z.infer<typeof Oklch>;

const Range = z
  .strictObject({ min: z.number(), max: z.number() })
  .refine((r) => r.min <= r.max, { message: 'min must not exceed max' });

export const GeneratorParams = z.strictObject({
  seed: z.number().int().min(0),
  /** Candidates to draw before rejection and deduplication. */
  count: z.number().int().min(1).max(100000),
  /** Ordered roles. Order is the layer order and is preserved through deduplication. */
  roles: z.array(Role).min(1).max(5).default(['dominant', 'secondary', 'accent']),
  structure: Structure,
  structureParams: z
    .strictObject({
      span_deg: z.number().min(0).max(180).optional(),
      split_deg: z.number().min(0).max(90).optional(),
      angle_deg: z.number().min(0).max(180).optional(),
      /** Nearby mutation size in OKLCh units (L, C) and degrees (h). */
      mutation: z
        .strictObject({ l: z.number().min(0), c: z.number().min(0), h_deg: z.number().min(0) })
        .optional(),
    })
    .prefault({}),
  /** OKLCh bounds. Hue is circular: from 350 to 10 is a 20° arc through 0. */
  bounds: z.strictObject({
    hue: z.strictObject({ from: z.number(), to: z.number() }).optional(),
    lightness: Range.default({ min: 0.15, max: 0.95 }),
    chroma: Range.default({ min: 0, max: 0.3 }),
  }),
  /** Start from a hue family: the base hue for every candidate, in OKLCh degrees. Other hues follow the structure rule. */
  baseHue: z.number().optional(),
  /** Locked role values. Never relaxed: a lock outside the bounds is a validation error. */
  locks: z.partialRecord(Role, Oklch).default({}),
  /** OKLCh chroma below this counts as near-neutral. Always reported with the result. */
  neutralThreshold: z.number().min(0).default(0.02),
  output: z
    .strictObject({
      gamut: z.enum(['srgb', 'display-p3']).default('srgb'),
      policy: z.enum(['clip', 'css', 'oklch-chroma']).default('css'),
      /** If false, an out-of-gamut candidate is rejected instead of mapped. */
      allowApproximate: z.boolean().default(true),
    })
    .prefault({}),
  strategy: Strategy.default('stratified'),
  /** Starting palette for mutation, nearby and distant strategies. One entry per role. */
  seedPalette: z.array(Oklch).optional(),
  /** Colours drawn from a source record for source-led generation, with the record ids they came from. */
  sourceColours: z.array(z.strictObject({ id: z.string(), oklch: Oklch })).optional(),
  dedupe: z.strictObject({ nearThreshold: z.number().min(0).default(0.02) }).prefault({}),
  /** Garment preset and view used for area features. */
  garment: z
    .strictObject({ preset: z.string(), view: z.enum(['front', 'back']).default('front') })
    .optional(),
  /** Size of the diverse review subset selected by farthest-point sampling. 0 = none. */
  subset: z.number().int().min(0).default(0),
  batchSize: z.number().int().min(1).default(500),
});

export type GeneratorParamsInput = z.input<typeof GeneratorParams>;
export type GeneratorParams = z.infer<typeof GeneratorParams>;

export interface ConstraintProblem {
  field: string;
  message: string;
}

export interface CandidateColour {
  role: Role;
  /** Working-space value before gamut mapping. */
  oklch: Oklch;
  /** Value in the output gamut, as OKLab for features and as the output space coords for display. */
  mapped: { oklab: [number, number, number]; policy: string | null; delta: number };
  output: { space: string; coords: [number, number, number] };
  /** For source-led candidates: which record the colour came from. */
  sourceId?: string;
}

export interface Candidate {
  id: string;
  index: number;
  colours: CandidateColour[];
  features: Features;
}

export interface Features {
  version: string;
  hue: { minSeparationDeg: number | null; meanSeparationDeg: number | null; space: 'oklch' };
  lightness: {
    min: number;
    max: number;
    range: number;
    steps: number[];
    areaWeighted: number | null;
    space: 'oklab-L';
  };
  chroma: {
    min: number;
    max: number;
    spread: number;
    neutralRoles: number;
    neutralThreshold: number;
    space: 'oklch-C';
  };
  differences: { a: Role; b: Role; oklab: number; ciede2000: number }[];
  area: { role: Role; target: number; measured: number }[] | null;
  adjacencyContrast: number | null;
  gamut: { mappedRoles: number; maxDelta: number; policy: string };
}

export interface Rejection {
  index: number;
  reason: string;
}

export interface Manifest {
  schema_version: 1;
  generator: { name: 'sca-generator'; version: string; features_version: string };
  seed: number;
  params: GeneratorParams;
  content_version: string | null;
  garment: { id: string; preset: string; view: string } | null;
  status: 'running' | 'complete' | 'cancelled';
  counts: { requested: number; drawn: number; rejected: number; kept: number; subset: number };
  rejection_log: Rejection[];
  candidate_ids: string[];
  subset_ids: string[];
}
