'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  TEXT_SPACING,
  apcaLc,
  asEm,
  charactersPerLine,
  place,
  scale,
  wcagForStyle,
} from '@sca/type-engine';
import type { FontReading } from '@sca/type-engine/font';
import type { CatalogueFace } from '@/app/api/fonts/route';
import { COMPARE_MAX, CompareTray, FacesFinder } from '@/components/type/faces-finder';
import { labFromHexes } from '@/lib/lab-links';
import {
  DEFAULT_STYLES,
  LIMITS,
  MEASURE_RANGE,
  PAD,
  RATIOS,
  writeTypeState,
  type StyleSetting,
  type TypeState,
} from '@/lib/type-state';

export interface Citation {
  label: string;
  claim: string;
  locator: string;
  source: string;
  url?: string;
  /** The form printed on the page; the entry carries the full record. */
  short: string;
  entry: string;
}
export interface TypeSources {
  measure: Citation;
  leading: Citation;
  ratios: Citation;
  spacing: Citation;
  largeText: Citation;
  apca: Citation;
}

const SAMPLE: Record<StyleSetting['id'], string> = {
  display: 'Colour is a tool',
  heading: 'Every value has an origin',
  body: 'The laboratory sets the palette in a face at real size and weight, and measures what it can measure: line length against a documented range, leading, and the contrast of each text style. Distance between two colours is never taken for identity, and a rule never stands in for a judgement. Nothing on this page says a setting is good; it says what the setting is.',
  caption: 'Figure 3 · Measured on the file the browser downloaded from Google Fonts',
};
/** One line of the body sample, for the finder's cards. */
const SAMPLE_SHORT = 'Every value has an origin. Distance is never identity.';
/** The weights the text styles use; a static family's files for them are loaded beside its regular. */
const WEIGHTS = [...new Set(DEFAULT_STYLES.map((x) => x.weight))];

/**
 * Google's stylesheet address for a family: the range of its weight axis when it is variable, the static weights
 * it has, or the family alone when nothing is known about it (an axis it lacks makes Google answer 400).
 */
function googleCss(family: string, entry?: CatalogueFace): string {
  const name = encodeURIComponent(family).replace(/%20/g, '+');
  const wght = entry?.axes?.find((a) => a.tag === 'wght');
  let axis = '';
  if (wght) axis = `:wght@${wght.start}..${wght.end}`;
  else if (entry) {
    const weights = Object.keys(entry.files)
      .map((k) => (k === 'regular' ? 400 : Number(k)))
      .filter((n) => Number.isInteger(n))
      .sort((a, b) => a - b);
    if (weights.length) axis = `:wght@${weights.join(';')}`;
  }
  return `https://fonts.googleapis.com/css2?family=${name}${axis}&display=swap`;
}

/** The weight descriptor for a family's main file: its axis range when variable, else the file's own weight. */
function weightRange(entry: CatalogueFace, key: string): string {
  const wght = entry.axes?.find((a) => a.tag === 'wght');
  if (wght) return `${wght.start} ${wght.end}`;
  return key === 'regular' ? '400' : /^\d+$/.test(key) ? key : '400';
}

/** For a static family, the files of the other weights the styles use, so no weight is synthesized. */
function weightFiles(entry: CatalogueFace): { weight: number; url: string }[] {
  if (entry.axes?.some((a) => a.tag === 'wght')) return [];
  return WEIGHTS.filter((w) => w !== 400 && entry.files[String(w)]).map((w) => ({
    weight: w,
    url: entry.files[String(w)]!,
  }));
}

const fetchFile = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Google answered ${r.status}`);
    return r.arrayBuffer();
  });

type Loaded =
  | { status: 'idle' }
  | { status: 'loading'; family: string }
  | {
      status: 'read';
      family: string;
      reading: FontReading;
      averageAdvance: (px: number) => number;
      catalogue: CatalogueFace;
    }
  | { status: 'rendered'; family: string; note: string }
  | { status: 'failed'; family: string; note: string };

/**
 * The Type laboratory's workbench. The palette is set in the chosen face at real sizes; the face's file is
 * downloaded by the browser from Google Fonts, read for its metrics, used for rendering and then dropped. Every
 * check names its source; none of them calls a setting good.
 */
export function TypeLab({ initial, sources }: { initial: TypeState; sources: TypeSources }) {
  const [s, setS] = useState<TypeState>(initial);
  const [catalogue, setCatalogue] = useState<CatalogueFace[] | null>(null);
  const [loaded, setLoaded] = useState<Loaded>({ status: 'idle' });
  const [faceText, setFaceText] = useState(initial.face ?? '');
  // The finder opens when no face is on the bench; the Faces button brings it back at any time.
  const [finder, setFinder] = useState(initial.face === null);
  const [compare, setCompare] = useState<string[]>([]);
  const setFace = (family: string) => {
    setFaceText(family);
    update({ face: family });
    setFinder(false);
  };
  // A name typed by hand: an empty one clears the bench and leaves the finder as it is.
  const commitFace = () => {
    const family = faceText.trim();
    if (family) setFace(family);
    else update({ face: null });
  };
  const toggleCompare = (family: string) =>
    setCompare((prev) =>
      prev.includes(family)
        ? prev.filter((x) => x !== family)
        : prev.length < COMPARE_MAX
          ? [...prev, family]
          : prev,
    );
  const [notice, setNotice] = useState<string | null>(null);
  const [cplFallback, setCplFallback] = useState<number | null>(null);
  const update = (patch: Partial<TypeState>) => setS((prev) => ({ ...prev, ...patch }));
  const setStyle = (id: StyleSetting['id'], patch: Partial<StyleSetting>) =>
    setS((prev) => ({
      ...prev,
      styles: prev.styles.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));

  // The catalogue, once; without a key the page says so and a face can still be named by hand.
  useEffect(() => {
    let gone = false;
    fetch('/api/fonts')
      .then((r) => r.json())
      .then((d: { families?: unknown }) => {
        if (gone) return;
        setCatalogue(Array.isArray(d.families) ? (d.families as CatalogueFace[]) : []);
      })
      .catch(() => {
        if (!gone) setCatalogue([]);
      });
    return () => {
      gone = true;
    };
  }, []);

  // The chosen face: its file from Google, read in the browser and added to the document for rendering. The
  // faces added are removed again when the choice changes, so a face is held only while it is on the bench.
  const facesRef = useRef<FontFace[]>([]);
  useEffect(() => {
    const family = s.face;
    if (catalogue === null) return;
    if (!family) {
      setLoaded({ status: 'idle' });
      return;
    }
    let gone = false;
    const entry = catalogue.find((f) => f.family.toLowerCase() === family.toLowerCase());
    setLoaded({ status: 'loading', family });
    (async () => {
      if (!entry) {
        // Rendering only, through Google's CSS; nothing to read without the file's address.
        const id = `type-lab-css-${family.replace(/\W+/g, '-')}`;
        if (!document.getElementById(id)) {
          const link = document.createElement('link');
          link.id = id;
          link.rel = 'stylesheet';
          link.href = googleCss(family);
          document.head.appendChild(link);
        }
        if (!gone)
          setLoaded({
            status: 'rendered',
            family,
            note: `${family} is rendered through Google’s stylesheet if it exists there; its file was not read.`,
          });
        return;
      }
      try {
        const key = 'regular' in entry.files ? 'regular' : Object.keys(entry.files)[0];
        const url = key ? entry.files[key] : undefined;
        if (!key || !url) throw new Error('no file for this face');
        const extra = weightFiles(entry);
        const [buffer, engine, ...buffers] = await Promise.all([
          fetchFile(url),
          import('@sca/type-engine/font'),
          ...extra.map((w) => fetchFile(w.url)),
        ]);
        const faces = [
          new FontFace(entry.family, buffer, { weight: weightRange(entry, key) }),
          ...extra.map(
            (w, i) => new FontFace(entry.family, buffers[i]!, { weight: String(w.weight) }),
          ),
        ];
        await Promise.all(faces.map((f) => f.load()));
        const opened = engine.openFont(buffer);
        if (gone) return;
        for (const f of faces) document.fonts.add(f);
        facesRef.current = faces;
        setLoaded({
          status: 'read',
          family: entry.family,
          reading: opened.reading,
          averageAdvance: opened.averageAdvance,
          catalogue: entry,
        });
      } catch (e) {
        if (!gone)
          setLoaded({
            status: 'failed',
            family,
            note: `The file could not be read: ${(e as Error).message}`,
          });
      }
    })();
    return () => {
      gone = true;
      for (const f of facesRef.current) document.fonts.delete(f);
      facesRef.current = [];
    };
  }, [s.face, catalogue]);

  // The address mirrors the state, a beat after the last change, so a setting can be shared.
  useEffect(() => {
    const t = setTimeout(() => {
      const url = writeTypeState(s);
      if (window.location.pathname + window.location.search !== url)
        window.history.replaceState(null, '', url);
    }, 150);
    return () => clearTimeout(t);
  }, [s]);

  const steps = useMemo(() => scale(s.base, s.ratio, -2, 5), [s.base, s.ratio]);
  const px = useCallback(
    (step: number) => Math.round(s.base * s.ratio ** step * 100) / 100,
    [s.base, s.ratio],
  );
  const family = loaded.status === 'read' || loaded.status === 'rendered' ? loaded.family : null;
  const fontFamily = family ? `'${family}', serif` : 'serif';

  // Characters per line in the body column: from the file's widths when read, else measured on a canvas.
  const bodyPx = px(DEFAULT_STYLES.find((x) => x.id === 'body')!.step);
  const canvasRef = useRef<CanvasRenderingContext2D | null>(null);
  useEffect(() => {
    if (loaded.status === 'read') return;
    let gone = false;
    canvasRef.current ??= document.createElement('canvas').getContext('2d');
    const ctx = canvasRef.current;
    if (!ctx) return;
    const font = `400 ${bodyPx}px ${fontFamily}`;
    const measure = () => {
      if (gone) return;
      ctx.font = font;
      const avg = ctx.measureText('abcdefghijklmnopqrstuvwxyz ').width / 27;
      setCplFallback(avg > 0 ? charactersPerLine(s.measure - 2 * PAD, avg) : null);
    };
    // Once the family's stylesheet has delivered it, so the count is not the fallback face's.
    const ready = typeof document.fonts?.load === 'function' ? document.fonts.load(font) : null;
    if (ready) ready.then(measure, measure);
    else measure();
    return () => {
      gone = true;
    };
  }, [loaded, bodyPx, fontFamily, s.measure]);
  // A face with no advance for the alphabet (an icon or non-Latin face) gives no count rather than an error,
  // and a file the reader cannot measure gives none either; the page never fails on a count.
  const advance = useMemo(() => {
    if (loaded.status !== 'read') return null;
    try {
      return loaded.averageAdvance(bodyPx);
    } catch {
      return 0;
    }
  }, [loaded, bodyPx]);
  const cpl =
    advance === null
      ? cplFallback
      : advance > 0
        ? charactersPerLine(s.measure - 2 * PAD, advance)
        : null;
  const placement = cpl === null ? null : place(cpl, MEASURE_RANGE);

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(`${what} copied`);
    } catch {
      setNotice('Copy unavailable in this browser');
    }
  };
  const exportCss = () => {
    const lines = [
      `/* Super Colour type setting${family ? ` · ${family} from Google Fonts` : ''} */`,
      ...(family
        ? [
            `@import url('${googleCss(family, loaded.status === 'read' ? loaded.catalogue : undefined)}');`,
          ]
        : []),
      ':root {',
      `  --type-family: ${fontFamily};`,
      `  --type-base: ${s.base}px;`,
      `  --type-ratio: ${s.ratio};`,
      ...steps.map(
        (st) => `  --type-size-${st.step < 0 ? `minus-${-st.step}` : st.step}: ${st.px}px;`,
      ),
      ...s.styles.map(
        (st) =>
          `  --type-${st.id}: ${st.weight} ${px(st.step)}px/${st.leading} var(--type-family);`,
      ),
      ...s.hexes.map((h, i) => `  --palette-${i + 1}: ${h};`),
      '}',
    ];
    void copy(lines.join('\n'), 'CSS');
  };

  const cite = (c: Citation) => (
    <span>
      {c.short} ·{' '}
      <Link href={c.entry} className="underline">
        entry
      </Link>
    </span>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="type-lab">
      {/* Controls, on the Laboratory's bar. */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] px-4 py-2 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-[var(--muted)]">Face</span>
          <input
            list="type-faces"
            value={faceText}
            onChange={(e) => setFaceText(e.target.value)}
            onBlur={commitFace}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitFace();
            }}
            placeholder={catalogue?.length ? 'Search Google Fonts' : 'Family name'}
            className="field h-8 w-52 text-[0.8125rem]"
            data-testid="face"
          />
          <datalist id="type-faces">
            {(catalogue ?? []).map((f) => (
              <option key={f.family} value={f.family}>
                {f.category}
              </option>
            ))}
          </datalist>
        </label>
        <button
          type="button"
          className={`btn h-8 text-[0.8125rem] ${finder ? 'bg-[var(--fg)] text-[var(--bg)]' : ''}`}
          aria-pressed={finder}
          onClick={() => setFinder((v) => !v)}
          data-testid="faces-toggle"
        >
          Faces
        </button>
        <label className="flex items-center gap-2">
          <span className="text-[var(--muted)]">Base</span>
          <input
            type="number"
            min={LIMITS.base[0]}
            max={LIMITS.base[1]}
            step={1}
            value={s.base}
            onChange={(e) =>
              update({
                base: Math.min(
                  LIMITS.base[1],
                  Math.max(LIMITS.base[0], Number(e.target.value) || 16),
                ),
              })
            }
            className="field h-8 w-16 text-[0.8125rem]"
            aria-label="Base size in pixels"
            data-testid="base"
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-[var(--muted)]">Ratio</span>
          <select
            value={s.ratio}
            onChange={(e) => update({ ratio: Number(e.target.value) })}
            className="field h-8 text-[0.8125rem]"
            aria-label="Scale ratio"
            data-testid="ratio"
          >
            {RATIOS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.value.toFixed(3)} · {r.name}
              </option>
            ))}
            {RATIOS.some((r) => r.value === s.ratio) ? null : (
              <option value={s.ratio}>{s.ratio} · as given</option>
            )}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-[var(--muted)]">Measure</span>
          <input
            type="range"
            min={LIMITS.measure[0]}
            max={LIMITS.measure[1]}
            step={10}
            value={s.measure}
            onChange={(e) => update({ measure: Number(e.target.value) })}
            className="w-32"
            aria-label="Width of the body column in pixels"
            aria-valuetext={`${s.measure} pixels`}
            data-testid="measure"
          />
          <span className="font-mono text-xs text-[var(--muted)]">
            {s.measure} px · <span data-testid="cpl">{cpl ?? '—'}</span> per line
          </span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={s.spacing}
            onChange={(e) => update({ spacing: e.target.checked })}
            data-testid="spacing"
          />
          {TEXT_SPACING.criterion} spacing
        </label>
        <span className="flex-1" />
        <span
          className="flex items-center gap-1"
          role="group"
          aria-label="Palette"
          data-testid="type-palette"
        >
          {s.hexes.map((h, i) => (
            <span
              key={i}
              className="h-6 w-6 rounded-sm border border-[var(--line)]"
              style={{ background: h }}
            >
              <span className="sr-only">{h.toUpperCase()}</span>
            </span>
          ))}
        </span>
      </div>
      {loaded.status === 'failed' || loaded.status === 'rendered' ? (
        <p
          className="m-0 border-b border-[var(--line)] px-5 py-2 text-xs text-[var(--muted)]"
          data-testid="face-note"
        >
          {loaded.note}
        </p>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(0,1fr)_320px]">
        {/* The finder in place of the specimen while a face is being chosen; else specimen rows, one per text style. */}
        {finder ? (
          <FacesFinder
            catalogue={catalogue}
            hexes={s.hexes}
            styles={s.styles}
            px={px}
            sample={{ display: SAMPLE.display, body: SAMPLE_SHORT }}
            compare={compare}
            onCompare={toggleCompare}
            onSet={setFace}
          />
        ) : (
          <div className="min-w-0 px-5 pb-6 pt-2">
            {s.styles.map((st) => {
              const size = px(st.step);
              const leading = s.spacing
                ? Math.max(st.leading, TEXT_SPACING.lineHeight)
                : st.leading;
              const v = wcagForStyle(s.hexes[st.fg]!, s.hexes[st.bg]!, size, st.weight);
              return (
                <div
                  key={st.id}
                  className="grid grid-cols-1 gap-x-5 gap-y-2.5 border-b border-[var(--line)] py-4 sm:grid-cols-[170px_minmax(0,1fr)]"
                  data-testid="style-row"
                  data-style={st.id}
                >
                  <div className="flex flex-col gap-1.5 text-xs text-[var(--muted)]">
                    <span className="text-[0.8125rem] font-semibold text-[var(--fg)]">
                      {st.label}
                    </span>
                    <span className="font-mono text-[0.6875rem]">
                      {size} px · {st.weight} · leading {leading}
                    </span>
                    <span className="font-mono text-[0.6875rem]">
                      {v.large ? 'large text' : 'normal text'} for WCAG 2
                    </span>
                    {(['fg', 'bg'] as const).map((which) => (
                      <span
                        key={which}
                        className="flex flex-wrap items-center gap-1"
                        role="group"
                        aria-label={`${st.label} ${which === 'fg' ? 'text colour' : 'background'}`}
                      >
                        <span className="w-7">{which === 'fg' ? 'text' : 'on'}</span>
                        {s.hexes.map((h, i) => (
                          <button
                            key={i}
                            type="button"
                            aria-label={`${which === 'fg' ? 'Text' : 'Background'} ${h}`}
                            aria-pressed={st[which] === i}
                            onClick={() => setStyle(st.id, { [which]: i })}
                            className={`h-[22px] w-[22px] rounded border border-[var(--line)] ${st[which] === i ? 'outline outline-2 outline-offset-1 outline-[var(--fg)]' : ''}`}
                            style={{ background: h }}
                            data-testid={`pick-${which}`}
                          />
                        ))}
                      </span>
                    ))}
                    {st.id === 'body' && cpl !== null ? (
                      <span
                        className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[0.6875rem] ${placement === 'within' ? 'border-[var(--line)] text-[var(--fg)]' : 'border-[var(--warn)] bg-[var(--warn-soft)] text-[var(--warn)]'}`}
                        data-testid="measure-check"
                        data-placement={placement ?? undefined}
                      >
                        {cpl} per line · {placement} the cited {MEASURE_RANGE.min}–
                        {MEASURE_RANGE.max}, {MEASURE_RANGE.ideal} ideal
                      </span>
                    ) : null}
                  </div>
                  <div
                    className="min-w-0 rounded-lg px-[18px] py-3.5"
                    style={{
                      background: s.hexes[st.bg],
                      color: s.hexes[st.fg],
                      ...(st.id === 'body' ? { maxWidth: s.measure } : {}),
                    }}
                  >
                    <p
                      className="m-0 break-words"
                      style={{
                        fontFamily,
                        fontSize: size,
                        fontWeight: st.weight,
                        lineHeight: leading,
                        fontOpticalSizing: 'auto',
                        ...(s.spacing
                          ? {
                              letterSpacing: `${TEXT_SPACING.letterSpacingEm}em`,
                              wordSpacing: `${TEXT_SPACING.wordSpacingEm}em`,
                            }
                          : {}),
                      }}
                    >
                      {SAMPLE[st.id]}
                    </p>
                  </div>
                </div>
              );
            })}
            <p className="m-0 mt-3 text-xs text-[var(--muted)]">
              Each row is one text style: the face at a real size, weight and leading, set in two
              palette colours. The measure check reads the body row against Bringhurst’s range,
              quoted as his ({cite(sources.measure)}); leading is shown and not judged (
              {cite(sources.leading)}). The spacing toggle applies WCAG {TEXT_SPACING.criterion}’s
              values ({cite(sources.spacing)}). Nothing here says a setting is good.
            </p>
          </div>
        )}

        {/* Readings, as the mockup's panel: rows and tags, one short note per section; the compare tray while the finder is open. */}
        {finder ? (
          <CompareTray
            catalogue={catalogue ?? []}
            families={compare}
            hexes={s.hexes}
            body={s.styles.find((x) => x.id === 'body')!}
            bodyPx={bodyPx}
            measure={s.measure}
            pad={PAD}
            onRemove={toggleCompare}
            onSet={setFace}
          />
        ) : (
          <aside className="flex min-w-0 flex-col gap-5 border-t border-[var(--line)] bg-[var(--panel)] px-5 py-4 md:border-t-0 md:border-l">
            <section data-testid="readings">
              <h2 className="mb-2 font-mono text-[0.6875rem] tracking-[1px] text-[var(--muted)] uppercase">
                Read from the file
              </h2>
              <Readings r={loaded.status === 'read' ? loaded.reading : null} />
              <p className="m-0 mt-2 text-xs text-[var(--muted)]">
                {loaded.status === 'read'
                  ? 'Read from the file the browser downloaded from Google Fonts for this face; nothing is stored.'
                  : loaded.status === 'loading'
                    ? `Reading ${loaded.family}…`
                    : loaded.status === 'idle'
                      ? 'Choose a face to read its file.'
                      : 'Nothing read for this face.'}
              </p>
            </section>
            <section data-testid="about">
              <h2 className="mb-2 font-mono text-[0.6875rem] tracking-[1px] text-[var(--muted)] uppercase">
                About the face
              </h2>
              <dl className="m-0 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs">
                {(
                  [
                    [
                      'Family',
                      loaded.status === 'read'
                        ? (loaded.reading.family ?? loaded.family)
                        : (family ?? '—'),
                    ],
                    [
                      'Designer',
                      loaded.status === 'read'
                        ? (loaded.reading.designer ?? 'not in the file')
                        : '—',
                    ],
                    [
                      'Manufacturer',
                      loaded.status === 'read'
                        ? (loaded.reading.manufacturer ?? 'not in the file')
                        : '—',
                    ],
                    [
                      'Version',
                      loaded.status === 'read'
                        ? (loaded.reading.version ?? 'not in the file')
                        : '—',
                    ],
                    [
                      'Licence',
                      loaded.status === 'read'
                        ? (loaded.reading.license ?? 'not in the file')
                        : '—',
                    ],
                    [
                      'Category',
                      loaded.status === 'read'
                        ? `${loaded.catalogue.category} · Google Fonts’ label`
                        : '—',
                    ],
                    ['Vox-ATypI', 'not assigned · no source'],
                  ] as [string, string][]
                ).map(([k, v]) => (
                  <Row key={k} k={k} v={v} />
                ))}
              </dl>
              <p className="m-0 mt-2 text-xs text-[var(--muted)]">
                Names come from the file. The category is Google Fonts’ own label, stated as theirs.
                A Vox-ATypI class is shown only where a source assigns one.
              </p>
            </section>
            <section data-testid="scale">
              <h2 className="mb-2 font-mono text-[0.6875rem] tracking-[1px] text-[var(--muted)] uppercase">
                Scale
              </h2>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-[0.71875rem]">
                {steps.map((st) => (
                  <span key={st.step}>
                    {st.step === 0 ? <b>{st.px}</b> : st.px}
                    <span className="text-[var(--muted)]">
                      {st.step >= 0 ? '+' : ''}
                      {st.step}
                    </span>
                  </span>
                ))}
              </div>
              <p className="m-0 mt-1.5 text-xs text-[var(--muted)]">
                Base × ratio per step. Musical ratios as named by {cite(sources.ratios)}. A ratio is
                a construction; no scale is recommended.
              </p>
            </section>
            <section data-testid="contrast">
              <h2 className="mb-2 font-mono text-[0.6875rem] tracking-[1px] text-[var(--muted)] uppercase">
                Contrast per style
              </h2>
              <table className="w-full border-collapse text-xs">
                <caption className="sr-only">Contrast of each text style on its background</caption>
                <thead>
                  <tr className="text-left text-[var(--muted)]">
                    <th className="border-b border-[var(--line)] py-1 pr-2 font-medium">Style</th>
                    <th className="border-b border-[var(--line)] py-1 pr-2 font-medium">Colours</th>
                    <th className="border-b border-[var(--line)] py-1 pr-2 font-medium">WCAG 2</th>
                    <th className="border-b border-[var(--line)] py-1 font-medium">APCA · draft</th>
                  </tr>
                </thead>
                <tbody>
                  {s.styles.map((st) => {
                    const v = wcagForStyle(
                      s.hexes[st.fg]!,
                      s.hexes[st.bg]!,
                      px(st.step),
                      st.weight,
                    );
                    const lc = apcaLc(s.hexes[st.fg]!, s.hexes[st.bg]!);
                    return (
                      <tr key={st.id} data-testid="contrast-row" data-style={st.id}>
                        <td className="border-b border-[var(--line)] py-1.5 pr-2">{st.label}</td>
                        <td className="border-b border-[var(--line)] py-1.5 pr-2">
                          <span
                            className="inline-block h-3.5 w-3.5 rounded-sm border border-[var(--line)] align-[-2px]"
                            style={{ background: s.hexes[st.fg] }}
                          />
                          <span className="sr-only">{s.hexes[st.fg]}</span> on{' '}
                          <span
                            className="inline-block h-3.5 w-3.5 rounded-sm border border-[var(--line)] align-[-2px]"
                            style={{ background: s.hexes[st.bg] }}
                          />
                          <span className="sr-only">{s.hexes[st.bg]}</span>
                        </td>
                        <td className="border-b border-[var(--line)] py-1.5 pr-2 font-mono text-[0.71875rem]">
                          {v.ratio.toFixed(2)}:1 ·{' '}
                          {v.aaa.passes ? 'AAA' : v.aa.passes ? 'AA' : 'below AA'}
                        </td>
                        <td className="border-b border-[var(--line)] py-1.5 font-mono text-[0.71875rem]">
                          Lc {lc.toFixed(0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="m-0 mt-1.5 text-xs text-[var(--muted)]">
                WCAG 2 thresholds depend on size and weight: 24 px, or 18.67 px bold, counts as
                large ({cite(sources.largeText)}). APCA Lc is the WCAG 3 draft method and is
                labelled as such ({cite(sources.apca)}).
              </p>
            </section>
          </aside>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--line)] px-4 py-2 text-sm">
        <span className="text-xs text-[var(--muted)]">
          Nothing is uploaded: the face comes from Google Fonts when chosen, is read in the browser
          and discarded.
        </span>
        <span className="flex-1" />
        <span role="status" className="text-xs">
          {notice ?? ''}
        </span>
        <Link href={labFromHexes(s.hexes)} className="btn h-8 text-[0.8125rem]">
          Laboratory
        </Link>
        <button
          type="button"
          className="btn h-8 text-[0.8125rem]"
          onClick={() => void copy(window.location.href, 'Link')}
          data-testid="copy-link"
        >
          Copy link
        </button>
        <button
          type="button"
          className="btn h-8 text-[0.8125rem]"
          onClick={exportCss}
          data-testid="export-css"
        >
          Export CSS
        </button>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="text-[var(--muted)]">{k}</dt>
      <dd className="m-0 font-mono text-[0.71875rem] break-words">{v}</dd>
    </>
  );
}

function Readings({ r }: { r: FontReading | null }) {
  const em = (units: number | null | undefined) =>
    units === undefined
      ? '—'
      : units === null
        ? 'not in the file'
        : `${units} · ${asEm(units, r!.unitsPerEm).toFixed(3)} em`;
  return (
    <>
      <dl
        className="m-0 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs"
        data-testid="metrics"
      >
        <Row k="Units per em" v={r ? String(r.unitsPerEm) : '—'} />
        <Row k="x-height" v={em(r?.xHeight)} />
        <Row k="Cap height" v={em(r?.capHeight)} />
        <Row k="Ascender" v={em(r?.ascender)} />
        <Row k="Descender" v={em(r?.descender)} />
        <Row
          k="x-height / cap"
          v={
            r && r.xHeight !== null && r.capHeight !== null
              ? (r.xHeight / r.capHeight).toFixed(3)
              : '—'
          }
        />
        <Row k="Glyphs" v={r ? String(r.glyphs) : '—'} />
      </dl>
      <h3 className="mt-2.5 mb-1 text-xs font-semibold">Axes</h3>
      <Tags
        items={r ? r.axes.map((a) => `${a.tag} ${a.min}–${a.max}`) : []}
        empty={r ? 'none · a static face' : '—'}
      />
      <h3 className="mt-2.5 mb-1 text-xs font-semibold">OpenType features</h3>
      <Tags items={r?.features ?? []} empty={r ? 'none listed' : '—'} />
      <h3 className="mt-2.5 mb-1 text-xs font-semibold">Coverage · Unicode blocks</h3>
      <Tags
        items={r ? r.coverage.map((c) => `${c.block} ${c.mapped}`) : []}
        empty={r ? 'none' : '—'}
      />
    </>
  );
}

function Tags({ items, empty }: { items: string[]; empty: string }) {
  return items.length ? (
    <div className="flex flex-wrap gap-1">
      {items.map((t) => (
        <span
          key={t}
          className="rounded border border-[var(--line)] px-1.5 py-0.5 font-mono text-[0.6875rem]"
        >
          {t}
        </span>
      ))}
    </div>
  ) : (
    <p className="m-0 text-xs text-[var(--muted)]">{empty}</p>
  );
}
