import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('the applied preview draws the palette as a page, measures what it draws, and derives a dark counterpart', async ({
  page,
}) => {
  await page.goto(
    '/lab?palette=0.2,0,0;0.95,0,0;0.6,0.15,30;0.85,0.02,200&structure=free-form&n=1&pairs=0-1',
  );
  await expect(page.getByTestId('column')).toHaveCount(4);
  // In dev the first compile of the route triggers a full reload that drops a client navigation,
  // so the link's address is checked and then opened directly.
  const href = await page.getByTestId('preview-link').getAttribute('href');
  expect(href).toMatch(/^\/preview\?palette=.*pairs=0-1$/);
  await expect(async () => {
    await page.goto(href!);
  }).toPass({ timeout: 30000 });
  await expect(page).toHaveURL(/\/preview\?palette=.*pairs=0-1/);
  const mockup = page.getByTestId('mockup');
  // The intended pair sets text and background.
  await expect(mockup).toHaveAttribute('data-background', '#eeeeee');
  await expect(mockup).toHaveAttribute('data-text', '#161616');
  await expect(page.getByTestId('slot-primary')).toHaveValue('2');
  const pairs = page.getByTestId('shown-pair');
  await expect(pairs).toHaveCount(8);
  await expect(page.getByTestId('mock-card-title').first()).toHaveCSS('color', 'rgb(202, 87, 71)');
  await expect(
    pairs
      .filter({ has: page.locator('[data-id="text-background"]') })
      .or(page.locator('[data-id="text-background"]')),
  ).toHaveAttribute('data-pass', 'true');
  await expect(page.locator('[data-id="text-background"]')).toContainText('passes');
  // Reassign the text to the light-grey column: it fails against the background and the page follows.
  await page.getByTestId('slot-text').selectOption('3');
  await expect(page.locator('[data-id="text-background"]')).toHaveAttribute('data-pass', 'false');
  await expect(page).toHaveURL(/slots=background:1,surface:\d,text:3/);
  // The derived dark counterpart reflects lightness and is labelled derived.
  await page.getByTestId('preview-dark').check();
  await expect(page).toHaveURL(/dark=1/);
  await expect(page.getByText('derived values, not the palette')).toBeVisible();
  const bg = await mockup.getAttribute('data-background');
  expect(bg).not.toBe('#eeeeee');
  await expect(page.getByTestId('dark-to-lab')).toHaveAttribute('href', /^\/lab\?hex=/);
  await page.getByTestId('preview-to-lab').click();
  await expect(page).toHaveURL(/\/lab\?palette=/);
  await expect(page.getByTestId('column')).toHaveCount(4);
});

test('scales and distinctness panels, and the design-tool exports', async ({ page }) => {
  await page.goto('/lab?palette=0.63,0.26,29;0.6,0.2,140;0.9,0,0&structure=free-form&n=1');
  await expect(page.getByTestId('column')).toHaveCount(3);
  await page.getByTestId('panel').selectOption('scales');
  await expect(page.getByTestId('scale-row')).toHaveCount(3);
  const first = page.getByTestId('scale-row').first().getByTestId('scale-stop');
  await expect(first).toHaveCount(11);
  await expect(first.first()).toHaveAttribute('data-step', '50');
  await expect(first.first()).toHaveAttribute('data-mapped', 'true');
  await expect(page.getByTestId('scale-row').first().locator('[data-own="true"]')).toHaveCount(1);
  await expect(page.getByTestId('scales')).toContainText('even OKLCh lightness');

  await page.getByTestId('panel').selectOption('distinct');
  const views = page.getByTestId('distinct-view');
  await expect(views).toHaveCount(4);
  const normal = Number(await views.nth(0).getAttribute('data-weakest'));
  const protan = Number(await views.nth(1).getAttribute('data-weakest'));
  expect(protan).toBeLessThan(normal);
  await expect(views.nth(1).getByTestId('distinct-weakest')).toContainText('dominant · secondary');
  await page.getByTestId('distinct-flag').fill('0.3');
  await expect(views.nth(1).locator('[data-flagged="true"]').first()).toBeVisible();
  await expect(page.getByTestId('distinct')).toContainText('not a perceptibility threshold');

  for (const [id, name, check] of [
    [
      'export-tailwind',
      'palette-free-form-1.tailwind.js',
      (t: string) => t.includes("DEFAULT: '") && /950: '#[0-9a-f]{6}'/.test(t),
    ],
    [
      'export-scss',
      'palette-free-form-1.scss',
      (t: string) => t.includes('$dominant: #') && t.includes('-oklch: oklch('),
    ],
    [
      'export-tokens',
      'palette-free-form-1.tokens.json',
      (t: string) => (JSON.parse(t) as { dominant: { $type: string } }).dominant.$type === 'color',
    ],
    ['export-ase', 'palette-free-form-1.ase', (t: string) => t.startsWith('ASEF')],
    ['export-png', 'palette-free-form-1.png', (t: string) => t.startsWith('\x89PNG')],
  ] as const) {
    await page.getByTestId('export').click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId(id).click(),
    ]);
    expect(download.suggestedFilename()).toBe(name);
    const text = await readFile(await download.path(), 'latin1');
    expect(check(text), id).toBe(true);
  }
});

test('documented palettes list every sourced set by kind and open in the Laboratory', async ({
  page,
}) => {
  await page.goto('/palettes');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Documented palettes');
  const cards = page.getByTestId('documented-palette');
  const all = await cards.count();
  expect(all).toBeGreaterThan(5);
  await expect(cards.filter({ hasText: 'complements' }).first()).toBeVisible();
  await page.getByTestId('kind-layering').click();
  await expect(page).toHaveURL(/kind=layering/);
  await expect(page.getByTestId('documented-palette').first()).toHaveAttribute(
    'data-kind',
    'layering',
  );
  await expect(page.getByTestId('documented-palette').first()).toContainText('documented layering');
  await page.getByTestId('kind-pair').click();
  const pair = page.getByTestId('documented-palette').first();
  await expect(pair).toContainText('attributed pair');
  await pair.getByTestId('palette-to-lab').click();
  await expect(page).toHaveURL(/\/lab\?from=/);
  await expect(page.getByTestId('column')).toHaveCount(2);
  await expect(page.getByTestId('from-record')).toHaveCount(2);
});
