import { appData, findOrCreateUser, type AppData } from '@sca/db';
import { auth } from '@/auth';
import { db } from '@/lib/db';

const LOCAL_EMAIL = 'local@localhost';

/**
 * With AUTH_DISABLED=1 every request acts as one fixed local user, so the app can be checked without mail.
 * Refused in production builds: the flag only works under `next dev`.
 */
async function localUser(): Promise<{ id: string; email: string | null } | null> {
  if (process.env.AUTH_DISABLED !== '1' || process.env.NODE_ENV === 'production') return null;
  const user = await findOrCreateUser(await db(), LOCAL_EMAIL, 'Local user');
  return { id: user.id, email: user.email };
}

/** The signed-in user's data access, or null. Every route goes through this so rows stay owner-scoped. */
export async function currentUser(): Promise<{
  id: string;
  email: string | null;
  data: AppData;
} | null> {
  const d = await db();
  const local = await localUser();
  if (local) return { ...local, data: appData(d, local.id) };
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return { id, email: session.user?.email ?? null, data: appData(d, id) };
}
