import type { ReactNode } from 'react';
import { cssVariables } from '@/lib/tokens';
import './globals.css';

export const metadata = {
  title: 'Super Colour',
  description: 'Colour theory as a tool, with sources',
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
