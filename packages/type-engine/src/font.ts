import { parse, type OpenTypeFont as Font } from './opentype';

/**
 * What the laboratory reads from a font file, and nothing more: measurements and the names the file carries.
 * The file is parsed where it was downloaded and is not kept.
 */

export interface FontAxis {
  tag: string;
  min: number;
  default: number;
  max: number;
}

export interface FontReading {
  family?: string;
  style?: string;
  designer?: string;
  manufacturer?: string;
  version?: string;
  license?: string;
  licenseUrl?: string;
  unitsPerEm: number;
  /** Vertical metrics in font units; `null` where the file's OS/2 table does not state the value. */
  xHeight: number | null;
  capHeight: number | null;
  ascender: number;
  descender: number;
  glyphs: number;
  axes: FontAxis[];
  /** OpenType feature tags present in GSUB and GPOS, sorted and unique. */
  features: string[];
  /** Unicode blocks with at least one mapped character, with how many of the block's code points are mapped. */
  coverage: { block: string; mapped: number }[];
}

/** Unicode blocks the reading reports, by name and inclusive range. Only presence is claimed, never completeness of a language. */
export const BLOCKS: { block: string; from: number; to: number }[] = [
  { block: 'Basic Latin', from: 0x0020, to: 0x007e },
  { block: 'Latin-1 Supplement', from: 0x00a0, to: 0x00ff },
  { block: 'Latin Extended-A', from: 0x0100, to: 0x017f },
  { block: 'Latin Extended-B', from: 0x0180, to: 0x024f },
  { block: 'Latin Extended Additional', from: 0x1e00, to: 0x1eff },
  { block: 'Greek and Coptic', from: 0x0370, to: 0x03ff },
  { block: 'Cyrillic', from: 0x0400, to: 0x04ff },
  { block: 'Hebrew', from: 0x0590, to: 0x05ff },
  { block: 'Arabic', from: 0x0600, to: 0x06ff },
  { block: 'Devanagari', from: 0x0900, to: 0x097f },
  { block: 'Thai', from: 0x0e00, to: 0x0e7f },
  { block: 'General Punctuation', from: 0x2000, to: 0x206f },
  { block: 'Currency Symbols', from: 0x20a0, to: 0x20cf },
  { block: 'Arrows', from: 0x2190, to: 0x21ff },
  { block: 'Mathematical Operators', from: 0x2200, to: 0x22ff },
  { block: 'Hiragana', from: 0x3040, to: 0x309f },
  { block: 'Katakana', from: 0x30a0, to: 0x30ff },
  { block: 'CJK Unified Ideographs', from: 0x4e00, to: 0x9fff },
  { block: 'Hangul Syllables', from: 0xac00, to: 0xd7af },
];

/** Parses a font file (TrueType or CFF OpenType; not WOFF2) and reads it. */
export function readFont(buffer: ArrayBuffer): FontReading {
  return summarize(parse(buffer));
}

/** The reading plus the file's own advance widths, for a measure counted from the font rather than a canvas. */
export function openFont(buffer: ArrayBuffer): {
  reading: FontReading;
  averageAdvance: (fontSizePx: number) => number;
} {
  const font = parse(buffer);
  return { reading: summarize(font), averageAdvance: (px) => averageAdvance(font, px) };
}

export function summarize(font: Font): FontReading {
  const name = (n: string) => {
    const v = font.getEnglishName(n);
    return v && v.trim() ? v.trim() : undefined;
  };
  const os2 = font.tables.os2;
  const tags = new Set<string>();
  for (const f of font.tables.gsub?.features ?? []) tags.add(f.tag);
  for (const f of font.tables.gpos?.features ?? []) tags.add(f.tag);
  const counts = new Map<string, number>();
  for (const key of Object.keys(font.tables.cmap?.glyphIndexMap ?? {})) {
    const cp = Number(key);
    const b = BLOCKS.find((x) => cp >= x.from && cp <= x.to);
    if (b) counts.set(b.block, (counts.get(b.block) ?? 0) + 1);
  }
  return {
    family: name('fontFamily'),
    style: name('fontSubfamily'),
    designer: name('designer'),
    manufacturer: name('manufacturer'),
    version: name('version'),
    license: name('license'),
    licenseUrl: name('licenseURL'),
    unitsPerEm: font.unitsPerEm,
    xHeight: os2?.sxHeight && os2.sxHeight > 0 ? os2.sxHeight : null,
    capHeight: os2?.sCapHeight && os2.sCapHeight > 0 ? os2.sCapHeight : null,
    ascender: font.ascender,
    descender: font.descender,
    glyphs: font.numGlyphs,
    axes: (font.tables.fvar?.axes ?? []).map((a) => ({
      tag: a.tag,
      min: a.minValue,
      default: a.defaultValue,
      max: a.maxValue,
    })),
    features: [...tags].sort(),
    coverage: BLOCKS.filter((b) => counts.has(b.block)).map((b) => ({
      block: b.block,
      mapped: counts.get(b.block)!,
    })),
  };
}

/**
 * Average advance of the lowercase alphabet and a space at a size, from the file's own widths. Summed glyph by
 * glyph: the library's string measure applies GSUB substitutions first and throws on lookup formats it does not
 * parse (Inter's chained contexts, for one), which the count per line has no use for.
 */
export function averageAdvance(font: Font, fontSizePx: number): number {
  let units = 0;
  for (const ch of 'abcdefghijklmnopqrstuvwxyz ') units += font.charToGlyph(ch).advanceWidth ?? 0;
  return (units / 27) * (fontSizePx / font.unitsPerEm);
}
