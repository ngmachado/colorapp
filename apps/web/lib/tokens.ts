/**
 * Design tokens: the single source of truth for interface colours, in sRGB hex.
 * Interface colours are not garment colours. A unit test checks every text/surface pair for WCAG 2.2 AA.
 * The interface is monochrome, on white or on near-black, so the colours on screen are the content's, never the chrome's.
 * `wheelBeyond` is the grey the wheel paints where sRGB cannot show a colour, as an "r, g, b" triple for the canvas.
 */
export const THEMES = {
  light: {
    bg: '#ffffff',
    surface: '#ffffff',
    panel: '#fafafa',
    fg: '#1a1a1a',
    muted: '#555555',
    line: '#e6e6e6',
    accent: '#1a1a1a',
    accentFg: '#ffffff',
    accentSoft: '#f2f2f2',
    warn: '#7a4f0a',
    warnSoft: '#f7eacf',
    danger: '#9b2c2c',
    focus: '#1a1a1a',
    wheelBeyond: '236, 236, 236',
  },
  dark: {
    bg: '#111213',
    surface: '#111213',
    panel: '#17181a',
    fg: '#ececec',
    muted: '#a6a9ae',
    line: '#2b2d31',
    accent: '#ececec',
    accentFg: '#111213',
    accentSoft: '#232528',
    warn: '#e8bb6a',
    warnSoft: '#33270f',
    danger: '#f09090',
    focus: '#ececec',
    wheelBeyond: '46, 47, 50',
  },
} as const;

export type ThemeName = keyof typeof THEMES;
export type TokenName = keyof (typeof THEMES)['light'];

/** Text-on-surface pairs that must reach 4.5:1 (AA for normal text). */
export const CONTRAST_PAIRS: [TokenName, TokenName][] = [
  ['fg', 'bg'],
  ['fg', 'surface'],
  ['muted', 'bg'],
  ['muted', 'surface'],
  ['accent', 'bg'],
  ['accent', 'surface'],
  ['accentFg', 'accent'],
  ['warn', 'bg'],
  ['warn', 'warnSoft'],
  ['danger', 'bg'],
  ['fg', 'accentSoft'],
  ['fg', 'panel'],
  ['muted', 'panel'],
];
/** Tokens that are not colours and so are not contrast-checked. */
export const NON_COLOUR_TOKENS: TokenName[] = ['wheelBeyond'];

export function cssVariables(theme: ThemeName): string {
  return Object.entries(THEMES[theme])
    .map(([k, v]) => `--${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}: ${v};`)
    .join(' ');
}
