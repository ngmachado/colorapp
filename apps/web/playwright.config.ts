import { defineConfig, devices } from '@playwright/test';

const port = 3100;
/** The Safari replaceState throttle was found by hand, so WebKit also runs the Laboratory and wheel suites. */
const crossEngine = /(lab|lab-edit|lab-content|wheel|theory)\.e2e\.ts/;

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  testMatch: /.*\.e2e\.ts/,
  timeout: 240000,
  workers: 3,
  retries: 1,
  use: { baseURL: `http://localhost:${port}` },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, testMatch: crossEngine },
  ],
  webServer: {
    command: `rm -rf .e2e && AUTH_DISABLED=0 DATABASE_URL=pglite://memory AUTH_SECRET=e2e-secret AUTH_TEST_LOGIN=1 pnpm exec next dev -p ${port}`,
    port,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
