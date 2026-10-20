export const metadata = { robots: { index: false, follow: false } };
import { Toolbar } from '@/components/toolbar';
import { redirect } from 'next/navigation';
import { EMAIL_PROVIDER, GOOGLE, signIn } from '@/auth';
import { ACCOUNTS } from '@/lib/accounts';
import { currentUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';

type Params = Record<string, string | string[] | undefined>;
const safePath = (p: unknown) => (typeof p === 'string' && /^\/(?!\/)/.test(p) ? p : '/');

/** Sign in with Google, or with a link by email, whichever is configured. Both return to where the user was. */
export default async function SignIn({ searchParams }: { searchParams: Promise<Params> }) {
  if (!ACCOUNTS) redirect('/');
  const sp = await searchParams;
  const next = safePath(Array.isArray(sp.next) ? sp.next[0] : sp.next);
  if (await currentUser()) redirect(next);
  return (
    <>
      <Toolbar />
      <main id="main" className="px-5 py-10 sm:px-12">
        <section className="flex max-w-md flex-col gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
            <p className="mt-1 text-[var(--muted)]">
              No password.{next !== '/' ? ' You come back to where you were.' : ''}
            </p>
          </div>

          {GOOGLE ? (
            <form
              action={async (formData: FormData) => {
                'use server';
                await signIn('google', { redirectTo: safePath(formData.get('next')) });
              }}
            >
              <input type="hidden" name="next" value={next} />
              <button type="submit" className="btn btn-primary h-11 px-5" data-testid="google">
                Continue with Google
              </button>
            </form>
          ) : null}

          {GOOGLE && EMAIL_PROVIDER ? (
            <p className="text-sm text-[var(--muted)]">or get a link by email</p>
          ) : null}

          {EMAIL_PROVIDER ? (
            <form
              className="grid gap-2"
              action={async (formData: FormData) => {
                'use server';
                await signIn(EMAIL_PROVIDER ?? 'nodemailer', {
                  email: String(formData.get('email')),
                  redirectTo: safePath(formData.get('next')),
                });
              }}
            >
              <input type="hidden" name="next" value={next} />
              <label htmlFor="email" className="text-sm">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="field max-w-xs"
              />
              <button type="submit" className="btn justify-self-start">
                Send sign-in link
              </button>
            </form>
          ) : null}
        </section>
      </main>
    </>
  );
}
