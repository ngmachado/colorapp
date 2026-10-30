import Link from 'next/link';
import { knowledge } from '@/lib/knowledge';
import { namePoints } from '@/lib/palette-names';
import { labFromConcepts } from '@/lib/lab-links';

/**
 * A documented system drawn as a ring: its member colours in the order its source gives, and the pairs
 * its source names as lines between them. Nothing here is computed from the swatches; the lines are the
 * relationship records, and the swatches are the editorial illustrations each record cites.
 */
export interface SystemFigure {
  id: string;
  /** Member concepts on the ring, clockwise from the top. */
  ring: { id: string; label: string }[];
  /** Members drawn beside the ring rather than on it (Kandinsky's white and black). */
  poles?: { id: string; label: string; side: 'left' | 'right' }[];
  /** Relationship edges drawn as lines, with their stroke. */
  edges: { edge: string; dash?: string; word: string }[];
  aria: string;
  caption: string;
}

export const FIGURES: Record<string, SystemFigure> = {
  'chevreul-circle': {
    id: 'chevreul-circle',
    // Six landmarks in the order of paragraph 162, not coordinates inferred from our swatches.
    ring: ['red', 'orange', 'yellow', 'green', 'blue', 'violet'].map((n) => ({
      id: `chevreul-${n}`,
      label: n[0]!.toUpperCase() + n.slice(1),
    })),
    edges: [{ edge: 'complement-of', word: 'complements' }],
    aria: 'Chevreul’s six landmarks: red opposite green, orange opposite blue, yellow opposite violet',
    caption:
      'Six landmarks from a 72-scale construction. Lines join Chevreul’s complementary pairs (paragraphs 161–162, 170). Swatches are editorial sRGB illustrations.',
  },
  'munsell-system': {
    id: 'munsell-system',
    // The ten middle hues in the order of paragraph 31, round the equator of his sphere.
    ring: [
      ['r', 'R'],
      ['yr', 'YR'],
      ['y', 'Y'],
      ['gy', 'GY'],
      ['g', 'G'],
      ['bg', 'BG'],
      ['b', 'B'],
      ['pb', 'PB'],
      ['p', 'P'],
      ['rp', 'RP'],
    ].map(([key, label]) => ({ id: `munsell-${key}`, label: label! })),
    edges: [{ edge: 'complement-of', word: 'opposites' }],
    aria: 'Munsell’s ten middle hues round the equator: red opposite blue-green, yellow opposite purple-blue, green opposite red-purple, blue opposite yellow-red, purple opposite green-yellow',
    caption:
      'Ten middle hues written by initials (paragraph 31). Lines join Munsell’s five pairs of opposites, which unite in neutral grey (paragraph 62). Swatches are editorial sRGB illustrations.',
  },
  'kandinsky-antitheses': {
    id: 'kandinsky-antitheses',
    // Figure III: yellow at the top, blue at the bottom, orange and green above red and violet.
    ring: [
      { id: 'kandinsky-yellow', label: 'Yellow' },
      { id: 'kandinsky-green', label: 'Green' },
      { id: 'kandinsky-violet', label: 'Violet' },
      { id: 'kandinsky-blue', label: 'Blue' },
      { id: 'kandinsky-red', label: 'Red' },
      { id: 'kandinsky-orange', label: 'Orange' },
    ],
    poles: [
      { id: 'kandinsky-white', label: 'White', side: 'left' },
      { id: 'kandinsky-black', label: 'Black', side: 'right' },
    ],
    edges: [{ edge: 'antithesis-of', word: 'antithesis' }],
    aria: 'Kandinsky’s circle of antitheses: yellow against blue, red against green, orange against violet, with white and black as the two poles',
    caption:
      'The circle of figure III between its two poles. Lines join Kandinsky’s four antitheses (figures I and II). Swatches are editorial sRGB illustrations.',
  },
};

export function SystemCircle({ system, compact = false }: { system: string; compact?: boolean }) {
  const fig = FIGURES[system];
  if (!fig) return null;
  const points = namePoints();
  const n = fig.ring.length;
  const ring = fig.ring.map((m, i) => ({
    ...m,
    x: 160 + 105 * Math.cos(((i * (360 / n) - 90) * Math.PI) / 180),
    y: 135 + 100 * Math.sin(((i * (360 / n) - 90) * Math.PI) / 180),
  }));
  const poles = (fig.poles ?? []).map((p) => ({ ...p, x: p.side === 'left' ? 28 : 292, y: 135 }));
  const all = [...ring, ...poles];
  const at = (id: string) => all.find((p) => p.id === id);
  const members = new Set(all.map((p) => p.id));
  const rels = knowledge()
    .byType('relationship')
    .filter((r) => members.has(r.from) && members.has(r.to));
  const lines = fig.edges.flatMap((e) =>
    rels.filter((r) => r.edge === e.edge).map((r) => ({ r, dash: e.dash, word: e.word })),
  );
  const fill = (id: string) => points.find((v) => v.conceptId === id)?.hex ?? 'var(--accent-soft)';
  return (
    <figure className="m-0 flex flex-col gap-3" data-testid={fig.id}>
      <svg
        viewBox="0 0 320 280"
        className={compact ? 'h-[190px] w-full' : 'h-[220px] w-full'}
        role="img"
        aria-label={fig.aria}
      >
        {lines.map(({ r, dash }) => (
          <line
            key={r.id}
            x1={at(r.from)!.x}
            y1={at(r.from)!.y}
            x2={at(r.to)!.x}
            y2={at(r.to)!.y}
            stroke="var(--muted)"
            strokeDasharray={dash}
          />
        ))}
        {all.map((p) => (
          <g key={p.id}>
            <circle cx={p.x} cy={p.y} r="19" fill={fill(p.id)} stroke="var(--line)" />
            <text x={p.x} y={p.y + 34} textAnchor="middle" fontSize="13" fill="var(--fg)">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className={compact ? 'sr-only' : 'text-sm leading-relaxed text-[var(--muted)]'}>
        {fig.caption}
      </figcaption>
      {!compact ? (
        <ul className="flex flex-col gap-1 text-sm">
          {lines.map(({ r, word }) => (
            <li key={r.id}>
              <Link
                className="inline-flex min-h-11 items-center underline underline-offset-2"
                href={labFromConcepts([r.from, r.to])}
              >
                {at(r.from)!.label} + {at(r.to)!.label}, {word}, in the Laboratory
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </figure>
  );
}
