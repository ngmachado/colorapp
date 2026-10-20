'use client';

import { colour, toHex } from '@sca/colour-engine';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  exportBundle,
  readColours,
  readPalettes,
  removeColour,
  removePalette,
  renamePalette,
  type SavedColour,
  type SavedPalette,
} from '@/lib/local-library';
import { LibraryImport } from '@/components/library-import';
import { stateParams } from '@/lib/palette-param';

/** The Library when it lives in this browser: the same two sections as the server one, read from local storage. */
export function LocalLibrary() {
  const [palettes, setPalettes] = useState<SavedPalette[]>([]);
  const [colours, setColours] = useState<SavedColour[]>([]);
  const [q, setQ] = useState('');
  const [loaded, setLoaded] = useState(false);
  const refresh = () => {
    setPalettes(readPalettes(localStorage));
    setColours(readColours(localStorage));
    setLoaded(true);
  };
  useEffect(refresh, []);
  const needle = q.trim().toLowerCase();
  const shownPalettes = palettes.filter(
    (p) =>
      !needle ||
      `${p.note} ${p.state.structure} seed ${p.state.seed} ${p.state.palette
        .map((c) => toHex(colour('oklch', c)))
        .join(' ')}`
        .toLowerCase()
        .includes(needle),
  );
  const shownColours = colours.filter(
    (c) => !needle || `${c.label} ${c.conceptId} ${c.hex ?? ''}`.toLowerCase().includes(needle),
  );
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(exportBundle(localStorage), null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'super-colour-library.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main id="main" className="flex flex-col sm:flex-row">
      <aside className="flex w-full shrink-0 flex-col gap-[22px] border-b border-[var(--line)] p-4 text-sm sm:w-60 sm:border-r sm:border-b-0">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="name, rule, hex…"
          aria-label="Search the Library"
          className="field h-9"
          data-testid="library-search"
        />
        <p className="text-[var(--muted)]">
          Kept in this browser, on this device. Palettes keep their rule, seed, locks and names;
          colours keep their record. Clearing site data clears the Library.
        </p>
        <button
          type="button"
          onClick={download}
          className="btn self-start"
          data-testid="library-export"
        >
          Download as JSON
        </button>
        <LibraryImport local onImported={refresh} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-8 px-6 pt-5 pb-10">
        <section className="flex flex-col gap-3" data-testid="library-palettes">
          <h1 className="text-[22px] font-bold">Saved palettes</h1>
          {!loaded ? null : shownPalettes.length === 0 && needle ? (
            <p className="text-sm text-[var(--muted)]">No saved palette matches “{q}”.</p>
          ) : shownPalettes.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              None yet. Save one from the{' '}
              <Link href="/lab" className="underline underline-offset-2">
                Laboratory
              </Link>
              .
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {shownPalettes.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center gap-4 rounded-lg border border-[var(--line)] p-2.5"
                  data-testid="saved-palette"
                >
                  <span className="flex h-12 w-48 shrink-0 overflow-hidden rounded-md">
                    {p.state.palette.map((c, i) => (
                      <span
                        key={i}
                        className="flex-1"
                        style={{
                          background: toHex(colour('oklch', c)),
                          flexGrow: p.state.weights?.[i] ?? 1,
                        }}
                      />
                    ))}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <input
                      defaultValue={p.note}
                      aria-label={`Name of ${p.note}`}
                      maxLength={80}
                      title="Press Enter to rename"
                      className="field h-8 max-w-sm text-[15px]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                      }}
                      onBlur={(e) => {
                        const v = e.currentTarget.value.trim();
                        if (v && v !== p.note) {
                          renamePalette(localStorage, p.id, v);
                          refresh();
                        }
                      }}
                    />
                    <span className="font-mono text-xs text-[var(--muted)]">
                      {p.state.structure} · seed {p.state.seed} · {p.state.palette.length} roles
                    </span>
                  </span>
                  <Link href={`/lab?${stateParams(p.state)}`} className="btn">
                    Open in the Laboratory
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      removePalette(localStorage, p.id);
                      refresh();
                    }}
                    className="btn"
                    aria-label={`Delete ${p.note}`}
                    data-testid="delete-palette"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3" data-testid="library-colours">
          <h2 className="text-[22px] font-bold">Saved colours</h2>
          {!loaded ? null : shownColours.length === 0 && needle ? (
            <p className="text-sm text-[var(--muted)]">No saved colour matches “{q}”.</p>
          ) : shownColours.length === 0 ? (
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
              {shownColours.map((c) => (
                <div
                  key={c.conceptId}
                  className="flex flex-col overflow-hidden rounded-lg border border-[var(--line)] hover:border-[var(--fg)]"
                  data-testid="saved-colour"
                >
                  <Link href={`/dictionary/${c.conceptId}`} className="flex flex-col">
                    {c.hex ? (
                      <span className="h-[90px]" style={{ background: c.hex }} />
                    ) : (
                      <span className="flex h-[90px] items-center justify-center bg-[var(--accent-soft)] text-xs text-[var(--muted)]">
                        no displayable value
                      </span>
                    )}
                    <span className="flex flex-col gap-[3px] px-3 pt-2.5">
                      <span className="text-[15px]">{c.label}</span>
                      <span className="font-mono text-[11px] text-[var(--muted)]">
                        {c.hex ? c.hex.slice(1).toUpperCase() : 'no fixed value'}
                      </span>
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      removeColour(localStorage, c.conceptId);
                      refresh();
                    }}
                    className="px-3 pt-1 pb-2.5 text-left text-xs text-[var(--muted)] underline underline-offset-2"
                    aria-label={`Remove ${c.label} from the Library`}
                    data-testid="delete-colour"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
