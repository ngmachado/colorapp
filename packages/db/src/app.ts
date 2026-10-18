import { and, eq, sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import type { Db } from './index';
import * as s from './schema';

/**
 * Data access scoped to one owner. Every read and write takes the owner id, so a row can never be
 * reached through another user's session. Routes call these; nothing else writes to the tables.
 */
export function appData(db: Db, ownerId: string) {
  const own = (t: { ownerId: AnyPgColumn }) => eq(t.ownerId, ownerId);
  const first = <T>(rows: T[]) => rows[0];

  const projects = {
    async create(input: { name: string; brief?: string }) {
      return first(
        await db
          .insert(s.projects)
          .values({ ownerId, name: input.name, brief: input.brief ?? null })
          .returning(),
      )!;
    },
    list() {
      return db.select().from(s.projects).where(own(s.projects)).orderBy(s.projects.createdAt);
    },
    async get(id: string) {
      return first(
        await db
          .select()
          .from(s.projects)
          .where(and(eq(s.projects.id, id), own(s.projects))),
      );
    },
    async update(id: string, patch: { name?: string; brief?: string | null }) {
      return first(
        await db
          .update(s.projects)
          .set({ ...patch, updatedAt: new Date() })
          .where(and(eq(s.projects.id, id), own(s.projects)))
          .returning(),
      );
    },
    /** Appends a numbered version with a snapshot of the saved thing. */
    async addVersion(projectId: string, snapshot: unknown, note?: string) {
      const project = await projects.get(projectId);
      if (!project) throw new Error('project not found');
      const last = first(
        await db
          .select({ n: sql<number>`coalesce(max(${s.projectVersions.number}), 0)` })
          .from(s.projectVersions)
          .where(eq(s.projectVersions.projectId, projectId)),
      );
      return first(
        await db
          .insert(s.projectVersions)
          .values({
            ownerId,
            projectId,
            number: Number(last?.n ?? 0) + 1,
            snapshot,
            note: note ?? null,
          })
          .returning(),
      )!;
    },
    versions(projectId: string) {
      return db
        .select()
        .from(s.projectVersions)
        .where(and(eq(s.projectVersions.projectId, projectId), own(s.projectVersions)))
        .orderBy(s.projectVersions.number);
    },
    /** Renames a version by replacing its note. Returns the row, or undefined when it is not the owner's. */
    async noteVersion(projectId: string, number: number, note: string) {
      return first(
        await db
          .update(s.projectVersions)
          .set({ note })
          .where(
            and(
              eq(s.projectVersions.projectId, projectId),
              eq(s.projectVersions.number, number),
              own(s.projectVersions),
            ),
          )
          .returning(),
      );
    },
    /** Deletes one version. Later numbers keep their numbers, so links stay stable. */
    async removeVersion(projectId: string, number: number) {
      return first(
        await db
          .delete(s.projectVersions)
          .where(
            and(
              eq(s.projectVersions.projectId, projectId),
              eq(s.projectVersions.number, number),
              own(s.projectVersions),
            ),
          )
          .returning(),
      );
    },
  };

  return {
    projects,

    /** Everything this user owns, table by table. The app wraps it in a bundle. */
    async exportAll() {
      const user = first(await db.select().from(s.users).where(eq(s.users.id, ownerId)));
      const out: Record<string, unknown[]> = {};
      for (const [name, table] of Object.entries(s.OWNED_TABLES))
        out[name] = await db.select().from(table).where(own(table));
      return {
        exportedAt: new Date().toISOString(),
        user: user ? { id: user.id, email: user.email, name: user.name } : null,
        tables: out,
      };
    },

    /** Row counts per owned table, for tests and the account page. */
    async counts() {
      const out: Record<string, number> = {};
      for (const [name, table] of Object.entries(s.OWNED_TABLES)) {
        const row = first(
          await db
            .select({ n: sql<number>`count(*)` })
            .from(table)
            .where(own(table)),
        );
        out[name] = Number(row?.n ?? 0);
      }
      return out;
    },

    /** Deletes the user; every owned row cascades. Returns how many users went, 0 or 1. */
    async deleteAccount() {
      return (await db.delete(s.users).where(eq(s.users.id, ownerId)).returning()).length;
    },
  };
}

export type AppData = ReturnType<typeof appData>;
