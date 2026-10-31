import { KEY_LIMITS } from '@sca/db';
import { requireKey } from '@/lib/api-auth';

/** Tells a script which key it holds and how much of the quota this call has used. A way to test a key. */
export async function GET(req: Request) {
  const who = await requireKey(req);
  if (who instanceof Response) return who;
  return Response.json({
    key: who.keyName,
    quota: {
      month: { used: who.check.month, limit: KEY_LIMITS.perMonth },
      minute: { used: who.check.minute, limit: KEY_LIMITS.perMinute },
    },
  });
}
