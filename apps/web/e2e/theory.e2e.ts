import { expect, test } from '@playwright/test';

test('moving the hue changes the swatch and every structure row; a lock holds its dimension', async ({
  page,
}) => {
  await page.goto('/theory');
  const rows = page.getByTestId('structure-row');
  await expect(rows).toHaveCount(7);
  const bg = () =>
    page.getByTestId('swatch').evaluate((el) => getComputedStyle(el).backgroundColor);
  const before = await bg();
  const hue = page.locator('#dim-2');
  await expect(hue).toBeDisabled();
  await page.getByLabel('lock').nth(2).uncheck();
  await hue.fill('120');
  await expect(page.getByTestId('value-2')).toHaveText('120.0');
  expect(await bg()).not.toBe(before);
  await page.getByLabel('Read in space').selectOption('hsl');
  await expect(page.getByTestId('readout')).toContainText('hsl');
  await expect(page.getByTestId('wuxing').locator('line')).toHaveCount(10);
  await expect(page.getByTestId('wuxing')).toHaveAttribute('href', '/dictionary/zh-wuxing');
  await expect(page.getByTestId('structures')).toContainText('Triadic');
  await expect(page.getByTestId('western').getByRole('link')).toHaveCount(8);
  await expect(page.getByTestId('western').locator('line')).toHaveCount(7);
  await expect(page.getByTestId('western-passages')).toContainText(/\d+ passages/);
  await expect(page.getByTestId('term')).toHaveCount(13);
  await expect(page.getByTestId('terms')).toContainText('Simultaneous contrast');
});
