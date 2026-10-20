export const metadata = { robots: { index: false, follow: false } };
import Link from 'next/link';
import { Toolbar } from '@/components/toolbar';

/** Shown after the sign-in form: the link is in the mail, nothing else to do here. */
export default function Sent() {
  return (
    <>
      <Toolbar />
      <main id="main" className="flex max-w-[640px] flex-col gap-4 px-5 pt-16 pb-16 sm:px-12">
        <h1 className="text-[28px] font-bold tracking-[-0.3px]">Check your email</h1>
        <p className="text-[15px] leading-normal text-[var(--muted)]">
          A sign-in link is on its way. Open it on this device to come back signed in. If nothing
          arrives within a few minutes, check the spam folder or send another one.
        </p>
        <p className="flex flex-wrap gap-3 pt-2">
          <Link href="/signin" className="btn">
            Send another link
          </Link>
          <Link href="/lab" className="btn">
            Keep working in the Laboratory
          </Link>
        </p>
      </main>
    </>
  );
}
