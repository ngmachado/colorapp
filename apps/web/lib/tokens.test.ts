import { colour, contrastRatio } from '@sca/colour-engine';
import { describe, expect, test } from 'vitest';
import { CONTRAST_PAIRS, NON_COLOUR_TOKENS, THEMES, type ThemeName } from './tokens';

const hex = (h: string) =>
  colour('srgb', [
    parseInt(h.slice(1, 3), 16) / 255,
    parseInt(h.slice(3, 5), 16) / 255,
    parseInt(h.slice(5, 7), 16) / 255,
  ]);

test('both themes define the same tokens, and every colour token is a hex', () => {
  expect(Object.keys(THEMES.dark)).toEqual(Object.keys(THEMES.light));
  for (const theme of Object.keys(THEMES) as ThemeName[])
    for (const [name, value] of Object.entries(THEMES[theme]))
      if (!NON_COLOUR_TOKENS.includes(name as never))
        expect(value, `${theme}.${name}`).toMatch(/^#[0-9a-f]{6}$/);
});

describe.each(Object.keys(THEMES) as ThemeName[])('%s theme', (theme) => {
  test.each(CONTRAST_PAIRS)('%s on %s reaches 4.5:1', (fgName, bgName) => {
    const ratio = contrastRatio(hex(THEMES[theme][fgName]), hex(THEMES[theme][bgName]));
    expect(ratio, `${theme} ${fgName} on ${bgName} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(
      4.5,
    );
  });
});
