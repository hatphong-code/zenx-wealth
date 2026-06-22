# Mobile Wireframes — ZenX Wealth
**Visual designs cho 5 main screens**

---

## 📱 WIREFRAME 1: Dashboard (Overview Hub)

### Current State (Desktop Shrunk)
```
┌────────────────────────┐
│ App Header             │
├────────────────────────┤
│ 📊 Dashboard           │  ← Tab indicator
├────────────────────────┤
│ [Số tiền: 10.5 tr]    │  ← Small, text-heavy
│ [Chart 1] [Chart 2]   │
│ [Latte Factor]        │
│ [Recent Txns] (5 txns)│
│ [Goals] [Recurring]   │
│ [News/Tips]           │
│                       │  ← User has to scroll A LOT
│ ← No sticky CTA       │
├────────────────────────┤
│ Bottom tabs (5)        │
└────────────────────────┘
```

### PROPOSED: Mobile-Optimized Dashboard
```
╔════════════════════════╗
║ ☀️ Chào, Phong!        ║  ← Greeting (personalized)
║ 20/06/2026, 10:30     ║  ← Date/time
╠════════════════════════╣
║ METRIC HERO            ║
║                        ║
║  Tháng này             ║  ← Label (11px, soft)
║                        ║
║  10.500.000 ₫          ║  ← PRIMARY (36px bold)
║                        ║
║  Còn lại: 4,5 tr       ║  ← Context (13px)
║  (30% ngân sách)       ║
║                        ║
║  [Chi tiết] ▶          ║  ← Tap for detail sheet
╠════════════════════════╣
║ CATEGORIES (Expandable)║
║                        ║
║  🍔 Ăn uống: 2,5 tr   ║  ← Top 3 only
║  📊 25% | ↑ 10%       ║
║                        ║
║  🚗 Di chuyển: 1,2 tr  ║
║  📊 12%               ║
║                        ║
║  🛒 Mua sắm: 1,8 tr   ║
║  📊 18% | ↓ 5%        ║
║                        ║
║  [▼ Xem 7 danh mục]    ║  ← Expandable
╠════════════════════════╣
║ RECENT (Swipeable)    ║
║                        ║
║ ▼ HÔM NAY (3 txns)    ║
║  🍔 Cơm trưa          ║
║     150.000 ₫ • 14:30 ║  ← Swipe for actions
║                        ║
║  ☕ Café              ║
║     80.000 ₫ • 16:00  ║
║                        ║
║  🏪 Siêu thị          ║
║     320.000 ₫ • 17:45 ║
║                        ║
║ [Xem tất cả] ▶        ║  ← Go to Track page
╠════════════════════════╣
║ [+ GHI GIAO DỊCH MỚI] ║  ← STICKY BUTTON
║ (56px height)         ║     Always visible
╠════════════════════════╣
║ 📊 📈 🎯 📋 ⚙️        ║  ← Bottom tabs
└────────────────────────┘

KEY CHANGES:
✅ 1 hero metric (40px) instead of crowded title
✅ Top 3 categories only (expandable for rest)
✅ Recent 5 txns (not all 20)
✅ Sticky CTA button at bottom
✅ Swipe support for transactions
✅ [Chi tiết] links for drill-down
```

### Mobile Dashboard Expanded States

**When user taps "▼ Xem 7 danh mục khác":**
```
╔════════════════════════╗
║ CATEGORIES (Expanded)  ║
║                        ║
║ 🍔 Ăn uống: 2,5 tr    ║
║ 🚗 Di chuyển: 1,2 tr   ║
║ 🛒 Mua sắm: 1,8 tr    ║
║ 🏠 Nhà cửa: 800k      ║  ← All 10 now visible
║ 💳 Khoản vay: 2 tr    ║
║ 🎓 Giáo dục: 500k     ║
║ 🏥 Sức khỏe: 400k     ║
║ 💎 Đầu tư: 1,5 tr     ║
║ 🎮 Giải trí: 750k     ║
║ 📱 Khác: 300k         ║
║                        ║
║ [▲ Thu gọn]           ║
╠════════════════════════╣
```

**When user taps a category (e.g., "🍔 Ăn uống"):**
```
╔════════════════════════╗
║ ◀ Dashboard | Ăn uống ║  ← Breadcrumb
╠════════════════════════╣
║ METRIC                 ║
║  Tháng này             ║
║  2.500.000 ₫           ║
║  25% ngân sách         ║
║  ↑ 10% vs tháng trước  ║
╠════════════════════════╣
║ ACTIONS                ║
║ [Đặt ngân sách] [....] ║
╠════════════════════════╣
║ TRANSACTIONS (7 items) ║
║                        ║
║ ▼ HÔM NAY (2)         ║
║  • Cơm - 150k (14:30)  ║
║  • Cafe - 80k (16:00)  ║
║                        ║
║ ▼ HÔM QUA (2)         ║
║  • Cơm - 120k         ║
║  • Cafe - 75k         ║
║                        ║
║ ▼ 2 NGÀY TRƯỚC (3)    ║
║  • Buffet - 250k      ║
║  • (...)              ║
╠════════════════════════╣
║ [+ GHI GIAO DỊCH MỚI] ║  ← Sticky CTA
╠════════════════════════╣
│ 📊 📈 🎯 📋 ⚙️        ║
└────────────────────────┘
```

---

## 📱 WIREFRAME 2: Track Page (All Transactions with Filters)

```
╔════════════════════════╗
║ 📊 Track              ║
╠════════════════════════╣
║ FILTERS (Sticky)      ║
║                        ║
║ [Tất cả] [Tháng] [📅]║  ← Tab filters + date picker
║                        ║
║ 🔍 Tìm kiếm          ║  ← Search box
║ Sort: Mới nhất ▼      ║  ← Sort dropdown
╠════════════════════════╣
║ TRANSACTIONS          ║
║                        ║
║ ▼ HÔM NAY (3)        ║
║  ┌──────────────────┐ ║
║  │ 🍔 Cơm trưa     │ ║  ← Swipeable item
║  │ 150.000 ₫ 14:30 │ ║
║  └──────────────────┘ ║
║     (swipe left: ✏️ 🗑️)
║                        ║
║  ┌──────────────────┐ ║
║  │ ☕ Café         │ ║
║  │ 80.000 ₫ 16:00  │ ║
║  └──────────────────┘ ║
║     (swipe left: ✏️ 🗑️)
║                        ║
║  ┌──────────────────┐ ║
║  │ 🏪 Siêu thị     │ ║
║  │ 320.000 ₫ 17:45 │ ║
║  └──────────────────┘ ║
║                        ║
║ ▼ HÔM QUA (5)        ║
║  ┌──────────────────┐ ║
║  │ 🍔 Cơm           │ ║
║  │ 120.000 ₫ 13:00 │ ║
║  └──────────────────┘ ║
║                        ║
║  [+ 4 more]           ║  ← Load more (infinite scroll)
║                        ║
║ ▼ 2 NGÀY TRƯỚC (7)   ║
║  ...                  ║
╠════════════════════════╣
║ [+ GHI GIAO DỊCH MỚI] ║  ← Sticky CTA
╠════════════════════════╣
│ 📊 📈 🎯 📋 ⚙️        ║
└────────────────────────┘

INTERACTIONS:
• Swipe left on item → [✏️ Edit] [🗑️ Delete]
• Swipe right on item → [📌 Pin/Flag]
• Tap on item → Detail sheet (read-only)
• Tap [🔍] → Full-screen search
• Scroll down → Load more (infinite scroll)
```

---

## 📱 WIREFRAME 3: Add Transaction (Modal)

```
╔════════════════════════╗
║ ◀ X  Ghi giao dịch   ║  ← Header with close
╠════════════════════════╣
║                        ║
║ Số tiền *              ║  ← Label (required)
║ ┌──────────────────┐  ║
║ │ [___________] ₫  │  ← Large input (40px)
║ └──────────────────┘  ║
║ (Currency auto-set)   ║
║                        ║
║ Danh mục *             ║
║ ┌──────────────────┐  ║
║ │ 🍔 Ăn uống    ▼ │  ← Category picker
║ └──────────────────┘  ║
║                        ║
║ Ngày *                 ║
║ ┌──────────────────┐  ║
║ │ 📅 20/06/2026   │  ← Date picker (tappable)
║ └──────────────────┘  ║
║                        ║
║ Giờ (tùy chọn)        ║
║ ┌──────────────────┐  ║
║ │ 🕐 14:30         │  ← Time picker
║ └──────────────────┘  ║
║                        ║
║ Ghi chú (tùy chọn)    ║
║ ┌──────────────────┐  ║
║ │ [_____________]  │  ← Text area (multiline)
║ │                  │  ║
║ └──────────────────┘  ║
║                        ║
║ [Hủy]      [Lưu]      ║  ← 2-button footer
║                        ║
╠════════════════════════╣
│ 📊 📈 🎯 📋 ⚙️        ║
└────────────────────────┘

UX DETAILS:
✅ Amount input: auto-focus, numeric keyboard
✅ Category: horizontal scroll with emoji visible (tap expands to grid)
✅ Date: calendar picker or swipe
✅ Time: spinner or numeric input
✅ Note: optional, multiline
✅ Auto-save on blur (before tapping Save)
✅ Confirmation toast after Save
✅ Form clears after successful save
```

### Category Picker (Tap Category to Expand)

```
╔════════════════════════╗
║ ◀ Category             ║
╠════════════════════════╣
║ QUICK SELECT (Top 5)   ║
║ ◉ 🍔  🚗  🛒  🏠  💳   ║  ← Horizontal scroll
║   Ăn  Di  Mua  Nhà Khoản
║                        ║
║ ALL CATEGORIES (Grid)  ║
║                        ║
║ 🍔 Ăn uống             ║
║ 🚗 Di chuyển           ║
║ 🛒 Mua sắm             ║
║ 🏠 Nhà cửa             ║
║ 💳 Khoản vay           ║
║ 🎓 Giáo dục            ║
║ 🏥 Sức khỏe            ║
║ 💎 Đầu tư              ║
║ 🎮 Giải trí            ║
║ 📱 Khác                ║
║                        ║
║ ┌──────────────────┐  ║
║ │ + Tạo danh mục   │  ║
║ └──────────────────┘  ║
╠════════════════════════╣
│ 📊 📈 🎯 📋 ⚙️        ║
└────────────────────────┘
```

---

## 📱 WIREFRAME 4: Plan Page (Goals)

```
╔════════════════════════╗
║ 🎯 Plan               ║
╠════════════════════════╣
║                        ║
║ GOALS (Short Form)     ║
║                        ║
║ 🏠 Mua nhà             ║  ← Goal card (tap for detail)
║ 500.000.000 ₫         ║
║ Đã tiết kiệm: 50 tr  ║
║ 📊 [████░░░░] 10%    ║  ← Progress bar
║ Còn: 450 tr           ║
║                        ║
║ 🚗 Xe hơi              ║
║ 100.000.000 ₫         ║
║ Đã tiết kiệm: 20 tr  ║
║ 📊 [████░░░░] 20%    ║
║ Còn: 80 tr            ║
║                        ║
║ ✈️ Du lịch             ║
║ 30.000.000 ₫          ║
║ Đã tiết kiệm: 5 tr   ║
║ 📊 [██░░░░░░] 17%    ║
║ Còn: 25 tr            ║
║                        ║
║ [+ Thêm mục tiêu]      ║  ← Primary action
║                        ║
╠════════════════════════╣
║ BUDGET MONTHLY        ║
║                        ║
║ Ngân sách: 15 tr      ║  ← Link to detail
║ Đã dùng: 10,5 tr      ║
║ Còn: 4,5 tr (30%)     ║
║                        ║
║ [Điều chỉnh]           ║
║                        ║
╠════════════════════════╣
║ [+ GHI GIAO DỊCH MỚI] ║
╠════════════════════════╣
│ 📊 📈 🎯 📋 ⚙️        ║
└────────────────────────┘
```

---

## 📱 WIREFRAME 5: Settings Page

```
╔════════════════════════╗
║ ⚙️ Cài đặt            ║
╠════════════════════════╣
║                        ║
║ HIỂN THỊ              ║
║ ────────────────────  ║
║ Theme                 ║
║   ◉ Sáng              ║  ← Radio button
║   ○ Tối               ║
║                        ║
║ Ngôn ngữ              ║
║   ◉ Tiếng Việt       ║
║   ○ English           ║
║                        ║
║ Đơn vị tiền            ║
║   ◉ Đồng (₫)          ║
║   ○ USD ($)            ║
║   ○ EUR (€)            ║
║                        ║
╠════════════════════════╣
║                        ║
║ THÔNG BÁO             ║
║ ────────────────────  ║
║ Bật thông báo         ║
║   [Toggle: ON/OFF]    ║  ← Toggle switch
║                        ║
║ [Loại thông báo]       ║  ← Link to detail
║                        ║
╠════════════════════════╣
║                        ║
║ [▼ More Options]       ║  ← Expandable section
║                        ║
║ DATA & PRIVACY        ║
║ ────────────────────  ║
║ [Xuất dữ liệu CSV]     ║
║ [Xóa tất cả dữ liệu]   ║
║ [Privacy Policy]       ║
║ [Terms of Service]     ║
║                        ║
║ ACCOUNT               ║
║ ────────────────────  ║
║ [Đổi mật khẩu]        ║
║ [Đăng xuất]            ║
║                        ║
╠════════════════════════╣
║ Version 3.0           ║  ← Footer (system info)
╠════════════════════════╣
│ 📊 📈 🎯 📋 ⚙️        ║
└────────────────────────┘

INTERACTION:
✅ Tier 1 settings visible by default
✅ Tier 2+ hidden in "[▼ More Options]"
✅ [Loại thông báo] tap → goes to notifications detail page
```

---

## 📱 WIREFRAME 6: Detail Sheets (Modal)

### Transaction Detail Sheet
```
╔════════════════════════╗
║ ◀ X  Chi tiết         ║
╠════════════════════════╣
║                        ║
║ 🍔 Cơm trưa            ║  ← Description (icon + text)
║                        ║
║ 150.000 ₫              ║  ← Amount (large)
║                        ║
║ Danh mục: Ăn uống     ║
║ Ngày: 20/06/2026      ║
║ Giờ: 14:30            ║
║ Ghi chú: (trống)      ║  ← If any
║                        ║
╠════════════════════════╣
║                        ║
║ [✏️ Sửa]    [🗑️ Xóa]  ║  ← Actions
║                        ║
╠════════════════════════╣
│ 📊 📈 🎯 📋 ⚙️        ║
└────────────────────────┘
```

---

## 🎨 VISUAL HIERARCHY & SPACING

### Text Sizes & Colors
```
Hero Metric:        48px, bold, #000000 (primary color)
Section Header:     16px, semi-bold, #1a1a1a
Label:              12px, regular, #999999
Body text:          14px, regular, #333333
Secondary text:     13px, regular, #666666
Caption:            11px, regular, #999999
```

### Spacing
```
Top padding:        16px (safe area)
Bottom padding:     80px (for sticky button)
Horizontal padding: 16px (content sides)
Section margin:     12px (between cards)
Item padding:       12px (inside cards)
Button height:      56px (primary), 44px (secondary)
```

### Colors (from ZenX token system)
```
Primary metric:    --zx-accent (highlight)
Positive/up:       --zx-positive (#4CAF50)
Negative/down:     --zx-negative (#F44336)
Category badges:   Category emoji + background
Text soft:         --zx-text-soft (#999999)
Divider:           --zx-line (hairline)
```

---

## 📊 COMPARISON: Before vs After

| Element | Current (Desktop) | Proposed (Mobile) | Improvement |
|---------|-------------------|-------------------|------------|
| Dashboard metric | Small (16px) | Large (48px) | 3x easier to read |
| Categories visible | All 10 | Top 3 + expand | 70% less scroll |
| Primary action | Scroll to find | Sticky bottom | Always accessible |
| Transaction list | Pagination | Infinite scroll | Native mobile feel |
| Information per screen | Crowded (5+ sections) | Progressive (1-2 expanded) | Reduced cognitive load |
| Add transaction UX | Sidebar (cramped) | Fullscreen modal | Dedicated focus |
| Settings layout | All options visible | Tier 1 + collapsible | Cleaner, less overwhelming |

---

## 🚀 NEXT STEPS

1. **Review wireframes** — Do these match your vision?
2. **Validate with users** — Test prototypes in Figma (if you have designs)
3. **Refine based on feedback** — Iterate on spacing, colors, interactions
4. **Then → Implementation** — Code pages according to wireframes

**Questions for you:**
- Should we adjust any of the tier priorities?
- Any interaction patterns you'd like to add/remove?
- Should we prototype in Figma, or go straight to code?
