'use client';

import { colour, convert } from '@sca/colour-engine';
import Link from 'next/link';
import { useState } from 'react';
import type { NamePoint } from '@/lib/nearest';
import type { Oklch } from '@/lib/palette-param';
import { DEFAULT_RELATION_DISTANCE, relationsNear, type Oklab } from '@/lib/relations';
import type { ColourSet } from '@/lib/systems';

const KIND_WORDS = {
  group: 'documented group',
  pair: 'attributed pair',
  layering: 'documented layering',
};

/** Documented pairs, groups and layerings whose members all lie near the palette, by a declared method. */
export function RelationsPanel({
  sets,
  points,
  palette,
  names,
  onLoad,
}: {
  sets: ColourSet[];
  points: NamePoint[];
  palette: Oklch[];
  names: string[];
  onLoad: (set: ColourSet) => void;
}) {
  const [distance, setDistance] = useState(DEFAULT_RELATION_DISTANCE);
  const lab = palette.map((c) => convert(colour('oklch', c), 'oklab').coords as Oklab);
  const matches = relationsNear(sets, points, lab, distance);
  return (
    <section
      aria-label="Documented relations near this palette"
      className="flex flex-col gap-3 border-t border-[var(--line)] px-5 py-3 text-[13px]"
      data-testid="relations"
    >
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="m-0 text-sm font-semibold">Documented relations nearby</h2>
        <label className="flex items-center gap-2">
          <span className="text-[var(--muted)]">within OKLab distance</span>
          <input
            type="range"
            min="0.02"
            max="0.2"
            step="0.01"
            value={distance}
            onChange={(e) => setDistance(Number(e.target.value))}
            aria-label="Largest OKLab distance a member may be from a column"
            data-testid="relations-distance"
          />
          <span className="font-mono" data-testid="relations-distance-value">
            {distance.toFixed(2)}
          </span>
        </label>
        <span className="text-xs" data-testid="relations-count">
          {matches.length} of {sets.length} documented relations
        </span>
      </div>
      <p className="m-0 text-xs text-[var(--muted)]">
        Method: each member of a documented pair, group or layering is represented by the value its
        entry shows; the relation is listed when every member is within the distance of some column,
        each matched to its nearest. Distance is the search criterion only. A palette near a
        documented pair is not that pair, and nothing here infers a cultural link from distance.
      </p>
      {matches.length ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {matches.map((m) => (
            <li
              key={m.set.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-[var(--line)] px-3 py-2"
              data-testid="relation"
              data-set={m.set.id}
            >
              <span className="font-semibold">{m.set.label}</span>
              <span className="text-xs text-[var(--muted)]">
                {KIND_WORDS[m.set.kind ?? 'group']}
                {m.set.source ? ` · source ${m.set.source}` : ''}
              </span>
              <span className="flex flex-wrap gap-x-3 text-xs">
                {m.members.map((x) => (
                  <span key={x.conceptId} className="flex items-center gap-1">
                    <span
                      aria-hidden="true"
                      className="inline-block h-2.5 w-2.5 rounded-full border border-[var(--line)]"
                      style={{ background: x.hex }}
                    />
                    <Link
                      href={`/dictionary/${x.conceptId}`}
                      className="underline underline-offset-2"
                    >
                      {x.label}
                    </Link>
                    <span className="text-[var(--muted)]">
                      ({x.record}) ≈ {names[x.column]} at {x.distance.toFixed(3)}
                    </span>
                  </span>
                ))}
              </span>
              <button
                type="button"
                className="btn h-7 px-2 text-xs"
                onClick={() => onLoad(m.set)}
                data-testid="relation-load"
              >
                Load as columns
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-xs text-[var(--muted)]" data-testid="relations-empty">
          No documented relation has every member within {distance.toFixed(2)} of a column.
        </p>
      )}
    </section>
  );
}
