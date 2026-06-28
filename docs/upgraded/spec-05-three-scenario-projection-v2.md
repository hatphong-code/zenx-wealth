# Spec: 3-Scenario Projection cho Latte Factor (v2 — đã verify code thật)

> Hướng dẫn 1 dòng cho Claude Code: Thêm dải lãi suất thứ 3 (lạc quan) vào `buildLatteProjectionSeries()` trong `financialCalculations.js` và chart tương ứng trong `OnboardingFlow.jsx` (Step 5), KHÔNG đổi 2 field/rate hiện có.

## Đã verify với code thật (2026-06-27)

`src/core/services/financialCalculations.js` dòng ~312:
```js
export function buildLatteProjectionSeries(monthlyAmount, years = 20) {
  return Array.from({ length: years + 1 }, (_, year) => ({
    year,
    savings: calculateFutureValue({ monthlyAmount, annualRatePct: 3, months: year * 12 }),
    invested: calculateFutureValue({ monthlyAmount, annualRatePct: 8, months: year * 12 }),
  }));
}
```

`src/web/pages/OnboardingFlow.jsx` dòng ~440-464: chart `<LineChart>` với 2 `<Line dataKey="savings">` / `<Line dataKey="invested">`, không có `<Legend>`, summary grid 3 cột (năm 1/10/20) hiện chỉ hiển thị giá trị `invested`.

**Quan trọng — đã có sẵn, không cần viết lại**: key i18n `onboarding.latteDisclaimer` = *"Đây là minh hoạ dựa trên giả định lãi suất, không phải cam kết lợi nhuận thực tế."* (`vi.js` dòng 57). Giữ nguyên, không viết copy mới.

## Yêu cầu

1. **Thêm field thứ 3** vào `buildLatteProjectionSeries`, ví dụ `growth: calculateFutureValue({ monthlyAmount, annualRatePct: 11, months: year * 12 })`. Giữ nguyên 2 field `savings`/`invested` y nguyên tên và giá trị mặc định (3%/8%) — không đổi để không phá vỡ test/behavior hiện có.

2. **Thêm `<Line dataKey="growth">`** vào chart, dùng 1 màu mới từ token `zx-*` đang có (kiểm tra `tailwind.config.js` — có `zx-gold`/`zx-positive` chưa dùng cho mục đích này, ưu tiên dùng lại trước khi tạo màu mới).

3. **Thêm `<Legend>`** (component recharts) với 3 nhãn lấy từ i18n — thêm 3 key mới vào cả `vi.js` và `en.js` (ví dụ `latteLegendConservative`, `latteLegendModerate`, `latteLegendGrowth`), không đổi tên field data hiện có.

4. **Cập nhật summary grid**: hiện là `grid-cols-3` cho 3 năm × 1 giá trị (`invested`). Mở rộng để mỗi cột năm hiển thị cả 3 giá trị (ví dụ 3 dòng nhỏ xếp trong mỗi ô) — Claude Code tự đề xuất layout phù hợp với chiều rộng mobile hiện có (`h-48` chart container, grid 3 cột), miễn không vỡ layout trên màn hình nhỏ.

5. **(Tùy chọn, nếu khả thi với recharts LineChart hiện tại)** Tô vùng giữa đường `savings` (bi quan) và `growth` (lạc quan) bằng `<Area>` — nếu cần đổi từ `LineChart` sang `ComposedChart` để làm điều này, Claude Code tự đánh giá có đáng đổi không, không bắt buộc nếu rủi ro breaking cao hơn giá trị mang lại.

## Ngoài phạm vi
- Không đổi UX chọn chip ở Step 5 (`LATTE_ITEMS`, `selectedLatte`)
- Không viết lại `latteDisclaimer` — dùng nguyên bản đã có

## Tiêu chí hoàn thành
- [ ] 2 rate/field mặc định hiện có không đổi (3% `savings`, 8% `invested`)
- [ ] Field `growth` mới + legend hiển thị đúng trên mobile
- [ ] i18n đầy đủ cả `vi.js` và `en.js`, không hardcode text trong JSX
- [ ] Disclaimer giữ nguyên, không viết lại
