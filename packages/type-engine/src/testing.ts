import { Font, Glyph, Path } from './opentype';

/**
 * A small TrueType face built in memory for tests, so nothing is fetched and no font file lives in the
 * repository. Every letter is a box of the same advance; the space is half of one.
 */
export function makeTestFont(
  options: { familyName?: string; chars?: string; advance?: number; designer?: string } = {},
): ArrayBuffer {
  const {
    familyName = 'Test Sans',
    chars = 'abcdefghijklmnopqrstuvwxyz',
    advance = 500,
    designer = 'A tester',
  } = options;
  const box = (w: number) => {
    const p = new Path();
    p.moveTo(60, 0);
    p.lineTo(w - 60, 0);
    p.lineTo(w - 60, 520);
    p.lineTo(60, 520);
    p.close();
    return p;
  };
  const glyphs = [new Glyph({ name: '.notdef', advanceWidth: 600, path: new Path() })];
  for (const ch of chars)
    glyphs.push(
      new Glyph({
        name: `u${ch.codePointAt(0)}`,
        unicode: ch.codePointAt(0)!,
        advanceWidth: advance,
        path: box(advance),
      }),
    );
  glyphs.push(
    new Glyph({ name: 'space', unicode: 32, advanceWidth: advance / 2, path: new Path() }),
  );
  return new Font({
    familyName,
    styleName: 'Regular',
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    designer,
    license: 'SIL Open Font License 1.1',
    version: 'Version 1.000',
    glyphs,
  }).toArrayBuffer();
}
