import { expect, test } from '@playwright/test';

test('columns can be removed, added back, reordered, and scaled in lightness', async ({ page }) => {
  await page.goto('/lab');
  const columns = page.getByTestId('column');
  await expect(columns).toHaveCount(5);
  const before = await columns.evaluateAll((els) => els.map((e) => e.getAttribute('data-hex')));

  await columns.nth(4).hover();
  await columns.nth(4).getByTestId('remove').click();
  await expect(columns).toHaveCount(4);
  await expect(page.getByTestId('add-column')).toBeEnabled();

  await page.getByTestId('add-column').click();
  await expect(columns).toHaveCount(5);
  await expect(columns.nth(4)).toHaveAttribute('data-role', 'highlight');
  await expect(page.getByTestId('add-column')).toBeDisabled();

  await columns.nth(0).hover();
  await columns.nth(0).getByTestId('move-right').click();
  const moved = await columns.evaluateAll((els) => els.map((e) => e.getAttribute('data-hex')));
  expect(moved[1]).toBe(before[0]);
  expect(moved[0]).toBe(before[1]);

  await columns.nth(2).hover();
  await columns.nth(2).getByTestId('scale').click();
  await page.getByRole('button', { name: 'accent lightness 0.95' }).click();
  await expect(columns.nth(2).getByTestId('hex')).not.toHaveText(before[2]!.slice(1).toUpperCase());
});

test('a candidates draw offers eight diverse palettes and adopting one keeps locks', async ({
  page,
}) => {
  await page.goto('/lab');
  const columns = page.getByTestId('column');
  await columns.nth(0).hover();
  await columns.nth(0).getByTestId('lock').click();
  const dominant = await columns.nth(0).getAttribute('data-hex');

  await page.getByTestId('candidates-button').click();
  await expect(page.getByTestId('notice')).toContainText('8 candidates');
  const candidates = page.getByTestId('candidates').getByRole('button');
  await expect(candidates).toHaveCount(8);
  await candidates.nth(3).click();
  await expect(columns.nth(0)).toHaveAttribute('data-hex', dominant!);
  await expect(page.getByTestId('filmstrip').getByRole('button')).toHaveCount(2);
});

test('the view can simulate a colour-vision deficiency without changing the values', async ({
  page,
}) => {
  await page.goto('/lab');
  const columns = page.getByTestId('column');
  const hex = await columns.nth(3).getAttribute('data-hex');
  const bg = () => columns.nth(3).evaluate((el) => getComputedStyle(el).backgroundColor);
  const before = await bg();
  await page.getByTestId('view').selectOption('deutan');
  await expect(page.getByTestId('view-badge').first()).toContainText(
    'seen as deutan · approximation',
  );
  expect(await bg()).not.toBe(before);
  await expect(columns.nth(3)).toHaveAttribute('data-hex', hex!);
  await expect(columns.nth(3).getByTestId('hex')).toHaveText(hex!.slice(1).toUpperCase());
});

test('area weights change geometry without changing colours and survive edits and reload', async ({
  page,
}) => {
  await page.goto('/lab?hex=663399,eeeeee,333333');
  await expect(page).toHaveURL(/palette=/);
  const columns = page.getByTestId('column');
  const before = await columns.evaluateAll((els) => els.map((e) => e.getAttribute('data-hex')));
  await page.getByTestId('proportions-button').click();
  const weight = (role: string) =>
    page.getByRole('spinbutton', { name: `${role} area weight`, exact: true });
  await weight('dominant').fill('7');
  await weight('secondary').fill('2');
  const widths = await page
    .getByTestId('area-swatch')
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
  expect(widths[0]! / widths[2]!).toBeCloseTo(7, 1);
  expect(widths[1]! / widths[2]!).toBeCloseTo(2, 1);
  await page.screenshot({ path: test.info().outputPath('proportions.png'), fullPage: true });
  expect(await columns.evaluateAll((els) => els.map((e) => e.getAttribute('data-hex')))).toEqual(
    before,
  );
  await page.getByRole('button', { name: 'Reverse areas', exact: true }).click();
  await expect(weight('dominant')).toHaveValue('1');
  await page.getByTestId('undo').click();
  await expect(weight('dominant')).toHaveValue('7');
  await columns.first().hover();
  await columns.first().getByTestId('move-right').click();
  await expect(weight('secondary')).toHaveValue('7');
  await columns.nth(2).hover();
  await columns.nth(2).getByTestId('remove').click();
  await expect(page).toHaveURL(/weights=2,7/);
  await page.reload();
  await page.getByTestId('proportions-button').click();
  await expect(weight('secondary')).toHaveValue('7');
  await page.getByTestId('add-column').click();
  await expect(weight('accent')).toHaveValue('1');
  await page.getByRole('button', { name: 'Equal areas', exact: true }).click();
  await expect(weight('secondary')).toHaveValue('1');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(weight('dominant')).toBeVisible();
  const preview = await page.getByTestId('area-preview').boundingBox();
  expect(preview!.x + preview!.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: test.info().outputPath('proportions-mobile.png'), fullPage: true });
});
