import { colour, convert, toGamut, toHex, type ColourValue, type Triple } from '@sca/colour-engine';
import { DEFAULTS, norm } from '@sca/generator';
import { parseHex } from './contrast';
import { ruleOffsets } from './wheel-math';

/** Only opaque sRGB hex inputs are accepted; no inferred profile or historical identity. */
export function inspectHex(input: string) {
  const hex = parseHex(input);
  if (!hex) return null;
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Triple;
  const value = colour('srgb', rgb.map((v) => v / 255) as Triple, { kind: 'manual' });
  const hsl = convert(value, 'hsl');
  const oklch = convert(value, 'oklch');
  const lab = convert(value, 'lab');
  const xyz = convert(value, 'xyz-d65');
  const neutral = rgb[0] === rgb[1] && rgb[1] === rgb[2];
  const f = (n: number, digits = 5) => Number(n.toFixed(digits)).toString();
  return {
    hex,
    value,
    neutral,
    values: [
      { label: 'HEX', text: hex.toUpperCase(), note: 'Opaque sRGB · 8 bits per channel' },
      { label: 'RGB', text: `rgb(${rgb.join(' ')})`, note: 'sRGB · encoded channels 0–255 · D65' },
      {
        label: 'HSL',
        text: `hsl(${neutral ? 'none' : f(hsl.coords[0], 3)} ${f(hsl.coords[1], 3)}% ${f(hsl.coords[2], 3)}%)`,
        note: neutral ? 'sRGB · achromatic; hue undefined' : 'sRGB · hue in degrees',
      },
      {
        label: 'OKLCh',
        text: `oklch(${f(oklch.coords[0])} ${neutral ? '0' : f(oklch.coords[1])} ${neutral ? 'none' : f(oklch.coords[2], 3)})`,
        note: 'D65 · L 0–1 · hue in degrees',
      },
      {
        label: 'Lab',
        text: `lab(${f(lab.coords[0], 4)} ${f(lab.coords[1], 4)} ${f(lab.coords[2], 4)})`,
        note: 'CIELAB · D50 · Bradford adaptation from D65',
      },
      {
        label: 'XYZ',
        text: `color(xyz-d65 ${xyz.coords.map((v) => f(v, 6)).join(' ')})`,
        note: 'D65 · relative XYZ, reference-white Y = 1',
      },
    ],
  };
}

export function colourSteps(value: ColourValue, dimension: 'lightness' | 'chroma') {
  const [L, C, h] = convert(value, 'oklch').coords;
  const steps =
    dimension === 'lightness'
      ? [0.95, 0.85, 0.75, 0.65, 0.55, 0.45, 0.35, 0.25, 0.15]
      : [0, 0.025, 0.05, 0.075, 0.1, 0.15, 0.2, 0.3, 0.4];
  return steps.map((step) => {
    const requested = colour('oklch', dimension === 'lightness' ? [step, C, h] : [L, step, h]);
    const mapped = toGamut(requested, 'srgb', 'css');
    return { step, hex: toHex(mapped), mapped: !!mapped.mapped };
  });
}

/** Hue constructions the Laboratory's rules draw, excluding the base; the angles are the generator's defaults. */
export const HUE_RULES = [
  'complementary',
  'split-complementary',
  'triadic',
  'tetradic',
  'analogous',
] as const;
export type HueRule = (typeof HUE_RULES)[number];
export const HUE_RULE_LABELS: Record<HueRule, { name: string; angles: string }> = {
  complementary: { name: 'Complementary', angles: '180°' },
  'split-complementary': {
    name: 'Split complementary',
    angles: `180° ± ${DEFAULTS.split_deg}°`,
  },
  triadic: { name: 'Triadic', angles: '120°' },
  tetradic: { name: 'Tetradic', angles: `${DEFAULTS.angle_deg}° · 180°` },
  analogous: { name: 'Analogous', angles: `± ${DEFAULTS.span_deg}°` },
};

export interface SpacePoint {
  /** The rendered sRGB value. */
  hex: string;
  /** OKLab position of the rendered value, which is where the point is drawn. */
  lab: Triple;
  /** The requested OKLCh coordinates, before any gamut mapping. */
  requested: { L: number; C: number; h: number };
  mapped: boolean;
  label: string;
}

const spacePoint = (requested: { L: number; C: number; h: number }, label: string): SpacePoint => {
  const mapped = toGamut(colour('oklch', [requested.L, requested.C, requested.h]), 'srgb', 'css');
  return {
    hex: toHex(mapped),
    lab: convert(mapped, 'oklab').coords as Triple,
    requested,
    mapped: !!mapped.mapped,
    label,
  };
};

/**
 * Everything the inspector plots around a colour: the lightness and chroma steps of `colourSteps`, and each
 * hue rule's turns in OKLCh with the inspected lightness and chroma held. All are constructions from the
 * inspected value by a stated rule; none is a documented relation. An achromatic input has no hue to turn.
 */
export function inspectorSpace(value: ColourValue) {
  const [L, C, h0] = convert(value, 'oklch').coords;
  const neutral = !(C > 1e-4) || Number.isNaN(h0);
  const h = neutral ? 0 : h0;
  const steps = (dimension: 'lightness' | 'chroma') =>
    colourSteps(value, dimension).map((s) =>
      spacePoint(
        dimension === 'lightness' ? { L: s.step, C, h } : { L, C: s.step, h },
        `${dimension === 'lightness' ? 'L' : 'C'} ${s.step.toFixed(3)}`,
      ),
    );
  const rules = Object.fromEntries(
    HUE_RULES.map((rule) => [
      rule,
      neutral
        ? []
        : ruleOffsets(rule, DEFAULTS)!
            .slice(1)
            .map((d) => spacePoint({ L, C, h: norm(h + d) }, `${d > 0 ? '+' : ''}${d}°`)),
    ]),
  ) as Record<HueRule, SpacePoint[]>;
  return {
    base: { hex: toHex(value), lab: convert(value, 'oklab').coords as Triple, L, C, h },
    neutral,
    lightness: steps('lightness'),
    chroma: steps('chroma'),
    rules,
  };
}
export type InspectorSpace = ReturnType<typeof inspectorSpace>;
