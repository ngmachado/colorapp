'use client';

import { useMemo, useState } from 'react';
import type { NamePoint } from '@/lib/nearest';
import {
  HUE_RULES,
  HUE_RULE_LABELS,
  type HueRule,
  type InspectorSpace,
  type SpacePoint,
} from '@/lib/colour-inspector';
import { SpaceMapLoader } from './space/space-map-loader';
import type { SpaceEdge } from './space/space-map';

/**
 * The colour space map inside the inspector. The reader chooses what to plot beside the inspected colour:
 * its lightness steps, its chroma steps, and any set of hue rules; the map receives the result as its
 * palette at run time. Every plotted point is a construction by a stated rule, never a documented relation.
 */
export function InspectorMap({
  space,
  points,
  edges,
}: {
  space: InspectorSpace;
  points: NamePoint[];
  edges: SpaceEdge[];
}) {
  const [rules, setRules] = useState<HueRule[]>(space.neutral ? [] : ['complementary']);
  const [showL, setShowL] = useState(false);
  const [showC, setShowC] = useState(false);
  const toggle = (r: HueRule) =>
    setRules((rs) =>
      rs.includes(r) ? rs.filter((x) => x !== r) : HUE_RULES.filter((x) => x === r || rs.includes(x)),
    );
  // A turn two rules share, such as 180° in complementary and tetradic, is plotted once.
  const turns = useMemo(() => {
    const seen = new Map<string, SpacePoint>();
    for (const r of rules) for (const p of space.rules[r]) if (!seen.has(p.label)) seen.set(p.label, p);
    return [...seen.values()];
  }, [space, rules]);
  const hexes = useMemo(
    () => [
      space.base.hex,
      ...turns.map((p) => p.hex),
      ...(showL ? space.lightness.map((p) => p.hex) : []),
      ...(showC ? space.chroma.map((p) => p.hex) : []),
    ],
    [space, turns, showL, showC],
  );
  // The map takes its first state once; later changes arrive through `hexes`.
  const [initial] = useState(() => ({
    hexes,
    set: 'all',
    band: false,
    l: space.base.L,
    focus: null,
  }));
  return (
    <div className="flex flex-col gap-4" data-testid="inspector-map">
      <div className="flex flex-col gap-3 rounded-lg border border-[var(--line)] p-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
          <span className="font-mono text-[11px] font-medium tracking-[1px] text-[var(--muted)] uppercase">
            Plot
          </span>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showL}
              onChange={(e) => setShowL(e.target.checked)}
              data-testid="show-lightness"
            />
            Lightness steps <span className="font-mono text-xs text-[var(--muted)]">9</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showC}
              onChange={(e) => setShowC(e.target.checked)}
              data-testid="show-chroma"
            />
            Chroma steps <span className="font-mono text-xs text-[var(--muted)]">9</span>
          </label>
        </div>
        {space.neutral ? (
          <p className="m-0 text-xs text-[var(--muted)]" data-testid="hue-neutral">
            An achromatic colour has no hue to turn, so no hue construction is offered.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Hue constructions">
            <span className="mr-2 font-mono text-[11px] font-medium tracking-[1px] text-[var(--muted)] uppercase">
              Hue
            </span>
            <button
              type="button"
              aria-pressed={rules.length === 0}
              onClick={() => setRules([])}
              className={chipClass(rules.length === 0)}
              data-testid="hue-rule"
              data-rule="none"
            >
              None
            </button>
            {HUE_RULES.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={rules.includes(r)}
                onClick={() => toggle(r)}
                className={chipClass(rules.includes(r))}
                data-testid="hue-rule"
                data-rule={r}
              >
                {HUE_RULE_LABELS[r].name}
                <span className="font-mono text-[11px] opacity-70">{HUE_RULE_LABELS[r].angles}</span>
              </button>
            ))}
          </div>
        )}
        {turns.length ? (
          <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-1 p-0" data-testid="hue-turns">
            {turns.map((p) => (
              <li key={p.label} className="flex items-center gap-2 text-xs" data-testid="hue-point">
                <span
                  className="h-4 w-4 rounded-sm border border-[var(--line)]"
                  style={{ background: p.hex }}
                />
                <span className="font-mono">{p.hex.toUpperCase()}</span>
                <span className="text-[var(--muted)]">
                  {p.label} · h {p.requested.h.toFixed(1)}° ·{' '}
                  {p.mapped ? 'mapped' : 'in sRGB as requested'}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="m-0 text-xs text-[var(--muted)]">
          Hue turned in OKLCh with the inspected lightness and chroma held, using the Laboratory’s
          angles; steps as in the strips below. Geometric constructions, not documented pairs. The
          small points are the five nearby records listed below; a line is drawn only where a
          record documents a relation between two of them.
        </p>
      </div>
      <div className="flex min-h-[560px] flex-col overflow-hidden rounded-lg border border-[var(--line)]">
        <SpaceMapLoader
          points={points}
          edges={edges}
          initial={initial}
          hexes={hexes}
          syncUrl={false}
          maxPalette={40}
          panel={false}
        />
      </div>
    </div>
  );
}

const chipClass = (on: boolean) =>
  `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${on ? 'border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]' : 'border-[var(--line)] bg-[var(--surface)]'}`;
