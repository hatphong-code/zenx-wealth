import { createContext, useCallback, useContext, useState } from 'react';
import { formatMoney, fmtShort } from '../utils/formatters';

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

  // fmt: number WITH ₫ symbol — for standalone display in JSX
  const fmt = useCallback((value, currency = 'VND') => {
    if (unit === 'compact') return `${fmtShort(value)} ₫`;
    return formatMoney(value, currency);
  }, [unit]);

  // fmtNum: number WITHOUT ₫ — for use inside t() template params where string adds ₫ separately
  const fmtNum = useCallback((value) => {
    if (unit === 'compact') return fmtShort(value);
    return Number(value).toLocaleString('vi-VN');
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
