// Shared Vietnamese sample data + helpers for all four ZenX Wealth dashboard directions.
// Plain JS — loaded before the JSX direction modules.
(function () {
  const fmtVND = (n) => n.toLocaleString('vi-VN') + '\u00A0\u20AB';
  // compact: 12,5tr / 412tr / 1,2 tỷ
  const fmtShort = (n) => {
    const abs = Math.abs(n);
    const sign = n < 0 ? '-' : '';
    if (abs >= 1e9) return sign + (abs / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' tỷ';
    if (abs >= 1e6) return sign + (abs / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' tr';
    if (abs >= 1e3) return sign + Math.round(abs / 1e3) + 'k';
    return sign + abs;
  };

  window.ZX = {
    fmtVND,
    fmtShort,
    user: { name: 'Phong', greeting: 'Chào buổi sáng' },
    phase: { index: 4, label: 'Giai đoạn 4', name: 'Quỹ dự phòng' },
    month: 'Tháng 6, 2026',
    // Hero — net cash flow
    cashflow: { net: 12500000, income: 38000000, expense: 25500000 },
    savingsRate: 0.33,
    netWorth: 412000000,
    // Stat cards
    latte: { amount: 6800000, deltaPct: -0.18, topCategory: 'Cà phê & ăn ngoài' },
    emergency: { months: 3.2, target: 6, saved: 96000000, goal: 180000000 },
    pyf: { rate: 0.30, saved: 8400000, target: 11400000 },
    // Roadmap mini
    roadmap: [
      { name: 'Audit dòng tiền', done: true },
      { name: 'Cắt rò rỉ', done: true },
      { name: 'Tách 5 tài khoản', done: true },
      { name: 'Quỹ dự phòng 6 tháng', done: false, active: true },
      { name: 'Tăng thu nhập', done: false },
    ],
    // This-week focus
    focus: [
      { text: 'Giảm ăn ngoài', amount: 500000 },
      { text: 'Chuyển vào quỹ dự phòng', amount: 2000000 },
    ],
    // 6-month net cash flow trend (millions) for sparklines
    trend: [6.5, 4.2, 8.1, 9.4, 7.8, 12.5],
  };
})();
