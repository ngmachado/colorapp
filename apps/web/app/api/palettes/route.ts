import { Structure } from '@sca/generator';
import { currentUser } from '@/lib/current-user';

const MAX_COLUMNS = 5;
const isTriple = (v: unknown): v is [number, number, number] =>
  Array.isArray(v) &&
  v.length === 3 &&
  v.every((n) => typeof n === 'number' && Number.isFinite(n)) &&
  v[0] >= 0 &&
  v[0] <= 1 &&
  v[1] >= 0 &&
  v[1] <= 0.6 &&
  v[2] >= 0 &&
  v[2] < 360;

/** Saves the current palette as a version of the user's "Saved palettes" project. Nothing malformed is written. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: 'body must be JSON' }, { status: 400 });
  }
  const palette = body.palette;
  if (
    !Array.isArray(palette) ||
    palette.length < 2 ||
    palette.length > MAX_COLUMNS ||
    !palette.every(isTriple)
  )
    return Response.json(
      { error: 'palette must be 2 to 5 OKLCh triples with finite coordinates' },
      { status: 400 },
    );
  const structure = Structure.safeParse(body.structure);
  if (!structure.success) return Response.json({ error: 'unknown rule' }, { status: 400 });
  const seed = body.seed;
  if (typeof seed !== 'number' || !Number.isInteger(seed) || seed < 0)
    return Response.json({ error: 'seed must be a non-negative integer' }, { status: 400 });
  const n = palette.length;
  const list = <T>(v: unknown, ok: (x: unknown) => x is T): T[] | undefined =>
    Array.isArray(v) && v.length === n && v.every(ok) ? (v as T[]) : undefined;
  const locked = list(body.locked, (x): x is boolean => typeof x === 'boolean');
  const labels = list(
    body.labels,
    (x): x is string | null => x === null || (typeof x === 'string' && x.length <= 24),
  );
  const sourceIds = list(
    body.sourceIds,
    (x): x is string | null => x === null || (typeof x === 'string' && x.length <= 80),
  );
  const project =
    (await user.data.projects.list()).find((p) => p.name === 'Saved palettes') ??
    (await user.data.projects.create({ name: 'Saved palettes' }));
  const version = await user.data.projects.addVersion(
    project.id,
    {
      kind: 'palette',
      space: 'oklch',
      palette,
      structure: structure.data,
      seed,
      ...(locked ? { locked } : {}),
      ...(labels ? { labels } : {}),
      ...(sourceIds ? { sourceIds } : {}),
    },
    `${structure.data} · seed ${seed}`,
  );
  return Response.json({ projectId: project.id, number: version.number });
}
