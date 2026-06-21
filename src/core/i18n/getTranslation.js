import vi from './dictionaries/vi';
import en from './dictionaries/en';

let _locale = 'vi';

export function setCurrentLocale(locale) {
  _locale = locale;
}

export function getTranslation(key, params = {}, fallback = '') {
  const dict = _locale === 'en' ? en : vi;

  const keys = key.split('.');
  let value = dict;

  for (const k of keys) {
    value = value?.[k];
  }

  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== 'string') {
    return fallback;
  }

  return value.replace(/\{(\w+)\}/g, (_, paramKey) => String(params[paramKey] ?? ''));
}
