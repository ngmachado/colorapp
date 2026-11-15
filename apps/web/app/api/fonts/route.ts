import { NextResponse } from 'next/server';
import { CATALOGUE_REVALIDATE, CATALOGUE_SOURCE, fetchCatalogue } from '@/lib/catalogue';

export type { CatalogueFace } from '@/lib/catalogue';

/**
 * The catalogue of faces for the laboratory, from `@/lib/catalogue`. Without a key the list is empty and a face
 * can still be named by hand; nothing on the page says why. The page never receives a font file from here: the
 * browser downloads the chosen face from Google and reads it there.
 */

export const revalidate = CATALOGUE_REVALIDATE;

export async function GET() {
  const key = process.env.GOOGLE_FONTS_KEY;
  if (!key)
    return NextResponse.json(
      { families: [], source: null },
      { headers: { 'cache-control': 'no-store' } },
    );
  const families = await fetchCatalogue();
  if (!families)
    return NextResponse.json(
      { families: [], source: null },
      { status: 502, headers: { 'cache-control': 'no-store' } },
    );
  return NextResponse.json(
    { families, source: CATALOGUE_SOURCE, fetchedAt: new Date().toISOString() },
    { headers: { 'cache-control': 'public, max-age=3600' } },
  );
}
