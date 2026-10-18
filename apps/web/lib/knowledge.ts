import { buildKnowledgeDb, loadContent, openKnowledge, type Knowledge } from '@sca/db/knowledge';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const g = globalThis as typeof globalThis & { __scaKnowledge?: Knowledge };

function repoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
    dir = resolve(dir, '..');
  }
  return process.cwd();
}

/**
 * The knowledge release, opened once per process. Order of preference: KNOWLEDGE_PATH, the newest
 * data/knowledge-*.sqlite, or a fresh build from content/knowledge (development convenience).
 */
export function knowledge(): Knowledge {
  if (g.__scaKnowledge) return g.__scaKnowledge;
  let path = process.env.KNOWLEDGE_PATH;
  if (!path) {
    const root = repoRoot();
    const dataDir = join(root, 'data');
    // A traced server bundle is read-only; the folder is already there in that case.
    try {
      mkdirSync(dataDir, { recursive: true });
    } catch {
      /* read-only file system */
    }
    // `pnpm content:build` writes knowledge-current.sqlite beside the hashed file; a deployment traces
    // only that one. Otherwise the newest hashed build wins: versions are content hashes, so name
    // order says nothing about age.
    const current = join(dataDir, 'knowledge-current.sqlite');
    const files = readdirSync(dataDir)
      .filter((f) => /^knowledge-[0-9a-f]+\.sqlite$/.test(f))
      .sort((a, b) => statSync(join(dataDir, a)).mtimeMs - statSync(join(dataDir, b)).mtimeMs);
    if (existsSync(current)) path = current;
    else if (files.length) path = join(dataDir, files.at(-1)!);
    else {
      const { records, problems } = loadContent(join(root, 'content', 'knowledge'));
      if (problems.length)
        throw new Error(`content has ${problems.length} problem(s); run pnpm content:check`);
      const inv = buildKnowledgeDb(records, join(dataDir, 'knowledge-build.sqlite'));
      path = join(dataDir, 'knowledge-build.sqlite');
      console.log(`built knowledge release ${inv.content_version} at ${path}`);
    }
  }
  g.__scaKnowledge = openKnowledge(path);
  return g.__scaKnowledge;
}
