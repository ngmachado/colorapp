// Renders each view with every region in a flat index colour and counts pixels and shared boundaries.
// Writes src/measurements.generated.json. Run after any change to assets/*.svg.
import { Resvg } from '@resvg/resvg-js';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SVG } from '../src/svg.generated';
import { GARMENT_ID, REGION_IDS, VIEWS, type RegionId } from '../src/types';

const WIDTH = 1600;
const BACKGROUND = 255; // red channel value reserved for background

function indexColour(i: number) {
  return `rgb(${i * 10 + 10},0,0)`;
}

function classify(r: number): number {
  if (r === BACKGROUND) return -1;
  return Math.max(0, Math.min(REGION_IDS.length - 1, Math.round((r - 10) / 10)));
}

const views = {} as Record<(typeof VIEWS)[number], unknown>;
for (const view of VIEWS) {
  let svg = SVG[view].replace(
    '<svg ',
    `<svg shape-rendering="crispEdges" style="background:rgb(${BACKGROUND},0,0)" `,
  );
  REGION_IDS.forEach((id, i) => (svg = svg.replaceAll(`{{${id}}}`, indexColour(i))));
  const img = new Resvg(svg, {
    fitTo: { mode: 'width', value: WIDTH },
    background: `rgb(${BACKGROUND},0,0)`,
  }).render();
  const { width, height } = img;
  const px = img.pixels;
  const cls = new Int8Array(width * height);
  const counts = new Array<number>(REGION_IDS.length).fill(0);
  let garment = 0;
  for (let i = 0; i < width * height; i++) {
    const c = classify(px[i * 4]!);
    cls[i] = c;
    if (c >= 0) {
      counts[c]!++;
      garment++;
    }
  }
  const pairs = new Map<string, number>();
  let total = 0;
  const touch = (a: number, b: number) => {
    if (a < 0 || b < 0 || a === b) return;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    pairs.set(key, (pairs.get(key) ?? 0) + 1);
    total++;
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (x + 1 < width) touch(cls[i]!, cls[i + 1]!);
      if (y + 1 < height) touch(cls[i]!, cls[i + width]!);
    }
  }
  const regionShare = Object.fromEntries(
    REGION_IDS.map((id, i) => [id, counts[i]! / garment]),
  ) as Record<RegionId, number>;
  const adjacency = [...pairs.entries()]
    .map(([k, n]) => {
      const [a, b] = k.split('|').map(Number) as [number, number];
      return { a: REGION_IDS[a]!, b: REGION_IDS[b]!, share: n / total };
    })
    .sort((p, q) => q.share - p.share);
  views[view] = { pixels: garment, regionShare, adjacency };
  console.log(
    view,
    'garment pixels',
    garment,
    'regions',
    REGION_IDS.filter((_, i) => counts[i]! > 0).length,
  );
}

const svgHash = createHash('sha256')
  .update(SVG.front + SVG.back)
  .digest('hex')
  .slice(0, 16);
writeFileSync(
  join(import.meta.dirname, '..', 'src', 'measurements.generated.json'),
  JSON.stringify({ garment: GARMENT_ID, svgHash, width: WIDTH, views }, null, 1) + '\n',
);
console.log('wrote measurements, svgHash', svgHash);
