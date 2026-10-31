import { describe, expect, test } from 'vitest';
import { hashSecret, KEY_LIMITS, newSecret, verifyApiKey } from './api-keys';
import { appData } from './app';
import { openDb } from './index';
import * as s from './schema';

async function fresh() {
  const db = await openDb('pglite://memory');
  const [alice] = await db.insert(s.users).values({ email: 'alice@example.com' }).returning();
  const [bob] = await db.insert(s.users).values({ email: 'bob@example.com' }).returning();
  return { db, alice: appData(db, alice!.id), bob: appData(db, bob!.id), aliceId: alice!.id };
}

describe('secrets', () => {
  test('a secret has the prefix, 32 letters or digits, and is never the same twice', () => {
    const a = newSecret();
    const b = newSecret();
    expect(a).toMatch(/^sc_live_[A-Za-z0-9]{32}$/);
    expect(a).not.toBe(b);
    expect(hashSecret(a)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('keys', () => {
  test('creating shows the secret once and keeps only a hash, prefix and name', async () => {
    const { db, alice } = await fresh();
    const { key, secret } = await alice.keys.create('Claude Desktop');
    expect(secret).toMatch(/^sc_live_/);
    expect(key).not.toHaveProperty('hash');
    expect(key.prefix).toBe(`${secret.slice(0, 12)}…${secret.slice(-3)}`);
    const row = (await db.select().from(s.apiKeys))[0]!;
    expect(row.hash).toBe(hashSecret(secret));
    expect(row.hash).not.toContain(secret.slice(8));
    const listed = await alice.keys.list();
    expect(listed.map((k) => k.name)).toEqual(['Claude Desktop']);
    expect(listed[0]).not.toHaveProperty('hash');
    expect((await alice.exportAll()).tables.apiKeys?.[0]).not.toHaveProperty('hash');
  });

  test('a key is checked by its secret, counted, and refused once revoked', async () => {
    const { db, alice, aliceId } = await fresh();
    const { key, secret } = await alice.keys.create('script');
    expect(await verifyApiKey(db, 'sc_live_nothing')).toEqual({ status: 'unknown' });
    expect(await verifyApiKey(db, 'not even the prefix')).toEqual({ status: 'unknown' });
    const first = await verifyApiKey(db, secret);
    expect(first).toMatchObject({
      status: 'ok',
      ownerId: aliceId,
      keyId: key.id,
      month: 1,
      minute: 1,
    });
    expect(await verifyApiKey(db, secret)).toMatchObject({ status: 'ok', month: 2, minute: 2 });
    expect((await alice.keys.list())[0]!.lastUsedAt).toBeInstanceOf(Date);
    expect(await alice.keys.revoke(key.id)).toEqual({ id: key.id });
    expect(await alice.keys.revoke(key.id)).toBeUndefined();
    expect(await verifyApiKey(db, secret)).toEqual({ status: 'revoked' });
  });

  test("a user cannot revoke another user's key, and keys are capped per user", async () => {
    const { alice, bob } = await fresh();
    const { key } = await alice.keys.create('one');
    expect(await bob.keys.revoke(key.id)).toBeUndefined();
    expect(await bob.keys.list()).toEqual([]);
    await alice.keys.create('two');
    await alice.keys.create('three');
    await expect(alice.keys.create('four')).rejects.toThrow('Revoke one first');
    await alice.keys.revoke(key.id);
    await expect(alice.keys.create('four')).resolves.toBeDefined();
    expect((await alice.keys.list()).length).toBe(4);
  });

  test('the minute and month windows refuse the call over the limit and reopen when the window turns', async () => {
    const { db, alice } = await fresh();
    const { secret } = await alice.keys.create('busy');
    const t0 = new Date('2026-10-31T12:00:10Z');
    for (let i = 0; i < KEY_LIMITS.perMinute; i++)
      expect((await verifyApiKey(db, secret, t0)).status).toBe('ok');
    expect(await verifyApiKey(db, secret, t0)).toEqual({
      status: 'limited',
      window: 'minute',
      retryAfterSeconds: 50,
    });
    const t1 = new Date('2026-10-31T12:01:00Z');
    expect(await verifyApiKey(db, secret, t1)).toMatchObject({
      status: 'ok',
      minute: 1,
      month: 61,
    });
    // Fill the month directly; a loop of 5,000 updates would just be slow.
    await db.update(s.apiKeys).set({ monthCount: KEY_LIMITS.perMonth, minuteCount: 0 });
    const t2 = new Date('2026-10-31T12:02:00Z');
    expect(await verifyApiKey(db, secret, t2)).toEqual({
      status: 'limited',
      window: 'month',
      retryAfterSeconds: 12 * 3600 - 120,
    });
    const t3 = new Date('2026-11-01T00:00:00Z');
    expect(await verifyApiKey(db, secret, t3)).toMatchObject({ status: 'ok', month: 1 });
  });
});
