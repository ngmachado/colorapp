/**
 * A focused comparison of two opaque sRGB colours: both values, named difference metrics with their
 * conditions, and the WCAG contrast between them. Pure; provenance is attached by the page from records.
 */
import {
  colour,
  contrastRatio,
  convert,
  deltaE,
  hueDistance,
  type Triple,
} from '@sca/colour-engine';
import { parseHex } from './contrast';
import { thresholdReport } from './contrast';

export interface ComparedColour {
  hex: string;
  rgb: Triple;
  oklch: Triple;
  oklab: Triple;
  lab: Triple;
  neutral: boolean;
}
export interface Comparison {
  a: ComparedColour;
  b: ComparedColour;
  differences: {
    id: string;
    label: string;
    value: number;
    /** The space, white point and parameters the number depends on. */
    conditions: string;
  }[];
  /** Per-axis OKLCh differences, hue as the smaller arc. */
  oklchDelta: { l: number; c: number; h: number | null };
  contrast: { ratio: number; thresholds: ReturnType<typeof thresholdReport> };
}

function describe(hex: string): ComparedColour {
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Triple;
  const v = colour('srgb', rgb.map((n) => n / 255) as Triple, { kind: 'manual' });
  const oklch = convert(v, 'oklch').coords;
  return {
    hex,
    rgb,
    oklch: [oklch[0], oklch[1], Number.isNaN(oklch[2]) ? 0 : oklch[2]],
    oklab: convert(v, 'oklab').coords,
    lab: convert(v, 'lab').coords,
    neutral: rgb[0] === rgb[1] && rgb[1] === rgb[2],
  };
}

export function compareHexes(aText: string, bText: string): Comparison | null {
  const ha = parseHex(aText);
  const hb = parseHex(bText);
  if (!ha || !hb) return null;
  const a = describe(ha);
  const b = describe(hb);
  const va = colour('srgb', a.rgb.map((n) => n / 255) as Triple, { kind: 'manual' });
  const vb = colour('srgb', b.rgb.map((n) => n / 255) as Triple, { kind: 'manual' });
  const de2000 = deltaE(va, vb, 'ciede2000');
  const deOk = deltaE(va, vb, 'oklab');
  const ratio = contrastRatio(va, vb);
  return {
    a,
    b,
    differences: [
      {
        id: 'ciede2000',
        label: 'CIEDE2000 ΔE₀₀',
        value: de2000.value,
        conditions: 'CIELAB, D50 (Bradford adaptation from sRGB’s D65), kL = kC = kH = 1',
      },
      {
        id: 'oklab',
        label: 'OKLab ΔE (Euclidean)',
        value: deOk.value,
        conditions: 'OKLab, D65, L on a 0–1 scale; the distance the Dictionary and map use',
      },
    ],
    oklchDelta: {
      l: b.oklch[0] - a.oklch[0],
      c: b.oklch[1] - a.oklch[1],
      h: a.neutral || b.neutral ? null : hueDistance(a.oklch[2], b.oklch[2]),
    },
    contrast: { ratio, thresholds: thresholdReport(ratio) },
  };
}
