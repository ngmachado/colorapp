import { expect, test } from '@playwright/test';

test('the grid shows colours only, Systems includes both documented systems, and a record is found by transliteration', async ({
  page,
}) => {
  await page.goto('/dictionary');
  await expect(page.getByTestId('card').filter({ hasText: 'rebeccapurple' })).toBeVisible();
  await expect(page.getByTestId('card').filter({ hasText: '桜色' })).toBeVisible();
  await expect(page.getByTestId('card').filter({ hasText: "Goethe's colour circle" })).toHaveCount(
    0,
  );
  await expect(page.getByTestId('card').filter({ hasText: 'Wood (' })).toHaveCount(0);
  await expect(page.getByRole('radio', { name: 'Systems', exact: true })).toBeVisible();
  await page.goto('/dictionary?kind=systems');
  await expect(page.getByTestId('system').filter({ hasText: /Goethe/i })).toHaveCount(0);
  await expect(page.getByTestId('system')).toHaveCount(2);
  await page.goto('/dictionary/chevreul-circle');
  await expect(page.getByTestId('chevreul-circle')).toBeVisible();
  await expect(page.locator('#meaning')).toContainText('simultaneous contrast');
  await expect(page.locator('#source')).toContainText('72 scales');
  await page.goto('/dictionary?q=achi');
  await expect(page.getByTestId('card').filter({ hasText: '褐色' })).toBeVisible();
  await expect(page.getByTestId('card').filter({ hasText: '褐色' })).toContainText(
    'matched transliteration',
  );
});

test('the list view shows the same records as rows', async ({ page }) => {
  await page.goto('/dictionary?tradition=web');
  const n = await page.getByTestId('card').count();
  await page.getByTestId('view-list').click();
  await expect(page.getByTestId('list')).toBeVisible();
  await expect(page.getByTestId('card')).toHaveCount(n);
  await expect(page.getByTestId('card').first()).toContainText('rebeccapurple');
});

test('near-colour search sorts by distance and names the metric', async ({ page }) => {
  await page.goto('/dictionary?near=%23663399');
  await expect(page.getByTestId('count')).toContainText('nearest to #663399');
  await expect(page.getByTestId('card').first()).toContainText('rebeccapurple');
  await expect(page.getByTestId('card').first()).toContainText('distance 0.000');
});

test('a colour entry shows the source first and missing fields read "not documented"', async ({
  page,
}) => {
  await page.goto('/dictionary/ja-sakura-iro');
  await expect(page.getByTestId('band')).toContainText('桜色');
  const sections = page.locator('main section');
  await expect(sections.first()).toHaveAttribute('id', 'source');
  await expect(page.getByTestId('values')).toContainText('srgb');
  await expect(page.getByText('not documented').first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Use as seed' })).toHaveAttribute(
    'href',
    /\/lab\?seed=ja-sakura-iro/,
  );
});

test('a Wada source page is bibliographic only', async ({ page }) => {
  await page.goto('/dictionary/source/seigensha-wada-vol1');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'A Dictionary of Color Combinations',
  );
  await expect(page.locator('figure')).toHaveCount(0);
  await expect(page.getByText('Cited only.', { exact: false })).toBeVisible();
  await expect(
    page.getByText('Only the bibliographic record is held.', { exact: false }),
  ).toBeVisible();
});
