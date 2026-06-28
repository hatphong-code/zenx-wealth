# Spec: Savings Escalator + Coast FI — Báo cáo kế hoạch đầy đủ
2026-06-28

> Hướng dẫn cho Claude Code: Xây tính năng mới gồm 3 phần — (A) engine tính toán trong `financialCalculations.js`, (B) trang nhập liệu + báo cáo kết quả đầy đủ dạng infographic (dùng `recharts`, đã dùng sẵn trong dự án — KHÔNG dùng Chart.js hay lib khác), (C) hệ thống nhắc nhở dựa trên ngày gửi/đáo hạn, tái dùng `pushNotificationService.js` đã có. Làm theo đúng thứ tự A → B → C.

## Bối cảnh (tóm tắt toàn bộ quá trình thiết kế)

Người dùng muốn 1 công cụ: nhập mức gửi ban đầu + tỷ lệ tăng %/tháng (đúng tăng mỗi tháng so với tháng trước, không phải theo năm) → app tính ra **điểm dừng tăng tự nhiên** dựa trên lý thuyết Coast FI (tích lũy đủ X lần chi phí sinh hoạt hàng năm — mặc định 25x theo quy tắc 4%, cho phép chọn 25-31x) → và hiển thị **1 báo cáo đầy đủ** (giống cấu trúc infographic người dùng đã vẽ tay: thẻ tóm tắt, biểu đồ đường số dư theo năm, bảng số dư/mức gửi theo năm, kết luận) để người dùng thấy rõ kết quả nếu kiên định thực hiện.

Đã xác nhận qua research: cách thực thi ngoài đời (gửi ngân hàng thật) có 2 lựa chọn — ladder 12 sổ riêng (lãi đầy đủ, phức tạp vận hành) hoặc sổ "tích lũy" 1 sổ gộp nhiều lần gửi (đơn giản hơn, nhưng khoản gửi muộn trong kỳ thường chỉ hưởng lãi kỳ hạn ngắn còn lại — thấp hơn). ZenX **không gắn cố định vào 1 cách thực thi nào** (Hướng A) — chỉ minh họa kế hoạch bằng lãi suất hiệu dụng do người dùng nhập, có disclaimer rõ. Phần nhắc nhở (Hướng B) dựa trên ngày gửi/đáo hạn người dùng tự nhập, không phụ thuộc cách họ chọn thực thi.

## Đã verify với code thật (2026-06-27)

- **Chart library**: `recharts` (đã dùng ở `Reports.jsx`, `OnboardingFlow.jsx`, `Dashboard.jsx`) — dùng tiếp, không đổi lib.
- **Decimal pattern**: theo đúng Spec 1 đã làm cho `calculateFutureValue` — áp dụng tương tự cho các hàm mới ở đây.
- **Notification infra đã có**: `pushNotificationService.js` (đăng ký FCM token, xin permission, đã wire qua `usePushNotification.js`), `notificationPrefs` trong `userService.js`/`Settings.jsx` (hiện có `weeklyReview`, `transactionLog`, `milestones`, `monthlyLetter`).
- **Notification infra CHƯA có**: không có Cloud Function dạng lịch trình (scheduled/cron) nào trong `functions/src/` — nghĩa là gửi push đúng ngày đáo hạn cần hạ tầng mới (Cloud Scheduler), không có sẵn để tái dùng trực tiếp. Xem Phần C để chọn phương án phù hợp mức đầu tư hiện tại.

## Phần A — Engine tính toán (`financialCalculations.js`)

```js
// FV khi mức gửi tăng đều %/tháng, lãi nhập hàng tháng — dùng Decimal nội bộ theo Spec 1
export function buildGrowingContributionSeries({ startMonthly, monthlyGrowthPct, annualRatePct, months }) {
  // trả về mảng { month, year, balance, monthlyDeposit } — đủ dữ liệu cho cả chart và bảng
}

// Mục tiêu FI = chi phí sinh hoạt năm × hệ số (mặc định 25, cho phép 25-31)
export function calculateFITarget({ monthlyExpense, multiple = 25 }) {
  return monthlyExpense * 12 * multiple;
}

// Tìm Coast point: tháng sớm nhất mà nếu dừng góp từ đó, số dư vẫn tự lớn đạt FI target vào tháng nghỉ hưu
export function findCoastPoint({ startMonthly, monthlyGrowthPct, annualRatePct, monthsToRetirement, fiTarget }) {
  // lặp qua từng tháng (giới hạn monthsToRetirement, tối đa hợp lý ~600 để tránh vòng lặp vô hạn)
  // tại mỗi tháng m: kiểm tra balance(m) * (1+r)^(monthsToRetirement-m) >= fiTarget
  // trả về tháng/năm tìm được + balance tại đó + balance dự kiến cuối kỳ nếu dừng đúng lúc đó
  // nếu không tìm được trong giới hạn months: trả về null, KHÔNG throw lỗi — UI tự xử lý hiển thị phù hợp
}
```

Tất cả hàm là pure function, có unit test trong `__tests__/calculations.test.js` — so sánh với giá trị đã verify thủ công trong cuộc trao đổi trước (ví dụ: gửi 9tr/tháng, tăng 1%/tháng, lãi 6%/năm hiệu dụng, chi phí 15tr/tháng → FI target 4,5 tỷ, coast point ~tháng 116).

## Phần B — Trang nhập liệu + Báo cáo kết quả đầy đủ

### B1. Input form
- Mức gửi ban đầu/tháng
- Tỷ lệ tăng %/tháng (mặc định 1%, cho phép 0,5-2%)
- Chi phí sinh hoạt/tháng hiện tại
- Hệ số FI (mặc định 25x, cho phép chọn 25-31x — kèm giải thích ngắn sự khác biệt, xem phần copy)
- Tuổi hiện tại + tuổi mục tiêu nghỉ hưu/đạt FI
- Lãi suất kỳ vọng/năm (mặc định 6%, cho phép chỉnh)
- Tái dùng `NumericInput.jsx`, `formatMoney` đã có — không tạo input mới.

### B2. Báo cáo kết quả — đầy đủ như infographic gốc, gồm các khối sau (thứ tự từ trên xuống)

1. **Thẻ tóm tắt** (3-4 thẻ dùng `zx-*` token, giống mẫu metric card): Mục tiêu FI, Coast point (năm/tuổi), Số dư cuối kỳ nếu dừng đúng coast point, Mức gửi tại coast point.
2. **Biểu đồ đường (recharts `LineChart`)**: số dư theo năm, 2 đường — "Tiếp tục góp suốt kỳ" và "Dừng góp sau coast point" (trùng nhau tới coast point, rẽ nhau sau đó) — cộng 1 đường ngang nét đứt "Mục tiêu FI". Style theo đúng pattern chart đã có ở `OnboardingFlow.jsx` (2 `<Line>`, không gradient, đúng token màu).
3. **Bảng số dư + mức gửi theo năm** (markdown-style table trong component, KHÔNG dùng chart cho phần này — theo đúng quy ước hiện có là bảng tách riêng biểu đồ): mỗi năm hiển thị số dư và mức gửi/tháng tại năm đó — giúp người dùng thấy cụ thể số tiền sẽ gửi mỗi giai đoạn, không chỉ đường cong trừu tượng.
4. **Khối kết luận**: 1-2 câu tóm tắt trung lập + disclaimer cố định (xem copy bên dưới).

### B3. Copy (thêm i18n key mới, cả `vi.js`/`en.js`)
- Disclaimer cố định dưới báo cáo: *"Đây là minh họa dựa trên giả định lãi suất và tốc độ tăng tiết kiệm bạn nhập — không phải dự báo chắc chắn. Lãi suất thực tế tùy ngân hàng và cách bạn thực hiện (gửi nhiều sổ riêng hay 1 sổ tích lũy) có thể khác với minh họa này."*
- Giải thích hệ số FI khi người dùng đổi từ 25x: *"Hệ số cao hơn (28-31x) an toàn hơn cho người nghỉ hưu sớm hoặc muốn dự phòng nhiều hơn, dựa trên các nghiên cứu cập nhật gần đây về tỷ lệ rút an toàn."*

## Phần C — Hệ thống nhắc nhở theo ngày gửi/đáo hạn

Người dùng tự nhập: cách thực thi đã chọn (ladder N sổ, hoặc 1 sổ tích lũy), ngày mở mỗi sổ, ngày đáo hạn mỗi sổ, số tiền mỗi sổ. Lưu dưới dạng record đơn giản (không cần engine tính toán mới, chỉ là dữ liệu lịch để nhắc).

**Chọn 1 trong 2 phương án — đề xuất làm Phương án 1 trước, Phương án 2 là mở rộng sau:**

- **Phương án 1 (không cần hạ tầng mới — làm trước)**: kiểm tra read-triggered giống pattern đã dùng ở Spec 7 (Goal Health Check) — mỗi lần người dùng mở app/trang liên quan, kiểm tra có sổ nào sắp đáo hạn trong N ngày tới không (so ngày đáo hạn đã lưu với ngày hiện tại), nếu có thì hiển thị banner/card trong app. Không cần push notification thật, không cần Cloud Function mới.
- **Phương án 2 (cần hạ tầng mới — làm sau nếu cần)**: push notification thật đúng ngày, cần thêm Cloud Scheduler + Cloud Function lịch trình trong `functions/src/` — hiện chưa có gì tương tự để tái dùng, đây là hạ tầng mới hoàn toàn, không làm trong lần này trừ khi Hà Phong xác nhận muốn đầu tư thêm.

Thêm 1 key mới vào `notificationPrefs` (ví dụ `savingsScheduleReminder`), theo đúng pattern 4 key đã có trong `Settings.jsx`/`userService.js`.

## Ngoài phạm vi
- Không tự động hóa việc mở sổ/gửi tiền thật qua API ngân hàng — đây vẫn là minh họa + nhắc nhở, người dùng tự thực hiện ở ngân hàng.
- Không tích hợp với debt overlay (Spec debt-aware allocation) trong lần này — 2 tính năng độc lập, có thể nối sau nếu cần.

## Tiêu chí hoàn thành
- [ ] Phần A: pure function có unit test, dùng Decimal, kết quả khớp số đã verify trong cuộc trao đổi
- [ ] Phần B: báo cáo đầy đủ 4 khối, dùng `recharts` + `zx-*` token, đúng i18n, hiển thị đúng trên mobile
- [ ] Phần C: Phương án 1 hoạt động (banner read-triggered), không yêu cầu hạ tầng mới; Phương án 2 chỉ ghi chú, không triển khai trừ khi được xác nhận riêng
- [ ] Disclaimer xuất hiện đầy đủ, không trình bày kết quả như cam kết chắc chắn
