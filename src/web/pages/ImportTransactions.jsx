import { useState, useRef } from 'react';
import { FileUp, CheckSquare, Square, Upload } from 'lucide-react';
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore/lite';
import { useAuth } from '../../core/auth/useAuth';
import { useI18n } from '../../core/i18n/useI18n';
import { Button } from '../../core/../web/components/ui/button';
import { db } from '../../core/services/firebaseDb';
import { invalidateDashboardStatsCache } from '../../core/services/dashboardService';
import { invalidateLatteFactorCache } from '../../core/services/latteFactorService';
import { invalidatePayYourselfFirstCache } from '../../core/services/payYourselfFirstService';
import { invalidateReportsCache } from '../../core/services/reportsService';
import { invalidateTransactionsCache } from '../../core/services/transactionService';
import { invalidateWeeklyReviewCache, getCurrentWeekMeta } from '../../core/services/weeklyReviewService';
import { invalidateWealthRoadmapCache } from '../../core/services/wealthRoadmapService';
import { invalidateAICoachCache } from '../../core/services/aiCoachService';
import { formatMoney, formatDate } from '../../core/utils/formatters';
import { parseCsvRows } from '../../core/utils/importParsing';
import { parseMisaWorkbook } from '../../core/utils/misaImportAdapter';
import { BUCKET_KEYS, BUCKET_LABELS_VI } from '../../core/utils/bucketClassification';

export default function ImportTransactions() {
  const { user } = useAuth();
  const { t } = useI18n();
  const fileInputRef = useRef(null);
  const [source, setSource] = useState('csv');
  const [csvText, setCsvText] = useState('');
  const [rows, setRows] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [importing, setImporting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importedCount, setImportedCount] = useState(null);
  const [error, setError] = useState('');

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
          bucket: row.type === 'transfer' ? (row.bucket || null) : null,
          amount: row.amount,
          currency: 'VND',
          isLatteFactor: row.isLatteFactor || false,
          createdAt: serverTimestamp(),
        })
      ));
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
    <main className="max-w-6xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-8 space-y-6">
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
          {/* Source toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setSource('csv'); setError(''); }}
              className={`rounded-zx-sm px-3 py-2 text-sm font-medium transition ${
                source === 'csv' ? 'bg-zx-accent text-zx-on-accent' : 'border border-zx-line text-zx-text-soft hover:text-zx-text'
              }`}
            >
              {t('importTransactions.sourceCsv')}
            </button>
            <button
              type="button"
              onClick={() => { setSource('misa'); setError(''); }}
              className={`rounded-zx-sm px-3 py-2 text-sm font-medium transition ${
                source === 'misa' ? 'bg-zx-accent text-zx-on-accent' : 'border border-zx-line text-zx-text-soft hover:text-zx-text'
              }`}
            >
              {t('importTransactions.sourceMisa')}
            </button>
          </div>

          {source === 'csv' ? (
            <>
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
                <p>{t('importTransactions.formatHint')}</p>
                <p>{t('importTransactions.formatHintAlt')}</p>
              </div>
              <Button type="button" onClick={handleParse} disabled={!csvText.trim()} className="bg-zx-accent text-zx-on-accent hover:opacity-90">
                {t('importTransactions.parseButton')}
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-zx-text-soft">{t('importTransactions.misaHint')}</p>
              <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileUpload} />
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={parsing}
                className="bg-zx-accent text-zx-on-accent hover:opacity-90"
              >
                {parsing ? t('importTransactions.parsingMisa') : t('importTransactions.uploadMisa')}
              </Button>
            </div>
          )}
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
            <table className="w-full min-w-[680px] text-sm border-collapse">
              <thead className="bg-zx-bg text-xs uppercase tracking-wide text-zx-text-soft">
                <tr>
                  <th className="w-8 px-3 py-2.5"></th>
                  <th className="px-3 py-2.5 text-left">{t('importTransactions.colDate', {}, 'Ngày')}</th>
                  <th className="px-3 py-2.5 text-left">{t('importTransactions.colCategory')}</th>
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
                        : null}
                    </td>
                    <td className="px-3 py-2.5 text-zx-text-soft whitespace-nowrap">
                      {row.valid ? formatDate(row.date) : '—'}
                    </td>
                    <td className="px-3 py-2.5 max-w-[140px] truncate text-zx-text">{row.category || '—'}</td>
                    <td className="px-3 py-2.5 max-w-[160px] truncate text-zx-text-soft">{row.note || '—'}</td>
                    <td className="px-3 py-2.5">
                      {row.valid && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`rounded px-2 py-0.5 text-xs ${row.type === 'income' ? 'bg-green-950 text-zx-positive' : row.type === 'transfer' ? 'bg-purple-950 text-purple-300' : 'bg-orange-950 text-orange-300'}`}>
                            {row.type}
                          </span>
                          {row.type === 'transfer' && row.bucket && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const currentIdx = BUCKET_KEYS.indexOf(row.bucket);
                                const nextBucket = currentIdx >= 0 && currentIdx < BUCKET_KEYS.length - 1
                                  ? BUCKET_KEYS[currentIdx + 1]
                                  : null;
                                setRows(prev => prev.map(r => r.idx === row.idx
                                  ? { ...r, type: nextBucket ? 'transfer' : 'expense', bucket: nextBucket }
                                  : r));
                              }}
                              className="rounded-full bg-purple-950 px-2 py-0.5 text-[10px] text-purple-300"
                              title="Bấm để đổi/bỏ bucket"
                            >
                              ↗ {BUCKET_LABELS_VI[row.bucket]}
                            </button>
                          )}
                          {row.isLatteFactor && (
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
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">
                      {row.valid ? formatMoney(row.amount, 'VND') : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs">
                      {row.valid
                        ? <span className="text-zx-positive">{t('importTransactions.statusOk', {}, '✓')}</span>
                        : <span className="text-zx-negative" title={row.errorKey ? t('importTransactions.errors.' + row.errorKey) : ''}>
                            {t('importTransactions.statusError', {}, '✕')}
                          </span>
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
