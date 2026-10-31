import { describe, expect, test } from 'vitest';
import { appData } from './app';
import { openDb } from './index';
import * as s from './schema';
import { testLogin } from './test-login';

async function fresh() {
  const db = await openDb('pglite://memory');
  const [alice] = await db
    .insert(s.users)
    .values({ email: 'alice@example.com', name: 'Alice' })
    .returning();
  const [bob] = await db
    .insert(s.users)
    .values({ email: 'bob@example.com', name: 'Bob' })
    .returning();
  return { db, alice: appData(db, alice!.id), bob: appData(db, bob!.id), aliceId: alice!.id };
}

describe('ownership', () => {
  test("a user cannot read, change or attach to another user's project", async () => {
    const { alice, bob } = await fresh();
    const p = await alice.projects.create({ name: 'Saved palettes' });
    expect((await alice.projects.get(p.id))?.name).toBe('Saved palettes');
    expect(await bob.projects.get(p.id)).toBeUndefined();
    expect(await bob.projects.list()).toEqual([]);
    expect(await bob.projects.update(p.id, { name: 'hijack' })).toBeUndefined();
    await expect(bob.projects.addVersion(p.id, {})).rejects.toThrow('project not found');
    expect((await alice.projects.get(p.id))?.name).toBe('Saved palettes');
  });
});

describe('versions', () => {
  test('versions number from 1, keep their numbers after a deletion, and hold a JSON snapshot', async () => {
    const { alice, bob } = await fresh();
    const p = await alice.projects.create({ name: 'Saved palettes' });
    const v1 = await alice.projects.addVersion(p.id, {
      kind: 'palette',
      palette: [[0.5, 0.1, 20]],
    });
    const v2 = await alice.projects.addVersion(p.id, { kind: 'palette', palette: [] }, 'second');
    expect([v1.number, v2.number]).toEqual([1, 2]);
    expect((v1.snapshot as { palette: number[][] }).palette[0]).toEqual([0.5, 0.1, 20]);
    expect(await alice.projects.removeVersion(p.id, 1)).toBeDefined();
    const v3 = await alice.projects.addVersion(p.id, {});
    expect(v3.number).toBe(3);
    expect((await alice.projects.versions(p.id)).map((v) => v.number)).toEqual([2, 3]);
    expect(await bob.projects.noteVersion(p.id, 2, 'mine')).toBeUndefined();
    expect((await alice.projects.noteVersion(p.id, 2, 'renamed'))?.note).toBe('renamed');
  });
});

describe('personal data', () => {
  test('export contains every owned row and delete leaves none', async () => {
    const { db, alice, bob, aliceId } = await fresh();
    const p = await alice.projects.create({ name: 'Saved colours' });
    await alice.projects.addVersion(p.id, { kind: 'colour', conceptId: 'ja-ao' });
    const q = await bob.projects.create({ name: 'Saved colours' });
    await bob.projects.addVersion(q.id, { kind: 'colour', conceptId: 'ja-beni' });
    const bundle = await alice.exportAll();
    expect(bundle.user?.email).toBe('alice@example.com');
    expect(bundle.tables.projects).toHaveLength(1);
    expect(bundle.tables.projectVersions).toHaveLength(1);
    expect(await alice.counts()).toEqual({ projects: 1, projectVersions: 1, apiKeys: 0 });
    expect(await alice.deleteAccount()).toBe(1);
    expect(await db.select().from(s.users)).toHaveLength(1);
    expect(appData(db, aliceId).counts()).resolves.toEqual({
      projects: 0,
      projectVersions: 0,
      apiKeys: 0,
    });
    expect(await bob.counts()).toEqual({ projects: 1, projectVersions: 1, apiKeys: 0 });
  });

  test('the browser-test login creates a user once and a session each time', async () => {
    const { db } = await fresh();
    const a = await testLogin(db, 'carol@example.com');
    const b = await testLogin(db, 'carol@example.com');
    expect(a.userId).toBe(b.userId);
    expect(a.sessionToken).not.toBe(b.sessionToken);
    expect(await db.select().from(s.sessions)).toHaveLength(2);
  });
});
