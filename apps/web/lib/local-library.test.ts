import { describe, expect, it } from 'vitest';
import {
  addColour,
  addPalette,
  exportBundle,
  readColours,
  readPalettes,
  removeColour,
  removePalette,
  renamePalette,
  type Store,
} from './local-library';

const fake = (): Store => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};
const state = {
  palette: [[0.5, 0.1, 20]] as [number, number, number][],
  structure: 'triadic',
  seed: 3,
};

describe('browser library', () => {
  it('keeps palettes newest first, renames and removes by id', () => {
    const s = fake();
    const a = addPalette(s, state);
    const b = addPalette(s, { ...state, seed: 4 }, 'second');
    expect(readPalettes(s).map((p) => p.id)).toEqual([b.id, a.id]);
    expect(a.note).toBe('triadic · seed 3');
    renamePalette(s, a.id, 'warm');
    expect(readPalettes(s).find((p) => p.id === a.id)?.note).toBe('warm');
    removePalette(s, b.id);
    expect(readPalettes(s)).toHaveLength(1);
  });
  it('keeps each colour once and survives garbage in storage', () => {
    const s = fake();
    expect(addColour(s, { conceptId: 'ja-ao', label: '青', hex: '#0067c0' })).toEqual({
      already: false,
    });
    expect(addColour(s, { conceptId: 'ja-ao', label: '青', hex: '#0067c0' })).toEqual({
      already: true,
    });
    removeColour(s, 'ja-ao');
    expect(readColours(s)).toEqual([]);
    s.setItem('sca.library.colours', '{not json');
    expect(readColours(s)).toEqual([]);
    expect(exportBundle(s).kept).toBe('in this browser');
  });
});
