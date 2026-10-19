import { z } from 'zod';
import { Id } from './schema';

/**
 * App content that is not a knowledge record: curriculum topics and experiment templates.
 * Validated in CI like knowledge records, but loaded by the app directly rather than compiled into the release.
 */

export const CurriculumTopic = z
  .strictObject({
    id: Id,
    kind: z.enum(['term', 'structure', 'exercise', 'tradition', 'lesson']),
    title: z.string().min(1),
    /** One to three sentences. The first states the distinction the learner should leave with. */
    summary: z.string().min(1),
    /** Structured lessons separate explanations from exercises and implementation limits. */
    lesson: z
      .strictObject({
        objective: z.string().min(1),
        paragraphs: z.array(z.string().min(1)).min(1),
        example: z.string().min(1),
        limits: z.string().min(1),
        references: z
          .array(
            z.strictObject({
              source: Id,
              locator: z.string().min(1),
              url: z.url(),
            }),
          )
          .min(1),
      })
      .optional(),
    availability: z.enum(['available', 'planned', 'removed']).optional(),
    /** Terms the UI must keep distinct; the distinction names which calculation each belongs to. */
    key_terms: z
      .array(z.strictObject({ term: z.string().min(1), distinction: z.string().min(1) }))
      .optional(),
    misconception: z.string().optional(),
    /** For kind = structure: the generation rule and its default parameters in a named hue space. */
    rule: z
      .strictObject({
        hue_space: z.enum(['oklch', 'lch', 'hsl']),
        description: z.string().min(1),
        defaults: z.record(z.string(), z.number()),
      })
      .optional(),
    /** For kind = exercise: what the user does, and what is revealed only after they answer. */
    exercise: z
      .strictObject({
        steps: z.array(z.string().min(1)).min(1),
        reveal: z.string().optional(),
        explores: z.string().min(1),
      })
      .optional(),
    /** What the app may and may not say about this topic. */
    explanation_limits: z.string().optional(),
    /** Knowledge source record ids. A term or tradition topic with no source is an opinion and is rejected. */
    sources: z.array(Id),
  })
  .refine((t) => t.sources.length > 0 || t.kind === 'structure' || t.kind === 'exercise', {
    message: 'term, tradition and lesson topics need at least one source',
    path: ['sources'],
  })
  .refine((t) => t.kind !== 'lesson' || !!t.lesson, {
    message: 'lesson topics need lesson content',
    path: ['lesson'],
  })
  .refine((t) => !t.lesson || t.lesson.references.every((r) => t.sources.includes(r.source)), {
    message: 'lesson references must be included in sources',
    path: ['lesson', 'references'],
  });

export const ExperimentTemplate = z.strictObject({
  id: Id,
  title: z.string().min(1),
  /** The question the experiment can answer about one user's recorded choices. */
  question: z.string().min(1),
  hypothesis: z.string().min(1),
  /** Independent variables and their levels. One level per generated cell. */
  factors: z
    .array(z.strictObject({ name: z.string().min(1), levels: z.array(z.string().min(1)).min(2) }))
    .min(1),
  /** Everything held constant, stated so a reader can see what the design does not test. */
  fixed: z.array(z.string().min(1)).min(1),
  task_wording: z.string().min(1),
  response_mode: z.enum(['pairwise', 'rating']),
  criteria: z.array(z.string().min(1)).min(1),
  planned_interpretation: z.string().min(1),
  limitations: z.string().min(1),
  /** Seeded variants per cell. */
  variants_per_cell: z.number().int().min(1).default(1),
});

export type CurriculumTopic = z.infer<typeof CurriculumTopic>;
export type ExperimentTemplate = z.infer<typeof ExperimentTemplate>;

export interface ContentProblemLite {
  path: string;
  recordId?: string;
  field?: string;
  message: string;
}

function parseList<T extends { id: string }>(
  files: { path: string; text: string }[],
  schema: z.ZodType<T>,
  parseYaml: (text: string) => unknown,
): { items: T[]; problems: ContentProblemLite[] } {
  const items: T[] = [];
  const problems: ContentProblemLite[] = [];
  const seen = new Map<string, string>();
  for (const file of files) {
    let raw: unknown;
    try {
      raw = parseYaml(file.text);
    } catch (e) {
      problems.push({ path: file.path, message: `YAML: ${(e as Error).message}` });
      continue;
    }
    const list = Array.isArray(raw) ? raw : [raw];
    list.forEach((item, index) => {
      const r = schema.safeParse(item);
      const id =
        item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string'
          ? (item as { id: string }).id
          : `#${index}`;
      if (!r.success) {
        for (const issue of r.error.issues) {
          const keys = issue.code === 'unrecognized_keys' ? issue.keys : [];
          const field = [...issue.path.map(String), ...keys].join('.');
          problems.push({
            path: file.path,
            recordId: id,
            ...(field ? { field } : {}),
            message: issue.message,
          });
        }
        return;
      }
      if (seen.has(r.data.id)) {
        problems.push({
          path: file.path,
          recordId: r.data.id,
          field: 'id',
          message: `duplicate id, first seen in ${seen.get(r.data.id)}`,
        });
        return;
      }
      seen.set(r.data.id, file.path);
      items.push(r.data);
    });
  }
  return { items, problems };
}

/** Parses curriculum topic files and checks that every cited source is a known source record id. */
export function parseCurriculum(
  files: { path: string; text: string }[],
  sourceIds: Set<string>,
  parseYaml: (text: string) => unknown,
) {
  const { items, problems } = parseList(files, CurriculumTopic, parseYaml);
  for (const t of items) {
    for (const s of t.sources) {
      if (!sourceIds.has(s))
        problems.push({
          path: files.find((f) => f.text.includes(`id: ${t.id}`))?.path ?? '?',
          recordId: t.id,
          field: 'sources',
          message: `unknown source "${s}"`,
        });
    }
  }
  return { topics: items, problems };
}

export function parseExperiments(
  files: { path: string; text: string }[],
  parseYaml: (text: string) => unknown,
) {
  const { items, problems } = parseList(files, ExperimentTemplate, parseYaml);
  return { templates: items, problems };
}
