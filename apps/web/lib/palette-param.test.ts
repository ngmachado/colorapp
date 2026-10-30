import { describe, expect, it } from 'vitest';
import { parsePairs, parsePalette, parseStateExtras, stateParams } from './palette-param';

describe('palette state in the address', () => {
  it('round-trips names with commas, locks, records and intended pairs', () => {
    const state = {
      palette: [
        [0.5, 0.1, 20],
        [0.7, 0.2, 200],
      ] as [number, number, number][],
      structure: 'complementary',
      seed: 7,
      locked: [true, false],
      labels: ['red, warm', null],
      sourceIds: ['css-rebeccapurple-srgb', null],
      weights: [7, 3],
      pairs: [[0, 1]] as [number, number][],
    };
    const sp = Object.fromEntries(new URLSearchParams(stateParams(state)));
    expect(sp.pairs).toBe('0-1');
    expect(parsePalette(sp.palette)).toEqual(state.palette);
    expect(parseStateExtras(2, sp)).toEqual({
      locked: [true, false],
      labels: ['red, warm', null],
      sourceIds: ['css-rebeccapurple-srgb', null],
      weights: [7, 3],
      pairs: [[0, 1]],
    });
  });
  it('ignores malformed extras', () => {
    expect(parseStateExtras(2, { locks: 'xy', names: '{not json', records: 'a' })).toEqual({
      locked: [false, false],
      labels: [null, null],
      sourceIds: ['a', null],
      weights: [1, 1],
      pairs: [],
    });
  });
  it('drops pairs that name a missing column, the same column twice, or repeat', () => {
    expect(parsePairs('0-1,1-0,2-0,1-1,0-1,x-y', 2)).toEqual([
      [0, 1],
      [1, 0],
    ]);
    expect(
      stateParams({ palette: [[0.5, 0, 0]], structure: 'free-form', seed: 1, pairs: [] }),
    ).not.toContain('pairs');
  });
});

it('defaults old palettes and malformed area weights to equal areas', () => {
  for (const weights of [undefined, '0,2', '-1,2', 'NaN,2', '101,2', '1.5,2', '7', '7,2,1']) {
    expect(parseStateExtras(2, { weights }).weights).toEqual([1, 1]);
  }
});
