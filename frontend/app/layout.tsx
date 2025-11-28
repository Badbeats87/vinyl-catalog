import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vinyl Marketplace',
  description: 'Buy and sell vinyl records',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
