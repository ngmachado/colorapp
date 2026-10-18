import type { Db } from './index';
import * as s from './schema';
import { findOrCreateUser } from './users';

/** Browser-test helper: finds or creates a user and opens a database session. Never enabled in production. */
export async function testLogin(
  db: Db,
  email: string,
): Promise<{ userId: string; sessionToken: string }> {
  const user = await findOrCreateUser(db, email);
  const sessionToken = crypto.randomUUID();
  await db
    .insert(s.sessions)
    .values({ sessionToken, userId: user.id, expires: new Date(Date.now() + 86400000) });
  return { userId: user.id, sessionToken };
}
