import { currentUser } from '@/lib/current-user';
import { saveColour } from '@/lib/library';

/** Saves a documented colour as a version of the user's "Saved colours" project. The record id is what is kept. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await req.json()) as { conceptId?: string };
  const saved = body.conceptId ? await saveColour(user.data, body.conceptId) : null;
  if (!saved) return Response.json({ error: 'unknown colour' }, { status: 400 });
  return Response.json(
    saved.already
      ? { projectId: saved.projectId, number: saved.number, already: true }
      : { projectId: saved.projectId, number: saved.number },
  );
}
