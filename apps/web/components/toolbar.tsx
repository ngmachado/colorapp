import Link from 'next/link';
import type { ReactNode } from 'react';
import { currentUser } from '@/lib/current-user';

const NAV = [
  { href: '/lab', label: 'Laboratory' },
  { href: '/theory', label: 'Theory' },
  { href: '/dictionary', label: 'Dictionary' },
  { href: '/library', label: 'Library' },
] as const;

/**
 * The one thin bar every screen shares: wordmark, three sections, then whatever the screen needs on the right.
 * A screen passes `middle` for its own status line and `children` for its own buttons.
 */
export async function Toolbar({
  current,
  middle,
  children,
}: {
  current?: string;
  middle?: ReactNode;
  children?: ReactNode;
}) {
  const user = await currentUser();
  return (
    <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-x-5 gap-y-1 border-b border-[var(--line)] bg-[var(--surface)] px-5 py-2">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:rounded-sm focus:bg-[var(--surface)] focus:px-2 focus:py-1"
      >
        Skip to content
      </a>
      <Link href="/" className="text-[17px] font-bold tracking-tight whitespace-nowrap">
        Super Colour
      </Link>
      <nav aria-label="Sections" className="flex items-center gap-4 text-sm">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={
              n.href === current ? 'font-semibold' : 'text-[var(--muted)] hover:text-[var(--fg)]'
            }
            aria-current={n.href === current ? 'page' : undefined}
          >
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="hidden min-w-0 flex-1 text-center text-sm text-[var(--muted)] sm:block">
        {middle}
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {children}
        {user ? (
          <Link href="/account" className="text-sm text-[var(--muted)] hover:text-[var(--fg)]">
            {user.email ?? 'Account'}
          </Link>
        ) : (
          <Link href="/signin" className="btn btn-primary">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
