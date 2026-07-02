# SPEC — Kết nối Plan/Savings Escalator với Review/Health Score

**Phạm vi:** `PlanHub.jsx`, `HealthScore.jsx`, `ReviewHub.jsx`, `WeeklyReview.jsx`
**Bối cảnh:** Verify code phát hiện 4 vấn đề gắn kết: (1) status Savings Escalator hardcode sai ở `/plan`, (2) `/health-score` cô lập hoàn toàn dù cùng nhóm nav với Review, (3) 4 hệ thống điểm/tiến độ không tham chiếu nhau, (4) Savings Escalator vắng mặt trong insight của Review. Chia 4 phần độc lập A-D.

---

## PHẦN A — Fix status Savings Escalator hardcode sai ở `/plan`

`Dashboard.jsx` đã dùng `useSavingsPlansData` để hiện đúng trạng thái plan; `PlanHub.jsx` — trang "chuẩn" nhất cho việc lập kế hoạch — lại không hề import hook này, hardcode `status: 'upcoming'` vĩnh viễn.

### A1. `src/web/pages/PlanHub.jsx` — import + fetch

```jsx
// TRƯỚC
import { useEmergencyFundData } from '../../core/hooks/useEmergencyFundData';
import { usePayYourselfFirstData } from '../../core/hooks/usePayYourselfFirstData';

// SAU
import { useEmergencyFundData } from '../../core/hooks/useEmergencyFundData';
import { usePayYourselfFirstData } from '../../core/hooks/usePayYourselfFirstData';
import { useSavingsPlansData } from '../../core/hooks/useSavingsPlansData';
```

```js
// TRƯỚC
const { data: pyfData } = usePayYourselfFirstData(user?.uid);

// SAU
const { data: pyfData } = usePayYourselfFirstData(user?.uid);
const { data: savingsPlansData } = useSavingsPlansData(user?.uid);
```

### A2. Sửa entry `savingsEscalator` trong `planItems`

```js
// TRƯỚC
{
  key: 'savingsEscalator', label: t('planHub.items.savingsEscalator'),
  value: null,
  sub: t('savingsEscalator.planItemSub'),
  to: '/savings-escalator',
  status: 'upcoming',
  featureKey: 'savings_escalator',
},

// SAU
{
  key: 'savingsEscalator', label: t('planHub.items.savingsEscalator'),
  value: savingsPlansData.activePlans.length > 0
    ? t('planHub.escalatorActiveCount', { count: savingsPlansData.activePlans.length })
    : null,
  sub: savingsPlansData.activePlans.length > 0
    ? t('planHub.escalatorActiveSub')
    : t('savingsEscalator.planItemSub'),
  to: '/savings-escalator',
  status: savingsPlansData.activePlans.length > 0 ? 'active' : 'upcoming',
  featureKey: 'savings_escalator',
},
```

Không tính "done" cho mục này — bản chất Savings Escalator là kế hoạch chạy liên tục (không có điểm kết thúc rõ ràng như Emergency Fund), nên chỉ phân biệt "đang chạy" (`active`) vs "chưa có kế hoạch" (`upcoming`) là đủ, tránh suy diễn thêm logic phức tạp không cần thiết.

### i18n — `vi.js` / `en.js`, trong block `planHub`

```js
// vi.js
escalatorActiveCount: '{count} kế hoạch',
escalatorActiveSub: 'Đang chạy',

// en.js
escalatorActiveCount: '{count} plan(s)',
escalatorActiveSub: 'Currently running',
```

---

## PHẦN B — Nối `/health-score` vào `/review` (tile + tham chiếu chéo)

`/health-score` được xếp cùng nhóm nav với `/review` (`AppShell.jsx`: `isReview` gồm cả `health-score`) nhưng `HealthScore.jsx` có 0 link đi ra, và `ReviewHub.jsx` không có tile nào trỏ tới nó.

### B1. `src/web/pages/ReviewHub.jsx` — thêm tile Health Score vào tools list

```jsx
// TRƯỚC
import { ArrowRight, BarChart3, Bot, ClipboardCheck, History } from 'lucide-react';

// SAU
import { Activity, ArrowRight, BarChart3, Bot, ClipboardCheck, History } from 'lucide-react';
```

Thêm entry mới vào mảng tools, đặt sau tile `aiCoachLabel`:
```jsx
{
  icon: Bot, label: t('reviewHub.aiCoachLabel'),
  sub: t('reviewHub.askAssistant'),
  to: '/ai-coach', featureKey: 'ai_coach', active: false,
},
{
  icon: Activity, label: t('reviewHub.healthScoreLabel'),
  sub: t('reviewHub.healthScoreSub'),
  to: '/health-score', featureKey: 'health_score', active: false,
},
```

### B2. `src/web/pages/HealthScore.jsx` — thêm link quay lại Review

```jsx
// TRƯỚC
import { Activity } from 'lucide-react';
import { useAuth } from '../../core/auth/useAuth';
import { useI18n } from '../../core/i18n/useI18n';

// SAU
import { Activity, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../core/auth/useAuth';
import { useI18n } from '../../core/i18n/useI18n';
```

```jsx
// TRƯỚC
<main className="max-w-6xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-8 space-y-6">
  <div className="space-y-1">
    <div className="inline-flex items-center gap-2 rounded-full border border-zx-line px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-zx-text-soft">

// SAU
<main className="max-w-6xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-8 space-y-6">
  <Link to="/review" className="inline-flex items-center gap-1.5 text-sm text-zx-text-soft hover:text-zx-accent transition">
    <ArrowLeft className="h-4 w-4" /> {t('healthScore.backToReview')}
  </Link>
  <div className="space-y-1">
    <div className="inline-flex items-center gap-2 rounded-full border border-zx-line px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-zx-text-soft">
```

### i18n

```js
// vi.js — trong block reviewHub
healthScoreLabel: 'Điểm sức khỏe tài chính',
healthScoreSub: 'Đánh giá tổng thể theo tháng',

// vi.js — trong block healthScore
backToReview: '← Về Review',

// en.js — reviewHub
healthScoreLabel: 'Financial Health Score',
healthScoreSub: 'Monthly overall assessment',

// en.js — healthScore
backToReview: '← Back to Review',
```

---

## PHẦN C — Làm rõ mối quan hệ giữa các điểm số (không gộp làm 1)

Có 4 hệ thống điểm/tiến độ độc lập (`wealthDisciplineScore` tuần trong Review, `computeHealthScore` A-F tháng trong Health Score, Roadmap phases trong Plan, Goal 12 tháng). Không gộp — chỉ thêm caption ngắn giải thích để user không bối rối khi thấy 2 con số lệch nhau.

### C1. `src/web/pages/HealthScore.jsx` — thêm blurb giải thích dưới tiêu đề

```jsx
// TRƯỚC
<h1 className="font-zx-head text-2xl font-bold text-zx-text">{t('healthScore.title')}</h1>
<p className="text-sm text-zx-text-soft">{t('healthScore.subtitle')}</p>

// SAU
<h1 className="font-zx-head text-2xl font-bold text-zx-text">{t('healthScore.title')}</h1>
<p className="text-sm text-zx-text-soft">{t('healthScore.subtitle')}</p>
<p className="text-xs text-zx-text-soft/70 italic">{t('healthScore.relationToReview')}</p>
```

### C2. `src/web/pages/ReviewHub.jsx` — thêm caption dưới điểm kỷ luật tuần

Tìm đoạn hiện điểm số chính (`wealthDisciplineScore`), thêm 1 dòng chú thích nhỏ ngay dưới, liên kết sang Health Score:

```jsx
// TRƯỚC (khối hiện điểm số — tìm đúng vị trí hiện scoreLine/scoreMessage trong file)
<p className={`text-sm ${scoreColor} mb-1`}>{scoreMessage}</p>

// SAU
<p className={`text-sm ${scoreColor} mb-1`}>{scoreMessage}</p>
<p className="text-[11px] text-zx-text-soft/70">
  {t('reviewHub.scoreVsHealthScore')}{' '}
  <Link to="/health-score" className="underline hover:text-zx-accent transition">
    {t('reviewHub.healthScoreLabel')}
  </Link>
</p>
```

Claude Code cần tìm đúng vị trí `scoreMessage`/dòng hiện điểm hiện tại trong file thực tế (code trong spec ở đây là minh hoạ cấu trúc, không phải diff chính xác từng dòng do phần hiện điểm số có thể đã đổi qua nhiều lần sửa trước) — chèn ngay dưới dòng hiện `wealthDisciplineScore`, không chèn vào vị trí khác.

### i18n

```js
// vi.js — healthScore
relationToReview: 'Điểm này đánh giá tổng thể theo tháng (5 trụ cột) — khác với điểm kỷ luật tuần trong Weekly Review, cả hai bổ trợ nhau chứ không thay thế nhau.',

// vi.js — reviewHub
scoreVsHealthScore: 'Đây là điểm kỷ luật tuần này — muốn xem đánh giá tổng thể theo tháng?',

// en.js — healthScore
relationToReview: "This is your overall monthly score (5 pillars) — different from the weekly discipline score in Weekly Review. They complement, not replace, each other.",

// en.js — reviewHub
scoreVsHealthScore: "This is your discipline score for this week — want to see the monthly overall picture?",
```

---

## PHẦN D — Thêm Savings Escalator vào insight của Review

Nhắc checkin tháng còn thiếu của kế hoạch Savings Escalator ngay trong insight tuần, tái dùng đúng helper `getCurrentPlanMonthIdx`/`addMonthsToKey`/`getMonthlyCheckins` đã có sẵn (pattern giống hệt `Dashboard.jsx`'s `UpcomingSection`).

### D1. `src/web/pages/WeeklyReview.jsx` — import + fetch

```jsx
// TRƯỚC
import { useFeatureAccess } from '../../core/hooks/useFeatureAccess';
import { usePayYourselfFirstData } from '../../core/hooks/usePayYourselfFirstData';
import { useGoalTracking } from '../../core/hooks/useGoalTracking';

// SAU
import { useFeatureAccess } from '../../core/hooks/useFeatureAccess';
import { usePayYourselfFirstData } from '../../core/hooks/usePayYourselfFirstData';
import { useGoalTracking } from '../../core/hooks/useGoalTracking';
import { useSavingsPlansData } from '../../core/hooks/useSavingsPlansData';
import { getMonthlyCheckins, getCurrentPlanMonthIdx, addMonthsToKey } from '../../core/services/savingsPlanService';
```

```js
// TRƯỚC
const { data: pyfData } = usePayYourselfFirstData(isPremium ? user?.uid : null);
const { data: goalData } = useGoalTracking(user?.uid);

// SAU
const { data: pyfData } = usePayYourselfFirstData(isPremium ? user?.uid : null);
const { data: goalData } = useGoalTracking(user?.uid);
const { data: savingsPlansData } = useSavingsPlansData(isPremium ? user?.uid : null);
const [pendingEscalatorCheckins, setPendingEscalatorCheckins] = useState(0);
```

Thêm effect tính số plan đang chờ checkin tháng hiện tại (fetch 1 lần khi có active plans, không phụ thuộc render loop):

```js
useEffect(() => {
  if (!user?.uid || !isPremium || savingsPlansData.activePlans.length === 0) {
    setPendingEscalatorCheckins(0);
    return;
  }
  let cancelled = false;
  Promise.all(savingsPlansData.activePlans.map((plan) => getMonthlyCheckins(user.uid, plan.id)))
    .then((results) => {
      if (cancelled) return;
      const pending = savingsPlansData.activePlans.filter((plan, i) => {
        if (!plan.executionStartDate) return false;
        const idx = getCurrentPlanMonthIdx(plan.executionStartDate);
        const monthKey = addMonthsToKey(plan.executionStartDate, idx - 1);
        return !results[i]?.[monthKey];
      }).length;
      setPendingEscalatorCheckins(pending);
    })
    .catch(() => { if (!cancelled) setPendingEscalatorCheckins(0); });
  return () => { cancelled = true; };
}, [user?.uid, isPremium, savingsPlansData.activePlans]);
```

### D2. Mở rộng `buildInsight()` — nhận thêm field trong `extra`

```js
// TRƯỚC
if (goal?.progress?.weeklyTargetSavings > 0) {
  const actualThisWeek = Math.max(0, review.income - review.expense);
  if (actualThisWeek >= goal.progress.weeklyTargetSavings) {
    lines.push(t('weeklyReview.insights.goalOnTrack'));
  } else {
    const gapPct = Math.round((1 - actualThisWeek / goal.progress.weeklyTargetSavings) * 100);
    lines.push(t('weeklyReview.insights.goalBehind', { pct: gapPct }));
  }
}

// SAU
if (goal?.progress?.weeklyTargetSavings > 0) {
  const actualThisWeek = Math.max(0, review.income - review.expense);
  if (actualThisWeek >= goal.progress.weeklyTargetSavings) {
    lines.push(t('weeklyReview.insights.goalOnTrack'));
  } else {
    const gapPct = Math.round((1 - actualThisWeek / goal.progress.weeklyTargetSavings) * 100);
    lines.push(t('weeklyReview.insights.goalBehind', { pct: gapPct }));
  }
}

if (extra.pendingEscalatorCheckins > 0) {
  lines.push(t('weeklyReview.insights.escalatorCheckinDue', { count: extra.pendingEscalatorCheckins }));
}
```

### D3. Cập nhật lời gọi `buildInsight`

```js
// TRƯỚC
const insight = buildInsight(review, form, t, { pyf: pyfData, goal: goalData });

// SAU
const insight = buildInsight(review, form, t, { pyf: pyfData, goal: goalData, pendingEscalatorCheckins });
```

### i18n — `weeklyReview.insights`

```js
// vi.js
escalatorCheckinDue: 'Bạn có {count} kế hoạch Savings Escalator đang chờ checkin tháng này.',

// en.js
escalatorCheckinDue: "You have {count} Savings Escalator plan(s) waiting for this month's check-in.",
```

---

## Checklist

```
[ ] A1. PlanHub.jsx: import + fetch useSavingsPlansData
[ ] A2. PlanHub.jsx: sửa entry savingsEscalator dùng trạng thái động
[ ] B1. ReviewHub.jsx: thêm tile Health Score
[ ] B2. HealthScore.jsx: thêm link quay lại /review
[ ] C1. HealthScore.jsx: thêm blurb relationToReview
[ ] C2. ReviewHub.jsx: thêm caption scoreVsHealthScore dưới điểm kỷ luật tuần
[ ] D1. WeeklyReview.jsx: import + fetch savingsPlansData + effect tính pendingEscalatorCheckins
[ ] D2. WeeklyReview.jsx: mở rộng buildInsight() nhận pendingEscalatorCheckins
[ ] D3. WeeklyReview.jsx: cập nhật lời gọi buildInsight
[ ] i18n: thêm toàn bộ key ở Phần A/B/C/D vào cả vi.js và en.js

npm run build
npm test
```

## Test thủ công

1. **Plan status:** tạo 1 kế hoạch Savings Escalator (`/savings-escalator`) → quay lại `/plan` → mục "Savings Escalator" phải chuyển từ "upcoming" sang hiện đúng trạng thái đang chạy, không còn hardcode.
2. **Health Score liên kết:** vào `/review` → thấy tile "Điểm sức khỏe tài chính" trỏ đúng `/health-score`. Vào `/health-score` → thấy link "← Về Review" ở đầu trang, bấm vào phải về đúng `/review`.
3. **Làm rõ quan hệ điểm số:** ở `/health-score` thấy dòng chú thích nhỏ giải thích khác biệt với Review. Ở `/review`, dưới điểm kỷ luật tuần thấy dòng caption liên kết sang Health Score.
4. **Escalator insight:** với tài khoản có Savings Escalator plan đang active và CHƯA checkin tháng hiện tại → vào `/weekly-review` Step 1 → phải thấy thêm dòng insight nhắc checkin. Sau khi checkin xong ở `/savings-escalator/plan/:id`, quay lại `/weekly-review` (reload) → dòng nhắc phải biến mất.
5. Chạy lại `npm test` — đặc biệt `WeeklyReview.test.jsx` — vì `buildInsight` lại đổi chữ ký thêm lần nữa, và component giờ có thêm 1 `useEffect` mới cần không crash khi `savingsPlansData` rỗng/mock.
