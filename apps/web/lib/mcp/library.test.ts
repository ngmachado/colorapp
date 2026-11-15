import { appData, openDb, schema } from '@sca/db';
import { beforeAll, describe, expect, test } from 'vitest';
import {
  deleteSaved,
  getPalette,
  listLibrary,
  restoreSaved,
  saveColour,
  savePalette,
  type Caller,
} from './library';
import { Refusal } from './tools';

let reader: Caller;
let writer: Caller;
let other: Caller;

beforeAll(async () => {
  const db = await openDb('pglite://memory');
  const [a] = await db.insert(schema.users).values({ email: 'a@example.com' }).returning();
  const [b] = await db.insert(schema.users).values({ email: 'b@example.com' }).returning();
  const data = appData(db, a!.id);
  reader = { data, writes: false, keyName: 'reader' };
  writer = { data, writes: true, keyName: 'writer' };
  other = { data: appData(db, b!.id), writes: true, keyName: 'other' };
});

describe('the Library through the server', () => {
  test('a key without the scope reads and is refused on every change, by name', async () => {
    expect((await listLibrary(reader)).key).toEqual({ name: 'reader', mayWrite: false });
    const args = { name: 'x', colours: ['#000', '#fff'] };
    await expect(savePalette(reader, args)).rejects.toThrow('"reader" reads the Library');
    await expect(saveColour(reader, 'zh-yanzhi')).rejects.toThrow(Refusal);
    await expect(deleteSaved(reader, 'palette', 1)).rejects.toThrow(Refusal);
    await expect(restoreSaved(reader, 'palette', 1)).rejects.toThrow(Refusal);
  });

  test('a saved palette keeps the same shape the Laboratory saves, marked by the key', async () => {
    const r = await savePalette(writer, {
      name: 'Reading app',
      colours: ['#1a1a1a', 'oklch(0.95 0.01 80)', '#960018'],
      names: ['text', 'paper', 'accent'],
      records: [null, null, 'zh-yanzhi'],
      rule: 'free-form',
      pairs: [{ text: 0, background: 1 }],
    });
    expect(r.saved).toEqual({ kind: 'palette', number: 1, name: 'Reading app' });
    expect(r.palette.savedBy).toBe('writer');
    expect(r.palette.colours[2]).toMatchObject({
      hex: '#960018',
      name: 'accent',
      record: 'zh-yanzhi',
    });
    expect(r.palette.links.laboratory).toContain('structure=free-form');
    expect(r.palette.links.laboratory).toContain('pairs=0-1');
    const got = await getPalette(writer, 1);
    expect(got.name).toBe('Reading app');
    await expect(getPalette(writer, 9)).rejects.toThrow('No saved palette number 9');
    await expect(
      savePalette(writer, { name: 'bad', colours: ['#000', '#fff'], rule: 'vibes' }),
    ).rejects.toThrow('Unknown rule');
    await expect(
      savePalette(writer, {
        name: 'bad',
        colours: ['#000', '#fff'],
        pairs: [{ text: 0, background: 0 }],
      }),
    ).rejects.toThrow('two different indexes');
  });

  test('a colour is saved once by its record; a non-concept is refused', async () => {
    expect((await saveColour(writer, 'zh-yanzhi')).saved).toMatchObject({
      number: 1,
      already: false,
    });
    expect((await saveColour(writer, 'zh-yanzhi')).saved).toMatchObject({
      number: 1,
      already: true,
    });
    await expect(saveColour(writer, 'no-such')).rejects.toThrow('not a concept');
    const lib = await listLibrary(reader);
    expect(lib.colours[0]).toMatchObject({ concept: 'zh-yanzhi', savedBy: 'writer' });
  });

  test('delete moves to the Deleted list, restore brings back, and another owner sees nothing', async () => {
    expect((await deleteSaved(writer, 'palette', 1)).deleted).toMatchObject({
      number: 1,
      name: 'Reading app',
    });
    let lib = await listLibrary(writer);
    expect(lib.palettes).toEqual([]);
    expect(lib.deleted.palettes.map((p) => p.number)).toEqual([1]);
    await expect(deleteSaved(writer, 'palette', 1)).rejects.toThrow('No live palette number 1');
    await expect(restoreSaved(other, 'palette', 1)).rejects.toThrow(Refusal);
    expect((await listLibrary(other)).palettes).toEqual([]);
    expect((await restoreSaved(writer, 'palette', 1)).restored.number).toBe(1);
    lib = await listLibrary(writer);
    expect(lib.palettes.map((p) => p.number)).toEqual([1]);
    expect(lib.deleted.palettes).toEqual([]);
  });
});
