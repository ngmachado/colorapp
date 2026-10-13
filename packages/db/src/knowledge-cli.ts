import {
  formatProblem,
  inventory,
  inventoryMarkdown,
  jsonSchema,
  parseCurriculum,
  parseExperiments,
} from '@sca/knowledge';
import { parse as parseYaml } from 'yaml';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildKnowledgeDb, loadContent, readContentDir } from './knowledge';

function repoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
    dir = resolve(dir, '..');
  }
  throw new Error('run inside the repository');
}

const root = repoRoot();
const contentDir = join(root, 'content', 'knowledge');
const [command = 'validate', outArg] = process.argv.slice(2);

const { records, problems } = loadContent(contentDir);
const sourceIds = new Set(records.filter((r) => r.type === 'source').map((r) => r.id));
const curriculum = parseCurriculum(
  readContentDir(join(root, 'content', 'curriculum')),
  sourceIds,
  parseYaml,
);
const experiments = parseExperiments(
  readContentDir(join(root, 'content', 'experiments')),
  parseYaml,
);
problems.push(...curriculum.problems.map((p) => ({ ...p, path: 'curriculum/' + p.path })));
problems.push(...experiments.problems.map((p) => ({ ...p, path: 'experiments/' + p.path })));
if (problems.length) {
  for (const p of problems) console.error('✖ ' + formatProblem(p));
  console.error(`${problems.length} problem(s) in ${contentDir}`);
  process.exit(1);
}
const inv = inventory(records);

switch (command) {
  case 'validate':
    console.log(
      `✓ ${records.length} knowledge records, ${curriculum.topics.length} curriculum topics, ${experiments.templates.length} experiment templates valid; content version ${inv.content_version}`,
    );
    break;
  case 'build': {
    const out = outArg ?? join(root, 'data', `knowledge-${inv.content_version}.sqlite`);
    mkdirSync(resolve(out, '..'), { recursive: true });
    rmSync(out, { force: true });
    buildKnowledgeDb(records, out);
    writeFileSync(out.replace(/\.sqlite$/, '.inventory.md'), inventoryMarkdown(inv));
    writeFileSync(out.replace(/\.sqlite$/, '.inventory.json'), JSON.stringify(inv, null, 2));
    console.log(`✓ built ${out} (${records.length} records, version ${inv.content_version})`);
    break;
  }
  case 'inventory':
    console.log(inventoryMarkdown(inv));
    break;
  case 'schema': {
    const out = outArg ?? join(contentDir, 'schema.json');
    writeFileSync(out, JSON.stringify(jsonSchema(), null, 2) + '\n');
    console.log(`✓ wrote ${out}`);
    break;
  }
  default:
    console.error('usage: knowledge validate | build [out.sqlite] | inventory | schema [out.json]');
    process.exit(2);
}
