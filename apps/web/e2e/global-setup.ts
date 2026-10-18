import type { FullConfig } from '@playwright/test';

/**
 * Visits every route once so the dev server has compiled them before a browser arrives.
 * WebKit reports a navigation into a route that is still compiling as interrupted.
 */
const ROUTES = [
  '/',
  '/lab',
  '/lab?from=goethe-yellow,goethe-blue-red',
  '/theory',
  '/theory?hex=663399',
  '/dictionary',
  '/dictionary?kind=systems',
  '/dictionary?kind=sources',
  '/dictionary/ja-sakura-iro',
  '/dictionary/goethe-yellow',
  '/dictionary/combination/ja-kasane-ume-1',
  '/dictionary/source/seigensha-wada-vol1',
  '/library',
  '/account',
  '/about',
  '/signin',
  '/signin/sent',
  '/nowhere',
];

export default async function warm(config: FullConfig) {
  const base = config.projects[0]?.use.baseURL;
  if (!base) return;
  for (const r of ROUTES) await fetch(base + r).catch(() => undefined);
}
