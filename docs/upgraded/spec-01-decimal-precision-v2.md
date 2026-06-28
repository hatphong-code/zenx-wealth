# Spec: Decimal Precision cho calculateFutureValue (v2 — đã verify code thật)

> Hướng dẫn 1 dòng cho Claude Code: Refactor `calculateFutureValue()` trong `src/core/services/financialCalculations.js` dùng `decimal.js` nội bộ, giữ nguyên signature/behavior, thêm unit test vào `src/core/services/__tests__/calculations.test.js`.

## Đã verify với code thật (2026-06-27)
Hàm hiện tại:
```js
// src/core/services/financialCalculations.js, dòng ~305
export function calculateFutureValue({ monthlyAmount, annualRatePct, months }) {
  const r = (annualRatePct / 100) / 12;
  if (!monthlyAmount || months <= 0) return 0;
  if (r === 0) return monthlyAmount * months;
  return monthlyAmount * (((1 + r) ** months - 1) / r);
}
```
Được gọi bởi `buildLatteProjectionSeries()` — tính 1 lần cho mỗi điểm năm (closed-form), KHÔNG phải loop lặp dồn tích sai số. Với `r ≈ 0.0067`, `months ≤ 240`, sai số float ở mức này nhỏ hơn 1 đồng rất nhiều bậc — **không phải lỗi cấp bách**, đây là việc làm trước để chuẩn hóa pattern, phục vụ các phép tính tương lai (reverse calculator ở Spec 6, và bất kỳ tính năng quỹ đầu tư sau này có quy mô số lớn hơn).

## Yêu cầu

1. Thêm `decimal.js` vào `package.json` (`npm install decimal.js`).
2. Refactor `calculateFutureValue` để tính nội bộ bằng `Decimal`, convert về `Number` duy nhất ở `return` cuối cùng. Giữ nguyên tên hàm, tham số, kiểu trả về — không phá vỡ `buildLatteProjectionSeries` hay bất kỳ nơi gọi khác.
3. Thêm test vào file đã có (`describe('financialCalculations')`), so sánh kết quả bản cũ (Number) vs bản mới (Decimal) với input thực tế (ví dụ `monthlyAmount: 900000, annualRatePct: 8, months: 240`) — log rõ % lệch trong comment test để người đọc sau hiểu vì sao việc này tồn tại dù tác động số liệu rất nhỏ.
4. Áp dụng cùng pattern Decimal cho công thức PMT ngược ở Spec 6 (reverse goal calculator) ngay từ đầu — không viết 2 chuẩn tính khác nhau trong cùng file.

## Ngoài phạm vi
- Không động vào `parseGoalAmount`/`parseViNum` trong `goalTrackingService.js` — đó là phép chia đơn giản không lãi suất, không có rủi ro tích lũy sai số.
- Không cần Decimal cho `roadmapCalculations.js` hay `dashboardService.js` — không có phép tính lãi gộp ở đó.

## Tiêu chí hoàn thành
- [ ] `calculateFutureValue` dùng Decimal nội bộ, output giống bản cũ trong phạm vi sai số đã log
- [ ] Test pass, có comment giải thích % lệch thực tế đo được
- [ ] `buildLatteProjectionSeries` và UI Onboarding (`OnboardingFlow.jsx`) không cần sửa gì — vẫn nhận đúng output như cũ
