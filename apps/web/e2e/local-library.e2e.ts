import { expect, test } from '@playwright/test';

// This project runs against a server with no sign-in method, as the public demo does.

test('without accounts there is no sign-in, and the Library lives in the browser', async ({
  page,
}) => {
  await page.goto('/lab?from=goethe-yellow,goethe-blue-red');
  await expect(page).toHaveURL(/palette=/);
  await expect(page.getByRole('link', { name: 'Sign in' })).toHaveCount(0);
  await page.getByTestId('role-name').first().fill('Sun');
  await page.getByTestId('save').click();
  await expect(page.getByTestId('notice')).toContainText('Saved in this browser');

  await page.goto('/dictionary/goethe-yellow');
  await page.getByTestId('save-colour').click();
  await expect(page.getByTestId('save-colour-status')).toContainText('Saved to the');
  await page.getByTestId('save-colour').click();
  await expect(page.getByTestId('save-colour-status')).toContainText('Already in the');

  await page.goto('/library');
  await expect(page.getByTestId('saved-palette')).toHaveCount(1);
  await expect(page.getByTestId('saved-colour')).toHaveCount(1);
  await expect(page.getByTestId('library-palettes')).toContainText('triadic · seed');

  // Reopen: locks, names and records come back.
  await page.getByRole('link', { name: 'Open in the Laboratory' }).click();
  await expect(page.getByTestId('role-name').first()).toHaveValue('Sun');
  await expect(page.getByTestId('column').first()).toHaveAttribute('data-locked', 'true');
  await expect(page.getByTestId('column').first()).toHaveAttribute(
    'data-source',
    'goethe-yellow-display',
  );

  // Rename, search, delete.
  await page.goto('/library');
  const name = page.getByTestId('saved-palette').getByRole('textbox');
  await name.fill('Goethe pair');
  await name.press('Enter');
  await page.getByTestId('library-search').fill('goethe pair');
  await expect(page.getByTestId('saved-palette')).toHaveCount(1);
  await page.getByTestId('library-search').fill('nothing');
  await expect(page.getByTestId('library-palettes')).toContainText('No saved palette matches');
  await page.getByTestId('library-search').fill('');
  await page.getByTestId('delete-palette').click();
  await page.getByTestId('delete-colour').click();
  await expect(page.getByTestId('saved-palette')).toHaveCount(0);
  await expect(page.getByTestId('saved-colour')).toHaveCount(0);

  // Pages that need an account stay out of the way.
  await page.goto('/signin');
  await expect(page.locator('main')).toContainText('not configured');
});
