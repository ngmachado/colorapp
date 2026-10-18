import { expect, test, type Page } from '@playwright/test';

/** The lab's first URL write means it is hydrated; typing or clicking before that is lost. */
const settled = async (page: Page) => {
  await expect(page).toHaveURL(/palette=/);
  await page.waitForTimeout(400);
};

test('documented records open in the Laboratory as locked, named columns', async ({ page }) => {
  await page.goto('/lab?from=goethe-yellow,goethe-red-yellow,goethe-red');
  const columns = page.getByTestId('column');
  await expect(columns).toHaveCount(3);
  await expect(page.getByTestId('notice')).toContainText('Loaded Yellow (Goethe)');
  await expect(columns.nth(0)).toHaveAttribute('data-source', 'goethe-yellow-display');
  await expect(columns.nth(2)).toHaveAttribute('data-locked', 'true');
  await expect(page.getByTestId('from-record')).toHaveCount(3);
  await settled(page);

  // A record without a displayable value is named, not silently dropped.
  await page.goto('/lab?from=goethe-yellow,goethe-circle');
  await expect(page.getByTestId('notice')).toContainText('no displayable value');
});

test('an entry offers its documented pairs and sets, and a combination opens its layers', async ({
  page,
}) => {
  await page.goto('/dictionary/goethe-yellow');
  const pair = page.getByTestId('pair-to-lab').first();
  await expect(pair).toHaveAttribute('href', /\/lab\?from=goethe-yellow,goethe-/);
  await expect(page.getByTestId('set-to-lab').first()).toHaveAttribute(
    'href',
    '/lab?from=goethe-yellow,goethe-red-yellow',
  );
  await expect(page.getByTestId('entry-scale').locator('a')).toHaveCount(9);
  await pair.click();
  await expect(page.getByTestId('column')).toHaveCount(2);
  await settled(page);

  await page.goto('/dictionary/combination/ja-kasane-ume-1');
  await page.getByTestId('combination-to-lab').click();
  await expect(page.getByTestId('notice')).toContainText('from their records');
  await expect(page.getByTestId('column')).toHaveCount(2);
});

test('hex codes load from the address and from a paste, and a column can be renamed', async ({
  page,
}) => {
  await page.goto('/lab?hex=ff0000,00ff00,0000ff');
  const columns = page.getByTestId('column');
  await expect(columns).toHaveCount(3);
  await expect(columns.nth(1)).toHaveAttribute('data-hex', '#00ff00');
  await settled(page);

  await page.locator('body').click({ position: { x: 5, y: 300 } });
  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.setData('text', '#112233, 445566 and #778899');
    window.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
  });
  await expect(page.getByTestId('notice')).toContainText('Pasted 3 colours');
  await expect(columns.nth(2)).toHaveAttribute('data-hex', '#778899');

  const name = page.getByTestId('role-name').first();
  await name.fill('Brand');
  await expect(name).toHaveValue('Brand');
  await expect(columns.first()).toHaveAttribute('data-role', 'dominant');
});

test('the wheel panel loads a documented set, ? lists the keys, and a column opens in Theory', async ({
  page,
}) => {
  await page.goto('/lab');
  await settled(page);
  await page.getByTestId('wheel-button').click();
  await page.getByTestId('load-set').selectOption('goethe-minus');
  await expect(page.getByTestId('notice')).toContainText('Loaded Minus side (Goethe)');
  await expect(page.getByTestId('column')).toHaveCount(2);
  await expect(page.getByTestId('lock-badge')).toHaveCount(2);

  await page.locator('body').click({ position: { x: 5, y: 300 } });
  await page.keyboard.press('?');
  await expect(page.getByTestId('keys')).toContainText('paste hex codes');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('keys')).toHaveCount(0);

  const first = page.getByTestId('column').first();
  const hex = await first.getAttribute('data-hex');
  await first.hover();
  const href = await first.getByTestId('to-theory').getAttribute('href');
  expect(href).toBe(`/theory?hex=${hex!.slice(1)}`);
  await page.goto(href!);
  await expect(page.locator('main')).toContainText(hex!.slice(1).toUpperCase());
});

test('a hex in the Dictionary search box searches near that colour', async ({ page }) => {
  await page.goto('/dictionary?q=%23663399');
  await expect(page.locator('main')).toContainText('nearest to #663399');
});

test('the Library filters saved palettes and colours by text', async ({ page }) => {
  // One account per engine: the projects share a database, so version numbers would otherwise collide.
  await page.goto(`/api/test/login?email=search-${test.info().project.name}@example.com`);
  await page.goto('/lab?hex=ff0000,00ff00');
  await page.getByTestId('save').click();
  await expect(page.getByTestId('notice')).toContainText('Saved as version 1');
  await settled(page);
  await page.goto('/library?q=ff0000');
  await expect(page.getByTestId('saved-palette')).toHaveCount(1);
  await page.goto('/library?q=nothing-like-this');
  await expect(page.getByTestId('library-palettes')).toContainText('No saved palette matches');
});

test('a saved palette keeps its locks, names and records, and the share link carries them', async ({
  page,
}) => {
  await page.goto(`/api/test/login?email=state-${test.info().project.name}@example.com`);
  await page.waitForLoadState('load');
  await page.goto('/lab?from=goethe-yellow,goethe-blue-red');
  // The first URL write means the page is hydrated; typing before that is lost.
  await settled(page);
  await page.getByTestId('role-name').first().fill('Sun');
  await expect(page).toHaveURL(/names=%5B%22Sun%22/);
  await expect(page).toHaveURL(/locks=11/);
  await expect(page).toHaveURL(/records=goethe-yellow-display/);
  await page.getByTestId('save').click();
  await expect(page.getByTestId('notice')).toContainText('Saved as version 1');
  await settled(page);
  await page.goto('/library');
  await page.getByRole('link', { name: 'Open in the Laboratory' }).first().click();
  await expect(page.getByTestId('role-name').first()).toHaveValue('Sun');
  await expect(page.getByTestId('column').first()).toHaveAttribute('data-locked', 'true');
  await expect(page.getByTestId('column').first()).toHaveAttribute(
    'data-source',
    'goethe-yellow-display',
  );
});
