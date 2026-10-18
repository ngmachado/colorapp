import type { Source } from '@sca/knowledge';
import Link from 'next/link';
import { notDocumented } from '@/lib/records';

/** Evidence first: who says so and where. */
export function Citation({ source, locator }: { source: Source | undefined; locator?: string }) {
  if (!source) return <span className="text-[var(--muted)]">{notDocumented}</span>;
  return (
    <span>
      <Link href={`/dictionary/source/${source.id}`} className="underline underline-offset-2">
        {source.author}, <i>{source.title}</i>
        {source.date ? ` (${source.date})` : ''}
      </Link>
      {locator ? <span className="text-[var(--muted)]">, {locator}</span> : null}
    </span>
  );
}

export function Field({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <>
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd>{children ?? <span className="text-[var(--muted)]">{notDocumented}</span>}</dd>
    </>
  );
}

/** A citation short enough to sit inline: surname and year, then the locator. The full reference is the tooltip and the link. */
export function ShortCite({ source, locator }: { source: Source | undefined; locator?: string }) {
  if (!source) return <span className="text-xs text-[var(--muted)]">{notDocumented}</span>;
  const first = source.author.split(/[;,]/)[0]!.trim();
  const who = /\(|contributors|Group|Commission|Encyclopedia/i.test(first)
    ? first.split(' ')[0]
    : first.split(' ').pop();
  const year = source.date ? source.date.slice(0, 4) : '';
  return (
    <Link
      href={`/dictionary/source/${source.id}`}
      className="inline-block max-w-[260px] truncate align-bottom font-mono text-xs text-[var(--muted)] no-underline hover:underline"
      title={`${source.author}, ${source.title}${locator ? `, ${locator}` : ''}`}
    >
      {who}
      {year ? ` ${year}` : ''}
      {locator ? ` · ${locator}` : ''}
    </Link>
  );
}
