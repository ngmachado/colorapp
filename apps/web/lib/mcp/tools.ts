/**
 * What the MCP server answers, as plain functions over the same modules the pages use. Every function
 * is deterministic and read-only; every number carries its space and conditions; a nearby record is a
 * distance, never a name. A refusal is thrown as `Refusal` and becomes an error result for the agent.
 */
import {
  colour,
  contrastRatio,
  convert,
  inGamut,
  toGamut,
  toHex,
  type ColourValue,
  type Triple,
} from '@sca/colour-engine';
import { run, Role, Structure, type GeneratorParamsInput, type Candidate } from '@sca/generator';
import type { Combination, Name, Representation, Source } from '@sca/knowledge';
import { STATUS_LABELS, type StatusKind } from '@/components/badges';
import { inspectHex } from '@/lib/colour-inspector';
import { compareHexes } from '@/lib/compare';
import { contrastGrade, parseHex, thresholdReport } from '@/lib/contrast';
import { curriculum } from '@/lib/curriculum';
import { DEFAULT_FLAG_DISTANCE, distinctness } from '@/lib/distinct';
import { knowledge } from '@/lib/knowledge';
import { labFromHexes } from '@/lib/lab-links';
import { CONDITIONS, munsellAvailable, munsellNearest } from '@/lib/munsell';
import { namePoints, type NamePoint } from '@/lib/palette-names';
import { stateParams, type Oklch, type Pair } from '@/lib/palette-param';
import {
  evidenceOf,
  groupLabel,
  isRestricted,
  orderRepresentations,
  primaryRepresentation,
  recordStatus,
  representationValue,
} from '@/lib/records';
import { DEFAULT_RELATION_DISTANCE, relationsNear, type Oklab } from '@/lib/relations';
import { documentedSets } from '@/lib/sets';
import { siteUrl } from '@/lib/site';

/** An answer the server declines to give, with the way to ask instead. */
export class Refusal extends Error {
  constructor(
    message: string,
    public readonly detail?: unknown,
  ) {
    super(message);
  }
}

const origin = () => siteUrl.origin.replace(/\/$/, '');
const round = (n: number, digits = 5) => Number(n.toFixed(digits));
const DISTANCE_METRIC = 'Euclidean distance in OKLab, L on a 0–1 scale';
const NEARBY_NOTE =
  'A nearby record is a distance within a small collection: not an identification, a perceptibility threshold or a cultural relationship.';

/** A hex (3 or 6 digits) or a CSS `oklch(L C h)` with L on 0–1, as the Laboratory writes it. */
export function parseColour(text: string): {
  input: string;
  hex: string;
  oklch: Oklch;
  value: ColourValue;
  requested: { space: 'srgb' | 'oklch'; coords: Triple };
  mapped: boolean;
} {
  const t = text.trim();
  const m = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/i.exec(t);
  if (m) {
    const req: Triple = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (req[0] < 0 || req[0] > 1 || req[1] < 0)
      throw new Refusal(`"${t}": OKLCh takes L from 0 to 1, C at least 0, h in degrees.`);
    const v = colour('oklch', req, { kind: 'manual' });
    const shown = toGamut(v, 'srgb', 'css');
    const hex = toHex(shown);
    return {
      input: t,
      hex,
      oklch: oklchOf(shown),
      value: shown,
      requested: { space: 'oklch', coords: req },
      mapped: !inGamut(v, 'srgb'),
    };
  }
  const hex = parseHex(t);
  if (!hex)
    throw new Refusal(
      `"${t}" is not a colour this server reads. Send a hex such as #663399 or oklch(0.5 0.1 300).`,
    );
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as Triple;
  const value = colour('srgb', rgb, { kind: 'manual' });
  return {
    input: t,
    hex,
    oklch: oklchOf(value),
    value,
    requested: { space: 'srgb', coords: rgb },
    mapped: false,
  };
}

const oklchOf = (v: ColourValue): Oklch => {
  const c = convert(v, 'oklch').coords;
  return [Math.min(1, Math.max(0, c[0])), Math.max(0, c[1]), Number.isNaN(c[2]) ? 0 : c[2]];
};
const oklabOf = (v: ColourValue) => convert(v, 'oklab').coords as Oklab;
const dist = (a: Oklab, b: Oklab) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** The source a record cites, as a citation an agent can repeat: the record's own locator, never a paraphrase. */
export function citation(ev: { source: string; locator?: string } | null | undefined) {
  if (!ev) return null;
  const s = knowledge().record(ev.source);
  const source =
    s && s.type === 'source'
      ? {
          id: s.id,
          author: s.author,
          title: s.title,
          ...(s.publisher ? { publisher: s.publisher } : {}),
          ...(s.date ? { date: s.date } : {}),
          ...(s.edition ? { edition: s.edition } : {}),
          ...(s.url ? { url: s.url } : {}),
          ...(s.archive_id ? { archive: s.archive_id } : {}),
        }
      : { id: ev.source };
  const text =
    s && s.type === 'source'
      ? `${s.author}, ${s.title}${s.date ? ` (${s.date})` : ''}${ev.locator ? `, ${ev.locator}` : ''}`
      : `${ev.source}${ev.locator ? `, ${ev.locator}` : ''}`;
  return {
    source,
    locator: ev.locator ?? null,
    text,
    link: `${origin()}/dictionary/source/${encodeURIComponent(ev.source)}`,
  };
}

const status = (kind: StatusKind) => ({ kind, label: STATUS_LABELS[kind] });

function nearbyOf(point: NamePoint, distance: number) {
  const k = knowledge();
  const rep = k.record(point.id);
  return {
    record: point.id,
    concept: point.conceptId,
    label: point.label,
    hex: point.hex,
    distance: { value: round(distance), metric: DISTANCE_METRIC },
    status: status(point.status),
    ...(point.provenance
      ? {
          value: {
            space: point.provenance.space,
            coords: point.provenance.coords,
            approximation: point.provenance.approximation,
            method: point.provenance.method,
          },
        }
      : {}),
    citation: citation(rep ? evidenceOf(rep) : null),
    link: `${origin()}/dictionary/${encodeURIComponent(point.conceptId)}`,
  };
}

function nearbyTo(lab: Oklab, n: number, exclude?: string) {
  return namePoints()
    .filter((p) => !exclude || p.conceptId !== exclude)
    .map((p) => ({ p, d: dist(p.oklab, lab) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map(({ p, d }) => nearbyOf(p, d));
}

// ---------------------------------------------------------------------------------------------
// inspect_colour

export function inspectColour(text: string) {
  const c = parseColour(text);
  const input = inspectHex(c.hex)!;
  const lab = oklabOf(c.value);
  const oklch = c.oklch;
  const munsell = munsellAvailable()
    ? {
        available: true,
        conditions: CONDITIONS,
        nearest: (munsellNearest(c.hex, 3) ?? []).map((h) => ({
          notation: h.notation,
          deltaE: { value: round(h.deltaE, 3), metric: CONDITIONS.metric },
          hex: h.hex,
          mapped: h.mapped,
        })),
      }
    : {
        available: false,
        note: 'The Munsell renotation table is not installed on this server; no notation is given.',
      };
  return {
    hex: c.hex,
    ...(c.requested.space === 'oklch'
      ? {
          requested: { space: 'oklch', coords: c.requested.coords },
          mapped: c.mapped,
          mappedNote: c.mapped
            ? 'The requested OKLCh lies outside sRGB; every value below is the gamut-mapped sRGB colour.'
            : undefined,
        }
      : {}),
    neutral: input.neutral,
    values: input.values.map((v) => ({ label: v.label, text: v.text, conditions: v.note })),
    coordinates: {
      srgb:
        c.requested.space === 'srgb' ? c.requested.coords.map((n) => Math.round(n * 255)) : null,
      oklch: {
        L: round(oklch[0]),
        C: round(oklch[1]),
        h: input.neutral ? null : round(oklch[2], 3),
      },
      oklab: lab.map((n) => round(n)),
    },
    munsell,
    nearby: nearbyTo(lab, 5),
    nearbyNote: NEARBY_NOTE,
    links: {
      inspector: `${origin()}/colour/${c.hex.slice(1)}`,
      laboratory: `${origin()}${labFromHexes([c.hex])}`,
      map: `${origin()}/space?hex=${c.hex.slice(1)}`,
      munsell: `${origin()}/munsell?hex=${c.hex.slice(1)}`,
    },
  };
}

// ---------------------------------------------------------------------------------------------
// contrast_pair

export function contrastPair(textColour: string, background: string) {
  const a = parseColour(textColour);
  const b = parseColour(background);
  const cmp = compareHexes(a.hex, b.hex)!;
  return {
    text: { hex: a.hex, oklch: cmp.a.oklch.map((n) => round(n)) },
    background: { hex: b.hex, oklch: cmp.b.oklch.map((n) => round(n)) },
    contrast: {
      ratio: round(cmp.contrast.ratio, 3),
      grade: contrastGrade(cmp.contrast.ratio),
      standard: 'WCAG 2.1 contrast ratio on the sRGB values as displayed',
      thresholds: cmp.contrast.thresholds,
    },
    differences: cmp.differences.map((d) => ({ ...d, value: round(d.value) })),
    oklchDelta: {
      l: round(cmp.oklchDelta.l),
      c: round(cmp.oklchDelta.c),
      h: cmp.oklchDelta.h === null ? null : round(cmp.oklchDelta.h, 3),
    },
    note: 'A ratio says nothing about harmony. Thresholds are WCAG 2.1 success criteria, each named.',
    links: { compare: `${origin()}/compare?a=${a.hex.slice(1)}&b=${b.hex.slice(1)}` },
  };
}

// ---------------------------------------------------------------------------------------------
// check_palette

export interface CheckInput {
  colours: string[];
  names?: string[];
  pairs?: { text: number; background: number }[];
  flagDistance?: number;
}

export function checkPalette(input: CheckInput) {
  if (input.colours.length < 2 || input.colours.length > 5)
    throw new Refusal('A palette here is 2 to 5 colours.');
  const cols = input.colours.map(parseColour);
  const n = cols.length;
  if (input.names && input.names.length !== n)
    throw new Refusal(`names must have one entry per colour (${n}).`);
  const names = input.names ?? cols.map((_, i) => `colour ${i + 1}`);
  const pairs = input.pairs ?? [];
  for (const p of pairs) {
    if (!Number.isInteger(p.text) || !Number.isInteger(p.background))
      throw new Refusal('pairs name colours by index, from 0.');
    if (p.text < 0 || p.text >= n || p.background < 0 || p.background >= n)
      throw new Refusal(`pair ${p.text} on ${p.background}: indexes run from 0 to ${n - 1}.`);
    if (p.text === p.background) throw new Refusal('A pair needs two different colours.');
  }
  const flag = input.flagDistance ?? DEFAULT_FLAG_DISTANCE;
  const values = cols.map((c) => c.value);
  const labs = values.map(oklabOf);
  const oklchs = cols.map((c) => c.oklch);
  const ratio = (i: number, j: number) => contrastRatio(values[i]!, values[j]!);
  const white = colour('srgb', [1, 1, 1]);
  const black = colour('srgb', [0, 0, 0]);
  const views = distinctness(oklchs);
  const drawn = views.find((v) => v.view === 'normal')!;
  const weakest = drawn.weakest;
  const sets = documentedSets();
  const points = namePoints();
  const relations = relationsNear(sets, points, labs, DEFAULT_RELATION_DISTANCE);
  return {
    colours: cols.map((c, i) => ({
      index: i,
      name: names[i]!,
      input: c.input,
      hex: c.hex,
      oklch: { L: round(c.oklch[0]), C: round(c.oklch[1]), h: round(c.oklch[2], 3) },
      gamut: {
        srgb: !c.mapped,
        ...(c.mapped
          ? { note: 'Requested outside sRGB; measured on the gamut-mapped value shown in hex.' }
          : {}),
      },
    })),
    contrast: {
      standard: 'WCAG 2.1 contrast ratio on the sRGB values as displayed',
      pairs: pairs.map((p) => {
        const r = ratio(p.text, p.background);
        return {
          text: names[p.text]!,
          background: names[p.background]!,
          ratio: round(r, 3),
          grade: contrastGrade(r),
          thresholds: thresholdReport(r),
        };
      }),
      every: cols.flatMap((_, i) =>
        cols
          .map((_, j) => j)
          .filter((j) => j !== i)
          .map((j) => ({
            text: names[i]!,
            background: names[j]!,
            ratio: round(ratio(i, j), 3),
            grade: contrastGrade(ratio(i, j)),
          })),
      ),
      onWhiteAndBlack: cols.map((c, i) => ({
        name: names[i]!,
        onWhite: round(contrastRatio(values[i]!, white), 3),
        onBlack: round(contrastRatio(values[i]!, black), 3),
      })),
    },
    lightness: {
      space: 'OKLab L, 0–1',
      values: oklchs.map((c) => round(c[0])),
      min: round(Math.min(...oklchs.map((c) => c[0]))),
      max: round(Math.max(...oklchs.map((c) => c[0]))),
      range: round(Math.max(...oklchs.map((c) => c[0])) - Math.min(...oklchs.map((c) => c[0]))),
    },
    separation: {
      metric: DISTANCE_METRIC,
      minimum: round(weakest.distance),
      closestPair: [names[weakest.a]!, names[weakest.b]!],
    },
    distinctness: {
      metric: DISTANCE_METRIC,
      flagDistance: flag,
      flagNote: 'The flag is a working setting, not a perceptibility threshold.',
      views: views.map((v) => ({
        view: v.view === 'normal' ? 'as drawn' : v.view,
        hexes: v.hexes,
        weakest: {
          pair: [names[v.weakest.a]!, names[v.weakest.b]!],
          distance: round(v.weakest.distance),
        },
        belowFlag: v.pairs
          .filter((p) => p.distance < flag)
          .map((p) => ({ pair: [names[p.a]!, names[p.b]!], distance: round(p.distance) })),
      })),
      simulationNote:
        'Protan, deutan and tritan views are simulations; approximations, not measurements.',
    },
    nearby: cols.map((_, i) => ({ name: names[i]!, records: nearbyTo(labs[i]!, 2) })),
    nearbyNote: NEARBY_NOTE,
    relations: {
      withinDistance: DEFAULT_RELATION_DISTANCE,
      method:
        'A documented pair, group or layering is listed when every member lies within the distance of some colour, each matched to its nearest. Distance is the search criterion only; a palette near a documented pair is not that pair.',
      matches: relations.map((m) => ({
        id: m.set.id,
        label: m.set.label,
        kind: m.set.kind ?? 'group',
        citation: citation(m.set.source ? { source: m.set.source } : null),
        members: m.members.map((x) => ({
          concept: x.conceptId,
          label: x.label,
          record: x.record,
          hex: x.hex,
          nearest: names[x.column]!,
          distance: round(x.distance),
        })),
        worst: round(m.worst),
      })),
    },
    links: {
      laboratory: `${origin()}/lab?${stateParams({
        palette: oklchs,
        structure: 'free-form',
        seed: 0,
        labels: input.names ?? undefined,
        pairs: pairs.map((p) => [p.text, p.background] as Pair),
      })}`,
    },
  };
}

// ---------------------------------------------------------------------------------------------
// request_palette

/** Rules an agent can ask for. Mutation needs a palette to mutate and source-led a chosen collection; both stay in the Laboratory. */
export const REQUEST_RULES = Structure.exclude(['mutation', 'source-led']);
export type RequestRule = ReturnType<typeof REQUEST_RULES.parse>;

export interface RequestInput {
  roles?: Role[];
  rule?: RequestRule;
  fixed?: Partial<Record<Role, string>>;
  startFrom?: string;
  hue?: { from: number; to: number };
  lightness?: { min: number; max: number };
  chroma?: { min: number; max: number };
  contrast?: { text: Role; background: Role; minimum: number }[];
  minimumSeparation?: number;
  gamut?: 'srgb' | 'display-p3';
  seed?: number;
  count?: number;
  words?: string;
}

/** What a word that is not a number can become. Nothing here maps a word to a hue; the agent states the numbers. */
const WORD_FORMS: [RegExp, string][] = [
  [/^(warm|cool|cold|hot|earthy|fresh)$/i, 'a hue arc in OKLCh degrees: hue.from and hue.to'],
  [
    /^(light|pale|dark|deep|bright|dim|airy|heavy)$/i,
    'a lightness range: lightness.min and lightness.max (OKLab L, 0–1)',
  ],
  [
    /^(vivid|muted|soft|bold|saturated|dull|pastel|rich|neon)$/i,
    'a chroma range: chroma.min and chroma.max (OKLCh C)',
  ],
  [
    /^(readable|legible|accessible|clear)$/i,
    'a contrast minimum between two roles: contrast[{ text, background, minimum }]',
  ],
  [
    /^(distinct|different|separate|varied|diverse)$/i,
    'a minimum OKLab distance between colours: minimumSeparation',
  ],
];
const refuseWords = (words: string) => {
  const list = words
    .split(/[,;/\n]+|\s+(?:and|or)\s+/i)
    .map((w) => w.trim())
    .filter(Boolean);
  if (!list.length) return;
  throw new Refusal(
    'Words are not requirements here. State each one as a number, or ask the person for it.',
    {
      refused: list.map((word) => ({
        word,
        instead:
          WORD_FORMS.find(([re]) => re.test(word))?.[1] ??
          'no measurable form on this server: name the hue arc, lightness, chroma, contrast or separation you mean, or ask the person',
      })),
      note: 'No judgment model runs here. A mood is the person’s to decide; the server measures what they decided.',
    },
  );
};

export function requestPalette(input: RequestInput) {
  if (input.words !== undefined) refuseWords(input.words);
  const roles = input.roles ?? ['dominant', 'secondary', 'accent'];
  if (!roles.length || roles.length > 5)
    throw new Refusal('roles: 1 to 5 of dominant, secondary, accent, support, highlight.');
  if (new Set(roles).size !== roles.length) throw new Refusal('Each role appears once.');
  const rule = input.rule ?? 'analogous';
  const gamut = input.gamut ?? 'srgb';
  const seed = input.seed ?? 1;
  const count = Math.min(Math.max(input.count ?? 200, 1), 1000);
  const lightness = { ...(input.lightness ?? { min: 0.18, max: 0.94 }) };
  const chroma = { ...(input.chroma ?? { min: 0, max: 0.3 }) };
  if (lightness.min > lightness.max || chroma.min > chroma.max)
    throw new Refusal('A range needs min at or below max.');
  const locks: Partial<Record<Role, Oklch>> = {};
  const fixedNote: Record<string, string> = {};
  for (const [role, text] of Object.entries(input.fixed ?? {}) as [Role, string][]) {
    if (!roles.includes(role)) throw new Refusal(`fixed.${role}: that role is not in roles.`);
    const c = parseColour(text);
    locks[role] = c.oklch;
    fixedNote[role] = c.hex;
  }
  let startedFrom: ReturnType<typeof startRecord> | undefined;
  let baseHue: number | undefined;
  if (input.startFrom) {
    startedFrom = startRecord(input.startFrom);
    const first = roles[0]!;
    if (!locks[first]) {
      locks[first] = startedFrom.oklch;
      fixedNote[first] = startedFrom.hex;
    }
    baseHue = startedFrom.oklch[2];
  }
  // A fixed colour is never moved; if it sits outside the bounds, the bounds widen to hold it, as the Laboratory does.
  for (const [L, C] of Object.values(locks)) {
    lightness.min = Math.min(lightness.min, L);
    lightness.max = Math.max(lightness.max, L);
    chroma.min = Math.min(chroma.min, C);
    chroma.max = Math.max(chroma.max, C);
  }
  const contrast = input.contrast ?? [];
  for (const c of contrast) {
    if (!roles.includes(c.text) || !roles.includes(c.background))
      throw new Refusal(
        `contrast: ${c.text} on ${c.background} names a role that is not in roles.`,
      );
    if (c.text === c.background) throw new Refusal('contrast: text and background must differ.');
    if (!(c.minimum >= 1 && c.minimum <= 21))
      throw new Refusal('contrast.minimum is a ratio from 1 to 21.');
  }
  const arc = input.hue && input.hue.from !== input.hue.to ? { ...input.hue } : undefined;
  const params: GeneratorParamsInput = {
    seed,
    count,
    roles,
    structure: rule,
    locks,
    bounds: { lightness, chroma, ...(arc ? { hue: arc } : {}) },
    ...(baseHue !== undefined ? { baseHue } : {}),
    dedupe: { nearThreshold: 0.02 },
    output: { gamut, policy: 'css', allowApproximate: true },
  };
  let candidates: Candidate[];
  try {
    candidates = run(params).candidates;
  } catch (e) {
    throw new Refusal(`The generator refused these settings: ${(e as Error).message}`);
  }
  const judged = candidates.map((cand) =>
    judge(cand, roles, contrast, input.minimumSeparation, gamut, lightness, chroma, arc),
  );
  const best = judged.reduce<(typeof judged)[number] | null>(
    (b, j) => (b === null || j.failed < b.failed ? j : b),
    null,
  );
  const link = (palette: Oklch[]) =>
    `${origin()}/lab?${stateParams({
      palette,
      structure: rule,
      seed,
      locked: roles.map((r) => !!locks[r]),
      labels: roles,
      pairs: contrast.map((c) => [roles.indexOf(c.text), roles.indexOf(c.background)] as Pair),
    })}`;
  const common = {
    rule,
    seed,
    roles,
    bounds: { lightness, chroma, ...(arc ? { hue: arc } : {}), gamut },
    ...(Object.keys(fixedNote).length ? { fixed: fixedNote } : {}),
    ...(startedFrom ? { startedFrom } : {}),
    candidates: { drawn: candidates.length, passing: judged.filter((j) => j.failed === 0).length },
  };
  if (!best)
    return {
      ...common,
      palette: null,
      allPassed: false,
      requirements: [],
      note: 'The rule produced nothing under these fixed colours and bounds. Widen a range or free a colour; the Laboratory link opens the same settings.',
      links: {
        laboratory: `${origin()}/lab?${stateParams({ palette: roles.map((r) => locks[r] ?? [0.5, 0, 0]), structure: rule, seed, labels: roles })}`,
      },
    };
  return {
    ...common,
    palette: best.palette,
    allPassed: best.failed === 0,
    requirements: best.requirements,
    note:
      best.failed === 0
        ? 'Every requirement passed on this candidate. The Laboratory link reproduces it from the same seed and rule.'
        : `No candidate among ${candidates.length} met every requirement; this is the one with the fewest failures. Loosen a requirement, change the seed or raise count.`,
    links: { laboratory: link(best.palette.map((p) => p.oklchTriple)) },
  };
}

function startRecord(id: string) {
  const k = knowledge();
  const r = k.record(id);
  if (!r) throw new Refusal(`No record "${id}". Use find_records to look one up by name.`);
  let rep: Representation | undefined;
  let conceptId: string;
  if (r.type === 'concept') {
    conceptId = r.id;
    const reps = k
      .forConcept(r.id)
      .filter((x): x is Representation => x.type === 'representation' && !isRestricted(x));
    rep = primaryRepresentation(orderRepresentations(reps)) as Representation | undefined;
  } else if (r.type === 'representation') {
    conceptId = r.concept;
    rep = isRestricted(r) ? undefined : r;
  } else throw new Refusal(`"${id}" is a ${r.type}; start from a concept or a representation.`);
  const v = rep ? representationValue(rep) : null;
  if (!rep || !v) throw new Refusal(`"${id}" has no displayable value to start from.`);
  const shown = toGamut(v, 'srgb', 'css');
  const concept = k.record(conceptId);
  return {
    record: rep.id,
    concept: conceptId,
    label: concept && concept.type === 'concept' ? concept.label : conceptId,
    hex: toHex(shown),
    oklch: oklchOf(shown),
    value: {
      space: rep.space,
      coords: rep.coords ?? null,
      approximation: rep.approximation_status,
      method: rep.method,
    },
    status: status(recordStatus(rep)),
    citation: citation(rep.evidence),
    link: `${origin()}/dictionary/${encodeURIComponent(conceptId)}`,
  };
}

function judge(
  cand: Candidate,
  roles: Role[],
  contrast: { text: Role; background: Role; minimum: number }[],
  minimumSeparation: number | undefined,
  gamut: 'srgb' | 'display-p3',
  lightness: { min: number; max: number },
  chroma: { min: number; max: number },
  arc: { from: number; to: number } | undefined,
) {
  const byRole = new Map(cand.colours.map((c) => [c.role, c]));
  const values = new Map(
    cand.colours.map((c) => [
      c.role,
      colour(c.output.space as 'srgb' | 'display-p3', c.output.coords),
    ]),
  );
  const palette = roles.map((r) => {
    const c = byRole.get(r)!;
    const v = values.get(r)!;
    return {
      role: r,
      hex: toHex(toGamut(v, 'srgb', 'css')),
      oklch: { L: round(c.oklch[0]), C: round(c.oklch[1]), h: round(c.oklch[2], 3) },
      oklchTriple: c.oklch as Oklch,
      output: { space: c.output.space, coords: c.output.coords.map((n) => round(n)) },
      mapped: c.mapped.policy !== null,
    };
  });
  const eps = 1e-6;
  const requirements: { requirement: string; passes: boolean; measured: unknown }[] = [];
  const Ls = cand.colours.map((c) => c.oklch[0]);
  const Cs = cand.colours.map((c) => c.oklch[1]);
  requirements.push({
    requirement: `lightness of every colour within ${lightness.min}–${lightness.max} (OKLab L)`,
    passes: Ls.every((L) => L >= lightness.min - eps && L <= lightness.max + eps),
    measured: { min: round(Math.min(...Ls)), max: round(Math.max(...Ls)) },
  });
  requirements.push({
    requirement: `chroma of every colour within ${chroma.min}–${chroma.max} (OKLCh C)`,
    passes: Cs.every((C) => C >= chroma.min - eps && C <= chroma.max + eps),
    measured: { min: round(Math.min(...Cs)), max: round(Math.max(...Cs)) },
  });
  if (arc)
    requirements.push({
      requirement: `every hue within the arc ${arc.from}°–${arc.to}° (OKLCh)`,
      passes: true,
      measured: {
        hues: cand.colours.map((c) => round(c.oklch[2], 3)),
        note: 'held by the generator',
      },
    });
  const mapped = cand.colours.filter((c) => c.mapped.policy !== null);
  requirements.push({
    requirement: `every colour inside ${gamut} without mapping`,
    passes: mapped.length === 0,
    measured: {
      mapped: mapped.map((c) => c.role),
      maxDelta: round(cand.features.gamut.maxDelta),
      policy: cand.features.gamut.policy,
    },
  });
  for (const c of contrast) {
    const r = contrastRatio(values.get(c.text)!, values.get(c.background)!);
    requirements.push({
      requirement: `contrast of ${c.text} on ${c.background} at least ${c.minimum}:1 (WCAG 2.1)`,
      passes: r >= c.minimum,
      measured: { ratio: round(r, 3), grade: contrastGrade(r) },
    });
  }
  if (minimumSeparation !== undefined) {
    const diffs = cand.features.differences;
    const closest = diffs.reduce((w, d) => (d.oklab < w.oklab ? d : w), diffs[0]!);
    requirements.push({
      requirement: `every pair at least ${minimumSeparation} apart (${DISTANCE_METRIC})`,
      passes: diffs.length === 0 || closest.oklab >= minimumSeparation,
      measured: diffs.length
        ? { minimum: round(closest.oklab), pair: [closest.a, closest.b] }
        : { minimum: null },
    });
  }
  return { palette, requirements, failed: requirements.filter((r) => !r.passes).length };
}

// ---------------------------------------------------------------------------------------------
// find_records and lookup_record

/** Letters without their accents, lower case, so "yanzhi" finds "yānzhi". */
const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function findRecords(text: string) {
  const q = text.trim();
  if (!q) throw new Refusal('Search needs some text: a name, a transliteration or a title.');
  const k = knowledge();
  const out = new Map<
    string,
    { id: string; type: string; label: string; matched: { field: string; text: string } }
  >();
  const labelOf = (id: string) => {
    const r = k.record(id);
    return r && 'label' in r
      ? r.label
      : r && r.type === 'source'
        ? r.title
        : r && r.type === 'name'
          ? r.script
          : id;
  };
  // The release's text index needs three characters; most East Asian names have two, so a plain
  // scan of the fields the index covers runs as well. The release is small enough.
  if (q.length >= 3)
    for (const h of k.search(q, 20))
      out.set(h.id, {
        id: h.id,
        type: h.type,
        label: labelOf(h.id),
        matched: { field: h.field, text: h.text },
      });
  const needle = plain(q);
  const consider = (id: string, type: string, field: string, value: string | undefined) => {
    if (out.size >= 20 || out.has(id) || !value || !plain(value).includes(needle)) return;
    out.set(id, { id, type, label: labelOf(id), matched: { field, text: value } });
  };
  for (const c of k.byType('concept')) consider(c.id, 'concept', 'label', c.label);
  for (const n of k.byType('name') as Name[]) {
    consider(n.id, 'name', 'script', n.script);
    consider(n.id, 'name', 'transliteration', n.transliteration?.value);
    for (const a of n.aliases ?? []) consider(n.id, 'name', 'alias', a);
  }
  for (const s of k.byType('source') as Source[]) {
    consider(s.id, 'source', 'title', s.title);
    consider(s.id, 'source', 'author', s.author);
  }
  return {
    query: q,
    hits: [...out.values()].map((h) => {
      const r = k.record(h.id);
      return { ...h, ...(r && 'concept' in r && r.concept ? { concept: r.concept } : {}) };
    }),
    note: 'Text search over names, transliterations, aliases, labels and titles. Pass an id, or the concept a name belongs to, to lookup_record.',
  };
}

/** Editorial state travels as `status`; the raw fields and the editor's notes stay inside. */
const INTERNAL_FIELDS = new Set([
  'review_state',
  'rights_status',
  'confidence',
  'notes',
  'evidence',
]);

const displayOf = (rep: Representation) => {
  const v = representationValue(rep);
  if (!v) return null;
  const shown = toGamut(v, 'srgb', 'css');
  return { hex: toHex(shown), mapped: !inGamut(v, 'srgb') };
};

export function lookupRecord(id: string) {
  const k = knowledge();
  const r = k.record(id);
  if (!r) throw new Refusal(`No record "${id}". Use find_records to look one up by name.`);
  const link = (cid: string) => `${origin()}/dictionary/${encodeURIComponent(cid)}`;
  if (r.type === 'source')
    return {
      type: 'source',
      id: r.id,
      author: r.author,
      title: r.title,
      ...(r.publisher ? { publisher: r.publisher } : {}),
      ...(r.date ? { date: r.date } : {}),
      ...(r.edition ? { edition: r.edition } : {}),
      ...(r.isbn ? { isbn: r.isbn } : {}),
      ...(r.url ? { url: r.url } : {}),
      ...(r.archive_id ? { archive: r.archive_id } : {}),
      status: status(recordStatus(r)),
      ...(r.rights_notes ? { rightsNotes: r.rights_notes } : {}),
      cited: k.citing(r.id).length,
      link: `${origin()}/dictionary/source/${encodeURIComponent(r.id)}`,
    };
  if (isRestricted(r))
    return {
      type: r.type,
      id: r.id,
      ...('label' in r ? { label: r.label } : {}),
      ...(r.type === 'concept' && r.tags ? { tags: r.tags } : {}),
      status: status('restricted'),
      citation: citation(evidenceOf(r)),
      note: 'This record is restricted: its bibliographic record only, no values or text reproduced.',
    };
  if (r.type === 'concept') {
    const attached = k.forConcept(r.id);
    const names = attached.filter((x): x is Name => x.type === 'name');
    const reps = orderRepresentations(
      attached.filter((x): x is Representation => x.type === 'representation'),
    );
    const shown = primaryRepresentation(reps.filter((x) => !isRestricted(x)));
    const assertions = attached.filter((x) => x.type === 'cultural-assertion');
    const edges = k.edges(r.id);
    const members = edges
      .filter((e) => e.edge === 'member-of' && e.to_id === r.id)
      .map((e) => {
        const m = k.record(e.from_id);
        const rep = primaryRepresentation(
          orderRepresentations(
            k
              .forConcept(e.from_id)
              .filter((x): x is Representation => x.type === 'representation' && !isRestricted(x)),
          ),
        );
        return {
          concept: e.from_id,
          label: m && 'label' in m ? m.label : e.from_id,
          ...(rep ? { record: rep.id, display: displayOf(rep) } : {}),
          link: link(e.from_id),
        };
      });
    return {
      type: 'concept',
      id: r.id,
      label: r.label,
      ...(r.description ? { description: r.description } : {}),
      ...(r.scope ? { scope: r.scope } : {}),
      ...(r.tags ? { tags: r.tags } : {}),
      status: status(recordStatus(r)),
      citation: citation(r.evidence),
      names: names.map((x) => ({
        id: x.id,
        script: x.script,
        language: x.language,
        ...(x.transliteration ? { transliteration: x.transliteration } : {}),
        ...(x.aliases ? { aliases: x.aliases } : {}),
        ...(x.meaning ? { meaning: x.meaning } : {}),
        citation: citation(x.evidence),
      })),
      displayed: shown?.id ?? null,
      representations: reps.map((x) =>
        isRestricted(x)
          ? { id: x.id, status: status('restricted'), citation: citation(x.evidence) }
          : {
              id: x.id,
              space: x.space,
              ...(x.coords ? { coords: x.coords } : {}),
              ...(x.white ? { white: x.white } : {}),
              ...(x.conditions ? { conditions: x.conditions } : {}),
              method: x.method,
              approximation: x.approximation_status,
              status: status(recordStatus(x)),
              display: displayOf(x),
              citation: citation(x.evidence),
            },
      ),
      assertions: assertions.map((x) =>
        x.type === 'cultural-assertion'
          ? {
              id: x.id,
              claim: x.claim,
              ...(x.passage ? { passage: x.passage } : {}),
              ...(x.community ? { community: x.community } : {}),
              ...(x.period ? { period: x.period } : {}),
              ...(x.context ? { context: x.context } : {}),
              status: status(recordStatus(x)),
              citation: citation(x.evidence),
            }
          : null,
      ),
      relations: edges.map((e) => {
        const other = e.from_id === r.id ? e.to_id : e.from_id;
        const o = k.record(other);
        const rel = k.record(e.record_id);
        return {
          edge: e.edge,
          direction: e.from_id === r.id ? 'from this' : 'to this',
          other: { id: other, label: o && 'label' in o ? o.label : other, link: link(other) },
          citation: citation(rel ? evidenceOf(rel) : null),
        };
      }),
      ...(members.length ? { members } : {}),
      combinations: (k.combinationsFor(r.id) as Combination[]).map((c) => ({
        id: c.id,
        label: c.label,
        items: c.items,
        orderDocumented: c.order_documented,
        citation: citation(c.evidence),
      })),
      link: link(r.id),
    };
  }
  // Names, representations, combinations, relationships and assertions: the record as kept, with its citation resolved.
  const rest = Object.fromEntries(Object.entries(r).filter(([key]) => !INTERNAL_FIELDS.has(key)));
  return {
    ...rest,
    status: status(recordStatus(r)),
    citation: citation(evidenceOf(r)),
    ...(r.type === 'representation' ? { display: displayOf(r), link: link(r.concept) } : {}),
    ...(r.type === 'name' ? { link: link(r.concept) } : {}),
  };
}

/** The ids an agent may list: every concept and source the Dictionary shows. */
export function listableRecords() {
  const k = knowledge();
  const concepts = k
    .byType('concept')
    .map((c) => ({ id: c.id, label: c.label, type: 'concept' as const }));
  const sources = (k.byType('source') as Source[]).map((s) => ({
    id: s.id,
    label: s.title,
    type: 'source' as const,
  }));
  return [...concepts, ...sources];
}

export function listSystems() {
  return knowledge()
    .byType('concept')
    .filter((c) => c.tags?.kind === 'system')
    .map((c) => ({
      id: c.id,
      label: c.label,
      ...(c.description ? { description: c.description } : {}),
    }));
}

// ---------------------------------------------------------------------------------------------
// lessons

export function listLessons() {
  return curriculum()
    .filter((t) => t.kind === 'lesson' && t.availability !== 'removed')
    .map((t) => ({ id: t.id, title: t.title, summary: t.summary }));
}

/** A lesson as markdown: objective, paragraphs, example, limits and references with their locators. */
export function lessonText(id: string): string | null {
  const t = curriculum().find((x) => x.id === id && x.kind === 'lesson');
  if (!t || !t.lesson) return null;
  const lines = [`# ${t.title}`, '', t.summary, '', `**Objective.** ${t.lesson.objective}`, ''];
  for (const p of t.lesson.paragraphs) lines.push(p, '');
  lines.push(`**Example.** ${t.lesson.example}`, '', `**Limits.** ${t.lesson.limits}`, '');
  if (t.key_terms?.length) {
    lines.push('## Terms', '');
    for (const k of t.key_terms) lines.push(`- **${k.term}**: ${k.distinction}`);
    lines.push('');
  }
  if (t.misconception) lines.push(`**Misconception.** ${t.misconception}`, '');
  if (t.explanation_limits)
    lines.push(`**What this lesson does not claim.** ${t.explanation_limits}`, '');
  lines.push('## References', '');
  for (const ref of t.lesson.references) {
    const c = citation({ source: ref.source, locator: ref.locator });
    lines.push(`- ${c?.text ?? ref.source} — ${ref.url}`);
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------------------------
// colour_of_the_day

/** FNV-1a over a string: a fixed, well-known hash, so the day's choice is the same on every server. */
const fnv1a = (text: string) => {
  let h = 0x811c9dc5;
  for (const ch of new TextEncoder().encode(text)) h = Math.imul(h ^ ch, 0x01000193) >>> 0;
  return h >>> 0;
};

/** The collections a day's colour can be drawn from: the Dictionary's groups. */
export function collections() {
  return [...new Set(namePoints().map((p) => p.group))]
    .sort()
    .map((g) => ({ id: g, label: groupLabel(g) }));
}

/**
 * One documented record per day, chosen by the date alone from every concept with a displayable
 * value, so everyone who asks on that day gets the same answer. A selection rule, never a meaning.
 */
export function colourOfTheDay(input: { date?: string; collection?: string } = {}) {
  const date = input.date ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)))
    throw new Refusal('date is a calendar day written YYYY-MM-DD.');
  const collection = input.collection ?? 'all';
  const known = collections();
  if (collection !== 'all' && !known.some((g) => g.id === collection))
    throw new Refusal(
      `No collection "${collection}". Collections: all, ${known.map((g) => g.id).join(', ')}.`,
    );
  const seen = new Set<string>();
  const pool: NamePoint[] = [];
  // namePoints lists a concept's preferred representation first; one entry per concept, in id order.
  for (const p of namePoints()) {
    if (collection !== 'all' && p.group !== collection) continue;
    if (seen.has(p.conceptId)) continue;
    seen.add(p.conceptId);
    pool.push(p);
  }
  pool.sort((a, b) => a.conceptId.localeCompare(b.conceptId));
  if (!pool.length) throw new Refusal(`Nothing displayable in "${collection}".`);
  const index = fnv1a(`${date}:${collection}`) % pool.length;
  const p = pool[index]!;
  const lab = p.oklab;
  const oklch = oklchOf(colour('oklab', lab));
  return {
    date,
    collection: collection === 'all' ? 'all' : groupLabel(collection),
    method: `One of ${pool.length} documented records with a displayable value${
      collection === 'all' ? '' : ` in ${groupLabel(collection)}`
    }, chosen by the date alone (FNV-1a of "${date}:${collection}" modulo ${pool.length}, records in id order). The same for everyone on that day. A selection rule, not a meaning.`,
    colour: {
      concept: p.conceptId,
      record: p.id,
      label: p.label,
      collection: groupLabel(p.group),
      hex: p.hex,
      oklch: { L: round(oklch[0]), C: round(oklch[1]), h: round(oklch[2], 3) },
      status: status(p.status),
      ...(p.queue ? { researchQueue: true } : {}),
      citation: citation(knowledge().record(p.id) ? evidenceOf(knowledge().record(p.id)!) : null),
    },
    record: lookupRecord(p.conceptId),
    links: {
      entry: `${origin()}/dictionary/${encodeURIComponent(p.conceptId)}`,
      inspector: `${origin()}/colour/${p.hex.slice(1)}`,
      laboratory: `${origin()}${labFromHexes([p.hex])}`,
    },
  };
}
