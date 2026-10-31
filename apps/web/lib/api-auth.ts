import { appData, verifyApiKey, type AppData, type KeyCheck } from '@sca/db';
import { db } from '@/lib/db';

export type KeyUser = {
  id: string;
  keyId: string;
  keyName: string;
  data: AppData;
  check: KeyCheck & { status: 'ok' };
};

/**
 * The owner behind a bearer API key, or the response that refuses the request. Every route an
 * agent or script may call goes through this; the counting happens inside the check, so a call
 * over its quota is refused before any work. Keys never stand in for a browser session.
 */
export async function requireKey(req: Request): Promise<KeyUser | Response> {
  const header = req.headers.get('authorization') ?? '';
  const m = /^Bearer\s+(\S+)$/i.exec(header);
  if (!m)
    return Response.json(
      { error: 'An API key is required: Authorization: Bearer sc_live_…' },
      { status: 401, headers: { 'www-authenticate': 'Bearer' } },
    );
  const d = await db();
  const check = await verifyApiKey(d, m[1]!);
  if (check.status === 'unknown' || check.status === 'revoked')
    return Response.json(
      { error: check.status === 'revoked' ? 'This key was revoked.' : 'Unknown key.' },
      { status: 401, headers: { 'www-authenticate': 'Bearer' } },
    );
  if (check.status === 'limited')
    return Response.json(
      {
        error:
          check.window === 'minute'
            ? 'Too many calls this minute for this key.'
            : 'This key has used its calls for the month.',
        retryAfterSeconds: check.retryAfterSeconds,
      },
      { status: 429, headers: { 'retry-after': String(check.retryAfterSeconds) } },
    );
  return {
    id: check.ownerId,
    keyId: check.keyId,
    keyName: check.name,
    data: appData(d, check.ownerId),
    check,
  };
}
