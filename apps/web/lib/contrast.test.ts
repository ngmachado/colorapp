import { describe, expect, test } from 'vitest';
import { contrastGrade, oklchOfHex, parseHex } from './contrast';

describe('parseHex', () => {
  test('accepts 6 and 3 digits with or without a hash', () => {
    expect(parseHex('#663399')).toBe('#663399');
    expect(parseHex('663399')).toBe('#663399');
    expect(parseHex(' #639 ')).toBe('#663399');
    expect(parseHex('ABC')).toBe('#aabbcc');
  });
  test('rejects anything else', () => {
    expect(parseHex('#66339')).toBeNull();
    expect(parseHex('rebeccapurple')).toBeNull();
    expect(parseHex('#gggggg')).toBeNull();
  });
});

describe('oklchOfHex', () => {
  test('white and black stay in the generator domain with hue 0', () => {
    expect(oklchOfHex('#ffffff')).toEqual([1, 0, 0]);
    expect(oklchOfHex('#000000')).toEqual([0, 0, 0]);
  });
  test('rebeccapurple round-trips to a purple hue', () => {
    const [l, c, h] = oklchOfHex('#663399');
    expect(l).toBeCloseTo(0.44, 1);
    expect(c).toBeGreaterThan(0.1);
    expect(h).toBeGreaterThan(290);
    expect(h).toBeLessThan(320);
  });
});

describe('contrastGrade', () => {
  test('uses the WCAG 2.1 thresholds', () => {
    expect(contrastGrade(21)).toBe('AAA');
    expect(contrastGrade(7)).toBe('AAA');
    expect(contrastGrade(6.99)).toBe('AA');
    expect(contrastGrade(4.5)).toBe('AA');
    expect(contrastGrade(3)).toBe('AA large');
    expect(contrastGrade(2.99)).toBe('below 3');
  });
});
