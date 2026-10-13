import { eq } from 'drizzle-orm';
import { expect, test } from 'vitest';
import { openDb, schema, SCHEMA_VERSION } from './index';

test('opens an in-memory database and records the schema version', () => {
  const db = openDb(':memory:');
  const row = db.select().from(schema.meta).where(eq(schema.meta.key, 'schema_version')).get();
  expect(row?.value).toBe(SCHEMA_VERSION);
});
