import { describe, expect, test } from 'vitest';
import { DEFAULT_HEXES, DEFAULT_STYLES, readTypeState, writeTypeState } from './type-state';

describe('type state in the address', () => {
  test('a bare address gives the defaults and writes back as /type', () => {
    const s = readTypeState({});
    expect(s).toMatchObject({ face: null, base: 16, ratio: 1.25, measure: 640, spacing: false });
    expect(s.hexes).toEqual(DEFAULT_HEXES);
    expect(s.styles).toEqual(DEFAULT_STYLES);
    expect(writeTypeState(s)).toBe('/type');
  });
  test('round-trips a full setting and clamps numbers to their limits', () => {
    const s = readTypeState({
      face: 'Fraunces',
      base: '18',
      ratio: '1.333',
      measure: '720',
      hex: '112233,ffffff,aabbcc',
      styles: '0-1,0-1,1-0,2-1',
      spacing: '1',
    });
    expect(s.face).toBe('Fraunces');
    expect(s.hexes).toEqual(['#112233', '#ffffff', '#aabbcc']);
    expect(s.styles.map((x) => `${x.fg}-${x.bg}`)).toEqual(['0-1', '0-1', '1-0', '2-1']);
    const url = writeTypeState(s);
    expect(url).toBe(
      '/type?face=Fraunces&base=18&ratio=1.333&measure=720&hex=112233,ffffff,aabbcc&styles=0-1,0-1,1-0,2-1&spacing=1',
    );
    expect(readTypeState(Object.fromEntries(new URL(url, 'http://x').searchParams))).toEqual(s);
    expect(readTypeState({ base: '999', ratio: '0', measure: '-5' })).toMatchObject({
      base: 32,
      ratio: 1.05,
      measure: 240,
    });
  });
  test('a short palette keeps every style inside it', () => {
    const s = readTypeState({ hex: '663399,ffffff,000000' });
    for (const st of s.styles) {
      expect(st.fg).toBeLessThan(3);
      expect(st.bg).toBeLessThan(3);
    }
    for (const st of s.styles) expect(st.fg).not.toBe(st.bg);
    expect(s.styles.find((x) => x.id === 'body')).toMatchObject({ fg: 0, bg: 2 });
  });
  test('malformed styles and a one-colour palette fall back without throwing', () => {
    const s = readTypeState({ hex: 'ff0000', styles: '9-9,x,1-0' });
    expect(s.hexes).toEqual(DEFAULT_HEXES);
    expect(s.styles[0]).toEqual(DEFAULT_STYLES[0]);
    expect(s.styles[2]).toMatchObject({ fg: 1, bg: 0 });
  });
  test('a style naming one colour for text and ground falls back as a malformed one', () => {
    const s = readTypeState({ hex: '663399,ffffff,000000', styles: '0-0,1-1,2-2,0-1' });
    for (const st of s.styles) expect(st.fg).not.toBe(st.bg);
    expect(s.styles[3]).toMatchObject({ fg: 0, bg: 1 });
  });
});
