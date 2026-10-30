import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const hexes = (page: import('@playwright/test').Page) =>
  page.getByTestId('column').evaluateAll((els) => els.map((e) => e.getAttribute('data-hex')));

test('source-led draws take every unlocked column from a documented record and name it', async ({
  page,
}) => {
  await page.goto('/lab');
  await page.getByTestId('structure').selectOption('source-led');
  await page.getByTestId('source').selectOption('japanese');
  await page.getByTestId('draw').click();
  const columns = page.getByTestId('column');
  await expect(columns).toHaveCount(5);
  for (let i = 0; i < 5; i++) {
    await expect(columns.nth(i)).toHaveAttribute('data-source', /^ja-/);
    await expect(columns.nth(i).getByTestId('from-record')).toContainText('from');
  }
});

test('vary moves every unlocked column a little and holds a locked one', async ({ page }) => {
  await page.goto('/lab');
  const columns = page.getByTestId('column');
  await columns.nth(1).hover();
  await columns.nth(1).getByTestId('lock').click();
  const before = await columns.evaluateAll((els) => els.map((e) => e.getAttribute('data-oklch')));
  await page.getByTestId('vary').click();
  await expect(page.getByTestId('notice')).toContainText('Varied around the previous palette');
  const after = await columns.evaluateAll((els) => els.map((e) => e.getAttribute('data-oklch')));
  expect(after[1]).toBe(before[1]);
  for (const i of [0, 2, 3, 4]) {
    const [l0, c0, h0] = before[i]!.split(',').map(Number) as [number, number, number];
    const [l1, c1, h1] = after[i]!.split(',').map(Number) as [number, number, number];
    expect(Math.abs(l1 - l0)).toBeLessThanOrEqual(0.051);
    expect(Math.abs(c1 - c0)).toBeLessThanOrEqual(0.031);
    if (c0 > 0.02) {
      const dh = Math.abs(((h1 - h0 + 540) % 360) - 180);
      expect(dh).toBeLessThanOrEqual(15.5);
    }
  }
});

test('options change the rule angles and the bounds, and a lock outside the bounds is refused', async ({
  page,
}) => {
  await page.goto('/lab');
  await page.getByTestId('options-button').click();
  await page.getByLabel('Analogous span').fill('5');
  await page.getByLabel('Chroma minimum').fill('0.08');
  await page.getByTestId('structure').selectOption('analogous');
  await page.getByTestId('draw').click();
  const columns = page.getByTestId('column');
  const after = await columns.evaluateAll((els) => els.map((e) => e.getAttribute('data-oklch')));
  const base = Number(after[0]!.split(',')[2]);
  for (const row of after) {
    const [, c, h] = row!.split(',').map(Number) as [number, number, number];
    expect(c).toBeGreaterThanOrEqual(0.079);
    const dh = Math.abs(((h - base + 540) % 360) - 180);
    expect(dh).toBeLessThanOrEqual(5.5);
  }
  await page.getByLabel('Hue arc from').fill('200');
  await page.getByLabel('Hue arc to').fill('260');
  await page.getByTestId('structure').selectOption('complementary');
  await page.getByTestId('draw').click();
  await expect(page.getByTestId('notice')).toContainText('180');
});

test('the address bar holds the palette and reopening the URL restores it; JSON export names the records', async ({
  page,
}) => {
  await page.goto('/lab');
  await page.getByTestId('draw').click();
  await expect(page).toHaveURL(/palette=.*&structure=triadic&n=4028/);
  const drawn = await hexes(page);
  const url = page.url();
  await page.goto(url);
  expect(await hexes(page)).toEqual(drawn);

  await page.getByTestId('export').click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('export-json').click(),
  ]);
  expect(download.suggestedFilename()).toBe('palette-triadic-4028.json');
  const body = JSON.parse(await readFile(await download.path(), 'utf8')) as {
    colours: { role: string; hex: string; nearest: { record: string; collection: string } }[];
    sources: Record<string, { title: string }>;
    notes: string[];
  };
  expect(body.colours.map((c) => c.role)).toEqual([
    'dominant',
    'secondary',
    'accent',
    'support',
    'highlight',
  ]);
  expect(body.colours.map((c) => c.hex)).toEqual(drawn);
  expect(body.colours[0]!.nearest.collection).toBeTruthy();
  expect(body.notes.join(' ')).toContain('not an identification');
});

test('exports from documented records carry the record, its source and whether the column was edited', async ({
  page,
}) => {
  await page.goto('/lab?from=css-rebeccapurple,ja-sakura-iro');
  await expect(page.getByTestId('column')).toHaveCount(2);
  await page.getByTestId('export').click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('export-json').click(),
  ]);
  const body = JSON.parse(await readFile(await download.path(), 'utf8')) as {
    colours: {
      record: {
        id: string;
        approximation: string;
        source: string;
        edited: boolean;
        value: { space: string };
      };
    }[];
    sources: Record<string, { title: string; author: string }>;
  };
  expect(body.colours[0]!.record).toMatchObject({
    id: 'css-rebeccapurple-srgb',
    approximation: 'published-value',
    source: 'w3c-css-color-4',
    edited: false,
    value: { space: 'srgb' },
  });
  expect(body.colours[1]!.record.id).toBe('ja-sakura-iro-srgb-jis');
  expect(body.sources['w3c-css-color-4']!.title).toContain('CSS Color');
  // The SVG names the record on each swatch.
  await page.getByTestId('export').click();
  const [svg] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('export-svg').click(),
  ]);
  const text = await readFile(await svg.path(), 'utf8');
  expect(text).toContain('data-record="css-rebeccapurple-srgb"');
  expect(text).toContain('data-edited="false"');
  expect(text).toContain('<metadata><![CDATA[');
  // Editing a column marks it as edited in the CSS comment.
  await page.getByTestId('column').nth(0).hover();
  await page.getByTestId('column').nth(0).getByTestId('scale').click();
  await page.getByRole('button', { name: 'dominant lightness 0.95' }).click();
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
  await page.getByTestId('export').click();
  await page.getByRole('button', { name: 'Copy CSS variables' }).click();
  await expect(page.getByTestId('notice')).toContainText('CSS copied');
  const css = await page.evaluate(() => (window as unknown as { copied: string }).copied);
  expect(css).toMatch(/dominant: from record css-rebeccapurple-srgb .* edited in the Laboratory/);
  expect(css).toMatch(/secondary: from record ja-sakura-iro-srgb-jis .* as recorded/);
  await expect(page.getByTestId('column').nth(0).getByTestId('from-record')).toContainText(
    'rebeccapurple · edited',
  );
});
