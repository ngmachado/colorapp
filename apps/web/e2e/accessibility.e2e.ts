import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const pages = [
  '/',
  '/lab',
  '/theory',
  '/dictionary?kind=systems',
  '/dictionary/ja-sakura-iro',
  '/dictionary/zh-wuxing-wood',
  '/dictionary/chevreul-circle',
  '/dictionary/source/seigensha-wada-vol1',
  '/dictionary/source/chevreul-1890-principles-martel',
  '/dictionary/ja-ao',
  '/dictionary/combination/ja-kasane-ume-1',
  '/about',
  '/signin',
  '/signin/sent',
  '/library',
  '/compare?a=663399&b=ffffff&rb=css-rebeccapurple-srgb',
  '/munsell?hex=663399&notation=5R%204%2F14',
  '/extract',
  '/palettes',
  '/preview?hex=1a1a1a,f4f4f4,663399,dddddd',
];

for (const path of pages) {
  test(`${path} has no axe violations`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      // Deliberately low-contrast demonstration text; surrounding controls/results are audited.
      .exclude('[data-testid="contrast-preview"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    expect(
      results.violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
      ),
    ).toEqual([]);
  });
}

test('the toolbar is keyboard navigable with visible focus', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Super Colour' })).toBeFocused();
  await page.keyboard.press('Tab');
  const lab = page
    .getByRole('navigation', { name: 'Sections' })
    .getByRole('link', { name: 'Laboratory' });
  await expect(lab).toBeFocused();
  expect(await lab.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none');
});

test('the background stays white under a dark OS, and the chosen dark theme passes the same audit', async ({
  browser,
}) => {
  const ctx = await browser.newContext({ colorScheme: 'dark' });
  const page = await ctx.newPage();
  await page.goto('/theory');
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
    'rgb(255, 255, 255)',
  );
  await page.getByTestId('theme-toggle').click();
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
    'rgb(17, 18, 19)',
  );
  const results = await new AxeBuilder({ page })
    // Deliberately low-contrast demonstration text; surrounding controls/results are audited.
    .exclude('[data-testid="contrast-preview"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
  await ctx.close();
});

test('proportion controls have no axe violations', async ({ page }) => {
  await page.goto('/lab');
  await page.getByTestId('proportions-button').click();
  const results = await new AxeBuilder({ page })
    // Deliberately low-contrast demonstration text; surrounding controls/results are audited.
    .exclude('[data-testid="contrast-preview"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
