export const SUBSCRIPTION_TIERS = ['free', 'premium'];

export const ADMIN_EMAILS = ['hatphong@gmail.com'];

export const featureCatalog = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    description: 'Trang tổng quan dòng tiền, quỹ an toàn và tiến độ tháng này.',
    group: 'core',
    route: '/',
    defaultAccess: { free: true, premium: true },
  },
  {
    key: 'transactions',
    label: 'Transactions',
    description: 'Ghi và xem toàn bộ giao dịch.',
    group: 'core',
    route: '/transactions',
    defaultAccess: { free: true, premium: true },
  },
  {
    key: 'add_transaction',
    label: 'Add Transaction',
    description: 'Nhập giao dịch mới.',
    group: 'core',
    route: '/transactions/new',
    defaultAccess: { free: true, premium: true },
  },
  {
    key: 'latte_factor',
    label: 'Latte Factor',
    description: 'Theo dõi chi tiêu rò rỉ và khoản chi lặp nhỏ.',
    group: 'core',
    route: '/latte',
    defaultAccess: { free: true, premium: true },
  },
  {
    key: 'emergency_fund',
    label: 'Emergency Fund',
    description: 'Quỹ dự phòng và số tháng an toàn.',
    group: 'core',
    route: '/emergency',
    defaultAccess: { free: true, premium: true },
  },
  {
    key: 'weekly_review',
    label: 'Weekly Review',
    description: 'Review tài chính tuần và hành động tuần tới.',
    group: 'core',
    route: '/weekly-review',
    defaultAccess: { free: true, premium: true },
  },
  {
    key: 'debt_control',
    label: 'Debt Control',
    description: 'Kiểm soát nợ và theo dõi áp lực trả nợ.',
    group: 'core',
    route: '/debts',
    defaultAccess: { free: true, premium: true },
  },
  {
    key: 'income_builder',
    label: 'Income Builder',
    description: 'Theo dõi nguồn thu và khoảng cách tăng thu nhập.',
    group: 'core',
    route: '/income',
    defaultAccess: { free: true, premium: true },
  },
  {
    key: 'roadmap',
    label: 'Roadmap',
    description: 'Lộ trình tài chính và checklist tiến độ.',
    group: 'core',
    route: '/roadmap',
    defaultAccess: { free: true, premium: true },
  },
  {
    key: 'profile',
    label: 'Profile',
    description: 'Thông tin cá nhân và cấu hình tài chính cơ bản.',
    group: 'core',
    route: '/profile',
    defaultAccess: { free: true, premium: true },
  },
  {
    key: 'pay_yourself_first',
    label: 'Pay Yourself First',
    description: 'Phân bổ dòng tiền theo bucket tích lũy.',
    group: 'premium',
    route: '/pay-yourself-first',
    defaultAccess: { free: false, premium: true },
  },
  {
    key: 'assets',
    label: 'Assets',
    description: 'Theo dõi tài sản và cấu trúc tích sản.',
    group: 'premium',
    route: '/assets',
    defaultAccess: { free: false, premium: true },
  },
  {
    key: 'trading_risk',
    label: 'Trading Risk',
    description: 'Quản trị rủi ro giao dịch và nhật ký P&L.',
    group: 'premium',
    route: '/trading-risk',
    defaultAccess: { free: false, premium: true },
  },
  {
    key: 'reports',
    label: 'Reports',
    description: 'Báo cáo sâu, trend và monthly close.',
    group: 'premium',
    route: '/reports',
    defaultAccess: { free: false, premium: true },
  },
  {
    key: 'ai_coach',
    label: 'AI Coach',
    description: 'Gợi ý hành động và coaching ưu tiên.',
    group: 'premium',
    route: '/ai-coach',
    defaultAccess: { free: false, premium: true },
  },
  {
    key: 'settings',
    label: 'Settings',
    description: 'Mục tiêu 12 tháng, category tùy chỉnh và allocation rule.',
    group: 'premium',
    route: '/settings',
    defaultAccess: { free: false, premium: true },
  },
  {
    key: 'budget_templates',
    label: 'Budget Templates',
    description: 'Mẫu ngân sách theo giai đoạn cuộc sống.',
    group: 'premium',
    route: '/budget-templates',
    defaultAccess: { free: false, premium: true },
  },
  {
    key: 'import_transactions',
    label: 'Import Transactions',
    description: 'Nhập giao dịch hàng loạt từ file CSV.',
    group: 'premium',
    route: '/import',
    defaultAccess: { free: false, premium: true },
  },
  {
    key: 'health_score',
    label: 'Health Score',
    description: 'Điểm sức khỏe tài chính tổng hợp.',
    group: 'premium',
    route: '/health-score',
    defaultAccess: { free: false, premium: true },
  },
  {
    key: 'admin_access',
    label: 'Bảng điều hành',
    description: 'Bật/tắt tính năng theo Free/Premium và test tier.',
    group: 'admin',
    route: '/admin/access',
    defaultAccess: { free: false, premium: false },
    adminOnly: true,
  },
];

export const featureCatalogByKey = Object.fromEntries(
  featureCatalog.map((feature) => [feature.key, feature])
);

export const defaultFeatureAccess = Object.fromEntries(
  featureCatalog.map((feature) => [feature.key, feature.defaultAccess])
);

export const featureGroups = [
  { key: 'core', label: 'Core / Free-first' },
  { key: 'premium', label: 'Premium' },
  { key: 'admin', label: 'Admin' },
];

export function isAdminEmail(email = '') {
  return ADMIN_EMAILS.includes((email || '').trim().toLowerCase());
}
