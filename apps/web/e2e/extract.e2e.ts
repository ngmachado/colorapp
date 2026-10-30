import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';

test('image colours are measured in the browser as observations with shares, then open in the Laboratory', async ({
  page,
}) => {
  await page.goto('/extract');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Image colours');
  await page.getByTestId('extract-k').selectOption('2');
  await page
    .getByTestId('extract-file')
    .setInputFiles(fileURLToPath(new URL('./fixtures/two-colours.png', import.meta.url)));
  const obs = page.getByTestId('observation');
  await expect(obs).toHaveCount(2);
  await expect(obs.nth(0)).toHaveAttribute('data-hex', '#663399');
  await expect(obs.nth(0)).toHaveAttribute('data-share', '0.750');
  await expect(obs.nth(1)).toHaveAttribute('data-hex', '#ffffff');
  await expect(obs.nth(0).getByTestId('observation-near')).toContainText('rebeccapurple');
  await expect(obs.nth(0).getByTestId('observation-near')).toContainText('a search, not a name');
  await expect(page.getByTestId('extract-result')).toContainText('40×20 px');
  await expect(page.getByTestId('extract-to-lab')).toHaveAttribute(
    'href',
    '/lab?hex=663399,ffffff',
  );
  await page.getByTestId('extract-to-lab').click();
  await expect(page.getByTestId('column')).toHaveCount(2);
});
