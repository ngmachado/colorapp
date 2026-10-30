import { expect, test } from '@playwright/test';

const oklchs = (page: import('@playwright/test').Page) =>
  page.getByTestId('column').evaluateAll((els) => els.map((e) => e.getAttribute('data-oklch')));

test('the Laboratory wheel turns the whole triad, adds a documented colour, and undo takes both back', async ({
  page,
}) => {
  await page.goto(
    '/lab?palette=0.72,0.16,40;0.72,0.16,160;0.72,0.16,280;0.55,0.05,40;0.9,0.08,100&structure=triadic&n=4030',
  );
  await expect(page).toHaveURL(/palette=/);
  await page.getByTestId('wheel-button').click();
  const panel = page.getByTestId('wheel-panel');
  await expect(panel).toBeVisible();
  await expect(page.getByTestId('wheel-dot')).toHaveCount(5);
  await expect(page.getByTestId('wheel-spoke')).toHaveCount(5);
  await expect(page.getByTestId('wheel-edge')).toBeVisible();

  // Keyboard: ten degrees left on the dominant dot turns every unlocked column.
  const before = await oklchs(page);
  await page.getByTestId('wheel-dot').nth(0).focus();
  await page.keyboard.press('Shift+ArrowLeft');
  const after = await oklchs(page);
  for (let i = 0; i < 5; i++) {
    const h0 = Number(before[i]!.split(',')[2]);
    const h1 = Number(after[i]!.split(',')[2]);
    expect(((h1 - h0 + 360) % 360).toFixed(0)).toBe('10');
  }
  await expect(page.getByTestId('wheel-readout')).toContainText('dominant');

  // A documented point becomes a sixth column? No: five is the most, so remove one first.
  await page.getByTestId('column').nth(4).hover();
  await page.getByTestId('column').nth(4).getByTestId('remove').click();
  await expect(page.getByTestId('column')).toHaveCount(4);
  await page.getByTestId('wheel-tradition').selectOption('japanese');
  const points = page.getByTestId('wheel-overlay-point');
  // 13 vocabulary points plus the 10 JIS values attached to existing concepts.
  await expect(points).toHaveCount(23);
  await points.first().click();
  await expect(page.getByTestId('column')).toHaveCount(5);
  await expect(page.getByTestId('column').nth(4)).toHaveAttribute('data-source', /^ja-/);
  await expect(page.getByTestId('notice')).toContainText('Added highlight from the wheel');

  await page.getByTestId('undo').click();
  await expect(page.getByTestId('column')).toHaveCount(4);
  await page.getByTestId('undo').click();
  await page.getByTestId('undo').click();
  expect(await oklchs(page)).toEqual(before);

  await page.getByTestId('wheel-ghost-button').click();
  await expect(page.getByTestId('wheel-ghost')).toHaveCount(2);
});

test('the Theory wheel shows the chosen rule, its HSL ghost, and documented points that open entries', async ({
  page,
}) => {
  await page.goto('/theory');
  await expect(page.getByTestId('theory-wheel')).toBeVisible();
  await expect(page.getByTestId('wheel-dot')).toHaveCount(3);
  await page.getByTestId('show-rule').nth(2).click(); // complementary: three roles, one ghost
  await expect(page.getByTestId('show-rule').nth(2)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('wheel-dot')).toHaveCount(3);
  await page.getByTestId('theory-ghost-button').click();
  await expect(page.getByTestId('wheel-ghost')).toHaveCount(1);
  await expect(page.getByTestId('ghost-note')).toContainText(
    'Equal angles do not guarantee equal visual differences',
  );
  await page.getByTestId('theory-wheel-tradition').selectOption('japanese');
  await page.getByTestId('wheel-overlay-point').first().click();
  await expect(page).toHaveURL(/\/dictionary\/ja-/);
});

test('an entry shows a small read-only wheel at the record lightness', async ({ page }) => {
  await page.goto('/dictionary/ja-sakura-iro');
  const w = page.getByTestId('entry-wheel');
  await expect(w).toBeVisible();
  await expect(w).toContainText('h 346°');
  await expect(w.getByTestId('wheel-dot')).toHaveCount(1);
  await expect(w.getByTestId('wheel-slice')).toHaveCount(0);
});
