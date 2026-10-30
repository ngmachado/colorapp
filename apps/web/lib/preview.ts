/**
 * Applied preview: palette columns assigned to the parts of an interface, the contrast each visible
 * combination gets, and a derived dark counterpart. Pure; the page renders the mockup from these.
 */
import { colour, contrastRatio, convert, toGamut, toHex } from '@sca/colour-engine';
import { thresholdReport } from './contrast';
import type { Oklch, Pair } from './palette-param';

export const SLOTS = ['background', 'surface', 'text', 'primary', 'link', 'border'] as const;
export type Slot = (typeof SLOTS)[number];
export type Slots = Record<Slot, number>;

const hexOf = (c: Oklch) => toHex(colour('oklch', c));

/**
 * Default assignment: the lightest column is the background, the darkest the text, the most chromatic
 * the primary action; an intended pair, when given, sets text and background directly.
 */
export function defaultSlots(palette: Oklch[], pairs: Pair[] = []): Slots {
  const byL = palette.map((c, i) => ({ i, l: c[0], c: c[1] })).sort((a, b) => b.l - a.l);
  let background = byL[0]!.i;
  let text = byL.at(-1)!.i;
  if (pairs[0]) [text, background] = pairs[0];
  const rest = palette.map((_, i) => i).filter((i) => i !== background && i !== text);
  const mostChromatic = [...(rest.length ? rest : palette.map((_, i) => i))].sort(
    (a, b) => palette[b]![1] - palette[a]![1],
  )[0]!;
  const surface =
    rest.length > 1
      ? rest.filter((i) => i !== mostChromatic).sort((a, b) => palette[b]![0] - palette[a]![0])[0]!
      : background;
  return {
    background,
    surface,
    text,
    primary: mostChromatic,
    link: mostChromatic,
    border: surface === background ? text : surface,
  };
}

/** `slots=background:0,text:2,…` in the address; unknown or out-of-range entries fall back to the default. */
export function parseSlots(value: string | undefined, palette: Oklch[], pairs: Pair[] = []): Slots {
  const out = defaultSlots(palette, pairs);
  if (!value) return out;
  for (const part of value.split(',')) {
    const m = /^([a-z]+):(\d+)$/.exec(part);
    if (!m) continue;
    const slot = m[1] as Slot;
    const i = Number(m[2]);
    if (SLOTS.includes(slot) && i < palette.length) out[slot] = i;
  }
  return out;
}
export function slotsParam(s: Slots): string {
  return SLOTS.map((k) => `${k}:${s[k]}`).join(',');
}

/** The dark counterpart: each column's OKLCh lightness reflected (L′ = 1 − L), chroma and hue kept, mapped into sRGB. */
export function derivedDark(palette: Oklch[]): Oklch[] {
  return palette.map((c) => {
    const v = toGamut(colour('oklch', [1 - c[0], c[1], c[2]]), 'srgb', 'css');
    const o = convert(v, 'oklch').coords;
    return [Math.min(1, Math.max(0, o[0])), Math.max(0, o[1]), Number.isNaN(o[2]) ? c[2] : o[2]];
  });
}

/** The combinations the mockup actually shows, each with its ratio and thresholds. */
export interface ShownPair {
  id: string;
  label: string;
  fg: Slot;
  bg: Slot;
  /** Which thresholds apply to this use: text or non-text. */
  use: 'text' | 'non-text';
  ratio: number;
  passes: boolean;
}
export function shownPairs(palette: Oklch[], slots: Slots): ShownPair[] {
  const v = (s: Slot) => colour('oklch', palette[slots[s]]!);
  const srgb = (s: Slot) => {
    const h = hexOf(palette[slots[s]]!);
    return colour('srgb', [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as Oklch);
  };
  void v;
  const defs: { id: string; label: string; fg: Slot; bg: Slot; use: 'text' | 'non-text' }[] = [
    {
      id: 'text-background',
      label: 'Body text on background',
      fg: 'text',
      bg: 'background',
      use: 'text',
    },
    {
      id: 'text-surface',
      label: 'Text on surface (cards)',
      fg: 'text',
      bg: 'surface',
      use: 'text',
    },
    {
      id: 'primary-surface',
      label: 'Card title on surface',
      fg: 'primary',
      bg: 'surface',
      use: 'text',
    },
    {
      id: 'link-background',
      label: 'Link on background',
      fg: 'link',
      bg: 'background',
      use: 'text',
    },
    {
      id: 'label-primary',
      label: 'Button label on primary',
      fg: 'background',
      bg: 'primary',
      use: 'text',
    },
    {
      id: 'primary-background',
      label: 'Primary button against background',
      fg: 'primary',
      bg: 'background',
      use: 'non-text',
    },
    {
      id: 'border-background',
      label: 'Border against background',
      fg: 'border',
      bg: 'background',
      use: 'non-text',
    },
    {
      id: 'border-surface',
      label: 'Border against surface',
      fg: 'border',
      bg: 'surface',
      use: 'non-text',
    },
  ];
  return defs.map((d) => {
    const ratio = contrastRatio(srgb(d.fg), srgb(d.bg));
    const report = thresholdReport(ratio);
    const needed =
      d.use === 'text'
        ? report.find((t) => t.use === 'normal text' && t.level === 'AA')!
        : report.find((t) => t.criterion === '1.4.11')!;
    return { ...d, ratio, passes: needed.passes };
  });
}
