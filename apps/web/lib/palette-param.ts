export type Oklch = [number, number, number];

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
}

/** The state as a query string. Locks, names and records are written only when any is set. */
export function stateParams(s: PaletteState): string {
  // Built by hand so commas and semicolons stay readable in the address bar.
  const parts = [`palette=${paletteParam(s.palette)}`, `structure=${s.structure}`, `n=${s.seed}`];
  if (s.locked?.some(Boolean)) parts.push(`locks=${s.locked.map((l) => (l ? '1' : '0')).join('')}`);
  if (s.weights?.some((w) => w !== 1)) parts.push(`weights=${s.weights.join(',')}`);
  // Names may contain commas, so they travel as a JSON array.
  if (s.labels?.some(Boolean)) parts.push(`names=${encodeURIComponent(JSON.stringify(s.labels))}`);
  if (s.sourceIds?.some(Boolean))
    parts.push(`records=${s.sourceIds.map((r) => encodeURIComponent(r ?? '-')).join(',')}`);
  return parts.join('&');
}

/** Locks, names and records from the address, each sized to the palette; absent or malformed values fall back to none. */
export function parseStateExtras(
  n: number,
  sp: { locks?: string; names?: string; records?: string; weights?: string },
): Pick<PaletteState, 'locked' | 'labels' | 'sourceIds' | 'weights'> {
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
  };
}

/** Relative area weights; absent values in older palettes mean equal areas. */
export function validWeights(value: unknown, n: number): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === n &&
    value.every((w) => typeof w === 'number' && Number.isInteger(w) && w >= 1 && w <= 100)
  );
}
