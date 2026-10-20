import { describe, expect, it } from 'vitest';
import { IMPORT_LIMIT, parseLibraryImport } from './library-import';
import {
  addPalette,
  exportBundle,
  importBundle,
  readPalettes,
  readColours,
  type Store,
} from './local-library';
const state = {
  palette: [
    [0.5, 0.1, 20],
    [0.7, 0.1, 200],
  ],
  structure: 'complementary',
  seed: 3,
  weights: [7, 3],
  locked: [true, false],
  labels: ['Warm', null],
  sourceIds: [null, null],
};
const bundle = {
  palettes: [{ state, note: 'Study' }],
  colours: [{ conceptId: 'ja-ao', label: '青', hex: '#0067c0' }],
};
const fake = (): Store => {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => {
      m.set(k, v);
    },
  };
};

describe('Library imports', () => {
  it('round-trips an export with proportions and skips duplicate records', () => {
    const a = fake();
    const b = fake();
    expect(importBundle(a, JSON.stringify(bundle))).toEqual({
      palettes: 1,
      colours: 1,
      skipped: 0,
    });
    const exported = JSON.stringify(exportBundle(a));
    expect(importBundle(b, exported)).toEqual({ palettes: 1, colours: 1, skipped: 0 });
    expect(readPalettes(b)[0]!.state).toEqual(state);
    expect(readColours(b)[0]!.label).toBe('青');
    expect(importBundle(b, exported)).toEqual({ palettes: 0, colours: 0, skipped: 2 });
  });
  it('reads only saved items from account exports', () => {
    const result = parseLibraryImport(
      JSON.stringify({
        user: { id: 'someone-else' },
        tables: {
          projectVersions: [
            { snapshot: { kind: 'palette', ...state }, note: 'Study' },
            { snapshot: { kind: 'colour', ...bundle.colours[0] } },
          ],
        },
      }),
    );
    expect(result).toEqual(bundle);
  });
  it('rejects invalid data without writing any of the valid items', () => {
    const store = fake();
    for (const palette of [
      [
        [1.2, 0.1, 20],
        [0.5, 0.1, 20],
      ],
      [[0.5, 0.1, 20]],
    ]) {
      expect(() =>
        importBundle(
          store,
          JSON.stringify({
            ...bundle,
            palettes: [...bundle.palettes, { state: { ...state, palette }, note: 'Bad' }],
          }),
        ),
      ).toThrow();
      expect(readPalettes(store)).toEqual([]);
    }
    expect(() => parseLibraryImport('{')).toThrow('valid JSON');
    expect(() => parseLibraryImport(' '.repeat(IMPORT_LIMIT + 1))).toThrow('2 MiB');
    expect(() => parseLibraryImport(JSON.stringify({ ...bundle, version: 99 }))).toThrow('version');
    expect(() =>
      parseLibraryImport(
        JSON.stringify({
          ...bundle,
          colours: [{ conceptId: '../account', label: 'x', hex: 'red' }],
        }),
      ),
    ).toThrow();
    expect(() =>
      parseLibraryImport(
        JSON.stringify({
          ...bundle,
          palettes: [{ state: { ...state, weights: [0, 3] }, note: 'Bad' }],
        }),
      ),
    ).toThrow('weights');
  });
  it('does not evict existing palettes when the limit is reached', () => {
    const store = fake();
    for (let i = 0; i < 200; i++)
      addPalette(
        store,
        { ...state, palette: state.palette as [number, number, number][], seed: i },
        `Existing ${i}`,
      );
    expect(() => importBundle(store, JSON.stringify(bundle))).toThrow('200');
    expect(readPalettes(store)).toHaveLength(200);
    expect(readColours(store)).toEqual([]);
  });
  it('rolls back the first write when the second storage write fails', () => {
    const store = fake();
    let writes = 0;
    const failing = {
      ...store,
      setItem(k: string, v: string) {
        if (++writes === 2) throw new Error('quota');
        store.setItem(k, v);
      },
    };
    expect(() => importBundle(failing, JSON.stringify(bundle))).toThrow('storage');
    expect(readPalettes(store)).toEqual([]);
    expect(readColours(store)).toEqual([]);
  });
});
