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
  await expect(
    page.getByTestId('chevreul').getByRole('link', { name: 'Open the entry' }),
  ).toHaveAttribute('href', '/dictionary/chevreul-circle');
  await expect(page.getByTestId('structures')).toContainText('Triadic');
  await expect(page.getByTestId('term')).toHaveCount(13);
  await expect(page.getByTestId('terms')).toContainText('Simultaneous contrast');
  await expect(page.locator('main')).not.toContainText(/Goethe/i);
});

test('lessons precede historical records and the context experiment reveals identical samples', async ({
  page,
}) => {
  await page.goto('/theory');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Understanding colour');
  await expect(page.getByTestId('lesson').locator('h2')).toHaveText([
    'Foundations',
    'Representing colour',
    'Perception and context',
    'Designing with colour',
    'Colour in production',
    'History and culture',
  ]);
  const experiment = page.getByTestId('context-exercise');
  await expect(experiment.getByRole('status')).toHaveCount(0);
  await experiment.getByRole('button', { name: 'Different', exact: true }).click();
  await expect(experiment.getByRole('status')).toContainText('Both central squares are #808080');
  const samples = experiment.getByTestId('context-sample');
  const colours = await samples.evaluateAll((nodes) =>
    nodes.map((n) => getComputedStyle(n).backgroundColor),
  );
  expect(colours[0]).toBe(colours[1]);
  await experiment.getByLabel('Compare on the same background').check();
  const surrounds = await samples.evaluateAll((nodes) =>
    nodes.map((n) => getComputedStyle(n.parentElement!).backgroundColor),
  );
  expect(surrounds[0]).toBe(surrounds[1]);
  await experiment.getByRole('button', { name: 'Reset experiment' }).click();
  await expect(experiment.getByRole('status')).toHaveCount(0);
});
