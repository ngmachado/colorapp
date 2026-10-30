'use client';

import { colour, contrastRatio, toHex, type ColourValue } from '@sca/colour-engine';
import Link from 'next/link';
import { useState } from 'react';
import { contrastGrade, thresholdReport } from '@/lib/contrast';
import type { Oklch, Pair } from '@/lib/palette-param';

/** Reference inks for the all-pairs table. */
const INKS: { label: string; hex: string }[] = [
  { label: 'white', hex: '#ffffff' },
  { label: 'black', hex: '#000000' },
];
const hexOf = (c: Oklch) => toHex(colour('oklch', c));
/** The displayed sRGB colour of a hex, for measurements that must match what is on screen. */
const srgbOf = (hex: string): ColourValue =>
  colour(
    'srgb',
    [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255) as [number, number, number],
  );
const inkOn = (v: ColourValue) =>
  contrastRatio(colour('srgb', [0.1, 0.1, 0.1]), v) >= contrastRatio(colour('srgb', [1, 1, 1]), v)
    ? '#1a1a1a'
    : '#ffffff';

/**
 * Contrast for the combinations the designer means to use first, each with its sample and every WCAG 2.1
 * threshold spelled out, then the table of every pair. Measured on the sRGB values as displayed.
 */
export function ContrastPanel({
  palette,
  names,
  pairs,
  onPairs,
}: {
  palette: Oklch[];
  names: string[];
  pairs: Pair[];
  onPairs: (pairs: Pair[]) => void;
}) {
  const [fg, setFg] = useState(0);
  const [bg, setBg] = useState(1);
  const hexes = palette.map(hexOf);
  const values = hexes.map(srgbOf);
  const exists = (p: Pair) => pairs.some((q) => q[0] === p[0] && q[1] === p[1]);
  const add = () => {
    const p: Pair = [fg, bg];
    if (fg === bg || exists(p)) return;
    onPairs([...pairs, p]);
  };
  return (
    <div
      className="flex flex-col gap-3 overflow-x-auto border-t border-[var(--line)] px-5 py-3 text-[13px]"
      data-testid="contrast"
    >
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="m-0 text-sm font-semibold">Intended pairs</h2>
        <label className="flex items-center gap-1.5">
          <span className="text-[var(--muted)]">text</span>
          <select
            value={fg}
            onChange={(e) => setFg(Number(e.target.value))}
            className="field h-8 text-[13px]"
            aria-label="Text colour"
            data-testid="pair-fg"
          >
            {names.map((n, i) => (
              <option key={i} value={i}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <span className="text-[var(--muted)]">on</span>
          <select
            value={bg}
            onChange={(e) => setBg(Number(e.target.value))}
            className="field h-8 text-[13px]"
            aria-label="Background colour"
            data-testid="pair-bg"
          >
            {names.map((n, i) => (
              <option key={i} value={i}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={add}
          disabled={fg === bg || exists([fg, bg])}
          className="btn h-8 text-[13px]"
          data-testid="pair-add"
        >
          Add pair
        </button>
        <span className="text-xs text-[var(--muted)]">
          The combinations you mean to use lead this panel and travel with the link.
        </span>
      </div>
      {pairs.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {pairs.map(([f, b]) => {
            const ratio = contrastRatio(values[f]!, values[b]!);
            const report = thresholdReport(ratio);
            return (
              <article
                key={`${f}-${b}`}
                className="overflow-hidden rounded-lg border border-[var(--line)]"
                data-testid="pair"
                data-ratio={ratio.toFixed(2)}
              >
                <div
                  className="px-4 py-3"
                  style={{ background: hexes[b], color: hexes[f] }}
                  aria-hidden="true"
                  data-testid="pair-sample"
                >
                  <div className="text-2xl font-bold">Large text, 24px</div>
                  <p className="m-0 mt-1 text-base">
                    Normal text, 16px. {names[f]} on {names[b]}.
                  </p>
                  <span
                    className="mt-2 inline-block h-5 w-10 rounded-sm border-2"
                    style={{ borderColor: hexes[f] }}
                  />
                </div>
                <div className="flex flex-col gap-1.5 p-3">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <strong className="font-mono text-base" data-testid="pair-ratio">
                      {ratio.toFixed(2)}:1
                    </strong>
                    <span className="text-[var(--muted)]">
                      {names[f]} {hexes[f]!.toUpperCase()} on {names[b]} {hexes[b]!.toUpperCase()}
                    </span>
                  </div>
                  <ul className="m-0 flex list-none flex-col gap-0.5 p-0 text-xs">
                    {report.map((t) => (
                      <li
                        key={`${t.use}-${t.level}`}
                        className="flex justify-between gap-3"
                        data-testid="pair-threshold"
                        data-pass={t.passes}
                      >
                        <span>
                          {t.use}, {t.level} (SC {t.criterion}) · at least {t.minimum}:1
                        </span>
                        <span className={t.passes ? '' : 'text-[var(--danger)]'}>
                          {t.passes ? 'passes' : 'fails'}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn h-7 px-2 text-xs"
                      onClick={() =>
                        onPairs(pairs.map((q) => (q[0] === f && q[1] === b ? [b, f] : q)))
                      }
                      disabled={exists([b, f])}
                      data-testid="pair-swap"
                    >
                      Swap
                    </button>
                    <Link
                      href={`/compare?a=${hexes[f]!.slice(1)}&b=${hexes[b]!.slice(1)}`}
                      className="btn h-7 px-2 text-xs"
                      data-testid="pair-compare"
                    >
                      Compare
                    </Link>
                    <button
                      type="button"
                      className="btn h-7 px-2 text-xs"
                      onClick={() => onPairs(pairs.filter((q) => !(q[0] === f && q[1] === b)))}
                      data-testid="pair-remove"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="m-0 text-xs text-[var(--muted)]" data-testid="pairs-empty">
          No intended pairs yet. Choose the text and background you mean to use and add the pair.
        </p>
      )}
      <h2 className="m-0 mt-1 text-sm font-semibold">Every pair</h2>
      <table className="border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th scope="col" className="pr-2 text-left font-normal text-[var(--muted)]">
              text on →
            </th>
            {hexes.map((h, j) => (
              <th key={j} scope="col" className="font-mono font-normal">
                {h.slice(1).toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            // Measured on the sRGB values as displayed, after gamut mapping, not on the OKLCh intent.
            ...hexes.map((h, i) => ({ label: names[i]!, hex: h, v: values[i]! })),
            ...INKS.map((k) => ({ label: k.label, hex: k.hex, v: srgbOf(k.hex) })),
          ].map((row, i) => (
            <tr key={row.label}>
              <th scope="row" className="pr-2 text-left font-normal">
                <span
                  aria-hidden="true"
                  className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full border border-[var(--line)] align-middle"
                  style={{ background: row.hex }}
                />
                {row.label}
              </th>
              {hexes.map((bgHex, j) => {
                if (i === j)
                  return (
                    <td key={j} className="text-center text-[var(--muted)]">
                      —
                    </td>
                  );
                const bgValue = values[j]!;
                const ratio = contrastRatio(row.v, bgValue);
                const grade = contrastGrade(ratio);
                return (
                  <td
                    key={j}
                    className="rounded-sm px-2 py-1 text-center"
                    style={{ background: bgHex, color: inkOn(bgValue) }}
                    data-testid="contrast-cell"
                    data-grade={grade}
                  >
                    <span className="text-base font-semibold" style={{ color: row.hex }}>
                      Aa
                    </span>{' '}
                    {ratio.toFixed(2)}
                    <span className="block text-[10px] tracking-[0.5px] uppercase">{grade}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <span className="text-xs text-[var(--muted)]">
        WCAG 2.1 contrast ratio between the sRGB values as displayed. Normal text needs 4.5 for AA
        and 7 for AAA; large text (24 px, or 18.67 px bold) and interface parts need 3. A ratio says
        nothing about harmony.
      </span>
    </div>
  );
}
