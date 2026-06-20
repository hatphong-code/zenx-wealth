import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteDoc, doc, writeBatch } from 'firebase/firestore/lite';
import { useAuth } from '../auth/useAuth';
import { useI18n } from '../i18n/useI18n';
import { ArrowUpDown, Download, Filter, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useToast } from '../components/ui/Toast';
import { SkeletonRow } from '../components/ui/Skeleton';
import { Combobox } from '../components/ui/Combobox';
import { DateRangePicker } from '../components/ui/DateRangePicker';
import { formatDate, formatMoney } from '../utils/formatters';
import { db } from '../services/firebaseDb';
import { useNumberFormat } from '../hooks/useNumberFormat';
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

function getCategoryOptions(transactions) {
  const cats = new Set();
  transactions.forEach(tx => { if (tx.category) cats.add(tx.category); });
  return [...cats].sort();
}

const SORT_OPTIONS = ['date_desc', 'date_asc', 'amount_desc', 'amount_asc'];

export default function Transactions() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { fmt } = useNumberFormat();
  const { toast } = useToast();
  const { data, setData, loading, refreshing, error, setError } = useTransactionsData(user?.uid);
  const { transactions, currency } = data;

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterLatte, setFilterLatte] = useState(false);
  const [filterRecurring, setFilterRecurring] = useState(false);
  const [sortBy, setSortBy] = useState('date_desc');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filterDateRange, setFilterDateRange] = useState({ from: undefined, to: undefined });
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [recatCategory, setRecatCategory] = useState('');
  const [page, setPage] = useState(1);

  const monthOptions = useMemo(() => getMonthOptions(transactions), [transactions]);
  const categoryOptions = useMemo(() => getCategoryOptions(transactions), [transactions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = transactions.filter(tx => {
      if (filterType !== 'all' && tx.type !== filterType) return false;
      if (filterMonth) {
        const d = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date);
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (m !== filterMonth) return false;
      }
      if (filterCategory && tx.category !== filterCategory) return false;
      if (filterDateRange?.from && filterDateRange?.to) {
        const d = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date);
        if (d < filterDateRange.from || d > filterDateRange.to) return false;
      }
      if (filterLatte && !tx.isLatteFactor) return false;
      if (filterRecurring && !tx.isRecurring) return false;
      if (q) {
        const inCategory = (tx.category || '').toLowerCase().includes(q);
        const inNote = (tx.note || '').toLowerCase().includes(q);
        if (!inCategory && !inNote) return false;
      }
      return true;
    });

    // Sort
    result = [...result].sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      if (sortBy === 'date_desc') return dateB - dateA;
      if (sortBy === 'date_asc') return dateA - dateB;
      if (sortBy === 'amount_desc') return b.amount - a.amount;
      if (sortBy === 'amount_asc') return a.amount - b.amount;
      return 0;
    });

    return result;
  }, [transactions, search, filterType, filterMonth, filterCategory, filterDateRange, filterLatte, filterRecurring, sortBy]);

  const totals = useMemo(() => {
    const income = filtered.filter(tx => tx.type === 'income').reduce((s, tx) => s + Number(tx.amount), 0);
    const expense = filtered.filter(tx => tx.type === 'expense').reduce((s, tx) => s + Number(tx.amount), 0);
    return { income, expense, net: income - expense };
  }, [filtered]);

  const hasFilter = search || filterType !== 'all' || filterMonth || filterCategory || filterDateRange?.from || filterLatte || filterRecurring;

  const ITEMS_PER_PAGE = 50;
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, filterType, filterMonth, filterCategory, filterLatte, filterRecurring, sortBy]);

  const paged = selectionMode ? filtered : filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const clearFilters = () => {
    setSearch('');
    setFilterType('all');
    setFilterMonth('');
    setFilterCategory('');
    setFilterDateRange({ from: undefined, to: undefined });
    setFilterLatte(false);
    setFilterRecurring(false);
    setSortBy('date_desc');
  };

  const cycleSort = () => {
    const idx = SORT_OPTIONS.indexOf(sortBy);
    setSortBy(SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length]);
  };

  const sortLabel = {
    date_desc: t('transactions.sortDateDesc'),
    date_asc: t('transactions.sortDateAsc'),
    amount_desc: t('transactions.sortAmountDesc'),
    amount_asc: t('transactions.sortAmountAsc'),
  }[sortBy];

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
      toast({ title: t('toast.txDeleted'), variant: 'success' });
    } catch (err) {
      setError(err.message);
      toast({ title: t('toast.error', {}, 'Có lỗi xảy ra'), description: err.message, variant: 'error' });
    }
  };

  const exportCsv = () => {
    const headers = [
      t('transactions.table.date'),
      t('transactions.table.category'),
      t('transactions.table.type'),
      t('transactions.table.amount'),
      'Currency',
      t('transactions.table.note'),
      'Latte Factor',
      t('common.recurring'),
    ];
    const rows = filtered.map(tx => {
      const d = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date);
      return [
        d.toLocaleDateString('vi-VN'),
        tx.category,
        tx.type === 'income' ? t('common.income') : t('common.expense'),
        tx.amount,
        tx.currency || currency,
        tx.note || '',
        tx.isLatteFactor ? 'Yes' : 'No',
        tx.isRecurring ? 'Yes' : 'No',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${t('transactions.exportFilename')}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelectionMode = () => {
    setSelectionMode(v => !v);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every(tx => selectedIds.has(tx.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(tx => tx.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!user || selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!window.confirm(t('transactions.confirmBulkDelete', { count }))) return;
    try {
      const batch = writeBatch(db);
      [...selectedIds].forEach(id => batch.delete(doc(db, 'users', user.uid, 'transactions', id)));
      await batch.commit();
      const nextTxs = transactions.filter(tx => !selectedIds.has(tx.id));
      const nextData = { ...data, transactions: nextTxs };
      setData(nextData);
      setTransactionsCache(user.uid, nextData);
      invalidateDashboardStatsCache(user.uid);
      invalidateLatteFactorCache(user.uid);
      invalidatePayYourselfFirstCache(user.uid);
      invalidateReportsCache(user.uid);
      invalidateAICoachCache(user.uid);
      invalidateWeeklyReviewCache(user.uid, getCurrentWeekMeta().weekKey);
      invalidateWealthRoadmapCache(user.uid);
      setSelectedIds(new Set());
      setSelectionMode(false);
      toast({ title: t('toast.txBulkDeleted', { count }), variant: 'success' });
    } catch (err) {
      setError(err.message);
      toast({ title: err.message, variant: 'error' });
    }
  };

  const handleBulkRecategorize = async () => {
    if (!user || selectedIds.size === 0 || !recatCategory.trim()) return;
    const count = selectedIds.size;
    try {
      const batch = writeBatch(db);
      [...selectedIds].forEach(id => batch.update(doc(db, 'users', user.uid, 'transactions', id), { category: recatCategory.trim() }));
      await batch.commit();
      const nextTxs = transactions.map(tx => selectedIds.has(tx.id) ? { ...tx, category: recatCategory.trim() } : tx);
      const nextData = { ...data, transactions: nextTxs };
      setData(nextData);
      setTransactionsCache(user.uid, nextData);
      invalidateReportsCache(user.uid);
      invalidateAICoachCache(user.uid);
      setSelectedIds(new Set());
      setSelectionMode(false);
      setRecatCategory('');
      toast({ title: t('toast.txBulkRecategorized', {}, `Đã đổi danh mục ${count} giao dịch`).replace('{count}', count), variant: 'success' });
    } catch (err) {
      setError(err.message);
      toast({ title: err.message, variant: 'error' });
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <div className="space-y-1">
          <h1 className="font-zx-head text-2xl font-bold text-zx-text">{t('transactions.title')}</h1>
          <p className="text-sm text-zx-text-soft">{t('transactions.subtitle')}</p>
          {loading && <p className="text-sm text-zx-text-soft">{t('transactions.loading')}</p>}
          {refreshing && <p className="text-sm text-zx-accent">{t('transactions.refreshing')}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!selectionMode && (
            <>
              <Link to="/import"
                className="inline-flex items-center justify-center gap-2 rounded-zx-sm border border-zx-line px-3 py-2 text-sm text-zx-text-soft transition hover:text-zx-text">
                {t('nav.items.import_transactions', {}, 'Nhập CSV')}
              </Link>
              {filtered.length > 0 && (
                <button onClick={exportCsv}
                  className="inline-flex items-center gap-1.5 rounded-zx-sm border border-zx-line px-3 py-2 text-sm text-zx-text-soft transition hover:text-zx-text">
                  <Download className="h-3.5 w-3.5" />
                  {t('transactions.exportCsv')}
                </button>
              )}
              {transactions.length > 0 && (
                <button onClick={toggleSelectionMode}
                  className="inline-flex items-center gap-1.5 rounded-zx-sm border border-zx-line px-3 py-2 text-sm text-zx-text-soft transition hover:text-zx-text">
                  {t('transactions.bulkSelect')}
                </button>
              )}
              <Link to="/transactions/new"
                className="inline-flex items-center justify-center gap-2 rounded-zx-sm bg-zx-accent px-4 py-2 text-sm font-medium text-zx-on-accent transition hover:opacity-90">
                <Plus className="h-4 w-4" /> {t('transactions.addButton')}
              </Link>
            </>
          )}
          {selectionMode && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-zx-text-soft shrink-0">{t('transactions.bulkSelected', { count: selectedIds.size })}</span>
              {selectedIds.size > 0 && (
                <>
                  {/* Re-categorize */}
                  <div className="flex items-center gap-1">
                    <input
                      value={recatCategory}
                      onChange={e => setRecatCategory(e.target.value)}
                      placeholder={t('transactions.bulkRecategorizePlaceholder')}
                      list="recat-options"
                      className="rounded-zx-sm border border-zx-line bg-zx-surface-2 px-2 py-1.5 text-sm text-zx-text outline-none focus:ring-2 focus:ring-zx-accent w-36"
                    />
                    <datalist id="recat-options">
                      {categoryOptions.map(c => <option key={c} value={c} />)}
                    </datalist>
                    <button onClick={handleBulkRecategorize} disabled={!recatCategory.trim()}
                      className="rounded-zx-sm border border-zx-line bg-zx-surface-2 px-2.5 py-1.5 text-sm text-zx-text-soft transition hover:text-zx-text disabled:opacity-40">
                      {t('transactions.bulkRecategorizeBtn')}
                    </button>
                  </div>
                  {/* Delete */}
                  <button onClick={handleBulkDelete}
                    className="inline-flex items-center gap-1.5 rounded-zx-sm bg-zx-negative/10 border border-zx-negative/40 px-3 py-1.5 text-sm font-medium text-zx-negative transition hover:bg-zx-negative/20">
                    <Trash2 className="h-3.5 w-3.5" />
                    {t('transactions.bulkDeleteBtn', { count: selectedIds.size })}
                  </button>
                </>
              )}
              <button onClick={toggleSelectionMode}
                className="inline-flex items-center gap-1.5 rounded-zx-sm border border-zx-line px-3 py-1.5 text-sm text-zx-text-soft transition hover:text-zx-text">
                {t('transactions.bulkCancel')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Search + Sort row ── */}
      <div className="mb-2 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zx-text-soft" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('transactions.searchPlaceholder')}
            className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 pl-9 pr-3 py-2 text-sm text-zx-text outline-none focus:ring-2 focus:ring-zx-accent"
          />
        </div>
        <button onClick={cycleSort}
          title={sortLabel}
          className="flex items-center gap-1.5 rounded-zx-sm border border-zx-line bg-zx-surface-2 px-3 py-2 text-xs font-medium text-zx-text-soft hover:text-zx-text transition whitespace-nowrap">
          <ArrowUpDown className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{sortLabel}</span>
        </button>
        <button onClick={() => setShowAdvanced(v => !v)}
          className={`flex items-center gap-1.5 rounded-zx-sm border px-3 py-2 text-xs font-medium transition whitespace-nowrap ${
            showAdvanced || hasFilter ? 'border-zx-accent bg-zx-accent-soft text-zx-accent' : 'border-zx-line bg-zx-surface-2 text-zx-text-soft hover:text-zx-text'
          }`}>
          <Filter className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('transactions.filterLabel')}</span>
          {hasFilter && <span className="w-1.5 h-1.5 rounded-full bg-zx-accent" />}
        </button>
      </div>

      {/* ── Advanced filters ── */}
      {showAdvanced && (
        <div className="mb-3 rounded-zx-sm border border-zx-line bg-zx-surface-2 p-3 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            {/* Type */}
            <div className="flex rounded-zx-sm border border-zx-line overflow-hidden text-sm">
              {['all', 'income', 'expense'].map(v => (
                <button key={v} onClick={() => setFilterType(v)}
                  className={`px-3 py-1.5 transition ${filterType === v ? 'bg-zx-accent text-zx-on-accent' : 'text-zx-text-soft hover:text-zx-text'}`}>
                  {v === 'all' ? t('transactions.all') : v === 'income' ? t('transactions.incomeShort') : t('transactions.expenseShort')}
                </button>
              ))}
            </div>

            {/* Month */}
            {monthOptions.length > 0 && (
              <Combobox
                options={monthOptions}
                value={filterMonth}
                onChange={setFilterMonth}
                emptyLabel={t('transactions.allMonths')}
                className="min-w-[120px]"
              />
            )}

            {/* Category */}
            {categoryOptions.length > 0 && (
              <Combobox
                options={categoryOptions}
                value={filterCategory}
                onChange={setFilterCategory}
                emptyLabel={t('transactions.allCategories')}
                className="min-w-[140px]"
              />
            )}
          </div>

          {/* Date range */}
          <div>
            <DateRangePicker
              value={filterDateRange?.from ? filterDateRange : undefined}
              onChange={r => setFilterDateRange(r ?? { from: undefined, to: undefined })}
              placeholder={t('dateRange.placeholder')}
              presets={[
                { label: t('dateRange.thisMonth'), range: { from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0) } },
                { label: t('dateRange.lastMonth'), range: { from: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), to: new Date(new Date().getFullYear(), new Date().getMonth(), 0) } },
                { label: t('dateRange.last3Months'), range: { from: new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1), to: new Date() } },
                { label: t('dateRange.thisYear'), range: { from: new Date(new Date().getFullYear(), 0, 1), to: new Date() } },
              ]}
            />
          </div>

          {/* Flag toggles */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilterLatte(v => !v)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition ${
                filterLatte ? 'border-zx-accent bg-zx-accent-soft text-zx-accent' : 'border-zx-line text-zx-text-soft hover:border-zx-accent'
              }`}>
              ☕ Latte Factor
            </button>
            <button onClick={() => setFilterRecurring(v => !v)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition ${
                filterRecurring ? 'border-zx-accent bg-zx-accent-soft text-zx-accent' : 'border-zx-line text-zx-text-soft hover:border-zx-accent'
              }`}>
              ↻ {t('transactions.recurringFilter')}
            </button>
            {hasFilter && (
              <button onClick={clearFilters}
                className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-zx-text-soft hover:text-zx-text border border-zx-line transition">
                <X className="h-3 w-3" /> {t('transactions.clearFilter')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Result count + Totals ── */}
      {(hasFilter || filtered.length > 0) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zx-text-soft">
          <span>
            <Filter className="h-3 w-3 inline mr-1" />
            {hasFilter
              ? `${filtered.length} / ${transactions.length} ${t('transactions.title').toLowerCase()}`
              : `${filtered.length} ${t('transactions.title').toLowerCase()}`
            }
          </span>
          {filtered.length > 0 && (
            <span className="flex items-center gap-3">
              <span className="text-zx-positive">+{fmt(totals.income, currency)}</span>
              <span className="text-zx-accent">−{fmt(totals.expense, currency)}</span>
              <span className={`font-semibold ${totals.net >= 0 ? 'text-zx-positive' : 'text-zx-accent'}`}>
                {t('common.netCashFlow')}: {totals.net >= 0 ? '+' : ''}{fmt(totals.net, currency)}
              </span>
            </span>
          )}
        </div>
      )}

      {error && <div className="rounded border border-zx-negative/40 bg-zx-negative/10 p-3 text-sm text-zx-negative mb-3">{error}</div>}

      <section className="overflow-hidden">
        {loading && transactions.length === 0 ? (
          <div className="divide-y divide-zx-line px-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} columns={4} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="space-y-4 p-6 text-center">
            <p className="text-zx-text-soft">
              {hasFilter ? t('transactions.noResults') : t('transactions.empty')}
            </p>
            {!hasFilter && (
              <Link to="/transactions/new" className="text-sm font-medium text-zx-accent hover:opacity-80">
                {t('transactions.addFirst')}
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="divide-y divide-zx-line md:hidden">
              {paged.map((transaction) => (
                <article key={transaction.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    {selectionMode && (
                      <input type="checkbox" checked={selectedIds.has(transaction.id)}
                        onChange={() => toggleSelect(transaction.id)}
                        className="mt-1 h-4 w-4 flex-shrink-0 rounded accent-zx-accent" />
                    )}
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="text-sm text-zx-text-soft">{formatDate(transaction.date)}</p>
                      <h3 className="font-semibold text-zx-text">{transaction.category}</h3>
                    </div>
                    <p className="text-right font-mono text-base font-semibold">
                      {formatMoney(transaction.amount, transaction.currency || currency)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`rounded-full px-2.5 py-1 ${
                      transaction.type === 'income' ? 'bg-green-950 text-zx-positive' : 'bg-orange-950 text-orange-300'
                    }`}>
                      {transaction.type === 'income' ? t('common.income') : t('common.expense')}
                    </span>
                    {transaction.isLatteFactor && (
                      <span className="rounded-full bg-red-950 px-2.5 py-1 text-red-300">☕ Latte</span>
                    )}
                    {transaction.isRecurring && (
                      <span className="rounded-full bg-zx-surface-2 px-2.5 py-1 text-zx-text-soft">{t('transactions.monthlyBadge')}</span>
                    )}
                  </div>

                  {transaction.note && (
                    <p className="text-sm text-zx-text-soft">{transaction.note}</p>
                  )}

                  {!selectionMode && (
                    <div className="flex gap-2">
                      <Link to={`/transactions/${transaction.id}/edit`}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-zx-sm bg-zx-bg px-3 py-2 text-sm text-zx-accent transition hover:bg-zx-surface-2">
                        <Pencil className="h-4 w-4" /> {t('common.edit')}
                      </Link>
                      <Button type="button" onClick={() => handleDelete(transaction.id)}
                        className="flex-1 bg-zx-negative/10 border border-zx-negative/30 px-3 py-2 text-zx-negative hover:bg-zx-negative/20">
                        <Trash2 className="mr-2 h-4 w-4" /> {t('common.delete')}
                      </Button>
                    </div>
                  )}
                </article>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="bg-zx-bg text-xs uppercase tracking-wide text-zx-text-soft">
                  <tr>
                    {selectionMode && (
                      <th className="px-4 py-3 w-10">
                        <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAll}
                          className="h-4 w-4 rounded accent-zx-accent" aria-label={allFilteredSelected ? t('transactions.bulkDeselectAll') : t('transactions.bulkSelectAll')} />
                      </th>
                    )}
                    <th className="px-4 py-3">{t('transactions.table.date')}</th>
                    <th className="px-4 py-3">{t('transactions.table.category')}</th>
                    <th className="px-4 py-3">{t('transactions.table.type')}</th>
                    <th className="px-4 py-3 text-right">{t('transactions.table.amount')}</th>
                    <th className="px-4 py-3">{t('transactions.table.flags')}</th>
                    <th className="px-4 py-3">{t('transactions.table.note')}</th>
                    {!selectionMode && <th className="px-4 py-3 text-right">{t('transactions.table.action')}</th>}
                  </tr>
                </thead>
                <tbody>
                  {paged.map((transaction) => (
                    <tr key={transaction.id}
                      onClick={selectionMode ? () => toggleSelect(transaction.id) : undefined}
                      className={`border-t border-zx-line transition ${selectionMode ? 'cursor-pointer hover:bg-zx-accent/5' : 'hover:bg-zx-surface-2/40'} ${selectedIds.has(transaction.id) ? 'bg-zx-accent/8' : ''}`}>
                      {selectionMode && (
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={selectedIds.has(transaction.id)}
                            onChange={() => toggleSelect(transaction.id)}
                            onClick={e => e.stopPropagation()}
                            className="h-4 w-4 rounded accent-zx-accent" />
                        </td>
                      )}
                      <td className="px-4 py-3 text-zx-text-soft whitespace-nowrap">{formatDate(transaction.date)}</td>
                      <td className="px-4 py-3 font-medium">{transaction.category}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded px-2 py-1 text-xs ${
                          transaction.type === 'income' ? 'bg-green-950 text-zx-positive' : 'bg-orange-950 text-orange-300'
                        }`}>
                          {transaction.type === 'income' ? t('common.income') : t('common.expense')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {formatMoney(transaction.amount, transaction.currency || currency)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {transaction.isLatteFactor && (
                            <span className="rounded text-[10px] bg-red-950 text-red-300 px-2 py-0.5">Latte</span>
                          )}
                          {transaction.isRecurring && (
                            <span className="rounded text-[10px] bg-zx-surface-2 text-zx-text-soft px-2 py-0.5">{t('transactions.monthlyBadge')}</span>
                          )}
                          {!transaction.isLatteFactor && !transaction.isRecurring && (
                            <span className="text-zx-text-soft">-</span>
                          )}
                        </div>
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-3 text-zx-text-soft">{transaction.note || '-'}</td>
                      {!selectionMode && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Link to={`/transactions/${transaction.id}/edit`}
                              className="inline-flex items-center gap-2 rounded-zx-sm bg-zx-bg px-3 py-2 text-zx-accent transition hover:bg-zx-surface-2">
                              <Pencil className="h-4 w-4" /> {t('common.edit')}
                            </Link>
                            <Button type="button" onClick={() => handleDelete(transaction.id)}
                              className="inline-flex items-center gap-2 bg-zx-negative/10 border border-zx-negative/30 px-3 py-2 text-zx-negative hover:bg-zx-negative/20">
                              <Trash2 className="h-4 w-4" /> {t('common.delete')}
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>

                {/* Totals footer */}
                {filtered.length > 1 && (
                  <tfoot className="border-t-2 border-zx-line bg-zx-bg text-xs font-semibold">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-zx-text-soft uppercase tracking-wide">
                        {t('transactions.total')} ({filtered.length})
                      </td>
                      <td className="px-4 py-3 text-right font-mono space-y-0.5">
                        {totals.income > 0 && <div className="text-zx-positive">+{fmt(totals.income, currency)}</div>}
                        {totals.expense > 0 && <div className="text-zx-accent">−{fmt(totals.expense, currency)}</div>}
                        <div className={`font-bold ${totals.net >= 0 ? 'text-zx-positive' : 'text-zx-accent'}`}>
                          {totals.net >= 0 ? '+' : ''}{fmt(totals.net, currency)}
                        </div>
                      </td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </>
        )}
      </section>

      {/* Pagination */}
      {!selectionMode && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-zx-line text-sm">
          <span className="text-zx-text-soft">
            {t('transactions.page', { page, total: totalPages })}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="rounded-zx-sm border border-zx-line px-3 py-1.5 text-xs text-zx-text-soft transition hover:text-zx-text disabled:opacity-40 disabled:cursor-not-allowed">
              ← {t('transactions.prevPage')}
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              const p = start + i;
              return p <= totalPages ? (
                <button key={p} onClick={() => setPage(p)}
                  className={`rounded-zx-sm px-3 py-1.5 text-xs transition ${p === page ? 'bg-zx-accent text-zx-on-accent font-medium' : 'border border-zx-line text-zx-text-soft hover:text-zx-text'}`}>
                  {p}
                </button>
              ) : null;
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="rounded-zx-sm border border-zx-line px-3 py-1.5 text-xs text-zx-text-soft transition hover:text-zx-text disabled:opacity-40 disabled:cursor-not-allowed">
              {t('transactions.nextPage')} →
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
