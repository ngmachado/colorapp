import { colour, convert } from '@sca/colour-engine';
import type { Combination, Concept, Representation } from '@sca/knowledge';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AutoForm } from '@/components/auto-form';
import { Toolbar } from '@/components/toolbar';
import { knowledge } from '@/lib/knowledge';
import { namePoints } from '@/lib/palette-names';
import { isColour, isRestricted, KIND_WORDS } from '@/lib/records';

export const dynamic = 'force-dynamic';

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
const many = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
interface Card {
  concept: Concept;
  hex: string | null;
  restricted: boolean;
  oklab: [number, number, number] | null;
  distance: number | null;
  tradition: string;
  matched?: string;
}

export default async function Dictionary({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const typed = one(sp.q).trim();
  // A hex typed into the search box is a near-colour search; people type into the first box they see.
  const q = /^#?[0-9a-f]{6}$/i.test(typed) ? '' : typed;
  const near = one(sp.near).trim() || (q ? '' : typed);
  const kind = one(sp.kind) || 'colours';
  const view = one(sp.view) === 'list' ? 'list' : 'grid';
  const sort = one(sp.sort) || (near ? 'distance' : 'tradition');
  const traditions = many(sp.tradition);
  const k = knowledge();
  const points = namePoints();

  const nearLab = /^#?[0-9a-f]{6}$/i.test(near)
    ? (convert(
        colour(
          'srgb',
          [0, 2, 4].map((i) => parseInt(near.replace('#', '').slice(i, i + 2), 16) / 255) as [
            number,
            number,
            number,
          ],
        ),
        'oklab',
      ).coords as [number, number, number])
    : null;
  const hits =
    q.length >= 2 ? new Map(k.search(q, 100).map((h) => [h.id, `${h.field}: ${h.text}`])) : null;
  const hitConcepts = hits
    ? new Set(
        [...hits.keys()].map((id) => {
          const r = k.record(id);
          return r && 'concept' in r && r.concept ? r.concept : id;
        }),
      )
    : null;

  const allTraditions = [
    ...new Set(k.byType('concept').map((c) => c.tags?.tradition ?? 'other')),
  ].sort();
  const cards: Card[] = k
    .byType('concept')
    .filter(isColour)
    .map((concept) => {
      const reps = k
        .forConcept(concept.id)
        .filter((r): r is Representation => r.type === 'representation');
      const rep = reps.find((r) => !isRestricted(r) && r.coords) ?? null;
      const point = rep ? points.find((p) => p.id === rep.id) : undefined;
      const restricted = isRestricted(concept) || (!rep && reps.some(isRestricted));
      const oklab = point?.oklab ?? null;
      return {
        concept,
        hex: point?.hex ?? null,
        restricted,
        oklab,
        distance:
          oklab && nearLab
            ? Math.hypot(oklab[0] - nearLab[0], oklab[1] - nearLab[1], oklab[2] - nearLab[2])
            : null,
        tradition: concept.tags?.tradition ?? 'other',
        matched:
          hits?.get(concept.id) ??
          (hitConcepts?.has(concept.id)
            ? [...hits!.entries()].find(([id]) => {
                const r = k.record(id);
                return r && 'concept' in r && r.concept === concept.id;
              })?.[1]
            : undefined),
      };
    })
    .filter((c) => !traditions.length || traditions.includes(c.tradition))
    .filter((c) => !hitConcepts || hitConcepts.has(c.concept.id))
    .sort((a, b) => {
      if (sort === 'distance') return (a.distance ?? 9) - (b.distance ?? 9);
      if (sort === 'lightness') return (b.oklab?.[0] ?? -1) - (a.oklab?.[0] ?? -1);
      if (sort === 'hue')
        return (
          (a.oklab ? Math.atan2(a.oklab[2], a.oklab[1]) : 9) -
          (b.oklab ? Math.atan2(b.oklab[2], b.oklab[1]) : 9)
        );
      if (sort === 'name') return a.concept.label.localeCompare(b.concept.label);
      // Within a tradition, colours with a value come before those without one.
      return (
        a.tradition.localeCompare(b.tradition) ||
        Number(!a.hex) - Number(!b.hex) ||
        a.concept.label.localeCompare(b.concept.label)
      );
    });
  const combos = k.byType('combination') as Combination[];
  // Systems and their parts: entries with relations and passages, but no swatch of their own.
  const systems = k.byType('concept').filter((c) => !isColour(c));
  const roots = systems.filter((c) => c.tags?.kind === 'system');
  if (kind === 'systems' && roots.length <= 1)
    redirect(roots[0] ? `/dictionary/${roots[0].id}` : '/dictionary');
  const partsOf = (root: Concept) =>
    systems.filter(
      (c) =>
        c.id !== root.id &&
        k.edges(c.id).some((e) => e.edge === 'member-of' && e.to_id === root.id),
    );
  const sources = k.byType('source');
  const hidden = (name: string, values: string[]) =>
    values.map((v) => <input key={v} type="hidden" name={name} value={v} />);

  return (
    <>
      <Toolbar
        current="/dictionary"
        middle={
          <span>
            {k.byType('concept').filter(isColour).length} colours · {combos.length} combinations ·{' '}
            {sources.length} sources
          </span>
        }
      />
      <main id="main" className="flex flex-1 flex-wrap">
        <AutoForm
          className="order-last flex w-full shrink-0 flex-col gap-[22px] border-t border-[var(--line)] p-4 text-sm sm:order-none sm:w-60 sm:border-t-0 sm:border-r"
          data-testid="filters"
        >
          {view !== 'grid' ? <input type="hidden" name="view" value={view} /> : null}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs tracking-[1px] text-[var(--muted)] uppercase">Search</span>
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="name, script, hex…"
              className="field"
            />
          </label>
          <Link
            href="/about#coverage"
            className="text-xs text-[var(--muted)] underline underline-offset-2"
          >
            Collection coverage and sources
          </Link>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs tracking-[1px] text-[var(--muted)] uppercase">
              Show
            </legend>
            {['colours', ...(roots.length > 1 ? ['systems'] : []), 'combinations', 'sources'].map(
              (v) => (
                <label key={v} className="flex items-center gap-2">
                  <input type="radio" name="kind" value={v} defaultChecked={kind === v} />{' '}
                  {v[0]!.toUpperCase() + v.slice(1)}
                </label>
              ),
            )}
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs tracking-[1px] text-[var(--muted)] uppercase">
              Tradition
            </legend>
            {allTraditions.map((t) => (
              <label key={t} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="tradition"
                  value={t}
                  defaultChecked={traditions.includes(t)}
                />{' '}
                <span className="capitalize">{t}</span>
                <span className="ml-auto font-mono text-xs text-[var(--muted)]">
                  {
                    k
                      .byType('concept')
                      .filter((c) => isColour(c) && (c.tags?.tradition ?? 'other') === t).length
                  }
                </span>
              </label>
            ))}
          </fieldset>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs tracking-[1px] text-[var(--muted)] uppercase">
              Near a colour
            </span>
            <span className="flex items-center gap-2">
              <span
                className="h-9 w-9 shrink-0 rounded-md border border-[var(--line)]"
                style={{ background: nearLab ? `#${near.replace('#', '')}` : 'transparent' }}
              />
              <input
                type="text"
                name="near"
                defaultValue={near}
                placeholder="#663399"
                pattern="#?[0-9a-fA-F]{6}"
                className="field min-w-0 font-mono text-[13px]"
                aria-label="Hex to search near"
              />
            </span>
            <span className="text-xs text-[var(--muted)]">
              Closest colours first. Distance is not meaning.
            </span>
          </label>
          {hidden('sort', sort ? [sort] : [])}
          <button type="submit" className="sr-only">
            Apply
          </button>
        </AutoForm>

        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-[18px] px-6 pt-5 pb-10">
          {kind === 'colours' ? (
            <>
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-sm text-[var(--muted)]" data-testid="count">
                  {cards.length} colours
                  {nearLab ? ` · nearest to #${near.replace('#', '').toUpperCase()} first` : ''}
                  {q ? ` · matching “${q}”` : ''}
                </span>
                <span className="flex gap-1" role="group" aria-label="View">
                  {(['grid', 'list'] as const).map((v) => {
                    const qs = new URLSearchParams();
                    for (const [key, val] of Object.entries(sp)) {
                      if (key === 'view') continue;
                      for (const x of many(val)) qs.append(key, x);
                    }
                    qs.set('view', v);
                    return (
                      <Link
                        key={v}
                        href={`/dictionary?${qs}`}
                        className={`btn h-8 text-[13px] ${view === v ? 'btn-primary' : ''}`}
                        aria-current={view === v ? 'true' : undefined}
                        data-testid={`view-${v}`}
                      >
                        {v === 'grid' ? '▦ grid' : '☰ list'}
                      </Link>
                    );
                  })}
                </span>
                <AutoForm className="ml-auto flex items-center gap-2 text-sm text-[var(--muted)]">
                  {hidden('tradition', traditions)}
                  {q ? <input type="hidden" name="q" value={q} /> : null}
                  {near ? <input type="hidden" name="near" value={near} /> : null}
                  {view !== 'grid' ? <input type="hidden" name="view" value={view} /> : null}
                  <label className="flex items-center gap-2">
                    Sort
                    <select name="sort" defaultValue={sort} className="field h-8 text-[13px]">
                      {['distance', 'tradition', 'lightness', 'hue', 'name'].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <button type="submit" className="sr-only">
                    Sort
                  </button>
                </AutoForm>
              </div>
              {cards.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">
                  Nothing matches.{' '}
                  <Link href="/dictionary" className="underline underline-offset-2">
                    Clear the filters
                  </Link>
                </p>
              ) : null}
              {view === 'list' ? (
                <ul className="flex flex-col" data-testid="list">
                  {cards.map((c) => (
                    <li key={c.concept.id}>
                      <Link
                        href={`/dictionary/${c.concept.id}`}
                        className="flex items-center gap-4 border-b border-[var(--line)] py-2 hover:bg-[var(--accent-soft)]"
                        data-testid="card"
                      >
                        {c.hex ? (
                          <span
                            className="h-9 w-14 shrink-0 rounded-md"
                            style={{ background: c.hex }}
                          />
                        ) : (
                          <span className="h-9 w-14 shrink-0 rounded-md bg-[var(--accent-soft)]" />
                        )}
                        <span className="w-64 text-[15px]">{c.concept.label}</span>
                        <span className="w-40 text-xs text-[var(--muted)] capitalize">
                          {c.tradition}
                        </span>
                        <span className="font-mono text-[11px] text-[var(--muted)]">
                          {c.distance != null ? `distance ${c.distance.toFixed(3)} · ` : ''}
                          {c.hex
                            ? c.hex.slice(1).toUpperCase()
                            : c.restricted
                              ? 'value not reproduced'
                              : 'no value yet'}
                        </span>
                        {c.matched ? (
                          <span className="text-[11px] text-[var(--muted)]">
                            matched {c.matched}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div
                  className="grid gap-3.5"
                  style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}
                  data-testid="grid"
                >
                  {cards.map((c) => (
                    <Link
                      key={c.concept.id}
                      href={`/dictionary/${c.concept.id}`}
                      className="flex flex-col overflow-hidden rounded-lg border border-[var(--line)] hover:border-[var(--fg)]"
                      data-testid="card"
                    >
                      {c.hex ? (
                        <span className="h-[110px]" style={{ background: c.hex }} />
                      ) : (
                        <span className="h-[110px] bg-[var(--accent-soft)]" />
                      )}
                      <span className="flex flex-col gap-[3px] px-3 py-2.5">
                        <span className="text-[15px]">{c.concept.label}</span>
                        <span className="text-xs text-[var(--muted)] capitalize">
                          {c.tradition}
                        </span>
                        <span className="font-mono text-[11px] text-[var(--muted)]">
                          {c.distance != null ? `distance ${c.distance.toFixed(3)} · ` : ''}
                          {c.hex
                            ? c.hex.slice(1).toUpperCase()
                            : c.restricted
                              ? 'value not reproduced'
                              : 'no value yet'}
                        </span>
                        {c.matched ? (
                          <span className="text-[11px] text-[var(--muted)]">
                            matched {c.matched}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </>
          ) : null}

          {kind === 'combinations' || (kind === 'colours' && combos.length) ? (
            <div className="mt-2 flex flex-col gap-2.5">
              <span className="text-xs tracking-[1px] text-[var(--muted)] uppercase">
                Combinations
              </span>
              <div
                className="grid gap-3.5"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
              >
                {combos.map((c) => (
                  <Link
                    key={c.id}
                    href={`/dictionary/combination/${c.id}`}
                    className="flex items-center gap-3 rounded-lg border border-[var(--line)] p-2.5 hover:border-[var(--fg)]"
                  >
                    <span className="flex h-11 w-24 shrink-0 overflow-hidden rounded-md">
                      {c.items.map((it, i) => (
                        <span
                          key={i}
                          className="border border-[var(--line)]"
                          style={{
                            flex: i === 0 ? 1 : 2,
                            background:
                              points.find((p) => p.conceptId === it.concept)?.hex ??
                              'var(--accent-soft)',
                          }}
                        />
                      ))}
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold">{c.label}</span>
                      <span className="text-xs text-[var(--muted)]">
                        {c.items
                          .map(
                            (it) =>
                              (k.record(it.concept) as Concept | undefined)?.label ?? it.concept,
                          )
                          .join(' → ')}
                        {c.season ? ` · ${c.season}` : ''}
                        {c.order_documented ? ' · order documented' : ''}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {kind === 'systems' ? (
            <div className="flex flex-col gap-6" data-testid="systems">
              {roots.map((root) => {
                const parts = partsOf(root);
                return (
                  <div
                    key={root.id}
                    className="flex flex-col gap-2 border-b border-[var(--line)] pb-6"
                    data-testid="system"
                  >
                    <Link
                      href={`/dictionary/${root.id}`}
                      className="text-[22px] font-bold no-underline hover:underline"
                    >
                      {root.label}
                    </Link>
                    <span className="text-xs text-[var(--muted)] capitalize">
                      {root.tags?.tradition ?? ''}
                    </span>
                    {root.description ? (
                      <p className="max-w-[720px] text-[15px] leading-normal text-[var(--muted)]">
                        {root.description}
                      </p>
                    ) : null}
                    {parts.length ? (
                      <span className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        {parts.map((c) => (
                          <Link
                            key={c.id}
                            href={`/dictionary/${c.id}`}
                            className="underline underline-offset-2"
                            title={KIND_WORDS[String(c.tags?.kind)] ?? ''}
                          >
                            {c.label}
                          </Link>
                        ))}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}

          {kind === 'sources' ? (
            <ul className="flex flex-col gap-1.5 text-sm" data-testid="sources">
              {sources.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/dictionary/source/${s.id}`}
                    className="underline underline-offset-2"
                  >
                    {s.title}
                  </Link>
                  <span className="text-[var(--muted)]">{s.author}</span>
                  {s.rights_status === 'verified-restricted' ? (
                    <span className="text-xs text-[var(--muted)]">cited only</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </main>
    </>
  );
}
