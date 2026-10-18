import { toHex } from '@sca/colour-engine';
import type { Representation } from '@sca/knowledge';
import { currentUser } from '@/lib/current-user';
import { knowledge } from '@/lib/knowledge';
import { isRestricted, representationValue } from '@/lib/records';

/** Saves a documented colour as a version of the user's "Saved colours" project. The record id is what is kept. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await req.json()) as { conceptId?: string };
  const k = knowledge();
  const concept = body.conceptId ? k.record(body.conceptId) : undefined;
  if (!concept || concept.type !== 'concept')
    return Response.json({ error: 'unknown colour' }, { status: 400 });
  const rep = k
    .forConcept(concept.id)
    .find(
      (r): r is Representation => r.type === 'representation' && !isRestricted(r) && !!r.coords,
    );
  const value = rep ? representationValue(rep) : null;
  const project =
    (await user.data.projects.list()).find((p) => p.name === 'Saved colours') ??
    (await user.data.projects.create({ name: 'Saved colours' }));
  const already = (await user.data.projects.versions(project.id)).find(
    (v) => (v.snapshot as { conceptId?: string }).conceptId === concept.id,
  );
  if (already)
    return Response.json({ projectId: project.id, number: already.number, already: true });
  const version = await user.data.projects.addVersion(
    project.id,
    {
      kind: 'colour',
      conceptId: concept.id,
      representationId: rep?.id ?? null,
      label: concept.label,
      hex: value ? toHex(value) : null,
    },
    concept.label,
  );
  return Response.json({ projectId: project.id, number: version.number });
}
