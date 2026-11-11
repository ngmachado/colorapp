import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { makeTestFont } from '@sca/type-engine/testing';

/**
 * The Type laboratory against a face made in the test: the catalogue and the font file are served by route
 * interception, so nothing is fetched from Google and no font file lives in the repository.
 */
const testFont = () =>
  Buffer.from(
    makeTestFont({
      chars: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:;·–’',
    }),
  );

async function serveTestFace(page: Page, withCatalogue = true) {
  await page.route('**/api/fonts', (route) =>
    route.fulfill({
      json: withCatalogue
        ? {
            families: [
              {
                family: 'Test Sans',
                category: 'sans-serif',
                subsets: ['latin', 'latin-ext'],
                files: {
                  regular: 'https://fonts.gstatic.com/s/testsans/v1/testsans.ttf',
                  '500': 'https://fonts.gstatic.com/s/testsans/v1/testsans.ttf',
                  '600': 'https://fonts.gstatic.com/s/testsans/v1/testsans.ttf',
                  '700': 'https://fonts.gstatic.com/s/testsans/v1/testsans.ttf',
                },
              },
              {
                family: 'Test Serif',
                category: 'serif',
                axes: [{ tag: 'wght', start: 300, end: 800 }],
                subsets: ['latin', 'cyrillic'],
                files: { regular: 'https://fonts.gstatic.com/s/testserif/v1/testserif.ttf' },
              },
              {
                family: 'Test Display',
                category: 'display',
                subsets: ['latin'],
                files: { regular: 'https://fonts.gstatic.com/s/testdisplay/v1/testdisplay.ttf' },
              },
            ],
            source: 'Google Fonts Developer API',
          }
        : { families: [], source: null },
    }),
  );
  await page.route('https://fonts.gstatic.com/**', (route) =>
    route.fulfill({
      body: testFont(),
      contentType: 'font/ttf',
      headers: { 'access-control-allow-origin': '*' },
    }),
  );
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ body: '', contentType: 'text/css' }),
  );
}

test('a face is read from its file and the setting is measured and shared in the address', async ({
  page,
}) => {
  await serveTestFace(page);
  await page.goto('/type?hex=2a6fbd,f4efe6,1b1b1f,e2b23a,ffffff&measure=600');
  const lab = page.getByTestId('type-lab');
  await expect(lab).toBeVisible();
  // No face on the bench: the finder opens in its place.
  await expect(lab.getByTestId('faces-finder')).toBeVisible();
  await page.getByTestId('face').fill('Test Sans');
  await page.getByTestId('face').press('Enter');
  await expect(lab.getByTestId('faces-finder')).toHaveCount(0);
  await expect(lab.getByTestId('metrics')).toContainText('Units per em');
  // Readings come from the file the browser fetched.
  const metrics = lab.getByTestId('metrics');
  await expect(metrics).toContainText('1000');
  await expect(lab.getByTestId('about')).toContainText('A tester');
  await expect(lab.getByTestId('about')).toContainText('Open Font License');
  await expect(lab.getByTestId('about')).toContainText('sans-serif · Google Fonts’ label');
  await expect(lab.getByTestId('about')).toContainText('Vox-ATypI');
  await expect(lab.getByTestId('readings')).toContainText('Basic Latin');
  // Measure: 600 px less 36 of padding, at 16 px with the file's widths, (26 × 500 + 250) / 27 units → 71 per line.
  await expect(lab.getByTestId('cpl')).toHaveText('71');
  await expect(lab.getByTestId('measure-check')).toHaveAttribute('data-placement', 'within');
  await expect(lab.getByTestId('measure-check')).toContainText('45–75, 66 ideal');
  // Scale and contrast follow the controls.
  await page.getByTestId('ratio').selectOption('1.5');
  await expect(lab.getByTestId('scale')).toContainText('24');
  await expect(lab.getByTestId('scale')).toContainText('Bringhurst');
  const body = lab.locator('[data-testid="contrast-row"][data-style="body"]');
  await expect(body).toContainText('AAA');
  await expect(body).toContainText('Lc');
  await lab.locator('[data-style="body"] [data-testid="pick-fg"]').nth(3).click();
  await expect(body).toContainText('below AA');
  // The spacing test applies the criterion's values to the specimen.
  await page.getByTestId('spacing').check();
  await expect(lab.locator('[data-testid="style-row"][data-style="caption"]')).toContainText(
    'leading 1.5',
  );
  // The address carries the setting.
  await expect(page).toHaveURL(/face=Test%20Sans/);
  await expect(page).toHaveURL(/ratio=1\.5/);
  await expect(page).toHaveURL(/styles=0-1,2-1,3-4,2-4/);
  await expect(page).toHaveURL(/spacing=1/);
  // The palette equals the default one, so the address leaves it out.
  await expect(page).not.toHaveURL(/hex=/);
  await expect(page.getByTestId('type-lab-link')).toHaveAttribute('href', /\/lab\?hex=2a6fbd/);
});

test('without a catalogue the page still renders a named face without reading it, and says nothing about the server', async ({
  page,
}) => {
  await serveTestFace(page, false);
  await page.goto('/type?face=Inter&measure=280');
  await expect(page.getByTestId('catalogue-note')).toHaveCount(0);
  await expect(page.getByTestId('type-lab')).not.toContainText(/GOOGLE_FONTS_KEY|server/);
  await expect(page.getByTestId('face-note')).toContainText('file was not read');
  await expect(page.getByTestId('readings')).toContainText('Nothing read');
  await expect(page.getByTestId('about')).toContainText('Inter');
  await expect(page.getByTestId('measure-check')).toHaveAttribute('data-placement', 'below');
  await page.getByTestId('faces-toggle').click();
  await expect(page.getByTestId('finder-empty')).toBeVisible();
  await expect(page.getByTestId('type-lab')).not.toContainText(/GOOGLE_FONTS_KEY|server/);
});

test('the Laboratory hands its palette and the picked pairs to the Type laboratory', async ({
  page,
}) => {
  await serveTestFace(page);
  await page.goto('/lab?hex=663399,ffffff,000000');
  await expect(page).toHaveURL(/palette=/); // the client has hydrated once it writes the URL
  // Pick two intended pairs in the contrast panel: black on white, then purple on white.
  await page.getByTestId('contrast-button').click();
  for (const [fg, bg] of [
    ['2', '1'],
    ['0', '1'],
  ] as const) {
    await page.getByTestId('pair-fg').selectOption(fg);
    await page.getByTestId('pair-bg').selectOption(bg);
    await page.getByTestId('pair-add').click();
  }
  await expect(page).toHaveURL(/pairs=2-1,0-1/);
  await page.getByTestId('type-link').click();
  // The first pair sets the body; the second sets display; heading and caption keep the body's.
  await expect(page).toHaveURL(/\/type\?hex=663399,ffffff,000000&styles=0-1,2-1,2-1,2-1$/);
  await expect(page.getByTestId('type-palette')).toContainText('#663399');
  // No face yet: the finder shows the palette in the catalogue's faces; the first card goes on the bench.
  const card = page.locator('[data-testid="face-card"][data-family="Test Sans"]');
  await expect(card.locator('div').first()).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(card.locator('div').first()).toHaveCSS('color', 'rgb(102, 51, 153)');
  await card.getByTestId('face-set').click();
  await expect(page.getByTestId('faces-finder')).toHaveCount(0);
  await expect(page).toHaveURL(/face=Test%20Sans/);
  const body = page.locator('[data-testid="style-row"][data-style="body"]');
  await expect(body.locator('[data-testid="pick-fg"][aria-pressed="true"]')).toHaveAttribute(
    'title',
    '#000000',
  );
  await expect(body.locator('[data-testid="pick-bg"][aria-pressed="true"]')).toHaveAttribute(
    'title',
    '#ffffff',
  );
  const display = page.locator('[data-testid="style-row"][data-style="display"]');
  await expect(display.locator('[data-testid="pick-fg"][aria-pressed="true"]')).toHaveAttribute(
    'title',
    '#663399',
  );
});

test('the finder narrows the catalogue by facts, orders by name or shuffle, and compares files side by side', async ({
  page,
}) => {
  await serveTestFace(page);
  await page.goto('/type?measure=600');
  const finder = page.getByTestId('faces-finder');
  await expect(finder).toBeVisible();
  // The bench uses 400, 500, 600 and 700: the one-weight display face and the 300–800 axis are judged on that.
  await expect(page.getByTestId('finder-count')).toContainText('2 of 3 faces match');
  await expect(page.locator('[data-testid="face-card"]')).toHaveCount(2);
  await expect(page.locator('[data-testid="face-card"]').first()).toHaveAttribute(
    'data-family',
    'Test Sans',
  );
  await page.getByTestId('facet-weights').uncheck();
  await expect(page.getByTestId('finder-count')).toContainText('3 of 3 faces match');
  await expect(page.locator('[data-testid="face-card"][data-family="Test Display"]')).toContainText(
    'lacks a weight the bench uses',
  );
  await page.locator('[data-testid="facet-category"]', { hasText: /^serif\b/ }).click();
  await expect(page.locator('[data-testid="face-card"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="face-card"]')).toHaveAttribute(
    'data-family',
    'Test Serif',
  );
  await expect(page.locator('[data-testid="face-card"]')).toContainText('variable · wght 300–800');
  await page.locator('[data-testid="facet-subset"]', { hasText: 'cyrillic' }).click();
  await expect(page.getByTestId('finder-count')).toContainText('1 of 3');
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.getByTestId('finder-count')).toContainText('2 of 3');
  await page.getByTestId('finder-order').selectOption('name-desc');
  await expect(page.locator('[data-testid="face-card"]').first()).toHaveAttribute(
    'data-family',
    'Test Serif',
  );
  // Compare: both files are read in the browser; the count per line follows the bench's measure.
  await expect(page.getByTestId('compare-tray')).toContainText('0 of 4');
  await page.locator('[data-testid="face-card"]').nth(0).getByTestId('face-compare').click();
  await page.locator('[data-testid="face-card"]').nth(1).getByTestId('face-compare').click();
  const tray = page.getByTestId('compare-tray');
  await expect(tray).toContainText('2 of 4');
  await expect(tray).toContainText('Test Serif');
  const perLine = tray.locator('[data-testid="compare-row"]', { hasText: 'Per line at 600 px' });
  await expect(perLine).toContainText('71');
  await expect(tray.locator('[data-testid="compare-row"]', { hasText: 'Glyphs' })).toContainText(
    '7',
  );
  await tray.getByRole('button', { name: 'Remove Test Serif from compare' }).click();
  await expect(tray).toContainText('1 of 4');
  await tray.getByTestId('compare-set').click();
  await expect(finder).toHaveCount(0);
  await expect(page).toHaveURL(/face=Test%20Sans/);
  await expect(page.getByTestId('cpl')).toHaveText('71');
});

test('type laboratory fits phone and desktop and has no automated accessibility violations', async ({
  page,
}) => {
  await serveTestFace(page);
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/type?face=Test+Sans');
    await expect(page.getByTestId('metrics')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const audit = async () => {
      const results = await new AxeBuilder({ page })
        // The specimen and the cards deliberately show the reader's own pairs, which may fail; the panel reports them.
        .exclude('[data-testid="style-row"]')
        .exclude('[data-testid="face-card"]')
        .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
        .analyze();
      expect(
        results.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
      ).toEqual([]);
    };
    await audit();
    await page.getByTestId('faces-toggle').click();
    await expect(page.getByTestId('faces-finder')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await audit();
  }
});
