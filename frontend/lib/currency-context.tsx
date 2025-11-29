'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface CurrencyContextType {
  symbol: string;
  code: string;
  setCurrency: (symbol: string, code: string) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [symbol, setSymbol] = useState('$');
  const [code, setCode] = useState('USD');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load from localStorage or use default
    const savedCurrency = localStorage.getItem('currency-symbol') || '$';
    const savedCode = localStorage.getItem('currency-code') || 'USD';
    setSymbol(savedCurrency);
    setCode(savedCode);
    setMounted(true);
  }, []);

  const setCurrency = (newSymbol: string, newCode: string) => {
    setSymbol(newSymbol);
    setCode(newCode);
    localStorage.setItem('currency-symbol', newSymbol);
    localStorage.setItem('currency-code', newCode);
  };

  // Don't render children until mounted to avoid hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <CurrencyContext.Provider value={{ symbol, code, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

export const formatPrice = (amount: number, symbol: string = '$'): string => {
  return `${symbol}${amount.toFixed(2)}`;
};
