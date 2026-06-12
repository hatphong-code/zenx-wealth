// ZenX Wealth prototype — data for 3 screens, terminology dictionary, theme tokens.
(function () {
  const fmtVND = (n) => n.toLocaleString('vi-VN') + '\u00A0\u20AB';
  const fmtShort = (n) => {
    const abs = Math.abs(n), sign = n < 0 ? '-' : '';
    if (abs >= 1e9) return sign + (abs / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + '\u00A0tỷ';
    if (abs >= 1e6) return sign + (abs / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + '\u00A0tr';
    if (abs >= 1e3) return sign + Math.round(abs / 1e3) + 'k';
    return sign + abs;
  };

  const data = {
    user: { name: 'Phong' },
    month: 'Tháng 6, 2026',
    phase: { label: 'Giai đoạn 4', name: 'Quỹ dự phòng' },
    cashflow: { net: 12500000, income: 38000000, expense: 25500000 },
    savingsRate: 0.33,
    netWorth: 412000000,
    pyf: { rate: 0.30, saved: 8400000, target: 11400000 },
    cashTrend: [6.5, 4.2, 8.1, 9.4, 7.8, 12.5],

    latte: {
      amount: 6800000, last: 8300000, deltaPct: -0.18,
      yearProjection: 81600000,
      trend: [9.2, 8.8, 8.3, 7.9, 8.3, 6.8],
      categories: [
        { name: 'Cà phê & trà sữa', amount: 2400000, icon: 'coffee' },
        { name: 'Ăn ngoài dư thừa', amount: 1900000, icon: 'food' },
        { name: 'Mua tiện tay', amount: 1100000, icon: 'bag' },
        { name: 'Subscription không dùng', amount: 700000, icon: 'play' },
        { name: 'Phí giao dịch & ship', amount: 700000, icon: 'truck' },
      ],
      tips: [
        { text: 'Huỷ 2 gói subscription không dùng', save: 300000 },
        { text: 'Tự nấu 3 bữa/tuần thay vì ăn ngoài', save: 800000 },
        { text: 'Đặt giới hạn cà phê 4 ly/tuần', save: 400000 },
      ],
    },

    emergency: {
      months: 3.2, target: 6, saved: 96000000, goal: 180000000,
      monthlyEssential: 30000000,
      etaText: 'Th11 2026',
      contributions: [
        { date: '01/06', label: 'Trích từ lương', amount: 5000000 },
        { date: '20/05', label: 'Thưởng dự án', amount: 3000000 },
        { date: '05/05', label: 'Tự trích định kỳ', amount: 5000000 },
        { date: '28/04', label: 'Bán đồ không dùng', amount: 2200000 },
      ],
    },

    focus: [
      { id: 'f1', text: 'Giảm ăn ngoài', amount: 500000, done: false },
      { id: 'f2', text: 'Chuyển vào quỹ dự phòng', amount: 2000000, done: false },
      { id: 'f3', text: 'Huỷ gói app thừa', amount: 120000, done: true },
    ],
  };

  // Terminology: young = simple words, mid = standard financial terms.
  const terms = {
    young: {
      audience: 'Trẻ', greeting: 'Chào Phong',
      nav: { dashboard: 'Trang chính', latte: 'Tiền vặt', emergency: 'Phòng thân', settings: 'Cài đặt' },
      netCashFlow: 'Tiền dư tháng này', income: 'Tiền vào', expense: 'Tiền ra',
      latte: 'Tiền vặt rò rỉ', latteSub: 'Khoản nhỏ mua hằng ngày',
      emergency: 'Quỹ phòng thân', emergencySub: 'Tiền để dành cho lúc khẩn cấp',
      pyf: 'Tự trích trước', pyfSub: 'Để dành trước khi tiêu',
      savingsRate: 'Phần để dành', netWorth: 'Tổng tài sản',
      focus: 'Việc tuần này', coach: 'Hỏi trợ lý',
      latteTitle: 'Tiền vặt đang rò rỉ', emergencyTitle: 'Quỹ phòng thân',
      months: 'tháng sống được', tipsTitle: 'Cách bịt rò rỉ', contribTitle: 'Lần nạp gần đây',
    },
    mid: {
      audience: 'Trung niên', greeting: 'Chào buổi sáng, Phong',
      nav: { dashboard: 'Tổng quan', latte: 'Latte Factor', emergency: 'Quỹ dự phòng', settings: 'Cài đặt' },
      netCashFlow: 'Dòng tiền ròng', income: 'Thu nhập', expense: 'Chi tiêu',
      latte: 'Latte Factor', latteSub: 'Chi nhỏ lặp lại làm rò rỉ dòng tiền',
      emergency: 'Quỹ dự phòng', emergencySub: 'An toàn 6–12 tháng chi phí thiết yếu',
      pyf: 'Trả mình trước', pyfSub: 'Pay Yourself First',
      savingsRate: 'Tỷ lệ tiết kiệm', netWorth: 'Tài sản ròng',
      focus: 'Tiêu điểm tuần', coach: 'Cố vấn tài chính',
      latteTitle: 'Latte Factor', emergencyTitle: 'Quỹ dự phòng',
      months: 'tháng chi phí', tipsTitle: 'Khuyến nghị tái phân bổ', contribTitle: 'Lịch sử nạp quỹ',
    },
  };

  const themes = {
    // Trẻ → Ấm
    young: {
      label: 'Ấm', mode: 'light',
      vars: {
        '--p-bg': '#FBF4EA', '--p-surface': '#FFFFFF', '--p-surface2': '#FCEFE2',
        '--p-ink': '#3A2E26', '--p-soft': '#92806F', '--p-line': '#EFE4D4',
        '--p-accent': '#C8643C', '--p-accent-soft': '#F8E5D9',
        '--p-gold': '#B07D3F', '--p-gold-soft': '#F4E8D2',
        '--p-pos': '#5E7E5A', '--p-pos-soft': '#E7EEE3',
        '--p-radius': '24px', '--p-radius-sm': '16px',
        '--p-shadow': '0 1px 2px rgba(58,46,38,.04), 0 12px 30px rgba(58,46,38,.06)',
        '--p-cardborder': '1px solid #F3EAD9',
        '--p-hero': 'linear-gradient(160deg,#FFFFFF 0%,#FCEFE2 100%)',
        '--p-track': '#EFE4D4', '--p-fill': 'linear-gradient(90deg,#6E8B6A,#8AA886)',
        '--p-iconbg': '#F8E5D9', '--p-navbg': 'rgba(255,255,255,.92)',
        '--p-fnum': "'Bricolage Grotesque', system-ui, sans-serif",
        '--p-fhead': "'Be Vietnam Pro', system-ui, sans-serif",
        '--p-fbody': "'Be Vietnam Pro', system-ui, sans-serif",
        '--p-numweight': '700', '--p-headweight': '700',
      },
    },
    // Trung niên → Tư gia
    mid: {
      label: 'Tư gia', mode: 'dark',
      vars: {
        '--p-bg': 'radial-gradient(120% 90% at 50% -10%, #15273E 0%, #0C1420 62%)',
        '--p-surface': '#101B2B', '--p-surface2': 'rgba(255,255,255,.035)',
        '--p-ink': '#ECE5D6', '--p-soft': '#8A93A1', '--p-line': 'rgba(201,162,75,.22)',
        '--p-accent': '#C9A24B', '--p-accent-soft': 'rgba(201,162,75,.12)',
        '--p-gold': '#C9A24B', '--p-gold-soft': 'rgba(201,162,75,.12)',
        '--p-pos': '#86A98C', '--p-pos-soft': 'rgba(134,169,140,.12)',
        '--p-radius': '16px', '--p-radius-sm': '11px',
        '--p-shadow': '0 1px 0 rgba(255,255,255,.03), 0 20px 50px rgba(0,0,0,.35)',
        '--p-cardborder': '1px solid rgba(201,162,75,.18)',
        '--p-hero': 'linear-gradient(150deg,#15263C 0%,#0E1A2B 100%)',
        '--p-track': 'rgba(255,255,255,.08)', '--p-fill': 'linear-gradient(90deg,#9E7E37,#C9A24B,#E5C879)',
        '--p-iconbg': 'rgba(201,162,75,.12)', '--p-navbg': 'rgba(8,14,22,.86)',
        '--p-fnum': "'Playfair Display', Georgia, serif",
        '--p-fhead': "'Playfair Display', Georgia, serif",
        '--p-fbody': "'Hanken Grotesk', system-ui, sans-serif",
        '--p-numweight': '600', '--p-headweight': '600',
      },
    },
  };

  window.ZXP = { fmtVND, fmtShort, data, terms, themes };
})();
