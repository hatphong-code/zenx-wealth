# Spec: Ngày sinh (DOB) — nguồn tuổi chính xác cho Profile & Savings Escalator

> Hướng dẫn cho Claude Code: Thêm field `dateOfBirth` (tùy chọn) vào `Profile.jsx`/`userService.js`, suy ra `ageRange` tự động khi có DOB, và sửa `SavingsEscalator.jsx` để tự điền tuổi từ profile thay vì mặc định cứng `30`.

## Đã verify với code thật (2026-06-28)

- `src/core/data/latteOnboarding.js`: `AGE_BRACKETS = ['<22', '22-29', '30-44', '45+']`, map sang template qua `AGE_RANGE_TO_TEMPLATE`.
- `src/web/pages/Profile.jsx` dòng ~287-304: chọn `ageRange` qua nút bấm 4 mốc trên, lưu vào `settings.ageRange`. Không có field ngày sinh.
- `src/web/pages/SavingsEscalator.jsx` dòng 304: `currentAge: 30` (mặc định cứng), dòng 418-425: input số độc lập, không đọc từ profile.
- `react-day-picker` đã có trong dependencies, đã dùng qua `src/web/components/ui/DateRangePicker.jsx` — tái dùng pattern này cho 1 component chọn ngày đơn (single date), không cần thêm lib mới.
- `billingService.js`: tier gói trả phí là `subscriptionTier === 'premium'` (so với `'free'`) — dùng đúng tên field này nếu làm tới Phase 2 (sinh nhật + ưu đãi Premium).

## Phần 1 — Thêm `dateOfBirth` (làm trước)

1. `userService.js`: thêm `dateOfBirth: null` vào default settings.
2. `Profile.jsx`: thêm 1 input ngày sinh (component mới `DatePicker.jsx` đơn giản hóa từ `DateRangePicker.jsx` cho 1 ngày, hoặc input native `type="date"` nếu muốn đơn giản hơn — Claude Code chọn theo mức ưu tiên đơn giản vs đồng bộ UI). Đặt **tùy chọn, không bắt buộc** (`required` không set), kèm 1 dòng khuyến khích: *"Nhập đúng ngày sinh giúp ZenX tính lãi kép chính xác hơn — chỉ sớm 1 năm cũng đáng kể."* (thêm key i18n mới, `vi.js`/`en.js`).
3. Giữ nguyên UI chọn `ageRange` hiện có — nhưng khi `dateOfBirth` đã có giá trị, tự tính `ageRange` từ đó (hàm mới `deriveAgeRangeFromDOB(dob)` đặt trong `latteOnboarding.js` cạnh `AGE_BRACKETS`) và hiển thị ageRange đó ở dạng chỉ-đọc/disabled (không cho bấm chọn tay mâu thuẫn với DOB) — kèm chú thích nhỏ "Tự động tính từ ngày sinh". Nếu chưa có DOB, giữ nguyên hành vi chọn tay như hiện tại.
4. Đề xuất bảng quy đổi `AGE_RANGE_MIDPOINT` (dùng cho Phần 2) — Claude Code đề xuất số cụ thể cho '45+' (mốc mở, không có midpoint tự nhiên — đề xuất dựa theo ngữ cảnh `late_starter` template đã có), chờ xác nhận trước khi hardcode.

## Phần 2 — Tự điền tuổi trong Savings Escalator

Trong `SavingsEscalator.jsx`, thay `currentAge: 30` (mặc định cứng) bằng logic ưu tiên:
1. Có `dateOfBirth` ở profile → tính tuổi chính xác (hàm mới `calculateExactAge(dob)`)
2. Không có DOB nhưng có `ageRange` → dùng midpoint từ `AGE_RANGE_MIDPOINT`
3. Không có gì cả → giữ fallback `30` như hiện tại (không đổi hành vi cho user chưa từng vào Profile)

Vẫn cho phép người dùng **chỉnh tay** ô tuổi để thử kịch bản khác (ví dụ "nếu tôi 35 tuổi") — chỉ đổi GIÁ TRỊ MẶC ĐỊNH khi mở trang, không khóa input.

## Phần 3 — Ghi chú cho sau (KHÔNG làm trong spec này)

Ý tưởng "chúc mừng sinh nhật + ưu đãi Premium cho user đang dùng free" khi có DOB — cần: kiểm tra read-triggered (giống pattern Goal Health Check, không cần hạ tầng cron mới) mỗi khi user mở app, so ngày hôm nay với `dateOfBirth`, nếu trùng/gần ngày sinh VÀ `subscriptionTier === 'free'` → hiện banner ưu đãi. Đây là spec riêng, làm sau khi Phần 1+2 ổn định.

## Ngoài phạm vi
- Không bắt buộc nhập DOB cho user cũ — hoàn toàn tùy chọn, không có dialog ép nhập.
- Không xóa `ageRange` khỏi schema — vẫn giữ làm fallback vĩnh viễn cho user không muốn nhập DOB.

## Tiêu chí hoàn thành
- [ ] DOB tùy chọn, không phá vỡ luồng Profile/Onboarding hiện có cho user không nhập
- [ ] `ageRange` không mâu thuẫn với DOB khi cả 2 cùng tồn tại — DOB luôn là nguồn chính khi có
- [ ] `SavingsEscalator.jsx` tự điền đúng tuổi mặc định theo thứ tự ưu tiên trên, vẫn cho chỉnh tay
- [ ] Midpoint bracket '45+' được đề xuất kèm lý do, chờ xác nhận trước khi hardcode
