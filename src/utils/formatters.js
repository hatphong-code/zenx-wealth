const currencyLocales = {
  VND: 'vi-VN',
  USD: 'en-US',
};

export function normalizeCurrency(currency) {
  return currency === 'USD' ? 'USD' : 'VND';
}

export function formatMoney(value, currency = 'VND') {
  const normalizedCurrency = normalizeCurrency(currency);
  const amount = Number(value || 0);

  return new Intl.NumberFormat(currencyLocales[normalizedCurrency], {
    style: 'currency',
    currency: normalizedCurrency,
    maximumFractionDigits: normalizedCurrency === 'VND' ? 0 : 2,
  }).format(amount);
}

export function formatNumber(value, options = {}) {
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 2,
    ...options,
  }).format(Number(value || 0));
}

export function formatPercent(value, options = {}) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'percent',
    maximumFractionDigits: 0,
    ...options,
  }).format(Number(value || 0));
}

export function formatDate(value) {
  if (!value?.toDate) return '-';
  return value.toDate().toLocaleDateString('vi-VN');
}
