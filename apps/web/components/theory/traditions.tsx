import type { Concept, Relationship } from '@sca/knowledge';
import Link from 'next/link';
import { knowledge } from '@/lib/knowledge';
import { namePoints } from '@/lib/palette-names';
import { WUXING_ORDER as ORDER } from '@/lib/systems';

const FALLBACK: Record<string, string> = {
  'zh-wuxing-wood': '#4a5e2b',
  'zh-wuxing-fire': '#b7282e',
  'zh-wuxing-earth': '#c9a227',
  'zh-wuxing-metal': '#e9e9e9',
  'zh-wuxing-water': '#1a1a1a',
};

/** Documented systems drawn from their records. Relations are historical claims, cited; not wheel rules. */
export function Traditions() {
  const k = knowledge();
  const points = namePoints();
  const label = (id: string) => (k.record(id) as Concept | undefined)?.label ?? id;
  const short = (id: string) => label(id).split(' (')[0]!;
  const rels = k
    .byType('relationship')
    .filter((r) => r.id.startsWith('zh-wuxing')) as Relationship[];
  const ring = ORDER.map((id, i) => ({
    id,
    x: 120 + 92 * Math.cos(((i * 72 - 90) * Math.PI) / 180),
    y: 112 + 92 * Math.sin(((i * 72 - 90) * Math.PI) / 180),
  }));
  const at = (id: string) => ring.find((p) => p.id === id);
  const cycle = rels.filter((r) => at(r.from) && at(r.to));
  const fill = (id: string) =>
    points.find((p) => p.conceptId === id)?.hex ?? FALLBACK[id] ?? '#888';
  const combos = k.byType('combination');
  const names = k.byType('name').filter((n) => n.language === 'ja');

  return (
    <section id="traditions" className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[28px] font-bold tracking-tight">Historical and cultural records</h2>
        <p className="max-w-[760px] text-base text-[var(--muted)]">
          Two documented systems, each drawn from its records and cited by passage. Their relations
          are cultural claims, not wheel rules; display colours are modern readings.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Link
          href="/dictionary/zh-wuxing"
          className="flex flex-col gap-3 rounded-[10px] border border-[var(--line)] p-[22px] no-underline"
          data-testid="wuxing"
        >
          <svg viewBox="0 0 240 224" className="h-[190px] w-full" aria-hidden="true">
            {cycle.map((r) => (
              <line
                key={r.id}
                x1={at(r.from)!.x}
                y1={at(r.from)!.y}
                x2={at(r.to)!.x}
                y2={at(r.to)!.y}
                stroke={r.edge === 'generates' ? 'var(--fg)' : 'var(--muted)'}
                strokeWidth={r.edge === 'generates' ? 2 : 1.5}
                strokeDasharray={r.edge === 'generates' ? undefined : '4 3'}
              />
            ))}
            {ring.map((p) => (
              <g key={p.id}>
                <circle cx={p.x} cy={p.y} r="22" fill={fill(p.id)} stroke="var(--line)" />
                <text
                  x={p.x}
                  y={p.y + 5}
                  textAnchor="middle"
                  fontSize="13"
                  fill={
                    p.id === 'zh-wuxing-metal' || p.id === 'zh-wuxing-earth' ? '#1a1a1a' : '#fff'
                  }
                >
                  {short(p.id).slice(0, 1)}
                </text>
              </g>
            ))}
          </svg>
          <span className="text-[17px] font-semibold">Five Phases 五行</span>
          <span className="text-sm leading-[1.45] text-[var(--muted)]">
            Five colours, two cycles, seasons and directions. Solid generates, dashed controls.{' '}
            {rels.length} relations, each with its passage.
          </span>
          <span className="text-sm underline underline-offset-2">Open the entry</span>
        </Link>
        <div
          className="flex flex-col gap-3 rounded-[10px] border border-[var(--line)] p-[22px]"
          data-testid="japanese"
        >
          <div className="flex h-[190px] flex-col justify-center gap-2">
            {combos.slice(0, 3).map((c) => (
              <Link
                key={c.id}
                href={`/dictionary/combination/${c.id}`}
                aria-label={c.label}
                className="flex h-11 overflow-hidden rounded-md"
              >
                {c.items.map((it, i) => {
                  const hex = points.find((p) => p.conceptId === it.concept)?.hex;
                  return (
                    <span
                      key={i}
                      lang="ja"
                      className="flex items-center justify-center border border-[var(--line)] text-sm text-[var(--muted)]"
                      style={{ flex: i === 0 ? 1 : 3, background: hex ?? 'var(--accent-soft)' }}
                    >
                      {hex ? '' : short(it.concept)}
                    </span>
                  );
                })}
              </Link>
            ))}
            {combos.length === 0 ? (
              <span className="text-sm text-[var(--muted)]">No layering in this release.</span>
            ) : null}
          </div>
          <span className="text-[17px] font-semibold">Japanese colour 日本の伝統色</span>
          <span className="text-sm leading-[1.45] text-[var(--muted)]">
            Three kinds of record kept apart: an authored dictionary (bibliographic only), a
            vocabulary of {names.length} names, and a layering practice with order and season.
          </span>
          <span className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
            {names.slice(0, 12).map((n) => (
              <Link
                key={n.id}
                href={`/dictionary/${n.concept}`}
                lang="ja"
                className="underline underline-offset-2"
              >
                {n.script}
              </Link>
            ))}
          </span>
        </div>
      </div>
    </section>
  );
}
