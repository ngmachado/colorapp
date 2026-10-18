import { eq } from 'drizzle-orm';
import type { Db } from './index';
import * as s from './schema';

/** Finds a user by email or creates one, verified. The app's own queries stay in this package. */
export async function findOrCreateUser(db: Db, email: string, name?: string) {
  const existing = (await db.select().from(s.users).where(eq(s.users.email, email)))[0];
  if (existing) return existing;
  return (
    await db
      .insert(s.users)
      .values({ email, name: name ?? null, emailVerified: new Date() })
      .returning()
  )[0]!;
}
