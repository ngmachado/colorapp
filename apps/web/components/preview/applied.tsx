'use client';

import { colour, toHex } from '@sca/colour-engine';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { labFromHexes } from '@/lib/lab-links';
import type { Oklch, Pair } from '@/lib/palette-param';
import {
  derivedDark,
  parseSlots,
  shownPairs,
  SLOTS,
  slotsParam,
  type Slot,
  type Slots,
} from '@/lib/preview';

const hexOf = (c: Oklch) => toHex(colour('oklch', c));
const SLOT_WORDS: Record<Slot, string> = {
  background: 'page background',
  surface: 'cards and panels',
  text: 'text',
  primary: 'primary button',
  link: 'links',
  border: 'borders',
};

/**
 * A real page drawn with the palette: nothing is a picture of a palette, every part is an element
 * styled with one of the columns. The slot selects move colours between parts; the contrast table
 * measures exactly the combinations drawn.
 */
export function Applied({
  palette,
  names,
  pairs,
  initialSlots,
  initialDark,
}: {
  palette: Oklch[];
  names: string[];
  pairs: Pair[];
  initialSlots?: string;
  initialDark: boolean;
}) {
  const [slots, setSlots] = useState<Slots>(() => parseSlots(initialSlots, palette, pairs));
  const [dark, setDark] = useState(initialDark);
  const shown = dark ? derivedDark(palette) : palette;
  const hexes = shown.map(hexOf);
  const at = (s: Slot) => hexes[slots[s]]!;
  const report = shownPairs(shown, slots);

  // The address holds the assignment and the variant, so the preview can be shared.
  useEffect(() => {
    // Written by hand so the palette's commas and semicolons stay readable in the address bar.
    const kept = window.location.search
      .replace(/^\?/, '')
      .split('&')
      .filter((p) => p && !/^(slots|dark)=/.test(p));
    kept.push(`slots=${slotsParam(slots)}`);
    if (dark) kept.push('dark=1');
    window.history.replaceState(null, '', `${window.location.pathname}?${kept.join('&')}`);
  }, [slots, dark]);

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <aside className="flex shrink-0 flex-col gap-4 border-b border-[var(--line)] px-5 py-4 text-[13px] lg:w-[320px] lg:border-r lg:border-b-0">
        <div>
          <h1 className="m-0 text-[17px] font-semibold">Applied preview</h1>
          <p className="m-0 mt-1 text-xs text-[var(--muted)]">
            The page on the right is drawn with the palette. Assign columns to its parts; the
            contrast below is measured on what is drawn.
          </p>
        </div>
        <div className="flex flex-col gap-2" data-testid="slots">
          {SLOTS.map((s) => (
            <label key={s} className="flex items-center justify-between gap-2">
              <span>{SLOT_WORDS[s]}</span>
              <select
                value={slots[s]}
                onChange={(e) => setSlots((x) => ({ ...x, [s]: Number(e.target.value) }))}
                className="field h-8 w-40 text-[13px]"
                aria-label={`Column for ${SLOT_WORDS[s]}`}
                data-testid={`slot-${s}`}
              >
                {names.map((n, i) => (
                  <option key={i} value={i}>
                    {n} {hexes[i]!.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={dark}
            onChange={(e) => setDark(e.target.checked)}
            data-testid="preview-dark"
          />
          <span>Derived dark counterpart</span>
        </label>
        <p className="m-0 text-xs text-[var(--muted)]">
          {dark
            ? 'Each column’s OKLCh lightness is reflected (L′ = 1 − L) with chroma and hue kept, then mapped into sRGB. These are derived values, not the palette and not stored anywhere.'
            : 'The palette as drawn in the Laboratory.'}
        </p>
        <ul className="m-0 flex list-none flex-col gap-1 p-0" data-testid="shown-pairs">
          {report.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-2 text-xs"
              data-testid="shown-pair"
              data-id={r.id}
              data-pass={r.passes}
            >
              <span>{r.label}</span>
              <span className={`font-mono ${r.passes ? '' : 'text-[var(--danger)]'}`}>
                {r.ratio.toFixed(2)}:1 {r.passes ? 'passes' : 'fails'}
              </span>
            </li>
          ))}
        </ul>
        <p className="m-0 text-xs text-[var(--muted)]">
          WCAG 2.1: text needs 4.5:1 (AA, SC 1.4.3); buttons and borders against their surroundings
          need 3:1 (SC 1.4.11). Measured on the sRGB values as displayed.
        </p>
        <div className="flex flex-wrap gap-2">
          {dark ? (
            <Link
              href={labFromHexes(hexes)}
              className="btn h-8 text-[13px]"
              data-testid="dark-to-lab"
            >
              Open the dark set in the Laboratory
            </Link>
          ) : null}
        </div>
      </aside>
      <div
        className="min-h-0 flex-1 overflow-auto"
        style={{ background: at('background'), color: at('text') }}
        data-testid="mockup"
        data-background={at('background')}
        data-text={at('text')}
      >
        <header
          className="flex items-center justify-between px-8 py-4"
          style={{ borderBottom: `1px solid ${at('border')}` }}
        >
          <span className="text-lg font-bold">Northwind Studio</span>
          <nav className="flex gap-5 text-sm">
            {['Work', 'Journal', 'About', 'Contact'].map((t) => (
              <a key={t} href="#" onClick={(e) => e.preventDefault()} style={{ color: at('link') }}>
                {t}
              </a>
            ))}
          </nav>
        </header>
        <section className="px-8 py-14">
          <p className="m-0 text-sm uppercase tracking-[2px]" style={{ color: at('link') }}>
            Spring collection
          </p>
          <h2 className="m-0 mt-2 max-w-[18ch] text-4xl font-bold">
            Furniture made to be lived with
          </h2>
          <p className="m-0 mt-4 max-w-[52ch] text-base">
            Solid oak, hand-finished in our workshop. Every piece ships with its own record of the
            timber, the oil and the maker. Nothing here is a stock photograph of a sofa.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-md px-5 py-2.5 text-sm font-semibold"
              style={{ background: at('primary'), color: at('background') }}
              data-testid="mock-primary"
            >
              Browse the collection
            </button>
            <button
              type="button"
              className="rounded-md px-5 py-2.5 text-sm font-semibold"
              style={{
                border: `2px solid ${at('border')}`,
                color: at('text'),
                background: 'transparent',
              }}
            >
              Visit the workshop
            </button>
          </div>
        </section>
        <section className="grid gap-5 px-8 pb-14 md:grid-cols-3">
          {[
            ['Oak dining table', 'Six seats, 2.1 m, oiled finish.', '£1,480'],
            ['Reading chair', 'Ash frame, wool upholstery.', '£720'],
            ['Wall shelf', 'Three lengths, hidden fixings.', '£140'],
          ].map(([title, text, price]) => (
            <article
              key={title}
              className="rounded-lg p-5"
              style={{ background: at('surface'), border: `1px solid ${at('border')}` }}
              data-testid="mock-card"
            >
              <h3
                className="m-0 text-base font-semibold"
                style={{ color: at('primary') }}
                data-testid="mock-card-title"
              >
                {title}
              </h3>
              <p className="m-0 mt-1 text-sm">{text}</p>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="font-mono">{price}</span>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="underline"
                  style={{ color: at('link') }}
                >
                  Details
                </a>
              </div>
            </article>
          ))}
        </section>
        <section className="px-8 pb-14">
          <form className="flex max-w-md flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
            <label className="flex flex-col gap-1 text-sm">
              Email for the journal
              <input
                className="h-10 rounded-md px-3"
                style={{
                  border: `1px solid ${at('border')}`,
                  background: at('surface'),
                  color: at('text'),
                }}
                placeholder="you@example.com"
              />
            </label>
            <button
              type="submit"
              className="self-start rounded-md px-4 py-2 text-sm font-semibold"
              style={{ background: at('primary'), color: at('background') }}
            >
              Subscribe
            </button>
          </form>
        </section>
        <footer className="px-8 py-6 text-xs" style={{ borderTop: `1px solid ${at('border')}` }}>
          Northwind Studio · a mock page drawn with your palette ·{' '}
          {hexes.map((h) => h.toUpperCase()).join(' · ')}
        </footer>
      </div>
    </div>
  );
}
