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
  // A notation off the table says so and gives the nearest tabulated sample.
  await page.goto('/munsell?notation=7RP%207.5%2F8');
  await expect(page.getByTestId('munsell-notation')).toContainText('7RP 7.5/8 is not tabulated');
  await page.goto('/munsell?notation=N%205');
  await expect(page.getByRole('alert')).toContainText('Could not read');
});
