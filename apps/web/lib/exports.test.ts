import { describe, expect, test } from 'vitest';
import { cssExport, jsonExport, svgExport, type ExportPalette } from './exports';

const palette: ExportPalette = {
  structure: 'triadic',
  seed: 4,
  bounds: {},
  site: 'https://example.test',
  pairs: [[1, 0]],
  colours: [
    {
      role: 'dominant',
      name: 'Sakura <pink>',
      oklch: [0.9, 0.05, 350],
      hex: '#ffdbed',
      locked: true,
      areaWeight: 1,
      areaShare: 0.5,
      record: {
        id: 'ja-sakura-iro-srgb-jis',
        concept: 'ja-sakura-iro',
        label: '桜色',
        collection: 'JIS Z 8102',
        value: { space: 'srgb', coords: [1, 0.86, 0.93], hex: '#ffdbed' },
        approximation: 'modern-approximation',
        method: 'page value',
        source: { id: 'wiki', title: 'JIS慣用色名', author: 'Wikipedia (ja)', date: '2026' },
        locator: 'row 桜色',
        edited: false,
      },
      nearest: null,
    },
    {
      role: 'secondary',
      name: 'secondary',
      oklch: [0.5, 0.1, 20],
      hex: '#8a4b3c',
      locked: false,
      areaWeight: 1,
      areaShare: 0.5,
      record: null,
      nearest: {
        record: 'css-sienna-srgb',
        concept: 'css-sienna',
        label: 'sienna',
        collection: 'CSS named colours',
        distance: 0.0812,
      },
    },
  ],
};

describe('source-aware exports', () => {
  test('CSS names the record, its approximation status, the citation and whether it was edited', () => {
    const css = cssExport(palette);
    expect(css).toContain('--sakura-pink-: oklch(0.9000 0.0500 350.0); /* #FFDBED */');
    expect(css).toContain(
      'from record ja-sakura-iro-srgb-jis (桜色, JIS Z 8102) · modern approximation',
    );
    expect(css).toContain('as recorded · Wikipedia (ja), JIS慣用色名 (2026), row 桜色');
    expect(css).toContain('https://example.test/dictionary/ja-sakura-iro');
    expect(css).toContain(
      'nearest documented colour sienna (css-sienna-srgb, CSS named colours) at OKLab distance 0.0812: a search result, not an identification',
    );
    expect(css).toContain('Intended text/background pairs: secondary on Sakura <pink>');
  });
  test('an edited column says so', () => {
    const edited = structuredClone(palette);
    edited.colours[0]!.record!.edited = true;
    expect(cssExport(edited)).toContain(
      'edited in the Laboratory; the value here is not the record’s',
    );
  });
  test('SVG carries record attributes, escaped descriptions and the JSON in metadata', () => {
    const svg = svgExport(palette, () => '#1a1a1a');
    expect(svg).toContain(
      'data-record="ja-sakura-iro-srgb-jis" data-concept="ja-sakura-iro" data-approximation="modern-approximation" data-edited="false"',
    );
    expect(svg).toContain('<title>Sakura &lt;pink&gt; #FFDBED</title>');
    expect(svg).toContain('<metadata><![CDATA[{');
    expect(svg.replace(/<metadata>[\s\S]*<\/metadata>/, '')).not.toContain('<pink>');
    expect(svg.match(/<rect /g)).toHaveLength(2);
  });
  test('JSON keeps the recorded value, the source list and the pairs', () => {
    const j = JSON.parse(jsonExport(palette)) as {
      colours: {
        record: {
          value: { space: string; coords: number[] };
          source: string;
          entry: string;
        } | null;
      }[];
      sources: Record<string, { title: string }>;
      pairs: number[][];
    };
    expect(j.colours[0]!.record!.value).toEqual({
      space: 'srgb',
      coords: [1, 0.86, 0.93],
      hex: '#ffdbed',
    });
    expect(j.colours[0]!.record!.source).toBe('wiki');
    expect(j.colours[0]!.record!.entry).toBe('https://example.test/dictionary/ja-sakura-iro');
    expect(j.sources.wiki!.title).toBe('JIS慣用色名');
    expect(j.pairs).toEqual([[1, 0]]);
  });
});

import { aseExport, parseAse, scssExport, tailwindExport, tokensExport } from './exports';

describe('design-tool exports', () => {
  test('Tailwind gets a DEFAULT and a 50–950 scale per colour with provenance comments', () => {
    const tw = tailwindExport(palette);
    expect(tw).toContain("'sakura-pink': {");
    expect(tw).toContain("DEFAULT: '#ffdbed'");
    expect(tw).toMatch(/50: '#[0-9a-f]{6}'/);
    expect(tw).toMatch(/950: '#[0-9a-f]{6}'/);
    expect(tw).toContain('from ja-sakura-iro-srgb-jis (桜色), modern approximation');
  });
  test('SCSS carries the provenance line and both value forms', () => {
    const scss = scssExport(palette);
    expect(scss).toContain('$sakura-pink: #ffdbed;');
    expect(scss).toContain('$sakura-pink-oklch: oklch(0.9000 0.0500 350.0);');
    expect(scss).toContain('// Sakura <pink>: from record ja-sakura-iro-srgb-jis');
  });
  test('design tokens JSON is DTCG-shaped with provenance in $extensions', () => {
    const t = JSON.parse(tokensExport(palette)) as Record<
      string,
      {
        $type: string;
        DEFAULT: {
          $value: string;
          $extensions: { 'super-colour': { record: { id: string; edited: boolean } } };
        };
        '500': { $value: string };
      }
    >;
    expect(t['sakura-pink']!.$type).toBe('color');
    expect(t['sakura-pink']!.DEFAULT.$value).toBe('#ffdbed');
    expect(t['sakura-pink']!.DEFAULT.$extensions['super-colour'].record.id).toBe(
      'ja-sakura-iro-srgb-jis',
    );
    expect(t['sakura-pink']!['500'].$value).toMatch(/^#[0-9a-f]{6}$/);
  });
  test('ASE writes a valid swatch file that reads back with names and sRGB values', () => {
    const bytes = aseExport(palette);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('ASEF');
    const back = parseAse(bytes);
    expect(back).toHaveLength(2);
    expect(back[0]!.name).toBe('Sakura <pink> #FFDBED · ja-sakura-iro-srgb-jis');
    expect(back[0]!.rgb[0]).toBeCloseTo(1, 5);
    expect(back[0]!.rgb[1]).toBeCloseTo(0xdb / 255, 5);
    expect(back[1]!.name).toBe('secondary #8A4B3C');
  });
});
