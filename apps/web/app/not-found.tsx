import Link from 'next/link';
import { Toolbar } from '@/components/toolbar';

/** Branded 404: a missing record id or a stale link. */
export default function NotFound() {
  return (
    <>
      <Toolbar />
      <main id="main" className="flex max-w-[640px] flex-col gap-4 px-5 sm:px-12 pt-16 pb-16">
        <h1 className="text-[28px] font-bold tracking-[-0.3px]">Not found</h1>
        <p className="text-[15px] leading-normal text-[var(--muted)]">
          There is no page at this address. A record may have been renamed in a later release, or
          the link was copied incompletely.
        </p>
        <p className="flex flex-wrap gap-3 pt-2">
          <Link href="/dictionary" className="btn">
            Open the Dictionary
          </Link>
          <Link href="/lab" className="btn">
            Open the Laboratory
          </Link>
        </p>
      </main>
    </>
  );
}
