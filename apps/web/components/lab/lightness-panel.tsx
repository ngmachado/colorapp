'use client';

import { colour, toHex } from '@sca/colour-engine';
import type { Oklch } from '@/lib/palette-param';

/** The palette on OKLCh lightness alone: chroma and hue removed, each column as the grey of its L. */
export function LightnessPanel({ palette, names }: { palette: Oklch[]; names: string[] }) {
  const rows = palette.map((c, i) => ({
    i,
    name: names[i]!,
    L: c[0],
    grey: toHex(colour('oklch', [c[0], 0, 0])),
    hex: toHex(colour('oklch', c)),
  }));
  const sorted = [...rows].sort((a, b) => b.L - a.L);
  return (
    <section
      aria-label="Lightness view"
      className="flex flex-col gap-3 border-t border-[var(--line)] px-5 py-3 text-[13px]"
      data-testid="lightness"
    >
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="m-0 text-sm font-semibold">Lightness</h2>
        <span className="text-xs text-[var(--muted)]">
          OKLCh L only (D65), chroma and hue set to zero. A model estimate of perceived lightness on
          a 0–1 scale: not a luminance (Y) measurement and not a substitute for a contrast ratio.
        </span>
      </div>
      <div
        className="flex h-16 overflow-hidden rounded-md"
        role="img"
        aria-label="Each column as the grey of its lightness"
      >
        {rows.map((r) => (
          <span
            key={r.i}
            className="flex flex-1 items-end justify-center pb-1 font-mono text-[11px]"
            style={{ background: r.grey, color: r.L > 0.6 ? '#1a1a1a' : '#ffffff' }}
            data-testid="lightness-grey"
            data-l={r.L.toFixed(3)}
          >
            {r.L.toFixed(3)}
          </span>
        ))}
      </div>
      <div className="relative mt-1 h-9" data-testid="lightness-ruler">
        <div
          className="absolute inset-x-0 top-3 h-2 rounded-full"
          style={{ background: 'linear-gradient(90deg, #000000, #ffffff)' }}
          aria-hidden="true"
        />
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <span
            key={t}
            className="absolute top-6 -translate-x-1/2 font-mono text-[10px] text-[var(--muted)]"
            style={{ left: `${t * 100}%` }}
            aria-hidden="true"
          >
            {t}
          </span>
        ))}
        {rows.map((r) => (
          <span
            key={r.i}
            className="absolute top-1.5 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-[var(--fg)]"
            style={{ left: `${r.L * 100}%`, background: r.hex }}
            title={`${r.name} · L ${r.L.toFixed(3)}`}
            data-testid="lightness-marker"
          />
        ))}
      </div>
      <ol
        className="m-0 flex list-none flex-wrap gap-x-5 gap-y-1 p-0 text-xs"
        data-testid="lightness-order"
      >
        {sorted.map((r, k) => (
          <li key={r.i} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 rounded-full border border-[var(--line)]"
              style={{ background: r.hex }}
            />
            {r.name} L {r.L.toFixed(3)}
            {k < sorted.length - 1 ? (
              <span className="text-[var(--muted)]">
                {' '}
                · ΔL {(r.L - sorted[k + 1]!.L).toFixed(3)} to next
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
