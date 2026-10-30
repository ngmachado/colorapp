/**
 * Colour extraction from decoded image pixels, entirely in the browser. The result is a set of image
 * observations: cluster means in OKLab with the share of sampled pixels each holds. Observations are
 * values with proportions. They are not names, and the page offers documented records separately.
 *
 * Method, stated on the page: pixels are sampled on a grid (at most SAMPLE_LIMIT), converted from
 * sRGB to OKLab, and grouped by k-means with a deterministic farthest-point start, so the same image
 * gives the same observations every time.
 */
export type Oklab = [number, number, number];
export const SAMPLE_LIMIT = 20000;
export const DEFAULT_K = 5;
const ITERATIONS = 24;

export interface Observation {
  oklab: Oklab;
  hex: string;
  /** Share of sampled pixels in this cluster, 0..1. */
  share: number;
  count: number;
}

const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const encode = (c: number) => {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(v * 255)));
};

/** sRGB bytes to OKLab (Björn Ottosson's matrices). */
export function oklabOfRgb(r: number, g: number, b: number): Oklab {
  const [R, G, B] = [linear(r / 255), linear(g / 255), linear(b / 255)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
export function hexOfOklab([L, a, b]: Oklab): string {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const R = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const G = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const B = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return `#${[R, G, B].map((c) => encode(c).toString(16).padStart(2, '0')).join('')}`;
}

const d2 = (a: Oklab, b: Oklab) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

/** Samples the pixel grid evenly to at most `limit` opaque pixels and returns their OKLab values. */
export function samplePixels(data: Uint8ClampedArray, limit = SAMPLE_LIMIT): Oklab[] {
  const n = data.length / 4;
  const step = Math.max(1, Math.ceil(n / limit));
  const out: Oklab[] = [];
  for (let i = 0; i < n; i += step) {
    const o = i * 4;
    if (data[o + 3]! < 128) continue;
    out.push(oklabOfRgb(data[o]!, data[o + 1]!, data[o + 2]!));
  }
  return out;
}

/** k-means in OKLab with a deterministic start: the mean, then repeatedly the point farthest from its nearest centre. */
export function extractColours(samples: Oklab[], k = DEFAULT_K): Observation[] {
  if (!samples.length) return [];
  k = Math.min(k, samples.length);
  const mean = samples
    .reduce((m, p) => [m[0] + p[0], m[1] + p[1], m[2] + p[2]] as Oklab, [0, 0, 0] as Oklab)
    .map((v) => v / samples.length) as Oklab;
  const centres: Oklab[] = [nearestTo(samples, mean)];
  while (centres.length < k) {
    let best = -1;
    let far: Oklab = samples[0]!;
    for (const p of samples) {
      const d = Math.min(...centres.map((c) => d2(p, c)));
      if (d > best) {
        best = d;
        far = p;
      }
    }
    if (best <= 0) break;
    centres.push([...far] as Oklab);
  }
  let assign = new Int32Array(samples.length);
  for (let it = 0; it < ITERATIONS; it++) {
    const next = new Int32Array(samples.length);
    samples.forEach((p, i) => {
      let bi = 0;
      let bd = Infinity;
      centres.forEach((c, j) => {
        const d = d2(p, c);
        if (d < bd) {
          bd = d;
          bi = j;
        }
      });
      next[i] = bi;
    });
    const sums: [number, number, number, number][] = centres.map(() => [0, 0, 0, 0]);
    samples.forEach((p, i) => {
      const s = sums[next[i]!]!;
      s[0] += p[0];
      s[1] += p[1];
      s[2] += p[2];
      s[3] += 1;
    });
    let moved = false;
    sums.forEach((s, j) => {
      if (!s[3]) return;
      const c: Oklab = [s[0] / s[3], s[1] / s[3], s[2] / s[3]];
      if (d2(c, centres[j]!) > 1e-12) moved = true;
      centres[j] = c;
    });
    assign = next;
    if (!moved) break;
  }
  const counts = centres.map(() => 0);
  for (const a of assign) counts[a]!++;
  return centres
    .map((c, j) => ({
      oklab: c,
      hex: hexOfOklab(c),
      count: counts[j]!,
      share: counts[j]! / samples.length,
    }))
    .filter((o) => o.count > 0)
    .sort((a, b) => b.count - a.count);
}

function nearestTo(samples: Oklab[], target: Oklab): Oklab {
  let best = samples[0]!;
  let bd = Infinity;
  for (const p of samples) {
    const d = d2(p, target);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return [...best] as Oklab;
}
