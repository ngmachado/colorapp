/**
 * The Type laboratory through the MCP server: a setting measured as the page measures it, and a face read from
 * its file as the page reads it. The face's file comes from the address Google's catalogue gives, is read for
 * its metrics and dropped; no file is ever accepted from the caller. Nothing here calls a setting good.
 */
import {
  apcaLc,
  charactersPerLine,
  place,
  scale,
  sizeAt,
  TEXT_SPACING,
  wcagForStyle,
} from '@sca/type-engine';
import { openFont, type FontReading } from '@sca/type-engine/font';
import type { Concept } from '@sca/knowledge';
import { fetchCatalogue, mainFile, CATALOGUE_SOURCE, type CatalogueFace } from '@/lib/catalogue';
import { hasWeights, isVariable, staticWeights } from '@/lib/faces';
import { knowledge } from '@/lib/knowledge';
import { labFromHexes } from '@/lib/lab-links';
import { siteUrl } from '@/lib/site';
import {
  DEFAULT_STYLES,
  LIMITS,
  MEASURE_RANGE,
  PAD,
  RATIOS,
  readTypeState,
  STYLE_IDS,
  writeTypeState,
  type StyleId,
  type TypeState,
} from '@/lib/type-state';
import { citation, parseColour, Refusal } from './tools';

/** Where the catalogue and a face's file come from; tests pass their own. */
export interface TypeDeps {
  catalogue: () => Promise<CatalogueFace[] | null>;
  file: (url: string) => Promise<ArrayBuffer>;
}

/** The largest file read here; the CJK faces Google serves are a few megabytes. */
const FILE_LIMIT = 12 * 1024 * 1024;

export const liveDeps: TypeDeps = {
  catalogue: fetchCatalogue,
  file: async (url) => {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Google answered ${res.status}`);
    const length = Number(res.headers.get('content-length'));
    if (length > FILE_LIMIT) throw new Error('file too large to read here');
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > FILE_LIMIT) throw new Error('file too large to read here');
    return buffer;
  },
};

const origin = () => siteUrl.origin.replace(/\/$/, '');
const round = (n: number, digits = 2) => Number(n.toFixed(digits));

/**
 * A documented claim the laboratory checks against, in the record's own words with its citation. A locator
 * that has not been checked against the cited edition is not given; the entry carries it.
 */
export function typeClaim(id: string) {
  const c = knowledge().record(id) as Concept | undefined;
  if (!c) throw new Error(`type laboratory: missing record ${id}`);
  const checked = c.review_state !== 'discovered';
  return {
    record: c.id,
    label: c.label,
    claim: c.description ?? '',
    citation: citation({
      source: c.evidence.source,
      ...(checked && c.evidence.locator ? { locator: c.evidence.locator } : {}),
    }),
    link: `${origin()}/dictionary/${encodeURIComponent(c.id)}`,
  };
}

const CLAIMS = {
  measure: 'type-measure',
  leading: 'type-leading',
  ratios: 'type-scale-ratios',
  spacing: 'type-text-spacing',
  largeText: 'type-contrast-large-text',
  apca: 'type-contrast-apca',
} as const;

const claims = () =>
  Object.fromEntries(Object.entries(CLAIMS).map(([k, id]) => [k, typeClaim(id)])) as Record<
    keyof typeof CLAIMS,
    ReturnType<typeof typeClaim>
  >;

export interface SettingInput {
  /** A family name from Google Fonts. Without one the setting is measured without a face. */
  face?: string;
  base?: number;
  ratio?: number;
  /** Width of the body column in CSS px. */
  measure?: number;
  /** The palette, 2 to 8 colours. */
  colours?: string[];
  /** Which palette colours each text style uses, by index. */
  styles?: { style: StyleId; text: number; background: number }[];
  /** Whether WCAG 1.4.12's spacing values are applied. */
  spacing?: boolean;
}

type Face =
  | {
      status: 'read';
      entry: CatalogueFace;
      reading: FontReading;
      averageAdvance: (px: number) => number;
    }
  | { status: 'unread'; entry: CatalogueFace; note: string }
  | { status: 'none'; note: string };

const specimenLink = (family: string) =>
  `https://fonts.google.com/specimen/${encodeURIComponent(family).replace(/%20/g, '+')}`;

/** The catalogue entry for a family, by name, or a refusal naming the faces whose names contain the text. */
async function entryFor(family: string, deps: TypeDeps): Promise<CatalogueFace | null> {
  const list = await deps.catalogue();
  if (!list) return null;
  const want = family.trim().toLowerCase();
  const hit = list.find((f) => f.family.toLowerCase() === want);
  if (hit) return hit;
  const near = list.filter((f) => f.family.toLowerCase().includes(want)).slice(0, 8);
  throw new Refusal(
    `No face named "${family.trim()}" in the catalogue.${near.length ? ' Names containing that text are in detail.faces.' : ''}`,
    near.length ? { faces: near.map((f) => f.family) } : undefined,
  );
}

async function readFace(family: string, deps: TypeDeps): Promise<Face> {
  const entry = await entryFor(family, deps);
  if (!entry)
    return {
      status: 'none',
      note: 'No catalogue of faces is available, so the face was not read.',
    };
  const file = mainFile(entry);
  if (!file) return { status: 'unread', entry, note: 'The catalogue lists no file for this face.' };
  try {
    const { reading, averageAdvance } = openFont(await deps.file(file.url));
    return { status: 'read', entry, reading, averageAdvance };
  } catch {
    return {
      status: 'unread',
      entry,
      note: 'The face’s file could not be read; what the catalogue states is given.',
    };
  }
}

const catalogueFacts = (f: CatalogueFace) => ({
  category: { value: f.category, note: 'Google Fonts’ label, reported as theirs.' },
  built: isVariable(f) ? 'variable' : 'static',
  ...(f.axes?.length ? { axes: f.axes } : {}),
  ...(isVariable(f) ? {} : { weights: staticWeights(f) }),
  subsets: f.subsets,
  source: CATALOGUE_SOURCE,
});

/** A setting measured as the Type laboratory measures it, with every check cited. */
export async function measureSetting(input: SettingInput, deps: TypeDeps = liveDeps) {
  const within = (name: keyof typeof LIMITS, v: number | undefined) => {
    if (v === undefined) return;
    const [lo, hi] = LIMITS[name];
    if (!Number.isFinite(v) || v < lo || v > hi)
      throw new Refusal(`${name} is a number from ${lo} to ${hi}.`);
  };
  within('base', input.base);
  within('ratio', input.ratio);
  within('measure', input.measure);
  const colours = input.colours?.map((c) => parseColour(c).hex);
  if (colours && (colours.length < 2 || colours.length > 8))
    throw new Refusal('colours is a palette of 2 to 8 colours.');
  const n = colours?.length ?? readTypeState({}).hexes.length;
  const pairs: string[] = STYLE_IDS.map(() => '');
  for (const s of input.styles ?? []) {
    const at = STYLE_IDS.indexOf(s.style);
    if (at < 0) throw new Refusal(`style is one of ${STYLE_IDS.join(', ')}.`);
    if (
      ![s.text, s.background].every((i) => Number.isInteger(i) && i >= 0 && i < n) ||
      s.text === s.background
    )
      throw new Refusal(
        `${s.style}: text and background are two different indexes from 0 to ${n - 1}.`,
      );
    pairs[at] = `${s.text}-${s.background}`;
  }
  const state: TypeState = readTypeState({
    ...(input.face ? { face: input.face.trim() } : {}),
    ...(input.base !== undefined ? { base: String(input.base) } : {}),
    ...(input.ratio !== undefined ? { ratio: String(input.ratio) } : {}),
    ...(input.measure !== undefined ? { measure: String(input.measure) } : {}),
    ...(colours ? { hex: colours.map((h) => h.slice(1)).join(',') } : {}),
    ...(input.styles?.length ? { styles: pairs.join(',') } : {}),
    ...(input.spacing ? { spacing: '1' } : {}),
  });

  const face: Face | null = state.face ? await readFace(state.face, deps) : null;
  // The catalogue's spelling of the family, so the link opens the page on the same face.
  if (face && face.status !== 'none') state.face = face.entry.family;
  const px = (step: number) => round(sizeAt(state.base, state.ratio, step));
  const bodyPx = px(DEFAULT_STYLES.find((x) => x.id === 'body')!.step);
  const column = state.measure - 2 * PAD;
  let advance: number | null = null;
  if (face?.status === 'read') {
    try {
      advance = face.averageAdvance(bodyPx);
    } catch {
      advance = 0;
    }
  }
  const cpl = advance && advance > 0 ? charactersPerLine(column, advance) : null;
  const cited = claims();
  const ratioName = RATIOS.find((r) => r.value === state.ratio)?.name ?? null;

  return {
    setting: {
      face: state.face,
      base: state.base,
      ratio: state.ratio,
      ratioName,
      measure: state.measure,
      colours: state.hexes,
      spacing: state.spacing,
    },
    face:
      face === null
        ? null
        : face.status === 'none'
          ? { family: state.face, read: false, note: face.note }
          : {
              family: face.entry.family,
              read: face.status === 'read',
              catalogue: catalogueFacts(face.entry),
              ...(face.status === 'read' ? { file: face.reading } : { note: face.note }),
            },
    scale: {
      steps: scale(state.base, state.ratio),
      ratios: RATIOS,
      note: 'Base × ratio per step. A ratio is a construction; no scale is called right.',
      claim: cited.ratios,
    },
    measure: {
      columnPx: column,
      charactersPerLine: cpl,
      placement: cpl === null ? null : place(cpl, MEASURE_RANGE),
      range: MEASURE_RANGE,
      note:
        cpl === null
          ? face === null
            ? 'The count per line needs a face; name one and the count is taken from its file.'
            : face.status === 'read'
              ? 'The file has no advance for the Latin alphabet, so no count is taken.'
              : 'The file was not read, so no count is taken.'
          : 'Counted in the body column from the file’s own advance widths, against the cited range.',
      claim: cited.measure,
    },
    styles: state.styles.map((st) => {
      const size = px(st.step);
      const text = state.hexes[st.fg]!;
      const background = state.hexes[st.bg]!;
      const wcag = wcagForStyle(text, background, size, st.weight);
      return {
        style: st.id,
        label: st.label,
        px: size,
        weight: st.weight,
        leading: st.leading,
        lineHeightPx: round(size * st.leading),
        text: { index: st.fg, hex: text },
        background: { index: st.bg, hex: background },
        wcag: { ...wcag, ratio: round(wcag.ratio) },
        apca: {
          lc: round(apcaLc(text, background), 1),
          note: 'WCAG 3 draft method; no threshold is applied.',
        },
      };
    }),
    leading: {
      note: 'Shown as a ratio of each style’s size and not judged.',
      claim: cited.leading,
    },
    spacing: {
      applied: state.spacing,
      criterion: TEXT_SPACING.criterion,
      values: {
        lineHeight: TEXT_SPACING.lineHeight,
        paragraphSpacingEm: TEXT_SPACING.paragraphSpacingEm,
        letterSpacingEm: TEXT_SPACING.letterSpacingEm,
        wordSpacingEm: TEXT_SPACING.wordSpacingEm,
      },
      note: 'A test the setting must survive, not a setting to recommend.',
      claim: cited.spacing,
    },
    contrast: { wcag: cited.largeText, apca: cited.apca },
    links: {
      type: `${origin()}${writeTypeState(state)}`,
      laboratory: `${origin()}${labFromHexes(state.hexes)}`,
    },
    note: 'Nothing here says a setting is good; it says what the setting is.',
  };
}

/** A face by its family name: what the catalogue states and what its file carries. */
export async function lookupFace(family: string, deps: TypeDeps = liveDeps) {
  const name = family.trim();
  if (!name) throw new Refusal('family is the name of a face on Google Fonts, such as Inter.');
  const face = await readFace(name, deps);
  if (face.status === 'none') throw new Refusal(face.note);
  const f = face.entry;
  const weights = [...new Set(DEFAULT_STYLES.map((x) => x.weight))];
  return {
    family: f.family,
    catalogue: catalogueFacts(f),
    /** Whether the face sets the laboratory's four weights without synthesis. */
    setsLaboratoryWeights: hasWeights(f, weights),
    file: face.status === 'read' ? face.reading : null,
    ...(face.status === 'unread' ? { note: face.note } : {}),
    links: {
      type: `${origin()}${writeTypeState({ ...readTypeState({}), face: f.family })}`,
      specimen: specimenLink(f.family),
    },
    about:
      'Values are read from the file Google serves and the names it carries; the category is Google’s. No classification beyond that, no pairing and no ranking is offered.',
  };
}
