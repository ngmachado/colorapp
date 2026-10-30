import { expect, test } from '@playwright/test';

const hexes = (page: import('@playwright/test').Page) =>
  page.getByTestId('column').evaluateAll((els) => els.map((e) => e.getAttribute('data-hex')));

test('a typed hex sets the column, and undo and redo walk the edits back and forward', async ({
  page,
}) => {
  await page.goto('/lab');
  await expect(page).toHaveURL(/palette=/); // the client has hydrated once it writes the URL
  const columns = page.getByTestId('column');
  const start = await hexes(page);
  await expect(page.getByTestId('undo')).toBeDisabled();

  await columns.nth(0).getByTestId('hex').click();
  const field = page.getByLabel('dominant hex');
  await field.fill('#663399');
  await expect(columns.nth(0)).toHaveAttribute('data-hex', '#663399');
  await expect(columns.nth(0).getByTestId('nearest')).toContainText('rebeccapurple');

  await field.fill('639');
  await field.press('Enter');
  await expect(columns.nth(0)).toHaveAttribute('data-hex', '#663399');
  await field.fill('nonsense');
  await field.press('Enter');
  await expect(field).toHaveValue('663399');

  await page.getByTestId('draw').click();
  await expect(page.getByTestId('counter')).toContainText('generation 1');
  const drawn = await hexes(page);
  expect(drawn).not.toEqual(start);

  await page.locator('body').click({ position: { x: 5, y: 300 } });
  await page.keyboard.press('ControlOrMeta+z');
  await expect(columns.nth(0)).toHaveAttribute('data-hex', '#663399');
  await page.getByTestId('undo').click();
  expect(await hexes(page)).toEqual(start);
  await expect(page.getByTestId('undo')).toBeDisabled();

  await page.getByTestId('redo').click();
  await expect(columns.nth(0)).toHaveAttribute('data-hex', '#663399');
  await page.keyboard.press('ControlOrMeta+Shift+z');
  expect(await hexes(page)).toEqual(drawn);
  await expect(page.getByTestId('redo')).toBeDisabled();
});

test('the contrast table grades every pair of columns and the two inks by WCAG 2.1', async ({
  page,
}) => {
  await page.goto('/lab?palette=0.2,0,0;0.95,0,0&structure=free-form&n=1');
  await expect(page.getByTestId('column')).toHaveCount(2);
  await page.getByTestId('contrast-button').click();
  const cells = page.getByTestId('contrast-cell');
  // 2 columns + white + black as text, 2 backgrounds, minus the 2 diagonal cells.
  await expect(cells).toHaveCount(6);
  await expect(cells.nth(0)).toHaveAttribute('data-grade', 'AAA');
  await expect(cells.nth(0)).toContainText('Aa');
  const grades = await cells.evaluateAll((els) => els.map((e) => e.getAttribute('data-grade')));
  expect(grades).toContain('below 3');
  await expect(page.getByTestId('contrast')).toContainText('WCAG 2.1');
});

test('intended pairs lead the contrast panel with explicit thresholds, survive reload, and follow column moves', async ({
  page,
}) => {
  await page.goto('/lab?palette=0.2,0,0;0.95,0,0;0.6,0.15,30&structure=free-form&n=1');
  await expect(page.getByTestId('column')).toHaveCount(3);
  await page.getByTestId('contrast-button').click();
  await expect(page.getByTestId('pairs-empty')).toBeVisible();
  // dominant (dark) text on secondary (light): a passing pair.
  await page.getByTestId('pair-fg').selectOption('0');
  await page.getByTestId('pair-bg').selectOption('1');
  await page.getByTestId('pair-add').click();
  const pair = page.getByTestId('pair');
  await expect(pair).toHaveCount(1);
  await expect(pair.getByTestId('pair-ratio')).toHaveText(/^1[0-9]\.[0-9]{2}:1$/);
  const thresholds = pair.getByTestId('pair-threshold');
  await expect(thresholds).toHaveCount(5);
  await expect(thresholds.first()).toContainText('normal text, AA (SC 1.4.3) · at least 4.5:1');
  await expect(thresholds.first()).toHaveAttribute('data-pass', 'true');
  await expect(pair.getByTestId('pair-sample')).toHaveCSS('background-color', 'rgb(238, 238, 238)');
  // accent on dominant: fails normal text.
  await page.getByTestId('pair-fg').selectOption('2');
  await page.getByTestId('pair-bg').selectOption('0');
  await page.getByTestId('pair-add').click();
  await expect(pair).toHaveCount(2);
  await expect(pair.nth(1).getByTestId('pair-threshold').first()).toHaveAttribute(
    'data-pass',
    'false',
  );
  await expect(pair.nth(1)).toContainText('fails');
  // The pairs travel in the address and come back after a reload.
  await expect(page).toHaveURL(/pairs=0-1,2-0/);
  await page.reload();
  await page.getByTestId('contrast-button').click();
  await expect(page.getByTestId('pair')).toHaveCount(2);
  // Moving a column keeps each pair on the same colours.
  const columns = page.getByTestId('column');
  await columns.nth(0).hover();
  await columns.nth(0).getByTestId('move-right').click();
  await expect(page).toHaveURL(/pairs=1-0,2-1/);
  await page.getByTestId('pair').first().getByTestId('pair-remove').click();
  await expect(page.getByTestId('pair')).toHaveCount(1);
  await expect(page).toHaveURL(/pairs=2-1/);
  await expect(page.getByTestId('pair').getByTestId('pair-compare')).toHaveAttribute(
    'href',
    /^\/compare\?a=[0-9a-f]{6}&b=[0-9a-f]{6}$/,
  );
});
