import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

let _id = 0;

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const STYLES = {
  success: 'border-l-2 border-l-zx-positive',
  error: 'border-l-2 border-l-zx-negative',
  info: 'border-l-2 border-l-zx-accent',
};

const ICON_STYLES = {
  success: 'text-zx-positive',
  error: 'text-zx-negative',
  info: 'text-zx-accent',
};

function ToastItem({ id, title, description, variant = 'success', onDismiss }) {
  const Icon = ICONS[variant] ?? Info;
  return (
    <div
      className={`flex w-80 max-w-[calc(100vw-2rem)] items-start gap-3 rounded-zx-sm border border-zx-line bg-zx-surface px-4 py-3 shadow-zx zx-transition animate-[slideInRight_0.2s_ease-out] ${STYLES[variant]}`}
      role="alert"
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${ICON_STYLES[variant]}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zx-text">{title}</p>
        {description && <p className="mt-0.5 text-xs text-zx-text-soft">{description}</p>}
      </div>
      <button
        onClick={() => onDismiss(id)}
        className="shrink-0 rounded p-0.5 text-zx-text-soft transition hover:text-zx-text"
        aria-label="Đóng thông báo"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 md:bottom-6">
      {toasts.map(toast => (
        <ToastItem key={toast.id} {...toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback(({ title, description, variant = 'success', duration = 3500 }) => {
    const id = ++_id;
    setToasts(prev => [...prev, { id, title, description, variant }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
