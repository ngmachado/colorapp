import { createHash, randomBytes } from 'node:crypto';
import { and, eq, isNull, ne, or, lt, sql } from 'drizzle-orm';
import type { Db } from './index';
import * as s from './schema';

/** Fixed quotas, the same for every key. Stated on the account page; a change here changes the page. */
export const KEY_LIMITS = { perMonth: 5000, perMinute: 60, activeKeys: 3 } as const;

const PREFIX = 'sc_live_';
const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** A new secret: the prefix and 32 characters drawn uniformly from a 62-letter alphabet (about 190 bits). */
export function newSecret(): string {
  let out = PREFIX;
  while (out.length < PREFIX.length + 32) {
    // Rejection sampling keeps the draw uniform: 248 = 4 × 62.
    for (const b of randomBytes(48))
      if (b < 248 && out.length < PREFIX.length + 32) out += ALPHABET[b % 62];
  }
  return out;
}

export const hashSecret = (secret: string) => createHash('sha256').update(secret).digest('hex');
/** What the account page shows of a key: `sc_live_3f9a…k2p`. */
export const displayPrefix = (secret: string) => secret.slice(0, PREFIX.length + 4);
export const displaySuffix = (secret: string) => secret.slice(-3);

export const monthWindow = (d: Date) => d.toISOString().slice(0, 7);
export const minuteWindow = (d: Date) => d.toISOString().slice(0, 16);

export type KeyCheck =
  | { status: 'ok'; ownerId: string; keyId: string; name: string; month: number; minute: number }
  | { status: 'unknown' }
  | { status: 'revoked' }
  | { status: 'limited'; window: 'minute' | 'month'; retryAfterSeconds: number };

/**
 * Checks a bearer secret and counts the call. Not owner-scoped: the key is how the owner is found.
 * The count is one conditional update, so two calls racing at the limit cannot both pass.
 */
export async function verifyApiKey(db: Db, secret: string, now = new Date()): Promise<KeyCheck> {
  if (!secret.startsWith(PREFIX)) return { status: 'unknown' };
  const hash = hashSecret(secret);
  const row = (await db.select().from(s.apiKeys).where(eq(s.apiKeys.hash, hash)))[0];
  if (!row) return { status: 'unknown' };
  if (row.revokedAt) return { status: 'revoked' };
  const month = monthWindow(now);
  const minute = minuteWindow(now);
  const updated = (
    await db
      .update(s.apiKeys)
      .set({
        lastUsedAt: now,
        monthWindow: month,
        monthCount: sql`case when ${s.apiKeys.monthWindow} = ${month} then ${s.apiKeys.monthCount} + 1 else 1 end`,
        minuteWindow: minute,
        minuteCount: sql`case when ${s.apiKeys.minuteWindow} = ${minute} then ${s.apiKeys.minuteCount} + 1 else 1 end`,
      })
      .where(
        and(
          eq(s.apiKeys.id, row.id),
          isNull(s.apiKeys.revokedAt),
          or(
            ne(s.apiKeys.monthWindow, month),
            isNull(s.apiKeys.monthWindow),
            lt(s.apiKeys.monthCount, KEY_LIMITS.perMonth),
          ),
          or(
            ne(s.apiKeys.minuteWindow, minute),
            isNull(s.apiKeys.minuteWindow),
            lt(s.apiKeys.minuteCount, KEY_LIMITS.perMinute),
          ),
        ),
      )
      .returning()
  )[0];
  if (updated)
    return {
      status: 'ok',
      ownerId: updated.ownerId,
      keyId: updated.id,
      name: updated.name,
      month: updated.monthCount,
      minute: updated.minuteCount,
    };
  // Refused by the window conditions. Say which, and when it opens again.
  const minuteFull = row.minuteWindow === minute && row.minuteCount >= KEY_LIMITS.perMinute;
  if (minuteFull)
    return { status: 'limited', window: 'minute', retryAfterSeconds: 60 - now.getUTCSeconds() };
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return {
    status: 'limited',
    window: 'month',
    retryAfterSeconds: Math.ceil((nextMonth.getTime() - now.getTime()) / 1000),
  };
}
