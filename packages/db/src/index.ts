import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle as drizzleNode } from 'drizzle-orm/node-postgres';
import { migrate as migrateNode } from 'drizzle-orm/node-postgres/migrator';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Pool } from 'pg';
import * as schema from './schema';

export { schema };

export const SCHEMA_VERSION = '2';

/** One Postgres database, whichever engine serves it. */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

/**
 * Migrations live in packages/db/drizzle. The folder is found from the working directory so the
 * same code works from the repo root (tests), apps/web (next dev) and a traced server bundle.
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

export interface Connection {
  db: Db;
  /** Applies pending migrations. Over a direct connection when one is given, as Neon advises. */
  migrate: () => Promise<void>;
  /** The node-postgres pool, when there is one, so a host can tie it to its lifecycle. */
  pool?: Pool;
}

/**
 * The database behind a URL, before migrations:
 * `postgres://…` is a server (Neon in production, a container when self-hosting); the app uses the
 * pooled URL and migrations the direct one (`migrateUrl`), per Neon's guidance;
 * `pglite://memory` is an embedded database that lives as long as the process (tests, browser tests);
 * `pglite://<dir>` is an embedded database kept in a folder (development, no server to install).
 */
export function connect(url: string, migrateUrl?: string): Connection {
  if (/^postgres(ql)?:/.test(url)) {
    const pool = new Pool({ connectionString: url, max: 5 });
    const db = drizzleNode(pool, { schema });
    const migrate = async () => {
      const folder = findMigrationsFolder();
      if (!migrateUrl || migrateUrl === url) return migrateNode(db, { migrationsFolder: folder });
      const direct = new Pool({ connectionString: migrateUrl, max: 1 });
      try {
        await migrateNode(drizzleNode(direct, { schema }), { migrationsFolder: folder });
      } finally {
        await direct.end();
      }
    };
    return { db, migrate, pool };
  }
  const m = /^pglite:\/\/(.*)$/.exec(url);
  if (!m) throw new Error(`DATABASE_URL must start with postgres:// or pglite://, got ${url}`);
  const target = m[1]!;
  if (target !== 'memory') mkdirSync(target, { recursive: true });
  const db = drizzlePglite(new PGlite(target === 'memory' ? undefined : target), { schema });
  return { db, migrate: () => migratePglite(db, { migrationsFolder: findMigrationsFolder() }) };
}

/** Opens the database at a URL and applies pending migrations. */
export async function openDb(url: string, migrateUrl?: string): Promise<Db> {
  const { db, migrate } = connect(url, migrateUrl);
  await migrate();
  await db
    .insert(schema.meta)
    .values({ key: 'schema_version', value: SCHEMA_VERSION })
    .onConflictDoUpdate({ target: schema.meta.key, set: { value: SCHEMA_VERSION } });
  return db;
}

/** Reads one value from the meta table. */
export async function getMeta(db: Db, key: string): Promise<string | undefined> {
  const rows = await db.select().from(schema.meta).where(eq(schema.meta.key, key));
  return rows[0]?.value;
}

export { appData, type AppData } from './app';
export { findOrCreateUser } from './users';
