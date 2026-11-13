/**
 * The MCP server: six tools, three resource families, one prompt and the instructions, all over the
 * functions in ./tools. A new instance serves each request; nothing is kept between calls.
 */
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Role } from '@sca/generator';
import { z } from 'zod';
import { GUIDE, INSTRUCTIONS } from './instructions';
import {
  checkPalette,
  contrastPair,
  findRecords,
  inspectColour,
  lessonText,
  listLessons,
  listSystems,
  listableRecords,
  lookupRecord,
  Refusal,
  REQUEST_RULES,
  requestPalette,
} from './tools';

export const SERVER_NAME = 'supercolour';
export const SERVER_VERSION = '1';

const colourField = z
  .string()
  .describe('A hex such as #663399, or oklch(L C h) with L on 0–1 and h in degrees.');

/** A tool answer: the JSON as text for every client, and as structured content for those that read it. */
function answer(fn: () => unknown): CallToolResult {
  try {
    const result = fn();
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      structuredContent: result as Record<string, unknown>,
    };
  } catch (e) {
    if (e instanceof Refusal) {
      const body = { refused: e.message, ...(e.detail ? { detail: e.detail } : {}) };
      return {
        isError: true,
        content: [{ type: 'text', text: JSON.stringify(body, null, 2) }],
        structuredContent: body,
      };
    }
    throw e;
  }
}

const json = (uri: string, value: unknown) => ({
  contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(value, null, 2) }],
});
const markdown = (uri: string, text: string) => ({
  contents: [{ uri, mimeType: 'text/markdown', text }],
});

export function mcpServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { instructions: INSTRUCTIONS },
  );

  server.registerTool(
    'inspect_colour',
    {
      title: 'Inspect a colour',
      description:
        'The values the inspector shows for one colour: sRGB, HSL, OKLCh, CIELAB (D50, adapted from D65), XYZ; the nearest Munsell notations when the renotation table is installed; and the five nearest documented records with their OKLab distance, status and citation. Nearby means a distance within a small collection, never an identification.',
      inputSchema: { colour: colourField },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    ({ colour }) => answer(() => inspectColour(colour)),
  );

  server.registerTool(
    'contrast_pair',
    {
      title: 'Contrast for a pair',
      description:
        'WCAG 2.1 contrast ratio of a text colour on a background, with every threshold named by its success criterion, plus the CIEDE2000 and OKLab differences with the conditions each number depends on. A ratio says nothing about harmony.',
      inputSchema: { text: colourField, background: colourField },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    ({ text, background }) => answer(() => contrastPair(text, background)),
  );

  server.registerTool(
    'check_palette',
    {
      title: 'Check a palette',
      description:
        'Measures a palette of 2 to 5 colours: contrast for the pairs you mean to use and for every pair, lightness spread, the closest pair, distinctness under protan, deutan and tritan simulation (approximations), the nearest documented records to each colour, and documented pairs, groups or layerings whose members all lie near the palette. Distances are reported as numbers; nothing here says what a palette means. The Laboratory link reproduces the palette.',
      inputSchema: {
        colours: z.array(colourField).min(2).max(5),
        names: z
          .array(z.string().min(1).max(24))
          .optional()
          .describe('One name per colour, in order, such as text, background, accent.'),
        pairs: z
          .array(z.object({ text: z.number().int(), background: z.number().int() }))
          .optional()
          .describe('The text-on-background combinations you mean to use, by index from 0.'),
        flagDistance: z
          .number()
          .min(0)
          .optional()
          .describe(
            'OKLab distance below which a pair is flagged. A working setting, default 0.1.',
          ),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    (input) => answer(() => checkPalette(input)),
  );

  const range = (what: string) =>
    z.object({ min: z.number(), max: z.number() }).optional().describe(what);
  server.registerTool(
    'request_palette',
    {
      title: 'Request a palette from requirements',
      description:
        'Draws candidates with the Laboratory generator under measurable requirements and returns the first that meets them all, or the one with the fewest failures, with a pass or fail per requirement and a Laboratory link that reproduces it from the same seed. Requirements are numbers: roles, fixed colours, a record to start from, a hue arc, lightness and chroma ranges, contrast between roles, a minimum separation, the gamut. Words such as "warm" or "trustworthy" are not requirements; anything sent in "words" is refused with its measurable form.',
      inputSchema: {
        roles: z
          .array(Role)
          .min(1)
          .max(5)
          .optional()
          .describe('In layer order. Default dominant, secondary, accent.'),
        rule: REQUEST_RULES.optional().describe(
          'Hue rule the generator follows. Default analogous.',
        ),
        fixed: z
          .partialRecord(Role, colourField)
          .optional()
          .describe('Colours that must not move, by role.'),
        startFrom: z
          .string()
          .optional()
          .describe(
            'A concept or representation id whose value becomes the first role and whose hue the rule starts from.',
          ),
        hue: z
          .object({ from: z.number(), to: z.number() })
          .optional()
          .describe(
            'An arc in OKLCh degrees, clockwise from "from" to "to"; 350 to 10 is 20° through 0.',
          ),
        lightness: range('OKLab L on 0–1. Default 0.18–0.94.'),
        chroma: range('OKLCh C. Default 0–0.3.'),
        contrast: z
          .array(z.object({ text: Role, background: Role, minimum: z.number() }))
          .optional()
          .describe('Required WCAG 2.1 ratio of one role as text on another.'),
        minimumSeparation: z
          .number()
          .min(0)
          .optional()
          .describe('Smallest OKLab distance allowed between any two colours.'),
        gamut: z.enum(['srgb', 'display-p3']).optional().describe('Default srgb.'),
        seed: z.number().int().min(0).optional().describe('Same seed, same answer. Default 1.'),
        count: z
          .number()
          .int()
          .min(1)
          .max(1000)
          .optional()
          .describe('Candidates to draw before judging. Default 200.'),
        words: z
          .string()
          .optional()
          .describe(
            'Anything you cannot write as a number. Always refused, with the measurable form of each word.',
          ),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    (input) => answer(() => requestPalette(input)),
  );

  server.registerTool(
    'find_records',
    {
      title: 'Find records',
      description:
        'Text search over the documented records: names in their own script, transliterations, aliases, labels and source titles. Returns ids for lookup_record.',
      inputSchema: { text: z.string().min(1) },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    ({ text }) => answer(() => findRecords(text)),
  );

  server.registerTool(
    'lookup_record',
    {
      title: 'Look up a record',
      description:
        'One record with its citation: a concept with its names, representations (space, coordinates, method, approximation status), passages, relations, combinations and members; a source with its bibliographic fields; or any other record as kept. A restricted record returns its bibliographic record only. Quote passages as given; do not paraphrase them.',
      inputSchema: { id: z.string().min(1) },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    ({ id }) => answer(() => lookupRecord(id)),
  );

  server.registerResource(
    'guide',
    'supercolour://guide',
    {
      title: 'How to work with Super Colour',
      description:
        'The instructions in full: rules, tools, resources, the prompt and what is not provided.',
      mimeType: 'text/markdown',
    },
    (uri) => markdown(uri.href, GUIDE),
  );

  server.registerResource(
    'record',
    new ResourceTemplate('supercolour://records/{id}', {
      list: () => ({
        resources: listableRecords().map((r) => ({
          uri: `supercolour://records/${r.id}`,
          name: r.id,
          title: r.label,
          description: r.type,
          mimeType: 'application/json',
        })),
      }),
    }),
    {
      title: 'Documented record',
      description: 'A concept or source as lookup_record returns it, citation included.',
      mimeType: 'application/json',
    },
    (uri, { id }) => json(uri.href, lookupRecord(String(id))),
  );

  server.registerResource(
    'system',
    new ResourceTemplate('supercolour://systems/{id}', {
      list: () => ({
        resources: listSystems().map((s) => ({
          uri: `supercolour://systems/${s.id}`,
          name: s.id,
          title: s.label,
          ...(s.description ? { description: s.description } : {}),
          mimeType: 'application/json',
        })),
      }),
    }),
    {
      title: 'Documented system',
      description:
        'A system with its members and the passages that document it, each with its citation. Members are documented relations, not wheel rules.',
      mimeType: 'application/json',
    },
    (uri, { id }) => {
      if (!listSystems().some((s) => s.id === String(id)))
        throw new Refusal(
          `"${String(id)}" is not a system. Systems: ${listSystems()
            .map((s) => s.id)
            .join(', ')}.`,
        );
      return json(uri.href, lookupRecord(String(id)));
    },
  );

  server.registerResource(
    'lesson',
    new ResourceTemplate('supercolour://lessons/{id}', {
      list: () => ({
        resources: listLessons().map((l) => ({
          uri: `supercolour://lessons/${l.id}`,
          name: l.id,
          title: l.title,
          description: l.summary,
          mimeType: 'text/markdown',
        })),
      }),
    }),
    {
      title: 'Lesson',
      description: 'A lesson from the Theory section with its references and limits.',
      mimeType: 'text/markdown',
    },
    (uri, { id }) => {
      const text = lessonText(String(id));
      if (!text)
        throw new Refusal(
          `No lesson "${String(id)}". Lessons: ${listLessons()
            .map((l) => l.id)
            .join(', ')}.`,
        );
      return markdown(uri.href, text);
    },
  );

  server.registerPrompt(
    'palette',
    {
      title: 'Palette from a brief',
      description: 'The order of work from a person’s brief to a cited palette, as steps.',
      argsSchema: {
        brief: z
          .string()
          .optional()
          .describe('What the palette is for, in the person’s own words.'),
      },
    },
    ({ brief }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: paletteWorkflow(brief),
          },
        },
      ],
    }),
  );

  return server;
}

/** The workflow prompt: numbers first, then request, check, inspect, cite, hand back. */
export function paletteWorkflow(brief?: string): string {
  return `Build a palette with Super Colour${brief ? ` for this brief: "${brief}"` : ''}.

1. Turn the brief into numbers. For each need, choose one of: roles (dominant, secondary, accent, support, highlight), fixed colours by role, a record to start from (find_records, then its id), a hue arc in OKLCh degrees, a lightness range (OKLab L, 0–1), a chroma range (OKLCh C), a contrast minimum between two roles (WCAG 2.1 ratio), a minimum OKLab separation, the gamut. A word that has no number (a mood, a feeling, a brand value) is not a requirement: ask the person what they would measure, or leave it out and say so. Do not guess a hue for a mood.
2. Call request_palette with those numbers and a seed. Read the pass or fail per requirement.
3. Call check_palette on the result with the pairs you mean to use as text on background. Read the contrast for every pair, the closest pair, and the distinctness views.
4. For any colour that fails, call inspect_colour and adjust one number at a time; then request again with the same seed, or a new seed if the rule cannot meet the requirements.
5. For any record you keep or mention, call lookup_record and cite its source and locator exactly as given. A nearby record is a distance, not a name: say "within 0.03 of X in OKLab", never "this is X".
6. Hand back the palette as hex and OKLCh with the measured results, and the Laboratory link so the person can open it. Nothing is saved on their behalf.`;
}
