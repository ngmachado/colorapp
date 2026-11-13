'use client';

import { useEffect, useState } from 'react';
import { applyTheme, currentTheme, readTheme, type Theme } from '@/lib/theme';

/**
 * One button that switches between white and dark. White is the default; the server renders that state and the
 * stored choice arrives after mount, so there is nothing to hydrate wrongly.
 *
 * Signed out, the choice lives in this browser. Signed in, it is also kept on the account: the account's
 * choice is applied on arrival, so it follows the user to another browser, and each switch is sent back.
 */
export function ThemeToggle({
  signedIn = false,
  accountTheme = null,
}: {
  signedIn?: boolean;
  accountTheme?: Theme | null;
}) {
  const [theme, setTheme] = useState<Theme>('light');
  useEffect(() => {
    if (accountTheme) {
      applyTheme(accountTheme);
      setTheme(accountTheme);
    } else setTheme(currentTheme() === 'dark' ? 'dark' : readTheme());
  }, [accountTheme]);
  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  const label =
    theme === 'dark' ? 'Dark background. Switch to white.' : 'White background. Switch to dark.';
  return (
    <button
      type="button"
      className="btn h-8 px-2.5 text-[0.8125rem]"
      onClick={() => {
        applyTheme(next);
        setTheme(next);
        if (signedIn)
          fetch('/api/settings', {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ theme: next }),
          }).catch((e: unknown) => console.error('theme: not kept on the account', e));
      }}
      aria-label={label}
      aria-pressed={theme === 'dark'}
      data-testid="theme-toggle"
      data-theme-shown={theme}
    >
      <span aria-hidden="true">{theme === 'dark' ? '☾' : '☼'}</span>
      <span className="ml-1.5">{theme === 'dark' ? 'Dark' : 'Light'}</span>
    </button>
  );
}
