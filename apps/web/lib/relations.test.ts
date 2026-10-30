import { describe, expect, test } from 'vitest';
import type { NamePoint } from './nearest';
import { relationsNear } from './relations';
import type { ColourSet } from './systems';

const pt = (id: string, oklab: [number, number, number]): NamePoint => ({
  id: `${id}-srgb`,
  conceptId: id,
  label: id.toUpperCase(),
  tradition: null,
  group: 'test',
  status: 'display-approximation',
  queue: false,
  oklab,
  hex: '#000000',
});
const points = [pt('a', [0.5, 0.1, 0]), pt('b', [0.5, -0.1, 0]), pt('c', [0.9, 0, 0])];
const sets: ColourSet[] = [
  { id: 'ab', label: 'A · B, complements', conceptIds: ['a', 'b'], kind: 'pair', source: 'src' },
  { id: 'ac', label: 'A · C', conceptIds: ['a', 'c'], kind: 'pair' },
  { id: 'ax', label: 'A · missing', conceptIds: ['a', 'x'], kind: 'pair' },
];

describe('documented relations near a palette', () => {
  test('lists a set when every member is within the distance of some column, nearest first', () => {
    const got = relationsNear(
      sets,
      points,
      [
        [0.52, 0.1, 0.01],
        [0.5, -0.12, 0],
      ],
      0.1,
    );
    expect(got.map((m) => m.set.id)).toEqual(['ab']);
    expect(got[0]!.members.map((m) => m.column)).toEqual([0, 1]);
    expect(got[0]!.members[0]!.record).toBe('a-srgb');
    expect(got[0]!.worst).toBeCloseTo(Math.hypot(0.02, 0.01), 8);
  });
  test('a member beyond the distance, or without a point, drops the set', () => {
    expect(
      relationsNear(
        sets,
        points,
        [
          [0.5, 0.1, 0],
          [0.5, -0.1, 0],
          [0.7, 0, 0],
        ],
        0.1,
      ),
    ).toHaveLength(1);
    expect(
      relationsNear(
        sets,
        points,
        [
          [0.5, 0.1, 0],
          [0.5, -0.1, 0],
          [0.9, 0, 0],
        ],
        0.1,
      ).map((m) => m.set.id),
    ).toEqual(['ab', 'ac']);
  });
  test('the distance is a search parameter, widened or tightened by the caller', () => {
    expect(
      relationsNear(
        sets,
        points,
        [
          [0.5, 0.1, 0],
          [0.5, -0.15, 0],
        ],
        0.03,
      ),
    ).toHaveLength(0);
    expect(
      relationsNear(
        sets,
        points,
        [
          [0.5, 0.1, 0],
          [0.5, -0.15, 0],
        ],
        0.06,
      ),
    ).toHaveLength(1);
  });
});
