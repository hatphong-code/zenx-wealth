# Mobile UX Design Patterns — ZenX Wealth (Science-Based)
**Nghiên cứu các pattern tốt nhất cho ứng dụng tài chính trên mobile**

---

## 1️⃣ MOBILE-FIRST PRINCIPLES (Foundation)

### **1. Thumb Zone (Công thức vàng)**
```
       ╔═══════════════╗
       ║    HARD       ║  ← Khó với ngón cái (phải dùng cả tay)
       ║    (10%)      ║
   ╠═══╬═══════════════╬═══╣
   ║   ║               ║   ║
   ║EASY  EASY    EASY║   ║  ← Dễ - Vùng tự nhiên ngón cái
   ║(40%)║(40%)       ║   ║
   ╠═══╬═══════════════╬═══╣
       ║    HARD       ║
       ║    (10%)      ║  ← Khó - phía dưới cùng
       ╚═══════════════╝

→ RULE: CTA chính (+ Add) → phía dưới, vùng dễ tap
→ Destructive action (Delete) → khó tap (tránh misclick)
```

**Áp dụng vào ZenX:**
- ✅ `[+ Ghi giao dịch]` → **Sticky bottom** (EASY zone)
- ✅ Delete action → Menu, không visible (HARD zone)
- ✅ Primary info → Top ⅓ (nhìn dễ)

---

### **2. Progressive Disclosure (Không quá tải)**
```
ANTI-PATTERN (Dày đặc):
┌────────────────────┐
│ KPI 1  KPI 2 KPI 3 │  ← 3 metrics, đủ?
│ Chart 1 Chart 2    │  ← 2 charts?
│ List 1 (10 items)  │  ← 10 transactions?
│ List 2 (8 items)   │  ← 8 categories?
│ Card 1 Card 2      │  ← More?
│ Ad / Promo         │
└────────────────────┘
→ User overwhelmed, không biết tap cái nào

PATTERN (Tầng lớp):
┌────────────────────┐
│ [Main KPI]         │  ← Nhìn ngay
│ ┌──────────────┐   │
│ │ [Summary]    │   │  ← Secondary info (collapsible)
│ └──────────────┘   │
│ ┌──────────────┐   │
│ │ [Tap expand] │   │  ← Details on demand
│ └──────────────┘   │
│                    │
│  [All] [All]       │  ← Links to dedicated pages
└────────────────────┘
→ User sees 1 thing → can drill down
```

**Áp dụng vào ZenX:**
- ✅ Dashboard: 1 metric (số tiền) → Top
- ✅ Chart top 3 categories → Expandable để xem all 10
- ✅ Recent 5 transactions → Link "[Xem tất cả]" → Track page
- ✅ Hide: Latte, Recurring, Goals → Keep on dedicated pages

---

### **3. Speed of Recognition (Nhận diện nhanh)**
```
SLOW to recognize (Bad for mobile):
┌──────────────────┐
│ Title: Expenses  │  ← Text để hiểu
│ 2,340,000 ₫      │
│ 45% of budget    │
└──────────────────┘

FAST to recognize (Good for mobile):
┌──────────────────┐
│ 2,340,000 ₫      │  ← Number FIRST, lớn nhất
│ Ăn uống / tháng  │  ← Category + period, nhỏ hơn
│ 📉 ↑ 5% vs tuần  │  ← Trend icon, quick insight
│   cách           │
└──────────────────┘
→ Người dùng nhìn 1 giây → biết được info chính
```

**Áp dụng vào ZenX:**
- ✅ Số tiền lớn (40px+ font)
- ✅ Danh mục + period (12px font) dưới
- ✅ Trend icon (not text) để so sánh

---

### **4. Touch Target Size (Dễ tap)**
```
Minimum: 44x44 dp (iOS) / 48x48 dp (Android)
Comfortable: 56x56 dp+
Safe spacing: 8px between targets

ZenX buttons:
- [+ Ghi giao dịch]: 56px height, 100% width → Easy
- Category picker: 48px height, 60px width → Comfortable
- Delete/Edit icons: 40px (packaged in 56px cell) → OK
```

---

### **5. Feedback & Confirmation (User biết điều gì xảy ra)**

**Pattern - Immediate feedback:**
```
User action:        App response:
──────────────────────────────────────
1. Tap [+ Ghi]    → Form appears (0.3s animation)
2. Fill form      → Category picker opens (0.2s)
3. Tap Save       → Button shows spinner (0.2s)
                  → Toast appears: "Đã lưu" (2s)
                  → Form closes (0.3s)
                  → Dashboard refresh (lazy)

→ User sees EVERYTHING — không confused
```

---

## 2️⃣ MOBILE PATTERNS FOR FINANCE APPS

### **Pattern A: Dashboard Card (Primary Metric)**

```
┌─────────────────────────┐
│ Số tiền còn lại        │  ← Label (12px, soft text)
│                        │
│ 10.500.000 ₫           │  ← MAIN NUMBER (48px bold)
│ So với budget: 15 tr   │  ← Context (13px, secondary)
│                        │
│ [Ngân sách] [Chi tiết] │  ← Quick actions (secondary button size)
└─────────────────────────┘

👍 Pros:
  - Large, easy to read at a glance
  - Context in smaller text
  - Quick action buttons
  
❌ Cons if without context:
  - Unclear what "10.5 tr" means without label
```

**Mobile Version (ZenX):**
```
┌──────────────────┐
│ Tháng này        │  ← Label (11px, #999)
│                  │
│ 10,5 tr ₫        │  ← Number (36px bold, #000)
│                  │
│ Còn lại: 4,5 tr  │  ← Subtext (13px, #666)
│ (30% ngân sách)  │
│                  │
│ [Chi tiết] ▶     │  ← Quick link (tap → detail sheet)
└──────────────────┘
```

---

### **Pattern B: List with Progressive Disclosure**

```
┌─────────────────────────┐
│ CHI TIÊU THEO DANH MỤC  │
├─────────────────────────┤
│ 🍔 Ăn uống: 2.5 tr     │  ← Tap to expand
│   25% budget / +10% vs  │     or swipe for actions
│   tuần trước            │
├─────────────────────────┤
│ 🚗 Di chuyển: 1.2 tr   │
│   12% budget            │
├─────────────────────────┤
│ 🛒 Mua sắm: 1.8 tr     │
│   18% budget / -5% vs   │
└─────────────────────────┘
     ▼ [Xem 7 danh mục khác]
```

**When tapped (Expand state):**
```
┌─────────────────────────┐
│ 🍔 Ăn uống: 2.5 tr ▲   │  ← Collapse button
│ ────────────────────────│
│ • Hôm nay: Cơm - 150k  │  ← Recent txns
│ • Hôm qua: Cafe - 80k  │     in this category
│ • Hôm trước: Buffet..  │
│                        │
│ [Xem tất cả]           │  ← Go to filtered view
└─────────────────────────┘
```

---

### **Pattern C: Transaction List Item (Swipe Actions)**

```
NORMAL STATE:
┌─────────────────────────┐
│ 🍔 Cơm trưa             │  ← Icon + Description
│ 150.000 ₫  •  14:30    │  ← Amount + Time
│ Hôm nay                 │  ← Date grouping
└─────────────────────────┘

SWIPE LEFT:
┌──────────────────┬──────┐
│ 🍔 Cơm trưa      │ ✏️   │  ← Edit icon
│ 150.000 ₫        │ 🗑️   │  ← Delete icon
└──────────────────┴──────┘

SWIPE RIGHT:
┌──────┬──────────────────┐
│ 📌   │ 🍔 Cơm trưa      │  ← Pin/Flag icon
│      │ 150.000 ₫        │
└──────┴──────────────────┘

→ Supports swipe gesture from Phase 1.1!
```

---

### **Pattern D: Floating Action Button (FAB) vs Sticky Bottom Button**

```
MOBILE PATTERN (Choose ONE):

Option 1: Sticky Button (ZenX choice)
┌──────────────────────────┐
│ Dashboard content        │
│ (scrollable)            │
├──────────────────────────┤
│ [+ GHI GIAO DỊCH MỚI]   │  ← Always visible
│ (56px height, 100% width)│  ← Sticky when scroll
└──────────────────────────┘

👍 Better for: forms, transactions (heavy usage)
👎 Takes space

Option 2: FAB (Floating Action Button)
                  ┌──────┐
                  │  ➕  │  ← Float over content
                  └──────┘
┌──────────────────────────┐
│ Dashboard content        │
│ (scrollable)            │
└──────────────────────────┘

👍 Better for: galleries, feeds
👎 Can block content when scrolled
👎 Harder to discover at first

→ ZenX: Sticky Button (70% users want to add txn)
```

---

### **Pattern E: Modal vs Sheet vs Inline**

```
For "Add Transaction" form — which is best?

FULLSCREEN MODAL:
┌────────────────────────┐
│ ← Ghi giao dịch        │  ← Header + back
├────────────────────────┤
│ Số tiền: [input]       │
│ Danh mục: [picker]     │
│ Ngày: [date picker]    │
│ Ghi chú: [text area]   │
│ [Hủy]      [Lưu]       │
└────────────────────────┘

👍 Full focus, easy form fill
👎 Can't compare with recent txns

BOTTOM SHEET (Modal):
(Content slides up from bottom, 80% height)

👍 Can see previous txns behind (faded)
👎 Harder to dismiss on mobile

INLINE EXPANSION:
┌────────────────────────┐
│ Dashboard              │
├────────────────────────┤
│ [+ GHI GIAO DỊCH]      │  ← Tap expands to form below
├────────────────────────┤
│ ┌──────────────────────┤
│ │ Ghi giao dịch        │
│ │ Số tiền: [input]     │
│ │ ...                  │
│ │ [Hủy]  [Lưu]         │
│ └──────────────────────┤
└────────────────────────┘

👍 Simple, no new view
👎 Takes space, awkward flow

→ ZenX: FULLSCREEN MODAL for Add/Edit (dedicated focus)
```

---

### **Pattern F: Information Density per Screen**

```
IDEAL mobile screen structure:

┌──────────────────────────────┐ ↑
│ STATUS BAR (System)          │ Safe area
├──────────────────────────────┤ ↑ 20px
│ HEADER (Optional breadcrumb) │ 44px
├──────────────────────────────┤ ↑
│                              │
│ PRIMARY CONTENT              │
│ (1 main piece of info)       │ 60% viewport
│                              │
├──────────────────────────────┤ ↑
│ SECONDARY CONTENT            │
│ (1-2 expandable sections)    │ 25% viewport
│                              │
├──────────────────────────────┤ ↑
│ CTA BUTTON / Footer          │ 56px
└──────────────────────────────┘ ↓ Safe area

→ Scrollable only if content > 3 sections
→ Max scroll depth: 1200px (allow 2-3 scroll swipes)
```

---

## 3️⃣ APPLY TO ZENX: SCREEN-BY-SCREEN STRATEGY

### **Screen 1: Dashboard (Overview Hub)**

**Information Priority:**
```
1️⃣ PRIMARY (Tier 1):
   - Số tiền còn lại tháng này (HERO metric, 40px)
   - Context: So với budget, so với tháng trước

2️⃣ SECONDARY (Tier 2, Expandable):
   - Top 3 categories chart (bar chart, mini)
   - Recent 5 transactions (list, swipeable)

3️⃣ TERTIARY (Links, not content):
   - [Xem tất cả danh mục] → Track page
   - [Xem tất cả giao dịch] → Track page
   - [Latte Factor] → Insights page
   - [Goals progress] → Plan page
```

**Pattern: Sticky Bottom CTA**
```
[+ GHI GIAO DỊCH MỚI]  ← Always at bottom (56px)
Sticky when scrolling
```

---

### **Screen 2: Track Page (All Transactions)**

**Structure:**
```
1️⃣ FILTERS (Sticky header):
   [Tất cả] [Tháng này] [Tuần này] [Hôm nay]
   ↕ [Sắp xếp: Mới nhất]

2️⃣ TRANSACTIONS (Infinite scroll):
   ▼ HÔM NAY (3 items)
   • Cơm trưa - 150k (swipeable)
   • Café - 80k (swipeable)
   ▼ HÔM QUA (5 items)
   • Xăng - 500k
   ...

→ Swipe left: Edit/Delete menu
→ Swipe right: Pin/Flag
```

---

### **Screen 3: Add Transaction (Modal)**

**Fullscreen form:**
```
┌─────────────────────────────┐
│ ← Đóng  |  Ghi giao dịch   │  ← Header
├─────────────────────────────┤
│                             │
│ Số tiền                     │
│ [___________] ₫             │  ← Large input (40px height)
│                             │
│ Danh mục                    │
│ [🍔 Ăn uống ▼]             │  ← Category picker
│                             │
│ Ngày                        │
│ [📅 20/06/2026]             │  ← Date picker
│                             │
│ Ghi chú (tùy chọn)         │
│ [___________]               │
│                             │
│ [Hủy]        [Lưu]          │
│                             │
└─────────────────────────────┘
```

**UX Details:**
```
- Amount input: Auto-focus + numeric keyboard
- Category: Horizontal scroll with emoji
- Auto-save on blur (before tapping Save)
- Confirmation toast after save
```

---

### **Screen 4: Category Detail (On Demand)**

**When user taps category or "[Xem tất cả danh mục]":**
```
┌─────────────────────────────┐
│ ◀ Danh mục  |  Ăn uống     │
├─────────────────────────────┤
│ Tháng này: 2.500.000 ₫     │  ← Hero metric
│ 25% ngân sách              │
│ ↑ 10% so với tháng trước   │
├─────────────────────────────┤
│ [Đặt ngân sách] [Chi tiết]  │  ← Actions
├─────────────────────────────┤
│ GIAO DỊCH THÁNG NÀY:        │
│ • Hôm nay: Cơm - 150k      │
│ • Hôm qua: Cafe - 80k      │
│ ...                        │
│ [Xem tất cả]               │
└─────────────────────────────┘
```

---

### **Screen 5: Settings (Collapsed)**

**Mobile setting: Hide advanced**
```
┌─────────────────────────────┐
│ ⚙️ Cài đặt                  │
├─────────────────────────────┤
│ HIỂN THỊ                    │
│ • Theme: [Light] [Dark]     │  ← Toggle
│ • Ngôn ngữ: [Tiếng Việt]   │
│ • Đơn vị tiền: [₫]          │
├─────────────────────────────┤
│ THÔNG BÁO                   │
│ • Bật thông báo: [Toggle]   │
├─────────────────────────────┤
│ [▼ More options]            │  ← Expandable
│                             │
│ ⓘ Tất cả cài đặt khác      │
│   ở đây (account, data...)  │
└─────────────────────────────┘
```

---

## 4️⃣ COMPARISON: Current vs Proposed

| Aspect | Current Desktop (Shrunk) | Proposed Mobile |
|--------|--------------------------|-----------------|
| **Dashboard primary metric** | "Số tiền" small + context crowded | ONE big number, context below |
| **Information density** | 2-column → 1 column (still densa) | Progressive disclosure, expandable |
| **Categories on dashboard** | All 10 visible + chart | Top 3 + "[Xem 7 khác]" |
| **Transactions** | Pagination | Infinite scroll |
| **Add transaction** | Sidebar (small screen awkward) | Fullscreen modal (focus) |
| **Primary action button** | Not visible until scroll | Sticky bottom (always accessible) |
| **Settings** | All options visible | Tier 1 visible, rest collapsed |
| **Swipe support** | Not designed for | Swipe left/right actions |

---

## 5️⃣ MOBILE OPTIMIZATION CHECKLIST

### **Layout & Spacing**
- [ ] Single column layout on mobile
- [ ] Thumb-zone CTA (bottom sticky)
- [ ] 16px padding on sides (content breathing room)
- [ ] 8px/12px spacing between sections
- [ ] Max content width: 100% (no desktop max-w-5xl)

### **Typography**
- [ ] Primary metric: 36-48px (easily readable)
- [ ] Section headers: 16-18px
- [ ] Body text: 14-16px
- [ ] Labels: 12-13px (secondary info)
- [ ] Line height: 1.5 (readability)

### **Touch Targets**
- [ ] Buttons: 48x48dp minimum (56px comfortable)
- [ ] List items: 56px height (comfortable tap)
- [ ] Icon buttons: 44x44dp (with 8px padding)
- [ ] Spacing between targets: 8px minimum

### **Interactions**
- [ ] No hover states (not applicable on touch)
- [ ] Focus ring visible on keyboard navigation (edge case)
- [ ] 0.3s animation on state change (not jarring)
- [ ] Immediate feedback (spinner, toast) on action
- [ ] Swipe gesture support (left/right actions)

### **Performance**
- [ ] Above-the-fold load: < 2s
- [ ] Images: lazy-load (below fold)
- [ ] Animations: 60fps (no jank)
- [ ] No animation if `prefers-reduced-motion`

### **Forms**
- [ ] Input fields: 40px+ height
- [ ] One column (no multi-column on mobile)
- [ ] Clear labels (not just placeholders)
- [ ] Proper keyboard type (numeric, email, etc.)
- [ ] Auto-advance to next field (when logical)

---

## 📋 SUMMARY: Mobile Design Principles for ZenX

**Core Rules:**
1. **Progressive Disclosure** — Show 1 thing, tap to drill down
2. **Thumb Zone** — CTA at bottom, important info at top ⅓
3. **Speed of Recognition** — Large numbers, icon + label
4. **Feedback** — Toast, spinner, animation on every action
5. **Touch Targets** — 48px minimum, 56px comfortable
6. **Information Density** — Max 3 sections per screen
7. **Swipe Support** — Left/right actions on lists (leverage Phase 1.1)
8. **Sticky CTA** — Primary action always reachable

**When done right:**
```
User opens app → Sees 1 big number (budget)
          ↓
User taps [+ Add] → Form full-screen, focused
          ↓
User fills form → Auto-keyboard, clear steps
          ↓
User taps Save → Toast confirms, form closes
          ↓
Dashboard updates → User satisfied in < 2 minutes
```
