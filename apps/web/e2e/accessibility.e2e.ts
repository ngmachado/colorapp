import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const pages = [
  '/',
  '/lab',
  '/theory',
  '/dictionary?kind=systems',
  '/dictionary/ja-sakura-iro',
  '/dictionary/zh-wuxing-wood',
  '/dictionary/source/seigensha-wada-vol1',
  '/dictionary/source/chevreul-1890-principles-martel',
  '/dictionary/ja-ao',
  '/dictionary/combination/ja-kasane-ume-1',
  '/about',
  '/signin',
  '/signin/sent',
  '/library',
];

for (const path of pages) {
  test(`${path} has no axe violations`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
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

test('background stays white when the OS prefers dark', async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: 'dark' });
  const page = await ctx.newPage();
  await page.goto('/theory');
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
    'rgb(255, 255, 255)',
  );
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
  await ctx.close();
});
