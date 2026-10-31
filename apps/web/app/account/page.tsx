export const metadata = { robots: { index: false, follow: false } };
import { KEY_LIMITS } from '@sca/db';
import Link from 'next/link';
import { Toolbar } from '@/components/toolbar';
import { redirect } from 'next/navigation';
import { signOut } from '@/auth';
import { ApiKeys } from '@/components/api-keys';
import { currentUser } from '@/lib/current-user';
import { siteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

/** Account page: what the app holds for this user, the keys that act as them, export and deletion. */
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
  const keys = (await user.data.keys.list()).map((k) => ({
    id: k.id,
    name: k.name,
    prefix: k.prefix,
    createdAt: k.createdAt.toISOString(),
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    revokedAt: k.revokedAt?.toISOString() ?? null,
    monthCount: k.monthWindow === new Date().toISOString().slice(0, 7) ? k.monthCount : 0,
  }));
  const origin = siteUrl.origin;
  return (
    <>
      <Toolbar />
      <main id="main" className="flex max-w-[640px] flex-col gap-10 px-5 sm:px-12 pt-10 pb-16">
        <section className="flex flex-col gap-2">
          <h1 className="text-[28px] font-bold tracking-[-0.3px]">Your account</h1>
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

        <section className="flex flex-col gap-3" id="keys">
          <h2 className="text-xs tracking-[1px] text-[var(--muted)] uppercase">API keys</h2>
          <p className="text-[15px]">
            A key lets a script or an agent use the API as you. Each key has its own name and quota
            and can be revoked at any time. Keys read the records and measure colours; they cannot
            change your Library.
          </p>
          <ApiKeys keys={keys} limits={KEY_LIMITS} now={Date.now()} />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs tracking-[1px] text-[var(--muted)] uppercase">Use a key</h2>
          <p className="text-[15px]">
            Send it as a bearer token. This call answers with the key’s name and what it has used of
            its quota, so a script can check its key before doing anything else:
          </p>
          <pre className="overflow-x-auto rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3 font-mono text-[12.5px] leading-relaxed">
            {`curl ${origin}/api/key \\\n  -H "Authorization: Bearer sc_live_…"`}
          </pre>
          <p className="text-sm text-[var(--muted)]">
            The MCP server is the next step and will take the same header at {origin}/api/mcp.
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
            Deleting removes every row this account owns, keys included, at once and for good.
          </p>
        </section>
      </main>
    </>
  );
}
