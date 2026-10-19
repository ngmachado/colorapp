'use client';

import { useState } from 'react';
import type { CurriculumTopic } from '@sca/knowledge';

/** An original demonstration. Both samples always share the same literal sRGB value. */
export function ContextExercise({ topic }: { topic: CurriculumTopic }) {
  const [answer, setAnswer] = useState<string | null>(null);
  const [sameBackground, setSameBackground] = useState(false);
  const sample = '#808080';
  return (
    <section
      aria-labelledby="context-title"
      className="flex max-w-[760px] flex-col gap-4 rounded-lg border border-[var(--line)] p-5"
      data-testid="context-exercise"
    >
      <h3 id="context-title" className="text-xl font-semibold">
        {topic.title}
      </h3>
      <p>{topic.summary}</p>
      <div
        className="grid grid-cols-2 overflow-hidden rounded-lg"
        aria-label="Two samples on different surrounds"
      >
        {['#202020', '#e0e0e0'].map((surround, i) => (
          <div
            key={surround}
            className="flex h-44 items-center justify-center"
            style={{ background: sameBackground ? '#b0b0b0' : surround }}
          >
            <span
              role="img"
              aria-label={`Central sample ${i + 1}`}
              data-testid="context-sample"
              className="h-16 w-16"
              style={{ background: sample }}
            />
          </div>
        ))}
      </div>
      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-2 text-sm">Do the central squares look the same?</legend>
        {['Same', 'Different', 'Not sure'].map((choice) => (
          <button
            key={choice}
            type="button"
            className={`btn ${answer === choice ? 'btn-primary' : ''}`}
            aria-pressed={answer === choice}
            onClick={() => setAnswer(choice)}
          >
            {choice}
          </button>
        ))}
      </fieldset>
      {answer ? (
        <div className="flex flex-col gap-3">
          <p role="status">
            Both central squares are {sample.toUpperCase()}. Whatever difference you saw came from
            the surround, not the squares.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={sameBackground}
              onChange={(e) => setSameBackground(e.target.checked)}
            />
            Compare on the same background
          </label>
          <button
            type="button"
            className="btn self-start"
            onClick={() => {
              setAnswer(null);
              setSameBackground(false);
            }}
          >
            Reset experiment
          </button>
        </div>
      ) : null}
    </section>
  );
}
