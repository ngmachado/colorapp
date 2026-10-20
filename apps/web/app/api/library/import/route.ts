import { appData } from '@sca/db';
import { currentUser } from '@/lib/current-user';
import { db } from '@/lib/db';
import { IMPORT_LIMIT, LIBRARY_LIMIT, paletteKey, parseLibraryImport } from '@/lib/library-import';
import type { PaletteState } from '@/lib/palette-param';

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const reader = req.body?.getReader();
  if (!reader) return Response.json({ error: 'A JSON export is required.' }, { status: 400 });
  let size = 0;
  let raw = '';
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > IMPORT_LIMIT) {
      await reader.cancel();
      return Response.json({ error: 'Choose a JSON file smaller than 2 MiB.' }, { status: 413 });
    }
    raw += decoder.decode(value, { stream: true });
  }
  raw += decoder.decode();
  let incoming;
  try {
    incoming = parseLibraryImport(raw);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
  try {
    const result = await (
      await db()
    ).transaction(async (tx) => {
      const data = appData(tx, user.id);
      const projects = await data.projects.list();
      let addedPalettes = 0;
      let addedColours = 0;
      for (const kind of ['palette', 'colour'] as const) {
        const items = kind === 'palette' ? incoming.palettes : incoming.colours;
        if (!items.length) continue;
        const name = kind === 'palette' ? 'Saved palettes' : 'Saved colours';
        const project =
          projects.find((p) => p.name === name) ?? (await data.projects.create({ name }));
        const existing = await data.projects.versions(project.id);
        const keys = new Set(
          existing.map((v) => {
            const snapshot = v.snapshot as PaletteState & { conceptId: string };
            return kind === 'palette'
              ? paletteKey({
                  state: snapshot,
                  note: v.note ?? `${snapshot.structure} · seed ${snapshot.seed}`,
                })
              : snapshot.conceptId;
          }),
        );
        let count = existing.length;
        if (kind === 'palette')
          for (const item of incoming.palettes) {
            const key = paletteKey(item);
            if (keys.has(key)) continue;
            if (++count > LIBRARY_LIMIT)
              throw new Error(
                'The Library holds 200 palettes and 200 colours. Remove some items before importing.',
              );
            await data.projects.addVersion(
              project.id,
              { kind, space: 'oklch', ...item.state },
              item.note,
            );
            keys.add(key);
            addedPalettes++;
          }
        else
          for (const item of incoming.colours) {
            if (keys.has(item.conceptId)) continue;
            if (++count > LIBRARY_LIMIT)
              throw new Error(
                'The Library holds 200 palettes and 200 colours. Remove some items before importing.',
              );
            await data.projects.addVersion(project.id, { kind, ...item });
            keys.add(item.conceptId);
            addedColours++;
          }
      }
      return {
        palettes: addedPalettes,
        colours: addedColours,
        skipped: incoming.palettes.length + incoming.colours.length - addedPalettes - addedColours,
      };
    });
    return Response.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('The Library holds'))
      return Response.json({ error: error.message }, { status: 409 });
    console.error('Library import failed', error);
    return Response.json(
      { error: 'Import could not be saved. Nothing was imported; please try again.' },
      { status: 500 },
    );
  }
}
