import { LIBRARY_LIMIT, paletteKey, parseLibraryImport } from './library-import';
import type { PaletteState } from './palette-param';

/**
 * The Library kept in the browser when the server has no accounts. Plain JSON under two keys in
 * local storage; every function takes the storage so tests can pass a fake. Shapes mirror the
 * server's saved versions so the same pages render both.
 */
export interface SavedPalette {
  id: string;
  savedAt: string;
  note: string;
  state: PaletteState;
}
export interface SavedColour {
  conceptId: string;
  label: string;
  hex: string | null;
  savedAt: string;
}
export interface Store {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const PALETTES_KEY = 'sca.library.palettes';
export const COLOURS_KEY = 'sca.library.colours';
const MAX = LIBRARY_LIMIT;

function read<T>(store: Store, key: string): T[] {
  try {
    const parsed: unknown = JSON.parse(store.getItem(key) ?? '[]');
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}
const write = (store: Store, key: string, value: unknown) =>
  store.setItem(key, JSON.stringify(value));

export const readPalettes = (store: Store) => read<SavedPalette>(store, PALETTES_KEY);
export const readColours = (store: Store) => read<SavedColour>(store, COLOURS_KEY);

/** Prepends a palette; the newest is first, as in the server Library. Returns the saved entry. */
export function addPalette(store: Store, state: PaletteState, note?: string): SavedPalette {
  const entry: SavedPalette = {
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    note: note ?? `${state.structure} · seed ${state.seed}`,
    state,
  };
  write(store, PALETTES_KEY, [entry, ...readPalettes(store)].slice(0, MAX));
  return entry;
}
export function renamePalette(store: Store, id: string, note: string) {
  write(
    store,
    PALETTES_KEY,
    readPalettes(store).map((p) => (p.id === id ? { ...p, note: note.slice(0, 80) } : p)),
  );
}
export function removePalette(store: Store, id: string) {
  write(
    store,
    PALETTES_KEY,
    readPalettes(store).filter((p) => p.id !== id),
  );
}

/** Adds a colour once per record. Returns whether it was already there. */
export function addColour(store: Store, c: Omit<SavedColour, 'savedAt'>): { already: boolean } {
  const list = readColours(store);
  if (list.some((x) => x.conceptId === c.conceptId)) return { already: true };
  write(store, COLOURS_KEY, [{ ...c, savedAt: new Date().toISOString() }, ...list].slice(0, MAX));
  return { already: false };
}
export function removeColour(store: Store, conceptId: string) {
  write(
    store,
    COLOURS_KEY,
    readColours(store).filter((c) => c.conceptId !== conceptId),
  );
}

/** Everything in the browser Library, for a download. */
export function exportBundle(store: Store) {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    kept: 'in this browser',
    palettes: readPalettes(store),
    colours: readColours(store),
  };
}

/** Merge without eviction. Restore both original keys if storage rejects either write. */
export function importBundle(store: Store, raw: string) {
  const incoming = parseLibraryImport(raw);
  const palettes = readPalettes(store);
  const colours = readColours(store);
  const keys = new Set(palettes.map(paletteKey));
  const ids = new Set(colours.map((c) => c.conceptId));
  const savedAt = new Date().toISOString();
  const addedPalettes = incoming.palettes
    .filter((p) => {
      const key = paletteKey(p);
      if (keys.has(key)) return false;
      keys.add(key);
      return true;
    })
    .map((p) => ({ ...p, id: crypto.randomUUID(), savedAt }));
  const addedColours = incoming.colours
    .filter((c) => {
      if (ids.has(c.conceptId)) return false;
      ids.add(c.conceptId);
      return true;
    })
    .map((c) => ({ ...c, savedAt }));
  if (
    palettes.length + addedPalettes.length > LIBRARY_LIMIT ||
    colours.length + addedColours.length > LIBRARY_LIMIT
  )
    throw new Error(
      'The Library holds 200 palettes and 200 colours. Remove some items before importing.',
    );
  const oldPalettes = store.getItem(PALETTES_KEY) ?? '[]';
  const oldColours = store.getItem(COLOURS_KEY) ?? '[]';
  try {
    write(store, PALETTES_KEY, [...addedPalettes, ...palettes]);
    write(store, COLOURS_KEY, [...addedColours, ...colours]);
  } catch {
    store.setItem(PALETTES_KEY, oldPalettes);
    store.setItem(COLOURS_KEY, oldColours);
    throw new Error('Import could not be saved. Check the browser storage allowance.');
  }
  return {
    palettes: addedPalettes.length,
    colours: addedColours.length,
    skipped:
      incoming.palettes.length +
      incoming.colours.length -
      addedPalettes.length -
      addedColours.length,
  };
}
