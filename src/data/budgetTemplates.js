export const budgetTemplates = [
  {
    id: 'student',
    phase: 0,
    savingsRateTarget: 0.2,
    emergencyTargetMonths: 3,
    allocation: { living: 70, emergencyFund: 20, longTermAsset: 5, businessLearning: 5, highRiskTrading: 0 },
    categories: {
      income: ['Lương', 'Làm thêm', 'Học bổng', 'Trợ cấp', 'Khác'],
      expense: ['Nhà ở', 'Ăn uống', 'Di chuyển', 'Học tập', 'Sức khỏe', 'Thuê bao', 'Cà phê / Trà sữa', 'Khác'],
    },
  },
  {
    id: 'young_pro',
    phase: 2,
    savingsRateTarget: 0.3,
    emergencyTargetMonths: 6,
    allocation: { living: 55, emergencyFund: 15, longTermAsset: 20, businessLearning: 7, highRiskTrading: 3 },
    categories: {
      income: ['Lương', 'Freelance', 'Đầu tư', 'Hoa hồng', 'Bonus'],
      expense: ['Nhà ở', 'Ăn uống', 'Di chuyển', 'Học tập', 'Sức khỏe', 'Cà phê / Trà sữa', 'Mua sắm online', 'Thuê bao', 'Khác'],
    },
  },
  {
    id: 'family',
    phase: 3,
    savingsRateTarget: 0.25,
    emergencyTargetMonths: 6,
    allocation: { living: 60, emergencyFund: 10, longTermAsset: 20, businessLearning: 5, highRiskTrading: 5 },
    categories: {
      income: ['Lương', 'Kinh doanh', 'Đầu tư', 'Bonus', 'Hoa hồng'],
      expense: ['Nhà ở', 'Ăn uống', 'Di chuyển', 'Con cái', 'Sức khỏe', 'Gia đình', 'Học tập', 'Biếu / Hỷ', 'Thuê bao', 'Khác'],
    },
  },
  {
    id: 'late_starter',
    phase: 1,
    savingsRateTarget: 0.35,
    emergencyTargetMonths: 6,
    allocation: { living: 50, emergencyFund: 25, longTermAsset: 15, businessLearning: 10, highRiskTrading: 0 },
    categories: {
      income: ['Lương', 'Kinh doanh', 'Freelance', 'Thưởng', 'Khác'],
      expense: ['Nhà ở', 'Ăn uống', 'Di chuyển', 'Sức khỏe', 'Trả nợ', 'Học tập', 'Gia đình', 'Công cụ', 'Khác'],
    },
  },
];

export function getBudgetTemplateById(id) {
  return budgetTemplates.find((t) => t.id === id) || null;
}
