import type { Metadata } from 'next';
import Link from 'next/link';
import type { Source } from '@sca/knowledge';
import { Toolbar } from '@/components/toolbar';
import { ShortCite } from '@/components/record';
import { knowledge } from '@/lib/knowledge';
import { labFromConcepts } from '@/lib/lab-links';
import { namePoints } from '@/lib/palette-names';
import { documentedSets } from '@/lib/sets';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Documented palettes · Super Colour',
  description:
    'Every sourced set of colours in the collection: systems and their members, attributed pairs, and layerings. Each opens in the Laboratory. Sourced, not trending.',
};

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const KINDS = [
  ['all', 'All'],
  ['group', 'Groups'],
  ['pair', 'Pairs'],
  ['layering', 'Layerings'],
] as const;
const KIND_WORDS = {
  group: 'documented group',
  pair: 'attributed pair',
  layering: 'documented layering',
};

export default async function Palettes({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const kind = one(sp.kind) ?? 'all';
  const k = knowledge();
  const points = namePoints();
  const sets = documentedSets().filter((s) => kind === 'all' || s.kind === kind);
  const counts = documentedSets().reduce<Record<string, number>>((acc, s) => {
    acc[s.kind ?? 'group'] = (acc[s.kind ?? 'group'] ?? 0) + 1;
    return acc;
  }, {});
  return (
    <>
      <Toolbar current="/palettes" middle="Documented palettes" />
      <main
        id="main"
        className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-5 py-8 sm:px-12"
      >
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <h1 className="m-0 text-[17px] font-semibold">Documented palettes</h1>
          <p className="m-0 max-w-[70ch] text-sm text-[var(--muted)]">
            Every set of colours a source documents together: a system’s members, a pair an author
            attributes, a layering a page records. Each opens in the Laboratory as locked, named
            columns. Nothing here is trending, rated or recommended.
          </p>
        </div>
        <nav aria-label="Kind" className="flex flex-wrap gap-2 text-sm">
          {KINDS.map(([id, label]) => (
            <Link
              key={id}
              href={id === 'all' ? '/palettes' : `/palettes?kind=${id}`}
              className={`btn h-8 ${kind === id ? 'btn-primary' : ''}`}
              aria-current={kind === id ? 'page' : undefined}
              data-testid={`kind-${id}`}
            >
              {label} ({id === 'all' ? documentedSets().length : (counts[id] ?? 0)})
            </Link>
          ))}
        </nav>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sets.map((s) => {
            const members = s.conceptIds.map((cid) => ({
              cid,
              p: points.find((x) => x.conceptId === cid),
              label: (k.record(cid) as { label?: string } | undefined)?.label ?? cid,
            }));
            const source = s.source ? (k.record(s.source) as Source | undefined) : undefined;
            return (
              <article
                key={s.id}
                className="flex flex-col gap-2 rounded-lg border border-[var(--line)] p-3"
                data-testid="documented-palette"
                data-kind={s.kind}
              >
                <span className="flex h-16 overflow-hidden rounded-md" aria-hidden="true">
                  {members.map((m) => (
                    <span
                      key={m.cid}
                      className="flex-1 border border-[var(--line)]"
                      style={{ background: m.p?.hex ?? 'var(--accent-soft)' }}
                      title={
                        m.p
                          ? `${m.label} ${m.p.hex.toUpperCase()}`
                          : `${m.label}: no displayable value`
                      }
                    />
                  ))}
                </span>
                <span className="text-[15px] font-semibold">{s.label}</span>
                <span className="text-xs text-[var(--muted)]">
                  {KIND_WORDS[s.kind ?? 'group']} · {members.filter((m) => m.p).length} of{' '}
                  {members.length} with a value
                </span>
                <span className="flex flex-wrap gap-x-2 text-xs">
                  {members.map((m, i) => (
                    <span key={m.cid}>
                      {i ? '· ' : ''}
                      <Link href={`/dictionary/${m.cid}`} className="underline">
                        {m.label}
                      </Link>
                    </span>
                  ))}
                </span>
                <span className="text-xs">
                  <ShortCite source={source} />
                </span>
                {members.filter((m) => m.p).length >= 2 ? (
                  <Link
                    href={labFromConcepts(s.conceptIds)}
                    className="btn h-8 self-start text-[13px]"
                    data-testid="palette-to-lab"
                  >
                    Open in Laboratory
                  </Link>
                ) : null}
              </article>
            );
          })}
        </div>
      </main>
    </>
  );
}
