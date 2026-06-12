import { createContext } from 'react';

export const I18nContext = createContext({
  locale: 'vi',
  t: (key, params, fallback) => fallback || key,
});
