import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { colour, contrastRatio, convert, type Triple } from '@sca/colour-engine';
import type { Source } from '@sca/knowledge';
import { Toolbar } from '@/components/toolbar';
import { ColourInput, CopyValue } from '@/components/colour-input';
import { ColourVariations } from '@/components/colour-variations';
import { ColourAccessibility } from '@/components/colour-accessibility';
import { StatusBadge } from '@/components/badges';
import { Citation } from '@/components/record';
import { inspectHex } from '@/lib/colour-inspector';
import { namePoints } from '@/lib/palette-names';
import { knowledge } from '@/lib/knowledge';
import { labFromHexes } from '@/lib/lab-links';

type Props = { params: Promise<{ hex: string }> };
export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const input = inspectHex((await params).hex);
  if (!input) return { title: 'Colour not found', robots: { index: false, follow: false } };
  const title = `${input.hex.toUpperCase()} colour inspector`;
  const description =
    'sRGB conversions, contrast, colour variations and nearby documented records. No historical attribution is inferred.';
  return {
    title,
    description,
    alternates: { canonical: `/colour/${input.hex.slice(1)}` },
    openGraph: { title, description },
    twitter: { title, description },
  };
}
export default async function Inspector({ params }: Props) {
  const { hex: raw } = await params;
  const input = inspectHex(raw);
  if (!input) notFound();
  const { hex, value, values } = input;
  if (raw !== hex.slice(1)) permanentRedirect(`/colour/${hex.slice(1)}`);
  const lab = convert(value, 'oklab').coords as Triple;
  const nearby = namePoints()
    .map((p) => ({ ...p, distance: Math.hypot(...p.oklab.map((n, i) => n - lab[i]!)) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5);
  const k = knowledge();
  const ink =
    contrastRatio(value, colour('srgb', [0, 0, 0])) >=
    contrastRatio(value, colour('srgb', [1, 1, 1]))
      ? '#000000'
      : '#ffffff';
  return (
    <>
      <Toolbar middle="Colour inspector">
        <Link href={labFromHexes([hex])} className="btn">
          Open in Laboratory
        </Link>
        <Link href={`/space?hex=${hex.slice(1)}`} className="btn">
          On the map
        </Link>
      </Toolbar>
      <main id="main">
        <header
          className="flex min-h-[220px] flex-col justify-end gap-3 px-5 py-9 sm:px-12"
          style={{ background: hex, color: ink }}
        >
          <p className="text-sm">Colour inspector</p>
          <h1 className="font-mono text-5xl font-medium">{hex.toUpperCase()}</h1>
          <p className="text-sm">User-specified sRGB colour · no historical attribution</p>
        </header>
        <div className="mx-auto flex max-w-[1100px] flex-col gap-12 px-5 py-10 sm:px-12">
          <ColourInput key={hex} initial={hex} />
          <nav aria-label="Inspector sections" className="flex flex-wrap gap-4 text-sm">
            {['values', 'variations', 'contrast', 'nearby'].map((id) => (
              <a
                key={id}
                href={`#${id}`}
                className="inline-flex min-h-11 items-center capitalize underline"
              >
                {id}
              </a>
            ))}
          </nav>
          <section id="values" className="flex flex-col gap-4">
            <h2 className="text-2xl font-semibold">Values</h2>
            <p className="text-sm text-[var(--muted)]">
              Inside sRGB by definition. Conversions retain the supplied sRGB colour; no
              output-device profile or physical colour match is implied. Displayed coordinates are
              rounded.
            </p>
            <div className="divide-y divide-[var(--line)] rounded-lg border border-[var(--line)] px-4">
              {values.map((v) => (
                <div
                  key={v.label}
                  className="grid gap-2 py-4 sm:grid-cols-[110px_1fr]"
                  data-testid="conversion"
                >
                  <h3 className="font-semibold">{v.label}</h3>
                  <div className="flex flex-col gap-2">
                    <CopyValue label={v.label} text={v.text} />
                    <p className="text-xs text-[var(--muted)]">{v.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section id="variations" className="flex flex-col gap-4">
            <h2 className="text-2xl font-semibold">Variations</h2>
            <ColourVariations value={value} />
          </section>
          <section id="contrast" className="flex flex-col gap-4">
            <h2 className="text-2xl font-semibold">Contrast and colour vision</h2>
            <ColourAccessibility value={value} />
          </section>
          <section id="nearby" className="flex flex-col gap-4">
            <h2 className="text-2xl font-semibold">Nearby documented records</h2>
            <p className="text-sm text-[var(--muted)]">
              Euclidean distance in OKLab (L on a 0–1 scale), calculated against stored
              representations. This is a search within our small collection, not an identification,
              perceptibility threshold or cultural relationship. Some records are unreviewed; their
              screen values may be approximations.
            </p>
            <div className="flex flex-col gap-3">
              {nearby.map((p) => {
                const rep = k.record(p.id);
                const source =
                  rep && rep.type !== 'source'
                    ? (k.record(rep.evidence.source) as Source)
                    : undefined;
                return (
                  <article
                    key={p.id}
                    className="flex flex-wrap gap-4 rounded-lg border border-[var(--line)] p-4"
                    data-testid="nearby-record"
                  >
                    <span
                      className="h-16 w-16 shrink-0 rounded-md border border-[var(--line)]"
                      style={{ background: p.hex }}
                      aria-hidden="true"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <Link href={`/dictionary/${p.conceptId}`} className="font-semibold underline">
                        {p.label}
                      </Link>
                      <span className="font-mono text-xs">
                        {p.hex.toUpperCase()} · OKLab distance {p.distance.toFixed(5)}
                      </span>
                      <div>
                        <StatusBadge kind={p.status} />
                        {p.queue ? <span className="ml-2 text-xs">Research queue</span> : null}
                      </div>
                      <div className="text-sm">
                        <Citation
                          source={source}
                          locator={rep && rep.type !== 'source' ? rep.evidence.locator : undefined}
                        />
                      </div>
                      <Link
                        href={labFromHexes([hex, p.hex])}
                        className="inline-flex min-h-11 items-center text-sm underline"
                      >
                        Compare display values in Laboratory
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
