'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  DEFAULT_K,
  extractColours,
  SAMPLE_LIMIT,
  samplePixels,
  type Observation,
} from '@/lib/extract';
import { labFromHexes } from '@/lib/lab-links';
import { nearestPoint, type NamePoint } from '@/lib/nearest';
import { groupLabel } from '@/lib/records';

/** Longest side the image is reduced to before sampling; the reduction is stated with the result. */
const MAX_SIDE = 256;

interface Result {
  name: string;
  width: number;
  height: number;
  sampled: number;
  observations: Observation[];
  preview: string;
}

export function Extractor({ points }: { points: NamePoint[] }) {
  const [k, setK] = useState(DEFAULT_K);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handle(file: File | undefined) {
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      // The browser decodes the file; an embedded profile is applied by the decoder and the canvas
      // is sRGB, so the sampled values are the image as this browser displays it.
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { colorSpace: 'srgb' })!;
      ctx.drawImage(bitmap, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      const samples = samplePixels(data, SAMPLE_LIMIT);
      setResult({
        name: file.name,
        width: bitmap.width,
        height: bitmap.height,
        sampled: samples.length,
        observations: extractColours(samples, k),
        preview: canvas.toDataURL('image/png'),
      });
      bitmap.close();
    } catch (e) {
      setError(`Could not read that image: ${e instanceof Error ? e.message : String(e)}`);
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  const hexes = result?.observations.map((o) => o.hex) ?? [];
  return (
    <div className="flex flex-col gap-6">
      <form className="flex flex-wrap items-end gap-4" onSubmit={(e) => e.preventDefault()}>
        <label className="flex flex-col gap-1 text-xs">
          Image file (stays in this browser)
          <input
            type="file"
            accept="image/*"
            className="field h-9 max-w-xs text-sm"
            onChange={(e) => handle(e.target.files?.[0])}
            data-testid="extract-file"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          Colours to find
          <select
            value={k}
            onChange={(e) => setK(Number(e.target.value))}
            className="field h-9 text-sm"
            aria-label="Number of colours to find"
            data-testid="extract-k"
          >
            {[2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        {busy ? <span className="text-sm text-[var(--muted)]">Measuring…</span> : null}
        {error ? (
          <span role="alert" className="text-sm text-[var(--danger)]">
            {error}
          </span>
        ) : null}
      </form>
      <p className="m-0 max-w-[80ch] text-xs text-[var(--muted)]">
        Method: the image is reduced to at most {MAX_SIDE} px on its longest side, at most{' '}
        {SAMPLE_LIMIT.toLocaleString()} opaque pixels are sampled on a grid, converted from sRGB to
        OKLab and grouped into the chosen number of clusters by k-means with a fixed start, so the
        same image gives the same result. An embedded colour profile is applied by the browser’s
        decoder; an untagged image is treated as sRGB. Each observation is a cluster mean, not a
        pixel that exists in the image.
      </p>
      {result ? (
        <div className="grid gap-6 md:grid-cols-[256px_1fr]" data-testid="extract-result">
          <figure className="m-0 flex flex-col gap-2">
            {/* The reduced copy the measurement used; a data URL from the same canvas. */}
            <img
              src={result.preview}
              alt=""
              className="w-full rounded-md border border-[var(--line)]"
            />
            <figcaption className="text-xs text-[var(--muted)]">
              {result.name} · {result.width}×{result.height} px · {result.sampled.toLocaleString()}{' '}
              pixels sampled
            </figcaption>
          </figure>
          <div className="flex flex-col gap-4">
            <div
              className="flex h-12 overflow-hidden rounded-md"
              role="img"
              aria-label="Observed colours by share"
            >
              {result.observations.map((o) => (
                <span key={o.hex} style={{ background: o.hex, flex: `${o.share} 1 0%` }} />
              ))}
            </div>
            <ol className="m-0 flex list-none flex-col gap-2 p-0">
              {result.observations.map((o, i) => {
                const near = nearestPoint(points, o.oklab);
                return (
                  <li
                    key={o.hex}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
                    data-testid="observation"
                    data-hex={o.hex}
                    data-share={o.share.toFixed(3)}
                  >
                    <span
                      className="h-8 w-8 shrink-0 rounded-md border border-[var(--line)]"
                      style={{ background: o.hex }}
                      aria-hidden="true"
                    />
                    <span className="font-mono">
                      {i + 1}. {o.hex.toUpperCase()} · {(o.share * 100).toFixed(1)}%
                    </span>
                    <span className="font-mono text-xs text-[var(--muted)]">
                      oklab {o.oklab.map((n) => n.toFixed(3)).join(' ')}
                    </span>
                    <Link href={`/colour/${o.hex.slice(1)}`} className="text-xs underline">
                      Inspect
                    </Link>
                    {near ? (
                      <span className="text-xs text-[var(--muted)]" data-testid="observation-near">
                        nearest record:{' '}
                        <Link href={`/dictionary/${near.conceptId}`} className="underline">
                          {near.label}
                        </Link>{' '}
                        ({groupLabel(near.group)}) at {near.distance.toFixed(3)} · a search, not a
                        name
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ol>
            {hexes.length >= 2 ? (
              <div className="flex flex-wrap gap-3">
                <Link
                  href={labFromHexes(hexes.slice(0, 5))}
                  className="btn"
                  data-testid="extract-to-lab"
                >
                  Open in Laboratory
                </Link>
                <Link href={`/space?hex=${hexes.map((h) => h.slice(1)).join(',')}`} className="btn">
                  On the map
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
