/**
 * Checks every JIS Z 8102 record's page value against the standard's own definition: the Munsell
 * notation, interpolated in the 1943 renotation table (RIT's real.dat, a personal download; see
 * content/reference/munsell/README.md). Writes a JSON file of differences that
 * scripts/import-jis-z8102.mjs folds into the records' notes on its second pass. Only differences
 * are recorded, never the derived colours.
 *
 *   node_modules/.bin/tsx scripts/check-jis-munsell.ts [content/knowledge/japanese/jis-z8102.yaml] [out.json]
 *
 * Run from apps/web. CIEDE2000 is computed in CIELAB (D65) between the page's sRGB value and the
 * notation's colour after Bradford adaptation from illuminant C.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { colour, deltaE } from '@sca/colour-engine';
import { adapt, munsellAvailable, munsellInterpolate, munsellPath } from '../lib/munsell';

const WHITE_C: [number, number, number] = [0.98074, 1, 1.18232];
const WHITE_D65: [number, number, number] = [0.95047, 1, 1.08883];

const [
  yamlPath = '../../content/knowledge/japanese/jis-z8102.yaml',
  outPath = '../../content/reference/munsell/jis-z8102-check.json',
] = process.argv.slice(2);
if (!munsellAvailable()) {
  console.error(
    `renotation table not found at ${munsellPath()}; run node scripts/fetch-munsell.mjs first`,
  );
  process.exit(2);
}

const srgb = (hex: string) =>
  colour(
    'srgb',
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number],
  );
const d2000 = (a: ReturnType<typeof colour>, b: ReturnType<typeof colour>) =>
  Math.round(deltaE(a, b, 'ciede2000').value * 100) / 100;

const text = readFileSync(yamlPath, 'utf8');
const blocks = text.split(/\n(?=- type: )/);
const concepts: Record<
  string,
  {
    notation: string;
    munsell: { deltaE2000: number; beyond: boolean; mapped: boolean } | null;
    pages: { deltaE2000: number } | null;
    ichiranMunsell: { deltaE2000: number } | null;
  }
> = {};
const reps = new Map<string, { jis?: string; ichiran?: string; notation?: string }>();
for (const b of blocks) {
  if (!b.startsWith('- type: representation')) continue;
  const id = /^\s+concept: (\S+)$/m.exec(b)?.[1];
  const hex = /hex #([0-9A-F]{6})/.exec(b)?.[1];
  if (!id || !hex) continue;
  const e = reps.get(id) ?? {};
  if (/\bsource: wikipedia-ja-jis-kanyo-shikimei\b/.test(b)) {
    e.jis = hex;
    e.notation = /Munsell ([^,']+), hex/.exec(b)?.[1];
  } else if (/\bsource: wikipedia-ja-nihon-no-iro-ichiran\b/.test(b)) e.ichiran = hex;
  reps.set(id, e);
}
let beyond = 0;
let mapped = 0;
const diffs: number[] = [];
for (const [id, e] of reps) {
  if (!e.jis || !e.notation) continue;
  const m = munsellInterpolate(e.notation);
  const page = srgb(`#${e.jis}`);
  const entry: (typeof concepts)[string] = {
    notation: e.notation,
    munsell: null,
    pages: null,
    ichiranMunsell: null,
  };
  if (m) {
    // Compare in CIELAB from the unclipped XYZ, so an out-of-gamut notation is not measured against its clipped hex.
    const refValue = colour('xyz-d65', adapt(m.xyzC, WHITE_C, WHITE_D65));
    const d = d2000(page, refValue);
    entry.munsell = { deltaE2000: d, beyond: m.beyond, mapped: m.mapped };
    diffs.push(d);
    if (m.beyond) beyond++;
    if (m.mapped) mapped++;
    if (e.ichiran) entry.ichiranMunsell = { deltaE2000: d2000(srgb(`#${e.ichiran}`), refValue) };
  }
  if (e.ichiran) entry.pages = { deltaE2000: d2000(page, srgb(`#${e.ichiran}`)) };
  concepts[id] = entry;
}
diffs.sort((a, b) => a - b);
const median = diffs[Math.floor(diffs.length / 2)] ?? null;
const out = {
  date: new Date().toISOString().slice(0, 10),
  table: 'Munsell renotation (1943), RIT real.dat transcription, 2734 chromatic samples',
  method:
    "The standard's notation interpolated linearly in the table (chroma on each neighbouring hue page, then hue, then value; Y from the ASTM D1535 value polynomial), Bradford-adapted from illuminant C to D65, compared with the page's sRGB value by CIEDE2000 in CIELAB. Differences only; derived colours are not recorded.",
  summary: { records: diffs.length, median, max: diffs.at(-1) ?? null, beyond, mapped },
  concepts,
};
writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
console.error(JSON.stringify(out.summary));
