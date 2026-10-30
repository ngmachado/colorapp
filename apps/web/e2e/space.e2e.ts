import { expect, test } from '@playwright/test';

test('the map plots a palette, names each colour’s nearest record, and filters by collection', async ({
  page,
}) => {
  await page.goto('/space?hex=663399,ffffff');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Colour space map');
  const rows = page.getByTestId('space-palette-row');
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText('#663399');
  await expect(rows.first()).toContainText('rebeccapurple');
  await expect(rows.first()).toContainText('distance 0.000');
  // Shown count and the collection filter.
  await expect(page.getByTestId('space-shown')).toContainText('455 shown');
  await page.getByTestId('space-set').filter({ hasText: 'JIS Z 8102' }).click();
  await expect(page.getByTestId('space-shown')).toContainText('257 shown');
  await expect(rows.first()).not.toContainText('rebeccapurple');
  await expect(page).toHaveURL(/set=jis-z8102/);
  // The lightness band narrows what is shown and travels in the URL.
  await page.getByTestId('space-band').check();
  await expect(page.getByTestId('space-shown')).toContainText(/within L ±0.15 of 0.72/);
  await expect(page).toHaveURL(/band=1&l=0\.72/);
  // Either the canvas draws or the fallback explains; the panel works either way.
  await expect(
    page.locator(
      'canvas[aria-label^="Three-dimensional map"]:visible, [data-testid="space-fallback"]',
    ),
  ).toHaveCount(1);
});

test('an entry opens the map focused on its record, and the record can join the palette', async ({
  page,
}) => {
  await page.goto('/dictionary/css-rebeccapurple');
  await page.getByTestId('on-the-map').click();
  await expect(page).toHaveURL(/\/space\?focus=css-rebeccapurple&hex=663399/);
  const selected = page.getByTestId('space-selected');
  await expect(selected).toContainText('rebeccapurple');
  await expect(selected).toContainText('CSS named colours');
  await expect(selected.getByRole('link', { name: 'Open entry' })).toHaveAttribute(
    'href',
    '/dictionary/css-rebeccapurple',
  );
  await page.getByTestId('space-palette').fill('#ffffff');
  await page.getByTestId('space-add').click();
  await expect(page.getByTestId('space-palette')).toHaveValue('#ffffff #663399');
  await expect(page.getByTestId('space-palette-row')).toHaveCount(2);
});

test('the Laboratory links to the map with its columns and documented set', async ({ page }) => {
  await page.goto('/lab?hex=663399,ffffff');
  await expect(page).toHaveURL(/palette=/);
  await page.getByTestId('documented').selectOption('css-color-4');
  await expect(page.getByTestId('map-link')).toHaveAttribute(
    'href',
    '/space?hex=663399,ffffff&set=css-color-4',
  );
});
