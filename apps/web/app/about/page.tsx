import { Toolbar } from '@/components/toolbar';
import { knowledge } from '@/lib/knowledge';

export const dynamic = 'force-dynamic';

const TYPE_WORDS: Record<string, string> = {
  source: 'Sources',
  concept: 'Colours',
  name: 'Names',
  representation: 'Values',
  'material-sample': 'Measured samples',
  combination: 'Combinations',
  'cultural-assertion': 'Cultural notes',
  relationship: 'Relations',
};
/** The release inventory: what this build contains and what each status verifies. Never a completeness claim. */
export default function About() {
  const k = knowledge();
  const inv = k.inventory();
  const types = Object.entries(inv.by_type)
    .filter(([, n]) => n > 0)
    .map(([key, n]) => [TYPE_WORDS[key] ?? key, n] as const);
  const list = (title: string, items: readonly (readonly [string, number])[]) => (
    <div className="flex flex-col gap-2">
      <h2 className="text-xs tracking-[1px] text-[var(--muted)] uppercase">{title}</h2>
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-1 text-[15px]">
        {items.map(([label, n]) => (
          <div key={label} className="contents">
            <dt>{label}</dt>
            <dd className="text-right font-mono text-[13px] text-[var(--muted)]">{n}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
  return (
    <>
      <Toolbar />
      <main id="main" className="flex max-w-[1100px] flex-col gap-12 px-5 sm:px-12 pt-10 pb-16">
        <section className="flex flex-col gap-3" data-testid="about">
          <h1 className="text-[28px] font-bold tracking-[-0.3px]">About this release</h1>
          <p className="max-w-[620px] text-[15px] leading-normal text-[var(--muted)]">
            {inv.total} records, built {k.release.built_at.slice(0, 10)}. Every colour in the app
            comes from one of them, and every record names its source. This is an inventory of what
            the build contains, not a claim that any tradition or publication is covered completely.
          </p>
          <p className="font-mono text-xs text-[var(--muted)]">release {inv.content_version}</p>
        </section>

        <section className="grid gap-10 sm:grid-cols-3">{list('In this release', types)}</section>

        <section className="flex max-w-[760px] flex-col gap-3.5 text-[15px] leading-normal">
          <h2 className="text-[22px] font-bold">What a value on screen means</h2>
          <p>
            A documented colour is a word in a source before it is a value. When the app shows one
            on screen it is a modern sRGB reading of that word, and the entry says who read it and
            how. It is a way to see the colour, not a measurement of it.
          </p>
          <p>
            Some sources do not allow their content to be reproduced. Those are cited, and nothing
            else: no value, no passage. Some colours have a documented meaning but no citable value
            yet; their entries say so.
          </p>
          <p>
            Nothing in the app predicts what you will like. A rule generated a palette, or a source
            documented a colour; the app keeps those two sentences apart.
          </p>
        </section>
      </main>
    </>
  );
}
