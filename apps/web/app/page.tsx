import type { Source } from '@sca/knowledge';
import Link from 'next/link';
import { Toolbar } from '@/components/toolbar';
import { knowledge } from '@/lib/knowledge';
import { ACCOUNTS } from '@/lib/accounts';
import { namePoints } from '@/lib/palette-names';

export const dynamic = 'force-dynamic';

const BAND = ['#dbdbdb', '#b0b5b3', '#706f6f', '#ef27a6', '#ff299c'];

const TOOLS = [
  {
    href: '/lab',
    title: 'Laboratory',
    text: 'Create a palette. Set the rule, lock what you know, generate again. Every result is reproducible from its seed.',
    bar: BAND,
  },
  {
    href: '/dictionary',
    title: 'Dictionary',
    text: 'Discover documented colours and their context: combinations, systems and the sources they come from.',
    bar: ['#c9a9b7', '#e5c4cf', '#5b3a4a', '#8a9a5b', '#2b2b2b'],
  },
  {
    href: '/theory',
    title: 'Theory',
    text: 'Learn how colour works: light and perception, colour spaces, design practice and production, with history and culture in context.',
    bar: ['#ef27a6', '#b89a17', '#1e88e5'],
  },
  {
    href: '/library',
    title: 'Library',
    text: 'Return to saved work. Palettes keep their rule, seed, locks and names; colours keep their record.',
    bar: ['#3d2b1f', '#7b4a2d', '#b07c4f', '#e0b98c', '#f3e3cc'],
  },
];

export default function Home() {
  const k = knowledge();
  const inv = k.inventory();
  // Record of the day: the published concept whose turn it is, by day number.
  const published = namePoints();
  const day = Math.floor(Date.now() / 86400000);
  const pick = published.length ? published[day % published.length]! : null;
  const concept = pick ? k.record(pick.conceptId) : undefined;
  const source =
    concept && concept.type !== 'source'
      ? (k.record(concept.evidence.source) as Source | undefined)
      : undefined;

  return (
    <>
      <Toolbar />
      <main id="main" className="flex flex-col">
        <div className="flex flex-col items-center gap-5 px-4 pt-24 pb-14 text-center">
          <h1 className="max-w-[820px] text-[56px] leading-[1.05] font-bold tracking-[-1.5px]">
            Colour theory, with its sources.
          </h1>
          <p className="max-w-[640px] text-[19px] leading-normal text-[var(--muted)]">
            Generate palettes under rules you can name, read every colour in the space it was made
            in, and keep the record of where each documented colour came from.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Link href="/lab" className="btn btn-primary h-12 px-6 text-base">
              Start the Laboratory
            </Link>
            <Link href="/dictionary" className="btn h-12 px-6 text-base">
              Explore the Dictionary
            </Link>
          </div>
        </div>

        <Link
          href="/lab"
          aria-label="Open the Laboratory with this palette"
          className="mx-12 flex h-[120px] overflow-hidden rounded-[10px]"
        >
          {BAND.map((h) => (
            <span key={h} className="flex-1" style={{ background: h }} />
          ))}
        </Link>
        <div className="mx-12 mt-2.5 text-[13px] text-[var(--muted)]">
          The starting palette of the Laboratory · 5 roles · triadic
        </div>

        {pick && concept && concept.type === 'concept' ? (
          <div
            className="mx-12 mt-16 flex flex-wrap items-center gap-6 rounded-[10px] border border-[var(--line)] p-6"
            data-testid="record-of-day"
          >
            <span
              className="h-[88px] w-[88px] shrink-0 rounded-lg"
              style={{ background: pick.hex }}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-xs tracking-[1.2px] text-[var(--muted)] uppercase">
                Record of the day
              </span>
              <span className="text-[22px] font-semibold">{concept.label}</span>
              <span className="text-sm text-[var(--muted)]">
                {source
                  ? `${source.author}, ${source.title}${source.date ? ` (${source.date})` : ''}`
                  : 'source on the entry'}{' '}
                · shown as {pick.hex.toUpperCase()}
              </span>
            </div>
            <Link href={`/dictionary/${concept.id}`} className="btn">
              Open entry
            </Link>
          </div>
        ) : null}

        <div className="mx-12 mt-[72px]">
          <h2 className="mb-5 text-[28px] font-bold tracking-tight">Four places</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TOOLS.map((t) => (
              <Link
                key={t.title}
                href={t.href}
                className="flex flex-col gap-2.5 rounded-[10px] border border-[var(--line)] p-[22px] hover:border-[var(--fg)]"
              >
                <span className="flex h-7 overflow-hidden rounded">
                  {t.bar.map((h, i) => (
                    <span key={i} className="flex-1" style={{ background: h }} />
                  ))}
                </span>
                <span className="text-[17px] font-semibold">{t.title}</span>
                <span className="text-sm leading-[1.45] text-[var(--muted)]">{t.text}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="mx-12 mt-[72px] grid gap-4 sm:grid-cols-3">
          {[
            [
              'Every value says where it comes from',
              'A named colour on screen is a modern reading of a cited source, and the entry says how it was read. Never a bare hex.',
            ],
            [
              'Nothing is called harmonious',
              'A rule generated it; a number measured it. The app keeps those sentences apart.',
            ],
            [
              'Everything reproduces',
              'Same seed, same rule, same content version: the same palette.',
            ],
          ].map(([h, t]) => (
            <div key={h} className="flex flex-col gap-1.5 border-t-2 border-[var(--fg)] p-[22px]">
              <span className="text-[15px] font-semibold">{h}</span>
              <span className="text-sm leading-[1.45] text-[var(--muted)]">{t}</span>
            </div>
          ))}
        </div>

        <footer className="mx-12 mt-20 mb-10 flex flex-wrap gap-12 border-t border-[var(--line)] pt-6 text-[13px] text-[var(--muted)]">
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold text-[var(--fg)]">Places</span>
            <Link href="/lab">Laboratory</Link>
            <Link href="/dictionary">Dictionary</Link>
            <Link href="/theory">Theory</Link>
            <Link href="/library">Library</Link>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold text-[var(--fg)]">Theory</span>
            <Link href="/theory#dimensions">Hue, lightness, chroma</Link>
            <Link href="/theory#structures">Structures</Link>
            <Link href="/theory#foundations">Foundations</Link>
            <Link href="/theory#history">History and culture</Link>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold text-[var(--fg)]">About</span>
            <Link href="/about">About this release</Link>
            {ACCOUNTS ? <Link href="/account">Your data</Link> : null}
          </div>
          <span className="ml-auto self-end font-mono">
            release {inv.content_version.slice(0, 8)} · self-hosted · no tracking
          </span>
        </footer>
      </main>
    </>
  );
}
