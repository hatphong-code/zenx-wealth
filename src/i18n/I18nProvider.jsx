import { useMemo } from 'react';
import en from './dictionaries/en';
import vi from './dictionaries/vi';
import { I18nContext } from './I18nContext';

const dictionaries = { vi, en };

function getNestedValue(target, path) {
  return path.split('.').reduce((current, segment) => current?.[segment], target);
}

function interpolate(template, params = {}) {
  if (typeof template !== 'string') return template;
  return template.replace(/\{(\w+)\}/g, (_, token) => String(params[token] ?? ''));
}

export function I18nProvider({ children, locale = 'vi' }) {
  const dictionary = dictionaries[locale] || dictionaries.vi;

  const value = useMemo(() => ({
    locale,
    t(key, params = {}, fallback = key) {
      const translated = getNestedValue(dictionary, key);
      if (translated === undefined) {
        return interpolate(fallback, params);
      }
      if (Array.isArray(translated)) return translated;
      return interpolate(translated, params);
    },
  }), [dictionary, locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
