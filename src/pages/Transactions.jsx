import { Link } from 'react-router-dom';
import { deleteDoc, doc } from 'firebase/firestore/lite';
import { useAuth } from '../auth/useAuth';
import { Pencil, Plus, Trash2 } from 'lucide-react';
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

export default function Transactions() {
  const { user } = useAuth();
  const { data, setData, loading, refreshing, error, setError } = useTransactionsData(user?.uid);
  const { transactions, currency } = data;

  const handleDelete = async (transactionId) => {
    if (!user) return;
    const shouldDelete = window.confirm('Delete this transaction?');
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
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="font-zx-head text-2xl font-bold text-zx-text">Transactions</h1>
            <p className="text-sm text-zx-text-soft">Track income, expenses, and Latte Factor flags.</p>
            {loading && <p className="text-sm text-zx-text-soft">Loading transactions...</p>}
            {refreshing && <p className="text-sm text-zx-accent">Refreshing transactions...</p>}
          </div>
          <Link
            to="/transactions/new"
            className="inline-flex items-center justify-center gap-2 rounded bg-zx-accent px-4 py-2 text-sm font-medium text-zx-text transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Add Transaction
          </Link>
        </div>

        {error && <div className="rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</div>}

        <section className="overflow-hidden">
          {transactions.length === 0 ? (
            <div className="space-y-4 p-6 text-center">
              <p className="text-zx-text-soft">{loading ? 'Loading transactions...' : 'No transactions yet.'}</p>
              {!loading && (
                <Link to="/transactions/new" className="text-sm font-medium text-zx-accent hover:text-zx-accent">
                  Add your first transaction
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="divide-y divide-zx-line md:hidden">
                {transactions.map((transaction) => (
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
                        <span className="rounded-full bg-zx-surface-2 px-2.5 py-1 text-zx-text-soft">↻ Monthly</span>
                      )}
                    </div>

                    <p className="text-sm text-zx-text-soft">{transaction.note || 'No note'}</p>

                    <div className="flex gap-2">
                      <Link
                        to={`/transactions/${transaction.id}/edit`}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-zx-bg px-3 py-2 text-sm text-zx-accent transition hover:bg-zx-surface-2"
                      >
                        <Pencil className="h-4 w-4" /> Edit
                      </Link>
                      <Button
                        type="button"
                        onClick={() => handleDelete(transaction.id)}
                        className="flex-1 bg-red-950 px-3 py-2 text-red-300 hover:bg-red-900"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </Button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="bg-zx-bg text-xs uppercase tracking-wide text-zx-text-soft">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Flags</th>
                    <th className="px-4 py-3">Note</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
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
                          <span className="rounded text-[10px] bg-zx-surface-2 text-zx-text-soft px-2 py-0.5">Monthly</span>
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
                            <Pencil className="h-4 w-4" /> Edit
                          </Link>
                          <Button
                            type="button"
                            onClick={() => handleDelete(transaction.id)}
                            className="inline-flex items-center gap-2 bg-red-950 px-3 py-2 text-red-300 hover:bg-red-900"
                          >
                            <Trash2 className="h-4 w-4" /> Delete
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


