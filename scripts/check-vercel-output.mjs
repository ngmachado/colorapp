import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Run after a VERCEL=1 production build, including AUTH_TEST_LOGIN=1 to test the boundary.
const root = join(dirname(fileURLToPath(import.meta.url)), '../apps/web/.next');
const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const routes = read(join(root, 'server/app-paths-manifest.json'));
assert(
  !Object.keys(routes).some((route) => route.startsWith('/api/test/')),
  'Test routes must not ship',
);
const traces = readdirSync(join(root, 'server/app'), { recursive: true }).filter((file) =>
  file.endsWith('.nft.json'),
);
assert(traces.length > 0, 'No route traces found; build first');
for (const trace of traces) {
  const files = read(join(root, 'server/app', trace)).files;
  assert(
    !files.some((file) => file.includes('@electric-sql') && file.includes('pglite')),
    `PGlite shipped in ${trace}`,
  );
}
console.log(
  `Checked ${traces.length} production route traces: no test routes or PGlite package files.`,
);
