export const metadata = { robots: { index: false, follow: false } };
import Link from 'next/link';
import { Toolbar } from '@/components/toolbar';
import { redirect } from 'next/navigation';
import { EMAIL_PROVIDER, GOOGLE, signIn } from '@/auth';
import { ACCOUNTS } from '@/lib/accounts';
import { currentUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';

type Params = Record<string, string | string[] | undefined>;
const safePath = (p: unknown) => (typeof p === 'string' && /^\/(?!\/)/.test(p) ? p : '/');

/** What an account keeps, one row each, in the words the account page uses. The bands are the home page's. */
const KEEPS = [
  {
    title: 'Library',
    text: 'Palettes keep their rule, seed, locks and names. Colours keep their record and its source.',
    band: ['#3d2b1f', '#7b4a2d', '#b07c4f', '#e0b98c', '#f3e3cc'],
  },
  {
    title: 'Settings',
    text: 'Light or dark, the same on every device.',
    band: ['#ffffff', '#111213'],
  },
  {
    title: 'API keys',
    text: 'Up to three named keys for scripts and agents, each revocable at any time.',
    band: ['#dbdbdb', '#b0b5b3', '#706f6f', '#ef27a6', '#ff299c'],
  },
] as const;

/** What Auth.js sends in `?error=` when a sign-in does not complete, in the app's words. */
const ERRORS: Record<string, string> = {
  Verification: 'That sign-in link has been used or has expired. Send another one.',
  AccessDenied: 'This account cannot sign in here.',
  OAuthAccountNotLinked:
    'This address already signed in another way. Use the method you used the first time.',
  Configuration: 'Sign-in is not set up correctly on this server.',
};
const DEFAULT_ERROR = 'Sign-in did not complete. Try again.';

/** Sign in with Google, or with a link by email, whichever is configured. Both return to where the user was. */
export default async function SignIn({ searchParams }: { searchParams: Promise<Params> }) {
  if (!ACCOUNTS) redirect('/');
  const sp = await searchParams;
  const next = safePath(Array.isArray(sp.next) ? sp.next[0] : sp.next);
  if (await currentUser()) redirect(next);
  const code = Array.isArray(sp.error) ? sp.error[0] : sp.error;
  const error = code ? (ERRORS[code] ?? DEFAULT_ERROR) : null;
  return (
    <>
      <Toolbar />
      <main id="main" className="px-5 py-10 sm:px-12 sm:py-16">
        <div className="mx-auto grid max-w-[960px] gap-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-start md:gap-16">
          <section className="flex flex-col gap-8">
            <div>
              <h1 className="text-[2rem] leading-[1.1] font-semibold tracking-tight">Sign in</h1>
              <p className="mt-2 text-[1.0625rem] leading-normal text-[var(--muted)]">
                No password. Your Library and settings then follow you to any browser
                {next !== '/' ? ', and you come back to where you were' : ''}.
              </p>
              {error ? (
                <p
                  role="alert"
                  data-testid="signin-error"
                  className="mt-4 rounded-md border border-[var(--danger)] px-3 py-2 text-sm text-[var(--danger)]"
                >
                  {error}
                </p>
              ) : null}
            </div>
            <ul className="flex flex-col gap-[1.125rem]">
              {KEEPS.map((k) => (
                <li key={k.title} className="grid grid-cols-[3.25rem_1fr] items-start gap-3.5">
                  <span
                    aria-hidden="true"
                    className="flex h-8 overflow-hidden rounded-sm border border-[var(--line)]"
                  >
                    {k.band.map((h, i) => (
                      <span key={i} className="flex-1" style={{ background: h }} />
                    ))}
                  </span>
                  <span className="flex flex-col gap-0.5 text-[0.9375rem]">
                    <span className="font-semibold">{k.title}</span>
                    <span className="leading-[1.45] text-[var(--muted)]">{k.text}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-sm leading-normal text-[var(--muted)]">
              Nothing else is kept: no history, no ratings, no tracking. Everything downloads as
              JSON, and the account deletes in one step from its page.
            </p>
          </section>

          <section
            aria-labelledby="ways"
            className="grid gap-5 rounded-[10px] border border-[var(--line)] bg-[var(--panel)] p-6"
          >
            <h2
              id="ways"
              className="text-xs font-medium tracking-[1px] text-[var(--muted)] uppercase"
            >
              Continue with
            </h2>

            {GOOGLE ? (
              <div className="grid gap-3">
                <form
                  action={async (formData: FormData) => {
                    'use server';
                    await signIn('google', { redirectTo: safePath(formData.get('next')) });
                  }}
                >
                  <input type="hidden" name="next" value={next} />
                  <button
                    type="submit"
                    className="btn btn-primary min-h-11 w-full justify-center text-[0.9375rem]"
                    data-testid="google"
                  >
                    <svg
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                      className="h-[1.125rem] w-[1.125rem]"
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.8 6C12.3 13.5 17.7 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.4 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.8-6z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.7-4-13.6-9.8l-7.8 6C6.5 42.6 14.6 48 24 48z"
                      />
                    </svg>
                    Continue with Google
                  </button>
                </form>
                <p className="text-[0.8125rem] leading-[1.45] text-[var(--muted)]">
                  Google confirms your address. We keep the address, name and picture it sends; no
                  password is created here.
                </p>
              </div>
            ) : null}

            {GOOGLE && EMAIL_PROVIDER ? (
              <p
                className="flex items-center gap-3 text-[0.8125rem] text-[var(--muted)] before:h-px before:flex-1 before:bg-[var(--line)] after:h-px after:flex-1 after:bg-[var(--line)]"
                aria-hidden="true"
              >
                or get a link by email
              </p>
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
                  inputMode="email"
                  required
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="send"
                  className="field w-full"
                />
                <button type="submit" className="btn justify-self-start">
                  Send sign-in link
                </button>
              </form>
            ) : null}

            <p className="text-sm leading-normal text-[var(--muted)]">
              Not now? <Link href="/lab">Keep working in the Laboratory</Link>. Signed out, the
              Library stays in this browser.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
