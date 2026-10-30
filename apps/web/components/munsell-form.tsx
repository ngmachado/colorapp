'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { parseHex } from '@/lib/contrast';

/** Either a hex colour or a notation; the lookup lives in the address. */
export function MunsellForm({ hex, notation }: { hex: string; notation: string }) {
  const router = useRouter();
  const [error, setError] = useState('');
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const h = String(data.get('hex') ?? '').trim();
    const n = String(data.get('notation') ?? '').trim();
    const parsed = h ? parseHex(h) : null;
    if (h && !parsed) return setError('Enter 3 or 6 hex digits, or leave the colour empty.');
    if (!parsed && !n) return setError('Enter a colour or a notation.');
    setError('');
    const q = new URLSearchParams();
    if (parsed) q.set('hex', parsed.slice(1));
    if (n) q.set('notation', n);
    router.push(`/munsell?${q}`);
  }
  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3" data-testid="munsell-form">
      <label className="flex flex-col gap-1 text-xs">
        sRGB colour
        <input
          name="hex"
          defaultValue={hex}
          placeholder="#5a2d82"
          className="field h-9 w-32 font-mono"
          aria-label="sRGB hex colour"
          data-testid="munsell-hex"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Munsell notation
        <input
          name="notation"
          defaultValue={notation}
          placeholder="5R 4/14"
          className="field h-9 w-36 font-mono"
          aria-label="Munsell notation"
          data-testid="munsell-notation-input"
        />
      </label>
      <button type="submit" className="btn btn-primary h-9">
        Look up
      </button>
      {error ? (
        <span role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </span>
      ) : null}
    </form>
  );
}
