# ZenX Wealth — Onboarding: Latte Factor Projection + Gợi ý Budget Template theo tuổi

**Bối cảnh:** Onboarding hiện có 3 step (Ngôn ngữ → Currency/Expense/Emergency → Tóm tắt), chỉ nói về hiện trạng, không có khoảnh khắc "tương lai". Spec này thêm 1 step mới (chiếu lãi kép từ thói quen tiêu nhỏ — concept "Latte Factor" app đã dùng tên này ở module Track) + 1 input tuổi ở Step 2, dùng tuổi để gợi ý 1 trong 5 Budget Template đã có sẵn (`src/data/budgetTemplates.js`). Tổng step: 3 → 4.

**Không cần làm:** Đổi `budget_templates` từ Premium sang Free trong `billingService.js` — đã được toggle qua Admin UI (Firestore override), không cần sửa code.

---

## Phần 1 — File data mới: `src/data/latteOnboarding.js`

```js
// Các thói quen tiêu phổ biến — khớp với LATTE_KEYWORDS trong AddTransaction.jsx
export const LATTE_ITEMS = [
  { id: 'coffee', icon: '☕', labelKey: 'latteCoffee', vnd: 25000, usd: 2 },
  { id: 'bubbleTea', icon: '🧋', labelKey: 'latteBubbleTea', vnd: 35000, usd: 3 },
  { id: 'eatingOut', icon: '🍔', labelKey: 'latteEatingOut', vnd: 50000, usd: 5 },
  { id: 'subscription', icon: '📺', labelKey: 'latteSubscription', vnd: 10000, usd: 1 },
  { id: 'shopping', icon: '🛍️', labelKey: 'latteShopping', vnd: 30000, usd: 2 },
];

export const AGE_BRACKETS = ['<22', '22-29', '30-44', '45+'];

// Mapping đã được xác nhận bởi product owner — late_starter ưu tiên cho 45+
// (khớp đúng triết lý "Về đích muộn" của app, không phải mid_career)
const AGE_RANGE_TO_TEMPLATE = {
  '<22': 'student',
  '22-29': 'young_pro',
  '30-44': 'family',
  '45+': 'late_starter',
};

export function recommendTemplateIdByAgeRange(ageRange) {
  return AGE_RANGE_TO_TEMPLATE[ageRange] || 'young_pro';
}
```

---

## Phần 2 — Thêm vào `src/services/financialCalculations.js`

Thêm 2 hàm export mới (không đụng code hiện có):

```js
export function calculateFutureValue({ monthlyAmount, annualRatePct, months }) {
  const r = (annualRatePct / 100) / 12;
  if (!monthlyAmount || months <= 0) return 0;
  if (r === 0) return monthlyAmount * months;
  return monthlyAmount * (((1 + r) ** months - 1) / r);
}

export function buildLatteProjectionSeries(monthlyAmount, years = 20) {
  return Array.from({ length: years + 1 }, (_, year) => ({
    year,
    savings: calculateFutureValue({ monthlyAmount, annualRatePct: 3, months: year * 12 }),
    invested: calculateFutureValue({ monthlyAmount, annualRatePct: 8, months: year * 12 }),
  }));
}
```

---

## Phần 3 — i18n: thêm key mới vào CẢ `vi.js` và `en.js`

**`vi.js`** (chèn vào object `onboarding`, ngay sau `emergencyTargetHint`):
```js
ageLabel: 'Bạn bao nhiêu tuổi?',
step3Title: 'Thói quen nhỏ, tương lai lớn',
step3Subtitle: 'Chạm vào những gì bạn thường mua mỗi ngày — xem điều gì xảy ra nếu để dành thay vào đó.',
latteIntro: 'Bạn có thường...',
latteCoffee: 'Cà phê mỗi ngày',
latteBubbleTea: 'Trà sữa',
latteEatingOut: 'Ăn ngoài / giao đồ thêm',
latteSubscription: 'Subscription ít dùng',
latteShopping: 'Mua sắm tiện tay',
latteDailyTotal: 'Mỗi ngày bạn có thể để dành',
latteAdjustManually: 'Tự chỉnh số tiền',
latteAmountLabel: 'Số tiền để dành mỗi ngày',
latteProjectionTitle: 'Nếu duy trì đều đặn...',
latteYear1: 'Sau 1 năm',
latteYear10: 'Sau 10 năm',
latteYear20: 'Sau 20 năm',
latteScenarioSavings: 'Gửi tiết kiệm (~3%/năm)',
latteScenarioInvested: 'Đầu tư dài hạn (~8%/năm, minh hoạ)',
latteDisclaimer: 'Đây là minh hoạ dựa trên giả định lãi suất, không phải cam kết lợi nhuận thực tế.',
latteIllustrativeNote: 'Đây là ví dụ minh hoạ. Bạn có thể điều chỉnh chính xác hơn sau trong phần Theo dõi.',
templateRecommendLabel: 'Gợi ý bộ ngân sách cho bạn',
templateRecommendView: 'Xem',
```

**Đổi tên key cũ (bắt buộc, để không đụng với `step3Title`/`step3Subtitle` mới):**
```js
step3Title → step4Title       // 'Tất cả sẵn sàng!'
step3Subtitle → step4Subtitle  // giữ nguyên nội dung
```

**`en.js`** (tương ứng):
```js
ageLabel: 'How old are you?',
step3Title: 'Small habits, big future',
step3Subtitle: 'Tap what you usually buy each day — see what happens if you saved it instead.',
latteIntro: 'Do you often...',
latteCoffee: 'Coffee every day',
latteBubbleTea: 'Bubble tea',
latteEatingOut: 'Eating out / extra delivery',
latteSubscription: 'Unused subscriptions',
latteShopping: 'Impulse shopping',
latteDailyTotal: 'You could set aside per day',
latteAdjustManually: 'Adjust amount manually',
latteAmountLabel: 'Amount to save per day',
latteProjectionTitle: 'If you keep this up...',
latteYear1: 'After 1 year',
latteYear10: 'After 10 years',
latteYear20: 'After 20 years',
latteScenarioSavings: 'Savings account (~3%/yr)',
latteScenarioInvested: 'Long-term investing (~8%/yr, illustrative)',
latteDisclaimer: 'This is an illustration based on assumed returns, not a guarantee of actual results.',
latteIllustrativeNote: 'This is just an example. You can fine-tune it later in Track.',
templateRecommendLabel: 'Recommended budget template for you',
templateRecommendView: 'View',
```
Và đổi tên `step3Title`/`step3Subtitle` cũ → `step4Title`/`step4Subtitle` giống file vi.js.

---

## Phần 4 — Sửa `src/pages/OnboardingFlow.jsx`

### 4.1 Import thêm ở đầu file
```jsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { buildLatteProjectionSeries } from '../services/financialCalculations';
import { LATTE_ITEMS, AGE_BRACKETS, recommendTemplateIdByAgeRange } from '../data/latteOnboarding';
```

### 4.2 Đổi `TOTAL_STEPS`
```jsx
const TOTAL_STEPS = 3; → const TOTAL_STEPS = 4;
```

### 4.3 Thêm state mới (cạnh các `useState` hiện có)
```jsx
const [ageRange, setAgeRange] = useState('22-29');
const [selectedLatte, setSelectedLatte] = useState([]);
const [useManualDaily, setUseManualDaily] = useState(false);
const [manualDaily, setManualDaily] = useState('');
```

### 4.4 Thêm derived values (ngay trước `return`, cạnh `expensePreview`)
```jsx
const dailySavingReal = useManualDaily
  ? Number(manualDaily) || 0
  : selectedLatte.reduce((sum, id) => {
      const item = LATTE_ITEMS.find(i => i.id === id);
      return sum + (item ? (currency === 'USD' ? item.usd : item.vnd) : 0);
    }, 0);
const hasRealLatteInput = dailySavingReal > 0;
const DEFAULT_SEED_DAILY = currency === 'USD' ? 3 : 50000;
const dailySavingDisplay = hasRealLatteInput ? dailySavingReal : DEFAULT_SEED_DAILY;
const projectionSeries = buildLatteProjectionSeries(dailySavingDisplay * 30);
const recommendedTemplateId = recommendTemplateIdByAgeRange(ageRange);
```

### 4.5 Trong `handleFinish`, thêm vào object `settings` (chỗ đang spread `...(skip ? {} : {...})`)
```jsx
const settings = {
  ...(existing.settings || {}),
  currency,
  locale,
  ageRange,
  ...(skip ? {} : {
    monthlyEssentialExpense: Number(monthlyExpense),
    emergencyFundTargetMonths: Number(emergencyTarget) || 6,
    ...(hasRealLatteInput ? { estimatedDailySaving: dailySavingReal } : {}),
  }),
};
```
*(Lưu ý: không lưu `dailySavingDisplay` — chỉ lưu `dailySavingReal` khi user thực sự có input, tránh lưu số liệu minh hoạ giả vào hồ sơ thật.)*

### 4.6 Trong Step 2 (`step === 2`), thêm khối Age — chèn vào **giữa khối "Emergency target" và dòng `{error && ...}`**

```jsx
{/* Age */}
<div className="space-y-2">
  <label className="block">
    <span className="text-sm font-medium text-zx-text-soft">{t('onboarding.ageLabel')}</span>
    <div className="mt-2 grid grid-cols-4 gap-2">
      {AGE_BRACKETS.map(a => (
        <button key={a} type="button" onClick={() => setAgeRange(a)}
          className={`rounded-zx-sm border py-2.5 text-sm font-semibold transition ${
            ageRange === a
              ? 'border-zx-accent bg-zx-accent-soft text-zx-accent'
              : 'border-zx-line bg-zx-surface text-zx-text-soft hover:border-zx-accent'
          }`}>
          {a}
        </button>
      ))}
    </div>
  </label>
</div>
```

Step 2's nút "Tiếp theo" giữ nguyên `setStep(3)` — không cần đổi gì, vì step mới sẽ trở thành step 3.

### 4.7 Chèn step mới — **`step === 3`** (giữa khối Step 2 và khối Step 3 cũ)

```jsx
{/* ── Step 3: Latte Factor Projection ── */}
{step === 3 && (
  <div className="space-y-6">
    <div className="text-center space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zx-text-soft">
        {t('onboarding.step', { current: 3, total: TOTAL_STEPS })}
      </p>
      <h1 className="font-zx-head text-2xl font-bold text-zx-text">{t('onboarding.step3Title')}</h1>
      <p className="text-sm text-zx-text-soft">{t('onboarding.step3Subtitle')}</p>
    </div>

    <div className="space-y-3">
      <p className="text-sm font-medium text-zx-text-soft">{t('onboarding.latteIntro')}</p>
      <div className="grid grid-cols-2 gap-2">
        {LATTE_ITEMS.map(item => {
          const price = currency === 'USD' ? item.usd : item.vnd;
          const selected = selectedLatte.includes(item.id);
          return (
            <button key={item.id} type="button"
              onClick={() => setSelectedLatte(prev => selected ? prev.filter(id => id !== item.id) : [...prev, item.id])}
              className={`flex items-center gap-2 rounded-zx-sm border px-3 py-2.5 text-left transition ${
                selected
                  ? 'border-zx-accent bg-zx-accent-soft ring-1 ring-zx-accent'
                  : 'border-zx-line bg-zx-surface hover:border-zx-accent'
              }`}>
              <span className="text-xl">{item.icon}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-zx-text truncate">{t(`onboarding.${item.labelKey}`)}</span>
                <span className="block text-xs text-zx-text-soft">≈ {formatMoney(price, currency)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>

    {!useManualDaily ? (
      <button type="button" onClick={() => setUseManualDaily(true)}
        className="text-xs text-zx-text-soft underline underline-offset-2 hover:text-zx-text">
        {t('onboarding.latteAdjustManually')}
      </button>
    ) : (
      <label className="block">
        <span className="text-sm font-medium text-zx-text-soft">{t('onboarding.latteAmountLabel')}</span>
        <input type="number" inputMode="decimal" min="0" step="any" value={manualDaily}
          onChange={e => setManualDaily(e.target.value)}
          className="mt-2 w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-4 py-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent" />
      </label>
    )}

    <div className="rounded-zx-sm border border-zx-line bg-zx-surface-2 p-4 text-center">
      <p className="text-xs text-zx-text-soft">{t('onboarding.latteDailyTotal')}</p>
      <p className="font-zx-display text-2xl font-bold text-zx-accent mt-1">
        {formatMoney(dailySavingDisplay, currency)}
      </p>
      {!hasRealLatteInput && (
        <p className="mt-1 text-[11px] text-zx-text-soft">{t('onboarding.latteIllustrativeNote')}</p>
      )}
    </div>

    <div className="rounded-zx border border-zx-line bg-zx-surface p-4 space-y-3">
      <p className="text-sm font-semibold text-zx-text">{t('onboarding.latteProjectionTitle')}</p>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={projectionSeries}>
            <XAxis dataKey="year" tick={{ fontSize: 11 }} tickFormatter={(y) => `${y}y`} />
            <YAxis hide />
            <Tooltip formatter={(v) => formatMoney(v, currency)} />
            <Line type="monotone" dataKey="savings" stroke="var(--zx-text-soft)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="invested" stroke="var(--zx-accent)" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[1, 10, 20].map(y => (
          <div key={y} className="rounded-zx-sm bg-zx-surface-2 p-2">
            <p className="text-[10px] text-zx-text-soft">{t(`onboarding.latteYear${y}`)}</p>
            <p className="text-sm font-bold text-zx-text">
              {formatMoney(projectionSeries.find(p => p.year === y)?.invested || 0, currency)}
            </p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-zx-text-soft text-center">{t('onboarding.latteDisclaimer')}</p>
    </div>

    <div className="space-y-2">
      <button onClick={() => setStep(4)}
        className="w-full rounded-zx-sm bg-zx-accent py-3.5 text-sm font-semibold text-zx-on-accent hover:opacity-90 transition">
        {t('onboarding.next')} →
      </button>
      <button onClick={() => setStep(2)}
        className="w-full py-2 text-xs text-zx-text-soft hover:text-zx-text transition">
        ← {t('common.back')}
      </button>
    </div>
  </div>
)}
```

### 4.8 Đổi khối Step 3 cũ → Step 4

Trong khối `{step === 3 && (...)}` cuối file (block "Done"), đổi:
- `step === 3` → `step === 4`
- `t('onboarding.step', { current: 3, total: TOTAL_STEPS })` → `current: 4`
- `t('onboarding.step3Title')` → `t('onboarding.step4Title')`
- `t('onboarding.step3Subtitle')` → `t('onboarding.step4Subtitle')`
- Nút Back: `onClick={() => setStep(2)}` → `onClick={() => setStep(3)}`

Và thêm 1 dòng gợi ý template vào trước khối summary (hoặc ngay sau, trước `{error && ...}`):

```jsx
{/* Budget template recommendation */}
<div className="rounded-zx-sm border border-zx-accent/40 bg-zx-accent-soft p-4 flex items-center justify-between gap-3">
  <div>
    <p className="text-xs text-zx-text-soft">{t('onboarding.templateRecommendLabel')}</p>
    <p className="text-sm font-semibold text-zx-text">
      {t(`budgetTemplates.templates.${recommendedTemplateId}.name`, {}, recommendedTemplateId)}
    </p>
  </div>
  <button type="button" onClick={() => navigate(`/budget-templates?recommend=${recommendedTemplateId}`)}
    className="flex-shrink-0 rounded-zx-sm bg-zx-accent px-3 py-2 text-xs font-semibold text-zx-on-accent hover:opacity-90 transition">
    {t('onboarding.templateRecommendView')}
  </button>
</div>
```

---

## Phần 5 — Sửa `src/pages/BudgetTemplates.jsx` để đọc query param `?recommend=`

Tìm chỗ đang gọi `getBudgetTemplates().then(setTemplates).finally(...)` (trong `useEffect` load templates) — thêm logic mở preview tự động sau khi load xong:

```jsx
import { useSearchParams } from 'react-router-dom'; // thêm nếu chưa có

// trong component, cạnh các hook khác:
const [searchParams] = useSearchParams();

useEffect(() => {
  getBudgetTemplates().then(list => {
    setTemplates(list);
    const recommendId = searchParams.get('recommend');
    if (recommendId) {
      const match = list.find(tmpl => tmpl.id === recommendId);
      if (match) setPreviewTemplate(match);
    }
  }).finally(() => setLoadingTemplates(false));
}, [user]);
```

*(Claude Code cần xem đúng tên state/hàm hiện có trong file — `setTemplates`, `setPreviewTemplate`, `setLoadingTemplates` đã xác nhận tồn tại qua audit, nhưng vị trí `useEffect` chính xác cần tự định vị khi sửa.)*

---

## Checklist nghiệm thu

- [ ] Onboarding hiện đủ 4 step, dot indicator ở đầu hiển thị đúng 4 chấm
- [ ] Step 2: chọn bracket tuổi hoạt động, lưu đúng state
- [ ] Step 3 (mới): tap chip → số tiền/ngày cộng đúng theo currency đã chọn ở Step 2 (VND vs USD)
- [ ] Chưa tap gì → vẫn hiện biểu đồ với số seed minh hoạ + dòng "đây là ví dụ"
- [ ] Biểu đồ 2 đường (Savings/Invested) vẽ đúng, không lỗi `NaN`/`Infinity` khi `dailySavingDisplay = 0`
- [ ] Step 4: hiện đúng tên template gợi ý theo tuổi đã chọn (vd: 45+ → "Về đích muộn")
- [ ] Bấm "Xem" ở Step 4 → mở `/budget-templates`, đúng template được preview sẵn (không phải auto-apply)
- [ ] `handleFinish`: hồ sơ Firestore lưu đúng `ageRange`, và chỉ lưu `estimatedDailySaving` khi user có input thật (không lưu số seed giả)
- [ ] Test cả 2 locale `vi`/`en` — toàn bộ text mới hiển thị đúng, không sót key thiếu (không hiện key thô như `onboarding.latteCoffee`)
- [ ] `npm run build` sạch, không warning Recharts/import thiếu
