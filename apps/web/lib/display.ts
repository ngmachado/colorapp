import { inGamut, toGamut, toHex, type ColourValue } from '@sca/colour-engine';

/** Display approximation of any colour value: hex for the style attribute plus whether it had to be mapped. */
export function display(v: ColourValue): { hex: string; mapped: boolean; policy?: string } {
  const inside = inGamut(v, 'srgb');
  const mappedValue = inside ? null : toGamut(v, 'srgb', 'css');
  return {
    hex: toHex(v),
    mapped: !inside,
    ...(mappedValue?.mapped ? { policy: mappedValue.mapped.policy } : {}),
  };
}

export function formatCoords(v: ColourValue): string {
  const digits = v.space === 'srgb' || v.space === 'oklab' || v.space === 'oklch' ? 3 : 2;
  return v.coords.map((n) => n.toFixed(digits)).join(', ');
}
