'use client';

import { colour, toHex, type HueArc } from '@sca/colour-engine';
import { useState } from 'react';
import { gradientSnippet, gradientStops, HUE_ARCS } from '@/lib/gradients';
import type { Oklch } from '@/lib/palette-param';

const STEPS = 9;

/** The same pair interpolated in sRGB and in OKLCh with a declared hue path, with matching CSS. */
export function GradientPanel({
  palette,
  names,
  onNotice,
}: {
  palette: Oklch[];
  names: string[];
  onNotice: (text: string) => void;
}) {
  const [a, setA] = useState(0);
  const [b, setB] = useState(1);
  const [hue, setHue] = useState<HueArc>('shorter');
  const hexes = palette.map((c) => toHex(colour('oklch', c)));
  const ha = hexes[a]!;
  const hb = hexes[b]!;
  const rows = [
    {
      id: 'srgb',
      label: 'sRGB',
      note: 'gamma-encoded channels, as CSS in srgb',
      stops: gradientStops(ha, hb, 'srgb', hue, STEPS),
    },
    {
      id: 'oklch',
      label: `OKLCh, ${hue} hue`,
      note: 'lightness, chroma and hue interpolated; stops outside sRGB are gamut-mapped and marked',
      stops: gradientStops(ha, hb, 'oklch', hue, STEPS),
    },
  ];
  const select = (value: number, set: (n: number) => void, label: string, testid: string) => (
    <select
      value={value}
      onChange={(e) => set(Number(e.target.value))}
      className="field h-8 text-[13px]"
      aria-label={label}
      data-testid={testid}
    >
      {names.map((n, i) => (
        <option key={i} value={i}>
          {n}
        </option>
      ))}
    </select>
  );
  return (
    <section
      aria-label="Gradients"
      className="flex flex-col gap-3 border-t border-[var(--line)] px-5 py-3 text-[13px]"
      data-testid="gradients"
    >
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="m-0 text-sm font-semibold">Gradients</h2>
        {select(a, setA, 'From colour', 'gradient-a')}
        <span className="text-[var(--muted)]">to</span>
        {select(b, setB, 'To colour', 'gradient-b')}
        <label className="flex items-center gap-1.5">
          <span className="text-[var(--muted)]">hue path</span>
          <select
            value={hue}
            onChange={(e) => setHue(e.target.value as HueArc)}
            className="field h-8 text-[13px]"
            aria-label="Hue path for OKLCh"
            data-testid="gradient-hue"
          >
            {HUE_ARCS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn h-8 text-[13px]"
          onClick={async () => {
            await navigator.clipboard.writeText(gradientSnippet(ha, hb, hue, STEPS));
            onNotice('Gradient CSS copied: both interpolations, each with its stop-list fallback.');
          }}
          data-testid="gradient-copy"
        >
          Copy CSS
        </button>
      </div>
      {rows.map((r) => (
        <div key={r.id} className="flex flex-col gap-1" data-testid={`gradient-${r.id}`}>
          <div className="flex flex-wrap items-baseline gap-x-3">
            <span className="font-semibold">{r.label}</span>
            <span className="text-xs text-[var(--muted)]">{r.note}</span>
            {r.stops.some((s) => s.mapped) ? (
              <span className="text-xs" data-testid="gradient-mapped">
                {r.stops.filter((s) => s.mapped).length} of {STEPS} stops outside sRGB, mapped
              </span>
            ) : null}
          </div>
          <div
            className="flex h-10 overflow-hidden rounded-md"
            role="img"
            aria-label={`${r.label} gradient from ${ha} to ${hb}`}
          >
            {r.stops.map((s) => (
              <span
                key={s.t}
                className="relative flex-1"
                style={{ background: s.hex }}
                title={`${Math.round(s.t * 100)}% ${s.hex.toUpperCase()}${s.mapped ? ' (mapped)' : ''}`}
                data-testid="gradient-stop"
                data-hex={s.hex}
                data-mapped={s.mapped || undefined}
              >
                {s.mapped ? (
                  <span
                    aria-hidden="true"
                    className="absolute top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[var(--surface)]"
                  />
                ) : null}
              </span>
            ))}
          </div>
        </div>
      ))}
      <span className="text-xs text-[var(--muted)]">
        Two interpolations of the same pair, computed here at {STEPS} stops. Neither is the right
        one for every use: sRGB matches most existing tooling; OKLCh keeps lightness steps more even
        and makes the hue path explicit.
      </span>
    </section>
  );
}
