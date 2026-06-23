import { createContext, useCallback, useContext, useState } from 'react';
import { formatMoney, fmtShort } from '../utils/formatters';

function currencySymbol(currency) {
  if (currency === 'USD') return '$';
  return '₫';
}

function compactFmt(value, currency) {
  if (currency === 'USD') {
    const n = Number(value);
    if (Math.abs(n) >= 1000) return `$${(n / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}k`;
    return `$${n.toLocaleString('en-US')}`;
  }
  return `${fmtShort(value)} ₫`;
}

const UNIT_KEY = 'zx-number-unit';
const SUPPORTED = ['full', 'compact'];

const NumberFormatContext = createContext({
  unit: 'full',
  setUnit: () => {},
  fmt: (value, currency = 'VND') => formatMoney(value, currency),
  fmtNum: (value) => Number(value).toLocaleString('vi-VN'),
});

function readStoredUnit() {
  try {
    const stored = localStorage.getItem(UNIT_KEY);
    return SUPPORTED.includes(stored) ? stored : 'full';
  } catch {
    return 'full';
  }
}

export function NumberFormatProvider({ children }) {
  const [unit, setUnitState] = useState(readStoredUnit);

  const setUnit = useCallback((next) => {
    if (!SUPPORTED.includes(next)) return;
    try { localStorage.setItem(UNIT_KEY, next); } catch {}
    setUnitState(next);
  }, []);

  // fmt: number WITH currency symbol — for standalone display in JSX
  const fmt = useCallback((value, currency = 'VND') => {
    if (unit === 'compact') return compactFmt(value, currency);
    return formatMoney(value, currency);
  }, [unit]);

  // fmtNum: number WITHOUT symbol — for use inside t() template params
  const fmtNum = useCallback((value, currency = 'VND') => {
    if (unit === 'compact') {
      if (currency === 'USD') {
        const n = Number(value);
        if (Math.abs(n) >= 1000) return `${(n / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}k`;
        return n.toLocaleString('en-US');
      }
      return fmtShort(value);
    }
    return Number(value).toLocaleString(currency === 'USD' ? 'en-US' : 'vi-VN');
  }, [unit]);

  return (
    <NumberFormatContext.Provider value={{ unit, setUnit, fmt, fmtNum }}>
      {children}
    </NumberFormatContext.Provider>
  );
}

export function useNumberFormat() {
  return useContext(NumberFormatContext);
}
