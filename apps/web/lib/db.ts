import { connect, type Db } from '@sca/db';
import { attachDatabasePool } from '@vercel/functions';

const g = globalThis as typeof globalThis & { __scaDb?: { db: Db; ready: Promise<void> } };

/**
 * One database per server process. DATABASE_URL names it: `postgres://…` for Neon or any server
 * (the pooled URL; DATABASE_URL_UNPOOLED, when set, carries migrations over a direct connection),
 * `pglite://<dir>` for the embedded database in development, `pglite://memory` for tests.
 * Migrations run once, the first time anything asks. Nothing here runs at build time.
 */
function handle() {
  if (!g.__scaDb) {
    const { db, migrate, pool } = connect(
      process.env.DATABASE_URL ?? 'pglite://data/pg',
      process.env.DATABASE_URL_UNPOOLED,
    );
    // On Vercel, Fluid compute keeps the pool alive across requests and drains it before suspending.
    if (pool && process.env.VERCEL) attachDatabasePool(pool);
    g.__scaDb = { db, ready: migrate() };
  }
  return g.__scaDb;
}

/** The database, migrated. Every route and page awaits this before touching a table. */
export async function db(): Promise<Db> {
  const h = handle();
  await h.ready;
  return h.db;
}

/** The connection before migrations are known to have run, for the Auth.js adapter, which is built per request. */
export function dbUnchecked(): Db {
  return handle().db;
}
