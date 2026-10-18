import { colour, contrastRatio } from '@sca/colour-engine';
import { describe, expect, test } from 'vitest';
import { CONTRAST_PAIRS, THEMES, type ThemeName } from './tokens';

const hex = (h: string) =>
  colour('srgb', [
    parseInt(h.slice(1, 3), 16) / 255,
    parseInt(h.slice(3, 5), 16) / 255,
    parseInt(h.slice(5, 7), 16) / 255,
  ]);

describe.each(Object.keys(THEMES) as ThemeName[])('%s theme', (theme) => {
  test.each(CONTRAST_PAIRS)('%s on %s reaches 4.5:1', (fgName, bgName) => {
    const ratio = contrastRatio(hex(THEMES[theme][fgName]), hex(THEMES[theme][bgName]));
    expect(ratio, `${theme} ${fgName} on ${bgName} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(
      4.5,
    );
  });
});
