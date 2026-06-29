# Spec v2: Import Transactions — chọn nguồn MISA hoặc CSV, chuẩn hoá ngầm

## 📋 Hướng dẫn sử dụng file này

- **Đây là spec DUY NHẤT cần đưa cho Claude Code.** File đã gộp toàn bộ các bước cần làm — kể cả phần tách Latte detection ra util chung (vốn là Bước 1-2 của spec cũ `SPEC_import_transactions_category_latte.md`).
- **Không cần đưa file v1 nữa.** Có thể xoá hoặc bỏ qua `SPEC_import_transactions_category_latte.md` — mọi nội dung hữu ích của nó đã nằm trong file này (Bước 1-2 dưới đây).
- Nếu trước đó đã tạo `scripts/misa-to-zenx-csv.js` theo hướng dẫn cũ (CLI script) — **xoá file đó**, không dùng nữa. Spec này thay bằng module chạy ngay trong UI (Bước 3).
- Thực hiện theo đúng thứ tự Bước 1 → 7. Mỗi bước ghi rõ file cần tạo/sửa và dòng cụ thể (nếu là sửa file có sẵn).
- Sau khi xong, đối chiếu với mục **Definition of done** ở cuối để tự kiểm tra trước khi báo lại.

## Mục tiêu cuối cùng
Trang Import Transactions cho user chọn nguồn trước khi upload:
- **"File MISA (.xlsx)"** → app tự đọc, tự chuẩn hoá ngầm, tự hiện preview — không qua bước convert riêng, không upload 2 lần.
- **"CSV chuẩn ZenX"** → giữ luồng cũ (paste hoặc upload .csv/.txt), nay có thêm cột category riêng và tự gắn cờ Latte Factor.

---

## Bước 1 — Tách Latte detection ra util dùng chung

**File mới:** `src/core/utils/latteDetection.js`

```js
export const LATTE_KEYWORDS = [
  'cà phê', 'coffee', 'trà sữa', 'bubble tea', 'cafe',
  'ăn ngoài', 'eat out', 'eating out', 'fast food', 'grab food', 'shopee food', 'baemin', 'giao đồ ăn',
  'subscription', 'netflix', 'spotify', 'youtube', 'apple', 'game',
  'mua sắm', 'shopping', 'tiện tay', 'impulse',
  'snack', 'đồ ăn vặt', 'trà', 'nước ngọt',
];

export function isLikelyLatte(text = '') {
  return LATTE_KEYWORDS.some(k => text.toLowerCase().includes(k));
}
```

## Bước 2 — `src/web/pages/AddTransaction.jsx`: dùng lại util chung

Xoá định nghĩa cục bộ `LATTE_KEYWORDS` và hàm `isLikelyLatte` (dòng 22-34 trong file hiện tại).
Thêm vào nhóm import ở đầu file:
```js
import { isLikelyLatte } from '../../core/utils/latteDetection';
```
Phần code gọi `isLikelyLatte(form.category)` ở dòng 350 giữ nguyên, không cần sửa logic gọi — chỉ đổi nguồn import.

---

## Bước 3 — Tách parser CSV ra util chung, bỏ phụ thuộc `t`

**File mới:** `src/core/utils/importParsing.js`

```js
import { isLikelyLatte } from './latteDetection';

export function parseAmount(raw) {
  if (!raw) return NaN;
  const cleaned = String(raw).replace(/[^\d.,-]/g, '').replace(/,/g, '');
  return parseFloat(cleaned);
}

export function parseDate(raw) {
  if (!raw) return null;
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s.slice(0, 10));
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) return new Date(`${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`);
  const dmy2 = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (dmy2) return new Date(`${dmy2[3]}-${dmy2[2].padStart(2, '0')}-${dmy2[1].padStart(2, '0')}`);
  return null;
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if ((ch === ',' || ch === '\t') && !inQuotes) { result.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

// errorKey thay cho error đã dịch sẵn — component tự gọi t('importTransactions.errors.' + errorKey)
export function parseCsvRows(csvText) {
  const lines = csvText.trim().split('\n').filter(l => l.trim());
  if (lines.length === 0) return [];

  let startIdx = 0;
  const firstDate = parseDate(parseCsvLine(lines[0])[0]);
  const firstAmt = parseAmount(parseCsvLine(lines[0]).slice(-1)[0]);
  if (!firstDate && isNaN(firstAmt)) startIdx = 1;

  return lines.slice(startIdx).map((line, i) => {
    const cols = parseCsvLine(line);
    if (cols.length < 2) return { idx: i, valid: false, raw: line, errorKey: 'insufficientColumns' };

    // 5-col (ZenX template): date, category, note, type, amount
    // 4-col (legacy): date, note, type, amount
    // 5-col (bank, legacy): date, note, debit, credit, balance
    // 3-col (legacy): date, note, amount

    let date, note, type, amount, category;

    if (cols.length >= 5 && ['income', 'expense', 'thu', 'chi'].includes(cols[3])) {
      date = parseDate(cols[0]);
      category = cols[1]?.trim() || 'Khác';
      note = cols[2];
      type = (cols[3] === 'income' || cols[3] === 'thu') ? 'income' : 'expense';
      amount = Math.abs(parseAmount(cols[4]));
    } else if (cols.length >= 4 && ['income', 'expense', 'thu', 'chi'].includes(cols[2])) {
      date = parseDate(cols[0]);
      note = cols[1];
      category = note?.trim().slice(0, 50) || 'Khác';
      type = (cols[2] === 'income' || cols[2] === 'thu') ? 'income' : 'expense';
      amount = Math.abs(parseAmount(cols[3]));
    } else if (cols.length >= 5) {
      date = parseDate(cols[0]);
      note = cols[1];
      category = note?.trim().slice(0, 50) || 'Khác';
      const debit = parseAmount(cols[2]);
      const credit = parseAmount(cols[3]);
      if (!isNaN(credit) && credit > 0) { type = 'income'; amount = credit; }
      else if (!isNaN(debit) && debit > 0) { type = 'expense'; amount = debit; }
      else { type = 'expense'; amount = 0; }
    } else {
      date = parseDate(cols[0]);
      note = cols[1];
      category = note?.trim().slice(0, 50) || 'Khác';
      const rawAmt = parseAmount(cols[cols.length - 1]);
      if (!isNaN(rawAmt) && rawAmt < 0) { type = 'expense'; amount = Math.abs(rawAmt); }
      else { type = 'income'; amount = Math.abs(rawAmt || 0); }
    }

    if (!date || isNaN(date.getTime())) return { idx: i, valid: false, raw: line, errorKey: 'invalidDate' };
    if (isNaN(amount) || amount <= 0) return { idx: i, valid: false, raw: line, errorKey: 'invalidAmount' };

    return { idx: i, valid: true, raw: line, date, note: note || '', category, type, amount, isLatteFactor: isLikelyLatte(category) };
  });
}
```

## Bước 4 — Module đọc file MISA, chạy ngầm trong browser

**File mới:** `src/core/utils/misaImportAdapter.js`

```js
import { parseDate } from './importParsing';
import { isLikelyLatte } from './latteDetection';

// Dynamic import: chỉ tải thư viện xlsx khi user thực sự chọn nguồn MISA
export async function parseMisaWorkbook(arrayBuffer) {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const rows = [];
  let idx = 0;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
    const headerIdx = data.findIndex(r => String(r[0]).trim() === 'STT');
    if (headerIdx === -1) continue;

    const header = data[headerIdx];
    const colIdx = (name) => header.findIndex(h => String(h).trim() === name);
    const idxNgay = colIdx('Ngày');
    const idxThu = colIdx('Số tiền thu');
    const idxChi = colIdx('Số tiền chi');
    const idxCha = colIdx('Hạng mục cha');
    const idxCon = colIdx('Hạng mục con');
    const idxDienGiai = colIdx('Diễn giải');

    for (let i = headerIdx + 1; i < data.length; i++) {
      const r = data[i];
      if (!r[0]) continue;
      const thu = parseFloat(String(r[idxThu]).replace(/[^\d.-]/g, '')) || 0;
      const chi = parseFloat(String(r[idxChi]).replace(/[^\d.-]/g, '')) || 0;
      const cha = String(r[idxCha] || '').trim();
      const con = String(r[idxCon] || '').trim();
      const category = con || cha || 'Khác';
      const note = String(r[idxDienGiai] || '').trim();
      const type = thu > 0 ? 'income' : 'expense';
      const amount = thu > 0 ? thu : chi;
      const date = parseDate(String(r[idxNgay] || '').trim());

      if (!date || isNaN(date.getTime()) || amount <= 0) continue;

      rows.push({
        idx: idx++,
        valid: true,
        raw: `${sheetName}: ${category}`,
        date,
        note,
        category,
        type,
        amount: Math.round(amount),
        isLatteFactor: isLikelyLatte(category),
      });
    }
  }
  return rows;
}
```

**Đã test logic này trực tiếp trên file MISA thật của Hà Phong** (3 sheet: tiền mặt/mb bank/momo) → 110/110 dòng, tổng thu/chi khớp chính xác với số liệu đã đối soát tay, không có ngày lỗi.

## Bước 5 — `package.json`

Thêm vào `dependencies` (KHÔNG phải devDependencies — thư viện này chạy trong browser của user thật):
```json
"xlsx": "^0.18.5"
```
Nhờ dùng `await import('xlsx')` (dynamic import) trong Bước 4, Vite sẽ tách `xlsx` thành 1 chunk riêng — chỉ user nào bấm "File MISA" mới tải, không ảnh hưởng bundle size của những người chỉ dùng CSV.

## Bước 6 — `src/web/pages/ImportTransactions.jsx`: viết lại

Xoá toàn bộ `parseAmount`, `parseDate`, `parseCsvLine`, `parseRows` cục bộ (dòng 18-115 trong file hiện tại). Thay đầu file bằng:
```js
import { parseCsvRows } from '../../core/utils/importParsing';
import { parseMisaWorkbook } from '../../core/utils/misaImportAdapter';
```

Thêm state:
```js
const [source, setSource] = useState('csv'); // 'csv' | 'misa'
const [parsing, setParsing] = useState(false);
```

Sửa `handleParse`:
```js
const handleParse = () => {
  setError('');
  setImportedCount(null);
  try {
    const parsed = parseCsvRows(csvText);
    if (parsed.length === 0) {
      setError(t('importTransactions.errors.noRows', {}, 'Không có dữ liệu hợp lệ.'));
      return;
    }
    setRows(parsed);
    setSelected(new Set(parsed.filter(r => r.valid).map(r => r.idx)));
  } catch {
    setError(t('importTransactions.errors.parse', {}, 'Không thể phân tích CSV.'));
  }
};
```

Sửa `handleFileUpload` — rẽ nhánh theo `source`, nguồn MISA tự parse luôn không cần bấm "Phân tích":
```js
const handleFileUpload = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setError('');

  if (source === 'misa') {
    setParsing(true);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = await parseMisaWorkbook(buffer);
      if (parsed.length === 0) {
        setError(t('importTransactions.errors.noRows', {}, 'Không có dữ liệu hợp lệ.'));
      } else {
        setRows(parsed);
        setSelected(new Set(parsed.map(r => r.idx)));
      }
    } catch {
      setError(t('importTransactions.errors.misaParse', {}, 'Không thể đọc file MISA. Kiểm tra lại file xuất từ Sổ thu chi MISA.'));
    } finally {
      setParsing(false);
    }
    return;
  }

  const reader = new FileReader();
  reader.onload = (ev) => setCsvText(ev.target.result || '');
  reader.readAsText(file, 'UTF-8');
};
```

Sửa khối "chưa có rows" (dòng 227-258 hiện tại) — thêm toggle nguồn ở đầu, ẩn textarea khi chọn MISA:
```jsx
{!rows && (
  <div className="rounded-zx border border-zx-line bg-zx-surface p-6 space-y-4">
    <div className="flex gap-2">
      <button type="button" onClick={() => { setSource('csv'); setError(''); }}
        className={`rounded-zx-sm px-3 py-2 text-sm font-medium transition ${
          source === 'csv' ? 'bg-zx-accent text-zx-on-accent' : 'border border-zx-line text-zx-text-soft hover:text-zx-text'
        }`}>
        {t('importTransactions.sourceCsv', {}, 'CSV chuẩn ZenX')}
      </button>
      <button type="button" onClick={() => { setSource('misa'); setError(''); }}
        className={`rounded-zx-sm px-3 py-2 text-sm font-medium transition ${
          source === 'misa' ? 'bg-zx-accent text-zx-on-accent' : 'border border-zx-line text-zx-text-soft hover:text-zx-text'
        }`}>
        {t('importTransactions.sourceMisa', {}, 'File MISA (.xlsx)')}
      </button>
    </div>

    {source === 'csv' ? (
      <>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-zx-text">{t('importTransactions.pasteLabel')}</p>
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-zx-sm border border-zx-line px-3 py-2 text-xs text-zx-text-soft hover:text-zx-text transition">
            <Upload className="h-3.5 w-3.5" /> {t('importTransactions.uploadCSV')}
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
        </div>
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          rows={8}
          placeholder={t('importTransactions.pastePlaceholder', {}, '')}
          className="w-full rounded-zx-sm border border-zx-line bg-zx-bg p-3 font-mono text-xs text-zx-text outline-none focus:ring-2 focus:ring-zx-accent resize-none"
        />
        <div className="space-y-1 text-xs text-zx-text-soft">
          <p>{t('importTransactions.formatHint')}</p>
          <p>{t('importTransactions.formatHintAlt')}</p>
        </div>
        <Button type="button" onClick={handleParse} disabled={!csvText.trim()} className="bg-zx-accent text-zx-on-accent hover:opacity-90">
          {t('importTransactions.parseButton')}
        </Button>
      </>
    ) : (
      <div className="space-y-3">
        <p className="text-sm text-zx-text-soft">
          {t('importTransactions.misaHint', {}, 'Chọn file Excel xuất ra từ MISA Sổ Thu Chi — hệ thống tự đọc các sheet (tiền mặt, ngân hàng, ví điện tử...), tự nhận diện hạng mục thu/chi, không cần chỉnh sửa trước.')}
        </p>
        <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileUpload} />
        <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={parsing}
          className="bg-zx-accent text-zx-on-accent hover:opacity-90">
          {parsing ? t('importTransactions.parsingMisa', {}, 'Đang đọc file...') : t('importTransactions.uploadMisa', {}, 'Tải file MISA (.xlsx)')}
        </Button>
      </div>
    )}
  </div>
)}
```

Sửa hiển thị lỗi dòng (preview table, cột Trạng thái) — đổi từ `row.error` sang dịch từ `errorKey`:
```jsx
<span className="text-zx-negative" title={row.errorKey ? t('importTransactions.errors.' + row.errorKey) : ''}>
  {t('importTransactions.statusError', {}, '✕')}
</span>
```

**Bảng preview** (dòng ~276-323): thêm cột "Danh mục" ngay sau cột Ghi chú:
```jsx
<th className="px-3 py-2.5 text-left">{t('importTransactions.colCategory')}</th>
```
```jsx
<td className="px-3 py-2.5 text-zx-text">{row.category}</td>
```
Thêm badge "☕ Latte" có thể bấm để toggle, đặt cạnh badge loại giao dịch (tái dùng style từ `Transactions.jsx:320`):
```jsx
{row.valid && row.isLatteFactor && (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      setRows(prev => prev.map(r => r.idx === row.idx ? { ...r, isLatteFactor: !r.isLatteFactor } : r));
    }}
    className="rounded-full bg-red-950 px-2 py-0.5 text-[10px] text-red-300"
  >
    ☕ Latte
  </button>
)}
```

**`handleImport`** (dòng ~174-184): đổi `isLatteFactor: false` thành:
```js
isLatteFactor: row.isLatteFactor || false,
```
và đảm bảo `category: row.category` được ghi vào Firestore (thay literal cũ `category: note?.trim().slice(0, 50)`).

## Bước 7 — i18n

**`src/core/i18n/dictionaries/vi.js`** (trong block `importTransactions`, thêm các key sau, giữ nguyên key cũ):
```js
sourceCsv: 'CSV chuẩn ZenX',
sourceMisa: 'File MISA (.xlsx)',
misaHint: 'Chọn file Excel xuất ra từ MISA Sổ thu chi — hệ thống tự đọc và chuẩn hoá, không cần chỉnh sửa trước.',
uploadMisa: 'Tải file MISA (.xlsx)',
parsingMisa: 'Đang đọc file...',
colCategory: 'Danh mục',
pastePlaceholder: 'Dán dữ liệu CSV ở đây...\nVí dụ: 2024-01-15,Ăn sáng,Bún bò sáng,expense,50000\nhoặc: 2024-01-15,Ăn sáng,expense,50000',
formatHint: 'Định dạng đầy đủ: ngày, danh mục, ghi chú, loại (income/expense), số tiền',
formatHintAlt: 'Hoặc: ngày, ghi chú/danh mục, loại, số tiền — hoặc: ngày, ghi chú, số tiền (dương=thu, âm=chi)',
errors: {
  // giữ các key lỗi cũ (insufficientColumns, invalidDate, invalidAmount, noRows, parse...), thêm:
  misaParse: 'Không thể đọc file MISA. Kiểm tra lại file xuất từ Sổ thu chi MISA.',
},
```

**`src/core/i18n/dictionaries/en.js`** (tương tự bằng tiếng Anh):
```js
sourceCsv: 'ZenX standard CSV',
sourceMisa: 'MISA file (.xlsx)',
misaHint: 'Select the Excel file exported from MISA Sổ thu chi — the system reads and normalizes it automatically, no manual editing needed.',
uploadMisa: 'Upload MISA file (.xlsx)',
parsingMisa: 'Reading file...',
colCategory: 'Category',
pastePlaceholder: 'Paste CSV data here...\nExample: 2024-01-15,Breakfast,Morning bun bo,expense,50000\nor: 2024-01-15,Breakfast,expense,50000',
formatHint: 'Full format: date, category, note, type (income/expense), amount',
formatHintAlt: 'Or: date, note/category, type, amount — or: date, note, amount (positive=income, negative=expense)',
errors: {
  misaParse: 'Could not read the MISA file. Please check the file exported from MISA Sổ thu chi.',
},
```

---

## Dọn dẹp
- Xoá `scripts/misa-to-zenx-csv.js` nếu đã tạo từ trước — không còn cần thiết.
- Xoá/bỏ qua file `SPEC_import_transactions_category_latte.md` (v1) — đã được gộp toàn bộ vào file này.

## Definition of done
- [ ] Chọn "CSV chuẩn ZenX" → paste/upload .csv, parse, preview, import hoạt động đúng (kể cả 3 format cũ: 3-cột, 4-cột, bank 5-cột — không regression).
- [ ] Chọn "File MISA (.xlsx)" → bấm tải file → **tự động** hiện preview (không cần bấm Phân tích) với đúng 110 dòng, category đúng theo Hạng mục cha/con, note giữ Diễn giải gốc.
- [ ] Badge ☕ Latte tự gắn đúng cho các dòng Cafe/Ăn ngoài... ở cả 2 nguồn, bấm được để tắt nếu detect sai.
- [ ] `npm run build` không tăng kích thước chunk chính (kiểm tra `dist/assets` — `xlsx` phải nằm ở 1 file js riêng, chỉ load khi vào nhánh MISA).
- [ ] Import xong → Firestore có đúng `category`, `note`, `isLatteFactor` như preview.
- [ ] Latte Factor Projection sau import phản ánh đúng số liệu (không rỗng).
