import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('hex entry normalizes, validates and exposes copyable conversions', async ({ page }) => {
  await page.goto('/colour');
  await page.getByLabel('Inspect a colour').fill('#Fc2');
  await page.getByRole('button', { name: 'Inspect', exact: true }).click();
  await expect(page).toHaveURL(/\/colour\/ffcc22$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('#FFCC22');
  await expect(page.getByTestId('conversion')).toHaveCount(6);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/colour\/ffcc22$/);
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as unknown as { copied: string }).copied = text;
        },
      },
    }),
  );
  // The page may not be hydrated yet when it first renders; a click before that is lost, so retry.
  await expect(async () => {
    await page.getByRole('button', { name: 'Copy OKLCh', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'OKLCh copied' })).toBeVisible({
      timeout: 1500,
    });
  }).toPass({ timeout: 15000 });
  expect(await page.evaluate(() => (window as unknown as { copied: string }).copied)).toMatch(
    /^oklch\(/,
  );
  await page.getByLabel('Inspect a colour').fill('ff000080');
  await page.getByRole('button', { name: 'Inspect', exact: true }).click();
  await expect(page.locator('#hex-error')).toContainText('Alpha is not supported');
  await expect(page).toHaveURL(/\/colour\/ffcc22$/);
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error('denied');
        },
      },
    }),
  );
  await page.getByRole('button', { name: 'Copy HEX', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Copy unavailable' })).toBeVisible();
});

test('canonical routes, invalid values, neutral hue and exact black/white contrast', async ({
  page,
  request,
}) => {
  const redirect = await request.get('/colour/ABC', { maxRedirects: 0 });
  expect(redirect.status()).toBe(308);
  expect(redirect.headers().location).toBe('/colour/aabbcc');
  expect((await request.get('/colour/invalid')).status()).toBe(404);
  await page.goto('/colour/000000');
  await expect(page.getByTestId('contrast-sample').first()).toContainText('21.00:1');
  await expect(page.getByTestId('contrast-sample').nth(1)).toContainText('1.00:1');
  await expect(page.getByTestId('conversion').filter({ hasText: 'OKLCh' })).toContainText(
    '0 none)',
  );
  await expect(page.getByTestId('entry-scale').locator('a')).toHaveCount(9);
  await expect(page.getByTestId('chroma-scale').locator('a')).toHaveCount(9);
});

test('inspector connects Laboratory, Dictionary and documented provenance', async ({ page }) => {
  await page.goto('/lab?hex=663399,ffffff');
  await expect(page).toHaveURL(/palette=/);
  await page.getByTestId('inspect-colour').first().click();
  await expect(page).toHaveURL(/\/colour\/663399$/);
  const nearby = page.getByTestId('nearby-record').first();
  await expect(nearby).toContainText('rebeccapurple');
  await expect(nearby).toContainText('0.00000');
  await expect(nearby.locator('[data-status]')).toBeVisible();
  await expect(nearby).toContainText('CSS');
  await page.getByRole('link', { name: 'Open in Laboratory', exact: true }).click();
  await expect(page.getByTestId('column').first()).toHaveAttribute('data-hex', '#663399');
  await page.goto('/dictionary?q=%23663399');
  await page.getByRole('link', { name: 'Inspect this colour' }).click();
  await expect(page).toHaveURL(/\/colour\/663399$/);
});

test('inspector fits phone and desktop and has no automated accessibility violations', async ({
  page,
}) => {
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/colour/fc2222');
    await page.waitForLoadState('networkidle');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const results = await new AxeBuilder({ page })
      // Samples deliberately demonstrate failing colour pairs; labels/results remain audited.
      .exclude('[data-testid="contrast-preview"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    expect(
      results.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
    ).toEqual([]);
    await page.screenshot({ path: `/tmp/colour-inspector-${width}.png`, fullPage: true });
  }
});
