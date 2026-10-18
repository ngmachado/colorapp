// Renders every preset, front and back, to PNG for a visual check. Output goes to the path given as argv[2].
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderPreset } from '../src/apply';
import { PRESETS } from '../src/presets';

const out = process.argv[2] ?? join(import.meta.dirname, '..', 'preview');
mkdirSync(out, { recursive: true });
const palette = { dominant: '#2f4858', secondary: '#c9b79c', accent: '#d1495b' };
for (const p of PRESETS) {
  for (const view of ['front', 'back'] as const) {
    const png = new Resvg(renderPreset(view, p, palette), {
      fitTo: { mode: 'width', value: 400 },
      background: '#f2f2f2',
    })
      .render()
      .asPng();
    writeFileSync(join(out, `${p.id}-${view}.png`), png);
  }
}
console.log('previews in', out);
