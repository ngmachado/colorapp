import { expect, test } from '@playwright/test';

const PALETTE = '/lab?palette=0.2,0,0;0.95,0,0;0.6,0.15,30&structure=free-form&n=1';

test('the lightness view shows each column as the grey of its OKLCh L and names its assumptions', async ({
  page,
}) => {
  await page.goto(PALETTE);
  await expect(page.getByTestId('column')).toHaveCount(3);
  await page.getByTestId('panel').selectOption('lightness');
  const greys = page.getByTestId('lightness-grey');
  await expect(greys).toHaveCount(3);
  await expect(greys.nth(0)).toHaveAttribute('data-l', '0.200');
  await expect(greys.nth(1)).toHaveAttribute('data-l', '0.950');
  // The grey of L 0.95 with no chroma is a light neutral.
  await expect(greys.nth(1)).toHaveCSS('background-color', 'rgb(238, 238, 238)');
  await expect(page.getByTestId('lightness-marker')).toHaveCount(3);
  await expect(page.getByTestId('lightness-order')).toContainText('secondary L 0.950');
  await expect(page.getByTestId('lightness')).toContainText('not a luminance (Y) measurement');
  await page.getByTestId('panel').selectOption('none');
  await expect(page.getByTestId('lightness')).toHaveCount(0);
});

test('the neighbour view places every colour on every ground without changing any value', async ({
  page,
}) => {
  await page.goto(PALETTE);
  await page.getByTestId('panel').selectOption('neighbours');
  const cells = page.getByTestId('neighbour-cell');
  await expect(cells).toHaveCount(9);
  const hexes = await page
    .getByTestId('column')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-hex')));
  await expect(cells.nth(1)).toHaveAttribute('data-sample', hexes[0]!);
  await expect(cells.nth(1)).toHaveAttribute('data-ground', hexes[1]!);
  await expect(page.getByTestId('neighbours')).toContainText(
    'stored coordinates in each cell are the same',
  );
});

test('gradients compare sRGB and OKLCh with an explicit hue path and copy matching CSS', async ({
  page,
}) => {
  await page.goto('/lab?hex=ff0000,0000ff');
  await expect(page).toHaveURL(/palette=/);
  await page.getByTestId('panel').selectOption('gradients');
  const srgb = page.getByTestId('gradient-srgb').getByTestId('gradient-stop');
  const oklch = page.getByTestId('gradient-oklch').getByTestId('gradient-stop');
  await expect(srgb).toHaveCount(9);
  await expect(srgb.nth(4)).toHaveAttribute('data-hex', '#800080');
  const shorter = await oklch.nth(4).getAttribute('data-hex');
  await page.getByTestId('gradient-hue').selectOption('longer');
  await expect(oklch.nth(4)).not.toHaveAttribute('data-hex', shorter!);
  await expect(page.getByTestId('gradient-oklch').getByTestId('gradient-mapped')).toBeVisible();
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as unknown as { copied: string }).copied = text;
        },
      },
    }),
  );
  await page.getByTestId('gradient-copy').click();
  await expect(page.getByTestId('notice')).toContainText('Gradient CSS copied');
  const css = await page.evaluate(() => (window as unknown as { copied: string }).copied);
  expect(css).toContain('linear-gradient(90deg in srgb, #ff0000, #0000ff)');
  expect(css).toContain('linear-gradient(90deg in oklch longer hue, #ff0000, #0000ff)');
  expect(css).toContain('#800080 50%');
});

test('documented relations near a palette are found by a declared distance and can load as columns', async ({
  page,
}) => {
  // Chevreul's red and green, loaded from their records, then nudged: the pair is still within reach.
  await page.goto('/lab?from=chevreul-red,chevreul-green');
  await expect(page.getByTestId('column')).toHaveCount(2);
  await page.getByTestId('panel').selectOption('relations');
  const relation = page.locator(
    '[data-testid="relation"][data-set="chevreul-red-green-complements"]',
  );
  await expect(relation).toHaveCount(1);
  await expect(relation).toContainText('attributed pair');
  await expect(relation).toContainText('≈ dominant at 0.000');
  await expect(page.getByTestId('relations')).toContainText('nothing here infers a cultural link');
  // A tight distance after an edit loses the match; widening finds it again.
  const columns = page.getByTestId('column');
  await columns.nth(0).hover();
  await columns.nth(0).getByTestId('scale').click();
  await page.getByRole('button', { name: 'dominant lightness 0.75' }).click();
  await page.getByTestId('relations-distance').fill('0.02');
  await expect(page.getByTestId('relations-empty')).toBeVisible();
  await page.getByTestId('relations-distance').fill('0.2');
  await expect(relation).toHaveCount(1);
  await relation.getByTestId('relation-load').click();
  await expect(page.getByTestId('notice')).toContainText('all locked');
  await expect(columns.nth(0)).toHaveAttribute('data-source', /^chevreul-red/);
});
