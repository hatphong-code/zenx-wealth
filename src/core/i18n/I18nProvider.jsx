import { useCallback, useMemo, useState } from 'react';
import en from './dictionaries/en';
import vi from './dictionaries/vi';
import { I18nContext } from './I18nContext';

const dictionaries = { vi, en };
const LOCALE_KEY = 'zx-locale';
const SUPPORTED = ['vi', 'en'];

function getNestedValue(target, path) {
  return path.split('.').reduce((current, segment) => current?.[segment], target);
}

function interpolate(template, params = {}) {
  if (typeof template !== 'string') return template;
  return template.replace(/\{(\w+)\}/g, (_, token) => String(params[token] ?? ''));
}

function readStoredLocale() {
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    return SUPPORTED.includes(stored) ? stored : 'vi';
  } catch {
    return 'vi';
  }
}

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(readStoredLocale);

  const setLocale = useCallback((next) => {
    if (!SUPPORTED.includes(next)) return;
    try { localStorage.setItem(LOCALE_KEY, next); } catch {}
    setLocaleState(next);
  }, []);

  const dictionary = dictionaries[locale] || dictionaries.vi;

  const value = useMemo(() => ({
    locale,
    setLocale,
    t(key, params = {}, fallback = key) {
      const translated = getNestedValue(dictionary, key);
      if (translated === undefined) return interpolate(fallback, params);
      if (Array.isArray(translated)) return translated;
      return interpolate(translated, params);
    },
  }), [dictionary, locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
