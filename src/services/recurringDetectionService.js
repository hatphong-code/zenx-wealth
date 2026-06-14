const DAY_MS = 24 * 60 * 60 * 1000;
const TOLERANCE_DAYS = 3;
const MIN_RECURRENCE_COUNT = 2;

function getMonthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getDayOfMonth(date) {
  return new Date(date).getDate();
}

function isSimilarDay(dayA, dayB, tolerance = TOLERANCE_DAYS) {
  // Handle month-end edge case (28th, 29th, 30th, 31st)
  const isEndOfMonthA = dayA >= 28;
  const isEndOfMonthB = dayB >= 28;
  if (isEndOfMonthA && isEndOfMonthB) return true;
  return Math.abs(dayA - dayB) <= tolerance;
}

export function detectRecurringTransactions(transactions) {
  if (!transactions || transactions.length === 0) return transactions;

  const expensesByCategory = {};

  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;

    const cat = tx.category || 'Other';
    if (!expensesByCategory[cat]) expensesByCategory[cat] = [];
    expensesByCategory[cat].push(tx);
  }

  const recurringTxIds = new Set();

  for (const [category, categoryTxs] of Object.entries(expensesByCategory)) {
    // Sort by date descending (most recent first)
    const sorted = categoryTxs.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Look for recurring patterns in last 12 months
    const last12Months = sorted.filter(tx => {
      const txDate = new Date(tx.date);
      const now = new Date();
      return (now - txDate) < 365 * DAY_MS;
    });

    if (last12Months.length < MIN_RECURRENCE_COUNT) continue;

    // Group by amount (similar amounts)
    const byAmount = {};
    for (const tx of last12Months) {
      const amountKey = Math.round(tx.amount / 100) * 100; // Round to nearest 100
      if (!byAmount[amountKey]) byAmount[amountKey] = [];
      byAmount[amountKey].push(tx);
    }

    for (const [amountGroup, amountTxs] of Object.entries(byAmount)) {
      if (amountTxs.length < MIN_RECURRENCE_COUNT) continue;

      // Group by day-of-month (similar calendar days)
      const byDay = {};
      for (const tx of amountTxs) {
        const day = getDayOfMonth(tx.date);
        let found = false;
        for (const existingDay of Object.keys(byDay)) {
          if (isSimilarDay(parseInt(existingDay), day)) {
            byDay[existingDay].push(tx);
            found = true;
            break;
          }
        }
        if (!found) byDay[day] = [tx];
      }

      for (const [dayKey, dayTxs] of Object.entries(byDay)) {
        if (dayTxs.length >= MIN_RECURRENCE_COUNT) {
          dayTxs.forEach(tx => recurringTxIds.add(tx.id));
        }
      }
    }
  }

  // Mark transactions as recurring
  return transactions.map(tx => ({
    ...tx,
    isRecurring: recurringTxIds.has(tx.id),
  }));
}

export function flagRecurringTransaction(transaction) {
  return { ...transaction, isRecurring: true };
}
