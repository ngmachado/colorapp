import { defineConfig, devices } from '@playwright/test';

const port = 3100;
/** A second server with no sign-in method, as the public demo runs: the Library lives in the browser. */
const localPort = 3105;
/** The Safari replaceState throttle was found by hand, so WebKit also runs the Laboratory and wheel suites. */
const crossEngine = /(lab|lab-edit|lab-content|wheel|theory)\.e2e\.ts/;
const env = 'AUTH_DISABLED=0 DATABASE_URL=pglite://memory AUTH_SECRET=e2e-secret AUTH_TEST_LOGIN=1';

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.e2e\.ts/,
  globalSetup: './e2e/global-setup.ts',
  timeout: 240000,
  workers: 3,
  retries: 1,
  use: { baseURL: `http://localhost:${port}` },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /local-library\.e2e\.ts/,
    },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, testMatch: crossEngine },
    {
      name: 'local-library',
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${localPort}` },
      testMatch: /local-library\.e2e\.ts/,
    },
  ],
  webServer: [
    {
      command: `rm -rf .e2e && ${env} pnpm exec next dev -p ${port}`,
      port,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      // VERCEL=1 hides the SMTP fallback, so no provider exists and accounts are off.
      command: `${env} VERCEL=1 pnpm exec next dev -p ${localPort}`,
      port: localPort,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
