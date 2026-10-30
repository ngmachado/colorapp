'use client';

import { useEffect, useState } from 'react';
import { applyTheme, currentTheme, readTheme, type Theme } from '@/lib/theme';

/**
 * One button that switches between white and dark. White is the default; the server renders that state and the
 * stored choice arrives after mount, so there is nothing to hydrate wrongly.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');
  useEffect(() => {
    setTheme(currentTheme() === 'dark' ? 'dark' : readTheme());
  }, []);
  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  const label =
    theme === 'dark' ? 'Dark background. Switch to white.' : 'White background. Switch to dark.';
  return (
    <button
      type="button"
      className="btn h-8 px-2.5 text-[13px]"
      onClick={() => {
        applyTheme(next);
        setTheme(next);
      }}
      aria-label={label}
      title={label}
      aria-pressed={theme === 'dark'}
      data-testid="theme-toggle"
      data-theme-shown={theme}
    >
      <span aria-hidden="true">{theme === 'dark' ? '☾' : '☼'}</span>
      <span className="ml-1.5">{theme === 'dark' ? 'Dark' : 'Light'}</span>
    </button>
  );
}
