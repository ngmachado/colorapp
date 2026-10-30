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
