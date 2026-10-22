'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { parseHex } from '@/lib/contrast';

export function ColourInput({ initial = '' }: { initial?: string }) {
  const router = useRouter();
  const [error, setError] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const hex = parseHex(String(new FormData(event.currentTarget).get('hex') ?? ''));
    if (!hex) return setError('Enter 3 or 6 hex digits, such as #fc2222. Alpha is not supported.');
    setError('');
    router.push(`/colour/${hex.slice(1)}`);
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label htmlFor="inspect-hex" className="text-sm font-medium">
        Inspect a colour
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id="inspect-hex"
          name="hex"
          defaultValue={initial}
          placeholder="#fc2222"
          className="field min-w-0 font-mono"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={!!error}
          aria-describedby={error ? 'hex-error' : undefined}
        />
        <button className="btn btn-primary" type="submit">
          Inspect
        </button>
      </div>
      {error ? (
        <p id="hex-error" role="alert" className="text-sm">
          {error}
        </p>
      ) : null}
    </form>
  );
}

export function CopyValue({ label, text }: { label: string; text: string }) {
  const [status, setStatus] = useState('');
  return (
    <div className="flex flex-wrap items-center gap-3">
      <code className="break-all text-sm select-all">{text}</code>
      <button
        type="button"
        className="btn min-h-11"
        aria-label={`Copy ${label}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setStatus(`${label} copied`);
          } catch {
            setStatus('Copy unavailable. Select and copy the value above.');
          }
        }}
      >
        Copy
      </button>
      <span role="status" className="text-xs text-[var(--muted)]">
        {status}
      </span>
    </div>
  );
}
