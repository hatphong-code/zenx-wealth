export const BUCKET_KEYS = ['emergencyFund', 'longTermAsset', 'businessLearning', 'highRiskTrading'];

const BUCKET_KEYWORDS = {
  emergencyFund: ['quỹ dự phòng', 'dự phòng', 'emergency fund', 'emergency'],
  longTermAsset: [
    'tiết kiệm', 'gửi tiết kiệm', 'sổ tiết kiệm', 'chứng chỉ quỹ', 'trái phiếu',
    'cổ phiếu', 'đầu tư dài hạn', 'quỹ mở', 'etf', 'coast fi', 'fund',
  ],
  businessLearning: ['học tập kinh doanh', 'khoá học', 'khóa học', 'phát triển bản thân', 'kinh doanh', 'học phí kinh doanh'],
  highRiskTrading: ['trading', 'coin', 'crypto', 'forex', 'đầu tư rủi ro', 'lướt sóng'],
};

export function suggestBucket(category = '') {
  const lower = category.toLowerCase();
  for (const bucket of BUCKET_KEYS) {
    if (BUCKET_KEYWORDS[bucket].some((k) => lower.includes(k))) return bucket;
  }
  return null;
}

export const BUCKET_LABELS_VI = {
  emergencyFund: 'Quỹ dự phòng',
  longTermAsset: 'Tích lũy / Đầu tư dài hạn',
  businessLearning: 'Học tập / Kinh doanh',
  highRiskTrading: 'Đầu tư rủi ro cao',
};
