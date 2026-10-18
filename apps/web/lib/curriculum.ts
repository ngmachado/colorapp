import { readContentDir } from '@sca/db/knowledge';
import {
  parseCurriculum,
  parseExperiments,
  type CurriculumTopic,
  type ExperimentTemplate,
} from '@sca/knowledge';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { knowledge } from './knowledge';

const g = globalThis as typeof globalThis & {
  __scaCurriculum?: CurriculumTopic[];
  __scaTemplates?: ExperimentTemplate[];
};

function contentRoot(): string {
  if (process.env.CONTENT_PATH) return process.env.CONTENT_PATH;
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (existsSync(join(dir, 'content', 'curriculum'))) return join(dir, 'content');
    dir = resolve(dir, '..');
  }
  throw new Error('content directory not found; set CONTENT_PATH');
}

/** Curriculum topics, validated against the knowledge release's sources. Loaded once per process. */
export function curriculum(): CurriculumTopic[] {
  if (g.__scaCurriculum) return g.__scaCurriculum;
  const sourceIds = new Set(
    knowledge()
      .byType('source')
      .map((s) => s.id),
  );
  const { topics, problems } = parseCurriculum(
    readContentDir(join(contentRoot(), 'curriculum')),
    sourceIds,
    parseYaml,
  );
  if (problems.length) throw new Error(`curriculum content has ${problems.length} problem(s)`);
  g.__scaCurriculum = topics;
  return topics;
}

export function experimentTemplates(): ExperimentTemplate[] {
  if (g.__scaTemplates) return g.__scaTemplates;
  const { templates, problems } = parseExperiments(
    readContentDir(join(contentRoot(), 'experiments')),
    parseYaml,
  );
  if (problems.length) throw new Error(`experiment content has ${problems.length} problem(s)`);
  g.__scaTemplates = templates;
  return templates;
}
