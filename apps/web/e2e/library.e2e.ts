import { expect, test } from '@playwright/test';

test('the library asks for an account, then lists saved palettes and colours and reopens a palette', async ({
  page,
}) => {
  await page.goto('/library');
  await expect(page.getByTestId('library-signin')).toBeVisible();

  await page.goto('/api/test/login?email=library@example.com');
  await page.goto('/lab?structure=analogous');
  const hexes = await page
    .getByTestId('column')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-hex')));
  await page.getByTestId('save').click();
  await expect(page.getByTestId('notice')).toContainText('Saved as version 1');

  await page.goto('/dictionary/css-rebeccapurple');
  await page.getByTestId('save-colour').click();
  await expect(page.getByTestId('save-colour-status')).toHaveText('Saved to the Library.');
  await page.getByTestId('save-colour').click();
  await expect(page.getByTestId('save-colour-status')).toHaveText('Already in the Library.');

  await page.goto('/library');
  await expect(page.getByTestId('saved-palette')).toHaveCount(1);
  await expect(page.getByTestId('saved-palette')).toContainText('analogous');
  await expect(page.getByTestId('saved-colour')).toHaveCount(1);
  await expect(page.getByTestId('saved-colour')).toContainText('rebeccapurple');

  const name = page.getByLabel('Name of version 1');
  await name.fill('Autumn study');
  await name.press('Enter');
  await expect(page.getByLabel('Name of version 1')).toHaveValue('Autumn study');

  await page.getByRole('link', { name: 'Open in the Laboratory' }).click();
  await expect(page.getByTestId('notice')).toContainText('Loaded a saved palette');
  await expect(page.getByTestId('structure')).toHaveValue('analogous');
  const reopened = await page
    .getByTestId('column')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-hex')));
  expect(reopened).toEqual(hexes);

  await page.goto('/library');
  await page.getByTestId('delete-colour').click();
  await expect(page.getByTestId('saved-colour')).toHaveCount(0);
  await page.getByTestId('delete-palette').click();
  await expect(page.getByTestId('saved-palette')).toHaveCount(0);
});
