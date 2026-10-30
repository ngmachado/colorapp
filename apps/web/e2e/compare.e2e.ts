import { expect, test } from '@playwright/test';

test('two colours compare with named metrics, contrast thresholds and provenance from a record', async ({
  page,
}) => {
  await page.goto('/colour/663399');
  const first = page.getByTestId('nearby-record').first();
  await expect(first).toContainText('rebeccapurple');
  await first.getByTestId('compare-record').click();
  await expect(page).toHaveURL(/\/compare\?a=663399&b=663399&rb=css-rebeccapurple-srgb/);
  await expect(page.getByTestId('provenance-A')).toContainText('User-specified sRGB value');
  await expect(page.getByTestId('provenance-B')).toContainText('rebeccapurple');
  await expect(page.getByTestId('provenance-B')).toContainText('published value');
  await expect(page.getByTestId('provenance-B')).toContainText('CSS Color Module Level 4');
  const values = page.getByTestId('difference-value');
  await expect(values.nth(0)).toHaveText('0.00');
  await expect(values.nth(1)).toHaveText('0.0000');
  await expect(page.getByTestId('differences')).toContainText('kL = kC = kH = 1');
  await expect(page.getByTestId('contrast')).toContainText('1.00:1');
  // Swap carries the record to the other side; a new pair comes from the form.
  await page.getByTestId('compare-swap').click();
  await expect(page).toHaveURL(/a=663399&b=663399&ra=css-rebeccapurple-srgb/);
  await expect(page.getByTestId('provenance-A')).toContainText('rebeccapurple');
  await page.getByTestId('compare-b').fill('fff');
  await page.getByRole('button', { name: 'Compare' }).click();
  await expect(page).toHaveURL(/\/compare\?a=663399&b=ffffff$/);
  await expect(page.getByTestId('contrast')).toContainText('8.4');
  await expect(page.getByTestId('threshold').first()).toHaveAttribute('data-pass', 'true');
  await expect(page.getByTestId('differences')).toContainText('Δh undefined (a neutral)');
  await expect(page.getByTestId('differences')).toContainText(
    'No threshold of perceptibility is claimed',
  );
});
