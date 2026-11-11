import { NextResponse } from 'next/server';

/**
 * The catalogue of faces, from the Google Fonts Developer API, trimmed to what the laboratory needs and cached
 * for a day. Without a key the list is empty and a face can still be named by hand; nothing on the page says why. The server
 * never fetches a font file: the browser downloads the chosen face from Google and reads it there.
 */

export interface CatalogueFace {
  family: string;
  /** Google Fonts' own category, reported as theirs. */
  category: string;
  /** Variable axes as Google lists them, when the family is variable. */
  axes?: { tag: string; start: number; end: number }[];
  /** Script subsets as Google lists them (latin, cyrillic, japanese…), reported as theirs. */
  subsets: string[];
  /** TrueType file per variant, as Google serves it; the variable file is under its default variant. */
  files: Record<string, string>;
}

interface GoogleItem {
  family?: string;
  category?: string;
  axes?: { tag: string; start: number; end: number }[];
  subsets?: string[];
  files?: Record<string, string>;
}

export const revalidate = 86400;

export async function GET() {
  const key = process.env.GOOGLE_FONTS_KEY;
  if (!key)
    return NextResponse.json(
      { families: [], source: null },
      { headers: { 'cache-control': 'no-store' } },
    );
  const url = new URL('https://www.googleapis.com/webfonts/v1/webfonts');
  url.searchParams.set('key', key);
  url.searchParams.set('capability', 'VF');
  url.searchParams.set('sort', 'alpha');
  const empty = NextResponse.json(
    { families: [], source: null },
    { status: 502, headers: { 'cache-control': 'no-store' } },
  );
  let items: GoogleItem[];
  try {
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) return empty;
    const data = (await res.json()) as { items?: unknown };
    items = Array.isArray(data.items) ? (data.items as GoogleItem[]) : [];
  } catch {
    return empty;
  }
  const families: CatalogueFace[] = items
    .filter((f) => typeof f.family === 'string' && f.files && Object.keys(f.files).length)
    .map((f) => ({
      family: f.family!,
      category: f.category ?? '',
      ...(f.axes ? { axes: f.axes } : {}),
      subsets: Array.isArray(f.subsets) ? f.subsets.filter((s) => typeof s === 'string') : [],
      files: Object.fromEntries(
        Object.entries(f.files!).map(([k, v]) => [k, v.replace(/^http:\/\//, 'https://')]),
      ),
    }));
  return NextResponse.json(
    { families, source: 'Google Fonts Developer API', fetchedAt: new Date().toISOString() },
    { headers: { 'cache-control': 'public, max-age=3600' } },
  );
}
