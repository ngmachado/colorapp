export type Oklch = [number, number, number];
/** An intended text/background combination: column indices, foreground first. */
export type Pair = [number, number];

/** `palette=l,c,h;l,c,h` as written by the Library and read by the Laboratory. Two to five triples, else null. */
export function parsePalette(s: string | undefined): Oklch[] | null {
  if (!s) return null;
  const triples = s.split(';').map((t) => t.split(',').map(Number));
  if (triples.length < 2 || triples.length > 5) return null;
  if (!triples.every((t) => t.length === 3 && t.every((n) => Number.isFinite(n)))) return null;
  return triples as Oklch[];
}

export function paletteParam(p: Oklch[]): string {
  return p.map((c) => c.map((n) => n.toFixed(4)).join(',')).join(';');
}

/** Everything a saved or shared palette keeps: colours, rule, seed, locks, column names and the records columns came from. */
export interface PaletteState {
  palette: Oklch[];
  structure: string;
  seed: number;
  locked?: boolean[];
  weights?: number[];
  labels?: (string | null)[];
  sourceIds?: (string | null)[];
  /** Intended text-on-background pairs, by column index. */
  pairs?: Pair[];
}

/** The state as a query string. Locks, names, records and pairs are written only when any is set. */
export function stateParams(s: PaletteState): string {
  // Built by hand so commas and semicolons stay readable in the address bar.
  const parts = [`palette=${paletteParam(s.palette)}`, `structure=${s.structure}`, `n=${s.seed}`];
  if (s.locked?.some(Boolean)) parts.push(`locks=${s.locked.map((l) => (l ? '1' : '0')).join('')}`);
  if (s.weights?.some((w) => w !== 1)) parts.push(`weights=${s.weights.join(',')}`);
  // Names may contain commas, so they travel as a JSON array.
  if (s.labels?.some(Boolean)) parts.push(`names=${encodeURIComponent(JSON.stringify(s.labels))}`);
  if (s.sourceIds?.some(Boolean))
    parts.push(`records=${s.sourceIds.map((r) => encodeURIComponent(r ?? '-')).join(',')}`);
  if (s.pairs?.length) parts.push(`pairs=${s.pairs.map((p) => p.join('-')).join(',')}`);
  return parts.join('&');
}

/** Locks, names, records and pairs from the address, each sized to the palette; absent or malformed values fall back to none. */
export function parseStateExtras(
  n: number,
  sp: { locks?: string; names?: string; records?: string; weights?: string; pairs?: string },
): Pick<PaletteState, 'locked' | 'labels' | 'sourceIds' | 'weights'> & { pairs: Pair[] } {
  const locks = sp.locks && /^[01]+$/.test(sp.locks) ? sp.locks : '';
  let names: unknown[] = [];
  try {
    const parsed: unknown = sp.names ? JSON.parse(sp.names) : [];
    if (Array.isArray(parsed)) names = parsed;
  } catch {
    names = [];
  }
  const records = sp.records ? sp.records.split(',') : [];
  const weights = sp.weights?.split(',').map(Number);
  return {
    weights: validWeights(weights, n) ? weights : Array(n).fill(1),
    locked: Array.from({ length: n }, (_, i) => locks[i] === '1'),
    labels: Array.from({ length: n }, (_, i) => {
      const v = names[i];
      return typeof v === 'string' && v ? v.slice(0, 24) : null;
    }),
    sourceIds: Array.from({ length: n }, (_, i) =>
      records[i] && records[i] !== '-' ? records[i]! : null,
    ),
    pairs: parsePairs(sp.pairs, n),
  };
}

/** `pairs=0-1,2-1`: foreground-background column indices. Pairs that name a missing column or the same column twice are dropped. */
export function parsePairs(value: string | undefined, n: number): Pair[] {
  if (!value) return [];
  const out: Pair[] = [];
  for (const part of value.split(',')) {
    const m = /^(\d+)-(\d+)$/.exec(part);
    if (!m) continue;
    const p: Pair = [Number(m[1]), Number(m[2])];
    if (p[0] >= n || p[1] >= n || p[0] === p[1]) continue;
    if (out.some((q) => q[0] === p[0] && q[1] === p[1])) continue;
    out.push(p);
  }
  return out;
}

/** Relative area weights; absent values in older palettes mean equal areas. */
export function validWeights(value: unknown, n: number): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === n &&
    value.every((w) => typeof w === 'number' && Number.isInteger(w) && w >= 1 && w <= 100)
  );
}
