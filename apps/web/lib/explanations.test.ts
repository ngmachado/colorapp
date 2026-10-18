import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { FORBIDDEN_CLAIMS, LABEL } from './explanations';

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|ya?ml)$/.test(name) && !name.endsWith('.test.ts')) out.push(p);
  }
  return out;
}

describe('explanations never claim a palette is harmonious or universally preferred', () => {
  const root = join(import.meta.dirname, '..', '..', '..');
  const files = [...walk(join(root, 'apps', 'web')), ...walk(join(root, 'content'))];
  test.each(files.map((f) => [f.replace(root, '')]))('%s', (rel) => {
    const text = readFileSync(join(root, rel), 'utf8');
    for (const re of FORBIDDEN_CLAIMS) expect(text, `${rel} matches ${re}`).not.toMatch(re);
  });

  test('every explanation label names what the sentence is', () => {
    expect(Object.values(LABEL)).toEqual([
      'Rule used',
      'Variable changed',
      'Recorded response',
      'Documented',
      'Measured',
      'Predicted',
    ]);
  });
});
