import { expect, test } from '@playwright/test';
const bundle = {
  version: 1,
  palettes: [
    {
      note: 'Imported study',
      state: {
        palette: [
          [0.5, 0.1, 20],
          [0.7, 0.1, 200],
        ],
        structure: 'complementary',
        seed: 3,
        weights: [7, 3],
        locked: [true, false],
        labels: ['Warm', null],
      },
    },
  ],
  colours: [{ conceptId: 'css-rebeccapurple', label: 'rebeccapurple', hex: '#663399' }],
};
test('account Library imports merge, reject invalid files and preserve proportions', async ({
  page,
  request,
}) => {
  expect((await request.post('/api/library/import', { data: bundle })).status()).toBe(401);
  await page.goto('/api/test/login?email=import-library@example.com');
  await page.goto('/library');
  const input = page.getByLabel('Import Library JSON');
  const upload = (value: unknown) =>
    input.setInputFiles({
      name: 'library.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(value)),
    });
  await upload(bundle);
  await expect(page.getByRole('status')).toContainText('Imported 1 palette and 1 colour');
  await expect(page.getByTestId('saved-palette')).toHaveCount(1);
  await upload(bundle);
  await expect(page.getByRole('status')).toContainText('2 duplicates skipped');
  await upload({ ...bundle, colours: [{ conceptId: '../bad', label: 'Bad', hex: 'red' }] });
  await expect(page.getByRole('status')).toContainText('invalid');
  await expect(page.getByTestId('saved-palette')).toHaveCount(1);
  const invalid = await page.request.post('/api/library/import', {
    data: {
      ...bundle,
      palettes: [
        { ...bundle.palettes[0], state: { ...bundle.palettes[0]!.state, weights: [0, 1] } },
      ],
    },
  });
  expect(invalid.status()).toBe(400);
  await page.getByRole('link', { name: 'Open in the Laboratory' }).click();
  await page.getByTestId('proportions-button').click();
  await expect(
    page.getByRole('spinbutton', { name: 'dominant area weight', exact: true }),
  ).toHaveValue('7');
  await expect(page.getByTestId('role-name').first()).toHaveValue('Warm');
});
