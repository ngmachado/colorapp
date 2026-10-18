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
const MAX = 200;

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
    exportedAt: new Date().toISOString(),
    kept: 'in this browser',
    palettes: readPalettes(store),
    colours: readColours(store),
  };
}
