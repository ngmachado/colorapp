/**
 * The Library through the MCP server. Reading needs any key; saving and deleting need a key made
 * with "may save to the Library". A delete moves the item to the Library page's Deleted list, where
 * the person or the agent can restore it; removing for good stays the person's click on the page.
 */
import { colour, toHex } from '@sca/colour-engine';
import type { AppData } from '@sca/db';
import { Structure } from '@sca/generator';
import {
  COLOURS,
  libraryProject,
  PALETTES,
  saveColour as saveColourRow,
  savePalette as savePaletteRow,
  type ColourSnapshot,
  type PaletteSnapshot,
} from '@/lib/library';
import { stateParams, type Pair } from '@/lib/palette-param';
import { siteUrl } from '@/lib/site';
import { parseColour, Refusal } from './tools';

/** Who is asking: the key's owner, what the key may do, and the key's name for the record. */
export interface Caller {
  data: AppData;
  writes: boolean;
  keyName: string;
}

const origin = () => siteUrl.origin.replace(/\/$/, '');
const round = (n: number, digits = 5) => Number(n.toFixed(digits));
const mustWrite = (c: Caller) => {
  if (!c.writes)
    throw new Refusal(
      `The key "${c.keyName}" reads the Library and cannot change it. On the account page, make a key with "May save to the Library" ticked and use that one.`,
    );
};

const paletteRow = (v: { number: number; note: string | null; snapshot: unknown }) => {
  const s = v.snapshot as PaletteSnapshot;
  return {
    number: v.number,
    name: v.note ?? `${s.structure} · seed ${s.seed}`,
    rule: s.structure,
    seed: s.seed,
    colours: s.palette.map((c, i) => ({
      hex: toHex(colour('oklch', c)),
      oklch: { L: round(c[0]), C: round(c[1]), h: round(c[2], 3) },
      ...(s.labels?.[i] ? { name: s.labels[i] } : {}),
      ...(s.sourceIds?.[i] ? { record: s.sourceIds[i] } : {}),
      ...(s.locked?.[i] ? { locked: true } : {}),
    })),
    ...(s.pairs?.length ? { pairs: s.pairs.map(([t, b]) => ({ text: t, background: b })) } : {}),
    ...(s.savedBy ? { savedBy: s.savedBy } : {}),
    links: { laboratory: `${origin()}/lab?${stateParams(s)}` },
  };
};
const colourRow = (v: { number: number; snapshot: unknown }) => {
  const s = v.snapshot as ColourSnapshot;
  return {
    number: v.number,
    concept: s.conceptId,
    label: s.label,
    hex: s.hex,
    ...(s.savedBy ? { savedBy: s.savedBy } : {}),
    links: { entry: `${origin()}/dictionary/${encodeURIComponent(s.conceptId)}` },
  };
};

export async function listLibrary(c: Caller) {
  const projects = await c.data.projects.list();
  const palettes = projects.find((p) => p.name === PALETTES);
  const colours = projects.find((p) => p.name === COLOURS);
  const live = async (id: string | undefined) => (id ? c.data.projects.versions(id) : []);
  const deleted = async (id: string | undefined) => (id ? c.data.projects.versions(id, true) : []);
  return {
    palettes: (await live(palettes?.id)).map(paletteRow).reverse(),
    colours: (await live(colours?.id)).map(colourRow).reverse(),
    deleted: {
      palettes: (await deleted(palettes?.id)).map(paletteRow).reverse(),
      colours: (await deleted(colours?.id)).map(colourRow).reverse(),
      note: 'Items here can be restored with restore_saved. Removing one for good is done on the Library page.',
    },
    key: { name: c.keyName, mayWrite: c.writes },
    links: { library: `${origin()}/library` },
  };
}

export async function getPalette(c: Caller, number: number) {
  const project = (await c.data.projects.list()).find((p) => p.name === PALETTES);
  const v =
    project && (await c.data.projects.versions(project.id)).find((x) => x.number === number);
  if (!v) throw new Refusal(`No saved palette number ${number}. list_library shows the numbers.`);
  return paletteRow(v);
}

export interface SavePaletteInput {
  name: string;
  colours: string[];
  names?: string[];
  records?: (string | null)[];
  rule?: string;
  seed?: number;
  pairs?: { text: number; background: number }[];
}

export async function savePalette(c: Caller, input: SavePaletteInput) {
  mustWrite(c);
  const name = input.name.trim().slice(0, 80);
  if (!name) throw new Refusal('A saved palette needs a name.');
  if (input.colours.length < 2 || input.colours.length > 5)
    throw new Refusal('A palette here is 2 to 5 colours.');
  const n = input.colours.length;
  const cols = input.colours.map(parseColour);
  if (input.names && input.names.length !== n)
    throw new Refusal(`names must have one entry per colour (${n}).`);
  if (input.records && input.records.length !== n)
    throw new Refusal(`records must have one entry per colour (${n}), null where there is none.`);
  const rule = input.rule ?? 'free-form';
  if (!Structure.safeParse(rule).success)
    throw new Refusal(`Unknown rule "${rule}". Rules: ${Structure.options.join(', ')}.`);
  const seed = input.seed ?? 0;
  if (!Number.isInteger(seed) || seed < 0) throw new Refusal('seed is a whole number, 0 or more.');
  const pairs: Pair[] = [];
  for (const p of input.pairs ?? []) {
    if (
      ![p.text, p.background].every((i) => Number.isInteger(i) && i >= 0 && i < n) ||
      p.text === p.background
    )
      throw new Refusal(
        `pair ${p.text} on ${p.background}: two different indexes from 0 to ${n - 1}.`,
      );
    pairs.push([p.text, p.background]);
  }
  const snapshot: PaletteSnapshot = {
    kind: 'palette',
    space: 'oklch',
    palette: cols.map((x) => x.oklch),
    structure: rule,
    seed,
    ...(input.names ? { labels: input.names.map((x) => x.trim().slice(0, 24) || null) } : {}),
    ...(input.records ? { sourceIds: input.records } : {}),
    ...(pairs.length ? { pairs } : {}),
    savedBy: c.keyName,
  };
  const saved = await savePaletteRow(c.data, snapshot, name);
  return {
    saved: { kind: 'palette', number: saved.number, name },
    palette: paletteRow({ number: saved.number, note: name, snapshot }),
    note: `Saved to the Library as version ${saved.number}, marked as saved by the key "${c.keyName}".`,
    links: { library: `${origin()}/library` },
  };
}

export async function saveColour(c: Caller, record: string) {
  mustWrite(c);
  const saved = await saveColourRow(c.data, record, c.keyName);
  if (!saved) throw new Refusal(`"${record}" is not a concept. Use find_records to find its id.`);
  return {
    saved: { kind: 'colour', number: saved.number, concept: record, already: saved.already },
    note: saved.already
      ? `${record} was already in the Library as number ${saved.number}; nothing was added.`
      : `Saved ${record} to the Library as number ${saved.number}.`,
    links: { library: `${origin()}/library` },
  };
}

type Kind = 'palette' | 'colour';
const projectOf = async (c: Caller, kind: Kind) =>
  libraryProject(c.data, kind === 'palette' ? PALETTES : COLOURS);

export async function deleteSaved(c: Caller, kind: Kind, number: number) {
  mustWrite(c);
  const project = await projectOf(c, kind);
  const row = await c.data.projects.removeVersion(project.id, number);
  if (!row) throw new Refusal(`No live ${kind} number ${number}. list_library shows the numbers.`);
  return {
    deleted: { kind, number, name: row.note },
    note: `Moved to the Deleted list on the Library page. restore_saved brings it back; only the person can remove it for good.`,
    links: { library: `${origin()}/library` },
  };
}

export async function restoreSaved(c: Caller, kind: Kind, number: number) {
  mustWrite(c);
  const project = await projectOf(c, kind);
  const row = await c.data.projects.restoreVersion(project.id, number);
  if (!row)
    throw new Refusal(`No deleted ${kind} number ${number}. list_library shows the Deleted list.`);
  return {
    restored: { kind, number, name: row.note },
    links: { library: `${origin()}/library` },
  };
}
