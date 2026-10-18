import type { ColourValue } from '@sca/colour-engine';
import { display, formatCoords } from '@/lib/display';
import { StatusBadge } from './badges';

/**
 * A colour swatch that only accepts a ColourValue. The fill is a display approximation;
 * an out-of-gamut value shows its mapped colour and says so.
 */
export function Swatch({
  value,
  label,
  size = 'md',
}: {
  value: ColourValue;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const d = display(value);
  const px = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-24 w-24' : 'h-14 w-14';
  const text =
    `${label ?? ''} ${value.space} ${formatCoords(value)}${d.mapped ? ', gamut-mapped for display' : ''}`.trim();
  return (
    <figure className="inline-flex flex-col items-start gap-1" data-mapped={d.mapped || undefined}>
      <div
        role="img"
        aria-label={text}
        className={`${px} rounded-sm border border-[var(--line)]`}
        style={{ background: d.hex }}
      />
      {d.mapped ? <StatusBadge kind="display-approximation">Gamut-mapped</StatusBadge> : null}
      {label ? <figcaption className="text-xs text-[var(--muted)]">{label}</figcaption> : null}
    </figure>
  );
}

/** The value as the user should read it: space and coordinates first, hex second and marked as derived. */
export function ColourValueDisplay({ value }: { value: ColourValue }) {
  const d = display(value);
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0.5 text-sm">
      <dt className="text-[var(--muted)]">{value.space}</dt>
      <dd className="font-mono">{formatCoords(value)}</dd>
      <dt className="text-[var(--muted)]">white</dt>
      <dd className="font-mono">{value.white}</dd>
      {value.origin.space !== value.space ? (
        <>
          <dt className="text-[var(--muted)]">from</dt>
          <dd className="font-mono">
            {value.origin.space} {value.origin.coords.map((n) => n.toFixed(3)).join(', ')}
          </dd>
        </>
      ) : null}
      <dt className="text-[var(--muted)]">hex (derived)</dt>
      <dd className="font-mono">
        {d.hex}
        {d.mapped ? ` after ${d.policy ?? 'css'} mapping` : ''}
      </dd>
      {value.achromatic ? (
        <>
          <dt className="text-[var(--muted)]">hue</dt>
          <dd>undefined (achromatic)</dd>
        </>
      ) : null}
    </dl>
  );
}

export function PaletteStrip({ values, labels }: { values: ColourValue[]; labels?: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Palette">
      {values.map((v, i) => (
        <li key={i}>
          <Swatch value={v} label={labels?.[i]} />
        </li>
      ))}
    </ul>
  );
}
