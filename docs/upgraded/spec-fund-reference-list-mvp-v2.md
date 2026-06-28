# Spec: Fund Reference List MVP (v2 — gộp & phân kỳ, thay cho Spec 2/3/4/8 cũ)

> Hướng dẫn cho Claude Code: Đây là spec PHÂN KỲ — chỉ làm Phase 0+1 trong lần này. KHÔNG nhảy sang Phase 2-4 trước khi Phase 0-1 được xác nhận xong và review bởi Hà Phong. Mỗi phase phụ thuộc trực tiếp vào phase trước.

## Đã verify với code thật (2026-06-27) — vì sao phải gộp lại

Grep toàn bộ `src/` cho "fund": **không có một dòng nào về quỹ đầu tư tham khảo** — mọi kết quả đều là "emergency fund" (quỹ dự phòng, đã có module riêng). Trong `src/core/data/roadmapPhases.js` (Phase 3 — Xây nền), checklist có item `auto_investing_started` ("Đã bắt đầu đầu tư tự động / định kỳ") nhưng trong `roadmapCalculations.js`:
```js
auto_investing_started: false, // hardcoded, chưa nối với data thật nào
```
Module `Assets.jsx`/`assetService.js` (Assets/Invest Tracking) là tracker tài sản CÁ NHÂN của người dùng tự nhập — không phải danh sách quỹ tham khảo do ZenX curate.

**Kết luận**: 4 spec cũ (quality-screen, confidence badge, curation log, cross-validate) đều giả định có sẵn 1 trang/feature hiển thị danh sách quỹ — feature đó chưa tồn tại. Đưa nguyên 4 spec rời cho Claude Code lúc này sẽ khiến nó tự quyết định cấu trúc trang/route — rủi ro lệch hướng sản phẩm, đặc biệt khi câu hỏi "nguồn dữ liệu quỹ" (quỹ thật VN vs minh họa vs proprietary) vẫn đang mở.

---

## Phase 0 — Quyết định phạm vi (KHÔNG code, chỉ xác nhận)

Trước khi Claude Code viết bất kỳ dòng code nào, cần Hà Phong xác nhận 3 điều:
1. **Vị trí trong app**: tab/section mới trong `PlanHub.jsx`, hay route riêng (ví dụ `/wealth-roadmap/funds`)? Gợi ý: gắn vào đúng chỗ checklist item `auto_investing_started` đang trỏ tới, để tự nhiên nối vào Phase 3 của Wealth Roadmap.
2. **Nguồn dữ liệu v1**: giữ đúng hướng đã ghi nhận trước đó — curate tay ~10-15 quỹ đại diện từ factsheet công khai (VinaCapital, SSI, VCBF, Dragon Capital, Mirae Asset), hiển thị tham khảo, có disclaimer.
3. **`auto_investing_started` có nên tự động bật khi người dùng xem danh sách không, hay vẫn giữ checklist thủ công như hiện tại?** Đề xuất: giữ thủ công ở v1, tránh suy luận quá mức từ hành vi "đã xem" thành "đã đầu tư".

## Phase 1 — Base feature (làm sau khi Phase 0 xác nhận)

1. Tạo `src/core/data/referenceFunds.js` — data tĩnh, mỗi fund record:
```js
{
  id, name, assetType, fundAgeYears, aumVnd, expenseRatioPct,
  riskTier, // 1-5
  historicalReturns: { '1y':, '3y':, '5y': },
  volatility,
  navPublic: boolean,
  source: '', // tên công ty quản lý quỹ + ngày lấy factsheet
}
```
2. Trang/section hiển thị danh sách (vị trí theo Phase 0), dùng `zx-*` token, `rounded-zx`, tái dùng `formatMoney` đã có.
3. Disclaimer cố định trên đầu danh sách: *"Danh sách tham khảo dựa trên tiêu chí minh bạch, không phải khuyến nghị cá nhân hóa."* — thêm key i18n mới cho cả `vi.js`/`en.js`.
4. i18n đầy đủ, không hardcode text.

## Phase 2 — Quality-screen (chỉ làm sau khi Phase 1 đã có data thật để áp)

`src/core/services/fundScreen.js`, pure function `screenFund(fund)`:
- 7 tiêu chí cứng: tuổi quỹ <3 năm / AUM dưới ngưỡng / phí quản lý vượt ngưỡng / NAV không công khai / thiếu dữ liệu lợi suất cả 3 mốc / risk tier không xác định / thiếu volatility.
- ≥2 quy tắc miễn trừ tường minh (ví dụ: quỹ mới theo index lâu đời; AUM nhỏ nhưng minh bạch + tổ chức uy tín lâu năm).
- Ngưỡng AUM/phí cụ thể: Claude Code đề xuất kèm lý do dựa trên mặt bằng quỹ mở VN, KHÔNG tự hardcode số cuối — chờ Hà Phong xác nhận.
- Unit test cho từng tiêu chí + từng exemption.

## Phase 3 — Confidence Badge (độc lập, có thể build sớm hơn nếu muốn — không phụ thuộc Phase 2)

`<ConfidenceBadge level="high|medium|low" />`, dùng đúng token `zx-*` đã verify tồn tại trong `tailwind.config.js` (`zx-positive`, `zx-gold`, `rounded-zx-sm`...). Gắn vào field `confidence` thêm vào schema Phase 1 (mỗi metric 1 mức, không phải 1 badge/quỹ). Tooltip ngắn, tap-to-show trên mobile (không dựa vào hover).

## Phase 4 — Curation log + cross-validate update (chỉ sau khi Phase 1+2 chạy thật)

- Log loại trừ: mỗi lần `screenFund()` chạy trên toàn danh sách, sinh `CURATION_LOG.md` (quỹ loại + lý do + miễn trừ), versioned theo ngày, dev-only ở v1.
- Cross-validate khi cập nhật: script so bản mới/cũ mỗi field quan trọng, cảnh báo nếu lệch vượt ngưỡng (AUM, lợi suất, phí — Claude Code đề xuất ngưỡng kèm lý do), luôn kiểm tra đơn vị tiền tệ trước khi so.

## Tiêu chí hoàn thành tổng thể
- [ ] Phase 0 được xác nhận bằng văn bản trước khi bất kỳ code Phase 1+ nào được viết
- [ ] Không có phase nào chạy trước phase tiên quyết của nó
- [ ] `auto_investing_started` không bị tự động đổi hành vi ngoài ý đã xác nhận ở Phase 0
- [ ] Mọi ngưỡng số (AUM, phí, % lệch bất thường) được đề xuất kèm lý do, không hardcode mà chưa xác nhận
