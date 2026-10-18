import { Structure } from '@sca/generator';
import { Playground, type StructureTopic } from '@/components/theory/playground';
import { Terms } from '@/components/theory/terms';
import { Traditions } from '@/components/theory/traditions';
import { Toolbar } from '@/components/toolbar';
import { oklchOfHex } from '@/lib/contrast';
import { curriculum } from '@/lib/curriculum';
import { namePoints } from '@/lib/palette-names';

export const dynamic = 'force-dynamic';

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function Theory({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const hex = one(sp.hex)?.replace('#', '') ?? '';
  const initial = /^[0-9a-f]{6}$/i.test(hex) ? oklchOfHex(`#${hex}`) : undefined;
  const topics: StructureTopic[] = curriculum()
    .filter((t) => t.kind === 'structure' && t.rule)
    .map((t) => ({
      id: t.id,
      structure: t.id.replace('structure-', '') as Structure,
      title: t.title,
      summary: t.summary,
      description: t.rule!.description,
      defaults: t.rule!.defaults,
    }))
    .filter((t) => Structure.safeParse(t.structure).success && t.structure !== 'free-form');
  return (
    <>
      <Toolbar current="/theory">
        <a href="#dimensions" className="text-[13px] text-[var(--muted)]">
          Dimensions
        </a>
        <a href="#structures" className="text-[13px] text-[var(--muted)]">
          Structures
        </a>
        <a href="#traditions" className="text-[13px] text-[var(--muted)]">
          Traditions
        </a>
        <a href="#terms" className="text-[13px] text-[var(--muted)]">
          Terms
        </a>
      </Toolbar>
      <main id="main" className="flex flex-col gap-16 px-5 sm:px-12 pt-10 pb-16">
        <Playground points={namePoints()} topics={topics} initial={initial} />
        <Traditions />
        <Terms />
      </main>
    </>
  );
}
