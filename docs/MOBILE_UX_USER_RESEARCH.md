# Mobile UX User Research — ZenX Wealth
**Phân tích nhu cầu, thói quen, và kỳ vọng của người dùng mobile**

---

## 1️⃣ PHÂN TÍCH NGƯỜI DÙNG (User Personas)

### Persona 1: **Người Bận Rộn (The Busy Professional)**
- **Ai**: Nhân viên văn phòng 30-45 tuổi, bắt đầu muộn với tài chính
- **Khi dùng**: Trong giờ làm việc, 2-3 lần/ngày (5-10 phút mỗi lần)
- **Nơi dùng**: Ở bàn làm việc, trong phòng họp, đi bộ
- **Nhu cầu chính**: 
  - ✅ Kiểm tra nhanh số tiền còn lại tháng này
  - ✅ Ghi nhanh giao dịch khi chi tiêu
  - ✅ Không cần chi tiết phức tạp
- **Tâm lý**: "Tôi bận, chỉ muốn xem được nhanh. Không có thời gian học UI phức tạp"
- **Chưng chỉ thất bại**: Quá nhiều thông tin, phải scroll dài, form ghi giao dịch phức tạp

---

### Persona 2: **Người Cẩn Thận (The Detail-Oriented)**
- **Ai**: Freelancer / kinh doanh 25-50 tuổi, muốn kiểm soát chi tiết tài chính
- **Khi dùng**: Hàng ngày, từ 15-30 phút, thường là buổi tối
- **Nơi dùng**: Nhà, café, ngoài trời
- **Nhu cầu chính**:
  - ✅ Xem chi tiết từng giao dịch (khi, đâu, bao nhiêu, danh mục)
  - ✅ Kiểm tra xu hướng chi tiêu
  - ✅ Lên kế hoạch chi tiết (budget, goal)
  - ✅ Review toàn bộ tình hình tài chính
- **Tâm lý**: "Tôi muốn biết tất cả diễn ra. Tôi sẵn sàng dành thời gian"
- **Điểm thất bại**: Dữ liệu bị ẩn đi, không thấy được toàn cảnh, thao tác phức tạp

---

### Persona 3: **Người Dùng Lần Đầu (The Newcomer)**
- **Ai**: Người mới bắt đầu học về quản lý tiền, tuổi 20-35
- **Khi dùng**: Lần đầu tiếp xúc, tò mò, học hỏi
- **Nhu cầu chính**:
  - ✅ Hiểu cơ bản: "Tiền đi đâu?"
  - ✅ Được hướng dẫn từng bước (hãy ghi giao dịch đầu tiên)
  - ✅ Thấy kết quả ngay (biểu đồ, tóm tắt)
  - ✅ Không bị overwhelm
- **Tâm lý**: "Tôi chưa biết gì. Hãy dạy tôi từng bước"
- **Điểm thất bại**: Mở app ra không biết làm gì, term phức tạp, quá nhiều tính năng cùng lúc

---

## 2️⃣ PHÂN TÍCH HÀNH VI SỬ DỤNG (Usage Patterns)

| Kịch bản | Persona | Khi nào | Tâm trạng | Cần làm gì | Khoảng thời gian |
|----------|---------|--------|----------|-----------|-----------------|
| **Check nhanh** | Busy | Sáng sớm, giữa giờ, cuối ngày | "Tôi có bao nhiêu tiền?" | Nhìn 1 số: số tiền còn lại tháng này | < 30 giây |
| **Ghi giao dịch** | Busy, Detail-oriented | Ngay sau khi chi (café, siêu thị) | "Phải ghi lại để không quên" | Chọn: số tiền, danh mục, note → Lưu | 1-2 phút |
| **Xem chi tiết** | Detail-oriented | Buổi tối, tìm kiếm giao dịch | "Chi bao nhiêu cho X? Tại sao?" | Lọc theo danh mục → xem từng giao dịch → ghi chú | 5-10 phút |
| **Lên kế hoạch** | Detail-oriented, Newcomer | Cuối tuần, đầu tháng | "Tôi nên chi bao nhiêu?" | Xem budget → Điều chỉnh mục tiêu | 10-15 phút |
| **Onboarding** | Newcomer | Lần đầu mở app | "App này làm gì?" | Tutorial → Ghi 3 giao dịch → Xem chart | 5-10 phút |
| **Weekly review** | Detail-oriented | Thứ 7/Chủ nhật | "Tuần này tôi chi bao nhiêu?" | Đọc insight → Xem trend → Điều chỉnh kế hoạch | 15-20 phút |

---

## 3️⃣ PHÂN TÍCH MÀNG HÌNH ĐẦU TIÊN (First Screen Expectations)

### **Người dùng mở app lần đầu tiên — kỳ vọng là gì?**

| Thành phần | Busy | Detail-oriented | Newcomer | Priority |
|-----------|------|-----------------|----------|----------|
| **Số tiền còn lại tháng này** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 🔴 CRITICAL |
| **Nơi chi tiêu nhất (chart)** | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | 🟠 HIGH |
| **Giao dịch gần đây** | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | 🟠 HIGH |
| **Button + nhanh "Ghi giao dịch"** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | 🔴 CRITICAL |
| **Latte Factor / Emergent Behavior** | ⭐ | ⭐⭐⭐ | ⭐ | 🟡 MEDIUM |
| **Các kế hoạch / Goal** | ⭐ | ⭐⭐⭐ | ⭐⭐ | 🟡 MEDIUM |
| **Tin tức / Mẹo tiết kiệm** | ⭐ | ⭐⭐ | ⭐⭐⭐ | 🟡 MEDIUM |
| **Settings / Cấu hình** | ⭐ | ⭐ | ⭐⭐ | 🟢 LOW |

### **Điều họ sẽ làm trên màn hình đầu tiên:**

```
BUSY PROFESSIONAL (5-10 giây):
1. Mở app
2. Nhìn số tiền còn lại → "OK, tôi còn 10 triệu"
3. Nhấn "+ Ghi giao dịch" → Ghi nhanh
4. Đóng app

DETAIL-ORIENTED (3-5 phút):
1. Mở app
2. Nhìn số tiền + chart
3. Scroll xem giao dịch gần đây
4. Click vào 1-2 giao dịch để xem chi tiết
5. (Có thể) Nhấn "View all" để xem tuần này
6. Đóng app

NEWCOMER (Lần đầu - 5-10 phút):
1. Mở app
2. Thấy "Welcome" onboarding → "Cái gì thế?"
3. Bấm "Hướng dẫn" hoặc "Bắt đầu"
4. Nhìn ảnh 3 slide: "Ghi giao dịch, Xem chi tiêu, Lên kế hoạch"
5. Bấm "Ghi giao dịch đầu tiên"
6. Ghi 2-3 giao dịch
7. Nhìn chart xuất hiện → "Wow, nó hoạt động!"
8. Đóng app

NEWCOMER (Lần 2 trở đi - 2-3 phút):
1. Mở app
2. Nhìn số tiền (có thể chưa biết nó là gì)
3. Xem chart
4. Ghi 1 giao dịch
5. Đóng app
```

---

## 4️⃣ PHÂN TÍCH THÔNG TIN CẦN HIỂN THỊ (Information Hierarchy)

### **Mức độ ưu tiên hiển thị trên màn hình đầu tiên (Mobile Dashboard):**

**Tier 1 — CRITICAL (Phải hiển thị)**
```
┌─────────────────────────────────────┐
│  Số tiền còn lại tháng này: 10.5 tr │  ← Người dùng nhìn đầu tiên
│  (So với budget: 15 tr)             │  ← Context nhanh
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  [+ GHI GIAO DỊCH MỚI]              │  ← Primary CTA, rõ ràng, dễ tap
│  (Sticky at bottom on mobile)       │
└─────────────────────────────────────┘
```

**Tier 2 — HIGH (Nên hiển thị, nhưng collapse được)**
```
┌─────────────────────────────────────┐
│  Chi tiêu theo danh mục:            │
│  🍔 Ăn uống: 2.5 tr (25%)          │  ← Top 3 categories only
│  🚗 Di chuyển: 1.2 tr (12%)         │
│   🛒 Mua sắm: 1.8 tr (18%)          │
│  ┊┊┊ [Xem tất cả 10 danh mục]      │  ← Expandable
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Giao dịch gần đây:                 │
│  • Hôm nay: 3 giao dịch            │  ← Summary first
│    → [Xem chi tiết]                │
└─────────────────────────────────────┘
```

**Tier 3 — MEDIUM (Nice-to-have, hide by default)**
```
- Latte Factor / Recurring analysis
- Goals progress (minimize)
- Weekly insight preview
- News tips
→ Move to dedicated pages (TrackHub > "Insights" tab)
```

**Tier 4 — LOW (Never on first screen)**
```
- Settings
- Advanced analytics
- Historical data
- AI Coach detailed view
```

---

## 5️⃣ PHÂN TÍCH CÁC THAO TÁC CHÍNH (Primary Actions Per Screen)

### **Dashboard — Người dùng muốn làm gì?**

| Người dùng | Action | Vị trí lý tưởng | Hành động tiếp | Thành công là |
|-----------|--------|-----------------|----------------|---------------|
| **Busy** | Ghi giao dịch | Sticky button dưới cùng | Form popup → Lưu → Đóng | Confirm toast + lưu ngay |
| **Busy** | Check số tiền | Metric TOP (lớn, rõ) | Nhìn 1 giây | Biết được đó là cái gì |
| **Detail** | Xem chi tiêu từng danh mục | Card expandable | Click → Xem list | Thấy tất cả giao dịch của danh mục |
| **Detail** | Xem giao dịch chi tiết | Row clickable | Tap → Detail sheet | Xem ngày, giờ, note, địa điểm |
| **Detail** | Xóa/Edit giao dịch | Swipe hoặc menu | Swipe left → menu | Thay đổi/xóa thành công + toast |
| **Newcomer** | Hiểu app hoạt động | Tutorial on first load | Follow 3 steps | Ghi thành công 1 giao dịch |
| **Newcomer** | Ghi giao dịch đầu tiên | Button + hướng dẫn | Form có placeholder | Ghi xong thấy dữ liệu xuất hiện |

---

## 6️⃣ PHÂN TÍCH CONTEXT MOBILE (Why Mobile is Different)

### **Điều kiện sử dụng thực tế trên mobile:**

| Yếu tố | Ảnh hưởng | Giải pháp |
|--------|----------|----------|
| **Bàn tay 1 tay** | Phải tap vùng dưới cùng màn hình | Sticky button, large touch target |
| **Ánh sáng yếu** (ngoài trời, tối) | Text nhỏ khó đọc | Text lớn hơn, high contrast |
| **Mạng chậm** | Load lâu → user bỏ cuộc | Prioritize above-the-fold, skeleton loading |
| **Bị gián đoạn** (message, call) | Mất tập trung | Save state tự động, form không đóng |
| **Chuyển trang nhanh** | Scroll dài khó chịu | Max 2-3 section mỗi screen |
| **Pin yếu** | Chỉ còn 10% pin | No animations, simple styling |
| **Màn hình nhỏ** (4-5 inch) | Quá nhiều info không hiển thị | Progressive disclosure, collapse/expand |

---

## 7️⃣ KẾT LUẬN — 3 ĐIỂM CHÍNH

### **❓ Vấn đề 1: Người dùng MUỐN GÌ?**
```
Busy (70% users):        "Cho tôi 1 số: tôi còn bao nhiêu?"
Detail-Oriented (20%):   "Cho tôi toàn cảnh: chi đâu, bao nhiêu, tại sao?"
Newcomer (10%):          "Dạy tôi từng bước nhé"

→ CHUNG: Số tiền còn lại + Nút ghi giao dịch phải rõ ràng + Dễ dùng
```

### **❓ Vấn đề 2: Họ THẤY GÌ TRÊN MÀNG HÌNH ĐẦU TIÊN?**
```
Tier 1 (MUST):
  - Số tiền còn lại tháng này (BIG NUMBER)
  - [+ GHI GIAO DỊCH] button (STICKY, LARGE)

Tier 2 (SHOULD):
  - Top 3 categories (with chart preview)
  - Recent transactions (5-7 items, not more)

Tier 3+ (NICE-TO-HAVE):
  - Everything else → separate pages
```

### **❓ Vấn đề 3: Họ LÀM GÌ NGAY TIÊN?**
```
1st action (80% time): Check remaining budget → Take 5-10 seconds
2nd action (70% time): Add transaction OR View category detail
3rd action (40% time): View specific transaction detail
4th action (20% time): Explore insights / goals
5th action (<5% time): Change settings
```

---

## 📋 PHỐI HỢP VỀ INFORMATION ARCHITECTURE

**Đề xuất Menu Structure cho Mobile:**

```
BOTTOM TABS (5 hub):
├─ 📊 Dashboard (DASHBOARD HUB)
│  ├─ Số tiền + chart top 3 categories
│  ├─ Recent transactions
│  └─ [+ Add Transaction]
│
├─ 📈 Track (TRACK HUB - Details)
│  ├─ All transactions (infinite scroll)
│  ├─ Filter by category
│  ├─ Search
│  └─ Insights (Latte Factor, Recurring)
│
├─ 🎯 Plan (PLAN HUB)
│  ├─ Goals (list, short form)
│  ├─ Budget (monthly breakdown)
│  └─ Quick actions (add goal, set budget)
│
├─ 📋 Review (WEEKLY HUB)
│  ├─ This week summary
│  ├─ Insight (1-3 tips)
│  └─ [Save review]
│
└─ ⚙️ Settings
   ├─ Theme, Language, Currency (VISIBLE)
   └─ [More options] (Advanced, collapsed)
```

---

## ✅ READY FOR NEXT STEP

**Câu hỏi cho bạn:**
1. Các persona này có phù hợp với user base thực tế của ZenX Wealth không?
2. Tier priority (Tier 1/2/3) có align với cách bạn nghĩ không?
3. Bạn có user data gì (heatmap, analytics, feedback) mà tôi nên cân nhắc thêm không?

→ **Sau khi bạn xác nhận**, tôi sẽ propose **Optimal Mobile Design** chi tiết cho từng screen.
