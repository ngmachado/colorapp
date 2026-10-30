'use client';

import { colour, toHex } from '@sca/colour-engine';
import type { Oklch } from '@/lib/palette-param';

/** Every colour on every other colour's ground, to look at adjacency. The values do not change; the appearance may. */
export function NeighbourPanel({ palette, names }: { palette: Oklch[]; names: string[] }) {
  const hexes = palette.map((c) => toHex(colour('oklch', c)));
  return (
    <section
      aria-label="Neighbour view"
      className="flex flex-col gap-3 overflow-x-auto border-t border-[var(--line)] px-5 py-3 text-[13px]"
      data-testid="neighbours"
    >
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="m-0 text-sm font-semibold">Neighbours</h2>
        <span className="text-xs text-[var(--muted)]">
          Each colour as a sample on each other colour as ground. What shifts between cells is
          simultaneous contrast on your display; the stored coordinates in each cell are the same.
        </span>
      </div>
      <table className="border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th scope="col" className="pr-2 text-left font-normal text-[var(--muted)]">
              sample on →
            </th>
            {hexes.map((h, j) => (
              <th key={j} scope="col" className="font-normal">
                {names[j]}
                <span className="block font-mono text-[10px] text-[var(--muted)]">
                  {h.slice(1).toUpperCase()}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hexes.map((sample, i) => (
            <tr key={i}>
              <th scope="row" className="pr-2 text-left font-normal">
                {names[i]}
                <span className="block font-mono text-[10px] text-[var(--muted)]">
                  {sample.slice(1).toUpperCase()}
                </span>
              </th>
              {hexes.map((ground, j) => (
                <td
                  key={j}
                  className="p-0"
                  data-testid="neighbour-cell"
                  data-sample={sample}
                  data-ground={ground}
                >
                  <div
                    className="flex h-16 w-24 items-center justify-center rounded-sm"
                    style={{ background: ground }}
                    role="img"
                    aria-label={`${names[i]} ${sample} on ${names[j]} ${ground}`}
                  >
                    <span className="h-8 w-10 rounded-sm" style={{ background: sample }} />
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
