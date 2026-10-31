'use client';

import { useActionState, useState } from 'react';
import { createKey, revokeKey, type CreateKeyState } from '@/app/account/actions';

export interface KeyRow {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  monthCount: number;
}

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const day = (iso: string) => dateFmt.format(new Date(iso));
/** "2 minutes ago" up to a day, then the date. */
function ago(iso: string, now: number) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  return day(iso);
}

function Revoke({ id, name }: { id: string; name: string }) {
  const [asking, setAsking] = useState(false);
  if (!asking)
    return (
      <button type="button" className="btn h-8 text-[13px]" onClick={() => setAsking(true)}>
        Revoke
      </button>
    );
  return (
    <form
      action={revokeKey}
      className="flex flex-wrap items-center gap-2 text-[13px]"
      data-testid="confirm-revoke"
    >
      <input type="hidden" name="id" value={id} />
      <span>Revoke “{name}”? Anything using it stops working now.</span>
      <button
        type="submit"
        className="btn h-8 border-[var(--danger)] text-[13px] text-[var(--danger)]"
      >
        Revoke
      </button>
      <button type="button" className="btn h-8 text-[13px]" onClick={() => setAsking(false)}>
        Keep
      </button>
    </form>
  );
}

/** Copies the secret; when the clipboard is refused, selects it so the user can copy by hand. */
function Copy({ text, target }: { text: string; target: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          const el = document.getElementById(target);
          if (el) getSelection()?.selectAllChildren(el);
        }
      }}
    >
      {done ? 'Copied' : 'Copy'}
    </button>
  );
}

/** The user's API keys: one row each, a one-time showing of a new secret, and the form that makes one. */
export function ApiKeys({
  keys,
  limits,
  now,
}: {
  keys: KeyRow[];
  limits: { perMonth: number; perMinute: number; activeKeys: number };
  now: number;
}) {
  const [state, formAction, pending] = useActionState<CreateKeyState, FormData>(createKey, null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const created = state?.created && state.created.secret !== dismissed ? state.created : null;
  const live = keys.filter((k) => !k.revokedAt).length;
  return (
    <>
      {keys.length > 0 ? (
        <ul className="flex flex-col gap-2" data-testid="api-keys">
          {keys.map((k) => (
            <li
              key={k.id}
              data-testid="api-key"
              data-revoked={k.revokedAt ? 'true' : undefined}
              className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border border-[var(--line)] px-3 py-2.5 ${k.revokedAt ? 'text-[var(--muted)]' : ''}`}
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className={k.revokedAt ? 'line-through' : 'text-[15px] font-medium'}>
                  {k.name}
                </span>
                <span className="flex flex-wrap gap-x-3.5 gap-y-0.5 text-[13px] text-[var(--muted)]">
                  <code className="font-mono text-xs">{k.prefix}</code>
                  {k.revokedAt ? (
                    <span>revoked {day(k.revokedAt)}</span>
                  ) : (
                    <>
                      <span>created {day(k.createdAt)}</span>
                      <span>
                        {k.lastUsedAt ? `last used ${ago(k.lastUsedAt, now)}` : 'never used'}
                      </span>
                      <span className="flex items-center gap-2 tabular-nums">
                        <span
                          className="h-1 w-20 overflow-hidden rounded-sm bg-[var(--accent-soft)]"
                          aria-hidden="true"
                        >
                          <span
                            className="block h-full bg-[var(--fg)]"
                            style={{
                              width: `${Math.min(100, (100 * k.monthCount) / limits.perMonth)}%`,
                            }}
                          />
                        </span>
                        {k.monthCount.toLocaleString('en-GB')} of{' '}
                        {limits.perMonth.toLocaleString('en-GB')} calls this month
                      </span>
                    </>
                  )}
                </span>
              </span>
              {!k.revokedAt ? <Revoke id={k.id} name={k.name} /> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--muted)]">No keys yet.</p>
      )}

      {created ? (
        <div
          className="flex flex-col gap-2.5 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3"
          data-testid="new-key"
        >
          <p>
            <strong>New key “{created.name}”.</strong> This is the only time it is shown. Copy it
            now and store it where the script or agent reads it.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code
              id="new-key-secret"
              className="min-w-0 flex-1 basis-64 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2.5 py-2 font-mono text-[13px] break-all select-all"
              data-testid="new-key-secret"
            >
              {created.secret}
            </code>
            <Copy text={created.secret} target="new-key-secret" />
          </div>
          <p className="rounded-r-md border-l-[3px] border-[var(--warn)] bg-[var(--warn-soft)] px-2.5 py-1.5 text-[13px] text-[var(--warn)]">
            If you lose it, revoke it and create another. Only a hash is kept here.
          </p>
          <p>
            <button
              type="button"
              className="btn h-8 text-[13px]"
              onClick={() => setDismissed(created.secret)}
            >
              Done
            </button>
          </p>
        </div>
      ) : null}

      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <label htmlFor="key-name" className="sr-only">
          Name of the new key
        </label>
        <input
          id="key-name"
          name="name"
          className="field min-w-0 flex-1 basis-52"
          placeholder="Name, for example Claude Desktop"
          maxLength={40}
          required
          disabled={live >= limits.activeKeys}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={pending || live >= limits.activeKeys}
          data-testid="create-key"
        >
          Create key
        </button>
      </form>
      {state?.error ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {state.error}
        </p>
      ) : null}
      <p className="text-[13px] text-[var(--muted)]">
        Quota: {limits.perMonth.toLocaleString('en-GB')} calls per key per month and{' '}
        {limits.perMinute} per minute. A call over the limit gets a 429 and nothing is counted.{' '}
        {limits.activeKeys} keys at a time
        {live >= limits.activeKeys ? '; revoke one to make another' : ''}.
      </p>
    </>
  );
}
