import { expect, test } from '@playwright/test';

test('space draws a new candidate, a locked column keeps its colour, and the draw is reproducible', async ({
  page,
}) => {
  await page.goto('/lab');
  const columns = page.getByTestId('column');
  await expect(columns).toHaveCount(5);
  const before = await columns.evaluateAll((els) => els.map((e) => e.getAttribute('data-hex')));

  await columns.nth(3).hover();
  await columns.nth(3).getByTestId('lock').click();
  await expect(columns.nth(3)).toHaveAttribute('data-locked', 'true');

  await page.locator('body').click({ position: { x: 5, y: 300 } });
  await page.keyboard.press('Space');
  await expect(page.getByTestId('counter')).toContainText('generation 1');
  const after = await columns.evaluateAll((els) => els.map((e) => e.getAttribute('data-hex')));
  expect(after[3]).toBe(before[3]);
  expect(after.filter((h, i) => h !== before[i]).length).toBeGreaterThan(0);

  await page.keyboard.press('Space');
  await expect(page.getByTestId('counter')).toContainText('generation 2');
  const second = await columns.evaluateAll((els) => els.map((e) => e.getAttribute('data-hex')));
  await page.getByTestId('filmstrip').getByRole('button').nth(1).click();
  const restored = await columns.evaluateAll((els) => els.map((e) => e.getAttribute('data-hex')));
  expect(restored).toEqual(after);
  expect(second).not.toEqual(after);

  await expect(columns.nth(0).getByTestId('hex')).toBeVisible();
  await expect(page.getByTestId('nearest').first()).toBeVisible();
});

test('a seed from the dictionary locks the dominant column and the rule follows the URL', async ({
  page,
}) => {
  await page.goto('/lab?seed=css-rebeccapurple-srgb&structure=complementary');
  await expect(page.getByTestId('notice')).toContainText('Dominant locked to rebeccapurple');
  await expect(page.getByTestId('column').nth(0)).toHaveAttribute('data-hex', '#663399');
  await expect(page.getByTestId('structure')).toHaveValue('complementary');
  await page.getByTestId('draw').click();
  await expect(page.getByTestId('column').nth(0)).toHaveAttribute('data-hex', '#663399');
});

test('saving a palette needs an account and then stores a version', async ({ page }) => {
  await page.goto('/lab');
  await page.getByTestId('save').click();
  await expect(page.getByTestId('notice')).toContainText('Sign in to save');
  await page.goto(`/api/test/login?email=lab-${test.info().project.name}@example.com`);
  await page.goto('/lab');
  await page.getByTestId('save').click();
  await expect(page.getByTestId('notice')).toContainText('Saved as version 1');
  await expect(
    page.getByTestId('notice').getByRole('link', { name: 'Open the Library' }),
  ).toBeVisible();
});
