'use client';

import type { Oklch } from '@/lib/palette-param';
import { nearestStep, scaleOf } from '@/lib/scales';

/** Each column extended to a 50–950 scale by even OKLCh lightness steps at its own chroma and hue. */
export function ScalesPanel({ palette, names }: { palette: Oklch[]; names: string[] }) {
  return (
    <section
      aria-label="Tonal scales"
      className="flex flex-col gap-3 overflow-x-auto border-t border-[var(--line)] px-5 py-3 text-[13px]"
      data-testid="scales"
    >
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="m-0 text-sm font-semibold">Scales</h2>
        <span className="text-xs text-[var(--muted)]">
          Eleven steps, 50 to 950, at even OKLCh lightness (L = 1 − 0.0875 × step/100) with the
          column’s chroma and hue. A dot marks a step outside sRGB at that chroma, shown
          gamut-mapped. The ring marks the step nearest the column itself. Exported with the
          Tailwind and tokens formats.
        </span>
      </div>
      <table className="border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th scope="col" className="pr-2 text-left font-normal text-[var(--muted)]">
              step →
            </th>
            {scaleOf(palette[0]!).map((s) => (
              <th key={s.step} scope="col" className="font-mono font-normal text-[var(--muted)]">
                {s.step}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {palette.map((c, i) => {
            const own = nearestStep(c);
            return (
              <tr key={i} data-testid="scale-row">
                <th scope="row" className="pr-2 text-left font-normal">
                  {names[i]}
                </th>
                {scaleOf(c).map((s) => (
                  <td key={s.step} className="p-0">
                    <div
                      className="relative h-9 w-12 rounded-sm"
                      style={{
                        background: s.hex,
                        outline: s.step === own ? '2px solid var(--fg)' : undefined,
                        outlineOffset: 1,
                      }}
                      title={`${names[i]} ${s.step} · ${s.hex.toUpperCase()} · L ${s.l.toFixed(3)}${s.mapped ? ' · outside sRGB, mapped' : ''}`}
                      data-testid="scale-stop"
                      data-step={s.step}
                      data-hex={s.hex}
                      data-mapped={s.mapped || undefined}
                      data-own={s.step === own || undefined}
                    >
                      {s.mapped ? (
                        <span
                          aria-hidden="true"
                          className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-[var(--surface)]"
                        />
                      ) : null}
                    </div>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
