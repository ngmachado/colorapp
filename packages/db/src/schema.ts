import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** Versions the app was last run against. One row per key. */
export const meta = sqliteTable('meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
