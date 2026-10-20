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

export default function RootLayout({ children }: { children: ReactNode }) {
  const vars = `:root{${cssVariables('light')}}`;
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&family=Noto+Sans+JP:wght@400;500&family=Noto+Sans+SC:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{ __html: vars }} />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
