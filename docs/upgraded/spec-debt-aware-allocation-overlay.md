# Spec: Debt-Aware Allocation Overlay

> Hướng dẫn 1 dòng cho Claude Code: Thêm hàm `applyDebtOverlay(baseAllocation, debtSummary, monthlyIncome)` vào `src/core/services/financialCalculations.js`, dùng nó trong `PlanHub.jsx` (đã có sẵn cả `pyfData.allocationRule` và `useDebtData` trên cùng trang) để hiển thị allocation 6-mục đã điều chỉnh theo nợ, thay cho allocation 5-mục tĩnh hiện tại khi có nợ xấu.

## Bối cảnh
Hệ thống allocation hiện tại (5 template tuổi trong `budgetTemplates.js`, áp dụng qua `payYourselfFirstService.js`) dùng % cố định cho mọi người cùng age bracket, không đổi theo có nợ hay không. Một người đang trả nợ lãi cao vẫn bị rule đẩy % vào `highRiskTrading`/`longTermAsset` như người không nợ — phi lý về tài chính. Nhưng giải pháp KHÔNG phải là chuyển 100% sang trả nợ (waterfall toàn-hoặc-không) — vẫn cần giữ tối thiểu quỹ dự phòng và thói quen đầu tư song song, chỉ là tỷ lệ phải thay đổi.

## Đã verify với code thật (2026-06-27)

- `src/core/services/debtService.js`: mỗi debt record có `interestRate`, `minimumPayment`, `priority`, `isBadDebt`. `summarizeDebts()` trả `{ totalDebt, badDebt, monthlyPayment, payoffProgress, highestPriorityDebt }` — đủ dữ liệu để tính mức độ nặng của nợ, không cần thêm field mới.
- `src/core/data/budgetTemplates.js`: 5 template (`student`, `young_pro`, `family`, `late_starter`, `mid_career`), mỗi template có `allocation: { living, emergencyFund, longTermAsset, businessLearning, highRiskTrading }` — **không có bucket `debtRepayment`**, nợ chỉ xuất hiện như 1 category chi tiêu ("Trả nợ") trong template `late_starter`, không phải 1 % trong allocation.
- `src/core/services/payYourselfFirstService.js`: `defaultAllocationRule` cùng 5 key trên, áp dụng tĩnh, không đọc debt state.
- `src/web/pages/PlanHub.jsx`: **đã load sẵn cả 2 nguồn** — `pyfData.allocationRule` (dòng ~24, 30) và `useDebtData(user?.uid)` → `debtData.summary` (dòng ~151) trên cùng 1 trang. Đây là điểm tích hợp tự nhiên nhất, không cần load thêm gì.

## Yêu cầu

### 1. Hàm overlay (pure function, đặt cạnh `calculateFutureValue` trong `financialCalculations.js`)
```js
export function applyDebtOverlay(baseAllocation, debtSummary, monthlyIncome) {
  // baseAllocation: { living, emergencyFund, longTermAsset, businessLearning, highRiskTrading } (5 key, % cộng = 100)
  // debtSummary: { badDebt, monthlyPayment, highestPriorityDebt } từ debtService
  // monthlyIncome: số, dùng tính debt service ratio

  if (!debtSummary?.badDebt || debtSummary.badDebt <= 0) {
    return { ...baseAllocation, debtRepayment: 0 }; // không có nợ xấu → không đổi, chỉ thêm key cho nhất quán shape
  }

  // 1. Siết businessLearning + highRiskTrading về 0 trước
  // 2. Tính debt service ratio = monthlyPayment / monthlyIncome → chọn mức độ siết (nhẹ/vừa/mạnh)
  // 3. Lấy thêm từ longTermAsset/emergencyFund, KHÔNG dưới sàn tối thiểu của từng mục
  // 4. living giữ nguyên, không đụng
  // 5. debtRepayment = phần đã giải phóng, không vượt quá nhu cầu thực tế (ước lượng từ monthlyPayment)

  return { living, emergencyFund, longTermAsset, businessLearning, highRiskTrading, debtRepayment };
}
```

### 2. Sàn tối thiểu (floor) — KHÔNG được vi phạm dù siết mức nào
- `emergencyFund` floor: đề xuất 5% (mặc định template thường 10-25%)
- `longTermAsset` floor: đề xuất 5%
- `businessLearning`, `highRiskTrading`: có thể về 0, không có floor
- `living`: không đụng trong overlay này

**Claude Code đề xuất số floor cụ thể kèm lý do dựa trên các template hiện có, KHÔNG tự hardcode số cuối — chờ Hà Phong xác nhận trước khi merge.**

### 3. Mức độ siết theo debt service ratio (`monthlyPayment / monthlyIncome`)
| Ratio | Mức siết |
|---|---|
| < 10% | Nhẹ — chỉ lấy từ businessLearning/highRiskTrading |
| 10-25% | Vừa — lấy thêm 1 phần từ longTermAsset đến floor |
| > 25% | Mạnh — lấy thêm từ cả longTermAsset và emergencyFund đến floor |

Claude Code đề xuất % cụ thể lấy ở mỗi mức (ví dụ lấy bao nhiêu % của phần "trên floor"), kèm lý do, chờ xác nhận.

### 4. Tích hợp vào `PlanHub.jsx`
- Khi `debtData.summary.badDebt > 0`: gọi `applyDebtOverlay(pyfData.allocationRule, debtData.summary, pyfData.totalIncome)`, hiển thị allocation đã điều chỉnh thay cho allocation gốc ở phần liên quan đến PYF.
- Hiển thị rõ ràng đây là **điều chỉnh tạm thời do có nợ**, không phải đổi vĩnh viễn template gốc của người dùng — không ghi đè `settings.allocationRule` đã lưu, chỉ tính toán hiển thị tại thời điểm render (giống cách `pyfData`/`debtData` đang được tính hiện tại, không cần lưu thêm document mới).
- Copy giải thích, lấy số thật từ `debtData.summary.highestPriorityDebt.interestRate` nếu có:
  > *"Bạn đang có khoản nợ lãi {interestRate}%/năm. Trả nợ này tương đương một khoản lợi suất chắc chắn {interestRate}%/năm — cao hơn hầu hết lựa chọn đầu tư có rủi ro. Tỷ lệ đã được điều chỉnh để ưu tiên trả nợ, vẫn giữ một phần nhỏ cho quỹ dự phòng và tích lũy dài hạn."*
  Thêm key i18n mới trong `vi.js`/`en.js`, không hardcode trong JSX.

### 5. Cập nhật `budgetTemplates.js` cho nhất quán shape (tối thiểu)
Thêm `debtRepayment: 0` vào `allocation` của cả 5 template hiện có, để shape luôn có 6 key dù áp dụng overlay hay không — tránh `undefined` rải rác trong UI hiển thị allocation (`AllocationBar` trong `BudgetTemplates.jsx`).

## Ngoài phạm vi (để spec sau)
- Tool "khoản tiền một lần" (lump sum allocator) — spec riêng, sẽ tái dùng `applyDebtOverlay` này làm nguồn chung, không làm trong spec này.
- Không sửa `BudgetTemplates.jsx` UI để hiển thị preview overlay khi áp template — chỉ áp dụng hiển thị tại `PlanHub.jsx` ở v1.
- Không tự động ghi `debtRepayment` vào Firestore `settings.allocationRule` — đây là lớp tính toán hiển thị, không phải thay đổi cấu hình lưu trữ.

## Tiêu chí hoàn thành
- [ ] `applyDebtOverlay` là pure function, có unit test cho: không nợ (không đổi), nợ nhẹ/vừa/mạnh, và case floor bị chạm đúng giới hạn (không bao giờ dưới sàn)
- [ ] Tổng 6 % luôn cộng = 100 sau overlay
- [ ] `PlanHub.jsx` hiển thị đúng allocation điều chỉnh khi có nợ xấu, không đổi gì khi không có nợ
- [ ] Floor/ngưỡng siết được đề xuất kèm lý do, chờ xác nhận trước khi hardcode số cuối
- [ ] Copy giải thích dùng số lãi suất thật từ debt data, đầy đủ i18n
