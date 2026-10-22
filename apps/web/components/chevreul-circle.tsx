import Link from 'next/link';
import { knowledge } from '@/lib/knowledge';
import { namePoints } from '@/lib/palette-names';
import { labFromConcepts } from '@/lib/lab-links';

/** Six landmarks in the order of paragraph 162, not coordinates inferred from our swatches. */
const ORDER = ['red', 'orange', 'yellow', 'green', 'blue', 'violet'];

export function ChevreulCircle({ compact = false }: { compact?: boolean }) {
  const points = namePoints();
  const ring = ORDER.map((name, i) => ({
    id: `chevreul-${name}`,
    label: name[0]!.toUpperCase() + name.slice(1),
    x: 160 + 105 * Math.cos(((i * 60 - 90) * Math.PI) / 180),
    y: 135 + 100 * Math.sin(((i * 60 - 90) * Math.PI) / 180),
  }));
  const pairs = knowledge()
    .byType('relationship')
    .filter((r) => r.edge === 'complement-of' && r.id.startsWith('chevreul-'));
  const at = (id: string) => ring.find((p) => p.id === id)!;
  return (
    <figure className="m-0 flex flex-col gap-3" data-testid="chevreul-circle">
      <svg
        viewBox="0 0 320 280"
        className={compact ? 'h-[190px] w-full' : 'h-[220px] w-full'}
        role="img"
        aria-label="Chevreul’s six landmarks: red opposite green, orange opposite blue, yellow opposite violet"
      >
        {pairs.map((r) => (
          <line
            key={r.id}
            x1={at(r.from).x}
            y1={at(r.from).y}
            x2={at(r.to).x}
            y2={at(r.to).y}
            stroke="var(--muted)"
          />
        ))}
        {ring.map((p) => (
          <g key={p.id}>
            <circle
              cx={p.x}
              cy={p.y}
              r="19"
              fill={points.find((v) => v.conceptId === p.id)?.hex ?? 'var(--accent-soft)'}
            />
            <text x={p.x} y={p.y + 34} textAnchor="middle" fontSize="13" fill="var(--fg)">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className={compact ? 'sr-only' : 'text-sm leading-relaxed text-[var(--muted)]'}>
        Six landmarks from a 72-scale construction. Lines join Chevreul’s complementary pairs
        (paragraphs 161–162, 170). Swatches are editorial sRGB illustrations.
      </figcaption>
      {!compact ? (
        <ul className="flex flex-col gap-1 text-sm">
          {pairs.map((r) => (
            <li key={r.id}>
              <Link
                className="inline-flex min-h-11 items-center underline underline-offset-2"
                href={labFromConcepts([r.from, r.to])}
              >
                {at(r.from).label} + {at(r.to).label} in the Laboratory
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </figure>
  );
}
