import { testLogin } from '@sca/db/test-login';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

/**
 * Browser-test sign-in. Only routed by an opted-in development server with AUTH_TEST_LOGIN=1 (the Playwright server sets it).
 * Creates the user if needed and writes a database session, exactly as the magic link would.
 */
export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production' || process.env.AUTH_TEST_LOGIN !== '1')
    return new Response('Not found', { status: 404 });
  const email = new URL(req.url).searchParams.get('email');
  if (!email) return new Response('email required', { status: 400 });
  const { sessionToken } = await testLogin(await db(), email);
  (await cookies()).set('authjs.session-token', sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
  redirect('/lab');
}
