import { describe, expect, test } from 'vitest';
import type { Representation } from '@sca/knowledge';
import { orderRepresentations, primaryRepresentation } from './representations';

const rep = (id: string, source: string, extra: Partial<Representation> = {}): Representation =>
  ({
    type: 'representation',
    id,
    review_state: 'discovered',
    rights_status: 'unreviewed',
    evidence: { source, locator: 'row' },
    concept: 'c',
    space: 'srgb',
    coords: [0.5, 0.5, 0.5],
    method: 'test',
    approximation_status: 'modern-approximation',
    ...extra,
  }) as Representation;

describe('representation order', () => {
  test('a value tied to a published notation comes before a bare page value, whatever the ids say', () => {
    const wiki = rep('c-srgb-a-wikipedia', 'wikipedia-en-traditional-colors-of-japan');
    const jis = rep('c-srgb-z-jis', 'wikipedia-ja-jis-kanyo-shikimei');
    expect(orderRepresentations([wiki, jis]).map((r) => r.id)).toEqual([jis.id, wiki.id]);
    expect(primaryRepresentation([wiki, jis])?.id).toBe(jis.id);
  });
  test('otherwise ids order, and restricted or coordinate-less values are never primary', () => {
    const b = rep('c-srgb-b', 'wikipedia-en-x');
    const a = rep('c-srgb-a', 'wikipedia-en-x');
    expect(orderRepresentations([b, a]).map((r) => r.id)).toEqual([a.id, b.id]);
    const restricted = rep('c-srgb-0', 'wikipedia-en-x', { rights_status: 'verified-restricted' });
    const noCoords = rep('c-srgb-1', 'wikipedia-en-x', { coords: undefined });
    expect(primaryRepresentation([restricted, noCoords, b])?.id).toBe(b.id);
    expect(primaryRepresentation([restricted])).toBeUndefined();
  });
});
