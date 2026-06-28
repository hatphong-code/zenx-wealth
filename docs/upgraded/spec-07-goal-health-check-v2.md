# Spec: Goal Health Check (v2 — đã verify code thật, mở rộng không xây mới)

> Hướng dẫn 1 dòng cho Claude Code: Mở rộng `goalTrackingService.js` (đã có `calculateGoalProgress`/`isOnTrack`) thêm cơ chế lưu lịch sử check định kỳ — theo đúng pattern snapshot đã dùng ở `latteFactorService.js` (`persistLatteSnapshot`). Chỉ làm Phase 1 (mục tiêu 12 tháng hiện có); Phase 2 (mục tiêu dài hạn) chờ Spec 6 xong.

## Đã verify với code thật (2026-06-27) — phát hiện quan trọng

`goalTrackingService.js` **đã có sẵn** phần lớn logic Spec 7 ban đầu mô tả:
```js
function calculateGoalProgress(profile, reports) {
  // ... đã tính weeklyTargetSavings, estimatedWeeklySavings, isOnTrack (ngưỡng 90%), progressPercent
}
```
Nhưng: (1) chỉ tính **real-time mỗi lần gọi** `getGoalTracking()`, không lưu lại theo thời gian; (2) không có cơ chế trigger định kỳ; (3) chỉ áp cho `goal12Month`, chưa áp cho mục tiêu dài hạn (vì mục tiêu dài hạn chưa tồn tại — xem Spec 6).

**Điều kiện tiên quyết mình từng nêu ở bản spec đầu (đã có tracking thu-chi đủ chi tiết chưa?) — ĐÃ CÓ**, qua `reportsService.js`/`dashboardService.js` cấp dữ liệu cho `calculateGoalProgress`. Không còn là điều kiện chặn.

`latteFactorService.js` có pattern snapshot đáng tái dùng:
```js
async function persistLatteSnapshot(userId, value) {
  await setDoc(getLatteSnapshotRef(userId), { ...value, updatedAt: serverTimestamp() }, { merge: true });
}
```

## Phạm vi: chỉ Phase 1 trong spec này

**Phase 1 (làm ngay)**: thêm lịch sử check cho mục tiêu 12 tháng đã có, KHÔNG đụng logic tính `calculateGoalProgress` hiện tại.
**Phase 2 (sau, khi Spec 6 xong)**: mở rộng sang mục tiêu dài hạn — không nằm trong phạm vi spec này, chỉ ghi chú để không quên.

## Yêu cầu Phase 1

1. **Subcollection/snapshot mới** (theo pattern `latte-current` snapshot), ví dụ `users/{userId}/snapshots/goal-check-history` hoặc subcollection riêng `users/{userId}/goalChecks/{checkId}` — Claude Code chọn theo convention Firestore Lite đã dùng trong file.

2. **Trigger lưu check mới**: mỗi lần `getGoalTracking()` được gọi, so sánh `updatedAt`/`lastCheckedAt` của record gần nhất — nếu cách nhau ≥ N tháng (mặc định 3, để hằng số dễ đổi), tạo record mới:
```js
{ checkedAt, goalAmount, netWorth, progressPercent, isOnTrack, userAction: null }
```
Không cần Cloud Function lịch trình ở v1 — tái dùng cơ chế "tính khi đọc" (read-triggered) đã có trong file, nhất quán với cách `fetchLatteFactor` đang hoạt động.

3. **UI**: tìm nơi `goal12Month`/progress hiện đang hiển thị trong `src/web` (grep `goal12Month` hoặc `useGoalTracking` để định vị chính xác — không giả định trước file) và thêm 1 card nhỏ "Kiểm tra tiến độ" khi có check mới, với 2 nút hành động: "Điều chỉnh mục tiêu" / "Giữ nguyên" — không tự đổi gì khi chưa xác nhận. Lưu `userAction` vào record khi người dùng chọn.

4. **Ngôn ngữ trung lập**: tái dùng tinh thần đã thống nhất — không phán xét, chỉ trình bày số liệu khách quan.

## Tiêu chí hoàn thành Phase 1
- [ ] Không sửa logic tính `calculateGoalProgress` hiện có, chỉ thêm lớp lưu lịch sử bên ngoài
- [ ] Record lịch sử tạo đúng theo lịch N tháng, không tạo trùng lặp nếu gọi nhiều lần trong cùng kỳ
- [ ] UI hiển thị đúng vị trí đã xác định qua code thật, không tạo route/trang mới không cần thiết
- [ ] Người dùng luôn chọn hành động, không có thay đổi tự động
