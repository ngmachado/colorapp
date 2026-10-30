import type { Metadata } from 'next';
import Link from 'next/link';
import { Toolbar } from '@/components/toolbar';
import { StatusBadge } from '@/components/badges';
import { Citation } from '@/components/record';
import { CompareForm } from '@/components/compare-form';
import { compareHexes, type ComparedColour } from '@/lib/compare';
import { parseHex } from '@/lib/contrast';
import { knowledge } from '@/lib/knowledge';
import { labFromHexes } from '@/lib/lab-links';
import { namePoints, type NamePoint } from '@/lib/palette-names';
import { APPROXIMATION_WORDS } from '@/lib/exports';
import { groupLabel } from '@/lib/records';
import type { Source } from '@sca/knowledge';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Compare two colours · Super Colour',
  description:
    'Two sRGB colours side by side: values, named difference metrics with their conditions, WCAG contrast, and the records they came from.',
};

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const f = (n: number, d = 3) => n.toFixed(d);

/** The record a side came from, when the address names one whose displayable value is this hex. */
function recordFor(id: string | undefined, hex: string, points: NamePoint[]) {
  if (!id) return null;
  const p = points.find((x) => x.id === id);
  if (!p) return null;
  return { point: p, same: p.hex === hex };
}

function Side({
  which,
  c,
  record,
}: {
  which: 'A' | 'B';
  c: ComparedColour;
  record: ReturnType<typeof recordFor>;
}) {
  const k = knowledge();
  const source = record?.point.provenance
    ? (k.record(record.point.provenance.source) as Source | undefined)
    : undefined;
  return (
    <section className="flex flex-col gap-3" data-testid={`side-${which}`}>
      <div
        className="flex h-28 items-end rounded-lg border border-[var(--line)] p-3 font-mono text-lg"
        style={{ background: c.hex, color: c.oklch[0] > 0.6 ? '#1a1a1a' : '#ffffff' }}
      >
        {which} · {c.hex.toUpperCase()}
      </div>
      <dl className="m-0 grid grid-cols-[72px_1fr] gap-x-3 gap-y-1 font-mono text-xs">
        <dt className="text-[var(--muted)]">sRGB</dt>
        <dd className="m-0">rgb({c.rgb.join(' ')})</dd>
        <dt className="text-[var(--muted)]">OKLCh</dt>
        <dd className="m-0">
          {f(c.oklch[0])} {f(c.oklch[1])} {c.neutral ? 'none' : f(c.oklch[2], 1)}
        </dd>
        <dt className="text-[var(--muted)]">OKLab</dt>
        <dd className="m-0">{c.oklab.map((n) => f(n)).join(' ')}</dd>
        <dt className="text-[var(--muted)]">CIELAB</dt>
        <dd className="m-0">{c.lab.map((n) => f(n, 2)).join(' ')} (D50)</dd>
      </dl>
      <div className="text-sm" data-testid={`provenance-${which}`}>
        {record ? (
          <div className="flex flex-col gap-1">
            <span>
              From record{' '}
              <Link href={`/dictionary/${record.point.conceptId}`} className="underline">
                {record.point.label}
              </Link>{' '}
              <span className="font-mono text-xs">{record.point.id}</span> ·{' '}
              {groupLabel(record.point.group)}
            </span>
            {record.point.provenance ? (
              <span className="text-xs text-[var(--muted)]">
                {APPROXIMATION_WORDS[record.point.provenance.approximation]} · recorded as{' '}
                {record.point.provenance.space}{' '}
                {record.point.provenance.coords.map((n) => +n.toFixed(4)).join(', ')} ·{' '}
                {record.point.provenance.method}
              </span>
            ) : null}
            <span>
              <StatusBadge kind={record.point.status} />
            </span>
            <span className="text-xs">
              <Citation source={source} locator={record.point.provenance?.locator} />
            </span>
            {!record.same ? (
              <span className="text-xs text-[var(--warn)]">
                The value compared here is not the record’s displayable value.
              </span>
            ) : null}
          </div>
        ) : (
          <span className="text-[var(--muted)]">
            User-specified sRGB value · no record, no historical attribution.
          </span>
        )}
      </div>
    </section>
  );
}

export default async function Compare({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const a = parseHex(one(sp.a) ?? '') ?? '#663399';
  const b = parseHex(one(sp.b) ?? '') ?? '#ffffff';
  const cmp = compareHexes(a, b)!;
  const points = namePoints();
  const ra = recordFor(one(sp.ra), a, points);
  const rb = recordFor(one(sp.rb), b, points);
  const swap = `/compare?a=${b.slice(1)}&b=${a.slice(1)}${one(sp.rb) ? `&ra=${one(sp.rb)}` : ''}${one(sp.ra) ? `&rb=${one(sp.ra)}` : ''}`;
  return (
    <>
      <Toolbar middle="Compare two colours">
        <Link href={labFromHexes([a, b])} className="btn">
          Open in Laboratory
        </Link>
        <Link href={`/space?hex=${a.slice(1)},${b.slice(1)}`} className="btn">
          On the map
        </Link>
      </Toolbar>
      <main
        id="main"
        className="mx-auto flex w-full max-w-[1100px] flex-col gap-8 px-5 py-8 sm:px-12"
      >
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <h1 className="m-0 text-[17px] font-semibold">Compare two colours</h1>
          <p className="m-0 max-w-[70ch] text-sm text-[var(--muted)]">
            Both values, two named difference metrics with their conditions, and the WCAG contrast
            between them. A difference is a number under stated conditions, not a judgement.
          </p>
        </div>
        <CompareForm a={a} b={b} swap={swap} />
        <div className="grid gap-8 md:grid-cols-2">
          <Side which="A" c={cmp.a} record={ra} />
          <Side which="B" c={cmp.b} record={rb} />
        </div>
        <section className="flex flex-col gap-3" data-testid="differences">
          <h2 className="m-0 text-base font-semibold">Difference</h2>
          <table className="border-separate border-spacing-y-1 text-sm">
            <tbody>
              {cmp.differences.map((d) => (
                <tr key={d.id} data-testid="difference" data-metric={d.id}>
                  <th scope="row" className="pr-4 text-left font-normal">
                    {d.label}
                  </th>
                  <td className="pr-4 font-mono" data-testid="difference-value">
                    {f(d.value, d.id === 'oklab' ? 4 : 2)}
                  </td>
                  <td className="text-xs text-[var(--muted)]">{d.conditions}</td>
                </tr>
              ))}
              <tr>
                <th scope="row" className="pr-4 text-left font-normal">
                  OKLCh by axis
                </th>
                <td className="pr-4 font-mono">
                  ΔL {cmp.oklchDelta.l >= 0 ? '+' : ''}
                  {f(cmp.oklchDelta.l)} · ΔC {cmp.oklchDelta.c >= 0 ? '+' : ''}
                  {f(cmp.oklchDelta.c)} · Δh{' '}
                  {cmp.oklchDelta.h === null
                    ? 'undefined (a neutral)'
                    : `${f(cmp.oklchDelta.h, 1)}°`}
                </td>
                <td className="text-xs text-[var(--muted)]">
                  B minus A; hue as the smaller arc. Viewing conditions: sRGB as displayed, D65, 2°
                  observer assumed by the conversions.
                </td>
              </tr>
            </tbody>
          </table>
          <p className="m-0 text-xs text-[var(--muted)]">
            No threshold of perceptibility is claimed for either metric: how visible a difference is
            depends on size, surround, adaptation and the display.
          </p>
        </section>
        <section className="flex flex-col gap-3" data-testid="contrast">
          <h2 className="m-0 text-base font-semibold">
            Contrast{' '}
            <span className="font-mono font-normal">{cmp.contrast.ratio.toFixed(2)}:1</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              [cmp.a, cmp.b],
              [cmp.b, cmp.a],
            ].map(([fg, bg]) => (
              <div
                key={fg!.hex}
                className="rounded-lg border border-[var(--line)] p-4"
                style={{ background: bg!.hex, color: fg!.hex }}
                aria-hidden="true"
              >
                <div className="text-2xl font-bold">Large text, 24px</div>
                <p className="m-0 mt-1 text-base">
                  Normal text, 16px. {fg!.hex.toUpperCase()} on {bg!.hex.toUpperCase()}.
                </p>
              </div>
            ))}
          </div>
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0 text-sm">
            {cmp.contrast.thresholds.map((t) => (
              <li
                key={`${t.use}-${t.level}`}
                className="flex gap-3"
                data-testid="threshold"
                data-pass={t.passes}
              >
                <span className="w-80">
                  {t.use}, {t.level} (SC {t.criterion}) · at least {t.minimum}:1
                </span>
                <span className={t.passes ? '' : 'text-[var(--danger)]'}>
                  {t.passes ? 'passes' : 'fails'}
                </span>
              </li>
            ))}
          </ul>
          <p className="m-0 text-xs text-[var(--muted)]">
            WCAG 2.1 ratio between the two sRGB values as displayed; the same in either direction.
          </p>
        </section>
      </main>
    </>
  );
}
