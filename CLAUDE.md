# CLAUDE.md — ZenX Wealth

Personal Finance Operating System cho người khởi đầu muộn. Vietnamese-first, VND.
Production: **https://wealth.zenx.asia** · Firebase project: `zenx-wealth`

---

## Đọc trước khi làm bất cứ điều gì

| Tài liệu | Nội dung |
|----------|----------|
| `ZenXWealthUI/readme.md` | **Nguồn sự thật về design** — dual-theme, token, typography, content rules |
| `docs/DEVELOPMENT_WORKFLOW.md` | Conventions, page pattern, definition of done |
| `docs/ZenX_Wealth_Web_App_Roadmap.md` | Feature roadmap và vị trí của từng module |
| `docs/PROJECT_STATUS.md` | Trạng thái implementation hiện tại |
| `docs/IMPLEMENTATION_LOG.md` | Log các thay đổi theo thời gian |

---

## Quy trình xử lý yêu cầu

### Phân loại yêu cầu trước khi làm

| Loại | Dấu hiệu | Cách xử lý |
|------|----------|------------|
| **Câu hỏi / phân tích** | "tại sao", "có nên", "giải thích", "check" | Trả lời trực tiếp, không code |
| **Bug fix** | "lỗi", "không hoạt động", "sai" | Tìm root cause trước, fix tối thiểu, không refactor xung quanh |
| **Feature mới** | "thêm", "tạo", "implement" | Chạy đủ quy trình bên dưới |
| **UI/style** | "sửa giao diện", "đổi màu", "layout" | Kiểm tra design token trước khi code |

---

### Quy trình cho Feature / Fix có code changes

**1. Nghiên cứu & phân tích**
- Đọc `docs/PROJECT_STATUS.md` — feature đã có chưa, scope thực sự là gì
- Đọc file(s) liên quan trực tiếp để hiểu code hiện tại trước khi đề xuất
- Nếu có UI: đọc `ZenXWealthUI/readme.md` để nắm đúng pattern và token
- Xác định dependencies, side effects, và những gì có thể bị ảnh hưởng

**2. Đề xuất giải pháp — TRƯỚC KHI CODE**

Trình bày ngắn gọn:
- Các phương án khả thi (nếu có nhiều cách)
- Phân tích trade-off của từng phương án (complexity, risk, thời gian)
- **Khuyến nghị rõ phương án tối ưu** và lý do tại sao

Ví dụ format:
```
Phương án A: ... → Ưu: ... / Nhược: ...
Phương án B: ... → Ưu: ... / Nhược: ...
→ Khuyến nghị: Phương án A vì [lý do cụ thể]
```

**3. Chờ xác nhận trước khi thực hiện**

Không bắt đầu viết code cho đến khi người dùng xác nhận phương án.
Ngoại lệ duy nhất: yêu cầu rõ ràng, chỉ có một cách làm, không có risk — có thể hỏi nhanh "tiến hành luôn?" thay vì trình bày phương án.

---

### Phát hiện vấn đề ngoài phạm vi yêu cầu

Trong lúc nghiên cứu hoặc implement, Claude thường thấy các vấn đề liên quan mà người dùng chưa yêu cầu. Quy tắc xử lý:

**Phân loại theo mức độ:**

| Loại | Ví dụ | Hành động |
|------|-------|-----------|
| **Blocking** — ảnh hưởng trực tiếp đến task đang làm | Bug trong function sắp gọi, token sai gây UI vỡ | Fix luôn, báo cáo sau |
| **Liên quan chặt** — cùng file, cùng component | Inconsistency nhỏ, magic string nên dùng token | Fix luôn nếu < 5 phút, ghi chú trong commit |
| **Cải thiện / tối ưu** — scope rộng hơn | Refactor, thêm tính năng, đổi architecture | **Không làm — ghi vào danh sách đề xuất** |
| **Ý tưởng mở rộng** — giá trị mới chưa có | Feature mới, UX pattern tốt hơn | **Không làm — nêu ngắn gọn cuối báo cáo** |

**Format báo cáo phát hiện thêm** (cuối bước 7):

```
✅ Đã làm: [task chính]

💡 Phát hiện thêm (chưa xử lý):
- [Vấn đề A] — [mô tả 1 dòng] → đề xuất: [giải pháp ngắn]
- [Cơ hội B] — [mô tả 1 dòng] → có thể mang lại: [giá trị cụ thể]

Xử lý ngay hay để backlog?
```

**Nguyên tắc cốt lõi:** Làm đúng những gì được yêu cầu. Những gì thấy thêm — ghi lại rõ ràng, đề xuất, để người dùng quyết định. Không tự mở rộng scope mà không có xác nhận.

**4. Implement — checklist khi viết code**
- [ ] Màu qua `zx-*` token — không hex, không `red-*` Tailwind thuần
- [ ] Radius qua `rounded-zx` / `rounded-zx-sm` — không `rounded-lg`
- [ ] Mọi chuỗi UI qua `t('key')` — thêm vào **cả** `vi.js` và `en.js`
- [ ] Số tiền qua `fmtShort()` (hub) hoặc `formatMoney(value, currency)` (detail)
- [ ] Icon-only buttons có `aria-label`
- [ ] Form inputs có `<label htmlFor>` tường minh
- [ ] Feedback sau action (inline state cho đến khi có Toast system)
- [ ] Mobile-first: style mặc định cho mobile, `md:`/`lg:` cho desktop

**5. Kiểm tra trước khi commit**
```bash
npm run build   # bắt buộc — không commit nếu build lỗi
npm test        # chạy nếu có thay đổi logic tài chính hoặc services
```

**6. Commit & push**
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `style:`
- Mỗi commit một việc — không gộp feature + style + bug fix vào một commit
- Push lên feature branch, không push thẳng `main`

**7. Báo cáo kết quả**
Sau khi push, tóm tắt ngắn: những gì đã làm, file nào thay đổi, điểm nào cần người dùng chú ý hoặc test thêm.

**8. Cập nhật docs — bắt buộc cuối session**
- `docs/IMPLEMENTATION_LOG.md` — ghi ngắn gọn những gì đã làm
- `docs/PROJECT_STATUS.md` — nếu có feature mới hoàn thành hoặc đổi version

---

## Tech Stack

- **React 18** + **Vite** — route-level lazy loading với `Suspense`
- **Tailwind CSS 3.4** — extended với `zx-*` utilities từ design tokens
- **Firebase** Auth + Firestore Lite + Cloud Functions (Node 22)
- **Recharts** — data visualization
- **Lucide React** — icons (line, 1.7 stroke, rounded)
- **Zustand** — global state
- **i18n** — `src/i18n/` · hook `useI18n()` · dictionary keys dot-notation · VI default / EN ready

---

## Design System — Quy tắc tuyệt đối

> Design system đầy đủ ở `ZenXWealthUI/readme.md`. Đây là các quy tắc **không được vi phạm**.

### 1. Không dùng hex màu cứng trong page/component files

```jsx
// ❌ SAI
<div style={{ color: '#C8643C' }} />
<div className="text-red-300 border-red-900 bg-red-950" />

// ✅ ĐÚNG
<div className="text-zx-accent" />
<div className="text-zx-negative border-zx-negative/40 bg-zx-negative/10" />
```

Mọi màu đi qua `ZenXWealthUI/tokens/colors.css`. Error state dùng token `--zx-negative`, không dùng Tailwind `red-*` thuần.

### 2. Không dùng `rounded-lg` hay Tailwind radius cứng

```jsx
// ❌ SAI
<div className="rounded-lg" />
<div className="rounded-2xl" />

// ✅ ĐÚNG
<div className="rounded-zx" />      // card/section level
<div className="rounded-zx-sm" />   // inline element level
<div className="rounded-zx-pill" /> // badge/pill
```

### 3. Hai theme — một codebase

Theme switch qua `data-theme="young"` (Ấm, light) hoặc `data-theme="mid"` (Tư gia, dark) trên `document.documentElement`. Hook: `src/hooks/useTheme.jsx`. Không hardcode màu riêng cho từng theme trong component.

### 4. Ít khung (open/airy) — layout mặc định

Dùng hairline `h-px bg-zx-line` để phân vùng, KHÔNG bọc thêm Card wrapper cho top-level sections. Xem pattern đầy đủ trong `docs/DEVELOPMENT_WORKFLOW.md` → mục "Ít Khung Page Pattern".

### 5. Typography đi qua font utilities

```jsx
font-zx-display  // hero numbers (40px / 66px desktop)
font-zx-head     // headings
font-zx-body     // body text (mặc định, không cần khai báo)
```

Eyebrow label: `text-[11px] font-semibold uppercase tracking-[0.16em] text-zx-text-soft`

---

## Navigation Architecture

```
Desktop:  Sidebar (w-56) + TopBar (greeting + page title + QuickAdd)
Mobile:   Bottom tabs (5 groups) + MobileTopBar + FAB (QuickAdd)

Hub pages (entry points on mobile):
  /         Dashboard
  /track    TrackHub
  /plan     PlanHub
  /review   ReviewHub
  /settings Settings
```

Route definitions + feature gating: `src/App.jsx`
Shell: `src/components/AppShell.jsx` — không tạo thêm nav wrapper trong pages.

---

## Code Conventions

### Files & Folders
- Pages: `src/pages/`
- Shared components: `src/components/`
- Base UI primitives: `src/components/ui/`
- Services (Firestore logic): `src/services/`
- Hooks: `src/hooks/`
- Utils: `src/utils/`

### Data
- Money: lưu dưới dạng `number`, hiển thị qua `src/utils/formatters.js`
  - `fmtShort(n)` → `"12,5 tr"` — dùng trên hub/dashboard
  - `formatMoney(n)` → `"12.500.000 ₫"` — dùng trên detail pages
- Dates: Firestore `Timestamp`, không lưu string
- Firestore path: `users/{userId}/...`

### i18n — Quy tắc & cách dùng

**Files:**
- `src/i18n/I18nProvider.jsx` — Provider bọc toàn bộ app
- `src/i18n/useI18n.js` — Hook truy cập context
- `src/i18n/dictionaries/vi.js` — Tiếng Việt (mặc định)
- `src/i18n/dictionaries/en.js` — Tiếng Anh (đầy đủ)

Locale được lưu trong `localStorage` với key `'zx-locale'`. Supported: `['vi', 'en']`.

**Hook:**
```jsx
const { t, locale, setLocale } = useI18n();
```

**Hàm `t(key, params?, fallback?)`:**
```jsx
// Key đơn giản
t('common.save')                         // → "Lưu"

// Interpolation với {token}
t('dashboard.greetingMorning', { name: 'Phong' })  // → "Chào buổi sáng, Phong"
t('onboarding.summaryMonths', { n: 6 })             // → "6 tháng"
t('transactions.amountLabel', { symbol: '₫' })      // → "Số tiền (₫)"

// Fallback nếu key không tồn tại
t('missing.key', {}, 'Default text')                // → "Default text"

// t() có thể trả về array (khi value trong dictionary là mảng)
const items = t('someKey.list');  // → string[]
```

**Quy tắc bắt buộc:**
- **Không hardcode chuỗi UI trong JSX** — kể cả tiếng Việt lẫn tiếng Anh
- Khi thêm tính năng mới, thêm key vào **cả hai** file `vi.js` và `en.js`
- Thứ tự key trong dictionary theo cấu trúc: `module.section.element`
- `{symbol}` dùng cho đơn vị tiền tệ (lấy từ user settings, không hardcode `₫`)

**Khi nào KHÔNG dùng `t()`:**
- Brand terms giữ nguyên: `ZenX Wealth`, `Latte Factor`, `Pay Yourself First`
- Số liệu tài chính (số tiền, phần trăm) — dùng formatters thay vì t()

---

### Formatters — Số tiền & ngày tháng

**File:** `src/utils/formatters.js`

| Hàm | Dùng khi | Ví dụ output |
|-----|----------|-------------|
| `fmtShort(n)` | Hub, dashboard, sidebar stats | `"12,5 tr"` · `"500k"` · `"1,2 tỷ"` |
| `formatMoney(value, currency)` | Detail pages, form labels | `"12.500.000 ₫"` · `"$12.50"` |
| `formatNumber(value, options?)` | Số không có đơn vị tiền | `"12.500"` |
| `formatPercent(value, options?)` | Phần trăm | `"75%"` |
| `formatDate(firestoreTimestamp)` | Ngày tháng từ Firestore | `"20/06/2026"` |

```jsx
// ❌ SAI — không dùng toLocaleString() inline
<span>{amount.toLocaleString()} ₫</span>

// ✅ ĐÚNG
import { fmtShort, formatMoney, formatDate } from '../utils/formatters';
<span>{fmtShort(amount)}</span>           // dashboard
<span>{formatMoney(amount, currency)}</span>  // detail page
<span>{formatDate(transaction.date)}</span>   // Firestore Timestamp
```

`currency` lấy từ user settings (`user.currency`), không hardcode `'VND'` trong components.

### Styling
- Mobile-first: viết style mặc định cho mobile, thêm `md:` / `lg:` / `xl:` cho desktop
- Container chuẩn: `max-w-5xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-8`
- `pb-24 md:pb-8`: pb-24 cho mobile (tránh bottom tabs), pb-8 cho desktop

---

## Component Rules

### Luôn dùng base components khi có

| Dùng | Thay vì |
|------|---------|
| `<Card>` từ `src/components/ui/card.jsx` | `<div className="rounded-zx border ...">` inline |
| `<Button>` từ `src/components/ui/button.jsx` | `<button className="...">` inline |

> **Tech debt đang tồn tại:** `<Input>`, `<Select>`, `<Textarea>` chưa có base component. Khi tạo mới, hãy tạo component trong `src/components/ui/` trước rồi dùng, không inline Tailwind vào page.

### Form inputs — pattern chuẩn (đến khi có base component)

```jsx
// Input text
<input className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-4 py-3 text-zx-text placeholder:text-zx-text-soft focus:outline-none focus:ring-2 focus:ring-zx-accent" />

// Error state — KHÔNG dùng red-* Tailwind thuần
<p className="mt-1 text-[12.5px] text-zx-negative">{error}</p>
```

### Accessibility — không bỏ qua

```jsx
// Icon-only buttons PHẢI có aria-label
<button aria-label="Chỉnh sửa giao dịch"><PencilIcon /></button>
<button aria-label="Xóa giao dịch"><TrashIcon /></button>

// Form inputs PHẢI có label tường minh (không chỉ dựa vào placeholder)
<label htmlFor="amount" className="...">Số tiền</label>
<input id="amount" ... />

// Error messages liên kết với input
<input aria-describedby="amount-error" ... />
<p id="amount-error" ...>{error}</p>
```

### Feedback sau actions — bắt buộc

Mọi action thành công (thêm/sửa/xóa giao dịch, lưu settings, v.v.) PHẢI có feedback rõ ràng cho user. Hiện tại chưa có Toast system — dùng state inline hoặc navigate với success param cho đến khi có.

> **Việc cần làm:** Implement `useToast()` hook + `<Toast>` component tại `src/components/ui/`.

---

## Desktop Layout Standards

Theo `docs/PROJECT_STATUS.md` (v2.1):

| Trang | Max-width |
|-------|-----------|
| Hub pages, forms chuẩn | `max-w-5xl` |
| Data-heavy (Assets, TradingRisk, BudgetTemplates) | `max-w-6xl` |
| Reports, AI Coach | `max-w-7xl` |

**2-column desktop pattern** (`lg:grid`):
- TrackHub: cashflow + latte trái / recurring + recent + actions phải
- WeeklyReview: wizard trái / sticky summary panel phải
- AddTransaction: form trái / today's entries phải

Stats grid: `sm:grid-cols-2 xl:grid-cols-4`

---

## Các vấn đề đã nhận diện (từ UI/UX Report)

Xem chi tiết tại `UI_UX_DESKTOP_REPORT.md`. Tóm tắt để Claude ưu tiên đúng:

### 🔴 Chưa implement — Critical
- **Toast/Notification system** sau actions — user không có feedback rõ
- **Base form components** (`<Input>`, `<Select>`, `<Textarea>`) — hiện inconsistent giữa các pages
- **`aria-label` trên icon-only buttons** — không accessible

### 🟠 Chưa implement — High priority
- **Global search** (`Cmd+K`) across transactions và features
- **Breadcrumb navigation** cho sub-pages
- **Export** transactions (CSV) và reports (PDF)
- **Bulk actions** cho transaction list (chọn nhiều → xóa/re-categorize)
- **Skeleton loading** thay vì text "Đang tải..." (tránh layout shift)

### 🟡 Chưa implement — Medium
- **Searchable `<Select>`** cho category picker (thay `<select>` HTML thuần)
- **Date range picker** cho Reports
- **Auto-save** trong Weekly Review (multi-step form dài)
- **`prefers-reduced-motion`** media query cho animations
- **Empty states** cho Charts khi chưa có data

### ✅ Đang tốt — Không thay đổi
- Dual-theme token system
- Lazy loading + code splitting
- Mobile-first responsive layout
- Feature gating + LockedFeature UX
- StatTile, ProgressBar, Tone system components
- Focus rings trên tất cả buttons
- i18n + number formatting

---

## Cập nhật docs sau mỗi session — bắt buộc

Sau khi hoàn thành bất kỳ feature, fix, hoặc thay đổi đáng kể nào, **phải cập nhật hai file sau trước khi kết thúc session:**

### `docs/PROJECT_STATUS.md`
Cập nhật khi: thêm feature mới, thay đổi architecture, đổi version.
- Thêm vào mục **Implemented** nếu feature mới hoàn thành
- Cập nhật **Last updated** và version number (vX.Y)
- Cập nhật **Desktop Layout** nếu có thay đổi layout standards

### `docs/IMPLEMENTATION_LOG.md`
Cập nhật sau **mỗi session** có code changes.
- Ghi ngày, tóm tắt những gì đã làm, files chính đã thay đổi
- Không cần dài — 3-5 dòng là đủ, miễn là có

> Hai file này là "bộ nhớ dài hạn" của project. CLAUDE.md định nghĩa rules;
> PROJECT_STATUS + IMPLEMENTATION_LOG ghi lại thực tế. Session sau đọc cả ba.

**Không có automation cho việc này** — đây là trách nhiệm thủ công cuối mỗi session.

---

## Git & Branch

- Commit message: tiếng Anh, conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`)
- Không push thẳng vào `main` — luôn dùng feature branch

## Build & Deploy

```bash
npm run build          # Kiểm tra trước khi commit
npm test               # Unit tests (Vitest)
firebase deploy --only hosting --project zenx-wealth
```

Cloud Functions:
```bash
cd functions && npm install && cd ..
npx firebase deploy --only functions --project zenx-wealth
```
