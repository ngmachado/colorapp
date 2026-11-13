import { expect, test } from '@playwright/test';

const bodyBackground = (page: import('@playwright/test').Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test('white is the default even when the OS prefers dark; dark is a choice that persists and can be undone', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/dictionary');
  const toggle = page.getByTestId('theme-toggle');
  await expect(toggle).toHaveAttribute('data-theme-shown', 'light');
  expect(await bodyBackground(page)).toBe('rgb(255, 255, 255)');

  await toggle.click();
  await expect(toggle).toHaveAttribute('data-theme-shown', 'dark');
  expect(await bodyBackground(page)).toBe('rgb(17, 18, 19)');

  // Applied before paint on the next page and after a reload.
  await page.goto('/theory');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await bodyBackground(page)).toBe('rgb(17, 18, 19)');
  await page.reload();
  expect(await bodyBackground(page)).toBe('rgb(17, 18, 19)');

  await page.getByTestId('theme-toggle').click();
  await expect(page.getByTestId('theme-toggle')).toHaveAttribute('data-theme-shown', 'light');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
  expect(await bodyBackground(page)).toBe('rgb(255, 255, 255)');
  await page.reload();
  expect(await bodyBackground(page)).toBe('rgb(255, 255, 255)');
});

test('signed in, the choice is kept on the account and follows the user to another browser', async ({
  page,
  browser,
}) => {
  const email = `theme-${test.info().project.name}@example.com`;
  await page.goto(`/api/test/login?email=${email}`);
  await page.goto('/dictionary');
  await expect(page.getByTestId('theme-toggle')).toHaveAttribute('data-theme-shown', 'light');
  await page.getByTestId('theme-toggle').click();
  await expect(page.getByTestId('theme-toggle')).toHaveAttribute('data-theme-shown', 'dark');
  await expect
    .poll(async () => (await page.request.get('/api/settings').then((r) => r.json())).theme)
    .toBe('dark');

  // A second browser with nothing stored: the account's choice arrives with the page.
  const other = await browser.newContext();
  const page2 = await other.newPage();
  await page2.goto(`/api/test/login?email=${email}`);
  await page2.goto('/theory');
  await expect(page2.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await bodyBackground(page2)).toBe('rgb(17, 18, 19)');

  // Switching back there is kept too, and the first browser follows on its next page.
  await page2.getByTestId('theme-toggle').click();
  await expect(page2.getByTestId('theme-toggle')).toHaveAttribute('data-theme-shown', 'light');
  await expect
    .poll(async () => (await page2.request.get('/api/settings').then((r) => r.json())).theme)
    .toBe('light');
  await other.close();
  await page.goto('/dictionary');
  await expect(page.getByTestId('theme-toggle')).toHaveAttribute('data-theme-shown', 'light');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
});

test('the Laboratory wheel repaints its out-of-gamut grey for the theme', async ({ page }) => {
  await page.goto('/lab?palette=0.72,0.16,40;0.72,0.16,160;0.72,0.16,280&structure=triadic&n=4030');
  await expect(page).toHaveURL(/palette=/);
  await page.getByTestId('wheel-button').click();
  const grey = () =>
    page.evaluate(() => {
      const c = document.querySelector('[data-testid="wheel-panel"] canvas') as HTMLCanvasElement;
      // A pixel at 85% of the radius towards +a (red) at L 0.72 is inside the rim and beyond sRGB:
      // it carries the theme grey. Alpha 255 proves the sample is on the disc, not outside it.
      const x = Math.floor(c.width / 2 + 0.85 * (c.width / 2));
      const d = c.getContext('2d')!.getImageData(x, Math.floor(c.height / 2), 1, 1).data;
      return [d[0], d[1], d[2], d[3]];
    });
  expect(await grey()).toEqual([236, 236, 236, 255]);
  await page.getByTestId('theme-toggle').click();
  await expect(page.getByTestId('theme-toggle')).toHaveAttribute('data-theme-shown', 'dark');
  await expect.poll(grey).toEqual([46, 47, 50, 255]);
});
