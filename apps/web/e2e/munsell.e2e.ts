import { expect, test } from '@playwright/test';

test('the Munsell reference lists nearest tabulated samples with conditions, and resolves a notation', async ({
  page,
}) => {
  await page.goto('/dictionary/ja-aka');
  await expect(page.getByTestId('munsell-notation')).toHaveText('Munsell 5R 4/14');
  // Leaving the entry page sometimes aborts the next navigation in dev (ERR_ABORTED); retry it.
  await expect(async () => {
    await page.goto('/colour/b03060');
  }).toPass({ timeout: 30000 });
  await page.getByTestId('munsell-link').click();
  await expect(page).toHaveURL(/\/munsell\?hex=b03060$/);
  await expect(page.getByTestId('munsell-conditions')).toContainText(
    'illuminant C, CIE 1931 2° observer',
  );
  // The table is a personal download that is not in the repository; without it the page says so.
  if (await page.getByTestId('munsell-missing').count()) {
    await expect(page.getByTestId('munsell-missing')).toContainText('not installed');
    test.skip(
      true,
      'Munsell renotation table not installed (see content/reference/munsell/README.md)',
    );
  }
  const samples = page.getByTestId('munsell-nearest').getByTestId('munsell-sample');
  await expect(samples).toHaveCount(5);
  await expect(samples.first()).toHaveAttribute(
    'data-notation',
    /^[0-9.]+(R|RP|P) [0-9]+\/[0-9]+$/,
  );
  await expect(samples.first().getByTestId('munsell-distance')).toContainText('CIE76');
  await expect(page.getByTestId('munsell-conditions')).toContainText(
    'illuminant C, CIE 1931 2° observer',
  );
  await expect(page.getByTestId('munsell-conditions')).toContainText('Bradford');
  await expect(page.getByTestId('munsell-nearest')).not.toContainText('perceptib');
  // A JIS notation resolves to its tabulated value and names the records that cite it.
  await page.getByTestId('munsell-hex').fill('');
  await page.getByTestId('munsell-notation-input').fill('5R 4/14');
  await page.getByRole('button', { name: 'Look up' }).click();
  await expect(page).toHaveURL(/\/munsell\?notation=5R\+4%2F14$/);
  const notation = page.getByTestId('munsell-notation');
  await expect(notation).toContainText('Tabulated value of 5R 4/14');
  await expect(notation.getByTestId('munsell-sample')).toHaveAttribute('data-notation', '5R 4/14');
  await expect(notation.getByTestId('munsell-cited')).toContainText(
    'Assigned this notation by their source',
  );
  // A notation off the table says so, gives the nearest tabulated sample and a linear interpolation.
  await page.goto('/munsell?notation=7RP%207.5%2F8');
  await expect(page.getByTestId('munsell-notation')).toContainText('7RP 7.5/8 is not tabulated');
  await expect(page.getByTestId('munsell-interpolated')).toContainText('Interpolated at 7RP 7.5/8');
  await expect(page.getByTestId('munsell-interpolated')).toHaveAttribute(
    'data-hex',
    /^#[0-9a-f]{6}$/,
  );
  // A neutral is not in the table; it is placed on the illuminant at the value's luminance.
  await page.goto('/munsell?notation=N%205');
  await expect(page.getByTestId('munsell-notation')).toContainText('N 5 is a neutral');
  const grey = await page.getByTestId('munsell-interpolated').getAttribute('data-hex');
  expect(grey).toMatch(/^#7[a-f0-9]7[a-f0-9]7[a-f0-9]$/);
  await page.goto('/munsell?notation=nonsense');
  // Next 16 adds its own role=alert route announcer, so the page's alert is picked by its text.
  await expect(page.getByRole('alert').filter({ hasText: 'Could not read' })).toBeVisible();
});

test('a JIS record shows both pages’ values and the check against the standard’s notation', async ({
  page,
}) => {
  await page.goto('/dictionary/ja-toki-iro');
  const values = page.getByTestId('values');
  await expect(values.locator('[data-record]')).toHaveCount(2);
  await expect(values.getByTestId('value-notes').first()).toContainText(
    'Checked on 2026-10-30 against the 1943 Munsell renotation',
  );
  await expect(values.getByTestId('value-notes').first()).toContainText('CIEDE2000 difference');
  await expect(values.getByTestId('value-notes').nth(1)).toContainText(
    "between the two pages' values",
  );
  await expect(values.locator('[data-record="ja-toki-iro-srgb-ichiran"]')).toHaveCount(1);
});
