#!/usr/bin/env node
/**
 * Downloads RIT's transcription of the 1943 Munsell renotation (real.dat) for local use by /munsell.
 *
 * The file is deliberately not in the repository. RIT's website Terms of Use
 * (https://www.rit.edu/terms-of-use, read 2026-10-30) allow one downloaded copy "for your personal,
 * noncommercial use only" and forbid copying, distributing or publishing material from the site.
 * Each developer therefore fetches their own copy, and a public deployment needs RIT's permission
 * first (the Munsell Color Science Laboratory asks to be told about uses of the data).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const URL = 'http://www.rit-mcsl.org/MunsellRenotation/real.dat';
const target = join(import.meta.dirname, '..', 'content', 'reference', 'munsell', 'real.dat');

const res = await fetch(URL, {
  headers: { 'User-Agent': 'Super Colour local setup (personal use)' },
});
if (!res.ok) {
  console.error(`download failed: ${res.status} ${res.statusText}`);
  process.exit(1);
}
const text = await res.text();
const rows = text.split('\n').filter((l) => /^\s*[0-9.]+[A-Z]+\s+\d/.test(l)).length;
if (rows < 2000) {
  console.error(`unexpected file: only ${rows} sample rows`);
  process.exit(1);
}
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, text);
console.log(`saved ${rows} samples to ${target}`);
console.log(
  'This copy is for your personal, noncommercial use under RIT’s website terms; see content/reference/munsell/README.md.',
);
