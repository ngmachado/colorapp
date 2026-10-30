import type { Metadata } from 'next';
import Link from 'next/link';
import type { Concept } from '@sca/knowledge';
import { Toolbar } from '@/components/toolbar';
import { MunsellForm } from '@/components/munsell-form';
import { parseHex } from '@/lib/contrast';
import { knowledge } from '@/lib/knowledge';
import {
  CONDITIONS,
  munsellAvailable,
  munsellForNotation,
  munsellInterpolate,
  munsellNearest,
  type MunsellHit,
} from '@/lib/munsell';
import { labFromHexes } from '@/lib/lab-links';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Munsell reference · Super Colour',
  description:
    'Nearest tabulated samples of the 1943 Munsell renotation for an sRGB colour, with the conditions of the comparison, and the tabulated value for a notation.',
};

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Documented records whose source assigns this exact notation (the JIS Z 8102 entries carry one). */
function recordsWithNotation(notation: string) {
  const k = knowledge();
  return (k.byType('concept') as Concept[]).filter((c) => c.tags?.munsell === notation);
}

function Sample({ h, rank }: { h: MunsellHit; rank?: number }) {
  const cites = recordsWithNotation(h.notation);
  return (
    <article
      className="flex flex-wrap items-start gap-4 rounded-lg border border-[var(--line)] p-4"
      data-testid="munsell-sample"
      data-notation={h.notation}
    >
      <span
        className="h-16 w-16 shrink-0 rounded-md border border-[var(--line)]"
        style={{ background: h.hex }}
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
        <span className="font-mono text-lg font-semibold">
          {rank ? `${rank}. ` : ''}
          {h.notation}
        </span>
        {Number.isFinite(h.deltaE) ? (
          <span className="font-mono text-xs" data-testid="munsell-distance">
            ΔE*ab {h.deltaE.toFixed(2)} ({CONDITIONS.metric})
          </span>
        ) : null}
        <span className="font-mono text-xs text-[var(--muted)]">
          published x {h.x.toFixed(4)} y {h.y.toFixed(4)} Y {h.Y.toFixed(2)} ·{' '}
          {CONDITIONS.illuminant}
        </span>
        <span className="font-mono text-xs text-[var(--muted)]">
          sRGB approximation {h.hex.toUpperCase()}
          {h.mapped ? ' · outside sRGB, gamut-mapped' : ''} · after Bradford adaptation to D65
        </span>
        {cites.length ? (
          <span className="text-xs" data-testid="munsell-cited">
            Assigned this notation by their source:{' '}
            {cites.map((c, i) => (
              <span key={c.id}>
                {i ? ', ' : ''}
                <Link href={`/dictionary/${c.id}`} className="underline">
                  {c.label}
                </Link>
              </span>
            ))}
          </span>
        ) : null}
        <Link href={labFromHexes([h.hex])} className="text-xs underline">
          Open the approximation in the Laboratory
        </Link>
      </div>
    </article>
  );
}

export default async function Munsell({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const hex = parseHex(one(sp.hex) ?? '');
  const notationText = one(sp.notation) ?? '';
  const available = munsellAvailable();
  const nearest = hex && available ? munsellNearest(hex, 5) : null;
  const byNotation = notationText && available ? munsellForNotation(notationText) : null;
  // A notation that is not a tabulated sample (a half step, or a neutral, which the table omits) is interpolated.
  const interpolated =
    notationText && available && !byNotation?.exact ? munsellInterpolate(notationText) : null;
  return (
    <>
      <Toolbar middle="Munsell reference" />
      <main
        id="main"
        className="mx-auto flex w-full max-w-[1100px] flex-col gap-8 px-5 py-8 sm:px-12"
      >
        <div className="flex flex-col gap-2">
          <h1 className="m-0 text-[17px] font-semibold">Munsell reference</h1>
          <p className="m-0 max-w-[75ch] text-sm text-[var(--muted)]">
            A lookup in the 1943 Munsell renotation table, as transcribed by RIT’s Munsell Color
            Science Laboratory. For a colour it lists the nearest tabulated samples and the distance
            to each; for a notation it gives the tabulated value, or the nearest tabulated sample
            and a linear interpolation between neighbouring samples when the notation is not
            tabulated. A distance carries no claim about how visible the difference is. These are
            renotation values, not measurements of a Munsell Book of Color.
          </p>
        </div>
        {available ? null : (
          <p
            className="m-0 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4 text-sm"
            role="status"
            data-testid="munsell-missing"
          >
            The renotation table is not installed on this server. RIT’s website terms allow one
            downloaded copy for personal, noncommercial use and do not permit redistribution, so the
            file is not shipped with the app. A developer fetches a copy with
            <code className="mx-1">node scripts/fetch-munsell.mjs</code>; a public deployment needs
            RIT’s permission first. See content/reference/munsell/README.md.
          </p>
        )}
        <MunsellForm hex={hex ?? ''} notation={notationText} />
        <section
          className="flex flex-col gap-2 rounded-lg border border-[var(--line)] p-4 text-xs"
          data-testid="munsell-conditions"
        >
          <h2 className="m-0 text-sm font-semibold">Conditions</h2>
          <dl className="m-0 grid gap-x-4 gap-y-1 sm:grid-cols-[140px_1fr]">
            {Object.entries(CONDITIONS).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-[var(--muted)] capitalize">{k}</dt>
                <dd className="m-0">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="m-0 text-[var(--muted)]">
            The table holds chromatic samples only; a neutral input finds its nearest low-chroma
            samples. Source and terms: content/reference/munsell/README.md.
          </p>
        </section>
        {hex && nearest ? (
          <section className="flex flex-col gap-3" data-testid="munsell-nearest">
            <h2 className="m-0 flex items-center gap-3 text-base font-semibold">
              <span
                className="inline-block h-6 w-6 rounded border border-[var(--line)]"
                style={{ background: hex }}
                aria-hidden="true"
              />
              Nearest tabulated samples to {hex.toUpperCase()}
            </h2>
            <div className="flex flex-col gap-3">
              {nearest.map((h, i) => (
                <Sample key={h.notation} h={h} rank={i + 1} />
              ))}
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <Link href={`/colour/${hex.slice(1)}`} className="underline">
                Inspect {hex.toUpperCase()}
              </Link>
              <Link
                href={labFromHexes([hex, ...nearest.slice(0, 2).map((h) => h.hex)])}
                className="underline"
              >
                Compare with the two nearest in the Laboratory
              </Link>
            </div>
          </section>
        ) : null}
        {notationText && available ? (
          <section className="flex flex-col gap-3" data-testid="munsell-notation">
            {byNotation || interpolated ? (
              <>
                <h2 className="m-0 text-base font-semibold">
                  {byNotation?.exact
                    ? `Tabulated value of ${byNotation.asked}`
                    : byNotation
                      ? `${byNotation.asked} is not tabulated; nearest tabulated sample`
                      : `${interpolated!.asked} is a neutral; the table holds chromatic samples only`}
                </h2>
                {byNotation && !byNotation.exact ? (
                  <p className="m-0 text-xs text-[var(--muted)]">
                    Chosen by nearest value, then nearest hue page on the 100-step circle, then
                    nearest chroma. Hue pages are tabulated at 2.5-step intervals, values at whole
                    steps, chromas at even steps.
                  </p>
                ) : null}
                {byNotation ? <Sample h={byNotation.hit} /> : null}
                {interpolated ? (
                  <div
                    className="flex flex-wrap items-start gap-4 rounded-lg border border-[var(--line)] p-4 text-sm"
                    data-testid="munsell-interpolated"
                    data-hex={interpolated.hex}
                  >
                    <span
                      className="h-16 w-16 shrink-0 rounded-md border border-[var(--line)]"
                      style={{ background: interpolated.hex }}
                      aria-hidden="true"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="font-semibold">
                        {interpolated.asked.startsWith('N ')
                          ? `Neutral ${interpolated.asked}: illuminant C chromaticity at the value's luminance`
                          : `Interpolated at ${interpolated.asked}`}
                      </span>
                      <span className="font-mono text-xs text-[var(--muted)]">
                        sRGB approximation {interpolated.hex.toUpperCase()}
                        {interpolated.mapped ? ' · outside sRGB, gamut-mapped' : ''}
                        {interpolated.beyond ? ' · chroma beyond the table, clamped' : ''}
                      </span>
                      <span className="text-xs text-[var(--muted)]">
                        Linear between tabulated chromas on each neighbouring hue page, then between
                        the pages, then between whole values; Y from the value polynomial. Common
                        renotation practice, not a published conversion.
                      </span>
                      <Link href={labFromHexes([interpolated.hex])} className="text-xs underline">
                        Open the approximation in the Laboratory
                      </Link>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="m-0 text-sm text-[var(--danger)]" role="alert">
                Could not read “{notationText}” as a Munsell notation such as 5R 4/14.
              </p>
            )}
          </section>
        ) : null}
      </main>
    </>
  );
}
