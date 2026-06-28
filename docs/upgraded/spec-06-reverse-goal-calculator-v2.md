# Spec: Reverse Goal Calculator cho mục tiêu dài hạn (v2 — đã verify code thật)

> Hướng dẫn 1 dòng cho Claude Code: Thêm hàm tính ngược PMT (mục tiêu tài sản → mức tiết kiệm/tháng cần thiết) vào `financialCalculations.js`, dùng Decimal theo Spec 1, KHÔNG sửa `goalTrackingService.js` (đó là tính năng khác cho mục tiêu 12 tháng).

## Đã verify với code thật (2026-06-27) — quan trọng, dễ nhầm

`src/core/services/goalTrackingService.js` đã có `calculateGoalProgress()` — tính ngược kiểu **đơn giản, không lãi suất** cho mục tiêu 12 tháng (`profile.goal12Month`, parse bằng `parseGoalAmount`/`parseViNum`): chia đều `totalNeeded / weeksRemaining` ra `weeklyTargetSavings`, có cờ `isOnTrack`.

**Đây spec MỚI, khác hoàn toàn**: dành cho mục tiêu **dài hạn nhiều năm có lãi suất kỳ vọng** (kiểu compound, cùng họ với `calculateFutureValue`/`buildLatteProjectionSeries`) — không phải mục tiêu 12 tháng ngắn hạn. Hai tính năng này phục vụ 2 câu hỏi khác nhau của người dùng:
- 12 tháng (đã có): "Tôi cần tiết kiệm bao nhiêu/tuần để đạt mục tiêu cuối năm?" — không cần lãi suất vì khung thời gian ngắn.
- Dài hạn (spec này, chưa có): "Tôi muốn có Z tài sản ở tuổi 60, cần góp bao nhiêu/tháng, có tính lãi gộp?"

Claude Code: **không** sửa, không gọi, không tái dùng logic của `calculateGoalProgress`/`parseGoalAmount` cho spec này.

## Yêu cầu

1. **Vị trí code**: thêm hàm mới trong `financialCalculations.js`, đặt cạnh `calculateFutureValue`/`buildLatteProjectionSeries` (cùng họ logic, cùng convention `r = annualRatePct/100/12`):
```js
export function calculateRequiredMonthlySaving({ futureValueGoal, presentValue = 0, annualRatePct, months }) {
  // Giải ngược: PMT = (FV - PV(1+r)^n) / [((1+r)^n - 1)/r]
  // Dùng Decimal nội bộ, trả Number ở bước cuối — theo pattern Spec 1
}
```

2. **Input/Output**:
   - Input: mục tiêu tài sản (VND), số dư hiện có (mặc định 0), số năm còn lại (hoặc tuổi hiện tại + tuổi mục tiêu — UI tự trừ ra số năm), mức lãi suất (tái dùng 3 mức từ Spec 5 nếu đã triển khai, hoặc 1 mức mặc định 8% nếu chưa).
   - Output: số tiền cần góp/tháng. Xử lý case đặc biệt rõ ràng, không trả số âm/NaN mà không giải thích:
     - Nếu số dư hiện có (tính lãi) đã vượt mục tiêu → trả `{ requiredMonthlySaving: 0, alreadyMet: true }`
     - Nếu `months <= 0` hoặc input không hợp lệ → trả `null`, để UI tự xử lý copy phù hợp

3. **UI**: Claude Code tự xác định vị trí phù hợp nhất trong cấu trúc hiện có — ứng viên hợp lý: trong `PlanHub.jsx` (đã có liên kết tới Wealth Roadmap/emergency fund) như 1 card/toggle riêng, hoặc route mới nếu PlanHub đã quá tải. Tái dùng `NumericInput.jsx` (đã có `inputMode="decimal"`) và `formatMoney` hiện có — không tạo input/format mới.

4. **Copy**: trung lập, không phán xét, theo đúng nguyên tắc đã thống nhất (tránh shame-based framing). Ví dụ cho case "mức cần góp cao": không nói "bạn cần cố gắng hơn", chỉ trình bày số liệu và gợi ý 2 lựa chọn (kéo dài thời gian / giảm mục tiêu).

## Tiêu chí hoàn thành
- [ ] Hàm tính ngược cho kết quả round-trip đúng với `calculateFutureValue` (nhập PMT ra FV bằng hàm thuận, đưa FV đó vào hàm ngược phải ra lại đúng PMT ban đầu, sai số trong ngưỡng Decimal)
- [ ] Không đụng vào `goalTrackingService.js`/`calculateGoalProgress`
- [ ] Xử lý đủ case biên (đã đạt mục tiêu, input không hợp lệ) không crash, không hiển thị số vô lý
