import type { Metadata } from 'next';
import Link from 'next/link';
import type { Concept, Source } from '@sca/knowledge';
import { TypeLab, type TypeSources } from '@/components/type/type-lab';
import { Toolbar } from '@/components/toolbar';
import { knowledge } from '@/lib/knowledge';
import { labFromHexes } from '@/lib/lab-links';
import { readTypeState, writeTypeState } from '@/lib/type-state';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Type laboratory · Super Colour',
  description:
    'Set a palette in an open-licence face at real sizes, read the face’s metrics from its file, and check measure, spacing and contrast against documented sources.',
};

type Params = Record<string, string | string[] | undefined>;

/** "W3C" for a body with a short abbreviation in brackets, else the first author's surname. */
function shortAuthor(author: string): string {
  const abbreviation = /\(([A-Z0-9]{2,6})\)/.exec(author)?.[1];
  if (abbreviation) return abbreviation;
  return author.split(/,| \(/)[0]!.trim().split(' ').pop()!;
}

/**
 * A documented claim the laboratory checks against, with its citation, as text for the client. The locator is
 * printed only once it has been checked against the cited edition; until then the entry alone carries it.
 */
function cite(id: string, short: string, locator = ''): TypeSources[keyof TypeSources] {
  const k = knowledge();
  const c = k.record(id) as Concept | undefined;
  if (!c) throw new Error(`type laboratory: missing record ${id}`);
  const s = k.record(c.evidence.source) as Source;
  return {
    label: c.label,
    claim: c.description ?? '',
    locator: c.evidence.locator ?? '',
    // A short name and the title here; the entry carries the full bibliographic record.
    source: `${shortAuthor(s.author)}, ${s.title.split(':')[0]}${s.edition ? `, ${s.edition.split(' (')[0]}` : ''}`,
    url: s.url,
    short: locator && c.review_state !== 'discovered' ? `${short}, ${locator}` : short,
    entry: `/dictionary/${c.id}`,
  };
}

/**
 * The Type laboratory: the palette set in a face from Google Fonts at real sizes, the face read from its file in
 * the browser, and measure, spacing and contrast checked against cited sources. Nothing is uploaded or stored.
 */
export default async function Type({ searchParams }: { searchParams: Promise<Params> }) {
  const initial = readTypeState(await searchParams);
  const sources: TypeSources = {
    // The short form is what the page prints; the entry carries the full record and locator.
    measure: cite('type-measure', 'Bringhurst, v4.0', '§2.1.2'),
    leading: cite('type-leading', 'Bringhurst, v4.0', '§2.2'),
    ratios: cite('type-scale-ratios', 'Bringhurst, v4.0', 'ch. 8'),
    spacing: cite('type-text-spacing', 'WCAG 2.2', 'SC 1.4.12'),
    largeText: cite('type-contrast-large-text', 'WCAG 2.2', 'SC 1.4.3 and 1.4.6'),
    apca: cite('type-contrast-apca', 'apca-w3 0.1.9'),
  };
  return (
    <>
      <Toolbar current="/type" middle="Type laboratory">
        <Link href={labFromHexes(initial.hexes)} className="btn" data-testid="type-lab-link">
          Open palette in Laboratory
        </Link>
      </Toolbar>
      <main id="main" className="flex min-h-0 flex-1 flex-col">
        <TypeLab key={writeTypeState(initial)} initial={initial} sources={sources} />
      </main>
    </>
  );
}
