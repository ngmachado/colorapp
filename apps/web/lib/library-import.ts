import { Structure } from '@sca/generator';
import { validWeights, type PaletteState } from './palette-param';
import type { SavedColour } from './local-library';

export const IMPORT_LIMIT = 2 * 1024 * 1024;
export const LIBRARY_LIMIT = 200;
export interface LibraryImport {
  palettes: { state: PaletteState; note: string }[];
  colours: Omit<SavedColour, 'savedAt'>[];
}
const object = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Expected a JSON object.');
  return v as Record<string, unknown>;
};
const text = (v: unknown, max: number): string => {
  if (typeof v !== 'string' || !v.trim() || v.length > max)
    throw new Error('Invalid or oversized text field.');
  return v;
};
const recordId = (v: unknown) => {
  const id = text(v, 80);
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('Invalid record identifier.');
  return id;
};
export function paletteKey(p: { state: PaletteState; note: string }) {
  const s = p.state;
  const n = s.palette.length;
  return JSON.stringify([
    s.palette,
    s.structure,
    s.seed,
    s.locked ?? Array(n).fill(false),
    s.labels ?? Array(n).fill(null),
    s.sourceIds ?? Array(n).fill(null),
    s.weights ?? Array(n).fill(1),
    p.note,
  ]);
}

/** Strictly validates the entire export; never trusts account IDs, HTML, dates or file-supplied IDs. */
export function parseLibraryImport(raw: string): LibraryImport {
  if (new TextEncoder().encode(raw).length > IMPORT_LIMIT)
    throw new Error('Choose a JSON file smaller than 2 MiB.');
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  const bundle = object(value);
  if (bundle.version !== undefined && bundle.version !== 1)
    throw new Error('Unsupported Library export version.');
  let palettes: unknown;
  let colours: unknown;
  if (bundle.tables !== undefined) {
    const versions = object(bundle.tables).projectVersions;
    if (!Array.isArray(versions) || versions.length > LIBRARY_LIMIT * 2)
      throw new Error('Invalid or oversized account export.');
    palettes = [];
    colours = [];
    for (const row of versions) {
      const version = object(row);
      const snap = object(version.snapshot);
      if (snap.kind === 'palette')
        (palettes as unknown[]).push({
          state: snap,
          note: version.note ?? `${snap.structure} · seed ${snap.seed}`,
        });
      else if (snap.kind === 'colour') (colours as unknown[]).push(snap);
      else throw new Error('The account export contains an unsupported saved item.');
    }
  } else {
    palettes = bundle.palettes;
    colours = bundle.colours;
  }
  if (!Array.isArray(palettes) || !Array.isArray(colours))
    throw new Error('Choose a Library or account export containing palettes and colours.');
  if (palettes.length > LIBRARY_LIMIT || colours.length > LIBRARY_LIMIT)
    throw new Error('Import at most 200 palettes and 200 colours at a time.');
  return {
    palettes: palettes.map((value) => {
      const p = object(value);
      const s = object(p.state);
      const coords = s.palette;
      if (
        !Array.isArray(coords) ||
        coords.length < 2 ||
        coords.length > 5 ||
        !coords.every(
          (c) =>
            Array.isArray(c) &&
            c.length === 3 &&
            c.every((n) => typeof n === 'number' && Number.isFinite(n)) &&
            c[0] >= 0 &&
            c[0] <= 1 &&
            c[1] >= 0 &&
            c[1] <= 0.6 &&
            c[2] >= 0 &&
            c[2] < 360,
        )
      )
        throw new Error('A palette has invalid OKLCh colours.');
      const n = coords.length;
      const structure = Structure.safeParse(s.structure);
      if (
        !structure.success ||
        typeof s.seed !== 'number' ||
        !Number.isSafeInteger(s.seed) ||
        s.seed < 0
      )
        throw new Error('A palette has an invalid rule or seed.');
      const list = <T>(v: unknown, valid: (x: unknown) => x is T, fallback: T): T[] => {
        if (v === undefined) return Array(n).fill(fallback);
        if (!Array.isArray(v) || v.length !== n || !v.every(valid))
          throw new Error('Palette column metadata does not match its colours.');
        return v as T[];
      };
      if (s.weights !== undefined && !validWeights(s.weights, n))
        throw new Error('Invalid palette area weights.');
      return {
        note: text(p.note, 80),
        state: {
          palette: coords as PaletteState['palette'],
          structure: structure.data,
          seed: s.seed,
          locked: list(s.locked, (v): v is boolean => typeof v === 'boolean', false),
          labels: list(
            s.labels,
            (v): v is string | null => v === null || (typeof v === 'string' && v.length <= 24),
            null,
          ),
          sourceIds: list(
            s.sourceIds,
            (v): v is string | null =>
              v === null || (typeof v === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(v)),
            null,
          ),
          weights: (s.weights as number[] | undefined) ?? Array(n).fill(1),
        },
      };
    }),
    colours: colours.map((value) => {
      const c = object(value);
      if (c.hex !== null && (typeof c.hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(c.hex)))
        throw new Error('A saved colour has an invalid hex value.');
      return {
        conceptId: recordId(c.conceptId),
        label: text(c.label, 200),
        hex: c.hex as string | null,
      };
    }),
  };
}
