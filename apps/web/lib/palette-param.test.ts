import { describe, expect, it } from 'vitest';
import { parsePalette, parseStateExtras, stateParams } from './palette-param';

describe('palette state in the address', () => {
  it('round-trips names with commas, locks and records', () => {
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
    };
    const sp = Object.fromEntries(new URLSearchParams(stateParams(state)));
    expect(parsePalette(sp.palette)).toEqual(state.palette);
    expect(parseStateExtras(2, sp)).toEqual({
      locked: [true, false],
      labels: ['red, warm', null],
      sourceIds: ['css-rebeccapurple-srgb', null],
    });
  });
  it('ignores malformed extras', () => {
    expect(parseStateExtras(2, { locks: 'xy', names: '{not json', records: 'a' })).toEqual({
      locked: [false, false],
      labels: [null, null],
      sourceIds: ['a', null],
    });
  });
});
