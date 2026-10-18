import { expect, test } from 'vitest';
import { getMeta, openDb, SCHEMA_VERSION } from './index';

test('opens an embedded database and records the schema version', async () => {
  const db = await openDb('pglite://memory');
  expect(await getMeta(db, 'schema_version')).toBe(SCHEMA_VERSION);
});

test('refuses a URL it does not understand', async () => {
  await expect(openDb('mysql://x')).rejects.toThrow('DATABASE_URL');
});
