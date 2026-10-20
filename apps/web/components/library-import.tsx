'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IMPORT_LIMIT, parseLibraryImport } from '@/lib/library-import';
import { importBundle } from '@/lib/local-library';

export function LibraryImport({
  local = false,
  onImported,
}: {
  local?: boolean;
  onImported?: () => void;
}) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <div className="flex flex-col gap-2 text-sm">
      <label className="flex flex-col gap-2">
        Import Library JSON
        <input
          type="file"
          accept=".json,application/json"
          disabled={busy}
          className="min-w-0 max-w-full text-xs"
          onChange={async (event) => {
            const input = event.currentTarget;
            const file = input.files?.[0];
            if (!file) return;
            setBusy(true);
            setMessage('Checking file…');
            try {
              if (file.size > IMPORT_LIMIT)
                throw new Error('Choose a JSON file smaller than 2 MiB.');
              const raw = await file.text();
              parseLibraryImport(raw);
              let result;
              if (local) result = importBundle(localStorage, raw);
              else {
                const response = await fetch('/api/library/import', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: raw,
                });
                result = await response.json();
                if (!response.ok) throw new Error(result.error ?? 'Import failed.');
              }
              setMessage(
                `Imported ${result.palettes} palette${result.palettes === 1 ? '' : 's'} and ${result.colours} colour${result.colours === 1 ? '' : 's'}; ${result.skipped} duplicate${result.skipped === 1 ? '' : 's'} skipped.`,
              );
              onImported?.();
              router.refresh();
            } catch (error) {
              setMessage(error instanceof Error ? error.message : 'Import failed.');
            } finally {
              setBusy(false);
              input.value = '';
            }
          }}
        />
      </label>
      <p className="text-xs text-[var(--muted)]">
        Merge a Library or account export (up to 2 MiB). Existing items are kept; duplicates are
        skipped.
      </p>
      <p role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
