export const metadata = { robots: { index: false, follow: false } };
import { colour, toHex } from '@sca/colour-engine';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { AutoForm } from '@/components/auto-form';
import { LibraryImport } from '@/components/library-import';
import { LocalLibrary } from '@/components/local-library';
import { ACCOUNTS } from '@/lib/accounts';
import { Toolbar } from '@/components/toolbar';
import { currentUser } from '@/lib/current-user';
import { stateParams } from '@/lib/palette-param';
import type { ColourSnapshot, PaletteSnapshot } from '@/lib/library';

export const dynamic = 'force-dynamic';

/** Moves one saved version to the Deleted list. Only the owner's rows match, so a wrong id is a no-op. */
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

/** Brings a version back from the Deleted list. */
async function restoreVersion(formData: FormData) {
  'use server';
  const user = await currentUser();
  if (!user) return;
  await user.data.projects.restoreVersion(
    String(formData.get('project')),
    Number(formData.get('number')),
  );
  revalidatePath('/library');
}

/** Removes a deleted version for good. Only the person does this; no key or agent can. */
async function purgeVersion(formData: FormData) {
  'use server';
  const user = await currentUser();
  if (!user) return;
  await user.data.projects.purgeVersion(
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
  if (!ACCOUNTS)
    return (
      <>
        <Toolbar current="/library" middle="kept in this browser" />
        <LocalLibrary />
      </>
    );
  // Signed out, the Library is the browser's, with a line saying that an account keeps it.
  const user = await currentUser();
  if (!user)
    return (
      <>
        <Toolbar current="/library" middle="kept in this browser" />
        <LocalLibrary signIn />
      </>
    );
  const projects = await user.data.projects.list();
  const byName = (name: string) => projects.find((p) => p.name === name);
  const paletteProject = byName('Saved palettes');
  const colourProject = byName('Saved colours');
  const palettes = paletteProject
    ? (await user.data.projects.versions(paletteProject.id))
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
    ? (await user.data.projects.versions(colourProject.id))
        .map((v) => ({ number: v.number, snap: v.snapshot as ColourSnapshot }))
        .filter((v) => v.snap.kind === 'colour')
        .filter(
          (v) =>
            !q ||
            `${v.snap.label} ${v.snap.conceptId} ${v.snap.hex ?? ''}`.toLowerCase().includes(q),
        )
        .reverse()
    : [];

  // The Deleted list: what a click here or an agent removed, until it is restored or removed for good.
  const deleted = [
    ...(paletteProject
      ? (await user.data.projects.versions(paletteProject.id, true)).map((v) => ({
          project: paletteProject.id,
          number: v.number,
          kind: 'palette' as const,
          label:
            v.note ??
            `${(v.snapshot as PaletteSnapshot).structure} · seed ${(v.snapshot as PaletteSnapshot).seed}`,
          hexes: (v.snapshot as PaletteSnapshot).palette.map((c) => toHex(colour('oklch', c))),
          deletedAt: v.deletedAt,
        }))
      : []),
    ...(colourProject
      ? (await user.data.projects.versions(colourProject.id, true)).map((v) => ({
          project: colourProject.id,
          number: v.number,
          kind: 'colour' as const,
          label: (v.snapshot as ColourSnapshot).label,
          hexes: [(v.snapshot as ColourSnapshot).hex ?? 'transparent'],
          deletedAt: v.deletedAt,
        }))
      : []),
  ].sort((a, b) => (b.deletedAt?.getTime() ?? 0) - (a.deletedAt?.getTime() ?? 0));

  return (
    <>
      <Toolbar
        current="/library"
        middle={`${palettes.length} palettes · ${colours.length} colours`}
      />
      <main id="main" className="flex flex-col sm:flex-row">
        <aside className="flex w-full shrink-0 flex-col gap-[22px] border-b border-[var(--line)] p-4 text-sm sm:w-60 sm:border-r sm:border-b-0">
          <search className="contents">
            <AutoForm className="flex flex-col gap-1">
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="name, rule, hex…"
                aria-label="Search the Library"
                enterKeyHint="search"
                className="field h-9"
                data-testid="library-search"
              />
            </AutoForm>
          </search>
          <p className="text-[var(--muted)]">
            Palettes keep their rule and seed, so a saved draw is reproducible. Colours keep their
            record id, so the entry stays the source of truth.
          </p>
          <Link href="/account" className="underline underline-offset-2">
            Your account
          </Link>
          <LibraryImport />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-8 px-6 pt-5 pb-10">
          <section className="flex flex-col gap-3" data-testid="library-palettes">
            <h1 className="text-[1.375rem] font-bold">Saved palettes</h1>
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
                          style={{
                            background: toHex(colour('oklch', c)),
                            flexGrow: v.snap.weights?.[i] ?? 1,
                          }}
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
                        aria-describedby={`rename-hint-${v.number}`}
                        maxLength={80}
                        className="field h-8 max-w-sm text-[0.9375rem]"
                      />
                      <span id={`rename-hint-${v.number}`} className="sr-only">
                        Press Enter to rename
                      </span>
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
            <h2 className="text-[1.375rem] font-bold">Saved colours</h2>
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
                        <span className="text-[0.9375rem]">{c.snap.label}</span>
                        <span className="font-mono text-[0.6875rem] text-[var(--muted)]">
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

          {deleted.length ? (
            <section className="flex flex-col gap-3" data-testid="library-deleted">
              <h2 className="text-[1.375rem] font-bold">Deleted</h2>
              <p className="text-sm text-[var(--muted)]">
                Removed here or by an agent with a key that may save. Restore brings an item back;
                Remove for good cannot be undone, and only you can do it.
              </p>
              <ul className="flex flex-col gap-2">
                {deleted.map((d) => (
                  <li
                    key={`${d.kind}-${d.number}`}
                    className="flex flex-wrap items-center gap-4 rounded-lg border border-[var(--line)] p-2.5"
                    data-testid="deleted-item"
                    data-kind={d.kind}
                  >
                    <span
                      className="flex h-8 w-24 shrink-0 overflow-hidden rounded-md"
                      aria-hidden="true"
                    >
                      {d.hexes.map((h, i) => (
                        <span key={i} className="flex-1" style={{ background: h }} />
                      ))}
                    </span>
                    <span className="min-w-0 flex-1 text-[0.9375rem]">
                      {d.label}
                      <span className="ml-2 text-xs text-[var(--muted)]">{d.kind}</span>
                    </span>
                    <form action={restoreVersion}>
                      <input type="hidden" name="project" value={d.project} />
                      <input type="hidden" name="number" value={d.number} />
                      <button type="submit" className="btn" data-testid="restore-item">
                        Restore
                      </button>
                    </form>
                    <form action={purgeVersion}>
                      <input type="hidden" name="project" value={d.project} />
                      <input type="hidden" name="number" value={d.number} />
                      <button
                        type="submit"
                        className="btn border-[var(--danger)] text-[var(--danger)]"
                        data-testid="purge-item"
                      >
                        Remove for good
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </main>
    </>
  );
}
