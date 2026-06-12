import { Link } from 'react-router-dom';
import { deleteDoc, doc } from 'firebase/firestore/lite';
import { useAuth } from '../auth/useAuth';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import AppNav from '../components/AppNav';
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
    <div className="min-h-screen bg-[#0B1020] text-white">
      <AppNav />
      <main className="mx-auto max-w-6xl space-y-6 p-4 pb-24 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Transactions</h1>
            <p className="text-sm text-gray-400">Track income, expenses, and Latte Factor flags.</p>
            {loading && <p className="text-sm text-gray-400">Loading transactions...</p>}
            {refreshing && <p className="text-sm text-blue-300">Refreshing transactions...</p>}
          </div>
          <Link
            to="/transactions/new"
            className="inline-flex items-center justify-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Add Transaction
          </Link>
        </div>

        {error && <div className="rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</div>}

        <section className="overflow-hidden rounded-lg border border-[#1F2937] bg-[#111827]">
          {transactions.length === 0 ? (
            <div className="space-y-4 p-6 text-center">
              <p className="text-gray-300">{loading ? 'Loading transactions...' : 'No transactions yet.'}</p>
              {!loading && (
                <Link to="/transactions/new" className="text-sm font-medium text-blue-400 hover:text-blue-300">
                  Add your first transaction
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="divide-y divide-[#1F2937] md:hidden">
                {transactions.map((transaction) => (
                  <article key={transaction.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-400">{formatDate(transaction.date)}</p>
                        <h3 className="font-semibold text-white">{transaction.category}</h3>
                      </div>
                      <p className="text-right font-mono text-base font-semibold">
                        {formatMoney(transaction.amount, transaction.currency || currency)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`rounded-full px-2.5 py-1 ${
                          transaction.type === 'income'
                            ? 'bg-green-950 text-green-300'
                            : 'bg-orange-950 text-orange-300'
                        }`}
                      >
                        {transaction.type}
                      </span>
                      {transaction.isLatteFactor && (
                        <span className="rounded-full bg-red-950 px-2.5 py-1 text-red-300">Latte Factor</span>
                      )}
                      {transaction.isRecurring && (
                        <span className="rounded-full bg-[#0B1020] px-2.5 py-1 text-gray-300">Recurring</span>
                      )}
                    </div>

                    <p className="text-sm text-gray-400">{transaction.note || 'No note'}</p>

                    <div className="flex gap-2">
                      <Link
                        to={`/transactions/${transaction.id}/edit`}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#0B1020] px-3 py-2 text-sm text-blue-300 transition hover:bg-[#1F2937]"
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
                <thead className="bg-[#0B1020] text-xs uppercase tracking-wide text-gray-400">
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
                    <tr key={transaction.id} className="border-t border-[#1F2937]">
                      <td className="px-4 py-3 text-gray-300">{formatDate(transaction.date)}</td>
                      <td className="px-4 py-3 font-medium">{transaction.category}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-1 text-xs ${
                            transaction.type === 'income'
                              ? 'bg-green-950 text-green-300'
                              : 'bg-orange-950 text-orange-300'
                          }`}
                        >
                          {transaction.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {formatMoney(transaction.amount, transaction.currency || currency)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-300">
                        {transaction.isLatteFactor ? 'Latte Factor' : '-'}
                        {transaction.isRecurring ? ' / Recurring' : ''}
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-3 text-gray-400">{transaction.note || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            to={`/transactions/${transaction.id}/edit`}
                            className="inline-flex items-center gap-2 rounded bg-[#0B1020] px-3 py-2 text-blue-300 transition hover:bg-[#1F2937]"
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
    </div>
  );
}


