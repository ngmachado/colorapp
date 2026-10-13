import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import * as schema from './schema';

export { schema };

export const SCHEMA_VERSION = '1';

/**
 * Migrations live in packages/db/drizzle. The file is found from the working directory so the
 * same code works from the repo root (tests), apps/web (next dev) and the standalone build (/app).
 */
function findMigrationsFolder(): string {
  if (process.env.DB_MIGRATIONS_DIR) return process.env.DB_MIGRATIONS_DIR;
  let dir = process.cwd();
  for (let i = 0; i < 4; i++) {
    const candidate = join(dir, 'packages', 'db', 'drizzle');
    if (existsSync(join(candidate, 'meta', '_journal.json'))) return candidate;
    dir = resolve(dir, '..');
  }
  throw new Error('Cannot find packages/db/drizzle; set DB_MIGRATIONS_DIR');
}

/** Opens (or creates) the app database in WAL mode and applies pending migrations. */
export function openDb(path: string) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('busy_timeout = 5000');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: findMigrationsFolder() });
  db.insert(schema.meta)
    .values({ key: 'schema_version', value: SCHEMA_VERSION })
    .onConflictDoUpdate({ target: schema.meta.key, set: { value: SCHEMA_VERSION } })
    .run();
  return db;
}

export type Db = ReturnType<typeof openDb>;

/** Reads one value from the meta table. */
export function getMeta(db: Db, key: string): string | undefined {
  return db.select().from(schema.meta).where(eq(schema.meta.key, key)).get()?.value;
}
