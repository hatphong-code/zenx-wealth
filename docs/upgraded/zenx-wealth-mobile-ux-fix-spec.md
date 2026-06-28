# ZenX Wealth — Mobile UX Fix Spec

**Bối cảnh:** Audit trực tiếp source code (không qua docs) phát hiện 5 vấn đề thật, đã verify bằng grep + đọc full file. Đây không phải redesign — codebase mobile-first đã rất tốt (Hub navigation, bottom sheet, QuickCapture FAB, category chips đều đã chuẩn). 5 vấn đề dưới đây là các lỗ hổng cụ thể, có thể sửa bằng cách thêm 2 component chia sẻ + vài fix nhỏ tại chỗ.

**Nguyên tắc khi sửa:** Dùng đúng design token hiện có (`zx-*` classes, `rounded-zx`, `rounded-zx-sm`), dùng `t()` cho mọi text hiển thị, không thêm hex màu cứng — đúng quy ước trong `docs/DEVELOPMENT_WORKFLOW.md`.

---

## Vấn đề 1 — `window.confirm()` cho hành động xoá tài chính (Ưu tiên cao nhất)

**File bị ảnh hưởng (6):** `src/pages/IncomeBuilder.jsx`, `src/pages/Assets.jsx`, `src/pages/AdminAccessControl.jsx`, `src/pages/Transactions.jsx`, `src/pages/EmergencyFund.jsx`, `src/pages/DebtControl.jsx`

**Vì sao ưu tiên cao:** Đây toàn là hành động xoá dữ liệu tài chính không hoàn tác (giao dịch, nợ, thu nhập, tài sản, quỹ dự phòng). Popup `window.confirm()` của browser không match design system, và trông khác nhau giữa Safari/Chrome/in-app browser trên mobile.

### Bước 1: Tạo component chia sẻ `src/components/ConfirmDialog.jsx`

```jsx
import { AlertTriangle } from 'lucide-react';
import { useI18n } from '../i18n/useI18n';

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = 'danger', // 'danger' | 'default'
  onConfirm,
  onCancel,
}) {
  const { t } = useI18n();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        onClick={onCancel}
        aria-label={cancelLabel || t('common.cancel', {}, 'Hủy')}
      />
      <div className="relative w-full max-w-sm rounded-t-zx border border-zx-line bg-zx-surface p-5 shadow-zx zx-transition md:rounded-zx">
        <div className="mb-3 flex items-center gap-3">
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
              tone === 'danger' ? 'bg-red-950 text-red-300' : 'bg-zx-icon-bg text-zx-accent'
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h2 className="font-zx-head text-base font-semibold text-zx-text">{title}</h2>
        </div>
        {description && <p className="mb-5 text-sm text-zx-text-soft">{description}</p>}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-zx-sm border border-zx-line bg-zx-surface-2 px-4 py-3 text-sm font-medium text-zx-text-soft transition hover:text-zx-text"
          >
            {cancelLabel || t('common.cancel', {}, 'Hủy')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 rounded-zx-sm px-4 py-3 text-sm font-semibold transition ${
              tone === 'danger'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-zx-accent text-zx-on-accent hover:opacity-90'
            }`}
          >
            {confirmLabel || t('common.confirm', {}, 'Xác nhận')}
          </button>
        </div>
      </div>
    </div>
  );
}
```

Mobile: bottom sheet (`rounded-t-zx`, dính đáy). Desktop: modal giữa màn hình (`md:rounded-zx`, `md:items-center`). Dùng lại đúng pattern overlay đã có sẵn trong `AppNav.jsx` (mobile menu drawer).

### Bước 2: Thêm i18n key nếu chưa có

Kiểm tra `src/i18n/` dictionaries (vi + en) đã có `common.cancel` / `common.confirm` chưa (đã thấy `common.cancelEdit`, `common.edit`, `common.delete` tồn tại). Nếu thiếu, thêm:

```js
// vi
common: { cancel: 'Hủy', confirm: 'Xác nhận', ... }
// en
common: { cancel: 'Cancel', confirm: 'Confirm', ... }
```

### Bước 3: Áp dụng vào 6 file

Pattern chuẩn (ví dụ cụ thể từ `Assets.jsx`, đã đọc full file — áp dụng tương tự cho 5 file còn lại):

**Trước:**
```jsx
const handleDelete = async (accountId) => {
  if (!user) return;
  if (!window.confirm(t('assets.confirmDelete'))) return;
  try {
    await removeAccount(user.uid, accountId);
    // ...
  } catch (err) { setError(err.message); }
};
```

**Sau:**
```jsx
const [pendingDeleteId, setPendingDeleteId] = useState(null);

const handleDelete = async (accountId) => {
  if (!user) return;
  try {
    await removeAccount(user.uid, accountId);
    // ... (giữ nguyên toàn bộ logic bên trong try, không đổi)
  } catch (err) { setError(err.message); }
};

const confirmDelete = () => {
  const id = pendingDeleteId;
  setPendingDeleteId(null);
  if (id) handleDelete(id);
};
```

Nút trigger xoá: đổi `onClick={() => handleDelete(account.id)}` → `onClick={() => setPendingDeleteId(account.id)}`.

Cuối JSX (trước `</main>` đóng):
```jsx
<ConfirmDialog
  open={!!pendingDeleteId}
  title={t('assets.confirmDelete')}
  onConfirm={confirmDelete}
  onCancel={() => setPendingDeleteId(null)}
/>
```

**Lưu ý cho Claude Code:** 5 file còn lại (`IncomeBuilder`, `AdminAccessControl`, `Transactions`, `EmergencyFund`, `DebtControl`) chưa được đọc full trong audit này — chỉ xác nhận có `window.confirm(...)` qua grep. Cần tự tìm chính xác từng lời gọi `window.confirm` trong mỗi file và áp dụng đúng pattern trên, giữ nguyên logic nghiệp vụ bên trong, chỉ thay cơ chế confirm. `Transactions.jsx` có 2 nơi gọi `handleDelete` (dòng 329 và 387 — một ở list view, một ở edit view) — cả 2 đều cần trỏ vào cùng 1 `ConfirmDialog` dùng chung state.

---

## Vấn đề 2 — Input số tiền thiếu `inputMode="decimal"` (Ưu tiên cao — tần suất chạm lớn nhất)

**File bị ảnh hưởng (12):** `IncomeBuilder.jsx`, `AddTransaction.jsx`, `Profile.jsx`, `Assets.jsx`, `TradingRisk.jsx`, `TrackHub.jsx`, `AdminAccessControl.jsx`, `Settings.jsx`, `PayYourselfFirst.jsx`, `OnboardingFlow.jsx`, `EmergencyFund.jsx`, `DebtControl.jsx`

**Vì sao ưu tiên cao:** Mọi input nhập tiền hiện dùng `type="number"` trơn — không có `inputMode="decimal"`. Đây là điểm chạm tần suất cao nhất trong toàn app.

### Bước 1: Tạo component chia sẻ `src/components/NumericInput.jsx`

ClassName lấy đúng từ pattern đang lặp lại ở `Assets.jsx`/`TradingRisk.jsx` (`w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent`):

```jsx
export default function NumericInput({ className = '', ...props }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      className={`w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent ${className}`}
      {...props}
    />
  );
}
```

### Bước 2: Thay thế ở 12 file

Tìm mọi `<input type="number" ...>` trong 12 file trên, đổi thành `<NumericInput ...>` — giữ nguyên toàn bộ props khác (`min`, `max`, `step`, `value`, `onChange`, `placeholder`). Ví dụ từ `Assets.jsx`:

**Trước:**
```jsx
<input type="number" min="0" step="any" value={form.balance} onChange={(e) => updateField('balance', e.target.value)} className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent" />
```

**Sau:**
```jsx
<NumericInput min="0" step="any" value={form.balance} onChange={(e) => updateField('balance', e.target.value)} />
```

Nhớ import `NumericInput` ở đầu mỗi file đã sửa.

**Phạm vi không bao gồm:** không thêm format hiển thị số (dấu phân cách nghìn khi gõ) trong lần sửa này — đó là 1 feature riêng, không phải bug đang sửa. Chỉ fix `inputMode`.

---

## Vấn đề 3 — Nhãn tháng trên Reports luôn hiển thị tiếng Anh, không theo `locale`

**File gốc lỗi:** `src/services/financialCalculations.js`, dòng 167-169 (hàm `monthLabel`)
**File cần sửa kèm:** `src/services/financialCalculations.js` (3 hàm), `src/services/reportsService.js` (2 lời gọi, dòng 172 và 176)

**Đã trace chính xác toàn bộ call chain:**
```
monthLabel(date)                          ← luôn 'en-US', không nhận locale
  ↑ gọi bởi buildMonthFrames(months, now)
    ↑ gọi bởi buildMonthlyCashFlowTrend()       (export, dòng 191)
    ↑ gọi bởi buildEmergencyCoverageTrend()      (export, dòng 230)
      ↑ cả 2 được gọi từ reportsService.js dòng 172 và 176
        — tại đó, `profile.settings?.locale` ĐÃ available trong scope
          (chính dòng 195 cùng file đang đọc đúng giá trị này, chỉ là sau lời gọi)
```

### Sửa `financialCalculations.js`

```js
// Trước
function monthLabel(date) {
  return date.toLocaleDateString('en-US', { month: 'short' });
}

function buildMonthFrames(months = 6, now = new Date()) {
  // ...
  label: monthLabel(start),
  // ...
}

export function buildMonthlyCashFlowTrend({ transactions = [], currency = 'VND', months = 6, now = new Date() }) {
  const frames = buildMonthFrames(months, now).map(...)
  // ...
}

export function buildEmergencyCoverageTrend({ /* ... */ months = 6, now = new Date() /* ... */ }) {
  const frames = buildMonthFrames(months, now);
  // ...
}
```

```js
// Sau
function monthLabel(date, locale = 'vi') {
  return date.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { month: 'short' });
}

function buildMonthFrames(months = 6, now = new Date(), locale = 'vi') {
  // ...
  label: monthLabel(start, locale),
  // ...
}

export function buildMonthlyCashFlowTrend({ transactions = [], currency = 'VND', months = 6, now = new Date(), locale = 'vi' }) {
  const frames = buildMonthFrames(months, now, locale).map(...)
  // ...
}

export function buildEmergencyCoverageTrend({ /* ... */ months = 6, now = new Date(), locale = 'vi' /* ... */ }) {
  const frames = buildMonthFrames(months, now, locale);
  // ...
}
```

### Sửa `reportsService.js`

Di chuyển dòng đọc locale lên **trước** 2 lời gọi (hiện đang ở dòng 195, dưới cả 2 lời gọi ở dòng 172/176), và truyền vào:

```js
// Thêm trước dòng 172 (di chuyển dòng 195 lên đây, xoá dòng 195 cũ)
const locale = profile.settings?.locale || 'vi';

const cashFlowTrend = buildMonthlyCashFlowTrend({
  transactions: recentTransactions,
  currency: dashboard.currency || profile.settings?.currency || 'VND',
  locale,
});
const emergencyTrend = buildEmergencyCoverageTrend({
  emergencyRecords: emergencyState.records,
  currency: dashboard.currency || profile.settings?.currency || 'VND',
  monthlyEssentialExpense: profile.settings?.monthlyEssentialExpense || 15000000,
  locale,
});
// ... (giữ nguyên các dòng giữa)
// XOÁ dòng `const locale = profile.settings?.locale || 'vi';` cũ ở vị trí sau (trước đây dòng 195), vì đã khai báo phía trên
const copy = reportCopyFor(locale);
```

**Kết quả mong đợi:** User chọn locale `vi` → chart hiện "thg 1, thg 2..." (Intl chuẩn `vi-VN`); locale `en` → vẫn "Jan, Feb..." như cũ.

**Phát hiện liên quan (không bắt buộc sửa trong lần này, chỉ ghi nhận):** `src/utils/formatters.js` — hàm `formatDate()` (dòng 36-39) hard-code `'vi-VN'`, và `fmtShort()` (dòng 41-49) hard-code đơn vị "tỷ"/"tr" — cả 2 đều không đọc theo `settings.locale`, ngược hướng với `monthLabel` (luôn tiếng Việt thay vì luôn tiếng Anh). Đây là lỗ hổng cùng nhóm i18n, nên xử lý ở 1 task riêng sau, vì phạm vi ảnh hưởng rộng hơn (nhiều file dùng `formatDate`/`fmtShort`) và cần kiểm tra kỹ hơn trước khi đổi.

---

## Vấn đề 4 — `rounded-lg` còn sót, chưa đồng bộ design token

**File bị ảnh hưởng (8):** `IncomeBuilder.jsx`, `TradingRisk.jsx`, `Reports.jsx`, `Transactions.jsx`, `HealthScore.jsx`, `WealthRoadmap.jsx`, `DebtControl.jsx`, `AICoach.jsx`

**Việc cần làm:** Tìm mọi class `rounded-lg` trong 8 file trên, đổi thành `rounded-zx` (cho khung lớn: card, section, article) hoặc `rounded-zx-sm` (cho khung nhỏ: input, badge, button) — theo đúng cách `v2.1` đã làm cho 6 file khác (`EmergencyFund`, `Assets`, `PayYourselfFirst`, `DebtControl` IncomeBuilder, `BudgetTemplates` — xem `docs/IMPLEMENTATION_LOG.md` mục v2.1 để biết quy ước phân biệt `rounded-zx` vs `rounded-zx-sm` đã dùng).

**Đã xác nhận 2 vị trí cụ thể có bằng chứng trực tiếp:**
- `WealthRoadmap.jsx` dòng 121: `<article className={...rounded-lg border p-5...}>` (khung phase card lớn) → `rounded-zx`
- `TradingRisk.jsx` dòng 137: `<div className="inline-flex items-center gap-2 rounded-lg border border-amber-900...">` (badge cảnh báo nhỏ) → `rounded-zx-sm`

6 file còn lại cần tự tìm bằng grep `rounded-lg` trong từng file và áp dụng đúng quy tắc kích thước trên.

---

## Vấn đề 5 — Icon gợi ý "bấm được" trên Dashboard vô hình trên mobile

**File:** `src/pages/Dashboard.jsx`, component `StatTile` (đầu file)

**Lỗi:** `<ArrowRight className="... opacity-0 group-hover:opacity-100 transition-opacity" />` — mobile không có hover, icon này vĩnh viễn ẩn. Tile vẫn bấm được (cả `StatTile` đã wrap trong `<Link>`), chỉ là thiếu gợi ý visual.

**Sửa:**
```jsx
// Trước
{to && <ArrowRight className="h-3.5 w-3.5 text-zx-text-soft opacity-0 group-hover:opacity-100 transition-opacity" />}

// Sau — luôn hiện trên mobile, vẫn giữ hiệu ứng hover tinh tế trên desktop
{to && <ArrowRight className="h-3.5 w-3.5 text-zx-text-soft opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity" />}
```

---

## Checklist nghiệm thu

- [ ] `ConfirmDialog.jsx` tạo mới, render đúng bottom-sheet trên mobile / modal giữa trên desktop
- [ ] Cả 6 file xoá dữ liệu không còn `window.confirm` nào — `grep -rn "window.confirm" src/pages/` trả về rỗng
- [ ] `NumericInput.jsx` tạo mới, cả 12 file dùng lại component này — `grep -rn 'type="number"' src/pages/` chỉ còn xuất hiện bên trong `NumericInput.jsx`
- [ ] Reports mở bằng tài khoản locale `vi` → chart hiện nhãn tháng tiếng Việt, không còn "Jan/Feb/Mar"
- [ ] `grep -rln "rounded-lg" src/pages/ src/components/` trả về rỗng
- [ ] Dashboard: arrow icon hiện mờ (opacity-60) trên mobile ngay từ đầu, không cần hover
- [ ] `npm run build` chạy sạch, `npm test` pass
- [ ] Test tay trên thiết bị thật: xoá 1 transaction → thấy bottom sheet xác nhận, không thấy popup browser
