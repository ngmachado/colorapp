'use client';

import { colour, convert, inGamut, toHex, type SpaceId } from '@sca/colour-engine';
import { run, type Structure } from '@sca/generator';
import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { Wheel, type OverlayPoint, inBand, OVERLAY_BAND } from '@/components/wheel';
import { nearestPoint, type NamePoint } from '@/lib/nearest';
import { groupLabel } from '@/lib/records';
import type { Oklch } from '@/lib/palette-param';

/** Rule parameters in words: degrees for angles, a ceiling for chroma. */
function describeDefaults(d: Record<string, number>): string {
  return Object.entries(d)
    .map(([k, n]) =>
      k === 'neutral_chroma_max'
        ? `neutral C ≤ ${n}`
        : `${k.replace('_deg', '').replace('hue_tolerance', 'tolerance').replace('_', ' ')} ${n}°`,
    )
    .join(' · ');
}

export interface StructureTopic {
  id: string;
  structure: Structure;
  title: string;
  summary: string;
  description: string;
  defaults: Record<string, number>;
}

const SPACES: SpaceId[] = ['oklch', 'lch', 'hsl', 'srgb', 'lab'];
const ROLES = ['dominant', 'secondary', 'accent', 'support'] as const;
const hexAt = (l: number, c: number, h: number) => toHex(colour('oklch', [l, c, h]));

/** Three sliders with locks, a readout in any space, and the structure table drawn from the current hue. */
export function Playground({
  points,
  topics,
  initial,
  between,
}: {
  points: NamePoint[];
  topics: StructureTopic[];
  /** Starting colour, for a round trip from a Laboratory column. */
  initial?: Oklch;
  between?: ReactNode;
}) {
  const [v, setV] = useState<[number, number, number]>(initial ?? [0.64, 0.253, 349]);
  const [locks, setLocks] = useState([false, false, true]);
  const [space, setSpace] = useState<SpaceId>('oklch');
  const [seed, setSeed] = useState(7);
  const [shownRule, setShownRule] = useState<Structure>('triadic');
  const [ghost, setGhost] = useState(false);
  const [tradition, setTradition] = useState('none');
  const [l, c, h] = v;
  const traditions = [...new Set(points.map((p) => p.group))].sort();
  const value = colour('oklch', v, { kind: 'manual' });
  const hex = toHex(value);
  const near = nearestPoint(points, convert(value, 'oklab').coords as [number, number, number]);
  const strips = useMemo(
    () => ({
      l: `linear-gradient(to right, ${Array.from({ length: 9 }, (_, i) => hexAt(i / 8, c, h)).join(', ')})`,
      c: `linear-gradient(to right, ${Array.from({ length: 9 }, (_, i) => hexAt(l, (i / 8) * 0.37, h)).join(', ')})`,
      h: `linear-gradient(to right, ${Array.from({ length: 13 }, (_, i) => hexAt(l, c, (i * 360) / 12)).join(', ')})`,
    }),
    [l, c, h],
  );
  const read = convert(value, space);
  const rows = useMemo(
    () =>
      topics.map((t) => {
        const safe = (s: Structure) => {
          // Neutral plus accent needs near-zero chroma for its neutrals, so its chroma floor is 0.
          const common = {
            seed,
            count: 1,
            roles: [...ROLES.slice(0, t.structure === 'tetradic' ? 4 : 3)],
            baseHue: h,
            bounds: {
              lightness: { min: 0.45, max: 0.8 },
              chroma: { min: s === 'neutral-accent' ? 0 : 0.08, max: 0.2 },
            },
          };
          try {
            return (
              run({ ...common, structure: s }).candidates[0]?.colours.map((x) => ({
                hex: toHex(colour('oklch', x.oklch)),
                oklch: x.oklch as Oklch,
              })) ?? []
            );
          } catch {
            return [];
          }
        };
        return { ...t, withRule: safe(t.structure), free: safe('free-form') };
      }),
    [topics, seed, h],
  );
  const setPoints: OverlayPoint[] = useMemo(
    () =>
      tradition === 'none'
        ? []
        : points
            .filter((p) => tradition === 'all' || p.group === tradition)
            .map((p) => {
              const o = convert(colour('oklab', p.oklab), 'oklch').coords;
              return {
                id: p.id,
                oklch: [o[0], o[1], Number.isNaN(o[2]) ? 0 : o[2]] as Oklch,
                hex: p.hex,
                label: p.label,
                href: `/dictionary/${p.conceptId}`,
              };
            }),
    [points, tradition],
  );
  const overlayPoints = setPoints.filter((p) => inBand(p, l));
  const set = (i: number, n: number) => {
    if (locks[i]) return;
    setV((p) => p.map((x, j) => (j === i ? n : x)) as [number, number, number]);
  };
  const labels = ['Lightness', 'Chroma', 'Hue'] as const;
  const ranges = [
    { min: 0, max: 1, step: 0.001, unit: 'L, 0 to 1' },
    { min: 0, max: 0.37, step: 0.001, unit: 'C, 0 to 0.37' },
    { min: 0, max: 360, step: 0.5, unit: 'h, degrees' },
  ];

  return (
    <>
      <section id="dimensions" className="flex flex-col gap-[18px]">
        <div className="flex flex-col gap-1.5">
          <h3 className="text-[28px] font-bold tracking-tight">
            Explore hue, lightness and chroma
          </h3>
          <p className="max-w-[720px] text-base text-[var(--muted)]">
            Lock two, move one. The strip under each slider shows what that control alone changes.
            Controls are OKLCh; the readout can be any space.
          </p>
        </div>
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="flex flex-col gap-5" data-testid="dimensions">
            {labels.map((name, i) => (
              <div key={name} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-sm">
                  <label htmlFor={`dim-${i}`}>
                    {name} <span className="text-[var(--muted)]">{ranges[i]!.unit}</span>
                  </label>
                  <span className="flex items-center gap-3">
                    <span className="font-mono" data-testid={`value-${i}`}>
                      {v[i]!.toFixed(i === 2 ? 1 : 3)}
                    </span>
                    <label className="flex items-center gap-1.5 text-[13px] text-[var(--muted)]">
                      <input
                        type="checkbox"
                        checked={locks[i]}
                        onChange={(e) =>
                          setLocks((x) => x.map((y, j) => (j === i ? e.target.checked : y)))
                        }
                      />{' '}
                      lock
                    </label>
                  </span>
                </div>
                <input
                  id={`dim-${i}`}
                  type="range"
                  className="strip"
                  min={ranges[i]!.min}
                  max={ranges[i]!.max}
                  step={ranges[i]!.step}
                  value={v[i]}
                  disabled={locks[i]}
                  onChange={(e) => set(i, Number(e.target.value))}
                  style={{
                    ['--strip' as string]: i === 0 ? strips.l : i === 1 ? strips.c : strips.h,
                  }}
                  // React reports the gradient custom property as a mismatch although the server and client strings are byte-identical.
                  suppressHydrationWarning
                />
              </div>
            ))}
            <p className="text-[13px] text-[var(--muted)]">
              <strong className="text-[var(--fg)]">Keep apart:</strong> lightness is not brightness;
              chroma is not saturation; hue is undefined for greys.
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            <span
              className="h-[140px] rounded-[10px]"
              style={{ background: hex }}
              data-testid="swatch"
            />
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--muted)]">read in</span>
              <select
                value={space}
                onChange={(e) => setSpace(e.target.value as SpaceId)}
                className="field h-7 text-[13px]"
                aria-label="Read in space"
              >
                {SPACES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div
              className="flex flex-col gap-0.5 font-mono text-[13px] text-[var(--muted)]"
              data-testid="readout"
            >
              <span>
                {space} {read.coords.map((n) => (Number.isNaN(n) ? '—' : n.toFixed(3))).join(' ')}
              </span>
              <span>
                hex {hex.slice(1).toUpperCase()} <span>derived</span>
              </span>
            </div>
            {!inGamut(value, 'srgb') ? (
              <p className="text-sm text-[var(--muted)]" role="status">
                Outside sRGB: the displayed swatch is gamut-mapped. Its displayed colour differs
                from the working coordinates.
              </p>
            ) : null}
            {near ? (
              <Link
                href={`/dictionary/${near.conceptId}`}
                className="text-[13px] underline underline-offset-2"
              >
                nearest documented: {near.label} · distance {near.distance.toFixed(2)}
              </Link>
            ) : null}
            <Link href={`/lab?hex=${hex.slice(1)}`} className="btn mt-1 self-start">
              Open in the Laboratory
            </Link>
          </div>
        </div>
      </section>

      {between}

      <section id="structures" className="flex flex-col gap-[18px]">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[28px] font-bold tracking-tight">Palette recipes on the wheel</h2>
          <p className="max-w-[760px] text-base text-[var(--muted)]">
            Each rule applied from the hue above, next to a plain random draw with the same seed and
            bounds. The wheel shows the chosen rule at the lightness above, with the sRGB edge drawn
            as it is. These are app-defined generation recipes, not scientific laws of harmony.
          </p>
        </div>
        <div className="grid items-start gap-8 lg:grid-cols-[440px_minmax(0,1fr)]">
          <div className="flex flex-col gap-3" data-testid="theory-wheel">
            <Wheel
              size={420}
              dots={(rows.find((r) => r.structure === shownRule)?.withRule ?? []).map((x, i) => ({
                oklch: x.oklch,
                hex: x.hex,
                label: ROLES[i] ?? `colour ${i + 1}`,
              }))}
              slice={l}
              structure={shownRule}
              onRotate={locks[2] ? undefined : (d) => set(2, (h + d + 360) % 360)}
              overlay={overlayPoints}
              ghost={ghost}
              maxChroma={0.3}
            />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--muted)]">
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block h-3 w-3 rounded-full bg-[var(--fg)]"
                />
                the rule at equal OKLCh angles
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block h-3 w-3 rounded-full border border-dashed border-[var(--fg)]"
                />
                the same rule at equal HSL angles
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block h-3 w-3 rounded-full border border-[var(--line)] bg-[#ececec]"
                />
                beyond sRGB at this lightness
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <label className="flex items-center gap-1.5">
                Documented
                <select
                  value={tradition}
                  onChange={(e) => setTradition(e.target.value)}
                  className="field h-7 text-xs"
                  data-testid="theory-wheel-tradition"
                >
                  <option value="none">none</option>
                  <option value="all">all ({points.length})</option>
                  {traditions.map((tr) => (
                    <option key={tr} value={tr}>
                      {groupLabel(tr)} ({points.filter((p) => p.group === tr).length})
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => setGhost((g) => !g)}
                aria-pressed={ghost}
                className={`btn h-7 text-xs ${ghost ? 'btn-primary' : ''}`}
                data-testid="theory-ghost-button"
              >
                HSL ghost
              </button>
              <span className="text-[var(--muted)]">
                {locks[2]
                  ? 'Unlock hue above to turn the set by dragging.'
                  : 'Drag a dot to turn the set.'}
                {tradition !== 'none'
                  ? ` ${overlayPoints.length} of ${setPoints.length} documented points lie within L ±${OVERLAY_BAND} of this slice; click one to open its entry.`
                  : ''}
              </span>
            </div>
            {ghost ? (
              <p className="m-0 max-w-[420px] text-[13px] leading-[1.5]" data-testid="ghost-note">
                The dashed rings are the same rule measured on the HSL wheel, shown where OKLCh puts
                those colours. The spaces serve different purposes: HSL follows sRGB geometry; OKLCh
                aims at more perceptually useful spacing. Equal angles do not guarantee equal visual
                differences.
              </p>
            ) : null}
          </div>
          <div
            className="grid items-center gap-x-5 gap-y-2.5 text-sm sm:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)_110px]"
            data-testid="structures"
          >
            <span className="text-xs tracking-[1px] text-[var(--muted)] uppercase">Rule</span>
            <span className="text-xs tracking-[1px] text-[var(--muted)] uppercase">
              With the rule
            </span>
            <span className="text-xs tracking-[1px] text-[var(--muted)] uppercase">
              Free-form, same seed
            </span>
            <span />
            {rows.map((r) => (
              <div key={r.id} className="contents" data-testid="structure-row">
                <span>
                  {r.title}{' '}
                  <span className="font-mono text-xs text-[var(--muted)]">
                    {describeDefaults(r.defaults)}
                  </span>
                </span>
                <span className="flex h-14 overflow-hidden rounded-lg" title={r.description}>
                  {r.withRule.map((x, i) => (
                    <span key={i} className="flex-1" style={{ background: x.hex }} />
                  ))}
                </span>
                <span className="flex h-14 overflow-hidden rounded-lg opacity-85">
                  {r.free.map((x, i) => (
                    <span key={i} className="flex-1" style={{ background: x.hex }} />
                  ))}
                </span>
                <span className="flex items-center gap-2 text-[13px]">
                  <button
                    type="button"
                    onClick={() => setShownRule(r.structure)}
                    aria-pressed={shownRule === r.structure}
                    className={`btn h-7 text-xs ${shownRule === r.structure ? 'btn-primary' : ''}`}
                    data-testid="show-rule"
                  >
                    {shownRule === r.structure ? 'on wheel' : 'wheel'}
                  </button>
                  <Link
                    href={`/lab?hex=${hex.slice(1)}&structure=${r.structure}`}
                    className="underline underline-offset-2"
                  >
                    lab
                  </Link>
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[13px] text-[var(--muted)]">
          <label className="flex items-center gap-2">
            Seed{' '}
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value) || 0)}
              className="field h-7 w-16 font-mono text-[13px]"
            />
          </label>
          <span>Lightness 0.45 to 0.8 · chroma 0.08 to 0.2 · hue space OKLCh</span>
        </div>
      </section>
    </>
  );
}
