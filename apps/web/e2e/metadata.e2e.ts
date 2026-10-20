import { expect, test } from '@playwright/test';

test('public pages have social cards and working app icons; private pages are noindex', async ({
  page,
  request,
}) => {
  await page.goto('/theory');
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    'Super Colour',
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    'content',
    'summary_large_image',
  );
  const image = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(image).toMatch(/^https?:\/\//);
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
    'content',
    /\/opengraph-image$/,
  );
  for (const path of ['/icon.svg', '/favicon.ico', '/apple-icon', '/opengraph-image']) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()['content-type']).toMatch(/^image\//);
  }
  const robots = await request.get('/robots.txt');
  expect(await robots.text()).toContain('Disallow: /api/');
  expect(await robots.text()).toContain('Disallow: /library');
  await page.goto('/library');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});
