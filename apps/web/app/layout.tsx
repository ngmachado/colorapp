import type { ReactNode } from 'react';

export const metadata = { title: 'Super Colour' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
