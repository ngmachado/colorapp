import { colour, convert, toGamut, toHex, type ColourValue, type Triple } from '@sca/colour-engine';
import { parseHex } from './contrast';

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
