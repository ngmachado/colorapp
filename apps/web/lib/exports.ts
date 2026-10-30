/**
 * Palette exports that carry their provenance. Pure: the Laboratory builds `ExportColour` entries from
 * its state and these functions write CSS, SVG and JSON. Every value says where it came from, whether it
 * was edited since, and what a "nearest" record is (a search, never an identification).
 */
import type { Oklch } from './palette-param';
import type { SourceCitation } from './palette-names';

export interface ExportRecord {
  id: string;
  concept: string;
  label: string;
  collection: string;
  /** The representation as recorded, in its own space, and its display approximation. */
  value: { space: string; coords: number[]; hex: string };
  approximation: string;
  method: string;
  source: SourceCitation | null;
  locator?: string;
  /** True when the column no longer shows the record's value. */
  edited: boolean;
}
export interface ExportNearest {
  record: string;
  concept: string;
  label: string;
  collection: string;
  distance: number;
  approximation?: string;
}
export interface ExportColour {
  role: string;
  name: string;
  oklch: Oklch;
  hex: string;
  locked: boolean;
  areaWeight: number;
  areaShare: number;
  record: ExportRecord | null;
  nearest: ExportNearest | null;
}
export interface ExportPalette {
  structure: string;
  seed: number;
  bounds: unknown;
  colours: ExportColour[];
  /** Base URL for record links, without a trailing slash. */
  site: string;
  /** Intended text-on-background pairs, by column index. */
  pairs?: [number, number][];
}

export const APPROXIMATION_WORDS: Record<string, string> = {
  measured: 'measured value',
  'published-value': 'published value',
  'modern-approximation': 'modern approximation',
  unknown: 'approximation of unknown status',
};

const cssName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const oklchCss = (c: Oklch) => `oklch(${c[0].toFixed(4)} ${c[1].toFixed(4)} ${c[2].toFixed(1)})`;
const cite = (s: SourceCitation | null, locator?: string) =>
  s
    ? `${s.author}, ${s.title}${s.date ? ` (${s.date})` : ''}${locator ? `, ${locator}` : ''}${s.url ? ` <${s.url}>` : ''}`
    : 'source record not available';

/** One line of provenance for a colour, shared by the CSS comments and the SVG descriptions. */
export function provenanceLine(c: ExportColour, site: string): string {
  if (c.record) {
    const r = c.record;
    return (
      `from record ${r.id} (${r.label}, ${r.collection}) · ${APPROXIMATION_WORDS[r.approximation] ?? r.approximation}` +
      ` · recorded as ${r.value.space} ${r.value.coords.map((n) => +n.toFixed(4)).join(', ')} (${r.value.hex.toUpperCase()})` +
      ` · ${r.edited ? 'edited in the Laboratory; the value here is not the record’s' : 'as recorded'}` +
      ` · ${cite(r.source, r.locator)} · ${site}/dictionary/${r.concept}`
    );
  }
  if (c.nearest) {
    const n = c.nearest;
    return `no record · nearest documented colour ${n.label} (${n.record}, ${n.collection}) at OKLab distance ${n.distance.toFixed(4)}: a search result, not an identification`;
  }
  return 'no record';
}

export function cssExport(p: ExportPalette): string {
  const head = [
    `Super Colour palette · ${p.structure} · seed ${p.seed}`,
    'Working space OKLCh (D65). Hex values are sRGB display approximations, gamut-mapped where needed.',
    'The comment above each variable says which record it came from, how that value was obtained, and whether it was edited.',
  ];
  const lines = p.colours.flatMap((c) => [
    `  /* ${c.name}: ${provenanceLine(c, p.site)} */`,
    `  --${cssName(c.name)}: ${oklchCss(c.oklch)}; /* ${c.hex.toUpperCase()} */`,
  ]);
  const pairs = p.pairs?.length
    ? [
        '',
        `/* Intended text/background pairs: ${p.pairs
          .map(([f, b]) => `${p.colours[f]?.name} on ${p.colours[b]?.name}`)
          .join('; ')} */`,
      ]
    : [];
  return (
    `/* ${head.join('\n   ')} */\n:root {\n${lines.join('\n')}\n}\n${pairs.join('\n')}`.trimEnd() +
    '\n'
  );
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** JSON inside a CDATA block; the one sequence CDATA cannot hold is split across two blocks. */
const cdata = (s: string) => `<![CDATA[${s.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;

export function svgExport(p: ExportPalette, inkFor: (hex: string) => string): string {
  const w = 160;
  const groups = p.colours
    .map((c, i) => {
      const ink = inkFor(c.hex);
      const attrs = c.record
        ? ` data-record="${esc(c.record.id)}" data-concept="${esc(c.record.concept)}" data-approximation="${esc(c.record.approximation)}" data-edited="${c.record.edited}"`
        : '';
      return (
        `<g${attrs}><title>${esc(c.name)} ${c.hex.toUpperCase()}</title><desc>${esc(provenanceLine(c, p.site))}</desc>` +
        `<rect x="${i * w}" y="0" width="${w}" height="200" fill="${c.hex}"/>` +
        `<text x="${i * w + 12}" y="176" font-family="DM Mono, monospace" font-size="14" fill="${ink}">${c.hex.slice(1).toUpperCase()}</text>` +
        `<text x="${i * w + 12}" y="192" font-family="DM Sans, sans-serif" font-size="10" fill="${ink}">${esc(c.name)}</text></g>`
      );
    })
    .join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w * p.colours.length}" height="200" viewBox="0 0 ${w * p.colours.length} 200">` +
    `<title>Super Colour palette, ${esc(p.structure)}, seed ${p.seed}</title>` +
    `<desc>Hex values are sRGB display approximations of OKLCh working values. Each group carries its record and provenance.</desc>` +
    `<metadata>${cdata(jsonExport(p))}</metadata>${groups}</svg>`
  );
}

export function jsonExport(p: ExportPalette): string {
  const sources: Record<string, SourceCitation> = {};
  for (const c of p.colours) if (c.record?.source) sources[c.record.source.id] = c.record.source;
  return JSON.stringify(
    {
      app: 'Super Colour',
      space: 'oklch',
      structure: p.structure,
      seed: p.seed,
      bounds: p.bounds,
      colours: p.colours.map((c) => ({
        ...c,
        oklch: c.oklch.map((n) => Number(n.toFixed(4))),
        record: c.record
          ? {
              ...c.record,
              source: c.record.source?.id ?? null,
              value: {
                ...c.record.value,
                coords: c.record.value.coords.map((n) => Number(n.toFixed(5))),
              },
              entry: `${p.site}/dictionary/${c.record.concept}`,
            }
          : null,
        nearest: c.nearest
          ? { ...c.nearest, distance: Number(c.nearest.distance.toFixed(4)) }
          : null,
      })),
      pairs: p.pairs ?? [],
      sources,
      notes: [
        'Hex values are sRGB display approximations. OKLCh is the working value.',
        'record: the representation a column was loaded from, with its own space and coordinates as recorded; edited is true when the column no longer shows that value.',
        'nearest: the closest documented colour by Euclidean distance in OKLab, a search result and not an identification.',
        'approximation: measured, published-value, modern-approximation or unknown, as the record states.',
      ],
    },
    null,
    2,
  );
}

/* ---- Design-tool formats. Each carries as much provenance as the format can hold. ---- */

import { scaleOf, SCALE_STEPS } from './scales';

const slug = (s: string) => cssName(s).replace(/^-+|-+$/g, '') || 'colour';
const short = (c: ExportColour) =>
  c.record
    ? `from ${c.record.id} (${c.record.label}), ${APPROXIMATION_WORDS[c.record.approximation] ?? c.record.approximation}${c.record.edited ? ', edited' : ''}`
    : 'no record';

/** A Tailwind `theme.extend.colors` block: each colour with its DEFAULT and 50–950 scale. */
export function tailwindExport(p: ExportPalette): string {
  const entries = p.colours.map((c) => {
    const steps = scaleOf(c.oklch)
      .map(
        (s) =>
          `      ${s.step}: '${s.hex}',${s.mapped ? ' // outside sRGB at this chroma, mapped' : ''}`,
      )
      .join('\n');
    return `    // ${c.name}: ${short(c)}\n    '${slug(c.name)}': {\n      DEFAULT: '${c.hex}',\n${steps}\n    },`;
  });
  return `// Super Colour palette · ${p.structure} · seed ${p.seed}\n// Scales are even OKLCh lightness steps at each colour's chroma and hue; hex values are sRGB approximations.\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n${entries.map((e) => e.replace(/^/gm, '    ')).join('\n')}\n      },\n    },\n  },\n};\n`;
}

/** SCSS variables with the same provenance comments as the CSS export. */
export function scssExport(p: ExportPalette): string {
  const lines = p.colours.flatMap((c) => [
    `// ${c.name}: ${provenanceLine(c, p.site)}`,
    `$${slug(c.name)}: ${c.hex};`,
    `$${slug(c.name)}-oklch: ${oklchCss(c.oklch)};`,
  ]);
  return `// Super Colour palette · ${p.structure} · seed ${p.seed}\n${lines.join('\n')}\n`;
}

/**
 * W3C Design Tokens (DTCG) JSON: one group per colour with the base value and its scale, provenance
 * in `$extensions`. Figma's variables importers and Style Dictionary read this shape.
 */
export function tokensExport(p: ExportPalette): string {
  const tokens: Record<string, unknown> = {};
  for (const c of p.colours) {
    const ext = {
      'super-colour': {
        role: c.role,
        oklch: c.oklch.map((n) => Number(n.toFixed(4))),
        record: c.record
          ? {
              id: c.record.id,
              concept: c.record.concept,
              label: c.record.label,
              collection: c.record.collection,
              approximation: c.record.approximation,
              recorded: c.record.value,
              source: c.record.source,
              edited: c.record.edited,
              entry: `${p.site}/dictionary/${c.record.concept}`,
            }
          : null,
        nearest: c.nearest
          ? { ...c.nearest, note: 'a search result, not an identification' }
          : null,
      },
    };
    const group: Record<string, unknown> = {
      $type: 'color',
      DEFAULT: { $value: c.hex, $description: short(c), $extensions: ext },
    };
    for (const s of scaleOf(c.oklch))
      group[String(s.step)] = {
        $value: s.hex,
        $description: `OKLCh L ${s.l.toFixed(3)}${s.mapped ? ', outside sRGB at this chroma, mapped' : ''}`,
      };
    tokens[slug(c.name)] = group;
  }
  return JSON.stringify(
    {
      $description: `Super Colour palette · ${p.structure} · seed ${p.seed}. Hex values are sRGB display approximations of OKLCh working values.`,
      ...tokens,
    },
    null,
    2,
  );
}

/**
 * Adobe Swatch Exchange (.ase), version 1.0: one RGB colour entry per colour, names as UTF-16BE.
 * The format holds a name and three floats, so provenance goes into the name after the colour's own.
 */
export function aseExport(p: ExportPalette): Uint8Array {
  const parts: Uint8Array[] = [];
  const u16 = (n: number) => new Uint8Array([(n >> 8) & 255, n & 255]);
  const u32 = (n: number) =>
    new Uint8Array([(n >>> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255]);
  const f32 = (x: number) => {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setFloat32(0, x, false);
    return b;
  };
  const utf16 = (s: string) => {
    const out = new Uint8Array((s.length + 1) * 2);
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      out[i * 2] = c >> 8;
      out[i * 2 + 1] = c & 255;
    }
    return out;
  };
  parts.push(new Uint8Array([0x41, 0x53, 0x45, 0x46]), u16(1), u16(0), u32(p.colours.length));
  for (const c of p.colours) {
    const name = utf16(`${c.name} ${c.hex.toUpperCase()}${c.record ? ` · ${c.record.id}` : ''}`);
    const rgb = [1, 3, 5].map((i) => parseInt(c.hex.slice(i, i + 2), 16) / 255);
    const body = concat([
      u16(name.length / 2),
      name,
      new Uint8Array([0x52, 0x47, 0x42, 0x20]),
      f32(rgb[0]!),
      f32(rgb[1]!),
      f32(rgb[2]!),
      u16(0),
    ]);
    parts.push(u16(0x0001), u32(body.length), body);
  }
  return concat(parts);
}
function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** Reads an .ase file back: entry names and sRGB triples. Used by the tests and by the Library import. */
export function parseAse(bytes: Uint8Array): { name: string; rgb: [number, number, number] }[] {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (String.fromCharCode(...bytes.slice(0, 4)) !== 'ASEF') throw new Error('not an ASE file');
  const count = dv.getUint32(8);
  const out: { name: string; rgb: [number, number, number] }[] = [];
  let o = 12;
  for (let i = 0; i < count; i++) {
    const type = dv.getUint16(o);
    const len = dv.getUint32(o + 2);
    if (type === 1) {
      const n = dv.getUint16(o + 6);
      let name = '';
      for (let k = 0; k < n - 1; k++) name += String.fromCharCode(dv.getUint16(o + 8 + k * 2));
      const at = o + 8 + n * 2;
      const model = String.fromCharCode(...bytes.slice(at, at + 4));
      if (model === 'RGB ')
        out.push({
          name,
          rgb: [dv.getFloat32(at + 4), dv.getFloat32(at + 8), dv.getFloat32(at + 12)],
        });
    }
    o += 6 + len;
  }
  return out;
}
export { SCALE_STEPS };
