import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteDoc, doc } from 'firebase/firestore/lite';
import { useAuth } from '../auth/useAuth';
import { useI18n } from '../i18n/useI18n';
import { Filter, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { formatDate, formatMoney } from '../utils/formatters';
import { db } from '../services/firebaseDb';
import { invalidateDashboardStatsCache } from '../services/dashboardService';
import { invalidateLatteFactorCache } from '../services/latteFactorService';
import { invalidatePayYourselfFirstCache } from '../services/payYourselfFirstService';
import { invalidateReportsCache } from '../services/reportsService';
import { setTransactionsCache } from '../services/transactionService';
import { useTransactionsData } from '../hooks/useTransactionsData';
import { getCurrentWeekMeta, invalidateWeeklyReviewCache } from '../services/weeklyReviewService';
import { invalidateWealthRoadmapCache } from '../services/wealthRoadmapService';
import { invalidateAICoachCache } from '../services/aiCoachService';

function getMonthOptions(transactions) {
  const months = new Set();
  transactions.forEach(tx => {
    const d = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date);
    if (!isNaN(d.getTime())) months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  });
  return [...months].sort().reverse();
}

export default function Transactions() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { data, setData, loading, refreshing, error, setError } = useTransactionsData(user?.uid);
  const { transactions, currency } = data;

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterMonth, setFilterMonth] = useState('');

  const monthOptions = useMemo(() => getMonthOptions(transactions), [transactions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter(tx => {
      if (filterType !== 'all' && tx.type !== filterType) return false;
      if (filterMonth) {
        const d = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date);
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (m !== filterMonth) return false;
      }
      if (q) {
        const inCategory = (tx.category || '').toLowerCase().includes(q);
        const inNote = (tx.note || '').toLowerCase().includes(q);
        if (!inCategory && !inNote) return false;
      }
      return true;
    });
  }, [transactions, search, filterType, filterMonth]);

  const hasFilter = search || filterType !== 'all' || filterMonth;

  const clearFilters = () => {
    setSearch('');
    setFilterType('all');
    setFilterMonth('');
  };

  const handleDelete = async (transactionId) => {
    if (!user) return;
    const shouldDelete = window.confirm(t('transactions.confirmDelete'));
    if (!shouldDelete) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'transactions', transactionId));
      const nextData = {
        ...data,
        transactions: transactions.filter((item) => item.id !== transactionId),
      };
      setData(nextData);
      setTransactionsCache(user.uid, nextData);
      invalidateDashboardStatsCache(user.uid);
      invalidateLatteFactorCache(user.uid);
      invalidatePayYourselfFirstCache(user.uid);
      invalidateReportsCache(user.uid);
      invalidateAICoachCache(user.uid);
      const weekMeta = getCurrentWeekMeta();
      invalidateWeeklyReviewCache(user.uid, weekMeta.weekKey);
      invalidateWealthRoadmapCache(user.uid);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <div className="space-y-1">
            <h1 className="font-zx-head text-2xl font-bold text-zx-text">{t('transactions.title')}</h1>
            <p className="text-sm text-zx-text-soft">{t('transactions.subtitle')}</p>
            {loading && <p className="text-sm text-zx-text-soft">{t('transactions.loading')}</p>}
            {refreshing && <p className="text-sm text-zx-accent">{t('transactions.refreshing')}</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              to="/import"
              className="inline-flex items-center justify-center gap-2 rounded border border-zx-line px-3 py-2 text-sm text-zx-text-soft transition hover:text-zx-text"
            >
              CSV
            </Link>
            <Link
              to="/transactions/new"
              className="inline-flex items-center justify-center gap-2 rounded bg-zx-accent px-4 py-2 text-sm font-medium text-zx-text transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> {t('transactions.addButton')}
            </Link>
          </div>
        </div>

        {/* Search & Filter bar */}
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zx-text-soft" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('transactions.searchPlaceholder', {}, 'Tìm theo danh mục hoặc ghi chú...')}
              className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 pl-9 pr-3 py-2 text-sm text-zx-text outline-none focus:ring-2 focus:ring-zx-accent"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-zx-sm border border-zx-line overflow-hidden text-sm">
              {['all','income','expense'].map(v => (
                <button key={v} onClick={() => setFilterType(v)}
                  className={`px-3 py-2 transition ${filterType === v ? 'bg-zx-accent text-zx-on-accent' : 'bg-zx-surface-2 text-zx-text-soft hover:text-zx-text'}`}>
                  {v === 'all' ? t('transactions.all') : v === 'income' ? t('transactions.incomeShort') : t('transactions.expenseShort')}
                </button>
              ))}
            </div>
            {monthOptions.length > 0 && (
              <select
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                className="rounded-zx-sm border border-zx-line bg-zx-surface-2 px-2 py-2 text-sm text-zx-text outline-none focus:ring-2 focus:ring-zx-accent"
              >
                <option value="">{t('transactions.allMonths')}</option>
                {monthOptions.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
            {hasFilter && (
              <button onClick={clearFilters} className="flex items-center gap-1 px-2 py-2 text-xs text-zx-text-soft hover:text-zx-text transition">
                <X className="h-3.5 w-3.5" /> {t('transactions.clearFilter')}
              </button>
            )}
          </div>
        </div>

        {hasFilter && (
          <p className="text-xs text-zx-text-soft mb-3">
            <Filter className="h-3 w-3 inline mr-1" />
            {filtered.length} / {transactions.length} giao dịch
          </p>
        )}

        {error && <div className="rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</div>}

        <section className="overflow-hidden">
          {filtered.length === 0 ? (
            <div className="space-y-4 p-6 text-center">
              <p className="text-zx-text-soft">{loading ? t('transactions.loading') : hasFilter ? t('transactions.noResults') : t('transactions.empty')}</p>
              {!loading && !hasFilter && (
                <Link to="/transactions/new" className="text-sm font-medium text-zx-accent hover:text-zx-accent">
                  {t('transactions.addFirst')}
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="divide-y divide-zx-line md:hidden">
                {filtered.map((transaction) => (
                  <article key={transaction.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm text-zx-text-soft">{formatDate(transaction.date)}</p>
                        <h3 className="font-semibold text-zx-text">{transaction.category}</h3>
                      </div>
                      <p className="text-right font-mono text-base font-semibold">
                        {formatMoney(transaction.amount, transaction.currency || currency)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`rounded-full px-2.5 py-1 ${
                          transaction.type === 'income'
                            ? 'bg-green-950 text-zx-positive'
                            : 'bg-orange-950 text-orange-300'
                        }`}
                      >
                        {transaction.type}
                      </span>
                      {transaction.isLatteFactor && (
                        <span className="rounded-full bg-red-950 px-2.5 py-1 text-red-300">☕ Latte</span>
                      )}
                      {transaction.isRecurring && (
                        <span className="rounded-full bg-zx-surface-2 px-2.5 py-1 text-zx-text-soft">{t('transactions.monthlyBadge')}</span>
                      )}
                    </div>

                    <p className="text-sm text-zx-text-soft">{transaction.note || t('common.noNote')}</p>

                    <div className="flex gap-2">
                      <Link
                        to={`/transactions/${transaction.id}/edit`}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-zx-bg px-3 py-2 text-sm text-zx-accent transition hover:bg-zx-surface-2"
                      >
                        <Pencil className="h-4 w-4" /> {t('common.edit')}
                      </Link>
                      <Button
                        type="button"
                        onClick={() => handleDelete(transaction.id)}
                        className="flex-1 bg-red-950 px-3 py-2 text-red-300 hover:bg-red-900"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> {t('common.delete')}
                      </Button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="bg-zx-bg text-xs uppercase tracking-wide text-zx-text-soft">
                  <tr>
                    <th className="px-4 py-3">{t('transactions.table.date')}</th>
                    <th className="px-4 py-3">{t('transactions.table.category')}</th>
                    <th className="px-4 py-3">{t('transactions.table.type')}</th>
                    <th className="px-4 py-3 text-right">{t('transactions.table.amount')}</th>
                    <th className="px-4 py-3">{t('transactions.table.flags')}</th>
                    <th className="px-4 py-3">{t('transactions.table.note')}</th>
                    <th className="px-4 py-3 text-right">{t('transactions.table.action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((transaction) => (
                    <tr key={transaction.id} className="border-t border-zx-line">
                      <td className="px-4 py-3 text-zx-text-soft">{formatDate(transaction.date)}</td>
                      <td className="px-4 py-3 font-medium">{transaction.category}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-1 text-xs ${
                            transaction.type === 'income'
                              ? 'bg-green-950 text-zx-positive'
                              : 'bg-orange-950 text-orange-300'
                          }`}
                        >
                          {transaction.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {formatMoney(transaction.amount, transaction.currency || currency)}
                      </td>
                      <td className="px-4 py-3 flex flex-wrap gap-1">
                        {transaction.isLatteFactor && (
                          <span className="rounded text-[10px] bg-red-950 text-red-300 px-2 py-0.5">Latte</span>
                        )}
                        {transaction.isRecurring && (
                          <span className="rounded text-[10px] bg-zx-surface-2 text-zx-text-soft px-2 py-0.5">{t('transactions.monthlyBadge')}</span>
                        )}
                        {!transaction.isLatteFactor && !transaction.isRecurring && (
                          <span className="text-zx-text-soft">-</span>
                        )}
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-3 text-zx-text-soft">{transaction.note || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            to={`/transactions/${transaction.id}/edit`}
                            className="inline-flex items-center gap-2 rounded bg-zx-bg px-3 py-2 text-zx-accent transition hover:bg-zx-surface-2"
                          >
                            <Pencil className="h-4 w-4" /> {t('common.edit')}
                          </Link>
                          <Button
                            type="button"
                            onClick={() => handleDelete(transaction.id)}
                            className="inline-flex items-center gap-2 bg-red-950 px-3 py-2 text-red-300 hover:bg-red-900"
                          >
                            <Trash2 className="h-4 w-4" /> {t('common.delete')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </section>
      </main>
  );
}
