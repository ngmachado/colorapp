import { Toolbar } from '@/components/toolbar';
import { redirect } from 'next/navigation';
import { EMAIL_PROVIDER, signIn } from '@/auth';
import { currentUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';

type Params = Record<string, string | string[] | undefined>;

export default async function SignIn({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.next) ? sp.next[0] : sp.next;
  // Only paths inside the app; anything else goes home.
  const next = raw && /^\/(?!\/)/.test(raw) ? raw : '/';
  if (await currentUser()) redirect(next);
  return (
    <>
      <Toolbar />
      <main id="main" className="px-5 sm:px-12 py-10">
        <section className="max-w-md">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-[var(--muted)]">
            We email you a link. No password.
            {next !== '/' ? ' You come back to where you were.' : ''}
          </p>
          <form
            className="mt-4 grid gap-2"
            action={async (formData: FormData) => {
              'use server';
              const to = String(formData.get('next') || '/');
              await signIn(EMAIL_PROVIDER, {
                email: String(formData.get('email')),
                redirectTo: /^\/(?!\/)/.test(to) ? to : '/',
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
              className="rounded-sm border border-[var(--line)] bg-[var(--surface)] px-2 py-1"
            />
            <button
              type="submit"
              className="justify-self-start rounded-sm bg-[var(--accent)] px-3 py-1 text-[var(--accent-fg)]"
            >
              Send sign-in link
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
