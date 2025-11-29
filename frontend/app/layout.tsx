import type { Metadata } from 'next';
import './globals.css';
import { CurrencyProvider } from '@/lib/currency-context';

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
      <body>
        <CurrencyProvider>{children}</CurrencyProvider>
      </body>
    </html>
  );
}
