import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

function buildPrompt(reports, roadmap, profile, locale = 'vi') {
  const isVi = locale === 'vi';
  const currency = reports.currency || 'VND';
  const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0)) + (currency === 'VND' ? '₫' : '$');
  const pct = (n) => `${Math.round((n || 0) * 100)}%`;

  const currentPhase = roadmap?.phases?.find(p => p.id === roadmap?.currentPhaseId);
  const goal = profile?.goal12Month || (isVi ? 'chưa đặt mục tiêu cụ thể' : 'no specific goal set');

  return isVi
    ? `Bạn là trợ lý tài chính cá nhân của ZenX Wealth. Người dùng đang ở giai đoạn: ${currentPhase?.title || 'Không xác định'}.

DỮ LIỆU TÀI CHÍNH THÁNG NÀY:
- Dòng tiền ròng: ${fmt(reports.monthly?.netCashFlow)}
- Chi tiêu rò rỉ (Latte Factor): ${fmt(reports.monthly?.latteFactor)}
- Quỹ dự phòng: ${reports.monthly?.emergencyMonths?.toFixed(1)} tháng
- Tỷ lệ tiết kiệm trung bình: ${pct(reports.monthlyClose?.averageSavingsRate)}
- Tháng dương trong 6 tháng gần nhất: ${reports.monthlyClose?.positiveMonths}/6
- Tài sản ròng ước tính: ${fmt(reports.balanceSheet?.netWorth)}
- Tổng tài sản: ${fmt(reports.balanceSheet?.totalAssets)}
- Tổng nợ: ${fmt(reports.balanceSheet?.totalDebt)}

MỤC TIÊU 12 THÁNG CỦA NGƯỜI DÙNG: ${goal}

Hãy viết một phân tích tài chính cá nhân hóa ngắn gọn (150-200 chữ) với:
1. Nhận xét thực trạng tài chính hiện tại (1-2 câu, thẳng thắn)
2. Điểm mạnh cần duy trì (1-2 điểm)
3. Hành động ưu tiên cao nhất ngay tháng này (1 hành động cụ thể, kèm con số)
4. Lời nhắc ngắn liên quan đến mục tiêu 12 tháng

Giọng văn: trực tiếp, không vòng vo, như một chuyên gia tài chính thực sự đang ngồi cùng người dùng.`
    : `You are a personal finance coach for ZenX Wealth. The user is at phase: ${currentPhase?.title || 'Unknown'}.

FINANCIAL SNAPSHOT:
- Monthly net cash flow: ${fmt(reports.monthly?.netCashFlow)}
- Latte factor (leakage): ${fmt(reports.monthly?.latteFactor)}
- Emergency fund: ${reports.monthly?.emergencyMonths?.toFixed(1)} months
- Average savings rate: ${pct(reports.monthlyClose?.averageSavingsRate)}
- Positive months (last 6): ${reports.monthlyClose?.positiveMonths}/6
- Estimated net worth: ${fmt(reports.balanceSheet?.netWorth)}

USER'S 12-MONTH GOAL: ${goal}

Write a personalized financial analysis (150-200 words) with:
1. Current state assessment (1-2 sentences, honest)
2. Strengths to maintain (1-2 points)
3. Top priority action this month (1 specific action with numbers)
4. Short reminder related to the 12-month goal

Tone: direct, no fluff, like a real financial advisor sitting with the user.`;
}

export const generateAIInsights = onCall(
  {
    region: 'asia-southeast1',
    secrets: ['ANTHROPIC_API_KEY'],
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated.');
    }

    const { reports, roadmap, profile } = request.data;
    const locale = profile?.settings?.locale || 'vi';

    try {
      const prompt = buildPrompt(reports, roadmap, profile, locale);
      const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = message.content.find(b => b.type === 'text')?.text || '';
      logger.info('LLM insights generated', { userId: request.auth.uid, tokens: message.usage });

      return { text, model: message.model };
    } catch (err) {
      logger.error('LLM insights failed', { error: err.message });
      throw new HttpsError('internal', 'Failed to generate insights.');
    }
  }
);
