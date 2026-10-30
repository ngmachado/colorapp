// Generate knowledge records for the 269 conventional colour names (慣用色名) of JIS Z 8102:2001 from a saved
// copy of the Japanese Wikipedia page JIS慣用色名, which lists each name with the standard's Munsell notation and a
// reference sRGB hex of its own. Readings come from the furigana on that page, then from a saved copy of 日本の色の一覧,
// then from the editor table below (flagged in the record).
//
//   node scripts/import-jis-z8102.mjs <jis.html> <ichiran.html> [check.json] > content/knowledge/japanese/jis-z8102.yaml
//
// 日本の色の一覧 also supplies a second sRGB value for the names it shares with the standard; it becomes a second
// representation so the two pages' disagreement stays visible. The optional check file is written by
// apps/web/scripts/check-jis-munsell.ts (two passes: generate, check, generate again) and adds, per record, the
// CIEDE2000 difference between each page value and the colour the standard's Munsell notation interpolates to in
// the 1943 renotation table, and between the two page values.
//
// The output is review state `discovered`, rights `unreviewed`: a Wikipedia discovery route, never more.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE = 'wikipedia-ja-jis-kanyo-shikimei';
const ICHIRAN = 'wikipedia-ja-nihon-no-iro-ichiran';
const [jisPath, ichiranPath, checkPath] = process.argv.slice(2);
const check = checkPath ? JSON.parse(readFileSync(checkPath, 'utf8')) : null;
if (!jisPath || !ichiranPath) {
  console.error('usage: import-jis-z8102.mjs <jis.html> <ichiran.html>');
  process.exit(2);
}

// Concepts that already exist in content/knowledge/japanese: the JIS value attaches to them as a second representation.
const EXISTING = {
  藍色: { id: 'ja-ai', label: '藍色' },
  紫: { id: 'ja-murasaki', label: '紫' },
  鶯色: { id: 'ja-uguisu-iro', label: '鶯色' },
  浅葱色: { id: 'ja-asagi', label: '浅葱色' },
  狐色: { id: 'ja-kitsune-iro', label: '狐色' },
  桜色: { id: 'ja-sakura-iro', label: '桜色' },
  萌黄: { id: 'ja-moegi', label: '萌黄' },
  紅: { id: 'ja-beni', label: '紅' },
  白: { id: 'ja-shiro', label: '白' },
  蘇芳: { id: 'ja-suo', label: '蘇芳' },
  青: { id: 'ja-ao', label: '青' },
  // The existing record spells kachi-iro 褐色; JIS spells the same dark indigo 勝色.
  勝色: { id: 'ja-kachi-iro', label: '褐色' },
};

// Readings supplied by the editor for names the two pages leave unread. Each record that uses one says so.
// Notes for names that need one.
const NOTES = {
  褐色: 'Same kanji as ja-kachi-iro (かちいろ, a dark indigo). JIS Z 8102 reads 褐色 as かっしょく and lists a brown; they are different colours.',
};

const EDITOR_READINGS = {
  褐色: 'かっしょく',
  紅海老茶: 'べにえびちゃ',
  海老茶: 'えびちゃ',
  金赤: 'きんあか',
  赤茶: 'あかちゃ',
  赤錆色: 'あかさびいろ',
  黄赤: 'きあか',
  黄茶: 'きちゃ',
  灰茶: 'はいちゃ',
  土色: 'つちいろ',
  卵色: 'たまごいろ',
  砂色: 'すないろ',
  中黄: 'ちゅうき',
  抹茶色: 'まっちゃいろ',
  黄緑: 'きみどり',
  鉄色: 'てついろ',
  紺藍: 'こんあい',
  茶鼠: 'ちゃねずみ',
  黒茶: 'くろちゃ',
  墨: 'すみ',
  鉄黒: 'てつぐろ',
  るり紺: 'るりこん',
  なす紺: 'なすこん',
  すす竹色: 'すすたけいろ',
  金色: 'きんいろ',
  銀色: 'ぎんいろ',
};

const strip = (s) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\u00a0/g, ' ')
    .trim();
const body = (path) => {
  const h = readFileSync(path, 'utf8');
  return h.slice(h.indexOf('mw-content-text'));
};
const rows = (html) => [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => m[1]);

const jis = [];
for (const r of rows(body(jisPath))) {
  const cells = [...r.matchAll(/<(td|th)[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => m[2]);
  if (cells.length !== 3) continue;
  const name = strip(cells[1]);
  if (!name || name === '色名' || name === '慣用色名') continue;
  const hex = cells[0].match(/#([0-9A-Fa-f]{6})/)?.[1]?.toUpperCase() ?? null;
  jis.push({ name, hex, munsell: strip(cells[2]) });
}
if (jis.length !== 269) throw new Error(`expected 269 JIS rows, parsed ${jis.length}`);

const ichiran = new Map();
for (const r of rows(body(ichiranPath))) {
  const cells = [...r.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
  if (cells.length !== 3) continue;
  const parts = cells[1].split(/<br[^>]*>/);
  if (parts.length < 2) continue;
  const name = strip(parts.at(-1));
  const reading = strip(parts[0]).split('/')[0];
  const hex = cells[0].match(/#([0-9A-Fa-f]{6})/)?.[1]?.toUpperCase() ?? null;
  if (name && reading && !ichiran.has(name)) ichiran.set(name, { name, reading, hex });
}

/** The same page by reading, for names the standard spells differently (とき色 for the page's 鴇色). */
const ichiranByReading = new Map();
for (const e of ichiran.values())
  if (!ichiranByReading.has(e.reading)) ichiranByReading.set(e.reading, e);

// ---------- readings ----------
const hasKanji = (s) => /[一-鿿]/.test(s);

/** Base name without furigana, plus the reading when the page gives enough furigana to read every kanji. */
function readName(raw) {
  const base = raw.replace(/（[^）]*）/g, '');
  let reading = raw.replace(/([^（）]+?)（([^）]+)）/g, (_, kanji, furi) => {
    // Furigana reads the kanji run immediately before it; kana before that run stay as written.
    const run = kanji.match(/[一-鿿]+$/)?.[0] ?? kanji;
    return kanji.slice(0, kanji.length - run.length) + furi;
  });
  reading = reading.replace(/色$/, 'いろ');
  let origin = 'page';
  if (hasKanji(reading)) {
    if (ichiran.has(base)) {
      reading = ichiran.get(base).reading;
      origin = 'ichiran';
    } else if (EDITOR_READINGS[base]) {
      reading = EDITOR_READINGS[base];
      origin = 'editor';
    } else {
      reading = null;
      origin = 'none';
    }
  }
  return { base, reading, origin };
}

// ---------- Hepburn ----------
const KANA = {
  あ: 'a',
  い: 'i',
  う: 'u',
  え: 'e',
  お: 'o',
  か: 'ka',
  き: 'ki',
  く: 'ku',
  け: 'ke',
  こ: 'ko',
  さ: 'sa',
  し: 'shi',
  す: 'su',
  せ: 'se',
  そ: 'so',
  た: 'ta',
  ち: 'chi',
  つ: 'tsu',
  て: 'te',
  と: 'to',
  な: 'na',
  に: 'ni',
  ぬ: 'nu',
  ね: 'ne',
  の: 'no',
  は: 'ha',
  ひ: 'hi',
  ふ: 'fu',
  へ: 'he',
  ほ: 'ho',
  ま: 'ma',
  み: 'mi',
  む: 'mu',
  め: 'me',
  も: 'mo',
  や: 'ya',
  ゆ: 'yu',
  よ: 'yo',
  ら: 'ra',
  り: 'ri',
  る: 'ru',
  れ: 're',
  ろ: 'ro',
  わ: 'wa',
  ゐ: 'i',
  ゑ: 'e',
  を: 'o',
  が: 'ga',
  ぎ: 'gi',
  ぐ: 'gu',
  げ: 'ge',
  ご: 'go',
  ざ: 'za',
  じ: 'ji',
  ず: 'zu',
  ぜ: 'ze',
  ぞ: 'zo',
  だ: 'da',
  ぢ: 'ji',
  づ: 'zu',
  で: 'de',
  ど: 'do',
  ば: 'ba',
  び: 'bi',
  ぶ: 'bu',
  べ: 'be',
  ぼ: 'bo',
  ぱ: 'pa',
  ぴ: 'pi',
  ぷ: 'pu',
  ぺ: 'pe',
  ぽ: 'po',
  きゃ: 'kya',
  きゅ: 'kyu',
  きょ: 'kyo',
  しゃ: 'sha',
  しゅ: 'shu',
  しょ: 'sho',
  しぇ: 'she',
  ちゃ: 'cha',
  ちゅ: 'chu',
  ちょ: 'cho',
  ちぇ: 'che',
  にゃ: 'nya',
  にゅ: 'nyu',
  にょ: 'nyo',
  ひゃ: 'hya',
  ひゅ: 'hyu',
  ひょ: 'hyo',
  みゃ: 'mya',
  みゅ: 'myu',
  みょ: 'myo',
  りゃ: 'rya',
  りゅ: 'ryu',
  りょ: 'ryo',
  ぎゃ: 'gya',
  ぎゅ: 'gyu',
  ぎょ: 'gyo',
  じゃ: 'ja',
  じゅ: 'ju',
  じょ: 'jo',
  じぇ: 'je',
  びゃ: 'bya',
  びゅ: 'byu',
  びょ: 'byo',
  ぴゃ: 'pya',
  ぴゅ: 'pyu',
  ぴょ: 'pyo',
  てぃ: 'ti',
  でぃ: 'di',
  でゅ: 'dyu',
  ふぁ: 'fa',
  ふぃ: 'fi',
  ふぇ: 'fe',
  ふぉ: 'fo',
  うぃ: 'wi',
  うぇ: 'we',
  うぉ: 'wo',
  ゔぁ: 'va',
  ゔぃ: 'vi',
  ゔ: 'vu',
  ゔぇ: 've',
  ゔぉ: 'vo',
  つぁ: 'tsa',
  つぃ: 'tsi',
  つぇ: 'tse',
  つぉ: 'tso',
  とぅ: 'tu',
  どぅ: 'du',
  いぇ: 'ye',
};
const toHiragana = (s) =>
  s.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
const LONG = { a: 'ā', i: 'ī', u: 'ū', e: 'ē', o: 'ō' };

function hepburn(kana) {
  const katakana = /[\u30a0-\u30ff]/.test(kana);
  const s = toHiragana(kana);
  let out = '';
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === 'っ') {
      const next = hepburn(s.slice(i + 1, i + 3));
      out += next.startsWith('ch') ? 't' : next[0];
      i++;
      continue;
    }
    if (ch === 'ん') {
      const next = s[i + 1];
      out += next && /[あいうえおやゆよ]/.test(next) ? "n'" : 'n';
      i++;
      continue;
    }
    if (ch === 'ー') {
      const last = out.at(-1);
      out = out.slice(0, -1) + (LONG[last] ?? last);
      i++;
      continue;
    }
    const two = s.slice(i, i + 2);
    if (two.length === 2 && KANA[two]) {
      out += KANA[two];
      i += 2;
      continue;
    }
    if (KANA[ch]) {
      // Long vowels in native words: おう → ō, うう → ū (えい stays ei).
      const romaji = KANA[ch];
      const last = out.at(-1);
      if (
        !katakana &&
        ((ch === 'う' && (last === 'o' || last === 'u')) || (ch === 'お' && last === 'o'))
      ) {
        out = out.slice(0, -1) + LONG[last];
      } else out += romaji;
      i++;
      continue;
    }
    throw new Error(`cannot romanise ${kana} at ${ch}`);
  }
  return out;
}

const withIro = (romaji, base) =>
  romaji.endsWith('iro') && base.endsWith('色')
    ? romaji.slice(0, -3).replace(/'$/, '') + '-iro'
    : romaji;

const slug = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ']/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// ---------- existing ids ----------
const ids = new Set();
const walk = (dir) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.yaml') && !f.endsWith('jis-z8102.yaml'))
      for (const m of readFileSync(p, 'utf8').matchAll(/^\s*id:\s*([a-z0-9-]+)\s*$/gm))
        ids.add(m[1]);
  }
};
walk('content/knowledge');

// ---------- check results ----------
const DE = (n) => n.toFixed(1);
/** What the renotation check found for a record's JIS value, as a sentence, or nothing without a check file. */
function munsellNote(id) {
  const c = check?.concepts?.[id]?.munsell;
  if (!c) return '';
  stats.checked++;
  const parts = [
    `Checked on ${check.date} against the 1943 Munsell renotation (RIT transcription, interpolated at the notation, Bradford-adapted to D65): CIEDE2000 difference ${DE(c.deltaE2000)} between this value and the notation's colour`,
  ];
  if (c.beyond)
    parts.push(
      'the notation lies beyond the tabulated chroma, so the check used the highest tabulated chroma',
    );
  if (c.mapped) parts.push("the notation's colour lies outside sRGB");
  return ' ' + parts.join('; ') + '.';
}
/** The two pages' values compared, for the second representation. */
function pagesNote(id, ichiranHex, jisHex) {
  const base = `The page JIS慣用色名 lists #${jisHex} for the same name (see the representation that cites it).`;
  const c = check?.concepts?.[id];
  if (!c?.pages) return base;
  const munsell = c.ichiranMunsell
    ? ` CIEDE2000 difference ${DE(c.ichiranMunsell.deltaE2000)} between this value and the colour of the standard's notation (same check as the other representation).`
    : '';
  return `${base} CIEDE2000 difference ${DE(c.pages.deltaE2000)} between the two pages' values.${munsell}`;
}

// ---------- records ----------
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const coords = (hex) =>
  [0, 2, 4].map((k) => (parseInt(hex.slice(k, k + 2), 16) / 255).toFixed(5)).join(', ');
const out = [];
out.push(
  '# yaml-language-server: $schema=../schema.json',
  '# Conventional colour names of JIS Z 8102:2001 Appendix 1 (269 names), generated by scripts/import-jis-z8102.mjs from a',
  '# saved copy of the Japanese Wikipedia page JIS慣用色名. Everything here is in review state `discovered`: the names and',
  '# Munsell notations are read from that page, the sRGB values are the page\'s own reference values ("参考"), and the',
  "# readings come from the page's furigana, from 日本の色の一覧, or from the editor (flagged in the record). Do not edit",
  '# by hand; rerun the script.',
  '',
);
const stats = {
  attached: 0,
  created: 0,
  noValue: 0,
  ichiran: 0,
  checked: 0,
  readings: { page: 0, ichiran: 0, editor: 0, none: 0 },
};
const used = new Set(ids);
const missing = [];
for (const row of jis) {
  const { base, reading, origin } = readName(row.name);
  const existing = EXISTING[base]?.id;
  if (!existing) stats.readings[origin]++;
  if (!reading && !existing) {
    missing.push(row.name);
    continue;
  }
  let id = existing;
  if (!id) {
    const romaji = hepburn(reading);
    id = 'ja-' + slug(withIro(romaji, base));
    let n = 2;
    const stem = id;
    while (used.has(id)) id = `${stem}-${n++}`;
    used.add(id);
  }
  const locator = `table row ${row.name}${row.munsell && row.munsell !== '-' ? `, Munsell ${row.munsell}` : ''}`;
  const munsell = row.munsell && row.munsell !== '-' ? row.munsell : null;
  if (!existing) {
    stats.created++;
    const romaji = hepburn(reading);
    const value = withIro(romaji, base);
    out.push(
      '- type: concept',
      `  id: ${id}`,
      '  review_state: discovered',
      '  rights_status: unreviewed',
      `  evidence: { source: ${SOURCE}, locator: ${q(locator)} }`,
      `  label: ${q(base)}`,
      `  description: ${q(
        `Conventional colour name (慣用色名) in Appendix 1 of JIS Z 8102:2001, Names of non-luminous object colours` +
          (munsell
            ? `; the cited page gives the standard's Munsell notation ${munsell}.`
            : '; the standard gives no Munsell notation for it.'),
      )}`,
      `  tags: { tradition: japanese, language: ja, standard: jis-z8102${munsell ? `, munsell: ${q(munsell)}` : ''} }`,
      ...(NOTES[base] ? [`  notes: ${q(NOTES[base])}`] : []),
      '',
      '- type: name',
      `  id: ${id}-name`,
      '  review_state: discovered',
      '  rights_status: unreviewed',
      `  evidence: { source: ${SOURCE}, locator: ${q(`table row ${row.name}`)} }`,
      `  concept: ${id}`,
      `  script: ${q(base)}`,
      '  language: ja',
      `  transliteration: { system: Hepburn, value: ${q(value)} }`,
      `  confidence: { transcription: ${origin === 'page' ? 1 : origin === 'ichiran' ? 0.9 : 0.7} }`,
      ...(origin === 'page'
        ? row.name !== base
          ? [`  notes: ${q(`Reading from the furigana on the cited page: ${row.name}.`)}`]
          : []
        : origin === 'ichiran'
          ? [
              `  notes: ${q(`The cited page gives no reading; ${reading} is the reading listed for ${base} on the Japanese Wikipedia page 日本の色の一覧 (wikipedia-ja-nihon-no-iro-ichiran).`)}`,
            ]
          : [
              `  notes: ${q(`The cited page gives no reading; ${reading} is the editor's reading and has not been checked against a source.`)}`,
            ]),
      '',
    );
  } else {
    stats.attached++;
    if (EXISTING[base].label !== base) {
      out.push(
        '- type: name',
        `  id: ${id}-name-jis`,
        '  review_state: discovered',
        '  rights_status: unreviewed',
        `  evidence: { source: ${SOURCE}, locator: ${q(`table row ${row.name}`)} }`,
        `  concept: ${id}`,
        `  script: ${q(base)}`,
        '  language: ja',
        `  transliteration: { system: Hepburn, value: ${q(withIro(hepburn(reading), base))} }`,
        '  confidence: { transcription: 1 }',
        `  notes: ${q(`Spelling used by JIS Z 8102:2001 for the colour the existing record spells ${EXISTING[base].label}.`)}`,
        '',
      );
    }
  }
  if (row.hex && munsell) {
    out.push(
      '- type: representation',
      `  id: ${id}-srgb-jis`,
      '  review_state: discovered',
      '  rights_status: unreviewed',
      `  evidence: { source: ${SOURCE}, locator: ${q(`${locator}, hex #${row.hex}`)} }`,
      `  concept: ${id}`,
      '  space: srgb',
      `  coords: [${coords(row.hex)}]`,
      '  white: D65',
      `  method: ${q(
        `sRGB hex #${row.hex} as listed on the cited page, divided by 255. The page says its RGB values were chosen with the standard's Munsell notation (${munsell}) in mind, by an unstated method, and are for reference only ("あくまで参考"). The notation itself is a Munsell Book of Color specification under the standard's viewing conditions; this value is not a conversion of it.`,
      )}`,
      '  approximation_status: modern-approximation',
      `  notes: ${q(`Munsell notation in JIS Z 8102:2001 Appendix 1 as listed: ${munsell}.` + munsellNote(id))}`,
      '',
    );
    const match = existing ? null : (ichiran.get(base) ?? ichiranByReading.get(reading) ?? null);
    const second = match?.hex;
    if (second) {
      stats.ichiran++;
      out.push(
        '- type: representation',
        `  id: ${id}-srgb-ichiran`,
        '  review_state: discovered',
        '  rights_status: unreviewed',
        `  evidence: { source: ${ICHIRAN}, locator: ${q(`entry ${match.name} (${match.reading}), hex #${second}${match.name === base ? '' : `; matched to ${base} by its reading`}`)} }`,
        `  concept: ${id}`,
        '  space: srgb',
        `  coords: [${coords(second)}]`,
        '  white: D65',
        `  method: ${q(
          `sRGB hex #${second} as listed on the cited page (which calls its values approximate examples and names no source), divided by 255.`,
        )}`,
        '  approximation_status: modern-approximation',
        `  notes: ${q(pagesNote(id, second, row.hex))}`,
        '',
      );
    }
  } else stats.noValue++;
}
if (missing.length) throw new Error(`no reading for: ${missing.join(' ')}`);
process.stdout.write(out.join('\n'));
console.error(JSON.stringify(stats));
