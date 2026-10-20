import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// This project runs against a server with no sign-in method, as the public demo does.

test('without accounts there is no sign-in, and the Library lives in the browser', async ({
  page,
}) => {
  await page.goto('/lab?from=ja-sakura-iro,ja-shiro');
  await expect(page).toHaveURL(/palette=/);
  await expect(page.getByRole('link', { name: 'Sign in' })).toHaveCount(0);
  await page.getByTestId('role-name').first().fill('Sun');
  await page.getByTestId('proportions-button').click();
  await page.getByRole('spinbutton', { name: 'dominant area weight', exact: true }).fill('7');
  await page.getByTestId('save').click();
  await expect(page.getByTestId('notice')).toContainText('Saved in this browser');

  await page.goto('/dictionary/ja-sakura-iro');
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
  await page.getByTestId('proportions-button').click();
  await expect(
    page.getByRole('spinbutton', { name: 'dominant area weight', exact: true }),
  ).toHaveValue('7');
  await expect(page.getByTestId('column').first()).toHaveAttribute('data-locked', 'true');
  await expect(page.getByTestId('column').first()).toHaveAttribute(
    'data-source',
    'ja-sakura-iro-srgb-wikipedia',
  );

  // Rename, search, delete.
  await page.goto('/library');
  const name = page.getByTestId('saved-palette').getByRole('textbox');
  await name.fill('Saved pair');
  await name.press('Enter');
  await page.getByTestId('library-search').fill('saved pair');
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
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/signin?next=/library');
  await expect(page).toHaveURL(/\/$/);
});

test('browser Library exports can be imported without replacing or duplicating saved items', async ({
  page,
}) => {
  await page.goto('/lab?hex=663399,eeeeee');
  await expect(page).toHaveURL(/palette=/);
  await page.getByTestId('save').click();
  await page.goto('/library');
  const bundle = await page.evaluate(() => ({
    palettes: JSON.parse(localStorage.getItem('sca.library.palettes')!),
    colours: [],
  }));
  const input = page.getByLabel('Import Library JSON');
  await input.setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(bundle)),
  });
  await expect(page.getByRole('status')).toContainText('1 duplicate skipped');
  await page.getByTestId('delete-palette').click();
  await input.setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(bundle)),
  });
  await expect(page.getByRole('status')).toContainText('Imported 1 palette');
  await expect(page.getByTestId('saved-palette')).toHaveCount(1);
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.screenshot({ path: test.info().outputPath('library-import.png'), fullPage: true });
});
