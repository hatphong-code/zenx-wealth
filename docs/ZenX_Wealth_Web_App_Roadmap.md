# ZenX Wealth — LateStart Wealth OS

**Tagline:** Start Late. Build System. Finish Free.  
**Tiếng Việt:** Khởi đầu muộn. Xây hệ thống. Kết thúc tự do.

---

## 1. Mục đích sản phẩm

**ZenX Wealth** là một web app hiện thực hóa tinh thần của hành trình **“Khởi đầu muộn màng, kết thúc giàu sang”** thành một hệ thống tài chính cá nhân có thể vận hành hằng ngày.

App không chỉ là công cụ ghi chép chi tiêu. Đây là một **Personal Wealth Operating System** dành cho người bắt đầu lại tài chính ở tuổi trung niên, sau biến cố, sau giai đoạn chưa tích sản đủ, hoặc sau nhiều năm chưa có hệ thống tài chính rõ ràng.

Mục tiêu của app:

> Biến triết lý Latte Factor, Pay Yourself First, quỹ dự phòng, tích sản tự động, tăng thu nhập và quản trị rủi ro thành một hệ thống tài chính cá nhân vận hành hằng ngày.

App giúp người dùng trả lời 5 câu hỏi mỗi ngày:

1. Tiền của tôi đang đi đâu?
2. Tôi đang rò rỉ bao nhiêu qua Latte Factor?
3. Tôi đã trả cho mình trước chưa?
4. Quỹ dự phòng của tôi đang đủ mấy tháng?
5. Tôi có đang tiến gần hơn đến tự do tài chính không?

---

## 2. Định vị sản phẩm

### Core positioning

```text
A personal finance operating system for people rebuilding wealth with discipline, automation, and intelligent cash flow design.
```

Bản tiếng Việt:

```text
Hệ điều hành tài chính cá nhân dành cho người bắt đầu lại, tập trung vào kiểm soát dòng tiền, giảm rò rỉ, tự động tích sản và xây dựng tự do tài chính.
```

### Product idea

App này không chỉ ghi lại tiền vào và tiền ra. App phải dẫn dắt người dùng đi qua toàn bộ hành trình:

```text
Track money
→ Detect leakage
→ Convert leakage
→ Build emergency fund
→ Pay yourself first
→ Increase income
→ Control risk
→ Review weekly
→ Build wealth roadmap
```

### Nguyên tắc sản phẩm

| Nguyên tắc | Ý nghĩa trong app |
|---|---|
| Latte Factor | Phát hiện các khoản chi nhỏ lặp lại nhưng làm rò rỉ tài sản |
| Pay Yourself First | Trích tiền cho tương lai trước khi chi tiêu |
| Start Late | Chấp nhận xuất phát muộn nhưng có roadmap bắt kịp |
| Finish Rich | Xây tài sản, dòng tiền và quyền tự do lựa chọn |
| Automation | Giảm phụ thuộc vào cảm xúc và ý chí |
| Reduce Debt | Kiểm soát nợ xấu |
| Earn More | Tăng thu nhập chủ động |
| Invest More | Tích sản dài hạn |
| Protect Yourself | Quỹ dự phòng và giới hạn rủi ro |
| Stay Accountable | Review hằng tuần |

---

## 3. Cấu trúc tổng thể app

App nên có 8 module chính:

```text
1. Dashboard
2. Cash Flow
3. Latte Factor
4. Pay Yourself First
5. Emergency Fund
6. Debt Control
7. Income Builder
8. Wealth Roadmap
```

Có thể thêm module nâng cao:

```text
9. Trading Risk
10. AI Coach
11. Weekly Review
12. Reports
```

---

## 4. Sitemap / Navigation

### Cấu trúc menu đầy đủ

```text
Dashboard
Cash Flow
Latte Factor
Pay Yourself First
Emergency Fund
Debt
Income Builder
Invest / Assets
Trading Risk
Roadmap
Weekly Review
Settings
```

### Navigation mobile-first

Trên smartphone nên gom lại thành 5 tab chính:

```text
Home
Track
Plan
Review
Profile
```

| Tab | Chức năng |
|---|---|
| Home | Dashboard tổng quan |
| Track | Ghi thu nhập, chi tiêu, Latte Factor |
| Plan | Quỹ dự phòng, tích sản, nợ, roadmap |
| Review | Weekly review, monthly report |
| Profile | Thiết lập mục tiêu, tài khoản, category |

---

## 5. Dashboard chính

Dashboard là màn hình quan trọng nhất.

Dashboard phải trả lời ngay:

```text
Tài sản ròng hiện tại là bao nhiêu?
Tháng này thu bao nhiêu?
Tháng này chi bao nhiêu?
Đã trả cho mình trước chưa?
Latte Factor tháng này là bao nhiêu?
Quỹ dự phòng đủ mấy tháng?
Tỷ lệ tiết kiệm là bao nhiêu?
Trading/rủi ro cao có vượt giới hạn không?
```

### Dashboard card layout

```text
[Net Worth]
Tài sản ròng hiện tại

[Monthly Cash Flow]
Thu nhập - Chi tiêu = Dòng tiền ròng

[Latte Factor]
Khoản rò rỉ tháng này

[Pay Yourself First]
Đã chuyển vào quỹ/tích sản

[Emergency Fund]
Đủ 2.4 / 6 tháng

[Savings Rate]
Tỷ lệ tiết kiệm 28%

[Debt Status]
Nợ xấu còn lại

[Roadmap Progress]
Giai đoạn hiện tại: Stabilize
```

### Home Dashboard MVP

```text
Good morning, HP

Net Cash Flow
+8.500.000 VND

Latte Factor
3.200.000 VND this month

Emergency Fund
2.4 / 6 months

Pay Yourself First
67% completed

This Week Action
Reduce eating out by 500.000 VND
Move 2.000.000 VND to emergency fund
```

---

## 6. Module Cash Flow

### Mục tiêu

Ghi nhận toàn bộ dòng tiền vào và ra.

### Income data

```text
Nguồn thu
Số tiền
Ngày nhận
Loại thu nhập
Ghi chú
```

Loại thu nhập:

```text
Salary
Consulting
Trading Profit
Business
Freelance
Investment
Other
```

### Expense data

```text
Khoản chi
Số tiền
Ngày chi
Danh mục
Có phải Latte Factor không?
Có lặp lại không?
Ghi chú
```

Danh mục chi:

```text
Housing
Food
Coffee / Drinks
Transport
Family
Health
Training
Learning
Tools
Subscriptions
Shopping
Debt Payment
Trading Cost
Business Cost
Other
```

### Add Transaction screen

```text
Amount
Type: Income / Expense
Category
Date
Latte Factor: Yes / No
Recurring: Yes / No
Note
```

---

## 7. Module Latte Factor

Đây là module linh hồn của app.

### Mục tiêu

Biến các khoản chi nhỏ lặp lại thành vốn tích sản.

### 7.1. Detect Latte Factor

App cho phép đánh dấu một khoản chi là:

```text
Latte Factor: Yes / No
```

Hoặc phân loại sâu hơn:

```text
Unnecessary
Too frequent
Emotional spending
Subscription waste
Convenience spending
Trading leakage
```

### 7.2. Latte Factor Score

App tính điểm:

```text
Latte Factor tháng này = Tổng chi Latte Factor
Latte Factor Daily Average = Tổng Latte Factor / số ngày
Latte Factor Annualized = Latte Factor tháng x 12
```

Ví dụ:

```text
Latte Factor tháng này: 5.800.000
Trung bình mỗi ngày: 193.000
Nếu duy trì 12 tháng: 69.600.000
```

### 7.3. Convert to Wealth

Mỗi khoản Latte Factor cắt được sẽ chuyển sang:

```text
Emergency Fund
Long-term Investment
Debt Payment
Business Fund
Learning Fund
```

### 7.4. UI đề xuất

```text
Latte Factor This Month

Total Leakage: 5.800.000 VND
Daily Average: 193.000 VND
Annual Impact: 69.600.000 VND

Top Leakage:
1. Coffee / Drinks: 1.800.000
2. Eating out: 1.600.000
3. Subscriptions: 900.000
4. Shopping: 1.500.000

Action:
[Convert 3.000.000 to Emergency Fund]
```

### 7.5. Latte Factor screen MVP

```text
This month leakage
Top categories
Annualized impact
Suggested conversion
```

---

## 8. Module Pay Yourself First

### Mục tiêu

Tự động hóa nguyên tắc: có thu nhập là trích trước cho tương lai.

### 8.1. Cấu hình phân bổ

Người dùng thiết lập tỷ lệ:

```text
Income Allocation Rule

Living: 55%
Emergency Fund: 15%
Long-term Asset: 15%
Business / Learning: 10%
High Risk / Trading: 5%
```

Khi nhập thu nhập, app tự đề xuất phân bổ.

Ví dụ thu nhập 40.000.000 VND:

| Nhóm | Tỷ lệ | Số tiền |
|---|---:|---:|
| Sinh hoạt | 55% | 22.000.000 |
| Quỹ dự phòng | 15% | 6.000.000 |
| Tích sản | 15% | 6.000.000 |
| Học tập / kinh doanh | 10% | 4.000.000 |
| Trading / rủi ro cao | 5% | 2.000.000 |

### 8.2. Trạng thái

```text
Pay Yourself First Status

This month:
Required: 12.000.000
Done: 8.000.000
Remaining: 4.000.000

Progress: 67%
```

---

## 9. Module Emergency Fund

### Mục tiêu

Theo dõi quỹ dự phòng theo số tháng chi phí sống.

### Công thức

```text
Emergency Fund Months = Emergency Fund Balance / Monthly Essential Expense
```

Ví dụ:

```text
Quỹ hiện có: 80.000.000
Chi phí sống cơ bản: 25.000.000/tháng
Emergency Fund = 3.2 tháng
```

### Milestone

```text
Stage 1: 1 month
Stage 2: 3 months
Stage 3: 6 months
Stage 4: 12 months
```

### UI

```text
Emergency Fund

Current: 80.000.000 VND
Monthly Essential Expense: 25.000.000 VND
Coverage: 3.2 months
Target: 6 months = 150.000.000 VND

Remaining: 70.000.000 VND
Estimated months to target: 12 months
```

### Emergency Fund screen MVP

```text
Current balance
Monthly essential expense
Target months
Progress bar
```

---

## 10. Module Debt Control

### Mục tiêu

Không để nợ xấu phá hệ thống tài chính.

### Dữ liệu

```text
Debt name
Total amount
Interest rate
Minimum payment
Due date
Debt type
Priority
```

Debt type:

```text
Credit Card
Consumer Loan
Personal Loan
Business Loan
Mortgage
Asset Loan
Other
```

### Priority logic

App tự đánh giá:

```text
High interest debt = ưu tiên trả nhanh
Low interest productive debt = theo dõi
Unknown debt = cần phân loại
```

### UI

```text
Debt Overview

Total Debt: 120.000.000
Bad Debt: 60.000.000
Monthly Payment: 8.000.000
Debt Payoff Progress: 35%

Suggested Action:
Pay extra 3.000.000/month to high-interest loan.
```

---

## 11. Module Income Builder

Đây là phần rất quan trọng với người “khởi đầu muộn”. Không chỉ tiết kiệm. Phải tăng thu nhập.

### Nhánh thu nhập

```text
Main Job
Consulting
Freelance
Trading
Business
Digital Product
Investment Income
Other
```

### Income Goal

```text
Current monthly income: 40.000.000
Target monthly income: 60.000.000
Gap: 20.000.000
```

### Action Plan

Mỗi nguồn thu có pipeline riêng:

```text
Idea
Validation
First Client
Repeatable
Systemized
Scaled
```

Ví dụ:

```text
Consulting income

Target: 10.000.000/month
Status: Validation
Next action:
- Create service offer
- Identify 10 potential clients
- Send 3 proposals this week
```

---

## 12. Module Trading Risk

Vì có trading, app nên có module này nhưng phải đặt đúng vai trò: **rủi ro cao, không phải nền móng tài chính**.

### Chức năng

```text
Trading Capital
Daily Max Loss
Weekly Max Loss
Monthly Drawdown Limit
Profit Withdrawal Rule
```

### Rule gợi ý

```text
Trading Capital = chỉ dùng vốn rủi ro
Daily Loss Limit = 3% trading capital
Weekly Loss Limit = 8%
Monthly Loss Limit = 15%
Profit Withdrawal = rút 30–50% lợi nhuận mỗi tuần/tháng
```

### UI

```text
Trading Risk Monitor

Capital: 10.000.000
Today P&L: -250.000
Daily Risk Used: 2.5%
Limit: 3%

Status: Caution
Action: Stop trading if loss reaches 300.000
```

---

## 13. Module Wealth Roadmap

### Giai đoạn trong app

```text
Phase 0 — Reset
Phase 1 — Audit
Phase 2 — Stabilize
Phase 3 — Build Base
Phase 4 — Accelerate
Phase 5 — Expand
Phase 6 — Financial Freedom System
```

### Phase 0 — Reset

Điều kiện hoàn thành:

```text
Đã nhập tài sản
Đã nhập nợ
Đã nhập chi phí sống
Đã nhập thu nhập
Đã xác định mục tiêu 12 tháng
```

### Phase 1 — Audit

```text
Ghi chi tiêu đủ 30 ngày
Xác định Latte Factor
Biết savings rate
Biết cash flow
```

### Phase 2 — Stabilize

```text
Có dòng tiền dương
Không tạo nợ xấu mới
Tách tài khoản
Quỹ dự phòng đạt 1 tháng
```

### Phase 3 — Build Base

```text
Quỹ dự phòng đạt 3 tháng
Tích sản tự động
Có nguồn thu phụ đầu tiên
```

### Phase 4 — Accelerate

```text
Quỹ dự phòng đạt 6 tháng
Savings rate 30%+
Có ít nhất 2 nguồn thu
```

### Phase 5 — Expand

```text
Quỹ dự phòng đạt 12 tháng
Có tài sản đầu tư dài hạn
Có 3 nguồn thu
```

---

## 14. Module Weekly Review

Mỗi tuần app yêu cầu người dùng review 10 câu:

```text
1. Tuần này tôi kiếm được bao nhiêu?
2. Tuần này tôi tiêu bao nhiêu?
3. Tôi đã trả cho mình trước chưa?
4. Latte Factor lớn nhất là gì?
5. Khoản nào cần cắt?
6. Khoản nào nên giữ vì tạo giá trị?
7. Quỹ dự phòng tăng hay giảm?
8. Trading có tuân thủ risk không?
9. Tôi có hành động nào để tăng thu nhập?
10. Tuần sau tôi cần làm 1 việc gì quan trọng nhất?
```

### Weekly Score

App tính điểm:

```text
Cash Flow Score
Latte Factor Score
Saving Score
Emergency Fund Score
Debt Score
Income Builder Score
Trading Discipline Score
```

Tổng hợp thành:

```text
Wealth Discipline Score: 72/100
```

### Weekly Review screen MVP

```text
Income this week
Expense this week
Latte Factor
Savings
One lesson
One action next week
```

---

## 15. Module AI Coach

Đây là module nâng cấp rất phù hợp với ZenX.

### AI Coach làm gì?

AI không cần thay người dùng quyết định. AI nên đóng vai trò:

```text
Phân tích dòng tiền
Phát hiện Latte Factor
Gợi ý cắt giảm
Nhắc Pay Yourself First
Đánh giá rủi ro trading
Đề xuất hành động tăng thu nhập
Tạo weekly insight
Tạo monthly report
```

Ví dụ output:

```text
Tháng này Latte Factor của bạn tăng 22% so với tháng trước.
Khoản tăng mạnh nhất là ăn ngoài và cà phê.

Nếu giảm 35% hai nhóm này, bạn có thể chuyển thêm 2.400.000 VND vào quỹ dự phòng.

Với tốc độ hiện tại, bạn cần 11 tháng để đạt quỹ dự phòng 6 tháng.
Nếu tăng thêm 3.000.000 VND/tháng từ consulting, thời gian giảm còn 7 tháng.
```

---

## 16. Data Model đề xuất

Nếu dùng Firebase Firestore, schema có thể như sau:

```text
users/{userId}
  profile
  settings
  financialGoals

users/{userId}/transactions/{transactionId}
  type: income | expense | transfer
  amount
  category
  date
  note
  isLatteFactor
  isRecurring
  source
  createdAt

users/{userId}/accounts/{accountId}
  name
  type
  balance
  purpose
  createdAt

users/{userId}/debts/{debtId}
  name
  totalAmount
  remainingAmount
  interestRate
  minimumPayment
  dueDate
  debtType
  priority

users/{userId}/incomeSources/{sourceId}
  name
  type
  monthlyTarget
  currentMonthlyAmount
  status
  nextAction

users/{userId}/emergencyFund/{recordId}
  balance
  monthlyEssentialExpense
  targetMonths
  updatedAt

users/{userId}/roadmap/{phaseId}
  phase
  status
  checklist
  completedAt

users/{userId}/weeklyReviews/{reviewId}
  weekStart
  weekEnd
  income
  expense
  latteFactorTotal
  savingsRate
  emergencyFundMonths
  notes
  aiInsight

users/{userId}/tradingRisk/{recordId}
  capital
  dailyMaxLoss
  weeklyMaxLoss
  monthlyMaxLoss
  pnl
  riskStatus
```

---

## 17. MVP nên làm trước

Không nên làm quá lớn ngay.

### MVP Version 1

Chỉ cần 5 màn hình:

```text
1. Dashboard
2. Add Transaction
3. Latte Factor
4. Emergency Fund
5. Weekly Review
```

### MVP Features

```text
Đăng nhập
Nhập thu nhập
Nhập chi tiêu
Đánh dấu Latte Factor
Tính tổng thu/chi tháng
Tính savings rate
Tính quỹ dự phòng theo tháng
Tạo weekly review
Dashboard tổng quan
```

### Chưa cần làm ngay

```text
AI Coach nâng cao
Trading module đầy đủ
Debt optimizer
Bank sync
Chart phức tạp
Mobile app native
Multi-user
```

---

## 18. Tech stack phù hợp

Vì hệ sinh thái ZenX đã sử dụng React, Vite, Firebase, nên stack hợp lý là:

```text
Frontend: React + Vite
UI: TailwindCSS
Database: Firebase Firestore
Auth: Firebase Auth
Hosting: Firebase Hosting
Charts: Recharts
State: Zustand hoặc Context API
Date: date-fns
AI later: OpenAI API hoặc Gemini API
```

### Cấu trúc thư mục (v3.0 — RN-Ready)

```text
src/
  core/                      ← Portable (web + React Native)
    /auth/
      useAuth.js
    /data/
      accessControl.js
    /hooks/
      useTransactionsData.js (via createDataHook factory)
      useDashboardStats.js
      useTheme.js, useI18n.js
    /i18n/
      dictionaries/vi.js, en.js
      getTranslation.js (service-level i18n)
    /services/
      transactionService.js
      dashboardService.js
      userService.js
      cacheCoordinator.js
      storageAdapter.js
    /utils/
      formatters.js (fmtShort, formatMoney, formatDate)
      financeCalculations.js (savingsRate, latteFactor, etc.)
      validators.js
      
  web/                       ← Web-specific (React + Tailwind)
    /components/
      /ui/
        Button.jsx, Card.jsx, Input.jsx, Toast.jsx, etc.
      TransactionRow.jsx, StatTile.jsx, etc.
    /pages/
      Dashboard.jsx
      Transactions.jsx
      TrackHub.jsx, PlanHub.jsx, ReviewHub.jsx
      Settings.jsx, etc.
    App.jsx (routes + feature gating)
    index.css (Tailwind + design tokens)
    main.jsx (Vite entry)
```

**Nguyên tắc:** `src/core/` dùng chung web + RN. `src/web/` chỉ web. Xem `CLAUDE.md` → "Folder Architecture" để biết chi tiết.

---

## 19. Core calculation logic

### Savings Rate

```js
savingsRate = (income - expense) / income * 100
```

### Latte Factor Total

```js
latteFactorTotal = sum(expenses where isLatteFactor === true)
```

### Emergency Fund Months

```js
emergencyFundMonths = emergencyFundBalance / monthlyEssentialExpense
```

### Net Cash Flow

```js
netCashFlow = totalIncome - totalExpense
```

### Annual Latte Impact

```js
annualLatteImpact = monthlyLatteFactor * 12
```

### Pay Yourself First Target

```js
payYourselfFirstTarget = income * targetSavingRate
```

---

## 20. UI concept

Phong cách nên giống hệ sinh thái ZenX:

```text
Dark mode
Card-based
Clean dashboard
Data-first
Minimal but strong contrast
Mobile-first
Không quá nhiều màu
Mỗi module có 1 màu định danh
```

### Màu gợi ý

```text
Background: #0B1020
Card: #111827
Primary: #6C8EEF
Success: #22C55E
Warning: #F59E0B
Danger: #EF4444
Text main: #F9FAFB
Text muted: #9CA3AF
Border: #1F2937
```

### Card example

```text
Latte Factor

5.800.000 VND
+22% vs last month

Annual impact:
69.600.000 VND

[Convert to Emergency Fund]
```

---

## 21. Roadmap phát triển sản phẩm

### ✅ Version 0.1–0.9 — Foundation → AI Coach
All core modules live and deployed at https://wealth.zenx.asia.
See `docs/PROJECT_STATUS.md` for full implementation list.

---

### ✅ Version 1.0 — Design System + Mobile-First UX (2026-06-12)

**Design System (ZenXWealthUI):**
- Two audience themes: **Ấm** (warm/light, younger) and **Tư gia** (navy/gold/dark, mid-age)
- CSS token layer: colors, typography, spacing — switchable via `data-theme`
- Theme toggle in sidebar (desktop) and mobile top bar
- `fmtShort()` compact number formatter
- Ít khung visual language: hairlines + whitespace, no nested card boxes

**Navigation Architecture:**
- Desktop: accordion sidebar — groups expand in-place, sub-items indented with left hairline
- Mobile: fixed bottom tabs (5 groups) → each tab opens a **status-driven Hub page**

**Hub Pages (mobile entry points):**
- `TrackHub` — dòng tiền + Latte Factor trend + recent transactions
- `PlanHub` — current phase + auto-priority logic + 7 plan items with live status
- `ReviewHub` — week status (reviewed/not) + score + guided CTAs

The hub model replaces menu-driven navigation with **flow-driven context**: the app tells users what needs attention, not just what features exist.

---

### 🔜 Version 1.1 — QuickCapture + Latte Convert (Next sprint)

**QuickCapture FAB:**
- Floating action button visible on ALL mobile screens
- One tap → opens AddTransaction with today's date pre-filled
- Persistent habit anchor: "log it before you forget it"
- Design: gold circle `+` button, fixed bottom-right, above bottom tabs

**Latte → Convert Flow:**
- TrackHub: "Convert X tr to emergency fund" CTA next to Latte amount
- Confirmation screen: shows how many days closer to target
- Creates an emergency fund record + shows updated months covered
- Closes the Detect → Convert feedback loop from the roadmap philosophy

**Net Worth tile on Dashboard:**
- Add assets balance - debts total = estimated net worth
- Shown in hero section alongside net cash flow
- Answers the core question: "Am I getting richer?"

---

### 🔜 Version 1.2 — Smart Input + Phase Celebrations

**Smart AddTransaction:**
- Category autosuggest from recent transaction patterns
- Latte Factor auto-flag for known Latte categories (cà phê, ăn ngoài...)
- Recent categories shown first (not alphabetical)
- Amount pad shortcuts: common amounts for user's top categories

**Phase milestone celebrations:**
- PlanHub detects when emergency fund crosses 1/3/6 months
- Celebratory state: confetti or gold pulse + "Bạn vừa đạt X tháng quỹ dự phòng!"
- Automatically suggests next priority (e.g., now focus on PYF)
- Makes the journey feel real and rewarding

**PlanHub intelligence upgrade:**
- Show ETA to next milestone: "Với tốc độ này, đủ 6 tháng vào Th11 2026"
- When debt exists AND emergency fund is low: show debt-vs-fund tradeoff insight
- Link latte factor data: "Cắt 2 tr Latte Factor/tháng → đạt mục tiêu sớm hơn 3 tháng"

---

### 🔜 Version 1.3 — Guided Review + AI Insight

**Guided Weekly Review (3-step flow):**
- Step 1: Numbers — "Tuần này thu bao nhiêu? Chi bao nhiêu?" (auto-filled from transactions)
- Step 2: Reflection — "Latte Factor lớn nhất là gì? Cần cắt gì?"
- Step 3: Commitment — "Tuần tới tôi sẽ làm 1 việc: ___"
- Progress dots at top, feels like a short meditation not a form

**Contextual AI Insight (rule-based upgrade):**
- Uses actual user data to generate a personalized weekly insight string
- Examples:
  - "Latte Factor tháng này tăng 22% — chủ yếu từ cà phê. Nếu giảm 30%, quỹ dự phòng đủ sớm hơn 2 tháng."
  - "Bạn đã trả mình trước đủ 3 tháng liên tiếp. Đây là nền tảng. Giữ vững."
  - "Thu nhập tháng này thấp hơn trung bình 15%. Đây là lúc giữ chi tiêu thật chặt."

**ReviewHub score history:**
- Show last 4 weeks' scores as a mini sparkline
- Trend: improving / stable / declining

---

### 🔜 Version 1.4 — Desktop Polish + PWA

**Desktop sidebar enhancement:**
- Once mobile is solid, widen sidebar on large screens
- Show mini stat summaries in sidebar (e.g., emergency fund progress bar)
- Desktop Dashboard: 2-column layout for PlanHub + ReviewHub summaries

**PWA (Progressive Web App):**
- Add to homescreen support
- Offline-first read capability for last-synced data
- Push notification for weekly review reminder (Monday morning)

**Recurring transaction intelligence:**
- Auto-detect recurring expenses from pattern (same amount, same category, monthly)
- Flag them in TrackHub: "3 khoản cố định tháng này: 3,5 tr"
- Allow user to confirm/dismiss recurring label

---

### 🔮 Version 2.0 — AI Coach + LLM Integration

- Replace rule-based coach with LLM-backed analysis using actual transaction history
- Monthly financial letter: personalized 200-word summary of the month
- Goal tracking: 12-month financial goal → weekly progress signal
- Predictive: "Nếu duy trì tốc độ này, bạn đạt tự do tài chính vào năm ___"

---

## 26. Mobile-First Design Principles (added 2026-06-12)

From experience building v1.0:

**Hubs over menus.** Never show a list of features as navigation. Show the user's current state and what they need to do next.

**One action per screen.** Each hub has ONE primary CTA. The most important thing right now, for this user, at this moment.

**Status before features.** TrackHub shows "Tháng này +12,5 tr" before showing "Add Transaction." PlanHub shows "Giai đoạn 4" before showing the 7 plan items.

**Phase awareness.** Features that don't apply to the user's current phase are shown as locked/upcoming — not hidden (discovery) but not pushed (focus).

**The Latte Factor loop must close.** Detect → Quantify → Convert. If the user can see their leaks but cannot act on them in one tap, the loop is broken. Version 1.1 closes this loop.

### Version 0.1 — Foundation

```text
Set up React + Firebase
Auth
Firestore schema
Basic layout
Dashboard static
```

### Version 0.2 — Transaction Tracker

```text
Add income
Add expense
Category
Latte Factor flag
Monthly summary
```

### Version 0.3 — Latte Factor Engine

```text
Latte Factor dashboard
Monthly leakage
Annualized impact
Top leakage categories
Convert saving action
```

### Version 0.4 — Emergency Fund

```text
Set monthly essential expense
Set target months
Track fund balance
Calculate coverage
Milestone progress
```

### Version 0.5 — Pay Yourself First

```text
Income allocation rule
Auto allocation suggestion
Monthly target
Progress tracking
```

### Version 0.6 — Weekly Review

```text
Weekly questionnaire
Weekly score
Weekly insight
Monthly summary
```

### Version 0.7 — Roadmap Engine

```text
Phase checklist
Progress by phase
Auto phase suggestion
Next action
```

### Version 0.8 — Debt + Income Builder

```text
Debt tracker
Income source tracker
Side income goals
Action pipeline
```

### Version 0.9 — Trading Risk

```text
Trading capital
Risk limits
P&L tracking
Drawdown warning
Profit withdrawal rule
```

### Version 1.0 — AI Coach

```text
AI weekly analysis
AI monthly report
AI action recommendations
Latte Factor insights
Risk warnings
```

---

## 22. Logic sản phẩm theo triết lý cuốn sách

Mỗi hành động trong app nên gắn với một nguyên tắc:

| Nguyên tắc | Tính năng app |
|---|---|
| Latte Factor | Detect chi nhỏ lặp lại |
| Pay Yourself First | Auto allocation |
| Start Late | Roadmap catch-up |
| Finish Rich | Wealth milestones |
| Automation | Recurring rules |
| Reduce debt | Debt tracker |
| Earn more | Income Builder |
| Invest more | Asset allocation |
| Protect yourself | Emergency Fund |
| Stay accountable | Weekly Review |

---

## 23. MVP đầu tiên nên có dạng này

### Home Dashboard

```text
Good morning, HP

Net Cash Flow
+8.500.000 VND

Latte Factor
3.200.000 VND this month

Emergency Fund
2.4 / 6 months

Pay Yourself First
67% completed

This Week Action
Reduce eating out by 500.000 VND
Move 2.000.000 VND to emergency fund
```

### Add Transaction

```text
Amount
Type: Income / Expense
Category
Date
Latte Factor: Yes / No
Recurring: Yes / No
Note
```

### Latte Factor

```text
This month leakage
Top categories
Annualized impact
Suggested conversion
```

### Emergency Fund

```text
Current balance
Monthly essential expense
Target months
Progress bar
```

### Weekly Review

```text
Income this week
Expense this week
Latte Factor
Savings
One lesson
One action next week
```

---

## 24. Kết luận sản phẩm

Web app này nên được xây như một **financial behavior system**, không phải chỉ là accounting app.

Công thức sản phẩm:

```text
Track money
→ Detect leakage
→ Convert leakage
→ Build emergency fund
→ Pay yourself first
→ Increase income
→ Control risk
→ Review weekly
→ Build wealth roadmap
```

Câu định hình cuối cùng:

> **ZenX Wealth biến “Latte Factor” từ một khái niệm trong sách thành một engine vận hành tài chính cá nhân hằng ngày.**

---

## 25. Ghi chú triển khai tiếp theo

Sau file định hướng này, có thể tách thành các file triển khai riêng:

```text
01_PRODUCT_VISION.md
02_INFORMATION_ARCHITECTURE.md
03_FIREBASE_SCHEMA.md
04_MVP_REQUIREMENTS.md
05_UI_UX_GUIDELINES.md
06_DEVELOPMENT_ROADMAP.md
07_AI_COACH_SPEC.md
```
