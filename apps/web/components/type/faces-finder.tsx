'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { asEm, charactersPerLine } from '@sca/type-engine';
import type { FontReading } from '@sca/type-engine/font';
import type { CatalogueFace } from '@/app/api/fonts/route';
import {
  NO_FILTERS,
  cssHref,
  facts,
  hasWeights,
  matches,
  order,
  tally,
  type FaceFilters,
  type FaceOrder,
} from '@/lib/faces';
import type { StyleSetting } from '@/lib/type-state';

const PAGE = 12;
export const COMPARE_MAX = 4;

/** Adds Google's stylesheet for a set of faces to the document while the component shows them. */
function useGoogleCss(faces: CatalogueFace[], weights: number[]) {
  const href = faces.length ? cssHref(faces, weights) : null;
  useEffect(() => {
    if (!href) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, [href]);
}

function Chip({
  on,
  onClick,
  children,
  testId,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-full border px-2 py-0.5 text-xs ${on ? 'border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]' : 'border-[var(--line)] text-[var(--fg)]'}`}
      data-testid={testId}
    >
      {children}
    </button>
  );
}

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mb-1.5 font-mono text-[0.6875rem] tracking-[1px] text-[var(--muted)] uppercase">
    {children}
  </h2>
);

/**
 * The faces finder: every face in the catalogue that matches a set of facts, set in the reader's palette with
 * the bench's sample, in name order or a shuffle. Nothing is scored or recommended.
 */
export function FacesFinder({
  catalogue,
  hexes,
  styles,
  px,
  sample,
  compare,
  onCompare,
  onSet,
}: {
  catalogue: CatalogueFace[] | null;
  hexes: string[];
  styles: StyleSetting[];
  px: (step: number) => number;
  sample: { display: string; body: string };
  compare: string[];
  onCompare: (family: string) => void;
  onSet: (family: string) => void;
}) {
  const weights = useMemo(() => [...new Set(styles.map((x) => x.weight))].sort(), [styles]);
  const [q, setQ] = useState<FaceFilters>({ ...NO_FILTERS, weights });
  const [how, setHow] = useState<FaceOrder>('name');
  const [seed, setSeed] = useState(1);
  const [page, setPage] = useState(0);
  const all = useMemo(() => catalogue ?? [], [catalogue]);
  const categories = useMemo(() => tally(all, (f) => [f.category]), [all]);
  // The eight most common axes; Google lists some fifty tags, most carried by one or two families.
  const axes = useMemo(
    () => tally(all, (f) => (f.axes ?? []).map((a) => a.tag)).slice(0, 8),
    [all],
  );
  const subsets = useMemo(() => tally(all, (f) => f.subsets).slice(0, 16), [all]);
  const matching = useMemo(
    () =>
      order(
        all.filter((f) => matches(f, q)),
        how,
        seed,
      ),
    [all, q, how, seed],
  );
  const pages = Math.max(1, Math.ceil(matching.length / PAGE));
  const current = Math.min(page, pages - 1);
  const shown = matching.slice(current * PAGE, current * PAGE + PAGE);
  useGoogleCss(shown, weights);
  const set = (patch: Partial<FaceFilters>) => {
    setQ((prev) => ({ ...prev, ...patch }));
    setPage(0);
  };
  const toggle = (key: 'axes' | 'subsets', v: string) =>
    set({ [key]: q[key].includes(v) ? q[key].filter((x) => x !== v) : [...q[key], v] });
  const display = styles.find((x) => x.id === 'display')!;
  const body = styles.find((x) => x.id === 'body')!;

  return (
    <div
      className="grid min-h-0 grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)]"
      data-testid="faces-finder"
    >
      <section className="flex flex-col gap-4 border-b border-[var(--line)] px-4 py-4 md:border-r md:border-b-0">
        <div>
          <H>Category · Google Fonts’ label</H>
          <div className="flex flex-wrap gap-1.5">
            <Chip on={q.category === null} onClick={() => set({ category: null })}>
              all
            </Chip>
            {categories.map(([c, n]) => (
              <Chip
                key={c}
                on={q.category === c}
                onClick={() => set({ category: q.category === c ? null : c })}
                testId="facet-category"
              >
                {c} <span className="opacity-60">{n}</span>
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <H>Built</H>
          <div className="flex flex-wrap gap-1.5">
            {(['variable', 'static'] as const).map((b) => (
              <Chip
                key={b}
                on={q.built === b}
                onClick={() => set({ built: q.built === b ? null : b })}
                testId="facet-built"
              >
                {b}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <H>Weights</H>
          <label className="flex items-start gap-2 text-xs">
            <input
              type="checkbox"
              checked={q.weights.length > 0}
              onChange={(e) => set({ weights: e.target.checked ? weights : [] })}
              data-testid="facet-weights"
            />
            <span>has {weights.join(', ')}, the weights the bench uses</span>
          </label>
        </div>
        {axes.length ? (
          <div>
            <H>Axes · from Google’s list</H>
            <div className="flex flex-wrap gap-1.5">
              {axes.map(([tag, n]) => (
                <Chip
                  key={tag}
                  on={q.axes.includes(tag)}
                  onClick={() => toggle('axes', tag)}
                  testId="facet-axis"
                >
                  {tag} <span className="opacity-60">{n}</span>
                </Chip>
              ))}
            </div>
          </div>
        ) : null}
        {subsets.length ? (
          <div>
            <H>Scripts · Google’s subsets</H>
            <div className="flex flex-wrap gap-1.5">
              {subsets.map(([s, n]) => (
                <Chip
                  key={s}
                  on={q.subsets.includes(s)}
                  onClick={() => toggle('subsets', s)}
                  testId="facet-subset"
                >
                  {s} <span className="opacity-60">{n}</span>
                </Chip>
              ))}
            </div>
          </div>
        ) : null}
        <p className="m-0 text-xs text-[var(--muted)]">
          Filters are facts from Google’s catalogue: its category, whether the file is variable,
          which weights and axes it ships, which subsets it covers. Nothing here ranks a face.
        </p>
        <button
          type="button"
          className="btn h-7 self-start text-xs"
          onClick={() => {
            set({ ...NO_FILTERS, weights });
            setHow('name');
          }}
        >
          Reset
        </button>
      </section>

      <section className="min-w-0 px-5 pt-3 pb-6">
        {catalogue === null ? (
          <p className="m-0 text-xs text-[var(--muted)]">Loading the catalogue…</p>
        ) : catalogue.length === 0 ? (
          <p className="m-0 text-xs text-[var(--muted)]" data-testid="finder-empty">
            The catalogue is not available. A family can still be named in the Face field.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs" data-testid="finder-count">
                <b>{matching.length}</b> of {all.length} faces match · showing {shown.length}
              </span>
              <span className="flex-1" />
              <label className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                Order
                <select
                  value={how}
                  onChange={(e) => {
                    setHow(e.target.value as FaceOrder);
                    setPage(0);
                  }}
                  className="field h-7 text-xs"
                  data-testid="finder-order"
                >
                  <option value="name">name A–Z</option>
                  <option value="name-desc">name Z–A</option>
                  <option value="shuffle">shuffle</option>
                </select>
              </label>
              <button
                type="button"
                className="btn h-7 text-xs"
                onClick={() => {
                  setHow('shuffle');
                  setSeed(Math.floor(Math.random() * 1e9) + 1);
                  setPage(0);
                }}
                data-testid="finder-shuffle"
              >
                Shuffle
              </button>
              <button
                type="button"
                className="btn h-7 text-xs"
                disabled={current === 0}
                onClick={() => setPage(current - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn h-7 text-xs"
                disabled={current >= pages - 1}
                onClick={() => setPage(current + 1)}
                data-testid="finder-next"
              >
                Next {PAGE}
              </button>
            </div>
            <p className="m-0 mt-1.5 text-xs text-[var(--muted)]">
              Every face in Google Fonts that matches, set in your palette with the bench’s sample:
              the display pair above, the body pair below. The order is the name or a shuffle; no
              face is recommended and nothing is scored.
            </p>
            <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3.5">
              {shown.map((f) => {
                const inTray = compare.includes(f.family);
                return (
                  <article
                    key={f.family}
                    className="flex flex-col overflow-hidden rounded-lg border border-[var(--line)]"
                    data-testid="face-card"
                    data-family={f.family}
                  >
                    <div
                      className="px-4 py-3"
                      style={{
                        fontFamily: `'${f.family}', serif`,
                        background: hexes[display.bg],
                        color: hexes[display.fg],
                        fontSize: Math.min(px(display.step), 40),
                        fontWeight: display.weight,
                        lineHeight: 1.05,
                      }}
                    >
                      {sample.display}
                    </div>
                    <div
                      className="px-4 py-3"
                      style={{
                        fontFamily: `'${f.family}', serif`,
                        background: hexes[body.bg],
                        color: hexes[body.fg],
                        fontSize: px(body.step),
                        fontWeight: body.weight,
                        lineHeight: 1.5,
                      }}
                    >
                      {sample.body}
                    </div>
                    <footer className="flex flex-col gap-0.5 border-t border-[var(--line)] bg-[var(--panel)] px-3 py-2.5 text-[0.71875rem] text-[var(--muted)]">
                      <div>
                        <span className="font-mono text-xs text-[var(--fg)]">{f.family}</span>{' '}
                        {f.category} · Google Fonts’ label
                      </div>
                      <div>
                        {facts(f)}
                        {hasWeights(f, weights) ? null : (
                          <span className="text-[var(--warn)]">
                            {' '}
                            · lacks a weight the bench uses
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex gap-1.5">
                        <button
                          type="button"
                          className="btn h-7 text-xs"
                          onClick={() => onSet(f.family)}
                          data-testid="face-set"
                        >
                          Set on bench
                        </button>
                        <button
                          type="button"
                          className="btn h-7 text-xs"
                          aria-pressed={inTray}
                          disabled={!inTray && compare.length >= COMPARE_MAX}
                          onClick={() => onCompare(f.family)}
                          data-testid="face-compare"
                        >
                          {inTray ? 'In compare' : 'Compare'}
                        </button>
                      </div>
                    </footer>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

type Read =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'read'; reading: FontReading; averageAdvance: (px: number) => number };

/**
 * The compare tray: up to four faces side by side, their files downloaded by the browser and read for the same
 * metrics the bench shows. Nothing is stored; a face leaves the tray with its reading.
 */
export function CompareTray({
  catalogue,
  families,
  hexes,
  body,
  bodyPx,
  measure,
  pad,
  onRemove,
  onSet,
}: {
  catalogue: CatalogueFace[];
  families: string[];
  hexes: string[];
  body: StyleSetting;
  bodyPx: number;
  measure: number;
  pad: number;
  onRemove: (family: string) => void;
  onSet: (family: string) => void;
}) {
  const entries = useMemo(
    () =>
      families
        .map((n) => catalogue.find((f) => f.family === n))
        .filter((f): f is CatalogueFace => !!f),
    [families, catalogue],
  );
  useGoogleCss(entries, [body.weight]);
  const [reads, setReads] = useState<Record<string, Read>>({});
  // Readings outlive a change of the tray: a face added while another is still downloading keeps both.
  const cache = useRef(new Map<string, Read>());
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    for (const f of entries) {
      if (cache.current.has(f.family)) continue;
      cache.current.set(f.family, { status: 'loading' });
      setReads((r) => ({ ...r, [f.family]: { status: 'loading' } }));
      const url = f.files.regular ?? Object.values(f.files)[0];
      (async () => {
        let read: Read = { status: 'failed' };
        try {
          if (!url) throw new Error('no file');
          const [buffer, engine] = await Promise.all([
            fetch(url).then((r) => {
              if (!r.ok) throw new Error(String(r.status));
              return r.arrayBuffer();
            }),
            import('@sca/type-engine/font'),
          ]);
          const opened = engine.openFont(buffer);
          read = {
            status: 'read',
            reading: opened.reading,
            averageAdvance: opened.averageAdvance,
          };
        } catch {
          read = { status: 'failed' };
        }
        cache.current.set(f.family, read);
        if (mounted.current) setReads((r) => ({ ...r, [f.family]: read }));
      })();
    }
  }, [entries]);

  const cell = (f: CatalogueFace, pick: (r: Extract<Read, { status: 'read' }>) => string) => {
    const r = reads[f.family] ?? cache.current.get(f.family);
    if (!r || r.status === 'loading') return '…';
    if (r.status === 'failed') return 'not read';
    return pick(r);
  };
  const em = (units: number | null | undefined, upm: number) =>
    units === null || units === undefined ? 'not in the file' : `${asEm(units, upm).toFixed(3)} em`;
  const perLine = (r: Extract<Read, { status: 'read' }>) => {
    let avg = 0;
    try {
      avg = r.averageAdvance(bodyPx);
    } catch {
      avg = 0;
    }
    return avg > 0 ? String(charactersPerLine(measure - 2 * pad, avg)) : '—';
  };
  const rows: [string, (r: Extract<Read, { status: 'read' }>) => string][] = [
    [
      'x-height / cap',
      (r) =>
        r.reading.xHeight && r.reading.capHeight
          ? (r.reading.xHeight / r.reading.capHeight).toFixed(3)
          : 'not in the file',
    ],
    ['x-height', (r) => em(r.reading.xHeight, r.reading.unitsPerEm)],
    ['Cap height', (r) => em(r.reading.capHeight, r.reading.unitsPerEm)],
    [`Per line at ${measure} px`, perLine],
    [
      'Axes',
      (r) =>
        r.reading.axes.length
          ? r.reading.axes.map((a) => `${a.tag} ${a.min}–${a.max}`).join(', ')
          : 'none · static',
    ],
    ['Glyphs', (r) => String(r.reading.glyphs)],
    ['Features', (r) => String(r.reading.features.length)],
    [
      'Basic Latin',
      (r) => {
        const b = r.reading.coverage.find((c) => c.block === 'Basic Latin');
        return b ? `${b.mapped} mapped` : 'none';
      },
    ],
  ];

  return (
    <aside
      className="flex min-w-0 flex-col gap-4 border-t border-[var(--line)] bg-[var(--panel)] px-5 py-4 md:border-t-0 md:border-l"
      data-testid="compare-tray"
    >
      <section>
        <H>
          Compare · {entries.length} of {COMPARE_MAX}
        </H>
        <p className="m-0 mb-2 text-xs text-[var(--muted)]">
          {entries.length
            ? 'Read from the files the browser downloaded for these faces; nothing is stored. Set one on the bench to measure it with your scale.'
            : 'Add up to four faces from the cards to read their files side by side.'}
        </p>
        {entries.length ? (
          <table className="w-full table-fixed border-collapse text-xs">
            <caption className="sr-only">Readings from the files of the compared faces</caption>
            <thead>
              <tr className="text-left text-[var(--muted)]">
                <th className="w-[76px] border-b border-[var(--line)] py-1 pr-1 font-medium" />
                {entries.map((f) => (
                  <th
                    key={f.family}
                    className="border-b border-[var(--line)] py-1 pr-1 font-mono text-[0.6875rem] font-medium break-words"
                  >
                    {f.family}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-b border-[var(--line)] py-1" />
                {entries.map((f) => (
                  <td key={f.family} className="border-b border-[var(--line)] py-1 pr-1">
                    <div
                      className="rounded px-1.5 py-1 text-[0.9375rem] leading-tight"
                      style={{
                        fontFamily: `'${f.family}', serif`,
                        background: hexes[body.bg],
                        color: hexes[body.fg],
                        fontWeight: body.weight,
                      }}
                    >
                      Colour is a tool
                    </div>
                  </td>
                ))}
              </tr>
              {rows.map(([label, pick]) => (
                <tr key={label} data-testid="compare-row">
                  <th className="border-b border-[var(--line)] py-1 pr-1 text-left font-medium text-[var(--muted)]">
                    {label}
                  </th>
                  {entries.map((f) => (
                    <td
                      key={f.family}
                      className="border-b border-[var(--line)] py-1 pr-1 font-mono text-[0.6875rem] break-words"
                    >
                      {cell(f, pick)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="py-1.5" />
                {entries.map((f) => (
                  <td key={f.family} className="py-1.5 pr-1">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        className="btn h-6 px-1.5 text-[0.6875rem]"
                        onClick={() => onSet(f.family)}
                        data-testid="compare-set"
                      >
                        Set
                      </button>
                      <button
                        type="button"
                        className="btn h-6 px-1.5 text-[0.6875rem]"
                        aria-label={`Remove ${f.family} from compare`}
                        onClick={() => onRemove(f.family)}
                      >
                        ×
                      </button>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        ) : null}
      </section>
      <section>
        <H>What a face is</H>
        <p className="m-0 text-xs text-[var(--muted)]">
          Names come from the file; the category is Google Fonts’ own label, stated as theirs. A
          Vox-ATypI class is shown only where a source assigns one. Measure and leading are read
          against Bringhurst once a face is on the bench.
        </p>
      </section>
    </aside>
  );
}
