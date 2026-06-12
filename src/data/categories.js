import vi from '../i18n/dictionaries/vi';

const localeCategories = {
  vi: vi.categories,
  en: {
    income: ['Salary', 'Bonus', 'Business', 'Freelance', 'Commission', 'Investment', 'Other'],
    expense: [
      'Housing',
      'Food',
      'Coffee / Drinks',
      'Transport',
      'Family',
      'Health',
      'Children',
      'Learning',
      'Tools',
      'Subscriptions',
      'Online shopping',
      'Debt payment',
      'Gifting / events',
      'Business cost',
      'Other',
    ],
  },
};

export function getDefaultTransactionCategories(locale = 'vi') {
  return localeCategories[locale] || localeCategories.vi;
}

export const defaultIncomeCategories = getDefaultTransactionCategories('vi').income;
export const defaultExpenseCategories = getDefaultTransactionCategories('vi').expense;

export function mergeTransactionCategories(customCategories = {}, locale = 'vi') {
  const defaults = getDefaultTransactionCategories(locale);
  return {
    income: [...new Set([...defaults.income, ...(customCategories.income || [])])],
    expense: [...new Set([...defaults.expense, ...(customCategories.expense || [])])],
  };
}
