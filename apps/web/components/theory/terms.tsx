import type { Source } from '@sca/knowledge';
import Link from 'next/link';
import { curriculum } from '@/lib/curriculum';
import { knowledge } from '@/lib/knowledge';

/** The vocabulary the app keeps apart, one row per term: the distinction, the words it separates, the common mistake. */
export function Terms() {
  const k = knowledge();
  const terms = curriculum().filter((t) => t.kind === 'term');
  const source = (id: string) => k.record(id) as Source | undefined;
  return (
    <section id="terms" className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[28px] font-bold tracking-tight">Colour vocabulary reference</h2>
        <p className="max-w-[760px] text-base text-[var(--muted)]">
          {terms.length} terms used in the lessons. Perceptual attributes, physical measurements and
          editing coordinates describe different things.
        </p>
      </div>
      <dl className="grid gap-x-8 gap-y-5 md:grid-cols-2" data-testid="terms">
        {terms.map((t) => (
          <div
            key={t.id}
            id={t.id}
            className="flex flex-col gap-2 border-t border-[var(--line)] pt-3"
            data-testid="term"
          >
            <dt className="text-[17px] font-semibold">{t.title}</dt>
            <dd className="text-sm leading-[1.5]">{t.summary}</dd>
            {t.key_terms?.length ? (
              <dd className="flex flex-col gap-1 text-[13px]">
                {t.key_terms.map((kt) => (
                  <span key={kt.term}>
                    <span className="font-mono">{kt.term}</span>
                    <span className="text-[var(--muted)]"> · {kt.distinction}</span>
                  </span>
                ))}
              </dd>
            ) : null}
            {t.misconception ? (
              <dd className="text-[13px] text-[var(--muted)]">
                <span className="font-semibold text-[var(--fg)]">Not so: </span>
                {t.misconception}
              </dd>
            ) : null}
            <dd className="flex flex-wrap gap-x-3 text-xs text-[var(--muted)]">
              {t.sources.map((id) => {
                const s = source(id);
                return s ? (
                  <Link
                    key={id}
                    href={`/dictionary/source/${id}`}
                    className="underline underline-offset-2"
                  >
                    {s.author.split(';')[0]}, {s.date ?? 'n.d.'}
                  </Link>
                ) : null;
              })}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
