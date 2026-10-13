import { openDb, type Db } from '@sca/db';

const g = globalThis as typeof globalThis & { __scaDb?: Db };

/** One connection per server process; migrations run once at first use. */
export function db(): Db {
  g.__scaDb ??= openDb(process.env.DATABASE_PATH ?? 'data/app.sqlite');
  return g.__scaDb;
}
