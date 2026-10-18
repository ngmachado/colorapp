import Link from 'next/link';
import { Toolbar } from '@/components/toolbar';
import { redirect } from 'next/navigation';
import { signOut } from '@/auth';
import { currentUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';

/** Account page: what the app holds for this user, with export and deletion. */
export default async function Account() {
  const user = await currentUser();
  if (!user) redirect('/');
  const projects = await user.data.projects.list();
  const count = async (name: string) => {
    const p = projects.find((x) => x.name === name);
    return p ? (await user.data.projects.versions(p.id)).length : 0;
  };
  const palettes = await count('Saved palettes');
  const colours = await count('Saved colours');
  return (
    <>
      <Toolbar />
      <main id="main" className="flex max-w-[640px] flex-col gap-10 px-5 sm:px-12 pt-10 pb-16">
        <section className="flex flex-col gap-2">
          <h1 className="text-[28px] font-bold tracking-[-0.3px]">Your data</h1>
          <p className="text-[var(--muted)]">{user.email}</p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs tracking-[1px] text-[var(--muted)] uppercase">
            Kept on this server
          </h2>
          <p className="text-[15px]">
            {palettes} saved {palettes === 1 ? 'palette' : 'palettes'} and {colours} saved{' '}
            {colours === 1 ? 'colour' : 'colours'}, in the{' '}
            <Link href="/library" className="underline underline-offset-2">
              Library
            </Link>
            . Nothing else: no history, no ratings, no tracking.
          </p>
          <p>
            <a href="/api/account/export" className="btn">
              Download everything as JSON
            </a>
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs tracking-[1px] text-[var(--muted)] uppercase">Account</h2>
          <div className="flex flex-wrap items-center gap-3">
            <form action="/api/account/delete" method="post">
              <button type="submit" className="btn border-[var(--danger)] text-[var(--danger)]">
                Delete my account and all of its data
              </button>
            </form>
            <form
              action={async () => {
                'use server';
                await signOut({ redirectTo: '/' });
              }}
            >
              <button type="submit" className="btn">
                Sign out
              </button>
            </form>
          </div>
          <p className="text-sm text-[var(--muted)]">
            Deleting removes every row this account owns, at once and for good.
          </p>
        </section>
      </main>
    </>
  );
}
