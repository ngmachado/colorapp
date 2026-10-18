/** Links into the Laboratory that start from documented records rather than from a draw. */

/** Opens the Laboratory with these concepts as columns, in this order, each locked and named. */
export function labFromConcepts(conceptIds: string[]): string {
  return `/lab?from=${conceptIds.map(encodeURIComponent).join(',')}`;
}

/** Opens the Laboratory with these hex colours as columns. */
export function labFromHexes(hexes: string[]): string {
  return `/lab?hex=${hexes.map((h) => h.replace('#', '')).join(',')}`;
}

/** Hex codes found in free text, six digits each, in order of appearance. */
export function hexesIn(text: string): string[] {
  return [...text.matchAll(/(?:#|\b)([0-9a-f]{6})\b/gi)].map((m) => `#${m[1]!.toLowerCase()}`);
}
