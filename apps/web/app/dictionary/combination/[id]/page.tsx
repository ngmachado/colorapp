import { colour, convert } from '@sca/colour-engine';
import type { Concept, Source } from '@sca/knowledge';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Citation } from '@/components/record';
import { Toolbar } from '@/components/toolbar';
import { knowledge } from '@/lib/knowledge';
import { labFromConcepts } from '@/lib/lab-links';
import { namePoints } from '@/lib/palette-names';
import { isRestricted, notDocumented } from '@/lib/records';

export const dynamic = 'force-dynamic';

const INTERPRETATION: Record<string, string> = {
  'historical-description': 'as the source describes it',
  'new-adaptation': 'an adaptation',
};

/** A documented combination: its layers as the source orders them, the source's own words, and a way into the Laboratory. */
export default async function CombinationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const k = knowledge();
  const c = k.record(id);
  if (!c || c.type !== 'combination') notFound();
  const source = k.record(c.evidence.source) as Source | undefined;
  const points = namePoints();
  const items = [...c.items].map((it, i) => ({
    ...it,
    i,
    conceptId: it.concept,
    concept: k.record(it.concept) as Concept | undefined,
    point: points.find((p) => p.conceptId === it.concept),
  }));
  const ordered = c.order_documented
    ? items.sort((a, b) => (a.layer_index ?? a.i) - (b.layer_index ?? b.i))
    : items;
  const shownLayers = ordered.filter((it) => it.point).length;
  const tradition = ordered.find((it) => it.concept?.tags?.tradition)?.concept?.tags?.tradition;
  const restricted = isRestricted(c);
  const ink = (hex: string) =>
    convert(
      colour(
        'srgb',
        [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255) as [
          number,
          number,
          number,
        ],
      ),
      'oklch',
    ).coords[0] > 0.62
      ? '#1a1a1a'
      : '#ffffff';
  const name = (it: (typeof ordered)[number]) => it.concept?.label ?? it.conceptId;
  const row =
    'grid grid-cols-1 gap-x-6 gap-y-2.5 text-[15px] leading-normal sm:grid-cols-[180px_minmax(0,1fr)]';

  return (
    <>
      <Toolbar
        current="/dictionary"
        middle={tradition ? <span className="capitalize">{tradition}</span> : undefined}
      >
        {shownLayers >= 2 ? (
          <Link
            href={labFromConcepts(ordered.map((it) => it.conceptId))}
            className="btn"
            data-testid="combination-to-lab"
          >
            Open in the Laboratory
          </Link>
        ) : null}
      </Toolbar>
      <main id="main" className="flex flex-col">
        {/* The layers as a band, in the documented order, so the combination reads as colour before words. */}
        <div className="flex h-[220px]" data-testid="band">
          {ordered.map((it) => (
            <div
              key={it.i}
              className="flex flex-1 flex-col justify-end px-5 pb-5 sm:px-8"
              style={
                it.point
                  ? { background: it.point.hex, color: ink(it.point.hex) }
                  : {
                      background:
                        'repeating-linear-gradient(45deg, var(--accent-soft) 0 6px, var(--surface) 6px 12px)',
                    }
              }
            >
              <span className="text-[28px] leading-none font-medium tracking-[-0.5px]">
                {name(it)}
              </span>
              <span className="mt-2 text-xs font-semibold tracking-[1px] uppercase opacity-90">
                {it.position ?? it.role ?? `layer ${(it.layer_index ?? it.i) + 1}`}
                {it.point ? ` · ${it.point.hex.slice(1).toUpperCase()}` : ' · no displayable value'}
              </span>
            </div>
          ))}
        </div>

        <div className="flex max-w-[1100px] flex-col gap-12 px-5 pt-10 pb-16 sm:px-12">
          <section className="flex flex-col gap-2">
            <p className="text-sm text-[var(--muted)]">
              <Link href="/dictionary?kind=combinations" className="underline underline-offset-2">
                Combinations
              </Link>
            </p>
            <h1 className="text-[40px] leading-none font-medium tracking-[-1px]">{c.label}</h1>
            {restricted ? (
              <span className="text-sm text-[var(--muted)]">
                The source does not allow its content to be reproduced; only the citation is shown.
              </span>
            ) : null}
          </section>

          <section className="flex flex-col gap-3.5">
            <h2 className="text-[22px] font-bold">Source</h2>
            <dl className={row}>
              <dt className="text-[var(--muted)]">Cited from</dt>
              <dd>
                <Citation source={source} locator={c.evidence.locator} />
              </dd>
              <dt className="text-[var(--muted)]">Kind</dt>
              <dd>
                {c.relationship_type}
                {c.interpretation
                  ? `, ${INTERPRETATION[c.interpretation] ?? c.interpretation}`
                  : ''}
              </dd>
              <dt className="text-[var(--muted)]">Season, in the source&apos;s words</dt>
              <dd>{c.season ?? <span className="text-[var(--muted)]">{notDocumented}</span>}</dd>
              <dt className="text-[var(--muted)]">Order</dt>
              <dd>{c.order_documented ? 'given by the source' : 'not documented'}</dd>
              {c.intended_context ? (
                <>
                  <dt className="text-[var(--muted)]">Context</dt>
                  <dd>{c.intended_context}</dd>
                </>
              ) : null}
              {c.notes ? (
                <>
                  <dt className="text-[var(--muted)]">Notes</dt>
                  <dd>{c.notes}</dd>
                </>
              ) : null}
            </dl>
          </section>

          <section className="flex flex-col gap-3.5">
            <h2 className="text-[22px] font-bold">
              Layers{' '}
              <span className="text-base font-normal text-[var(--muted)]">
                · {c.order_documented ? 'inner to outer, as documented' : 'order not documented'}
              </span>
            </h2>
            <ol className="flex flex-col gap-2 text-[15px]" data-testid="layers">
              {ordered.map((it) => (
                <li key={it.i} className="flex items-center gap-4">
                  <span className="w-5 font-mono text-[13px] text-[var(--muted)]">
                    {c.order_documented ? (it.layer_index ?? it.i) + 1 : '·'}
                  </span>
                  <span
                    className="h-10 w-14 shrink-0 rounded-md border border-[var(--line)]"
                    style={{
                      background:
                        it.point?.hex ??
                        'repeating-linear-gradient(45deg, var(--accent-soft) 0 6px, var(--surface) 6px 12px)',
                    }}
                  />
                  <Link
                    href={`/dictionary/${it.conceptId}`}
                    className="underline underline-offset-2"
                  >
                    {name(it)}
                  </Link>
                  <span className="text-[13px] text-[var(--muted)]">
                    {[
                      it.position,
                      it.role && it.role !== it.position ? it.role : null,
                      it.visibility,
                      it.proportion != null ? `${(it.proportion * 100).toFixed(0)}%` : null,
                      it.point ? it.point.hex.slice(1).toUpperCase() : 'no displayable value',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </li>
              ))}
            </ol>
            <p className="text-[13px] text-[var(--muted)]">
              Values belong to each colour&apos;s entry. This record keeps only the documented
              relationship.
            </p>
          </section>

          <section className="flex flex-col gap-3.5">
            <h2 className="text-[22px] font-bold">In the Laboratory</h2>
            {shownLayers >= 2 ? (
              <p className="flex flex-wrap items-center gap-4 text-[15px]">
                <Link href={labFromConcepts(ordered.map((it) => it.conceptId))} className="btn">
                  Open the layers as columns
                </Link>
                <span className="text-[var(--muted)]">
                  {shownLayers === ordered.length
                    ? 'All layers'
                    : `${shownLayers} of ${ordered.length} layers`}{' '}
                  open in this order, each locked and named after its record.
                </span>
              </p>
            ) : (
              <p className="text-sm text-[var(--muted)]">
                Fewer than two layers have a displayable value, so there is nothing to open.
              </p>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
