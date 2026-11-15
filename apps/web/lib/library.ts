/**
 * The database Library: two projects per account, "Saved palettes" and "Saved colours", each a list
 * of numbered versions. The page, the save routes and the MCP server all write through here, so a
 * palette saved by an agent has the same shape as one saved from the Laboratory.
 */
import { toHex } from '@sca/colour-engine';
import type { AppData } from '@sca/db';
import type { Representation } from '@sca/knowledge';
import { knowledge } from '@/lib/knowledge';
import type { Oklch, Pair } from '@/lib/palette-param';
import { isRestricted, representationValue } from '@/lib/records';

export const PALETTES = 'Saved palettes';
export const COLOURS = 'Saved colours';

export interface PaletteSnapshot {
  kind: 'palette';
  space?: 'oklch';
  palette: Oklch[];
  structure: string;
  seed: number;
  locked?: boolean[];
  weights?: number[];
  labels?: (string | null)[];
  sourceIds?: (string | null)[];
  /** Intended text-on-background pairs, by column index. */
  pairs?: Pair[];
  /** The API key that saved it, when an agent did. */
  savedBy?: string;
}
export interface ColourSnapshot {
  kind: 'colour';
  conceptId: string;
  representationId?: string | null;
  label: string;
  hex: string | null;
  savedBy?: string;
}

/** The project by name, made on first use. */
export async function libraryProject(data: AppData, name: typeof PALETTES | typeof COLOURS) {
  return (
    (await data.projects.list()).find((p) => p.name === name) ??
    (await data.projects.create({ name }))
  );
}

/** Appends a palette as a new version. The note is its name on the Library page. */
export async function savePalette(data: AppData, snapshot: PaletteSnapshot, note: string) {
  const project = await libraryProject(data, PALETTES);
  const version = await data.projects.addVersion(project.id, snapshot, note);
  return { projectId: project.id, number: version.number };
}

/**
 * Saves a documented colour by its record id; the entry stays the source of truth. A colour already
 * in the Library is not saved twice.
 */
export async function saveColour(data: AppData, conceptId: string, savedBy?: string) {
  const k = knowledge();
  const concept = k.record(conceptId);
  if (!concept || concept.type !== 'concept') return null;
  const rep = k
    .forConcept(concept.id)
    .find(
      (r): r is Representation => r.type === 'representation' && !isRestricted(r) && !!r.coords,
    );
  const value = rep ? representationValue(rep) : null;
  const project = await libraryProject(data, COLOURS);
  const already = (await data.projects.versions(project.id)).find(
    (v) => (v.snapshot as ColourSnapshot).conceptId === concept.id,
  );
  if (already) return { projectId: project.id, number: already.number, already: true };
  const snapshot: ColourSnapshot = {
    kind: 'colour',
    conceptId: concept.id,
    representationId: rep?.id ?? null,
    label: concept.label,
    hex: value ? toHex(value) : null,
    ...(savedBy ? { savedBy } : {}),
  };
  const version = await data.projects.addVersion(project.id, snapshot, concept.label);
  return { projectId: project.id, number: version.number, already: false };
}
