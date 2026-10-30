'use client';

import { useEffect, useState } from 'react';

export const THEME_KEY = 'sca.theme';
export type Theme = 'light' | 'dark';

/** The reader's stored choice. White is the default; storage can be missing or blocked, so every access is guarded. */
export function readTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') root.dataset.theme = 'dark';
  else delete root.dataset.theme;
  try {
    if (theme === 'dark') localStorage.setItem(THEME_KEY, 'dark');
    else localStorage.removeItem(THEME_KEY);
  } catch {
    // Nothing to do: the page still shows the chosen theme for this visit.
  }
}

/** What the page shows right now. */
export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

/**
 * A counter that changes whenever the theme does, for canvases and scenes that read token values when they
 * paint and so cannot follow CSS on their own.
 */
export function useThemeVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const observer = new MutationObserver(() => setVersion((v) => v + 1));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);
  return version;
}
