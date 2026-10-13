import type { ColourValue, Triple } from './types';
import { colour, convert } from './engine';

export type CvdType = 'protan' | 'deutan' | 'tritan';

/**
 * Machado, Oliveira & Fernandes (2009) simulation matrices at severity 1.0, applied in linear sRGB.
 * These are approximations of dichromatic vision for a standard observer, not a medical model.
 */
const MATRICES: Record<CvdType, [Triple, Triple, Triple]> = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

/** Simulates how a colour may appear with a colour-vision deficiency. Label it as an approximation in any UI. */
export function simulateCvd(v: ColourValue, type: CvdType): ColourValue {
  const [r, g, b] = convert(v, 'srgb-linear').coords;
  const m = MATRICES[type];
  const out: Triple = [
    m[0][0] * r + m[0][1] * g + m[0][2] * b,
    m[1][0] * r + m[1][1] * g + m[1][2] * b,
    m[2][0] * r + m[2][1] * g + m[2][2] * b,
  ];
  const sim = colour('srgb-linear', out, {
    kind: 'derived',
    note: `cvd:${type}:machado2009:severity1 (approximation)`,
  });
  return {
    ...sim,
    origin: v.origin,
    conversionPath: [...v.conversionPath, `cvd:${type}:machado2009`],
  };
}
