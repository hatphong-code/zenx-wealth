import { useState, useRef } from 'react';
import { FileUp, CheckSquare, Square, Upload } from 'lucide-react';
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore/lite';
import { useAuth } from '../auth/useAuth';
import { useI18n } from '../i18n/useI18n';
import { Button } from '../components/ui/button';
import { db } from '../services/firebaseDb';
import { invalidateDashboardStatsCache } from '../services/dashboardService';
import { invalidateLatteFactorCache } from '../services/latteFactorService';
import { invalidatePayYourselfFirstCache } from '../services/payYourselfFirstService';
import { invalidateReportsCache } from '../services/reportsService';
import { invalidateTransactionsCache } from '../services/transactionService';
import { invalidateWeeklyReviewCache, getCurrentWeekMeta } from '../services/weeklyReviewService';
import { invalidateWealthRoadmapCache } from '../services/wealthRoadmapService';
import { invalidateAICoachCache } from '../services/aiCoachService';
import { formatMoney, formatDate } from '../utils/formatters';

function parseAmount(raw) {
  if (!raw) return NaN;
  const cleaned = String(raw).replace(/[^\d.,-]/g, '').replace(/,/g, '');
  return parseFloat(cleaned);
}

function parseDate(raw) {
  if (!raw) return null;
  const s = raw.trim();
  // Try ISO yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s.slice(0, 10));
  // Try dd/mm/yyyy
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) return new Date(`${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`);
  // Try dd-mm-yyyy
  const dmy2 = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (dmy2) return new Date(`${dmy2[3]}-${dmy2[2].padStart(2,'0')}-${dmy2[1].padStart(2,'0')}`);
  return null;
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
    if (ch === '\t' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

function parseRows(csvText, t) {
  const lines = csvText.trim().split('\n').filter(l => l.trim());
  if (lines.length === 0) return [];

  // Skip header if first line has no parseable date or amount
  let startIdx = 0;
  const firstDate = parseDate(parseCsvLine(lines[0])[0]);
  const firstAmt = parseAmount(parseCsvLine(lines[0]).slice(-1)[0]);
  if (!firstDate && isNaN(firstAmt)) startIdx = 1;

  return lines.slice(startIdx).map((line, i) => {
    const cols = parseCsvLine(line);
    if (cols.length < 2) return { idx: i, valid: false, raw: line, error: t('importTransactions.errors.insufficientColumns') };

    // Detect format:
    // 4-col: date, note, type, amount
    // 3-col: date, note, amount (positive=income, negative=expense)
    // 5-col (bank): date, note, debit, credit, balance → debit=expense, credit=income

    let date, note, type, amount;

    if (cols.length >= 4 && (cols[2] === 'income' || cols[2] === 'expense' || cols[2] === 'thu' || cols[2] === 'chi')) {
      date = parseDate(cols[0]);
      note = cols[1];
      type = (cols[2] === 'income' || cols[2] === 'thu') ? 'income' : 'expense';
      amount = Math.abs(parseAmount(cols[3]));
    } else if (cols.length >= 5) {
      // bank format: date, description, debit, credit, ...
      date = parseDate(cols[0]);
      note = cols[1];
      const debit = parseAmount(cols[2]);
      const credit = parseAmount(cols[3]);
      if (!isNaN(credit) && credit > 0) { type = 'income'; amount = credit; }
      else if (!isNaN(debit) && debit > 0) { type = 'expense'; amount = debit; }
      else { type = 'expense'; amount = 0; }
    } else {
      // 3-col: date, note, amount
      date = parseDate(cols[0]);
      note = cols[1];
      const rawAmt = parseAmount(cols[cols.length - 1]);
      if (!isNaN(rawAmt) && rawAmt < 0) { type = 'expense'; amount = Math.abs(rawAmt); }
      else { type = 'income'; amount = Math.abs(rawAmt || 0); }
    }

    if (!date || isNaN(date.getTime())) {
      return { idx: i, valid: false, raw: line, error: t('importTransactions.errors.invalidDate') };
    }
    if (isNaN(amount) || amount <= 0) {
      return { idx: i, valid: false, raw: line, error: t('importTransactions.errors.invalidAmount') };
    }

    return {
      idx: i,
      valid: true,
      raw: line,
      date,
      note: note || '',
      category: note?.trim().slice(0, 50) || (type === 'income' ? 'Khác' : 'Khác'),
      type,
      amount,
    };
  });
}

export default function ImportTransactions() {
  const { user } = useAuth();
  const { t } = useI18n();
  const fileInputRef = useRef(null);
  const [csvText, setCsvText] = useState('');
  const [rows, setRows] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(null);
  const [error, setError] = useState('');

  const handleParse = () => {
    setError('');
    setImportedCount(null);
    try {
      const parsed = parseRows(csvText, t);
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

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(ev.target.result || '');
    reader.readAsText(file, 'UTF-8');
  };

  const toggleRow = (idx) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    const valid = rows?.filter(r => r.valid).map(r => r.idx) || [];
    if (selected.size === valid.length) setSelected(new Set());
    else setSelected(new Set(valid));
  };

  const handleImport = async () => {
    if (!user || !rows) return;
    setImporting(true);
    setError('');
    try {
      const toImport = rows.filter(r => r.valid && selected.has(r.idx));
      const colRef = collection(db, 'users', user.uid, 'transactions');
      await Promise.all(toImport.map(row =>
        addDoc(colRef, {
          date: Timestamp.fromDate(row.date),
          category: row.category,
          note: row.note,
          type: row.type,
          amount: row.amount,
          currency: 'VND',
          isLatteFactor: false,
          createdAt: serverTimestamp(),
        })
      ));
      // Invalidate all caches
      invalidateTransactionsCache(user.uid);
      invalidateDashboardStatsCache(user.uid);
      invalidateLatteFactorCache(user.uid);
      invalidatePayYourselfFirstCache(user.uid);
      invalidateReportsCache(user.uid);
      invalidateAICoachCache(user.uid);
      const weekMeta = getCurrentWeekMeta();
      invalidateWeeklyReviewCache(user.uid, weekMeta.weekKey);
      invalidateWealthRoadmapCache(user.uid);
      setImportedCount(toImport.length);
      setRows(null);
      setCsvText('');
      setSelected(new Set());
    } catch {
      setError(t('importTransactions.errors.import', {}, 'Lỗi khi nhập giao dịch.'));
    } finally {
      setImporting(false);
    }
  };

  const validRows = rows?.filter(r => r.valid) || [];
  const selectedCount = selected.size;

  return (
    <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-8 space-y-6">
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 rounded-full border border-zx-line px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-zx-text-soft">
          <FileUp className="h-3.5 w-3.5" />
          {t('importTransactions.badge')}
        </div>
        <h1 className="font-zx-head text-2xl font-bold text-zx-text">{t('importTransactions.title')}</h1>
        <p className="text-sm text-zx-text-soft">{t('importTransactions.subtitle')}</p>
      </div>

      {importedCount !== null && (
        <div className="rounded border border-emerald-900 bg-emerald-950/30 p-4 text-sm text-emerald-200">
          {t('importTransactions.success', { count: importedCount }, `Đã nhập ${importedCount} giao dịch.`)}
        </div>
      )}
      {error && <div className="rounded border border-zx-negative/40 bg-zx-negative/10 p-3 text-sm text-zx-negative">{error}</div>}

      {!rows && (
        <div className="rounded-zx border border-zx-line bg-zx-surface p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-zx-text">{t('importTransactions.pasteLabel')}</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-zx-sm border border-zx-line px-3 py-2 text-xs text-zx-text-soft hover:text-zx-text transition"
            >
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
            <p>{t('importTransactions.formatHint', {}, 'Định dạng: ngày, ghi chú, loại, số tiền')}</p>
            <p>{t('importTransactions.formatHintAlt', {}, 'Hoặc: ngày, ghi chú, số tiền')}</p>
          </div>

          <Button type="button" onClick={handleParse} disabled={!csvText.trim()} className="bg-zx-accent text-zx-on-accent hover:opacity-90">
            {t('importTransactions.parseButton')}
          </Button>
        </div>
      )}

      {rows && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-zx-text">
              {t('importTransactions.previewTitle', { count: rows.length }, `Xem trước (${rows.length} dòng)`)}
            </p>
            <div className="flex items-center gap-3 text-xs text-zx-text-soft">
              <span>{t('importTransactions.selectedCount', { count: selectedCount, total: validRows.length }, `${selectedCount}/${validRows.length}`)}</span>
              <button type="button" onClick={toggleAll} className="flex items-center gap-1 hover:text-zx-text transition">
                {selectedCount === validRows.length ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                {selectedCount === validRows.length ? t('importTransactions.deselectAll', {}, 'Bỏ chọn') : t('importTransactions.selectAll', {}, 'Chọn tất cả')}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-zx border border-zx-line">
            <table className="w-full min-w-[600px] text-sm border-collapse">
              <thead className="bg-zx-bg text-xs uppercase tracking-wide text-zx-text-soft">
                <tr>
                  <th className="w-8 px-3 py-2.5"></th>
                  <th className="px-3 py-2.5 text-left">{t('importTransactions.colDate', {}, 'Ngày')}</th>
                  <th className="px-3 py-2.5 text-left">{t('importTransactions.colNote', {}, 'Ghi chú')}</th>
                  <th className="px-3 py-2.5 text-left">{t('importTransactions.colType', {}, 'Loại')}</th>
                  <th className="px-3 py-2.5 text-right">{t('importTransactions.colAmount', {}, 'Số tiền')}</th>
                  <th className="px-3 py-2.5 text-center">{t('importTransactions.colStatus', {}, 'Trạng thái')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.idx}
                    className={`border-t border-zx-line ${!row.valid ? 'opacity-50' : 'cursor-pointer hover:bg-zx-surface-2'}`}
                    onClick={() => row.valid && toggleRow(row.idx)}
                  >
                    <td className="px-3 py-2.5 text-center">
                      {row.valid
                        ? selected.has(row.idx) ? <CheckSquare className="h-4 w-4 text-zx-accent mx-auto" /> : <Square className="h-4 w-4 text-zx-text-soft mx-auto" />
                        : null
                      }
                    </td>
                    <td className="px-3 py-2.5 text-zx-text-soft whitespace-nowrap">
                      {row.valid ? formatDate(row.date) : '—'}
                    </td>
                    <td className="px-3 py-2.5 max-w-[180px] truncate text-zx-text">{row.note || '—'}</td>
                    <td className="px-3 py-2.5">
                      {row.valid && (
                        <span className={`rounded px-2 py-0.5 text-xs ${row.type === 'income' ? 'bg-green-950 text-zx-positive' : 'bg-orange-950 text-orange-300'}`}>
                          {row.type}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">
                      {row.valid ? formatMoney(row.amount, 'VND') : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs">
                      {row.valid
                        ? <span className="text-zx-positive">{t('importTransactions.statusOk', {}, '✓')}</span>
                        : <span className="text-zx-negative" title={row.error}>{t('importTransactions.statusError', {}, '✕')} {row.error}</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              onClick={handleImport}
              disabled={selectedCount === 0 || importing}
              className="bg-zx-accent text-zx-on-accent hover:opacity-90"
            >
              {importing
                ? t('importTransactions.importing', {}, 'Đang nhập...')
                : t('importTransactions.importButton', { count: selectedCount }, `Nhập ${selectedCount} giao dịch`)}
            </Button>
            <Button
              type="button"
              onClick={() => { setRows(null); setCsvText(''); setSelected(new Set()); setError(''); }}
              className="border border-zx-line bg-transparent text-zx-text-soft hover:text-zx-text"
            >
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}

