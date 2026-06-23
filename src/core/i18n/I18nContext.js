import { createContext } from 'react';

export const I18nContext = createContext({
  locale: 'vi',
  setLocale: () => {},
  t: (key, params, fallback) => fallback || key,
});
