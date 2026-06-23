export const roadmapPhases = [
  {
    id: 'phase-0-reset',
    title: 'Giai đoạn 0 — Xác lập nền',
    description: 'Thiết lập dữ liệu đầu vào để hệ thống có số liệu đáng tin cậy.',
    checklist: [
      { key: 'assets_recorded', label: 'Đã nhập tài sản hiện có' },
      { key: 'debts_recorded', label: 'Đã nhập các khoản nợ' },
      { key: 'essential_expenses_recorded', label: 'Đã nhập chi phí sống thiết yếu / tháng' },
      { key: 'income_recorded', label: 'Đã nhập thu nhập' },
      { key: 'goal_12m_defined', label: 'Đã đặt mục tiêu 12 tháng' },
    ],
  },
  {
    id: 'phase-1-audit',
    title: 'Giai đoạn 1 — Quan sát',
    description: 'Xây dựng tầm nhìn rõ ràng qua kỷ luật ghi chép và phát hiện rò rỉ (Latte Factor).',
    checklist: [
      { key: 'transactions_30d', label: 'Đã ghi chép 30 ngày chi tiêu' },
      { key: 'latte_identified', label: 'Đã xác định Latte Factor' },
      { key: 'savings_rate_known', label: 'Biết tỷ lệ tiết kiệm tháng này' },
      { key: 'cash_flow_known', label: 'Biết dòng tiền ròng tháng này' },
    ],
  },
  {
    id: 'phase-2-stabilize',
    title: 'Giai đoạn 2 — Ổn định',
    description: 'Ngăn thiệt hại mới, đưa hệ thống về trạng thái kiểm soát.',
    checklist: [
      { key: 'positive_cash_flow', label: 'Dòng tiền ròng dương' },
      { key: 'no_new_bad_debt', label: 'Không phát sinh nợ xấu mới' },
      { key: 'accounts_separated', label: 'Đã tách tài khoản tiền rõ ràng' },
      { key: 'emergency_1m', label: 'Quỹ dự phòng đạt 1 tháng' },
    ],
  },
  {
    id: 'phase-3-build-base',
    title: 'Giai đoạn 3 — Xây nền',
    description: 'Chuyển kỷ luật thành tích lũy tài sản bền vững.',
    checklist: [
      { key: 'emergency_3m', label: 'Quỹ dự phòng đạt 3 tháng' },
      { key: 'auto_investing_started', label: 'Đã bắt đầu đầu tư tự động / định kỳ' },
      { key: 'first_side_income', label: 'Có nguồn thu nhập phụ đầu tiên' },
    ],
  },
  {
    id: 'phase-4-accelerate',
    title: 'Giai đoạn 4 — Tăng tốc',
    description: 'Tăng khả năng chịu đựng và mở rộng năng lực tạo thu nhập.',
    checklist: [
      { key: 'emergency_6m', label: 'Quỹ dự phòng đạt 6 tháng' },
      { key: 'savings_rate_30', label: 'Tỷ lệ tiết kiệm đạt 30%+' },
      { key: 'two_income_sources', label: 'Có ít nhất 2 nguồn thu nhập' },
    ],
  },
  {
    id: 'phase-5-expand',
    title: 'Giai đoạn 5 — Mở rộng',
    description: 'Xây dựng quy mô vượt ra ngoài giai đoạn ổn định, hướng đến tự do tài chính.',
    checklist: [
      { key: 'emergency_12m', label: 'Quỹ dự phòng đạt 12 tháng' },
      { key: 'long_term_assets', label: 'Tài sản đầu tư dài hạn đang hoạt động' },
      { key: 'three_income_sources', label: 'Có ít nhất 3 nguồn thu nhập' },
    ],
  },
];
