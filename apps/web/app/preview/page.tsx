import type { Metadata } from 'next';
import Link from 'next/link';
import { Toolbar } from '@/components/toolbar';
import { Applied } from '@/components/preview/applied';
import { oklchOfHex } from '@/lib/contrast';
import { hexesIn } from '@/lib/lab-links';
import { parsePalette, parseStateExtras, stateParams, type Oklch } from '@/lib/palette-param';
import { ROLES } from '@/lib/roles';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Applied preview · Super Colour',
  description:
    'A palette applied to a realistic interface: text, surfaces, buttons, links and borders, with the contrast of every combination shown and a derived dark counterpart.',
};

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function Preview({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const saved = parsePalette(one(sp.palette));
  const hexes = hexesIn(one(sp.hex) ?? '');
  const palette: Oklch[] = saved ?? (hexes.length >= 2 ? hexes.slice(0, 5).map(oklchOfHex) : []);
  if (palette.length < 2) {
    return (
      <>
        <Toolbar middle="Applied preview" />
        <main
          id="main"
          className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 px-5 py-8 sm:px-12"
        >
          <h1 className="m-0 text-[17px] font-semibold">Applied preview</h1>
          <p className="m-0 max-w-[70ch] text-sm text-[var(--muted)]">
            Open this page from the Laboratory’s Preview button, or give it a palette in the
            address:
            <code className="mx-1">/preview?hex=1a1a1a,ffffff,663399</code>.
          </p>
          <Link href="/lab" className="btn self-start">
            Open the Laboratory
          </Link>
        </main>
      </>
    );
  }
  const extras = parseStateExtras(palette.length, {
    locks: one(sp.locks),
    names: one(sp.names),
    records: one(sp.records),
    weights: one(sp.weights),
    pairs: one(sp.pairs),
  });
  const names = palette.map((_, i) => extras.labels?.[i] || ROLES[i]!);
  const structure = one(sp.structure) ?? 'free-form';
  const seed = Number(one(sp.n)) || 0;
  const labHref = `/lab?${stateParams({ palette, structure, seed, locked: extras.locked, labels: extras.labels, weights: extras.weights, sourceIds: extras.sourceIds, pairs: extras.pairs })}`;
  return (
    <>
      <Toolbar middle="Applied preview">
        <Link href={labHref} className="btn" data-testid="preview-to-lab">
          Back to the Laboratory
        </Link>
      </Toolbar>
      <main id="main" className="flex min-h-0 flex-1 flex-col">
        <Applied
          palette={palette}
          names={names}
          pairs={extras.pairs}
          initialSlots={one(sp.slots)}
          initialDark={one(sp.dark) === '1'}
        />
      </main>
    </>
  );
}
