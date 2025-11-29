'use client';

import { CurrencyProvider } from '@/lib/currency-context';
import { ToastProvider } from '@/components/Toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <CurrencyProvider>{children}</CurrencyProvider>
    </ToastProvider>
  );
}
