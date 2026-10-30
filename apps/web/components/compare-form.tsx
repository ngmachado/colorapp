'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { parseHex } from '@/lib/contrast';

/** Two hex fields; submitting opens the comparison, which lives in the address. */
export function CompareForm({ a, b, swap }: { a: string; b: string; swap: string }) {
  const router = useRouter();
  const [error, setError] = useState('');
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const ha = parseHex(String(data.get('a') ?? ''));
    const hb = parseHex(String(data.get('b') ?? ''));
    if (!ha || !hb) return setError('Enter 3 or 6 hex digits for each colour.');
    setError('');
    router.push(`/compare?a=${ha.slice(1)}&b=${hb.slice(1)}`);
  }
  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3" data-testid="compare-form">
      <label className="flex flex-col gap-1 text-xs">
        A
        <input
          name="a"
          defaultValue={a}
          className="field h-9 w-32 font-mono"
          aria-label="Colour A hex"
          data-testid="compare-a"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        B
        <input
          name="b"
          defaultValue={b}
          className="field h-9 w-32 font-mono"
          aria-label="Colour B hex"
          data-testid="compare-b"
        />
      </label>
      <button type="submit" className="btn btn-primary h-9">
        Compare
      </button>
      <Link href={swap} className="btn h-9" data-testid="compare-swap">
        Swap
      </Link>
      {error ? (
        <span role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </span>
      ) : null}
    </form>
  );
}
