/**
 * opentype.js 2.0 ships no type declarations. This is the part of its surface the engine uses, typed here once;
 * everything else in the package imports from this module and never from the library directly.
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore the library has no declaration file
import * as raw from 'opentype.js';

export interface FvarAxis {
  tag: string;
  minValue: number;
  defaultValue: number;
  maxValue: number;
}

export interface OpenTypeFont {
  unitsPerEm: number;
  ascender: number;
  descender: number;
  numGlyphs: number;
  tables: {
    os2?: { sxHeight?: number; sCapHeight?: number };
    fvar?: { axes: FvarAxis[] };
    gsub?: { features?: { tag: string }[] };
    gpos?: { features?: { tag: string }[] };
    cmap?: { glyphIndexMap: Record<string, number> };
  };
  getEnglishName(name: string): string | undefined;
  /** The glyph a character maps to, or the font's .notdef. */
  charToGlyph(char: string): { advanceWidth?: number };
  toArrayBuffer(): ArrayBuffer;
}

export interface OpenTypePath {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  close(): void;
}

export interface OpenTypeGlyph {
  readonly name: string;
}

interface FontOptions {
  familyName: string;
  styleName: string;
  unitsPerEm: number;
  ascender: number;
  descender: number;
  glyphs: OpenTypeGlyph[];
  designer?: string;
  license?: string;
  version?: string;
}

interface Lib {
  parse(buffer: ArrayBuffer): OpenTypeFont;
  Font: new (options: FontOptions) => OpenTypeFont;
  Glyph: new (options: {
    name: string;
    unicode?: number;
    advanceWidth: number;
    path: OpenTypePath;
  }) => OpenTypeGlyph;
  Path: new () => OpenTypePath;
}

// Under an ESM loader the namespace is the library; under a CommonJS one it sits on `default`.
const lib = ((raw as { default?: unknown }).default ?? raw) as Lib;

export const parse: Lib['parse'] = (buffer) => lib.parse(buffer);
export const Font = lib.Font;
export const Glyph = lib.Glyph;
export const Path = lib.Path;
