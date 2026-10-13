export type Triple = [number, number, number];

export type WhitePoint = 'D65' | 'D50';

/** Spaces the engine speaks. Coordinates follow Color.js conventions, listed in SPACES. */
export type SpaceId =
  | 'srgb'
  | 'srgb-linear'
  | 'display-p3'
  | 'hsl'
  | 'hsv'
  | 'xyz-d65'
  | 'xyz-d50'
  | 'xyy'
  | 'lab'
  | 'lch'
  | 'oklab'
  | 'oklch'
  | 'cam16-jmh';

export interface SpaceInfo {
  white: WhitePoint;
  /** Coordinate names and ranges, so UI labels match the underlying quantity. */
  coords: [string, string, string];
  note: string;
}

export const SPACES: Record<SpaceId, SpaceInfo> = {
  srgb: { white: 'D65', coords: ['r 0..1', 'g 0..1', 'b 0..1'], note: 'Gamma-encoded sRGB.' },
  'srgb-linear': {
    white: 'D65',
    coords: ['r 0..1', 'g 0..1', 'b 0..1'],
    note: 'Linear-light sRGB.',
  },
  'display-p3': {
    white: 'D65',
    coords: ['r 0..1', 'g 0..1', 'b 0..1'],
    note: 'Gamma-encoded Display P3.',
  },
  hsl: {
    white: 'D65',
    coords: ['h deg', 's 0..100', 'l 0..100'],
    note: 'Not perceptually uniform.',
  },
  hsv: {
    white: 'D65',
    coords: ['h deg', 's 0..100', 'v 0..100'],
    note: 'HSV value, not Munsell value.',
  },
  'xyz-d65': { white: 'D65', coords: ['X', 'Y', 'Z'], note: 'CIE 1931 2°, D65 white.' },
  'xyz-d50': { white: 'D50', coords: ['X', 'Y', 'Z'], note: 'CIE 1931 2°, D50 white (Bradford).' },
  xyy: { white: 'D65', coords: ['x', 'y', 'Y'], note: 'Chromaticity plus luminance, D65.' },
  lab: { white: 'D50', coords: ['L 0..100', 'a', 'b'], note: 'CIELAB, D50 as in CSS Color 4.' },
  lch: { white: 'D50', coords: ['L 0..100', 'C', 'h deg'], note: 'CIELCh, D50.' },
  oklab: { white: 'D65', coords: ['L 0..1', 'a', 'b'], note: 'OKLab, perceptual approximation.' },
  oklch: {
    white: 'D65',
    coords: ['L 0..1', 'C', 'h deg'],
    note: 'OKLCh, working space for exploration.',
  },
  'cam16-jmh': {
    white: 'D65',
    coords: ['J', 'M', 'h deg'],
    note: 'CAM16 under Color.js default viewing conditions.',
  },
};

export interface Source {
  kind: 'manual' | 'import' | 'record' | 'derived';
  /** Record id, file name or generator id. */
  ref?: string;
  note?: string;
}

export type GamutPolicy = 'clip' | 'css' | 'oklch-chroma';

export type DifferenceMetric = 'ciede2000' | 'oklab';

export interface Difference {
  metric: DifferenceMetric;
  version: string;
  value: number;
  /** Space the metric was computed in. */
  space: SpaceId;
  params?: Record<string, number>;
}

export interface Mapping {
  policy: GamutPolicy;
  space: SpaceId;
  /** Coordinates in `space` before mapping. */
  from: Triple;
  delta: Difference;
}

/**
 * A colour value that never forgets where it came from.
 * `origin` is the first representation and is carried through every conversion.
 * Hex is never stored; derive it with toHex().
 */
export interface ColourValue {
  space: SpaceId;
  coords: Triple;
  white: WhitePoint;
  origin: { space: SpaceId; coords: Triple; white: WhitePoint };
  source?: Source;
  /** Steps taken from origin to this value, including chromatic adaptation. */
  conversionPath: string[];
  /** True when the hue coordinate is undefined (chroma 0) and was set to 0. */
  achromatic?: boolean;
  mapped?: Mapping;
}
