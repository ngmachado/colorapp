import Link from 'next/link';
import { notFound } from 'next/navigation';
import { recordHref, recordTitle } from '@/components/search';
import { Toolbar } from '@/components/toolbar';
import { knowledge } from '@/lib/knowledge';

export const dynamic = 'force-dynamic';

const TYPE_WORDS: Record<string, string> = {
  concept: 'colour',
  name: 'name',
  representation: 'value',
  'material-sample': 'sample',
  combination: 'combination',
  'cultural-assertion': 'passage',
  relationship: 'relation',
};

/** Bibliographic page. For a restricted publication this is all the app shows: no values, no passages. */
export default async function SourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const k = knowledge();
  const s = k.record(id);
  if (!s || s.type !== 'source') notFound();
  const citing = k.citing(id);
  const restricted = s.rights_status === 'verified-restricted';
  const rows: [string, React.ReactNode][] = [
    ['Publisher', s.publisher],
    ['Date', s.date],
    ['Edition', s.edition],
    ['ISBN', s.isbn],
    [
      'URL',
      s.url ? (
        <a href={s.url} className="break-all underline underline-offset-2" rel="noreferrer">
          {s.url}
        </a>
      ) : undefined,
    ],
    ['Archive id', s.archive_id],
    ['Accessed', s.access_date],
    [
      'Use in this app',
      restricted
        ? 'Cited only. The publication does not allow its content to be reproduced.'
        : 'Cited, with values and passages reproduced where the records below say so.',
    ],
    ['Rights notes', s.rights_notes],
    ['Notes', s.notes],
  ];
  return (
    <>
      <Toolbar current="/dictionary" />
      <main id="main" className="flex max-w-[1100px] flex-col gap-10 px-5 pt-10 pb-16 sm:px-12">
        <section className="flex flex-col gap-2" data-source={s.id}>
          <p className="text-sm text-[var(--muted)]">
            <Link href="/dictionary?kind=sources" className="underline underline-offset-2">
              Sources
            </Link>
          </p>
          <h1 className="text-[32px] leading-tight font-medium tracking-[-0.5px]">{s.title}</h1>
          <p className="text-[17px] text-[var(--muted)]">{s.author}</p>
        </section>

        <dl className="grid max-w-[900px] grid-cols-1 gap-x-6 gap-y-2.5 text-[15px] leading-normal sm:grid-cols-[180px_minmax(0,1fr)]">
          {rows
            .filter(([, v]) => v)
            .map(([label, v]) => (
              <div key={label} className="contents">
                <dt className="text-[var(--muted)]">{label}</dt>
                <dd>{v}</dd>
              </div>
            ))}
        </dl>

        <section className="flex flex-col gap-3.5">
          <h2 className="text-[22px] font-bold">
            Records from this source{' '}
            <span className="text-base font-normal text-[var(--muted)]">· {citing.length}</span>
          </h2>
          {citing.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              None.{restricted ? ' Only the bibliographic record is held.' : ''}
            </p>
          ) : (
            <ul className="grid gap-1.5 text-[15px] sm:grid-cols-2">
              {citing.map((r) => (
                <li key={r.id} className="flex flex-wrap items-baseline gap-2">
                  <Link href={recordHref(r)} className="underline underline-offset-2">
                    {recordTitle(r)}
                  </Link>
                  <span className="text-xs text-[var(--muted)]">
                    {TYPE_WORDS[r.type] ?? r.type}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
