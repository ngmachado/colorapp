'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { addColour } from '@/lib/local-library';

/**
 * Saves a documented colour to the Library. The record id is what is kept, never a bare value.
 * With `local`, the Library is this browser's; otherwise the server's, behind sign-in.
 */
export function SaveColour({
  conceptId,
  label,
  hex,
  local,
}: {
  conceptId: string;
  label: string;
  hex: string | null;
  local: boolean;
}) {
  const [state, setState] = useState<ReactNode>(null);
  const library = (
    <Link href="/library" className="underline underline-offset-2">
      Library
    </Link>
  );
  async function save() {
    if (local) {
      const { already } = addColour(localStorage, { conceptId, label, hex });
      return setState(
        <>
          {already ? 'Already in the ' : 'Saved to the '}
          {library}.
        </>,
      );
    }
    const res = await fetch('/api/colours', {
      method: 'POST',
      body: JSON.stringify({ conceptId }),
    });
    if (res.status === 401)
      return setState(
        <>
          <Link
            href={`/signin?next=${encodeURIComponent(window.location.pathname)}`}
            className="underline underline-offset-2"
          >
            Sign in
          </Link>{' '}
          to save colours.
        </>,
      );
    const j = (await res.json()) as { already?: boolean; error?: string };
    setState(
      res.ok ? (
        <>
          {j.already ? 'Already in the ' : 'Saved to the '}
          {library}.
        </>
      ) : (
        (j.error ?? 'Not saved.')
      ),
    );
  }
  return (
    <span className="flex items-center gap-2">
      {state ? (
        <span
          className="text-xs text-[var(--muted)]"
          role="status"
          data-testid="save-colour-status"
        >
          {state}
        </span>
      ) : null}
      <button type="button" onClick={save} className="btn" data-testid="save-colour">
        Save
      </button>
    </span>
  );
}
