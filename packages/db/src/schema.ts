import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/** Versions the app was last run against. One row per key. */
export const meta = pgTable('meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

// Auth.js tables (shape required by @auth/drizzle-adapter).
export const users = pgTable('user', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date', withTimezone: true }),
  image: text('image'),
});

export const accounts = pgTable(
  'account',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable('session', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date', withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  'verificationToken',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date', withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// Every app row carries an owner and timestamps; deleting a user cascades through everything they own.
const owned = {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
    .notNull()
    .$defaultFn(() => new Date()),
};

/** A named container of versions: "Saved palettes" and "Saved colours" today. */
export const projects = pgTable(
  'project',
  {
    ...owned,
    name: text('name').notNull(),
    brief: text('brief'),
  },
  (t) => [index('project_owner').on(t.ownerId)],
);

export const projectVersions = pgTable(
  'project_version',
  {
    ...owned,
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    /** Snapshot of the saved thing at this version: a palette with its state, or a colour's record id. */
    snapshot: jsonb('snapshot').notNull(),
    note: text('note'),
  },
  (t) => [uniqueIndex('project_version_number').on(t.projectId, t.number)],
);

/**
 * An API key: a bearer secret shown once at creation, kept here only as a SHA-256 hash with a short
 * prefix for display. Usage counters are fixed windows (calendar month, clock minute) kept on the row
 * and advanced by one conditional update per call, so a key over its quota is refused without a count.
 */
export const apiKeys = pgTable(
  'api_key',
  {
    ...owned,
    name: text('name').notNull(),
    prefix: text('prefix').notNull(),
    hash: text('hash').notNull(),
    lastUsedAt: timestamp('last_used_at', { mode: 'date', withTimezone: true }),
    revokedAt: timestamp('revoked_at', { mode: 'date', withTimezone: true }),
    /** The month (YYYY-MM, UTC) and minute (ISO to the minute, UTC) the counters belong to. */
    monthWindow: text('month_window'),
    monthCount: integer('month_count').notNull().default(0),
    minuteWindow: text('minute_window'),
    minuteCount: integer('minute_count').notNull().default(0),
  },
  (t) => [uniqueIndex('api_key_hash').on(t.hash), index('api_key_owner').on(t.ownerId)],
);

/** Tables that hold user-owned rows, in dependency order, for export and counts. */
export const OWNED_TABLES = { projects, projectVersions, apiKeys } as const;
