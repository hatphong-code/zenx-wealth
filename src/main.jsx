import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './web/App';
import { AuthProvider } from './core/auth/AuthProvider';
import { I18nProvider } from './core/i18n/I18nProvider';
import { ThemeProvider } from './core/hooks/useTheme';
import { NumberFormatProvider } from './core/hooks/useNumberFormat';
import { ToastProvider } from './web/components/ui/Toast';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <NumberFormatProvider>
        <I18nProvider>
          <AuthProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </AuthProvider>
        </I18nProvider>
      </NumberFormatProvider>
    </ThemeProvider>
  </React.StrictMode>
);

