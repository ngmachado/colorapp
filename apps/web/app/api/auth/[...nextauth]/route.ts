import type { NextRequest } from 'next/server';
import { handlers } from '@/auth';
import { db } from '@/lib/db';

/** Auth.js endpoints, after the database is migrated: the adapter itself cannot wait. */
export async function GET(req: NextRequest) {
  await db();
  return handlers.GET(req);
}
export async function POST(req: NextRequest) {
  await db();
  return handlers.POST(req);
}
