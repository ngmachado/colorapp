'use client';

import { useState } from 'react';
import { DEFAULT_FLAG_DISTANCE, distinctness } from '@/lib/distinct';
import type { Oklch } from '@/lib/palette-param';

const VIEW_WORDS = { normal: 'as drawn', protan: 'protan', deutan: 'deutan', tritan: 'tritan' };

/** Pairwise OKLab distance between the columns as drawn and under each simulation; the weakest pair per view. */
export function DistinctPanel({ palette, names }: { palette: Oklch[]; names: string[] }) {
  const [flag, setFlag] = useState(DEFAULT_FLAG_DISTANCE);
  const views = distinctness(palette);
  return (
    <section
      aria-label="Distinctness under colour-vision simulation"
      className="flex flex-col gap-3 overflow-x-auto border-t border-[var(--line)] px-5 py-3 text-[13px]"
      data-testid="distinct"
    >
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="m-0 text-sm font-semibold">Distinctness</h2>
        <label className="flex items-center gap-2">
          <span className="text-[var(--muted)]">flag pairs closer than</span>
          <input
            type="range"
            min="0.02"
            max="0.3"
            step="0.01"
            value={flag}
            onChange={(e) => setFlag(Number(e.target.value))}
            aria-label="Working distance below which a pair is flagged"
            data-testid="distinct-flag"
          />
          <span className="font-mono" data-testid="distinct-flag-value">
            {flag.toFixed(2)}
          </span>
        </label>
        <span className="text-xs text-[var(--muted)]">
          OKLab distance between every pair, as drawn and after protan, deutan and tritan simulation
          (approximations). The flag is a working setting, not a perceptibility threshold.
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {views.map((v) => (
          <div
            key={v.view}
            className="flex flex-col gap-2 rounded-lg border border-[var(--line)] p-3"
            data-testid="distinct-view"
            data-view={v.view}
            data-weakest={v.weakest.distance.toFixed(3)}
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold">{VIEW_WORDS[v.view]}</span>
              <span className="flex h-5 flex-1 overflow-hidden rounded-sm" aria-hidden="true">
                {v.hexes.map((h, i) => (
                  <span key={i} className="flex-1" style={{ background: h }} />
                ))}
              </span>
            </div>
            <span className="text-xs" data-testid="distinct-weakest">
              weakest: {names[v.weakest.a]} · {names[v.weakest.b]} at{' '}
              <span className="font-mono">{v.weakest.distance.toFixed(3)}</span>
            </span>
            <ul className="m-0 flex list-none flex-col gap-0.5 p-0 font-mono text-[11px]">
              {v.pairs.map((p) => (
                <li
                  key={`${p.a}-${p.b}`}
                  className={p.distance < flag ? 'text-[var(--danger)]' : 'text-[var(--muted)]'}
                  data-testid="distinct-pair"
                  data-flagged={p.distance < flag || undefined}
                >
                  {names[p.a]} · {names[p.b]} {p.distance.toFixed(3)}
                  {p.distance < flag ? ' · below flag' : ''}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
