import type { Metadata } from 'next';
import { siteUrl, siteDescription } from '@/lib/site';
import type { ReactNode } from 'react';
import { cssVariables } from '@/lib/tokens';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: siteUrl,
  ...(process.env.VERCEL_ENV === 'preview' ? { robots: { index: false, follow: false } } : {}),
  title: { default: 'Super Colour', template: '%s · Super Colour' },
  description: siteDescription,
  applicationName: 'Super Colour',
  openGraph: {
    type: 'website',
    siteName: 'Super Colour',
    title: 'Super Colour',
    description: siteDescription,
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Super Colour',
    description: siteDescription,
    images: ['/opengraph-image'],
  },
};

/**
 * Light and dark are the same token set with two value sets. White is the default whatever the OS prefers; dark
 * applies only when the reader chose it on the toolbar. The choice is kept in localStorage and applied here before
 * the first paint so nothing flashes.
 */
export const THEME_STORAGE_KEY = 'sca.theme';
const themeCss = [
  `:root{${cssVariables('light')}color-scheme:light}`,
  `:root[data-theme="dark"]{${cssVariables('dark')}color-scheme:dark}`,
].join('');
const themeScript = `try{if(localStorage.getItem('${THEME_STORAGE_KEY}')==='dark')document.documentElement.dataset.theme='dark'}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&family=Noto+Sans+JP:wght@400;500&family=Noto+Sans+SC:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
