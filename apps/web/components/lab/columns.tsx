'use client';

import {
  colour,
  contrastRatio,
  convert,
  inGamut,
  simulateCvd,
  toHex,
  type CvdType,
} from '@sca/colour-engine';
import {
  DEFAULTS,
  diverseSubset,
  run,
  Structure,
  type GeneratorParamsInput,
  type Role,
} from '@sca/generator';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Wheel, type OverlayPoint, inBand, OVERLAY_BAND } from '@/components/wheel';
import { ContrastPanel } from '@/components/lab/contrast-panel';
import { DistinctPanel } from '@/components/lab/distinct-panel';
import { ScalesPanel } from '@/components/lab/scales-panel';
import { GradientPanel } from '@/components/lab/gradient-panel';
import { LightnessPanel } from '@/components/lab/lightness-panel';
import { NeighbourPanel } from '@/components/lab/neighbour-panel';
import { RelationsPanel } from '@/components/lab/relations-panel';
import { oklchOfHex, parseHex } from '@/lib/contrast';
import {
  aseExport,
  cssExport,
  jsonExport,
  scssExport,
  svgExport,
  tailwindExport,
  tokensExport,
  type ExportColour,
} from '@/lib/exports';
import { nearestPoint, type NamePoint } from '@/lib/nearest';
import { groupLabel } from '@/lib/records';
import { hexesIn } from '@/lib/lab-links';
import { addPalette } from '@/lib/local-library';
import { stateParams, type Oklch, type Pair } from '@/lib/palette-param';
import type { SourceCitation } from '@/lib/palette-names';
import type { ColourSet } from '@/lib/systems';

export type { Oklch };
import { ROLES } from '@/lib/roles';
export { ROLES };
/** Rules the Laboratory offers. Mutation is reached through Vary, not the rule list. */
const STRUCTURES = Structure.options.filter((s) => s !== 'mutation');
const MIN_COLUMNS = 2;
const CANDIDATE_COUNT = 8;
/** Draws per space press; the first survivor is shown. Reproducible from the seed. */
const DRAWS_PER_STEP = 8;
/** Lightness steps for the scale, same chroma and hue, lightest first. */
const SCALE = [0.95, 0.85, 0.75, 0.65, 0.55, 0.45, 0.35, 0.25, 0.15];
const VIEWS: { id: 'normal' | CvdType; label: string }[] = [
  { id: 'normal', label: 'as drawn' },
  { id: 'protan', label: 'protan' },
  { id: 'deutan', label: 'deutan' },
  { id: 'tritan', label: 'tritan' },
];
/** How far Vary moves each colour, in OKLCh units (L, C) and degrees (h). */
const VARY = {
  subtle: { l: 0.03, c: 0.02, h_deg: 8 },
  moderate: { l: 0.05, c: 0.03, h_deg: 15 },
  wide: { l: 0.1, c: 0.06, h_deg: 40 },
} as const;
type VaryAmount = keyof typeof VARY;

export interface Options {
  lightness: { min: number; max: number };
  chroma: { min: number; max: number };
  /** Hue arc in degrees; equal values mean the whole wheel. */
  hue: { from: number; to: number };
  span_deg: number;
  split_deg: number;
  angle_deg: number;
  vary: VaryAmount;
  /** Tradition whose documented colours feed source-led draws; 'all' for every displayable record. */
  source: string;
}
export const DEFAULT_OPTIONS: Options = {
  lightness: { min: 0.18, max: 0.94 },
  chroma: { min: 0, max: 0.3 },
  hue: { from: 0, to: 0 },
  span_deg: DEFAULTS.span_deg,
  split_deg: DEFAULTS.split_deg,
  angle_deg: DEFAULTS.angle_deg,
  vary: 'moderate',
  source: 'all',
};

interface Props {
  points: NamePoint[];
  initial: {
    palette: Oklch[];
    locked: boolean[];
    structure: Structure;
    seed: number;
    /** Representation ids the columns came from, when the palette was loaded from records. */
    sourceIds?: (string | null)[];
    /** Column names given by the user, when reopening a saved palette. */
    labels?: (string | null)[];
    weights?: number[];
    /** Intended text-on-background pairs, by column index. */
    pairs?: Pair[];
  };
  /** Citations for the sources the points rely on, for exports. */
  sources?: Record<string, SourceCitation>;
  /** Public origin, for record links in exports. */
  site?: string;
  seedNote?: string;
  /** Documented sets the wheel panel can load whole. */
  sets?: ColourSet[];
  /** Save into this browser's Library instead of the server's (no accounts configured). */
  localLibrary?: boolean;
}
/** Keyboard shortcuts, shown behind the ? key. */
const KEYS: [string, string][] = [
  ['space', 'generate the next palette; locked columns keep their colour'],
  ['⌘Z · ⇧⌘Z', 'undo · redo'],
  ['⌘V', 'paste hex codes: two to five replace the palette, one sets the dominant'],
  ['esc', 'close adjust or scale'],
  ['← →  on a wheel dot', 'turn its hue 1°, ⇧ for 10°; under a rule the whole palette turns'],
  ['↑ ↓  on a wheel dot', 'more or less chroma'],
  ['enter on a wheel dot', 'lock or unlock it'],
  ['?', 'this list'],
];

const hexOf = (c: Oklch) => toHex(colour('oklch', c));
/** The displayed sRGB colour of a hex, for measurements that must match what is on screen. */
const srgbOf = (hex: string) =>
  colour(
    'srgb',
    [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255) as [number, number, number],
  );
const fmt = (c: Oklch) =>
  `oklch ${c[0].toFixed(3)} ${c[1].toFixed(3)} ${c[1] < 0.005 ? '—' : c[2].toFixed(0)}`;
/** OKLCh of a documented point, clamped to the generator's domain (pure white converts to L a hair above 1). */
const oklchOf = (p: NamePoint): Oklch => {
  const c = convert(colour('oklab', p.oklab), 'oklch').coords;
  return [Math.min(1, Math.max(0, c[0])), Math.max(0, c[1]), Number.isNaN(c[2]) ? 0 : c[2]];
};

function Icon({ d, children }: { d?: string; children?: React.ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {d ? <path d={d} /> : null}
      {children}
    </svg>
  );
}

function download(name: string, type: string, body: string | Uint8Array | Blob) {
  const url = URL.createObjectURL(
    body instanceof Blob ? body : new Blob([body as BlobPart], { type }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** A labelled number input for the options panel. */
function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        className="field h-8 w-24 text-[13px]"
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
      />
    </label>
  );
}

/** One complete state of the columns: colours, where they came from, locks, names and the seed. Undo, history and candidates all hold these. */
interface Snapshot {
  palette: Oklch[];
  sourceIds: (string | null)[];
  locked: boolean[];
  labels: (string | null)[];
  weights: number[];
  seed: number;
  /** Undo steps carry the intended pairs; drawn candidates and history do not. */
  pairs?: Pair[];
}
const UNDO_DEPTH = 50;
/** Slider moves on the same control within this window collapse into one undo step. */
const COALESCE_MS = 800;
/** A hex field that commits as soon as six valid digits are present, or three on Enter or blur. */
function HexField({
  value,
  label,
  onCommit,
}: {
  value: string;
  label: string;
  onCommit: (hex: string) => void;
}) {
  const [text, setText] = useState(value.slice(1).toUpperCase());
  useEffect(() => setText(value.slice(1).toUpperCase()), [value]);
  const commit = (t: string) => {
    const hex = parseHex(t);
    if (hex && hex !== value) onCommit(hex);
    else if (!hex) setText(value.slice(1).toUpperCase());
  };
  return (
    <input
      type="text"
      inputMode="text"
      spellCheck={false}
      value={text}
      aria-label={label}
      aria-invalid={parseHex(text) ? undefined : true}
      className="field h-8 w-24 font-mono text-[13px] uppercase"
      onChange={(e) => {
        const t = e.target.value;
        setText(t);
        if (/^#?[0-9a-f]{6}$/i.test(t.trim())) commit(t);
      }}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit(e.currentTarget.value);
      }}
    />
  );
}

/**
 * Coolors on our terms: one column per role, space draws the next candidate under the current rule and locks,
 * and every column names the nearest documented colour with that record's status. The generator runs in the page.
 * Columns can be added, removed and reordered; Candidates shows eight diverse options; Vary moves around the current
 * palette; source-led draws take colours from documented records and name them; the rule's angles and the bounds are
 * editable; the URL always holds the current palette; the view can simulate a colour-vision deficiency.
 * Any colour can be typed or picked; every edit can be undone; a contrast table grades each pair.
 */
export function Columns({
  points,
  initial,
  seedNote,
  sets = [],
  localLibrary = false,
  sources = {},
  site = '',
}: Props) {
  const [palette, setPalette] = useState<Oklch[]>(initial.palette);
  const [sourceIds, setSourceIds] = useState<(string | null)[]>(
    initial.sourceIds ?? initial.palette.map(() => null),
  );
  /** Names the user gave to columns; null falls back to the generator role. */
  const [labels, setLabels] = useState<(string | null)[]>(
    initial.labels ?? initial.palette.map(() => null),
  );
  const [weights, setWeights] = useState(initial.weights ?? initial.palette.map(() => 1));
  const [pairs, setPairs] = useState<Pair[]>(initial.pairs ?? []);
  const [showAreas, setShowAreas] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [locked, setLocked] = useState<boolean[]>(initial.locked);
  const [structure, setStructure] = useState<Structure>(initial.structure);
  const [seed, setSeed] = useState(initial.seed);
  const [draws, setDraws] = useState(0);
  const [history, setHistory] = useState<Snapshot[]>([
    {
      palette: initial.palette,
      sourceIds: initial.sourceIds ?? initial.palette.map(() => null),
      locked: initial.locked,
      labels: initial.labels ?? initial.palette.map(() => null),
      seed: initial.seed,
      weights: initial.weights ?? initial.palette.map(() => 1),
    },
  ]);
  const [candidates, setCandidates] = useState<Snapshot[]>([]);
  const [adjust, setAdjust] = useState<number | null>(null);
  const [scale, setScale] = useState<number | null>(null);
  const [view, setView] = useState<'normal' | CvdType>('normal');
  const [options, setOptions] = useState<Options>(DEFAULT_OPTIONS);
  const [showOptions, setShowOptions] = useState(false);
  const [notice, setNotice] = useState<ReactNode>(null);
  const [showContrast, setShowContrast] = useState(false);
  /** One of the inspection views at a time, below the columns. */
  const [view2, setView2] = useState<
    'lightness' | 'neighbours' | 'gradients' | 'relations' | 'scales' | 'distinct' | null
  >(null);
  const [showWheel, setShowWheel] = useState(false);
  const [slice, setSlice] = useState<number | null>(null);
  // Documented points shown on the wheel come from the same set (options.source) that the nearest readout uses.
  const [showOverlay, setShowOverlay] = useState(false);
  const [ghost, setGhost] = useState(false);
  const [past, setPast] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);
  const exportRef = useRef<HTMLDetailsElement>(null);
  const current = useRef<Snapshot>({ palette, sourceIds, locked, labels, weights, seed, pairs });
  current.current = { palette, sourceIds, locked, labels, weights, seed, pairs };
  const lastEdit = useRef<{ key: string; at: number } | null>(null);

  /** Records the current state as an undo step. A key collapses repeated moves of one control. */
  const remember = useCallback((key?: string) => {
    const now = Date.now();
    if (key && lastEdit.current?.key === key && now - lastEdit.current.at < COALESCE_MS) {
      lastEdit.current.at = now;
      return;
    }
    lastEdit.current = key ? { key, at: now } : null;
    setPast((p) => [...p.slice(1 - UNDO_DEPTH), current.current]);
    setFuture([]);
  }, []);
  const restore = (s: Snapshot) => {
    setPalette(s.palette);
    setSourceIds(s.sourceIds);
    setLocked(s.locked);
    setLabels(s.labels);
    setWeights(s.weights);
    setSeed(s.seed);
    if (s.pairs) setPairs(s.pairs);
    lastEdit.current = null;
  };
  const undo = () => {
    const s = past.at(-1);
    if (!s) return;
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [...f, current.current]);
    restore(s);
  };
  const redo = () => {
    const s = future.at(-1);
    if (!s) return;
    setFuture((f) => f.slice(0, -1));
    setPast((p) => [...p, current.current]);
    restore(s);
  };
  const undoRef = useRef({ undo, redo });
  undoRef.current = { undo, redo };

  const roles = ROLES.slice(0, palette.length);
  const nameOf = (i: number) => labels[i] || roles[i]!;
  const traditions = [...new Set(points.map((p) => p.group))].sort();
  const byId = new Map(points.map((p) => [p.id, p]));

  /** Everything the generator needs from the screen, for the given rule. */
  const paramsFor = useCallback(
    (s: Structure, next: number, count: number, p: Oklch[], l: boolean[]): GeneratorParamsInput => {
      // A locked colour is never moved. If it sits outside the bounds, the bounds widen to hold it.
      const locks: Partial<Record<Role, Oklch>> = {};
      const lightness = { ...options.lightness };
      const chroma = { ...options.chroma };
      roles.forEach((r, i) => {
        if (!l[i]) return;
        const [L, C, h] = p[i]!;
        locks[r] = [L, C, h];
        lightness.min = Math.min(lightness.min, L);
        lightness.max = Math.max(lightness.max, L);
        chroma.min = Math.min(chroma.min, C);
        chroma.max = Math.max(chroma.max, C);
      });
      const arc = options.hue.from === options.hue.to ? undefined : { ...options.hue };
      const sourcePoints = points.filter(
        (pt) => options.source === 'all' || pt.group === options.source,
      );
      return {
        seed: next,
        count,
        roles,
        structure: s,
        structureParams: {
          span_deg: options.span_deg,
          split_deg: options.split_deg,
          angle_deg: options.angle_deg,
          mutation: VARY[options.vary],
        },
        locks,
        bounds: {
          lightness,
          chroma,
          ...(arc ? { hue: arc } : {}),
        },
        ...(s === 'source-led'
          ? { sourceColours: sourcePoints.map((pt) => ({ id: pt.id, oklch: oklchOf(pt) })) }
          : {}),
        ...(s === 'mutation' ? { seedPalette: p } : {}),
        dedupe: { nearThreshold: count <= DRAWS_PER_STEP ? 0 : 0.02 },
        output: { gamut: 'srgb', policy: 'css', allowApproximate: true },
      };
    },
    [roles, options, points],
  );

  /** Whether a locked colour lies outside the chosen bounds, so the user hears that the bounds gave way. */
  const lockOutsideBounds = (p: Oklch[], l: boolean[]) =>
    p.some(
      (c, i) =>
        l[i] &&
        (c[0] < options.lightness.min ||
          c[0] > options.lightness.max ||
          c[1] < options.chroma.min ||
          c[1] > options.chroma.max),
    );
  const adopt = (s: Snapshot) => {
    remember();
    setPalette(s.palette);
    setSourceIds(s.sourceIds);
    setLocked(s.locked);
    setLabels(s.labels);
    setWeights(s.weights);
    setAdjust(null);
    setScale(null);
    setHistory((h) => (h.some((x) => x.palette === s.palette) ? h : [s, ...h].slice(0, 12)));
  };

  const drawWith = useCallback(
    (s: Structure, label: string | null) => {
      const next = seed + 1;
      try {
        // Gamut mapping can push one draw outside the chroma bounds, so draw a few and keep the first survivor.
        const { candidates: drawn } = run(paramsFor(s, next, DRAWS_PER_STEP, palette, locked));
        // Source-led: prefer a draw whose unlocked columns come from different records.
        const distinct = (x: (typeof drawn)[number]) => {
          const ids = x.colours.map((y) => y.sourceId).filter(Boolean);
          return new Set(ids).size === ids.length;
        };
        const c = (s === 'source-led' ? drawn.find(distinct) : undefined) ?? drawn[0];
        if (!c) return setNotice('The rule produced nothing under these locks and bounds.');
        const p = c.colours.map((x) => x.oklch as Oklch);
        // A locked column keeps the record it came from; the generator only names what it drew.
        const ids = c.colours.map((x, i) => x.sourceId ?? (locked[i] ? sourceIds[i]! : null));
        remember();
        setPalette(p);
        setSourceIds(ids);
        setSeed(next);
        setDraws((n) => n + 1);
        setHistory((h) =>
          [{ palette: p, sourceIds: ids, locked, labels, weights, seed: next }, ...h].slice(0, 12),
        );
        setNotice(
          label ??
            (lockOutsideBounds(palette, locked)
              ? 'A locked colour lies outside the bounds, so the bounds widened to keep it as it is.'
              : null),
        );
      } catch (e) {
        setNotice((e as Error).message);
      }
    },
    [seed, palette, locked, sourceIds, labels, weights, options, paramsFor, remember],
  );

  const draw = useCallback(() => drawWith(structure, null), [drawWith, structure]);
  const vary = () => {
    const v = VARY[options.vary];
    drawWith(
      'mutation',
      `Varied around the previous palette (${options.vary}: up to ±${v.l} L, ±${v.c} C, ±${v.h_deg}° h). Locked columns held.`,
    );
  };

  function drawCandidates() {
    const next = seed + 1;
    try {
      const { candidates: drawn } = run(paramsFor(structure, next, 64, palette, locked));
      const subset: Snapshot[] = diverseSubset(drawn, CANDIDATE_COUNT).map((c) => ({
        palette: c.colours.map((x) => x.oklch as Oklch),
        sourceIds: c.colours.map((x, i) => x.sourceId ?? (locked[i] ? sourceIds[i]! : null)),
        locked,
        labels,
        weights,
        seed: next,
      }));
      if (!subset.length)
        return setNotice('The rule produced nothing under these locks and bounds.');
      setCandidates(subset);
      setSeed(next);
      setNotice(
        `${subset.length} candidates from seed ${next}, spread by farthest-point sampling in OKLab. Choose one to adopt it.`,
      );
    } catch (e) {
      setNotice((e as Error).message);
    }
  }

  function addColumn() {
    if (palette.length >= ROLES.length) return;
    const nextRoles = ROLES.slice(0, palette.length + 1);
    let added: Oklch | null = null;
    try {
      const base = structure === 'source-led' ? 'free-form' : structure;
      const params = paramsFor(
        base,
        seed + 1,
        1,
        palette,
        palette.map(() => true),
      );
      const { candidates: drawn } = run({ ...params, roles: nextRoles });
      added = (drawn[0]?.colours.at(-1)?.oklch as Oklch | undefined) ?? null;
    } catch {
      added = null;
    }
    const last = palette.at(-1)!;
    remember();
    setPalette([...palette, added ?? ([last[0], last[1], (last[2] + 60) % 360] as Oklch)]);
    setSourceIds((s) => [...s, null]);
    setLocked((l) => [...l, false]);
    setLabels((l) => [...l, null]);
    setWeights((w) => [...w, 1]);
    setNotice(`Added ${nextRoles.at(-1)} under the ${structure} rule.`);
  }

  function removeColumn(i: number) {
    if (palette.length <= MIN_COLUMNS) return;
    remember();
    setPalette((p) => p.filter((_, j) => j !== i));
    setSourceIds((s) => s.filter((_, j) => j !== i));
    setLocked((l) => l.filter((_, j) => j !== i));
    setLabels((l) => l.filter((_, j) => j !== i));
    setWeights((w) => w.filter((_, j) => j !== i));
    // Pairs that used the column go; the rest keep pointing at the same colours.
    setPairs((ps) =>
      ps
        .filter((p) => p[0] !== i && p[1] !== i)
        .map((p) => [p[0] > i ? p[0] - 1 : p[0], p[1] > i ? p[1] - 1 : p[1]] as Pair),
    );
    setAdjust(null);
    setScale(null);
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= palette.length) return;
    remember();
    const swap = <T,>(a: T[]) => {
      const b = [...a];
      [b[i], b[j]] = [b[j]!, b[i]!];
      return b;
    };
    setPalette(swap);
    setSourceIds(swap);
    setLocked(swap);
    setLabels(swap);
    setWeights(swap);
    const at = (x: number) => (x === i ? j : x === j ? i : x);
    setPairs((ps) => ps.map((p) => [at(p[0]), at(p[1])] as Pair));
    setAdjust(null);
    setScale(null);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        // Text fields keep their own undo.
        if (t && /^(INPUT|TEXTAREA)$/.test(t.tagName) && (t as HTMLInputElement).type !== 'range')
          return;
        e.preventDefault();
        if (e.shiftKey) undoRef.current.redo();
        else undoRef.current.undo();
        return;
      }
      if (e.key === 'Escape') {
        setAdjust(null);
        setScale(null);
        setShowKeys(false);
        return;
      }
      if (e.key === '?' && !(t && /^(INPUT|TEXTAREA)$/.test(t.tagName))) {
        setShowKeys((k) => !k);
        return;
      }
      if (e.code !== 'Space' || (t && /^(INPUT|SELECT|TEXTAREA|BUTTON|A)$/.test(t.tagName))) return;
      e.preventDefault();
      draw();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [draw]);

  // The address bar always holds the current palette, rule and seed, so the URL is the share link.
  // Written a beat after the last change: Safari throws once replaceState runs more than
  // 100 times in 10 seconds, which a slider drag reaches easily.
  const lastWritten = useRef('');
  useEffect(() => {
    const t = window.setTimeout(() => {
      const search = `?${stateParams({ palette, structure, seed, locked, labels, weights, sourceIds, pairs })}`;
      if (search === lastWritten.current) return;
      lastWritten.current = search;
      const url = new URL(window.location.href);
      url.search = search;
      window.history.replaceState(null, '', url);
    }, 150);
    return () => window.clearTimeout(t);
  }, [palette, structure, seed, locked, labels, weights, sourceIds, pairs]);

  // Pasted hex codes become the palette: two to five replace it, one sets the dominant.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA)$/.test(t.tagName)) return;
      const found = hexesIn(e.clipboardData?.getData('text') ?? '').slice(0, ROLES.length);
      if (!found.length) return;
      e.preventDefault();
      remember();
      const list = found.map((h) => oklchOfHex(h));
      if (list.length === 1) {
        setPalette((p) => p.map((x, j) => (j === 0 ? list[0]! : x)));
        setSourceIds((s) => s.map((x, j) => (j === 0 ? null : x)));
        setNotice(`Pasted ${found[0]!.toUpperCase()} into the dominant column.`);
        return;
      }
      setPalette(list);
      setSourceIds(list.map(() => null));
      setLocked(list.map(() => false));
      setLabels(list.map(() => null));
      setWeights(list.map(() => 1));
      setPairs([]);
      setAdjust(null);
      setScale(null);
      setNotice(`Pasted ${list.length} colours. Press space to draw around the ones you lock.`);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [remember]);

  /** Replaces the palette with a documented set, each column locked and named after its record. */
  const loadSet = (set: ColourSet) => {
    const found = set.conceptIds
      .map((cid) => points.find((p) => p.conceptId === cid))
      .filter((p): p is NamePoint => !!p)
      .slice(0, ROLES.length);
    if (found.length < MIN_COLUMNS)
      return setNotice(`${set.label}: fewer than two members have a displayable value.`);
    remember();
    setPalette(found.map(oklchOf));
    setSourceIds(found.map((p) => p.id));
    setLocked(found.map(() => true));
    setLabels(found.map(() => null));
    setWeights(found.map(() => 1));
    setPairs([]);
    setAdjust(null);
    setScale(null);
    const what =
      found.length === set.conceptIds.length
        ? set.label
        : `${found.length} of ${set.conceptIds.length} from ${set.label}`;
    setNotice(
      `Loaded ${what}, all locked. Unlock a column and press space to draw around the rest.`,
    );
  };

  /** Turns every unlocked column by delta degrees; the wheel calls this while a rule is active. */
  const rotate = (delta: number, key: string) => {
    remember(key);
    setPalette((p) => p.map((x, j) => (locked[j] ? x : [x[0], x[1], (x[2] + delta + 360) % 360])));
  };
  /** Adds a column with a given colour, from the wheel or a documented point. */
  const addColour = (c: Oklch, sourceId: string | null, label: string) => {
    if (palette.length >= ROLES.length)
      return setNotice('Five columns is the most. Remove one to add another.');
    remember();
    setPalette((p) => [...p, c]);
    setSourceIds((s) => [...s, sourceId]);
    setLocked((l) => [...l, false]);
    setLabels((l) => [...l, null]);
    setWeights((w) => [...w, 1]);
    setNotice(`Added ${ROLES[palette.length]} from the wheel: ${label}.`);
  };
  const sliceL = slice ?? palette[0]![0];
  const setPoints: OverlayPoint[] = !showOverlay
    ? []
    : points
        .filter((pt) => options.source === 'all' || pt.group === options.source)
        .map((pt) => ({
          id: pt.id,
          oklch: oklchOf(pt),
          hex: pt.hex,
          label: pt.label,
          href: `/dictionary/${pt.conceptId}`,
        }));
  const overlayPoints = setPoints.filter((p) => inBand(p, sliceL));
  const nearestIn = options.source === 'all' ? undefined : options.source;

  /** Edits keep the column's record so exports can say what it came from and that it was edited. */
  const setColour = (i: number, c: Oklch, key: string) => {
    remember(key);
    setPalette((p) => p.map((x, j) => (j === i ? c : x)));
  };

  async function save() {
    if (localLibrary) {
      const entry = addPalette(localStorage, {
        palette,
        structure,
        seed,
        locked,
        labels,
        weights,
        sourceIds,
      });
      return setNotice(
        <>
          Saved in this browser as “{entry.note}”, with its locks, names and records.{' '}
          <Link href="/library" className="underline underline-offset-2">
            Open the Library
          </Link>
        </>,
      );
    }
    const res = await fetch('/api/palettes', {
      method: 'POST',
      body: JSON.stringify({ palette, structure, seed, locked, labels, weights, sourceIds }),
    });
    if (res.status === 401)
      return setNotice(
        <>
          <Link
            href={`/signin?next=${encodeURIComponent(window.location.pathname + window.location.search)}`}
            className="underline underline-offset-2"
          >
            Sign in
          </Link>{' '}
          to save palettes. This one stays in the address until you are back.
        </>,
      );
    const j = (await res.json()) as { number?: number; error?: string };
    setNotice(
      res.ok ? (
        <>
          Saved as version {j.number}, with its locks, names and records.{' '}
          <Link href="/library" className="underline underline-offset-2">
            Open the Library
          </Link>
        </>
      ) : (
        `Not saved: ${j.error}`
      ),
    );
  }

  const closeExport = () => exportRef.current?.removeAttribute('open');

  /** Every column with its record, how that record's value was obtained, and whether the column still shows it. */
  const exportColours = (): ExportColour[] =>
    palette.map((c, i) => {
      const near = nearestPoint(
        points,
        convert(colour('oklch', c), 'oklab').coords as Oklch,
        undefined,
        nearestIn,
      );
      const src = sourceIds[i] ? byId.get(sourceIds[i]!) : undefined;
      return {
        role: roles[i]!,
        name: nameOf(i),
        oklch: c,
        hex: hexOf(c),
        locked: locked[i]!,
        areaWeight: weights[i]!,
        areaShare: weights[i]! / weights.reduce((a, b) => a + b, 0),
        record:
          src && src.provenance
            ? {
                id: src.id,
                concept: src.conceptId,
                label: src.label,
                collection: groupLabel(src.group),
                value: { space: src.provenance.space, coords: src.provenance.coords, hex: src.hex },
                approximation: src.provenance.approximation,
                method: src.provenance.method,
                source: sources[src.provenance.source] ?? null,
                ...(src.provenance.locator ? { locator: src.provenance.locator } : {}),
                edited: hexOf(c) !== src.hex,
              }
            : null,
        nearest: near
          ? {
              record: near.id,
              concept: near.conceptId,
              label: near.label,
              collection: groupLabel(near.group),
              distance: near.distance,
              ...(near.provenance ? { approximation: near.provenance.approximation } : {}),
            }
          : null,
      };
    });
  const exportPalette = () => ({
    structure,
    seed,
    bounds: { lightness: options.lightness, chroma: options.chroma, hue: options.hue },
    colours: exportColours(),
    site,
    pairs,
  });
  async function exportCss() {
    await navigator.clipboard.writeText(cssExport(exportPalette()));
    setNotice('CSS copied to the clipboard, with a provenance comment above each variable.');
    closeExport();
  }
  function exportJson() {
    download(`palette-${structure}-${seed}.json`, 'application/json', jsonExport(exportPalette()));
    setNotice('JSON downloaded, with each record, its source and whether the column was edited.');
    closeExport();
  }
  function exportText(ext: string, type: string, body: string, what: string) {
    download(`palette-${structure}-${seed}.${ext}`, type, body);
    setNotice(`${what} downloaded.`);
    closeExport();
  }
  function exportPng() {
    // Drawn here from the same values the columns show: swatches, names, hex, and the record ids.
    const w = 240;
    const h = 320;
    const canvas = document.createElement('canvas');
    canvas.width = w * palette.length;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    exportColours().forEach((c, i) => {
      ctx.fillStyle = c.hex;
      ctx.fillRect(i * w, 0, w, h);
      ctx.fillStyle =
        contrastRatio(colour('srgb', [0.1, 0.1, 0.1]), srgbOf(c.hex)) >=
        contrastRatio(colour('srgb', [1, 1, 1]), srgbOf(c.hex))
          ? '#1a1a1a'
          : '#ffffff';
      ctx.font = '600 22px ui-monospace, monospace';
      ctx.fillText(c.hex.toUpperCase(), i * w + 16, h - 64);
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText(c.name, i * w + 16, h - 40);
      ctx.font = '11px ui-monospace, monospace';
      ctx.fillText(
        c.record ? `${c.record.id}${c.record.edited ? ' · edited' : ''}` : 'no record',
        i * w + 16,
        h - 20,
      );
    });
    canvas.toBlob((blob) => {
      if (!blob) return setNotice('PNG export failed.');
      download(`palette-${structure}-${seed}.png`, 'image/png', blob);
      setNotice('PNG downloaded.');
      closeExport();
    }, 'image/png');
  }
  function exportSvg() {
    download(
      `palette-${structure}-${seed}.svg`,
      'image/svg+xml',
      svgExport(exportPalette(), (hex) =>
        contrastRatio(colour('srgb', [0.1, 0.1, 0.1]), srgbOf(hex)) >=
        contrastRatio(colour('srgb', [1, 1, 1]), srgbOf(hex))
          ? '#1a1a1a'
          : '#ffffff',
      ),
    );
    setNotice('SVG downloaded, with record ids and provenance on each swatch.');
    closeExport();
  }
  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setNotice('Link copied. It reopens this palette with its rule, seed, locks and names.');
    closeExport();
  }

  /** What the column shows: the colour as drawn, or its simulated appearance under the chosen deficiency. */
  const shownHex = (c: Oklch) =>
    view === 'normal' ? hexOf(c) : toHex(simulateCvd(colour('oklch', c), view));

  const legend = 'mb-1 text-xs tracking-[1px] text-[var(--muted)] uppercase';
  const menuItem = 'px-3 py-1.5 text-left hover:bg-[var(--accent-soft)]';

  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col" data-testid="lab">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] px-4 py-2 text-sm">
        <span className="font-mono text-xs text-[var(--muted)]" data-testid="counter">
          generation {draws} · seed {seed}
        </span>
        <span className="hidden flex-1 text-center text-[var(--muted)] 2xl:block">
          <kbd className="rounded-sm border border-[var(--line)] px-2 py-0.5 text-xs">space</kbd>{' '}
          generates
        </span>
        <span className="flex-1 2xl:hidden" />
        <label className="flex items-center gap-2">
          Rule
          <select
            value={structure}
            onChange={(e) => setStructure(e.target.value as Structure)}
            className="field w-44"
            data-testid="structure"
          >
            {STRUCTURES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        {structure === 'source-led' ? (
          <label className="flex items-center gap-2">
            Source
            <select
              value={options.source}
              onChange={(e) => setOptions((o) => ({ ...o, source: e.target.value }))}
              className="field"
              data-testid="source"
            >
              <option value="all">all ({points.length})</option>
              {traditions.map((t) => (
                <option key={t} value={t}>
                  {groupLabel(t)} ({points.filter((p) => p.group === t).length})
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          type="button"
          onClick={() => setShowOptions((s) => !s)}
          className="btn"
          aria-expanded={showOptions}
          data-testid="options-button"
        >
          Options
        </button>
        <span className="mx-1 hidden h-6 w-px bg-[var(--line)] sm:block" aria-hidden="true" />
        <button
          type="button"
          onClick={draw}
          className="btn btn-primary"
          title="Generate the next palette under the rule; locked columns keep their colour (space)"
          data-testid="draw"
        >
          Generate
        </button>
        <button
          type="button"
          onClick={vary}
          className="btn"
          title="Move every unlocked colour a little around where it is"
          data-testid="vary"
        >
          Variations
        </button>
        <button
          type="button"
          onClick={drawCandidates}
          className="btn"
          title="Eight different palettes under the same rule, to choose from"
          data-testid="candidates-button"
        >
          Alternatives
        </button>
        <button
          type="button"
          onClick={addColumn}
          className="btn"
          disabled={palette.length >= ROLES.length}
          aria-label="Add column"
          data-testid="add-column"
        >
          Add
        </button>
        <details ref={exportRef} className="relative">
          <summary className="btn cursor-pointer list-none" data-testid="export">
            Export
          </summary>
          <div className="absolute right-0 z-10 mt-1 flex w-64 flex-col rounded-md border border-[var(--line)] bg-[var(--surface)] py-1 text-sm shadow-sm">
            <button type="button" onClick={exportCss} className={menuItem}>
              Copy CSS variables
            </button>
            <button
              type="button"
              onClick={exportJson}
              className={menuItem}
              data-testid="export-json"
            >
              Download JSON
            </button>
            <button type="button" onClick={exportSvg} className={menuItem} data-testid="export-svg">
              Download SVG
            </button>
            <button type="button" onClick={exportPng} className={menuItem} data-testid="export-png">
              Download PNG
            </button>
            <button
              type="button"
              onClick={() =>
                exportText(
                  'tailwind.js',
                  'text/javascript',
                  tailwindExport(exportPalette()),
                  'Tailwind config',
                )
              }
              className={menuItem}
              data-testid="export-tailwind"
            >
              Download Tailwind config
            </button>
            <button
              type="button"
              onClick={() => exportText('scss', 'text/x-scss', scssExport(exportPalette()), 'SCSS')}
              className={menuItem}
              data-testid="export-scss"
            >
              Download SCSS
            </button>
            <button
              type="button"
              onClick={() =>
                exportText(
                  'tokens.json',
                  'application/json',
                  tokensExport(exportPalette()),
                  'Design tokens',
                )
              }
              className={menuItem}
              data-testid="export-tokens"
            >
              Download design tokens (Figma, Style Dictionary)
            </button>
            <button
              type="button"
              onClick={() => {
                download(
                  `palette-${structure}-${seed}.ase`,
                  'application/octet-stream',
                  aseExport(exportPalette()),
                );
                setNotice('Adobe swatch file downloaded.');
                closeExport();
              }}
              className={menuItem}
              data-testid="export-ase"
            >
              Download Adobe swatches (.ase)
            </button>
            <button type="button" onClick={copyLink} className={menuItem} data-testid="copy-link">
              Copy link
            </button>
          </div>
        </details>
        <button type="button" onClick={save} className="btn" data-testid="save">
          Save
        </button>
        <button
          type="button"
          onClick={() => setShowKeys((k) => !k)}
          className="btn w-9 px-0 font-mono"
          aria-expanded={showKeys}
          aria-label="Keyboard shortcuts"
          data-testid="keys-button"
        >
          ?
        </button>
      </div>

      {showKeys ? (
        <dl
          className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-5 gap-y-1 border-b border-[var(--line)] px-5 py-3 text-[13px]"
          data-testid="keys"
        >
          {KEYS.map(([k, what]) => (
            <div key={k} className="contents">
              <dt>
                <kbd className="rounded-sm border border-[var(--line)] px-1.5 py-0.5 font-mono text-xs">
                  {k}
                </kbd>
              </dt>
              <dd className="text-[var(--muted)]">{what}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {showOptions ? (
        <div
          className="flex flex-wrap items-end gap-x-6 gap-y-3 border-b border-[var(--line)] px-5 py-3 text-[13px]"
          data-testid="options"
        >
          <fieldset className="flex items-end gap-2">
            <legend className={legend}>Lightness L</legend>
            <NumberField
              label="Lightness minimum"
              value={options.lightness.min}
              min={0}
              max={1}
              step={0.01}
              onChange={(n) => setOptions((o) => ({ ...o, lightness: { ...o.lightness, min: n } }))}
            />
            <NumberField
              label="Lightness maximum"
              value={options.lightness.max}
              min={0}
              max={1}
              step={0.01}
              onChange={(n) => setOptions((o) => ({ ...o, lightness: { ...o.lightness, max: n } }))}
            />
          </fieldset>
          <fieldset className="flex items-end gap-2">
            <legend className={legend}>Chroma C</legend>
            <NumberField
              label="Chroma minimum"
              value={options.chroma.min}
              min={0}
              max={0.4}
              step={0.01}
              onChange={(n) => setOptions((o) => ({ ...o, chroma: { ...o.chroma, min: n } }))}
            />
            <NumberField
              label="Chroma maximum"
              value={options.chroma.max}
              min={0}
              max={0.4}
              step={0.01}
              onChange={(n) => setOptions((o) => ({ ...o, chroma: { ...o.chroma, max: n } }))}
            />
          </fieldset>
          <fieldset className="flex items-end gap-2">
            <legend className={legend}>Hue arc, degrees (equal = whole wheel)</legend>
            <NumberField
              label="Hue arc from"
              value={options.hue.from}
              min={0}
              max={360}
              step={1}
              onChange={(n) => setOptions((o) => ({ ...o, hue: { ...o.hue, from: n } }))}
            />
            <NumberField
              label="Hue arc to"
              value={options.hue.to}
              min={0}
              max={360}
              step={1}
              onChange={(n) => setOptions((o) => ({ ...o, hue: { ...o.hue, to: n } }))}
            />
          </fieldset>
          <fieldset className="flex items-end gap-2">
            <legend className={legend}>Rule angles, degrees</legend>
            <NumberField
              label="Analogous span"
              value={options.span_deg}
              min={0}
              max={180}
              step={1}
              onChange={(n) => setOptions((o) => ({ ...o, span_deg: n }))}
            />
            <NumberField
              label="Split angle"
              value={options.split_deg}
              min={0}
              max={90}
              step={1}
              onChange={(n) => setOptions((o) => ({ ...o, split_deg: n }))}
            />
            <NumberField
              label="Tetradic angle"
              value={options.angle_deg}
              min={0}
              max={180}
              step={1}
              onChange={(n) => setOptions((o) => ({ ...o, angle_deg: n }))}
            />
          </fieldset>
          <label className="flex flex-col gap-1">
            <span className={legend}>Vary amount</span>
            <select
              value={options.vary}
              onChange={(e) => setOptions((o) => ({ ...o, vary: e.target.value as VaryAmount }))}
              className="field h-8 text-[13px]"
              data-testid="vary-amount"
            >
              {(Object.keys(VARY) as VaryAmount[]).map((k) => (
                <option key={k} value={k}>
                  {k} · ±{VARY[k].l} L, ±{VARY[k].c} C, ±{VARY[k].h_deg}°
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setOptions(DEFAULT_OPTIONS)}
            className="btn h-8 text-[13px]"
          >
            Reset
          </button>
          <span className="basis-full text-xs text-[var(--muted)]">
            A lock outside the bounds is refused, never moved. Angles are product defaults on the
            OKLCh wheel, not laws.
          </span>
        </div>
      ) : null}

      {seedNote || notice ? (
        <p
          className="border-b border-[var(--line)] px-5 py-2 text-sm"
          role="status"
          data-testid="notice"
        >
          {notice ?? seedNote}
        </p>
      ) : null}

      {showAreas ? (
        <section
          aria-label="Palette proportions"
          className="shrink-0 border-b border-[var(--line)] px-5 py-3"
        >
          <p className="mb-3 text-sm text-[var(--muted)]">
            Keep the colours fixed and compare their areas. Weights are relative: 7, 2, 1 gives 70%,
            20%, 10%. This strip models area, not placement or a finished composition.
          </p>
          <div
            className="flex h-28 overflow-hidden rounded-md"
            data-testid="area-preview"
            role="img"
            aria-label="Relative colour areas; percentages are listed below"
          >
            {palette.map((c, i) => (
              <span
                key={i}
                data-testid="area-swatch"
                style={{ background: shownHex(c), flex: `${weights[i]} 1 0%` }}
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-4">
            {palette.map((_, i) => (
              <div key={i} className="flex flex-col gap-1 text-sm">
                {nameOf(i)} ·{' '}
                {((100 * weights[i]!) / weights.reduce((a, b) => a + b, 0)).toFixed(1)}%
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  value={weights[i]}
                  aria-label={`${roles[i]} area slider`}
                  onChange={(e) => {
                    remember(`weight-${i}`);
                    setWeights((w) => w.map((x, j) => (j === i ? Number(e.target.value) : x)));
                  }}
                />
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={weights[i]}
                  aria-label={`${roles[i]} area weight`}
                  className="field h-8 w-20"
                  onChange={(e) => {
                    const w = Number(e.target.value);
                    if (Number.isInteger(w) && w >= 1 && w <= 100) {
                      remember(`weight-${i}`);
                      setWeights((list) => list.map((x, j) => (j === i ? w : x)));
                    }
                  }}
                />
              </div>
            ))}
            <button
              type="button"
              className="btn"
              onClick={() => {
                remember();
                setWeights(palette.map(() => 1));
              }}
            >
              Equal areas
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                remember();
                setWeights((w) => [...w].reverse());
              }}
            >
              Reverse areas
            </button>
          </div>
        </section>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
        <div className="flex min-h-0 flex-1 flex-col sm:flex-row" data-testid="columns">
          {palette.map((c, i) => {
            const v = colour('oklch', c);
            const hex = hexOf(c);
            const shown = shownHex(c);
            const shownValue = view === 'normal' ? v : simulateCvd(v, view);
            // Ink is whichever of black or white contrasts more with the column as shown; never a tint of it.
            const dark =
              contrastRatio(colour('srgb', [0.1, 0.1, 0.1]), shownValue) >=
              contrastRatio(colour('srgb', [1, 1, 1]), shownValue);
            const ink = dark ? '#1a1a1a' : '#ffffff';
            const chip = { background: dark ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.18)' };
            const near = nearestPoint(
              points,
              convert(v, 'oklab').coords as [number, number, number],
              undefined,
              nearestIn,
            );
            const source = sourceIds[i] ? byId.get(sourceIds[i]!) : undefined;
            const edited = !!source && source.hex !== hex;
            const outside = !inGamut(v, 'srgb');
            const role = roles[i]!;
            const entry = source ?? (near && near.distance < 0.25 ? near : null);
            return (
              <section
                key={i}
                className="group relative flex min-h-[160px] flex-1 flex-col items-center justify-end px-4 pb-16 [@media(hover:none)]:min-h-[560px]"
                style={{ background: shown, color: ink }}
                data-testid="column"
                data-hex={hex}
                data-oklch={c.map((n) => n.toFixed(3)).join(',')}
                data-role={role}
                data-source={source?.id}
                data-edited={edited || undefined}
                data-locked={locked[i] || undefined}
                aria-label={`${role} ${hex}`}
              >
                <div className="absolute top-5 right-5 flex gap-2 text-xs font-medium">
                  {locked[i] ? <span data-testid="lock-badge">locked</span> : null}
                  {outside ? <span>outside sRGB · mapped</span> : null}
                  {view !== 'normal' ? (
                    <span data-testid="view-badge">seen as {view} · approximation</span>
                  ) : null}
                </div>
                <div
                  className={`absolute top-14 grid grid-cols-2 gap-2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100 ${adjust === i || scale === i ? 'hidden' : ''}`}
                  data-testid="controls"
                >
                  <button
                    type="button"
                    onClick={() => {
                      remember();
                      setLocked((l) => l.map((x, j) => (j === i ? !x : x)));
                    }}
                    aria-pressed={locked[i]}
                    aria-label={`${locked[i] ? 'Unlock' : 'Lock'} ${role}`}
                    className="grid h-11 w-11 place-items-center rounded-md"
                    style={chip}
                    data-testid="lock"
                  >
                    <Icon>
                      <rect x="5" y="11" width="14" height="10" rx="2" />
                      <path d={locked[i] ? 'M8 11V7a4 4 0 0 1 8 0v4' : 'M8 11V7a4 4 0 0 1 7.5-2'} />
                    </Icon>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdjust(adjust === i ? null : i);
                      setScale(null);
                    }}
                    aria-expanded={adjust === i}
                    aria-label={`Adjust ${role}`}
                    className="grid h-11 w-11 place-items-center rounded-md"
                    style={chip}
                  >
                    <Icon d="M4 8h10M18 8h2M4 16h2M10 16h10">
                      <circle cx="16" cy="8" r="2" />
                      <circle cx="8" cy="16" r="2" />
                    </Icon>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScale(scale === i ? null : i);
                      setAdjust(null);
                    }}
                    aria-expanded={scale === i}
                    aria-label={`Scale ${role}`}
                    className="grid h-11 w-11 place-items-center rounded-md"
                    style={chip}
                    data-testid="scale"
                  >
                    <Icon d="M4 6h16M4 12h16M4 18h16" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      navigator.clipboard.writeText(hex).then(() => setNotice(`${hex} copied.`))
                    }
                    aria-label={`Copy ${hex}`}
                    className="grid h-11 w-11 place-items-center rounded-md"
                    style={chip}
                  >
                    <Icon d="M5 15V5a2 2 0 0 1 2-2h10">
                      <rect x="9" y="9" width="11" height="11" rx="2" />
                    </Icon>
                  </button>
                  {entry ? (
                    <Link
                      href={`/dictionary/${entry.conceptId}`}
                      aria-label={`Open dictionary entry ${entry.label}`}
                      className="grid h-11 w-11 place-items-center rounded-md"
                      style={{ ...chip, color: ink }}
                    >
                      <Icon d="M4 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H4zM20 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z" />
                    </Link>
                  ) : null}
                  <Link
                    href={`/theory?hex=${hex.slice(1)}`}
                    aria-label={`Open ${role} in Theory`}
                    className="grid h-11 w-11 place-items-center rounded-md"
                    style={{ ...chip, color: ink }}
                    data-testid="to-theory"
                  >
                    <Icon>
                      <circle cx="12" cy="12" r="8" />
                      <path d="M12 4v16M4 12h16" />
                    </Icon>
                  </Link>
                  <span className="flex h-11 w-11 overflow-hidden rounded-md" style={chip}>
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      aria-label={`Move ${role} left`}
                      className="flex-1 disabled:opacity-30"
                      data-testid="move-left"
                    >
                      <Icon d="M15 6l-6 6 6 6" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === palette.length - 1}
                      aria-label={`Move ${role} right`}
                      className="flex-1 disabled:opacity-30"
                      data-testid="move-right"
                    >
                      <Icon d="M9 6l6 6-6 6" />
                    </button>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeColumn(i)}
                    disabled={palette.length <= MIN_COLUMNS}
                    aria-label={`Remove ${role}`}
                    className="grid h-11 w-11 place-items-center rounded-md disabled:opacity-30"
                    style={chip}
                    data-testid="remove"
                  >
                    <Icon d="M6 6l12 12M18 6L6 18" />
                  </button>
                </div>

                {adjust === i ? (
                  <div
                    className="mb-6 grid w-full max-w-[220px] gap-2 text-xs"
                    data-testid="adjust"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={hex}
                        aria-label={`Pick ${role}`}
                        title="Pick a colour"
                        className="swatch-input h-8 w-10 cursor-pointer"
                        style={{ boxShadow: `inset 0 0 0 2px ${ink}` }}
                        onChange={(e) => setColour(i, oklchOfHex(e.target.value), `pick-${i}`)}
                      />
                      <HexField
                        value={hex}
                        label={`${role} hex`}
                        onCommit={(h) => setColour(i, oklchOfHex(h), `hex-${i}`)}
                      />
                      <button
                        type="button"
                        onClick={() => setAdjust(null)}
                        aria-label={`Close ${role} adjust`}
                        className="ml-auto grid h-8 w-8 place-items-center rounded-md"
                        style={chip}
                      >
                        <Icon d="M6 6l12 12M18 6L6 18" />
                      </button>
                    </div>
                    {(['L', 'C', 'h'] as const).map((k, j) => (
                      <label key={k} className="grid gap-1">
                        <span className="flex justify-between">
                          <span>{k === 'L' ? 'lightness' : k === 'C' ? 'chroma' : 'hue'}</span>
                          <span className="font-mono">{c[j]!.toFixed(j === 2 ? 0 : 3)}</span>
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={j === 0 ? 1 : j === 1 ? 0.37 : 360}
                          step={j === 2 ? 1 : 0.001}
                          value={c[j]}
                          onChange={(e) =>
                            setColour(
                              i,
                              c.map((x, m) => (m === j ? Number(e.target.value) : x)) as Oklch,
                              `slider-${i}-${j}`,
                            )
                          }
                          aria-label={`${role} ${k === 'L' ? 'lightness' : k === 'C' ? 'chroma' : 'hue'}`}
                        />
                      </label>
                    ))}
                  </div>
                ) : null}

                {scale === i ? (
                  <div
                    className="mb-6 flex flex-col items-center gap-1.5"
                    data-testid="scale-steps"
                  >
                    <span className="flex items-center gap-2 text-xs">
                      lightness scale · same chroma and hue
                      <button
                        type="button"
                        onClick={() => setScale(null)}
                        aria-label={`Close ${role} scale`}
                        className="grid h-6 w-6 place-items-center rounded-md"
                        style={chip}
                      >
                        <Icon d="M6 6l12 12M18 6L6 18" />
                      </button>
                    </span>
                    <div
                      className="flex overflow-hidden rounded-md border"
                      style={{ borderColor: ink }}
                    >
                      {SCALE.map((L) => {
                        const step: Oklch = [L, c[1], c[2]];
                        return (
                          <button
                            key={L}
                            type="button"
                            onClick={() => setColour(i, step, `scale-${i}`)}
                            aria-label={`${role} lightness ${L.toFixed(2)}`}
                            className="h-8 w-7"
                            style={{
                              background: hexOf(step),
                              outline: Math.abs(L - c[0]) < 0.05 ? `2px solid ${ink}` : undefined,
                              outlineOffset: -3,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    setAdjust(adjust === i ? null : i);
                    setScale(null);
                  }}
                  aria-label={`Edit ${role}, ${hex}`}
                  className="rounded-sm font-mono text-[30px] font-medium tracking-wide"
                  data-testid="hex"
                >
                  {hex.slice(1).toUpperCase()}
                </button>
                <div className="mt-1.5 font-mono text-xs">{fmt(c)}</div>
                <Link
                  href={`/colour/${hex.slice(1)}`}
                  className="inline-flex min-h-11 items-center text-sm underline"
                  style={{ color: ink }}
                  data-testid="inspect-colour"
                >
                  Inspect colour
                </Link>
                {source ? (
                  <Link
                    href={`/dictionary/${source.conceptId}`}
                    className="mt-3.5 flex items-center gap-1.5 text-[13px]"
                    style={{ color: ink }}
                    data-testid="from-record"
                  >
                    <span
                      aria-hidden="true"
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: ink }}
                    />
                    from {source.label}
                    {edited ? ' · edited' : ''}
                  </Link>
                ) : near && near.distance < 0.25 ? (
                  <Link
                    href={`/dictionary/${near.conceptId}`}
                    className="mt-3.5 flex items-center gap-1.5 text-[13px]"
                    style={{ color: ink }}
                    data-testid="nearest"
                  >
                    <span
                      aria-hidden="true"
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: ink, opacity: near.distance < 0.02 ? 1 : 0.5 }}
                    />
                    {near.distance < 0.02 ? '' : 'near '}
                    {near.label}
                    {near.distance >= 0.02 ? ` · distance ${near.distance.toFixed(2)}` : ''}
                  </Link>
                ) : (
                  <span className="mt-3.5 text-[13px]">no documented colour near</span>
                )}
                <input
                  value={labels[i] ?? ''}
                  placeholder={role}
                  onChange={(e) =>
                    setLabels((l) => l.map((x, j) => (j === i ? e.target.value || null : x)))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                  }}
                  aria-label={`Name of the ${role} column`}
                  maxLength={24}
                  size={nameOf(i).length + 4}
                  title="Rename this column"
                  className="mt-2.5 rounded-sm border border-transparent bg-transparent px-1 text-center text-[11px] tracking-[1.2px] uppercase placeholder:text-current placeholder:opacity-100 hover:border-current/40 focus:border-current focus:outline-none"
                  style={{ color: ink }}
                  data-testid="role-name"
                />
              </section>
            );
          })}
        </div>

        {showWheel ? (
          <aside
            aria-label="Wheel"
            className="flex w-full shrink-0 flex-col gap-2.5 overflow-y-auto border-t border-[var(--line)] px-4 pt-3 pb-3 sm:w-80 sm:border-t-0 sm:border-l"
            data-testid="wheel-panel"
          >
            <div className="flex items-baseline gap-2">
              <span className="text-base font-semibold">Wheel</span>
              <span className="text-xs text-[var(--muted)]">
                OKLCh · slice at L {(slice ?? palette[0]![0]).toFixed(2)}
              </span>
              <button
                type="button"
                onClick={() => setShowWheel(false)}
                aria-label="Close wheel"
                className="ml-auto grid h-7 w-7 place-items-center rounded-md bg-[var(--accent-soft)]"
              >
                <Icon d="M6 6l12 12M18 6L6 18" />
              </button>
            </div>
            <Wheel
              size={256}
              dots={palette.map((c, i) => ({
                oklch: c,
                hex: hexOf(c),
                label: roles[i]!,
                locked: locked[i],
              }))}
              slice={slice ?? palette[0]![0]}
              onSlice={setSlice}
              structure={structure}
              angles={options}
              onMove={(i, c, key) => setColour(i, c, key)}
              onRotate={rotate}
              onFree={() => {
                setStructure('free-form');
                setNotice('One dot freed from the rule, so the rule is now free-form.');
              }}
              onLock={(i) => {
                remember();
                setLocked((l) => l.map((x, j) => (j === i ? !x : x)));
              }}
              onAdd={(c) => addColour(c, null, hexOf(c))}
              overlay={overlayPoints}
              onPick={(p) => addColour(p.oklch, p.id, p.label)}
              ghost={ghost}
              points={points}
            />
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <label className="flex items-center gap-1.5">
                Documented
                <select
                  value={showOverlay ? options.source : 'none'}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === 'none') setShowOverlay(false);
                    else {
                      setShowOverlay(true);
                      setOptions((o) => ({ ...o, source: v }));
                    }
                  }}
                  className="field h-7 text-xs"
                  data-testid="wheel-tradition"
                >
                  <option value="none">none</option>
                  <option value="all">all ({points.length})</option>
                  {traditions.map((t) => (
                    <option key={t} value={t}>
                      {groupLabel(t)} ({points.filter((p) => p.group === t).length})
                    </option>
                  ))}
                </select>
              </label>
              {sets.length ? (
                <label className="flex items-center gap-1.5">
                  Load set
                  <select
                    value=""
                    onChange={(e) => {
                      const set = sets.find((x) => x.id === e.target.value);
                      if (set) loadSet(set);
                    }}
                    className="field h-7 text-xs"
                    data-testid="load-set"
                  >
                    <option value="">choose…</option>
                    {sets.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <button
                type="button"
                onClick={() => setGhost((g) => !g)}
                aria-pressed={ghost}
                className={`btn h-7 text-xs ${ghost ? 'btn-primary' : ''}`}
                data-testid="wheel-ghost-button"
              >
                HSL ghost
              </button>
            </div>
            {showOverlay ? (
              <p className="m-0 text-[11px] text-[var(--muted)]" data-testid="wheel-overlay-note">
                {overlayPoints.length} of {setPoints.length} within L ±{OVERLAY_BAND} of this slice;
                move the lightness slider to see the others. Click a point to add it as a column,
                with its record.
              </p>
            ) : null}
          </aside>
        ) : null}
      </div>

      {candidates.length ? (
        <div className="flex min-h-[72px] shrink-0 flex-wrap items-center gap-3 border-t border-[var(--line)] px-5 py-2">
          <span className="text-[13px] text-[var(--muted)]">Candidates</span>
          <div className="flex flex-1 gap-2 overflow-x-auto" data-testid="candidates">
            {candidates.map((p, n) => (
              <button
                key={n}
                type="button"
                onClick={() => adopt(p)}
                aria-label={`Candidate ${n + 1}`}
                className="flex h-10 w-24 shrink-0 overflow-hidden rounded-md"
                style={{
                  outline: p.palette === palette ? '2px solid var(--fg)' : undefined,
                  outlineOffset: 2,
                }}
              >
                {p.palette.map((x, i) => (
                  <span
                    key={i}
                    className="flex-1"
                    style={{ background: hexOf(x), flexGrow: p.weights[i] }}
                  />
                ))}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setCandidates([])}
            className="text-xs text-[var(--muted)] underline underline-offset-2"
          >
            clear
          </button>
        </div>
      ) : null}

      {view2 === 'lightness' ? (
        <LightnessPanel palette={palette} names={palette.map((_, i) => nameOf(i))} />
      ) : view2 === 'neighbours' ? (
        <NeighbourPanel palette={palette} names={palette.map((_, i) => nameOf(i))} />
      ) : view2 === 'gradients' ? (
        <GradientPanel
          palette={palette}
          names={palette.map((_, i) => nameOf(i))}
          onNotice={setNotice}
        />
      ) : view2 === 'scales' ? (
        <ScalesPanel palette={palette} names={palette.map((_, i) => nameOf(i))} />
      ) : view2 === 'distinct' ? (
        <DistinctPanel palette={palette} names={palette.map((_, i) => nameOf(i))} />
      ) : view2 === 'relations' ? (
        <RelationsPanel
          sets={sets}
          points={points}
          palette={palette}
          names={palette.map((_, i) => nameOf(i))}
          onLoad={loadSet}
        />
      ) : null}
      {showContrast ? (
        <ContrastPanel
          palette={palette}
          names={palette.map((_, i) => nameOf(i))}
          pairs={pairs}
          onPairs={(next) => {
            remember();
            setPairs(next);
          }}
        />
      ) : null}

      <div className="flex min-h-[72px] shrink-0 flex-wrap items-center gap-3 border-t border-[var(--line)] px-5 py-2">
        <span className="text-[13px] text-[var(--muted)]">History</span>
        <div className="flex flex-1 gap-2 overflow-x-auto" data-testid="filmstrip">
          {history.map((p, n) => (
            <button
              key={n}
              type="button"
              onClick={() => adopt(p)}
              aria-label={`Generation ${history.length - n}`}
              className="flex h-10 w-24 shrink-0 overflow-hidden rounded-md"
              style={{
                outline: p.palette === palette ? '2px solid var(--fg)' : undefined,
                outlineOffset: 2,
              }}
            >
              {p.palette.map((c, i) => (
                <span
                  key={i}
                  className="flex-1"
                  style={{ background: hexOf(c), flexGrow: p.weights[i] }}
                />
              ))}
            </button>
          ))}
        </div>
        <span className="text-xs text-[var(--muted)]">
          bounds L {options.lightness.min} to {options.lightness.max} · C {options.chroma.min} to{' '}
          {options.chroma.max}
          {options.hue.from !== options.hue.to
            ? ` · h ${options.hue.from}° to ${options.hue.to}°`
            : ''}
        </span>
        <span className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={undo}
            disabled={!past.length}
            aria-label="Undo"
            title="Undo (⌘Z)"
            className="btn h-8 w-8 justify-center px-0 disabled:opacity-30"
            data-testid="undo"
          >
            <Icon d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!future.length}
            aria-label="Redo"
            title="Redo (⇧⌘Z)"
            className="btn h-8 w-8 justify-center px-0 disabled:opacity-30"
            data-testid="redo"
          >
            <Icon d="M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3" />
          </button>
          <label className="flex items-center gap-2">
            <span className="sr-only">View</span>
            <select
              value={view}
              onChange={(e) => setView(e.target.value as 'normal' | CvdType)}
              aria-label="View"
              className="field h-8 text-[13px]"
              data-testid="view"
            >
              {VIEWS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="sr-only">Documented colours</span>
            <select
              value={options.source}
              onChange={(e) => setOptions((o) => ({ ...o, source: e.target.value }))}
              aria-label="Documented colours"
              title="Which documented colours the nearest readout, source draws and the wheel use"
              className="field h-8 text-[13px]"
              data-testid="documented"
            >
              <option value="all">near: all ({points.length})</option>
              {traditions.map((t) => (
                <option key={t} value={t}>
                  near: {groupLabel(t)} ({points.filter((p) => p.group === t).length})
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setShowContrast((s) => !s)}
            className="btn h-8 text-[13px]"
            aria-expanded={showContrast}
            data-testid="contrast-button"
          >
            Contrast
          </button>
          <button
            type="button"
            onClick={() => setShowAreas((s) => !s)}
            className="btn h-8 text-[13px]"
            aria-expanded={showAreas}
            data-testid="proportions-button"
          >
            Proportions
          </button>
          <label className="flex items-center gap-2">
            <span className="sr-only">Panel</span>
            <select
              value={view2 ?? 'none'}
              onChange={(e) =>
                setView2(e.target.value === 'none' ? null : (e.target.value as typeof view2))
              }
              aria-label="Inspection panel"
              title="Lightness, neighbours, gradients or documented relations below the columns"
              className="field h-8 text-[13px]"
              data-testid="panel"
            >
              <option value="none">panel: none</option>
              <option value="lightness">Lightness</option>
              <option value="neighbours">Neighbours</option>
              <option value="gradients">Gradients</option>
              <option value="relations">Relations</option>
              <option value="scales">Scales</option>
              <option value="distinct">Distinctness</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => setShowWheel((s) => !s)}
            className={`btn h-8 text-[13px] ${showWheel ? 'btn-primary' : ''}`}
            aria-pressed={showWheel}
            data-testid="wheel-button"
          >
            Wheel
          </button>
          <Link
            href={`/space?hex=${palette.map((c) => hexOf(c).slice(1)).join(',')}${options.source !== 'all' ? `&set=${options.source}` : ''}`}
            className="btn h-8 text-[13px]"
            data-testid="map-link"
          >
            Map
          </Link>
          <Link
            href={`/preview?${stateParams({ palette, structure, seed, locked, labels, weights, sourceIds, pairs })}`}
            className="btn h-8 text-[13px]"
            title="See this palette applied to an interface"
            data-testid="preview-link"
          >
            Preview
          </Link>
        </span>
      </div>
    </div>
  );
}
