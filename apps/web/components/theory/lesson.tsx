import type { CurriculumTopic } from '@sca/knowledge';

/**
 * One lesson: what it is for, a few paragraphs, one thing to try. The limits and the references
 * stay a click away so the page reads as a path through the tools, not a textbook.
 */
export function Lesson({ topic, number }: { topic?: CurriculumTopic; number: number }) {
  const lesson = topic?.lesson;
  if (!topic || !lesson) return null;
  return (
    <section
      id={topic.id}
      className="flex max-w-[760px] scroll-mt-6 flex-col gap-4"
      data-testid="lesson"
    >
      <header className="flex flex-col gap-1.5">
        <p className="text-xs tracking-widest text-[var(--muted)] uppercase">Lesson {number}</p>
        <h2 className="text-[28px] font-bold tracking-tight">{topic.title}</h2>
        <p className="text-base text-[var(--muted)]">{lesson.objective}</p>
      </header>
      <div className="flex flex-col gap-3 text-base leading-relaxed">
        {lesson.paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      <p
        className="rounded-lg border border-[var(--line)] px-4 py-3 text-sm leading-relaxed"
        data-testid="lesson-try"
      >
        <strong>Try it.</strong> {lesson.example}
      </p>
      <details className="text-sm text-[var(--muted)]">
        <summary className="cursor-pointer">Limits and references</summary>
        <p className="mt-3 leading-relaxed">{lesson.limits}</p>
        <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5">
          {lesson.references.map((r) => (
            <li key={r.source}>
              <a href={r.url} className="underline underline-offset-2">
                {r.locator}
              </a>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
