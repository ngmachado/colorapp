/** The two themes, as a value the server and the browser both check. The browser side lives in `theme.ts`. */
export type Theme = 'light' | 'dark';

export const isTheme = (v: unknown): v is Theme => v === 'light' || v === 'dark';
