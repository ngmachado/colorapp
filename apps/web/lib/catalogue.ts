/**
 * The catalogue of faces from the Google Fonts Developer API, trimmed to what the laboratory and the MCP
 * server need and cached for a day. Without a key there is no catalogue; the page and the server each say
 * only what that means for the reader, never why.
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

export const CATALOGUE_SOURCE = 'Google Fonts Developer API';
export const CATALOGUE_REVALIDATE = 86400;

/**
 * The families Google lists, or null when there is no key or Google did not answer. Fetched through Next's
 * data cache, so the two callers share one request a day.
 */
export async function fetchCatalogue(): Promise<CatalogueFace[] | null> {
  const key = process.env.GOOGLE_FONTS_KEY;
  if (!key) return null;
  const url = new URL('https://www.googleapis.com/webfonts/v1/webfonts');
  url.searchParams.set('key', key);
  url.searchParams.set('capability', 'VF');
  url.searchParams.set('sort', 'alpha');
  let items: GoogleItem[];
  try {
    const res = await fetch(url, { next: { revalidate: CATALOGUE_REVALIDATE } });
    if (!res.ok) return null;
    const data = (await res.json()) as { items?: unknown };
    items = Array.isArray(data.items) ? (data.items as GoogleItem[]) : [];
  } catch {
    return null;
  }
  return items
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
}

/** The family's main file, as the page picks it: the regular (the variable file sits there), else the first. */
export function mainFile(f: CatalogueFace): { key: string; url: string } | null {
  const key = 'regular' in f.files ? 'regular' : Object.keys(f.files)[0];
  return key && f.files[key] ? { key, url: f.files[key]! } : null;
}
