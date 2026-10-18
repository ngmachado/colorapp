import type { Concept, Relationship, Source } from '@sca/knowledge';
import Link from 'next/link';
import { curriculum } from '@/lib/curriculum';
import { knowledge } from '@/lib/knowledge';
import { labFromConcepts } from '@/lib/lab-links';
import { namePoints } from '@/lib/palette-names';
import { documentedSets } from '@/lib/sets';
import { GOETHE_ORDER, WUXING_ORDER as ORDER } from '@/lib/systems';

const FALLBACK: Record<string, string> = {
  'zh-wuxing-wood': '#4a5e2b',
  'zh-wuxing-fire': '#b7282e',
  'zh-wuxing-earth': '#c9a227',
  'zh-wuxing-metal': '#e9e9e9',
  'zh-wuxing-water': '#1a1a1a',
  'goethe-red': '#d40237',
  'goethe-red-yellow': '#fa8927',
  'goethe-yellow': '#fadf27',
  'goethe-green': '#43a84c',
  'goethe-blue': '#0961bb',
  'goethe-blue-red': '#7024ab',
};
const GOETHE_LETTER: Record<string, string> = {
  'goethe-red': 'R',
  'goethe-red-yellow': 'RY',
  'goethe-yellow': 'Y',
  'goethe-green': 'G',
  'goethe-blue': 'B',
  'goethe-blue-red': 'BR',
};

/** Documented systems drawn from their records. Relations are symbolic and cited, not wheel rules. */
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
  const western = curriculum().find((t) => t.id === 'tradition-western');
  const westernSources = (western?.sources ?? [])
    .map((id) => k.record(id))
    .filter((r): r is Source => r?.type === 'source');
  const westernIds = new Set(westernSources.map((s) => s.id));
  const passages = k.byType('cultural-assertion').filter((a) => westernIds.has(a.evidence.source));
  const goetheRing = GOETHE_ORDER.map((id, i) => ({
    id,
    x: 120 + 92 * Math.cos(((i * 60 - 90) * Math.PI) / 180),
    y: 112 + 92 * Math.sin(((i * 60 - 90) * Math.PI) / 180),
  }));
  const gAt = (id: string) => goetheRing.find((p) => p.id === id);
  const goetheRels = k
    .byType('relationship')
    .filter((r) => r.id.startsWith('goethe-')) as Relationship[];
  const goetheLines = goetheRels.filter(
    (r) =>
      (r.edge === 'complement-of' || r.edge === 'characteristic-with') && gAt(r.from) && gAt(r.to),
  );
  const goethePassages = passages.filter((a) => a.id.startsWith('goethe-'));
  const light = (id: string) => (points.find((p) => p.conceptId === id)?.oklab[0] ?? 0) > 0.7;
  const sides = documentedSets().filter((x) => x.id === 'goethe-plus' || x.id === 'goethe-minus');
  const surname = (author: string) => author.split(/[;,]/)[0]!.trim().split(' ').pop()!;

  return (
    <section id="traditions" className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[28px] font-bold tracking-tight">Traditions</h2>
        <p className="max-w-[760px] text-base text-[var(--muted)]">
          Documented systems, each drawn from its records. Relations are symbolic and cited; they
          are not wheel rules.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
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
        <div
          className="flex flex-col gap-3 rounded-[10px] border border-[var(--line)] p-[22px]"
          data-testid="western"
        >
          <Link
            href="/dictionary/goethe-circle"
            aria-label="Goethe's colour circle"
            className="no-underline"
          >
            <svg viewBox="0 0 240 224" className="h-[190px] w-full" aria-hidden="true">
              {goetheLines.map((r) => (
                <line
                  key={r.id}
                  x1={gAt(r.from)!.x}
                  y1={gAt(r.from)!.y}
                  x2={gAt(r.to)!.x}
                  y2={gAt(r.to)!.y}
                  stroke={r.edge === 'complement-of' ? 'var(--fg)' : 'var(--muted)'}
                  strokeWidth={r.edge === 'complement-of' ? 2 : 1.5}
                  strokeDasharray={r.edge === 'complement-of' ? undefined : '4 3'}
                />
              ))}
              {goetheRing.map((p) => (
                <g key={p.id}>
                  <circle cx={p.x} cy={p.y} r="22" fill={fill(p.id)} stroke="var(--line)" />
                  <text
                    x={p.x}
                    y={p.y + 5}
                    textAnchor="middle"
                    fontSize="13"
                    fill={light(p.id) ? '#1a1a1a' : '#fff'}
                  >
                    {GOETHE_LETTER[p.id]}
                  </text>
                </g>
              ))}
            </svg>
          </Link>
          <span className="text-[17px] font-semibold">Goethe&apos;s circle, 1810</span>
          <span className="text-sm leading-[1.45] text-[var(--muted)]">
            Six colours on two sides, meeting in red. Solid: the three complements the eye demands.
            Dashed: the four characteristic chords. {goetheRels.length} relations and{' '}
            {goethePassages.length} passages, each by paragraph.
          </span>
          <span className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
            <Link href="/dictionary/goethe-circle" className="underline underline-offset-2">
              Open the entry
            </Link>
            {sides.map((x) => (
              <Link
                key={x.id}
                href={labFromConcepts(x.conceptIds)}
                className="underline underline-offset-2"
                title={`Open the Laboratory with ${x.label}`}
                data-testid="set-to-lab"
              >
                {x.id === 'goethe-plus' ? 'Plus side' : 'Minus side'} in the lab
              </Link>
            ))}
            {westernSources.map((src) => (
              <Link
                key={src.id}
                href={`/dictionary/source/${src.id}`}
                className="text-[var(--muted)] underline underline-offset-2"
                title={`${src.author}, ${src.title}`}
              >
                {surname(src.author)}
              </Link>
            ))}
          </span>
          <span className="text-xs text-[var(--muted)]" data-testid="western-passages">
            {passages.length} passages quoted by paragraph number. Itten and Albers are cited, not
            reproduced.
          </span>
        </div>
      </div>
    </section>
  );
}
