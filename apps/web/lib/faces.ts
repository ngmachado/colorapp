import type { CatalogueFace } from '@/app/api/fonts/route';

/**
 * The faces finder's pure part: which catalogue entries match a set of facts, in what order they are shown, and
 * the stylesheet address that renders a page of them. Every filter is a fact Google's catalogue states (its
 * category, the file's axes and weights, its script subsets); nothing here ranks or recommends a face.
 */

export interface FaceFilters {
  /** Google's category, or null for all. */
  category: string | null;
  built: 'variable' | 'static' | null;
  /** Weights the face must ship, empty for no requirement. */
  weights: number[];
  /** Axis tags the face must have, all of them. */
  axes: string[];
  /** Subsets the face must cover, all of them. */
  subsets: string[];
}
export type FaceOrder = 'name' | 'name-desc' | 'shuffle';

export const NO_FILTERS: FaceFilters = {
  category: null,
  built: null,
  weights: [],
  axes: [],
  subsets: [],
};

export const isVariable = (f: CatalogueFace) => (f.axes?.length ?? 0) > 0;

/** The weights a static family ships, from its file keys (regular is 400). */
export function staticWeights(f: CatalogueFace): number[] {
  return [
    ...new Set(
      Object.keys(f.files)
        .map((k) => (k === 'regular' ? 400 : /^\d+$/.test(k) ? Number(k) : NaN))
        .filter((n) => Number.isFinite(n)),
    ),
  ].sort((a, b) => a - b);
}

/** Whether the face can set every weight asked: inside its weight axis, or shipped as a file. */
export function hasWeights(f: CatalogueFace, weights: number[]): boolean {
  if (!weights.length) return true;
  const wght = f.axes?.find((a) => a.tag === 'wght');
  if (wght) return weights.every((w) => w >= wght.start && w <= wght.end);
  const shipped = staticWeights(f);
  return weights.every((w) => shipped.includes(w));
}

export function matches(f: CatalogueFace, q: FaceFilters): boolean {
  if (q.category && f.category !== q.category) return false;
  if (q.built === 'variable' && !isVariable(f)) return false;
  if (q.built === 'static' && isVariable(f)) return false;
  if (!hasWeights(f, q.weights)) return false;
  if (q.axes.some((tag) => !f.axes?.some((a) => a.tag === tag))) return false;
  if (q.subsets.some((s) => !f.subsets.includes(s))) return false;
  return true;
}

/** A small deterministic generator, so a shuffle can be repeated from its seed. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function order(list: CatalogueFace[], how: FaceOrder, seed = 1): CatalogueFace[] {
  const out = [...list];
  if (how === 'shuffle') {
    const rnd = mulberry32(seed);
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [out[i], out[j]] = [out[j]!, out[i]!];
    }
    return out;
  }
  out.sort((a, b) => a.family.localeCompare(b.family));
  return how === 'name-desc' ? out.reverse() : out;
}

/**
 * One family's term for Google's css2 address: its weight axis as a range, or the static weights it ships among
 * those asked (Google answers 400 to a weight a family lacks), or the family alone.
 */
export function cssParam(f: CatalogueFace, weights: number[]): string {
  const name = encodeURIComponent(f.family).replace(/%20/g, '+');
  const wght = f.axes?.find((a) => a.tag === 'wght');
  if (wght) return `family=${name}:wght@${wght.start}..${wght.end}`;
  const shipped = staticWeights(f);
  const asked = weights.filter((w) => shipped.includes(w));
  const list = asked.length ? asked : shipped.includes(400) ? [400] : shipped.slice(0, 1);
  return list.length ? `family=${name}:wght@${list.join(';')}` : `family=${name}`;
}

export function cssHref(faces: CatalogueFace[], weights: number[]): string {
  return `https://fonts.googleapis.com/css2?${faces.map((f) => cssParam(f, weights)).join('&')}&display=swap`;
}

/** What the file is, as the catalogue states it. */
export function facts(f: CatalogueFace): string {
  if (isVariable(f))
    return `variable · ${f.axes!.map((a) => `${a.tag} ${a.start}–${a.end}`).join(' · ')}`;
  const n = staticWeights(f).length;
  return `static · ${n} weight${n === 1 ? '' : 's'}`;
}

/** Distinct values with their counts, most frequent first, then by name. */
export function tally(
  list: CatalogueFace[],
  pick: (f: CatalogueFace) => string[],
): [string, number][] {
  const m = new Map<string, number>();
  for (const f of list) for (const v of pick(f)) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
