/**
 * Design tokens: the single source of truth for interface colours, in sRGB hex.
 * Interface colours are not garment colours. A unit test checks every text/surface pair for WCAG 2.2 AA.
 * The interface is monochrome on white, in every OS colour scheme, so the colours on screen are the content's, never the chrome's.
 */
export const THEMES = {
  light: {
    bg: '#ffffff',
    surface: '#ffffff',
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
];

export function cssVariables(theme: ThemeName): string {
  return Object.entries(THEMES[theme])
    .map(([k, v]) => `--${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}: ${v};`)
    .join(' ');
}
