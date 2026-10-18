import {
  colour,
  convert,
  inGamut,
  toGamut,
  type ColourValue,
  type GamutPolicy,
} from '@sca/colour-engine';
import { GARMENT_ID } from '@sca/garment';
import { features, oklabDistance } from './features';
import { candidateId } from './id';
import { Rng, deriveSeed } from './rng';
import { neutralRoles, norm, structureHues } from './rules';
import { diverseSubset } from './subset';
import type {
  Candidate,
  CandidateColour,
  GeneratorParams,
  GeneratorParamsInput,
  Manifest,
  Oklch,
  Rejection,
  Role,
} from './types';
import { FEATURES_VERSION, GENERATOR_VERSION } from './types';
import { hueArc, validateParams } from './validate';

export interface Progress {
  drawn: number;
  kept: number;
  rejected: number;
  /** Candidates kept in this batch, ready to persist. */
  batch: Candidate[];
  rejections: Rejection[];
}

export interface GenerateOptions {
  contentVersion?: string | null;
}

export class ConstraintError extends Error {
  constructor(public problems: { field: string; message: string }[]) {
    super(problems.map((p) => `${p.field}: ${p.message}`).join('; '));
    this.name = 'ConstraintError';
  }
}

const EPS = 1e-6;

function drawOne(
  params: GeneratorParams,
  index: number,
): { role: Role; oklch: Oklch; sourceId?: string }[] {
  const rng = new Rng(deriveSeed(params.seed, index));
  const arc = hueArc(params.bounds.hue);
  const { lightness, chroma } = params.bounds;
  const neutral = new Set(neutralRoles(params));
  const t = params.neutralThreshold;
  const seedPalette = params.seedPalette;
  const mut = { l: 0.05, c: 0.03, h_deg: 15, ...params.structureParams.mutation };

  const lockedChromatic = params.roles.find((r) => params.locks[r] && params.locks[r]![1] >= t);
  let baseHue: number;
  if (lockedChromatic) {
    // The lock may sit on any role. Solve for the base hue so the rule lands that role on the locked hue.
    // The offsets come from a second generator with the same seed, so the main sequence is untouched.
    const k = params.roles.indexOf(lockedChromatic);
    const offset = structureHues(params, 0, new Rng(deriveSeed(params.seed, index)))[k];
    baseHue = params.locks[lockedChromatic]![2] - (k > 0 && Number.isFinite(offset) ? offset! : 0);
  } else if (params.baseHue !== undefined) baseHue = params.baseHue;
  else if (params.strategy === 'nearby' && seedPalette)
    baseHue = seedPalette[0]![2] + rng.jitter(mut.h_deg);
  else if (params.strategy === 'distant' && seedPalette)
    baseHue = seedPalette[0]![2] + rng.between(90, 270);
  else if (params.strategy === 'sweep')
    baseHue = arc.from + ((index + 0.5) / params.count) * arc.span;
  else
    baseHue =
      arc.from + ((index + 0.5) / params.count) * arc.span + rng.jitter(arc.span / params.count);
  baseHue = norm(baseHue);
  if (arc.span < 360) {
    const d = (((baseHue - arc.from) % 360) + 360) % 360;
    if (d > arc.span) baseHue = norm(arc.from + Math.min(d, arc.span));
  }

  const hues = structureHues(params, baseHue, rng);
  const hueInArc = (h: number) =>
    arc.span >= 360 || (((h - arc.from) % 360) + 360) % 360 <= arc.span + EPS;
  const clampHue = (h: number) =>
    hueInArc(h) ? norm(h) : norm(arc.from + rng.between(0, arc.span));

  return params.roles.map((role, k) => {
    const lock = params.locks[role];
    if (lock) return { role, oklch: [lock[0], lock[1], norm(lock[2])] };

    if (params.structure === 'source-led' && params.sourceColours?.length) {
      const pick = params.sourceColours[Math.floor(rng.next() * params.sourceColours.length)]!;
      return {
        role,
        oklch: [pick.oklch[0], pick.oklch[1], norm(pick.oklch[2])],
        sourceId: pick.id,
      };
    }

    if ((params.structure === 'mutation' || params.strategy === 'nearby') && seedPalette) {
      const s = seedPalette[k]!;
      const l = Math.min(lightness.max, Math.max(lightness.min, s[0] + rng.jitter(mut.l)));
      const c = Math.min(chroma.max, Math.max(chroma.min, s[1] + rng.jitter(mut.c)));
      return { role, oklch: [l, c, clampHue(s[2] + rng.jitter(mut.h_deg))] };
    }

    const isNeutral = neutral.has(role);
    const cMin =
      role === 'accent' && params.structure === 'neutral-accent'
        ? Math.max(chroma.min, t)
        : chroma.min;
    const cMax = isNeutral ? Math.min(chroma.max, Math.max(chroma.min, t - EPS)) : chroma.max;
    const c = rng.between(cMin, cMax);
    const l = rng.between(lightness.min, lightness.max);
    const h = Number.isNaN(hues[k]!)
      ? norm(arc.from + rng.between(0, arc.span))
      : clampHue(hues[k]!);
    return { role, oklch: [l, c, h] };
  });
}

function mapColour(
  draw: { role: Role; oklch: Oklch; sourceId?: string },
  params: GeneratorParams,
): { colour?: CandidateColour; reason?: string } {
  const v = colour('oklch', draw.oklch);
  const gamut = params.output.gamut;
  let out: ColourValue;
  if (inGamut(v, gamut)) out = convert(v, gamut);
  else if (!params.output.allowApproximate) return { reason: `out-of-gamut:${draw.role}` };
  else out = toGamut(v, gamut, params.output.policy as GamutPolicy);

  const lab = convert(out, 'oklab').coords;
  const lch = convert(out, 'oklch').coords;
  const { lightness, chroma } = params.bounds;
  if (lch[0] < lightness.min - 0.01 || lch[0] > lightness.max + 0.01)
    return { reason: `mapped-outside-bounds:${draw.role}:lightness` };
  if (lch[1] < chroma.min - 0.005) return { reason: `mapped-outside-bounds:${draw.role}:chroma` };

  const c: CandidateColour = {
    role: draw.role,
    oklch: draw.oklch,
    mapped: { oklab: lab, policy: out.mapped?.policy ?? null, delta: out.mapped?.delta.value ?? 0 },
    output: { space: gamut, coords: out.coords },
  };
  if (draw.sourceId) c.sourceId = draw.sourceId;
  return { colour: c };
}

/**
 * Generates candidates in batches. Yields progress with the kept candidates of each batch; returns the manifest.
 * Same seed and parameters give the same candidate ids and coordinates in any JavaScript runtime.
 */
export function* generate(
  input: GeneratorParamsInput,
  options: GenerateOptions = {},
): Generator<Progress, { manifest: Manifest; candidates: Candidate[] }, boolean | undefined> {
  const { params, problems } = validateParams(input);
  if (problems.length) throw new ConstraintError(problems);
  const contentVersion = options.contentVersion ?? null;

  const manifest: Manifest = {
    schema_version: 1,
    generator: {
      name: 'sca-generator',
      version: GENERATOR_VERSION,
      features_version: FEATURES_VERSION,
    },
    seed: params.seed,
    params,
    content_version: contentVersion,
    garment: params.garment
      ? { id: GARMENT_ID, preset: params.garment.preset, view: params.garment.view }
      : null,
    status: 'running',
    counts: { requested: params.count, drawn: 0, rejected: 0, kept: 0, subset: 0 },
    rejection_log: [],
    candidate_ids: [],
    subset_ids: [],
  };

  const kept: Candidate[] = [];
  const exact = new Set<string>();
  // Near-duplicate search: candidates bucketed by the first role's OKLab cell (cell = threshold), so only
  // neighbouring cells are compared. A duplicate must be within the threshold on every role, so on the first too.
  const cell = params.dedupe.nearThreshold || 1e-9;
  const buckets = new Map<string, number[]>();
  const cellKey = (lab: [number, number, number]) =>
    `${Math.floor(lab[0] / cell)},${Math.floor(lab[1] / cell)},${Math.floor(lab[2] / cell)}`;
  const nearDuplicate = (colours: CandidateColour[]): Candidate | undefined => {
    const first = colours[0]!.mapped.oklab;
    const cx = Math.floor(first[0] / cell);
    const cy = Math.floor(first[1] / cell);
    const cz = Math.floor(first[2] / cell);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const list = buckets.get(`${cx + dx},${cy + dy},${cz + dz}`);
          if (!list) continue;
          for (const idx of list) {
            const other = kept[idx]!;
            let maxD = 0;
            for (let i = 0; i < colours.length; i++)
              maxD = Math.max(
                maxD,
                oklabDistance(colours[i]!.mapped.oklab, other.colours[i]!.mapped.oklab),
              );
            if (maxD < params.dedupe.nearThreshold) return other;
          }
        }
      }
    }
    return undefined;
  };
  let batch: Candidate[] = [];
  let rejections: Rejection[] = [];
  let cancelled = false;

  for (let index = 0; index < params.count; index++) {
    manifest.counts.drawn++;
    const draws = drawOne(params, index);
    const colours: CandidateColour[] = [];
    let reason: string | undefined;
    for (const d of draws) {
      const m = mapColour(d, params);
      if (m.reason) {
        reason = m.reason;
        break;
      }
      colours.push(m.colour!);
    }
    if (!reason) {
      const key = colours.map((c) => c.mapped.oklab.map((n) => n.toFixed(4)).join(',')).join('|');
      if (exact.has(key)) reason = 'exact-duplicate';
      else {
        const dup = nearDuplicate(colours);
        if (dup) reason = `near-duplicate-of:${dup.id}`;
      }
      if (!reason) exact.add(key);
    }
    if (reason) {
      const r = { index, reason };
      rejections.push(r);
      manifest.rejection_log.push(r);
      manifest.counts.rejected++;
    } else {
      const candidate: Candidate = {
        id: candidateId(params, contentVersion, index),
        index,
        colours,
        features: features(colours, params),
      };
      const k = cellKey(colours[0]!.mapped.oklab);
      const list = buckets.get(k);
      if (list) list.push(kept.length);
      else buckets.set(k, [kept.length]);
      kept.push(candidate);
      batch.push(candidate);
      manifest.candidate_ids.push(candidate.id);
      manifest.counts.kept++;
    }
    if (batch.length + rejections.length >= params.batchSize || index === params.count - 1) {
      const stop = yield {
        drawn: manifest.counts.drawn,
        kept: manifest.counts.kept,
        rejected: manifest.counts.rejected,
        batch,
        rejections,
      };
      batch = [];
      rejections = [];
      if (stop) {
        cancelled = true;
        break;
      }
    }
  }

  const subset = cancelled ? [] : diverseSubset(kept, params.subset);
  manifest.subset_ids = subset.map((c) => c.id);
  manifest.counts.subset = subset.length;
  manifest.status = cancelled ? 'cancelled' : 'complete';
  return { manifest, candidates: kept };
}

export interface RunOptions extends GenerateOptions {
  onProgress?: (p: Progress) => void;
  shouldCancel?: () => boolean;
}

/** Runs the generator to completion (or cancellation) synchronously. */
export function run(input: GeneratorParamsInput, options: RunOptions = {}) {
  const g = generate(input, options);
  let step = g.next();
  while (!step.done) {
    options.onProgress?.(step.value);
    step = g.next(options.shouldCancel?.() ?? false);
  }
  return step.value;
}

/** Same as run, but yields to the event loop between batches so a cancel message can arrive (workers). */
export async function runAsync(input: GeneratorParamsInput, options: RunOptions = {}) {
  const g = generate(input, options);
  let step = g.next();
  while (!step.done) {
    options.onProgress?.(step.value);
    await new Promise((r) => setTimeout(r, 0));
    step = g.next(options.shouldCancel?.() ?? false);
  }
  return step.value;
}
