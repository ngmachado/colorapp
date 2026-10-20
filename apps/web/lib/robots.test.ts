import { afterEach, expect, it, vi } from 'vitest';
import robots from '../app/robots';
afterEach(() => vi.unstubAllEnvs());
it('disallows all crawling on preview deployments', () => {
  vi.stubEnv('VERCEL_ENV', 'preview');
  expect(robots().rules).toEqual({ userAgent: '*', disallow: '/' });
});
it('allows public pages but excludes personal and API paths in production', () => {
  vi.stubEnv('VERCEL_ENV', 'production');
  expect(robots().rules).toEqual({
    userAgent: '*',
    allow: '/',
    disallow: ['/api/', '/account', '/library', '/signin', '/lab?'],
  });
});
