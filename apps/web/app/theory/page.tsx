import { Structure } from '@sca/generator';
import { Playground, type StructureTopic } from '@/components/theory/playground';
import { Lesson } from '@/components/theory/lesson';
import { ContextExercise } from '@/components/theory/context-exercise';
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
  const content = curriculum();
  // Lessons in the order the content file gives them; a missing one leaves a gap, not a crash.
  const lessons = content.filter((t) => t.kind === 'lesson');
  const exercise = content.find((t) => t.id === 'exercise-one-colour-two-surroundings');
  const topics: StructureTopic[] = content
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
      <Toolbar current="/theory" />
      <main id="main" className="flex flex-col gap-16 px-5 sm:px-12 pt-10 pb-16">
        <header className="flex max-w-[960px] flex-col gap-4">
          <h1 className="text-[34px] font-bold tracking-tight">Understanding colour</h1>
          <p className="max-w-[760px] text-lg text-[var(--muted)]">
            Six short lessons with the tools between them. Start at the top or jump to one.
          </p>
          <nav
            aria-label="Learning path"
            className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-[var(--muted)]"
          >
            {lessons.map((t, i) => (
              <a key={t.id} href={`#${t.id}`} className="underline underline-offset-2">
                {i + 1}. {t.title}
              </a>
            ))}
            <a href="#traditions" className="underline underline-offset-2">
              Records
            </a>
            <a href="#terms" className="underline underline-offset-2">
              Vocabulary
            </a>
          </nav>
        </header>
        <Lesson topic={lessons[0]} number={1} />
        <Lesson topic={lessons[1]} number={2} />
        <Playground
          points={namePoints()}
          topics={topics}
          initial={initial}
          between={
            <>
              <Lesson topic={lessons[2]} number={3} />
              {exercise ? <ContextExercise topic={exercise} /> : null}
              <Lesson topic={lessons[3]} number={4} />
            </>
          }
        />
        <Lesson topic={lessons[4]} number={5} />
        <Lesson topic={lessons[5]} number={6} />
        <Traditions />
        <Terms />
      </main>
    </>
  );
}
