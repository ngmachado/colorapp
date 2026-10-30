import type { Metadata } from 'next';
import Link from 'next/link';
import { SpaceMapLoader } from '@/components/space/space-map-loader';
import { Toolbar } from '@/components/toolbar';
import { knowledge } from '@/lib/knowledge';
import { labFromHexes } from '@/lib/lab-links';
import { namePoints } from '@/lib/palette-names';
import { readState } from '@/lib/space';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Colour space map · Super Colour' };

type Params = Record<string, string | string[] | undefined>;

/**
 * Every documented colour at its OKLab position, with the palette plotted among them. Distance is roughly how
 * different two colours look; it is never a cultural link. Relations are drawn only where a record documents one.
 */
export default async function Space({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const initial = readState(sp);
  const points = namePoints();
  const k = knowledge();
  const withPoint = new Set(points.map((p) => p.conceptId));
  const edges = k
    .byType('relationship')
    .filter((r) => r.edge === 'complement-of' && withPoint.has(r.from) && withPoint.has(r.to))
    .map((r) => ({ from: r.from, to: r.to, label: 'Chevreul’s complementary pairs' }));
  return (
    <>
      <Toolbar current="/space" middle="Colour space map">
        {initial.hexes.length ? (
          <Link href={labFromHexes(initial.hexes)} className="btn">
            Open in Laboratory
          </Link>
        ) : null}
      </Toolbar>
      <main id="main" className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 border-b border-[var(--line)] px-5 py-3 sm:px-12">
          <h1 className="m-0 text-[17px] font-semibold">Colour space map</h1>
          <p className="m-0 max-w-[70ch] text-sm text-[var(--muted)]">
            Every documented colour at its position in OKLab: lightness up, red–green across,
            yellow–blue in depth. Distance here is roughly how different two colours look. A small
            distance is not a cultural link.
          </p>
          <span className="ml-auto rounded-full border border-[var(--line)] px-2 py-1 font-mono text-[11px] tracking-[1px] text-[var(--muted)] uppercase">
            {points.length} documented · sRGB solid
          </span>
        </div>
        <SpaceMapLoader points={points} edges={edges} initial={initial} />
      </main>
    </>
  );
}
