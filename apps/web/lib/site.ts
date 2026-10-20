/** Set SITE_URL to the canonical public origin when using a custom domain. */
export const siteUrl = new URL(process.env.SITE_URL ?? 'https://colorapp-taupe.vercel.app/');
export const siteDescription =
  'Explore colour, build palettes, and follow the sources. A practical colour laboratory with introductory lessons and a small cultural collection.';
