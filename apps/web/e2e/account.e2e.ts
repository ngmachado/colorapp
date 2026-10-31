import { expect, test } from '@playwright/test';

test('a key is made once, works as a bearer token, is counted, and stops when revoked', async ({
  page,
  request,
}) => {
  await page.goto(`/api/test/login?email=keys-${test.info().project.name}@example.com`);
  await page.goto('/account');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your account');
  await expect(page.locator('main')).toContainText('No keys yet.');

  await page.getByLabel('Name of the new key').fill('Claude Desktop');
  await page.getByTestId('create-key').click();
  await expect(page.getByTestId('new-key')).toContainText('New key “Claude Desktop”');
  const secret = (await page.getByTestId('new-key-secret').textContent())!.trim();
  expect(secret).toMatch(/^sc_live_[A-Za-z0-9]{32}$/);
  const row = page.getByTestId('api-key').filter({ hasText: 'Claude Desktop' });
  await expect(row).toContainText(`${secret.slice(0, 12)}…${secret.slice(-3)}`);
  await expect(row).toContainText('never used');
  await expect(row).toContainText('0 of 5,000 calls this month');
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByTestId('new-key')).toHaveCount(0);

  // Without a key the route refuses; with it, the key reports itself and the count moves.
  expect((await request.get('/api/key')).status()).toBe(401);
  const ok = await request.get('/api/key', { headers: { authorization: `Bearer ${secret}` } });
  expect(ok.status()).toBe(200);
  expect(await ok.json()).toEqual({
    key: 'Claude Desktop',
    quota: { month: { used: 1, limit: 5000 }, minute: { used: 1, limit: 60 } },
  });
  await page.reload();
  await expect(row).toContainText('last used just now');
  await expect(row).toContainText('1 of 5,000 calls this month');

  await row.getByRole('button', { name: 'Revoke' }).click();
  await expect(page.getByTestId('confirm-revoke')).toContainText('Revoke “Claude Desktop”?');
  await page.getByTestId('confirm-revoke').getByRole('button', { name: 'Revoke' }).click();
  await expect(row).toHaveAttribute('data-revoked', 'true');
  await expect(row).toContainText('revoked');
  const gone = await request.get('/api/key', { headers: { authorization: `Bearer ${secret}` } });
  expect(gone.status()).toBe(401);
  expect(await gone.json()).toEqual({ error: 'This key was revoked.' });
});

test('three live keys is the limit, said on the page', async ({ page }) => {
  await page.goto(`/api/test/login?email=cap-${test.info().project.name}@example.com`);
  await page.goto('/account');
  for (const name of ['one', 'two', 'three']) {
    await page.getByLabel('Name of the new key').fill(name);
    await page.getByTestId('create-key').click();
    await expect(page.getByTestId('new-key')).toContainText(`New key “${name}”`);
    await page.getByRole('button', { name: 'Done' }).click();
  }
  await expect(page.getByTestId('api-key')).toHaveCount(3);
  await expect(page.getByTestId('create-key')).toBeDisabled();
  await expect(page.locator('main')).toContainText('revoke one to make another');
});

test('the account page with a fresh key has no axe violations', async ({ page }) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  await page.goto(`/api/test/login?email=axe-${test.info().project.name}@example.com`);
  await page.goto('/account');
  await page.getByLabel('Name of the new key').fill('audit');
  await page.getByTestId('create-key').click();
  await expect(page.getByTestId('new-key')).toBeVisible();
  await page.getByRole('button', { name: 'Revoke' }).click();
  await expect(page.getByTestId('confirm-revoke')).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();
  expect(
    results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
  ).toEqual([]);
});
