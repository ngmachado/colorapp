import { colour, toHex } from '@sca/colour-engine';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { AutoForm } from '@/components/auto-form';
import { Toolbar } from '@/components/toolbar';
import { currentUser } from '@/lib/current-user';
import { stateParams, type Oklch } from '@/lib/palette-param';

export const dynamic = 'force-dynamic';

interface PaletteSnapshot {
  kind: 'palette';
  palette: Oklch[];
  structure: string;
  seed: number;
  locked?: boolean[];
  labels?: (string | null)[];
  sourceIds?: (string | null)[];
}
interface ColourSnapshot {
  kind: 'colour';
  conceptId: string;
  label: string;
  hex: string | null;
}

/** Deletes one saved version. Only the owner's rows match, so a wrong id is a no-op. */
async function removeVersion(formData: FormData) {
  'use server';
  const user = await currentUser();
  if (!user) return;
  await user.data.projects.removeVersion(
    String(formData.get('project')),
    Number(formData.get('number')),
  );
  revalidatePath('/library');
}

/** Renames a saved palette by replacing the version note. */
async function renameVersion(formData: FormData) {
  'use server';
  const user = await currentUser();
  if (!user) return;
  const note = String(formData.get('note') ?? '').trim();
  if (!note) return;
  await user.data.projects.noteVersion(
    String(formData.get('project')),
    Number(formData.get('number')),
    note.slice(0, 80),
  );
  revalidatePath('/library');
}

/** Everything the user kept: palettes saved from the Laboratory and colours saved from their entries. */
export default async function Library({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = sp.q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().toLowerCase() ?? '';
  const user = await currentUser();
  const projects = user ? await user.data.projects.list() : [];
  const byName = (name: string) => projects.find((p) => p.name === name);
  const paletteProject = byName('Saved palettes');
  const colourProject = byName('Saved colours');
  const palettes = paletteProject
    ? (await user!.data.projects.versions(paletteProject.id))
        .map((v) => ({ number: v.number, note: v.note, snap: v.snapshot as PaletteSnapshot }))
        .filter((v) => v.snap.kind === 'palette')
        .filter(
          (v) =>
            !q ||
            `${v.note ?? ''} ${v.snap.structure} seed ${v.snap.seed} ${v.snap.palette
              .map((c) => toHex(colour('oklch', c)))
              .join(' ')}`
              .toLowerCase()
              .includes(q),
        )
        .reverse()
    : [];
  const colours = colourProject
    ? (await user!.data.projects.versions(colourProject.id))
        .map((v) => ({ number: v.number, snap: v.snapshot as ColourSnapshot }))
        .filter((v) => v.snap.kind === 'colour')
        .filter(
          (v) =>
            !q ||
            `${v.snap.label} ${v.snap.conceptId} ${v.snap.hex ?? ''}`.toLowerCase().includes(q),
        )
        .reverse()
    : [];

  return (
    <>
      <Toolbar
        current="/library"
        middle={user ? `${palettes.length} palettes · ${colours.length} colours` : undefined}
      />
      <main id="main" className="flex flex-col sm:flex-row">
        <aside className="flex w-full shrink-0 flex-col gap-[22px] border-b border-[var(--line)] p-4 text-sm sm:w-60 sm:border-r sm:border-b-0">
          {user ? (
            <AutoForm className="flex flex-col gap-1" role="search">
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="name, rule, hex…"
                aria-label="Search the Library"
                className="field h-9"
                data-testid="library-search"
              />
            </AutoForm>
          ) : null}
          <p className="text-[var(--muted)]">
            Palettes keep their rule and seed, so a saved draw is reproducible. Colours keep their
            record id, so the entry stays the source of truth.
          </p>
          {user ? (
            <Link href="/account" className="underline underline-offset-2">
              Your data
            </Link>
          ) : null}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-8 px-6 pt-5 pb-10">
          {!user ? (
            <p className="text-sm" data-testid="library-signin">
              <Link href="/signin?next=/library" className="underline underline-offset-2">
                Sign in
              </Link>{' '}
              to keep palettes and colours.
            </p>
          ) : null}

          <section className="flex flex-col gap-3" data-testid="library-palettes">
            <h1 className="text-[22px] font-bold">Saved palettes</h1>
            {palettes.length === 0 && q ? (
              <p className="text-sm text-[var(--muted)]">No saved palette matches “{q}”.</p>
            ) : palettes.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                None yet. Save one from the{' '}
                <Link href="/lab" className="underline underline-offset-2">
                  Laboratory
                </Link>
                .
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {palettes.map((v) => (
                  <li
                    key={v.number}
                    className="flex flex-wrap items-center gap-4 rounded-lg border border-[var(--line)] p-2.5"
                    data-testid="saved-palette"
                  >
                    <span className="flex h-12 w-48 shrink-0 overflow-hidden rounded-md">
                      {v.snap.palette.map((c, i) => (
                        <span
                          key={i}
                          className="flex-1"
                          style={{ background: toHex(colour('oklch', c)) }}
                        />
                      ))}
                    </span>
                    <form
                      action={renameVersion}
                      className="flex min-w-0 flex-1 flex-col gap-1"
                      data-testid="rename-form"
                    >
                      <input type="hidden" name="project" value={paletteProject!.id} />
                      <input type="hidden" name="number" value={v.number} />
                      <input
                        name="note"
                        defaultValue={v.note ?? `${v.snap.structure} · seed ${v.snap.seed}`}
                        aria-label={`Name of version ${v.number}`}
                        maxLength={80}
                        title="Press Enter to rename"
                        className="field h-8 max-w-sm text-[15px]"
                      />
                      <span className="font-mono text-xs text-[var(--muted)]">
                        {v.snap.structure} · seed {v.snap.seed} · {v.snap.palette.length} roles
                      </span>
                      <button type="submit" className="sr-only">
                        Rename
                      </button>
                    </form>
                    <Link href={`/lab?${stateParams(v.snap)}`} className="btn">
                      Open in the Laboratory
                    </Link>
                    <form action={removeVersion}>
                      <input type="hidden" name="project" value={paletteProject!.id} />
                      <input type="hidden" name="number" value={v.number} />
                      <button
                        type="submit"
                        className="btn"
                        aria-label={`Delete version ${v.number}`}
                        data-testid="delete-palette"
                      >
                        Delete
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-3" data-testid="library-colours">
            <h2 className="text-[22px] font-bold">Saved colours</h2>
            {colours.length === 0 && q ? (
              <p className="text-sm text-[var(--muted)]">No saved colour matches “{q}”.</p>
            ) : colours.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                None yet. Save one from its entry in the{' '}
                <Link href="/dictionary" className="underline underline-offset-2">
                  Dictionary
                </Link>
                .
              </p>
            ) : (
              <div
                className="grid gap-3.5"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}
              >
                {colours.map((c) => (
                  <div
                    key={c.number}
                    className="flex flex-col overflow-hidden rounded-lg border border-[var(--line)] hover:border-[var(--fg)]"
                    data-testid="saved-colour"
                  >
                    <Link href={`/dictionary/${c.snap.conceptId}`} className="flex flex-col">
                      {c.snap.hex ? (
                        <span className="h-[90px]" style={{ background: c.snap.hex }} />
                      ) : (
                        <span className="flex h-[90px] items-center justify-center bg-[var(--accent-soft)] text-xs text-[var(--muted)]">
                          no displayable value
                        </span>
                      )}
                      <span className="flex flex-col gap-[3px] px-3 pt-2.5">
                        <span className="text-[15px]">{c.snap.label}</span>
                        <span className="font-mono text-[11px] text-[var(--muted)]">
                          {c.snap.hex ? c.snap.hex.slice(1).toUpperCase() : 'no fixed value'}
                        </span>
                      </span>
                    </Link>
                    <form action={removeVersion} className="px-3 pt-1 pb-2.5">
                      <input type="hidden" name="project" value={colourProject!.id} />
                      <input type="hidden" name="number" value={c.number} />
                      <button
                        type="submit"
                        className="text-xs text-[var(--muted)] underline underline-offset-2"
                        aria-label={`Remove ${c.snap.label} from the Library`}
                        data-testid="delete-colour"
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
