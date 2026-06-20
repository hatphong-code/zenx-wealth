import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, FileText, LayoutDashboard } from 'lucide-react';
import { useI18n } from '../i18n/useI18n';
import { useAuth } from '../auth/useAuth';
import { featureCatalog } from '../data/accessControl';
import { getCachedTransactions } from '../services/transactionService';
import { formatMoney } from '../utils/formatters';

const PAGE_ICONS = {
  dashboard: LayoutDashboard,
};

function highlight(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-zx-accent/20 text-zx-accent rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function GlobalSearch({ open, onClose }) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const pageResults = useMemo(() => {
    if (!query.trim()) return featureCatalog.slice(0, 6);
    const q = query.toLowerCase();
    return featureCatalog.filter(f =>
      f.key.includes(q) ||
      f.label.toLowerCase().includes(q) ||
      (f.description || '').toLowerCase().includes(q)
    ).slice(0, 8);
  }, [query]);

  const txResults = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    const q = query.toLowerCase();
    const cached = user ? getCachedTransactions(user.uid) : null;
    if (!cached?.transactions) return [];
    return cached.transactions
      .filter(tx =>
        (tx.category || '').toLowerCase().includes(q) ||
        (tx.note || '').toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [query, user]);

  const hasResults = pageResults.length > 0 || txResults.length > 0;

  const handleSelect = (route) => {
    navigate(route);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-xl rounded-zx border border-zx-line bg-zx-surface shadow-2xl overflow-hidden animate-[slideInRight_0.15s_ease-out]"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zx-line">
          <Search className="h-4 w-4 shrink-0 text-zx-text-soft" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('search.placeholder')}
            className="flex-1 bg-transparent text-sm text-zx-text placeholder:text-zx-text-soft outline-none"
          />
          <button onClick={onClose} aria-label={t('search.close')}
            className="shrink-0 rounded p-0.5 text-zx-text-soft transition hover:text-zx-text">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[55vh] overflow-y-auto">
          {!hasResults && query.length > 0 && (
            <p className="px-4 py-6 text-center text-sm text-zx-text-soft">{t('search.noResults')}</p>
          )}

          {pageResults.length > 0 && (
            <div className="py-2">
              {query.trim() && (
                <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zx-text-soft">
                  {t('search.pages')}
                </p>
              )}
              {pageResults.map(f => {
                const Icon = PAGE_ICONS[f.key] || FileText;
                const label = t(`nav.items.${f.key}`, {}, f.label);
                return (
                  <button key={f.key} onClick={() => handleSelect(f.route)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition hover:bg-zx-surface-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-zx-sm bg-zx-icon-bg text-zx-accent">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zx-text truncate">
                        {highlight(label, query)}
                      </p>
                      {f.description && (
                        <p className="text-xs text-zx-text-soft truncate">{f.description}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {txResults.length > 0 && (
            <div className="border-t border-zx-line py-2">
              <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zx-text-soft">
                {t('search.transactions')}
              </p>
              {txResults.map(tx => (
                <button key={tx.id} onClick={() => handleSelect('/transactions')}
                  className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-zx-surface-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zx-text truncate">
                      {highlight(tx.category, query)}
                    </p>
                    {tx.note && (
                      <p className="text-xs text-zx-text-soft truncate">{highlight(tx.note, query)}</p>
                    )}
                  </div>
                  <span className={`shrink-0 text-sm font-mono font-semibold ${tx.type === 'income' ? 'text-zx-positive' : 'text-zx-accent'}`}>
                    {tx.type === 'income' ? '+' : '−'}{formatMoney(tx.amount, tx.currency || 'VND')}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-zx-line px-4 py-2 flex items-center justify-between text-[11px] text-zx-text-soft">
          <span>↑↓ điều hướng · Enter chọn · Esc đóng</span>
          <kbd className="rounded border border-zx-line px-1.5 py-0.5 font-mono">Esc</kbd>
        </div>
      </div>
    </div>
  );
}
