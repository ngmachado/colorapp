import { colour, convert } from '@sca/colour-engine';
import { Structure } from '@sca/generator';
import type { Representation } from '@sca/knowledge';
import { Columns, type Oklch } from '@/components/lab/columns';
import { Toolbar } from '@/components/toolbar';
import { knowledge } from '@/lib/knowledge';
import { namePoints } from '@/lib/palette-names';
import { oklchOfHex } from '@/lib/contrast';
import { hexesIn } from '@/lib/lab-links';
import { parsePalette, parseStateExtras } from '@/lib/palette-param';
import { isRestricted, representationValue } from '@/lib/records';
import { documentedSets } from '@/lib/sets';

export const dynamic = 'force-dynamic';

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const MAX_COLUMNS = 5;
const START: Oklch[] = [
  [0.885, 0, 0],
  [0.762, 0.007, 174],
  [0.535, 0.001, 17],
  [0.64, 0.253, 349],
  [0.664, 0.262, 354],
];

export default async function Lab({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const k = knowledge();
  const saved = parsePalette(one(sp.palette));
  const palette = (saved ?? START).map((c) => [...c] as Oklch);
  const extras = parseStateExtras(palette.length, {
    locks: one(sp.locks),
    names: one(sp.names),
    records: one(sp.records),
  });
  const locked = saved ? extras.locked! : palette.map(() => false);
  const labels = saved ? extras.labels : undefined;
  let note: string | undefined;
  const parsed = Structure.safeParse(one(sp.structure));
  const structure = parsed.success && parsed.data !== 'mutation' ? parsed.data : 'triadic';
  const n = Number(one(sp.n));
  const seed = Number.isInteger(n) && n >= 0 ? n : 4027;
  if (saved)
    note = `Loaded a saved palette (${structure}, seed ${seed}). Press space to generate from it.`;

  const seedId = one(sp.seed);
  const hexes = hexesIn(one(sp.hex) ?? '');
  const from = (one(sp.from) ?? '').split(',').filter(Boolean).slice(0, MAX_COLUMNS);
  let sourceIds: (string | null)[] | undefined = saved ? extras.sourceIds : undefined;
  if (from.length) {
    // Columns from documented records: each concept's displayable value, locked, in the order given.
    const points = namePoints();
    const found = from.map((cid) => ({ cid, p: points.find((pt) => pt.conceptId === cid) }));
    const shown = found.filter((f) => f.p);
    const missing = found
      .filter((f) => !f.p)
      .map((f) => {
        const r = k.record(f.cid);
        return r && 'label' in r ? r.label : f.cid;
      });
    if (shown.length >= 2) {
      const loaded = shown.map((f) => {
        const c = convert(colour('oklab', f.p!.oklab), 'oklch').coords;
        return [
          Math.min(1, Math.max(0, c[0])),
          Math.max(0, c[1]),
          Number.isNaN(c[2]) ? 0 : c[2],
        ] as Oklch;
      });
      palette.splice(0, palette.length, ...loaded);
      locked.splice(0, locked.length, ...loaded.map(() => true));
      sourceIds = shown.map((f) => f.p!.id);
      note = `Loaded ${shown.map((f) => f.p!.label).join(', ')} from their records, all locked.${
        missing.length ? ` No displayable value for ${missing.join(', ')}.` : ''
      } Unlock a column and press space to draw around the rest.`;
    } else {
      note = `Nothing to load: ${missing.length ? `no displayable value for ${missing.join(', ')}` : 'fewer than two records'}.`;
    }
  } else if (seedId) {
    const rep = k.record(seedId);
    const concept = rep?.type === 'representation' ? k.record(rep.concept) : undefined;
    const v =
      rep?.type === 'representation' && !isRestricted(rep)
        ? representationValue(rep as Representation)
        : null;
    if (v) {
      const c = convert(v, 'oklch').coords;
      palette[0] = [c[0], c[1], Number.isNaN(c[2]) ? 0 : c[2]];
      locked[0] = true;
      sourceIds = palette.map((_, i) => (i === 0 ? seedId : null));
      note = `Dominant locked to ${concept && 'label' in concept ? concept.label : seedId}, a display approximation of that record. Press space to draw around it.`;
    }
  } else if (hexes.length >= 2) {
    // A pasted or typed list of hex codes becomes the palette, all locked.
    const list = hexes.slice(0, MAX_COLUMNS).map(oklchOfHex);
    palette.splice(0, palette.length, ...list);
    locked.splice(0, locked.length, ...list.map(() => true));
    note = `Loaded ${list.length} colours from the address, all locked. Unlock a column and press space to draw around the rest.`;
  } else if (hexes.length === 1) {
    palette[0] = oklchOfHex(hexes[0]!);
    locked[0] = true;
    note = `Dominant locked to ${hexes[0]!.toUpperCase()}. Press space to draw around it.`;
  }

  return (
    <>
      <Toolbar current="/lab" />
      <main id="main">
        <Columns
          points={namePoints()}
          initial={{ palette, locked, structure, seed, sourceIds, labels }}
          seedNote={note ?? 'Generate a palette. Lock the colours you like. Generate again.'}
          sets={documentedSets()}
        />
      </main>
    </>
  );
}
