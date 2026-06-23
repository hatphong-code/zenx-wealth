# ZenX Wealth — Báo cáo Phân tích & Đánh giá UI/UX Desktop
**Ngày:** 20/06/2026  
**Phạm vi:** Desktop (≥ 768px breakpoint)  
**Tech stack:** React 18 + Vite · Tailwind CSS 3.4 · Firebase · Recharts · Lucide React

---

## MỤC LỤC

1. [Tổng quan ứng dụng](#1-tổng-quan)
2. [Kiến trúc Layout Desktop](#2-kiến-trúc-layout-desktop)
3. [Design System & Token](#3-design-system--token)
4. [Navigation & Information Architecture](#4-navigation--information-architecture)
5. [Phân tích từng màn hình chính](#5-phân-tích-từng-màn-hình-chính)
6. [Component Patterns](#6-component-patterns)
7. [Responsive Design](#7-responsive-design)
8. [Khả năng Tiếp cận (Accessibility)](#8-khả-năng-tiếp-cận-accessibility)
9. [Hiệu năng UX](#9-hiệu-năng-ux)
10. [Điểm mạnh](#10-điểm-mạnh)
11. [Vấn đề & Lỗ hổng](#11-vấn-đề--lỗ-hổng)
12. [Khuyến nghị cải thiện (ưu tiên cao → thấp)](#12-khuyến-nghị-cải-thiện)
13. [Scorecard tổng hợp](#13-scorecard-tổng-hợp)

---

## 1. TỔNG QUAN

ZenX Wealth là ứng dụng **Personal Finance Operating System** — hệ sinh thái quản lý tài chính cá nhân toàn diện. Sản phẩm phục vụ người dùng Việt Nam (mặc định) với hỗ trợ tiếng Anh.

### Phạm vi chức năng (28 màn hình)

| Module | Màn hình |
|--------|----------|
| **Track** | Transactions, Add/Edit Transaction, Latte Factor, Import |
| **Plan** | Wealth Roadmap, Emergency Fund, Pay Yourself First, Debts, Income Builder, Assets, Trading Risk, Budget Templates |
| **Review** | Weekly Review, Reports, AI Coach, Health Score, Monthly Letter, Goal Tracking |
| **Core** | Dashboard, Login, Onboarding |
| **Settings** | Profile, Settings, Upgrade, Admin (2 màn) |

### Hai nhân cách thương hiệu (Dual Persona)

| Thuộc tính | **Trẻ** (Young) | **Mid** (Middle-aged) |
|---|---|---|
| Màu nền | `#FBF4EA` — kem ấm | `#0C1420` — navy đêm |
| Màu accent | `#C8643C` — đất nung | `#C9A24B` — vàng đồng |
| Font body | Be Vietnam Pro | Hanken Grotesk |
| Font heading | Be Vietnam Pro | Playfair Display |
| Góc bo | 24px (mềm) | 16px (tinh tế) |
| Shadow | Ấm, nhẹ | Sâu, tối |
| Cảm giác | Tươi trẻ, gần gũi | Sang trọng, nghiêm túc |

---

## 2. KIẾN TRÚC LAYOUT DESKTOP

**File chính:** `/src/components/AppShell.jsx` (567 dòng)

### Cấu trúc shell desktop

```
┌─────────────────────────────────────────────────────────────┐
│  TopBar: Greeting + Page Title + Quick-Add CTA + Avatar     │  ← h-14
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│ Sidebar  │  Main Content Area (overflow-y-auto)            │
│ w-56     │  px-4 md:px-8 · py-6                           │
│ (224px)  │  max-w-5xl / max-w-7xl (tùy trang)             │
│          │                                                  │
│ Nav      │  [Page Content]                                 │
│ Groups   │                                                  │
│          │                                                  │
│ Stats    │                                                  │
│ Widget   │                                                  │
│          │                                                  │
│ Theme    │                                                  │
│ Locale   │                                                  │
│ Sign Out │                                                  │
└──────────┴──────────────────────────────────────────────────┘
```

### Kích thước & đặc điểm

- **Sidebar:** fixed left, `w-56` (224px), `hidden md:flex`
- **TopBar:** fixed top, full-width, `h-14`
- **Main:** `flex-1`, `overflow-y-auto`, padding `md:px-8 py-6`
- **Max-width:** tùy trang — `max-w-5xl` (forms) → `max-w-7xl` (reports)
- **Grid columns:** 1 col mobile → 2-4 col desktop tùy section

---

## 3. DESIGN SYSTEM & TOKEN

### 3.1 Kiến trúc token (CSS Custom Properties)

**Location:** `/ZenXWealthUI/tokens/` → imported in `/src/index.css`

Hệ thống token 3 lớp:
1. **colors.css** — màu sắc dual-theme
2. **typography.css** — font & type scale
3. **spacing.css** — spacing, radii, shadows

### 3.2 Type Scale

| Token | Size | Dùng cho |
|-------|------|----------|
| `--zx-fs-eyebrow` | 11px | Label uppercase, tracked |
| `--zx-fs-caption` | 12.5px | Footnotes, metadata |
| `--zx-fs-body` | 14px | Body text chính |
| `--zx-fs-body-lg` | 15px | Body prominent |
| `--zx-fs-title` | 17px | Card title |
| `--zx-fs-h2` | 20px | Section heading |
| `--zx-fs-h1` | 24px | Page heading |
| `--zx-fs-display` | 40px | Hero số (mobile) |
| `--zx-fs-display-lg` | 66px | Hero số (desktop) |

### 3.3 Spacing System (4px base)

```
4 · 8 · 12 · 16 · 20 · 24 · 32 · 40px
```

### 3.4 Tailwind Config Extensions

Custom theme extensions:
- `colors`: CSS variable–driven (`zx-bg`, `zx-surface`, `zx-accent`, etc.)
- `borderRadius`: `zx` (24px/16px), `zx-sm` (16px/11px), `zx-pill` (999px)
- `fontFamily`: `zx-body`, `zx-head`, `zx-display`
- `boxShadow`: `zx` (theme-aware layered shadow)
- `ringColor`: `zx-accent`

---

## 4. NAVIGATION & INFORMATION ARCHITECTURE

### 4.1 Desktop Navigation (Sidebar)

Sidebar gồm 6 nhóm, mỗi nhóm expandable:

| Nhóm | Icon | Số mục |
|------|------|--------|
| Home | LayoutDashboard | 1 |
| Track | BarChart2 | 5 |
| Plan | Map | 9 |
| Review | ClipboardCheck | 5 |
| Profile | User | 3 |
| Admin *(admin only)* | Shield | 2 |

**Tính năng sidebar:**
- Expandable groups với chevron animation
- Active item highlighting
- Feature-based filtering (ẩn tính năng không có quyền)
- Mini stats widget (cash flow + emergency fund progress bar)
- Theme toggle + Locale toggle (VI/EN)
- Sign out button cố định ở cuối

### 4.2 Top Bar (Desktop)

```
┌─────────────────────────────────────────────────────────────────┐
│  Chào buổi sáng, [Tên]  ·  [Tên trang]        [+ Thêm]  [▲]  │
└─────────────────────────────────────────────────────────────────┘
```

- Personalized greeting theo giờ trong ngày
- Page title breadcrumb
- Quick-add CTA button
- Avatar 34px với initials fallback

### 4.3 Đánh giá IA (Information Architecture)

**Tốt:**
- Phân nhóm rõ ràng theo chu trình tài chính: Track → Plan → Review
- Navigation hierarchy 2 cấp (group → item)
- Active state rõ ràng

**Cần cải thiện:**
- 28 màn hình là con số lớn — một số màn hình có thể cần breadcrumb
- Không có global search để tìm nhanh giao dịch/chức năng
- Back navigation phụ thuộc browser button, không có breadcrumb trail

---

## 5. PHÂN TÍCH TỪNG MÀN HÌNH CHÍNH

### 5.1 Dashboard (/)

**Layout desktop:**
```
┌─────────────────────────────────────────────────────┐
│  Hero Card: Greeting + Thời gian trong ngày         │
├───────────┬───────────┬───────────┬─────────────────┤
│ StatTile  │ StatTile  │ StatTile  │ StatTile        │  ← 4 cols xl
├───────────┴───────────┼───────────┴─────────────────┤
│ Weekly Focus          │ Emergency Fund               │  ← 2 cols
├───────────────────────┼─────────────────────────────┤
│ Monthly Cash Flow     │ Latte Factor Highlight       │
└───────────────────────┴─────────────────────────────┘
```

**Phân tích:**
- ✅ Hero card tạo context tốt, cảm giác cá nhân hóa
- ✅ Stat tiles nhỏ gọn, đủ thông tin (icon + label + value + trend)
- ✅ Grid adaptive (1 col → 4 col)
- ⚠️ Widget "Weekly Focus" và "Emergency Fund" cạnh nhau — hierarchy không rõ ràng
- ⚠️ Không có thứ tự ưu tiên rõ ràng để người dùng biết nên xem gì trước

### 5.2 Transactions (/transactions)

**Layout desktop:**
```
┌─────────────────────────────────────────────────────┐
│ Search bar                    [Sort] [Filter]        │
├─────────────────────────────────────────────────────┤
│ Date │ Category │ Description    │ Amount  │ Actions │
├─────────────────────────────────────────────────────┤
│ ...  │ ...      │ ...           │ ...     │ ✏️ 🗑️  │
└─────────────────────────────────────────────────────┘
```

**Phân tích:**
- ✅ Search + filter + sort đủ bộ
- ✅ Delete confirmation modal (không xóa nhầm)
- ⚠️ Chưa có bulk actions (chọn nhiều để xóa/phân loại lại)
- ⚠️ Không có pagination rõ ràng — có thể chậm với data lớn
- ⚠️ Filter panel không collapsible trên desktop — chiếm nhiều diện tích

### 5.3 Add Transaction (/transactions/new)

**Layout desktop (two-column):**
```
┌─────────────────────────────┬───────────────────┐
│ Form:                       │ Side Panel:       │
│ - Amount (large input)      │ - Summary card    │
│ - Type selector             │ - Quick presets   │
│ - Category                  │ - Tips            │
│ - Date picker               │                   │
│ - Notes textarea            │                   │
│ [Submit]  [Cancel]          │                   │
└─────────────────────────────┴───────────────────┘
```

**Phân tích:**
- ✅ Two-column desktop layout tối ưu không gian tốt
- ✅ Side panel cung cấp context hữu ích
- ✅ Amount input nổi bật (large, central)
- ⚠️ Category selector dạng dropdown đơn giản — không tìm kiếm được
- ⚠️ Thiếu keyboard shortcut (Enter để submit)

### 5.4 Reports (/reports)

**Layout desktop:**
```
┌─────────────────────────────────────────────────────┐
│ Badge + Tiêu đề + Subtitle                          │
├──────────┬──────────┬──────────┬────────────────────┤
│ Metric   │ Metric   │ Metric   │ Metric             │  ← 4 cols
├──────────┴──────────┴──────────┴────────────────────┤
│ Chart (Bar/Line)              │ List/Breakdown       │  ← 2 cols
└───────────────────────────────┴─────────────────────┘
```

**Phân tích:**
- ✅ 4-metric header cards — overview nhanh
- ✅ Chart + breakdown side-by-side tốt cho desktop
- ⚠️ Charts không có data zoom / pan
- ⚠️ Không có export (PDF/CSV)
- ⚠️ Không có date range picker — chỉ có filter dropdown tháng

### 5.5 AI Coach (/ai-coach)

**Phân tích:**
- ✅ Tone system (danger/warning/good) trực quan, có màu sắc rõ ràng
- ✅ Numbered action items dễ theo dõi
- ✅ "Generate insights" có loading state rõ ràng
- ⚠️ Hero banner quá lớn — chiếm 25% màn hình desktop
- ⚠️ Không có lịch sử AI responses để so sánh theo thời gian

### 5.6 Wealth Roadmap (/roadmap)

**Phân tích:**
- ✅ Phase tabs horizontal — dễ điều hướng giữa các giai đoạn
- ✅ Expandable sections với checklists rõ ràng
- ✅ Progress indicator (phase N/Total)
- ⚠️ Horizontal scroll trên nhiều phases có thể bị ẩn trên desktop (no visible scrollbar)
- ⚠️ Lock icon cho premium features nhưng không hiện số phase đang bị locked

### 5.7 Weekly Review (/weekly-review)

**Phân tích:**
- ✅ Multi-step form structure phù hợp cho weekly reflection
- ⚠️ Không có progress indicator rõ ràng cho steps
- ⚠️ Không có auto-save — mất data nếu reload

---

## 6. COMPONENT PATTERNS

### 6.1 Inventory Components

| Component | File | Đánh giá |
|-----------|------|----------|
| Card | `/src/components/ui/card.jsx` | ✅ Tốt, theme-aware |
| Button | `/src/components/ui/button.jsx` | ⚠️ Thiếu variants (primary/secondary/ghost rõ ràng) |
| StatTile | Dashboard | ✅ Tốt, flexible |
| Progress Bar | Nhiều pages | ✅ Animation mượt |
| BottomSheet | AppShell | ✅ Mobile-only, đúng pattern |
| Chart | Recharts wrapper | ⚠️ Thiếu empty state khi không có data |
| Form Input | Inline Tailwind | ⚠️ Không có component riêng → inconsistent |

### 6.2 Vấn đề nhất quán

**Input fields** — không có component `<Input>` riêng:
```jsx
// Page A:
<input className="rounded-zx-sm border border-zx-line bg-zx-surface-2 px-4 py-3" />

// Page B (khác nhau):
<input className="w-full border-b border-zx-line bg-transparent py-2 text-lg" />
```
→ **Vấn đề:** 2 design khác nhau cho cùng loại input, gây inconsistency.

**Error states** — không có theme token:
```jsx
<div className="border-red-900 bg-red-950/40 text-red-300">
```
→ **Vấn đề:** Hard-coded Tailwind red, không thay đổi theo theme. Ở Trẻ theme (light), `red-300` text sẽ khó đọc.

### 6.3 Missing Components

- `<Input>` / `<Textarea>` — base form components
- `<Select>` — searchable select (hiện chỉ dùng HTML `<select>`)
- `<Badge>` — standalone badge component
- `<Table>` — data table với sort/pagination built-in
- `<DateRangePicker>` — cho reports filtering
- `<Skeleton>` — loading skeleton thay vì text "Đang tải..."
- `<Toast>` / `<Notification>` — feedback sau actions (hiện không rõ ràng)

---

## 7. RESPONSIVE DESIGN

### 7.1 Breakpoint Strategy

| Breakpoint | Kích thước | Dùng cho |
|------------|-----------|----------|
| (default) | < 768px | Mobile layout |
| `md:` | ≥ 768px | Desktop sidebar, layout switches |
| `lg:` | ≥ 1024px | Two-column forms, wider grids |
| `xl:` | ≥ 1280px | 4-column grids, display font lớn |

### 7.2 Layout Switching

| Element | Mobile | Desktop |
|---------|--------|---------|
| Navigation | Bottom tabs (fixed) | Left sidebar (fixed) |
| Top bar | Compact (icon only) | Full (greeting + CTA) |
| Padding bottom | `pb-24` (cho tabs) | `pb-8` |
| Grid columns | 1 | 2-4 |
| FAB | Hiển thị | Ẩn hoặc relocated |
| Hero font | 40px | 66px |

### 7.3 Vấn đề Responsive

- ⚠️ **1024-1280px gap** — Một số grids nhảy từ 1 col lên 4 col quá đột ngột, thiếu intermediate (2-3 col)
- ⚠️ **Sidebar chiều cao** — `h-screen overflow-y-auto` nhưng menu dài có thể bị cut trên màn hình nhỏ
- ⚠️ **Chart heights** — Fixed `h-72` cho mọi breakpoint; trên màn hình lớn (1440px+), charts trông nhỏ

---

## 8. KHẢ NĂNG TIẾP CẬN (ACCESSIBILITY)

### 8.1 Điểm mạnh

- ✅ Focus rings: `focus-visible:ring-2 focus-visible:ring-zx-accent` trên tất cả buttons
- ✅ Semantic HTML: `<h1>-<h3>`, `<button>`, `<form>`, `<ul>/<li>` đúng chỗ
- ✅ Touch targets: min 44px duy trì trên mobile
- ✅ Thematic contrast đủ WCAG AA (cần verify thêm cho Trẻ theme)

### 8.2 Vấn đề

| Vấn đề | Mức độ | Chi tiết |
|--------|--------|----------|
| Thiếu `<label>` tường minh | Trung bình | Nhiều input không có `<label for>` rõ ràng, rely vào placeholder |
| Thiếu `aria-label` cho icon buttons | Cao | Buttons chỉ có icon (không có text) cần `aria-label` |
| Không có `aria-live` cho dynamic content | Trung bình | AI Coach, loading states không thông báo cho screen reader |
| Focus trap trong modals | Cao | Bottom sheet modals cần focus trap đúng |
| Error messages không liên kết input | Trung bình | `aria-describedby` thiếu |
| Color không phải cách duy nhất truyền đạt | Thấp | Tone system dùng màu + text — tốt |

### 8.3 Keyboard Navigation

- ✅ Tab order hợp lý (sidebar → main content)
- ⚠️ Expandable sidebar groups: không rõ có keyboard accessible không
- ⚠️ Không có skip-to-content link

---

## 9. HIỆU NĂNG UX

### 9.1 Loading Patterns

| Pattern | Hiện tại | Đề xuất |
|---------|---------|---------|
| Page load | Text "Đang tải..." | Skeleton screens |
| Data fetch | Spinner (Loader2) | Skeleton cho charts/tables |
| Form submit | Button spinner + disabled | Giữ nguyên (tốt) |
| Theme switch | 0.5s CSS transition | ✅ Tốt |
| Navigation | Lazy load + Suspense | ✅ Tốt |

### 9.2 State Management

- ✅ Zustand cho global state
- ✅ Cache local cho user settings
- ✅ Optimistic updates với invalidation
- ⚠️ Không rõ stale-while-revalidate strategy cho data cũ

### 9.3 Animation & Motion

- ✅ Transitions ngắn (150ms-300ms) cho interactive elements
- ✅ Progress bar animation mượt (`cubic-bezier(.2,.7,.3,1)`)
- ✅ Theme switch: 0.5s (đủ để nhận ra, không gây chóng mặt)
- ✅ Không có animation vô nghĩa (pure functional motion)
- ⚠️ Không có `prefers-reduced-motion` media query

---

## 10. ĐIỂM MẠNH

### 10.1 Design System Chín chắn

Hệ thống CSS token 3 lớp (colors/typography/spacing) + Tailwind extension là **foundation rất tốt**. Việc tách token ra file riêng giúp:
- Dễ maintain khi cần rebrand
- Theme switching hoàn toàn qua CSS (không cần JS re-render)
- Nhất quán giữa các developer

### 10.2 Dual-Persona Strategy Xuất sắc

Hai theme Trẻ/Mid không chỉ đổi màu mà **đổi cả character**:
- Font family khác nhau
- Border radius khác nhau (mềm vs cứng)
- Shadow depth khác nhau
- Cảm giác tổng thể khác nhau

Đây là thiết kế rất thông minh cho sản phẩm phục vụ đa độ tuổi.

### 10.3 Mobile-First với Desktop Enhancement Đúng Hướng

Pattern sidebar (desktop) + bottom tabs (mobile) là **industry standard** và được implement đúng. Không có UX bị hy sinh cho một platform.

### 10.4 Financial-First Components

StatTile, Progress Bar, Tone System (danger/warning/good) là các component đặc thù cho finance app — **không generic, không over-engineered**.

### 10.5 Feature Gating UX Tốt

LockedFeature component với explanation rõ ràng + upgrade CTA + không ẩn hoàn toàn feature — đây là pattern tốt (không frustrating).

### 10.6 Localization Sẵn sàng

i18n hook toàn bộ, number formatting locale-aware, currency display đúng — sẵn sàng cho multi-market.

---

## 11. VẤN ĐỀ & LỖ HỔNG

### 11.1 🔴 Nghiêm trọng (Critical)

#### a. Không có Toast/Notification System
Sau khi user thực hiện action (thêm giao dịch, lưu settings), **không có feedback rõ ràng** rằng action đã thành công. User phải tự đoán. 

#### b. Form Components Không Nhất Quán
Không có `<Input>`, `<Select>`, `<Textarea>` base components → mỗi trang tự style khác nhau. Đây là tech debt lớn và gây trải nghiệm không đồng đều.

#### c. Accessibility: Icon Buttons Không Có aria-label
Các button chỉ có icon (edit, delete, close) trong transaction list và modals **không accessible** cho screen reader users.

### 11.2 🟠 Quan trọng (High)

#### d. Không Có Global Search
28 màn hình, nhiều giao dịch → **không có search toàn cục**. User muốn tìm "tháng 3" hay "Grab" phải biết trước phải vào đâu.

#### e. Không Có Breadcrumb/Back Navigation
Các trang con (Add Transaction, Edit, Emergency Fund detail, etc.) không có breadcrumb. User phải dùng browser back button.

#### f. Không Có Export Data
Reports và Transactions không có export PDF/CSV. Đây là tính năng cốt lõi với finance apps.

#### g. Không Có Bulk Actions cho Transactions
Xóa/phân loại nhiều giao dịch cùng lúc là use case phổ biến, đặc biệt sau import.

#### h. Loading States Quá Đơn Giản
Text "Đang tải..." và spinner nhỏ không giữ layout → CLS (Cumulative Layout Shift) xảy ra khi data load.

### 11.3 🟡 Trung bình (Medium)

#### i. Category Selector Không Có Search
Dropdown `<select>` đơn giản không phù hợp khi có nhiều category tùy chỉnh. Cần searchable combobox.

#### j. Chart Không Có Empty State
Khi chưa có data, charts không hiển thị gì hoặc hiển thị chart trống — không hướng dẫn user làm gì.

#### k. Reports Thiếu Date Range Picker
Chỉ có filter theo tháng đơn lẻ, không có khoảng thời gian tùy chỉnh.

#### l. Không Có prefers-reduced-motion
Transitions và animations không tắt theo OS preference của user.

#### m. Weekly Review Không Auto-save
Multi-step form dài không auto-save → mất data khi reload.

#### n. Sidebar Stats Widget Không Rõ Nguồn Số
Mini stats trong sidebar (cash flow, emergency fund) không có context hay link đến nguồn data.

### 11.4 🟢 Nhỏ (Low)

#### o. Error Messages Dùng Hard-coded Colors
`text-red-300` ở Trẻ (light) theme có thể kém contrast.

#### p. Charts Fixed Height
`h-72` trên desktop lớn (1440px+) trông nhỏ so với màn hình.

#### q. Horizontal Scroll Phases Không Có Scrollbar
Roadmap phases scroll ngang nhưng không có visual cue rõ ràng (custom scrollbar hoặc fade edge).

#### r. AI Coach Hero Banner Quá Lớn
Banner hero chiếm quá nhiều vertical space, đẩy nội dung thực xuống below the fold.

---

## 12. KHUYẾN NGHỊ CẢI THIỆN

### Priority 1 — Quick Wins (1-2 sprint)

#### 1.1 Thêm Toast/Notification System
```jsx
// Implement useToast() hook
const { toast } = useToast();
toast({ title: "Đã lưu!", description: "Giao dịch đã được thêm thành công.", variant: "success" });
```
**Impact:** High · **Effort:** Low

#### 1.2 Tạo Base Form Components
```jsx
// /src/components/ui/Input.jsx
// /src/components/ui/Select.jsx (với search)
// /src/components/ui/Textarea.jsx
```
Thống nhất toàn bộ form styling. **Impact:** High · **Effort:** Medium

#### 1.3 Thêm aria-label cho Icon Buttons
```jsx
<button aria-label="Chỉnh sửa giao dịch">
  <PencilIcon />
</button>
```
**Impact:** High (accessibility) · **Effort:** Low

#### 1.4 Skeleton Loading
```jsx
// Thay "Đang tải..." bằng skeleton screens
<SkeletonCard />
<SkeletonRow repeat={5} />
```
**Impact:** Medium · **Effort:** Low-Medium

### Priority 2 — Core Improvements (3-5 sprint)

#### 2.1 Global Search
- Search bar trong TopBar (desktop) hoặc trong sidebar
- Search across: transactions, features/pages
- Keyboard shortcut: `Ctrl/Cmd + K`

#### 2.2 Breadcrumb Navigation
```jsx
// /src/components/Breadcrumb.jsx
<Breadcrumb>
  <BreadcrumbItem href="/track">Track</BreadcrumbItem>
  <BreadcrumbItem>Thêm giao dịch</BreadcrumbItem>
</Breadcrumb>
```

#### 2.3 Export Functionality
- Export transactions: CSV
- Export reports: PDF (sử dụng print media query hoặc jsPDF)

#### 2.4 Bulk Actions cho Transactions
- Checkbox selection mode
- "Chọn tất cả" toggle
- Delete/categorize selected

#### 2.5 Date Range Picker cho Reports
- Custom `<DateRangePicker>` component
- Presets: "Tuần này", "Tháng này", "Quý này", "Năm này"

### Priority 3 — Polish (5+ sprint)

#### 3.1 Chart Enhancements
- Empty state với illustration + CTA
- Dynamic height responsive
- Zoom/pan cho line charts
- Data labels tùy chỉnh

#### 3.2 Weekly Review Auto-save
- Debounced auto-save mỗi 30s
- "Đã lưu tự động" indicator

#### 3.3 prefers-reduced-motion
```css
@media (prefers-reduced-motion: reduce) {
  .zx-transition { transition: none !important; }
  .animate-spin { animation: none; }
}
```

#### 3.4 Searchable Category Select
- Thay `<select>` bằng Combobox pattern
- Hỗ trợ tìm kiếm real-time
- Nhóm theo category group

#### 3.5 Focus Trap trong Modals
- Trap keyboard focus trong BottomSheet và modals
- Return focus về trigger element khi đóng

---

## 13. SCORECARD TỔNG HỢP

| Tiêu chí | Điểm | Ghi chú |
|----------|------|---------|
| **Visual Design** | 8.5/10 | Dual-theme xuất sắc, token system chín chắn |
| **Layout & Structure** | 8.0/10 | Desktop sidebar tốt, có một số gap ở intermediate breakpoints |
| **Navigation & IA** | 7.0/10 | Phân nhóm rõ, thiếu search toàn cục và breadcrumb |
| **Component Consistency** | 6.0/10 | Thiếu base form components, inconsistent inputs |
| **Accessibility** | 5.5/10 | Focus rings tốt nhưng thiếu nhiều ARIA attributes |
| **Loading & Feedback** | 5.5/10 | Không có toast, skeleton loading thiếu |
| **Data Visualization** | 6.5/10 | Charts đủ dùng, thiếu empty states và export |
| **Responsive Design** | 7.5/10 | Mobile-first đúng hướng, một số breakpoint gaps |
| **Performance UX** | 7.5/10 | Lazy load, code splitting tốt, animation hợp lý |
| **Feature Completeness** | 7.0/10 | Đủ core features, thiếu export và bulk actions |
| **🏆 Tổng điểm** | **6.9/10** | Nền tảng tốt, cần polish ở feedback và accessibility |

---

## TÓM TẮT ĐIỀU HÀNH

ZenX Wealth có **nền tảng thiết kế rất tốt** — design system token-based chuyên nghiệp, dual-persona theme thông minh, và cấu trúc layout desktop chuẩn. Đây không phải sản phẩm học sinh; đây là codebase production-ready về mặt kiến trúc.

**Ba việc ưu tiên nhất cần làm ngay:**
1. **Toast/Notification System** — user cần biết action có thành công không
2. **Base Form Components** — nhất quán form styling toàn bộ app
3. **aria-label cho icon buttons** — accessibility không thể bỏ qua

**Tầm nhìn dài hạn:** Với 28 màn hình và growing, đây là lúc đầu tư vào **component library riêng** (Storybook) và **accessibility audit** chính thức trước khi scale.

---

*Report này dựa trên phân tích static code. Khuyến nghị bổ sung: usability testing với 5 người dùng thực tế trên desktop để xác nhận các vấn đề và ưu tiên.*
