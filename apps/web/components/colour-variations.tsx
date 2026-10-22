import Link from 'next/link';
import type { ColourValue } from '@sca/colour-engine';
import { colourSteps } from '@/lib/colour-inspector';
import { labFromHexes } from '@/lib/lab-links';

export function ColourVariations({
  value,
  chroma = true,
}: {
  value: ColourValue;
  chroma?: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      {(['lightness', ...(chroma ? ['chroma'] : [])] as ('lightness' | 'chroma')[]).map(
        (dimension) => (
          <div
            key={dimension}
            className="flex flex-col gap-2"
            data-testid={dimension === 'lightness' ? 'entry-scale' : 'chroma-scale'}
          >
            <h3 className="text-base font-semibold capitalize">{dimension} variations</h3>
            <p className="text-sm text-[var(--muted)]">
              {dimension === 'lightness'
                ? 'OKLCh lightness stepped; requested chroma and hue held constant.'
                : 'OKLCh chroma stepped; requested lightness and hue held constant. Achromatic inputs use 0° as an explicit starting hue.'}
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-9">
              {colourSteps(value, dimension).map((s) => (
                <Link
                  key={s.step}
                  href={labFromHexes([s.hex])}
                  className="flex flex-col gap-1 text-xs"
                  aria-label={`${dimension} ${s.step.toFixed(3)}, ${s.hex}${s.mapped ? ', gamut mapped' : ''}`}
                >
                  <span
                    className="h-11 rounded-md border border-[var(--line)]"
                    style={{ background: s.hex }}
                  />
                  <span className="font-mono">
                    {dimension === 'lightness' ? 'L' : 'C'} {s.step.toFixed(3)}
                  </span>
                  <span className="text-[var(--muted)]">{s.mapped ? 'Mapped' : 'In gamut'}</span>
                </Link>
              ))}
            </div>
          </div>
        ),
      )}
      <p className="text-xs text-[var(--muted)]">
        Out-of-sRGB steps use CSS gamut mapping, which can change the requested coordinates. Each
        opens its rendered sRGB value in the Laboratory.
      </p>
    </div>
  );
}
