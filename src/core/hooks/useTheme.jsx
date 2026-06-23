import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({ theme: 'mid', setTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(
    () => localStorage.getItem('zx-theme') || 'mid'
  );

  const setTheme = (t) => {
    setThemeState(t);
    try { localStorage.setItem('zx-theme', t); } catch {}
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
