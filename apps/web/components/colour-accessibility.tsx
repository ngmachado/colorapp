import {
  colour,
  contrastRatio,
  simulateCvd,
  toHex,
  type ColourValue,
  type CvdType,
} from '@sca/colour-engine';

export function ColourAccessibility({ value }: { value: ColourValue }) {
  const hex = toHex(value);
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {(['#ffffff', '#000000'] as const).map((background) => {
          const ratio = contrastRatio(
            value,
            colour('srgb', background === '#ffffff' ? [1, 1, 1] : [0, 0, 0]),
          );
          return (
            <div
              key={background}
              className="overflow-hidden rounded-lg border border-[var(--line)]"
              data-testid="contrast-sample"
            >
              <div
                data-testid="contrast-preview"
                className="p-5"
                style={{ background, color: hex }}
                aria-hidden="true"
              >
                <div className="text-2xl font-bold">Sample headline</div>
                <p className="mt-2 text-base">
                  A paragraph in {hex.toUpperCase()} on {background.toUpperCase()}.
                </p>
              </div>
              <div className="flex flex-col gap-1 p-4 text-sm">
                <strong>
                  {hex.toUpperCase()} on {background.toUpperCase()} · {ratio.toFixed(2)}:1
                </strong>
                <span>
                  Normal text: {ratio >= 4.5 ? 'passes AA' : 'fails AA'} ·{' '}
                  {ratio >= 7 ? 'passes AAA' : 'fails AAA'}
                </span>
                <span>
                  Large text: {ratio >= 3 ? 'passes AA' : 'fails AA'} ·{' '}
                  {ratio >= 4.5 ? 'passes AAA' : 'fails AAA'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-sm text-[var(--muted)]">
        WCAG 2 contrast, calculated before rounding. Large text is at least 24 CSS px regular or
        approximately 18.67 CSS px bold. These results cover these opaque text/background pairs, not
        whole-interface accessibility.
      </p>
      <div className="flex flex-col gap-3" data-testid="cvd">
        <h3 className="text-base font-semibold">Colour-vision simulation</h3>
        <p className="text-sm text-[var(--muted)]">
          Machado, Oliveira and Fernandes 2009, severity 1. An approximation, not a prediction of an
          individual’s vision.
        </p>
        <div className="flex flex-wrap gap-3">
          {(['protan', 'deutan', 'tritan'] as CvdType[]).map((type) => {
            const sim = toHex(simulateCvd(value, type));
            return (
              <div
                key={type}
                className="flex items-center gap-2 rounded-md border border-[var(--line)] p-3"
              >
                <span
                  className="h-10 w-10 rounded"
                  style={{ background: sim }}
                  aria-hidden="true"
                />
                <span className="text-sm">
                  {type}
                  <br />
                  <code>{sim.toUpperCase()}</code>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
