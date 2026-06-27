import { useEffect, useRef, useState } from 'react';
import { Check, Download, Pencil, ShieldCheck, Upload, X } from 'lucide-react';
import { useAuth } from '../../core/auth/useAuth';
import { useFundsData } from '../../core/hooks/useFundsData';
import { useI18n } from '../../core/i18n/useI18n';
import {
  generateCsvTemplate,
  importFunds,
  parseFundsCsv,
  upsertFund,
} from '../../core/services/fundService';
import { ASSET_TYPE_LABELS } from '../../core/data/referenceFunds';

/* ─── Shared Tab component ─── */
function Tab({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium rounded-t-md transition border-b-2 ${
        active
          ? 'border-zx-accent text-zx-accent bg-zx-surface'
          : 'border-transparent text-zx-text-soft hover:text-zx-text hover:border-zx-line'
      }`}>
      {children}
    </button>
  );
}

/* ─── Inline editable return value ─── */
function ReturnCell({ value, editing, editKey, editForm, setEditForm }) {
  if (!editing) {
    return <span className={value != null ? 'text-zx-text' : 'text-zx-text-soft'}>
      {value != null ? `${value}%` : '—'}
    </span>;
  }
  return (
    <input
      type="number" step="0.1"
      value={editForm[editKey] ?? ''}
      onChange={e => setEditForm(f => ({ ...f, [editKey]: e.target.value }))}
      placeholder="—"
      className="w-16 rounded border border-zx-line bg-zx-bg px-2 py-1 text-xs text-zx-text focus:outline-none focus:ring-1 focus:ring-zx-accent"
    />
  );
}

/* ─── Fund List Tab ─── */
function FundListTab({ funds, refetch, t }) {
  const { user } = useAuth();
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);

  function startEdit(fund) {
    setEditingId(fund.id);
    setEditForm({
      return1y: fund.historicalReturns?.['1y'] ?? '',
      return3y: fund.historicalReturns?.['3y'] ?? '',
      return5y: fund.historicalReturns?.['5y'] ?? '',
      expenseRatioPct: fund.expenseRatioPct ?? '',
      aumBillion: fund.aumBillion ?? '',
      source: fund.source ?? '',
    });
  }

  async function saveEdit(fund) {
    setSaving(true);
    try {
      const toNum = (v, fallback) => v === '' || v == null ? fallback : Number(v);
      await upsertFund({
        id: fund.id,
        historicalReturns: {
          '1y': editForm.return1y === '' ? null : Number(editForm.return1y),
          '3y': editForm.return3y === '' ? null : Number(editForm.return3y),
          '5y': editForm.return5y === '' ? null : Number(editForm.return5y),
        },
        expenseRatioPct: toNum(editForm.expenseRatioPct, fund.expenseRatioPct),
        aumBillion: toNum(editForm.aumBillion, fund.aumBillion),
        source: editForm.source || fund.source,
      });
      setEditingId(null);
      setSavedId(fund.id);
      setTimeout(() => setSavedId(null), 2500);
      refetch();
    } finally {
      setSaving(false);
    }
  }

  const fmtDate = ts => {
    if (!ts) return '—';
    const d = ts.toDate?.() ?? new Date(ts.seconds * 1000);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (!funds.length) {
    return <p className="text-sm text-zx-text-soft py-8 text-center">{t('adminFunds.noFunds')}</p>;
  }

  const inputCls = 'w-full rounded border border-zx-line bg-zx-bg px-2 py-1 text-xs text-zx-text focus:outline-none focus:ring-1 focus:ring-zx-accent';

  return (
    <div className="overflow-x-auto rounded-zx border border-zx-line">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-zx-surface-2 border-b border-zx-line">
            {['colName', 'colType', 'colExpense', 'colRisk', 'col1y', 'col3y', 'col5y', 'colUpdated', ''].map(k => (
              <th key={k} className="px-3 py-2.5 text-left font-semibold text-zx-text-soft uppercase tracking-[0.1em] whitespace-nowrap">
                {k ? t(`adminFunds.${k}`) : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zx-line">
          {funds.map(fund => {
            const isEditing = editingId === fund.id;
            return (
              <tr key={fund.id} className={`bg-zx-surface transition ${isEditing ? 'bg-zx-surface-2' : 'hover:bg-zx-surface-2/50'}`}>
                <td className="px-3 py-3">
                  <p className="font-semibold text-zx-text">{fund.name}</p>
                  <p className="text-zx-text-soft">{fund.manager}</p>
                  {isEditing && (
                    <input value={editForm.source} onChange={e => setEditForm(f => ({ ...f, source: e.target.value }))}
                      placeholder="source / factsheet" className={`${inputCls} mt-1`} />
                  )}
                  {!isEditing && fund.source && (
                    <p className="text-[10px] text-zx-text-soft mt-0.5 italic truncate max-w-[160px]">{fund.source}</p>
                  )}
                </td>
                <td className="px-3 py-3 text-zx-text-soft whitespace-nowrap">
                  {ASSET_TYPE_LABELS[fund.assetType]?.vi ?? fund.assetType}
                </td>
                <td className="px-3 py-3">
                  {isEditing ? (
                    <input type="number" step="0.01" value={editForm.expenseRatioPct}
                      onChange={e => setEditForm(f => ({ ...f, expenseRatioPct: e.target.value }))}
                      className="w-16 rounded border border-zx-line bg-zx-bg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-zx-accent" />
                  ) : (
                    <span>{fund.expenseRatioPct}%</span>
                  )}
                </td>
                <td className="px-3 py-3 text-center text-zx-text-soft">{fund.riskTier}</td>
                {['return1y', 'return3y', 'return5y'].map((key, ri) => (
                  <td key={key} className="px-3 py-3 text-center">
                    <ReturnCell
                      value={fund.historicalReturns?.[['1y','3y','5y'][ri]]}
                      editing={isEditing}
                      editKey={key}
                      editForm={editForm}
                      setEditForm={setEditForm}
                    />
                  </td>
                ))}
                <td className="px-3 py-3 text-zx-text-soft whitespace-nowrap">{fmtDate(fund.updatedAt)}</td>
                <td className="px-3 py-3">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => saveEdit(fund)} disabled={saving}
                        className="flex items-center gap-1 rounded-zx-sm bg-zx-accent px-3 py-1.5 text-xs font-semibold text-zx-on-accent hover:opacity-90 disabled:opacity-50 whitespace-nowrap">
                        <Check className="h-3 w-3" />
                        {saving ? t('adminFunds.saving') : t('adminFunds.saveBtn')}
                      </button>
                      <button type="button" onClick={() => setEditingId(null)}
                        className="flex items-center gap-1 rounded-zx-sm border border-zx-line px-3 py-1.5 text-xs text-zx-text-soft hover:text-zx-text">
                        <X className="h-3 w-3" />
                        {t('adminFunds.cancelBtn')}
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => startEdit(fund)}
                      className="flex items-center gap-1 rounded-zx-sm border border-zx-line px-3 py-1.5 text-xs text-zx-text-soft hover:text-zx-text hover:border-zx-accent/50 transition">
                      <Pencil className="h-3 w-3" />
                      {savedId === fund.id ? (
                        <span className="text-zx-positive">{t('adminFunds.savedOk')}</span>
                      ) : t('adminFunds.editBtn')}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Import CSV Tab ─── */
function ImportCsvTab({ funds, refetch, t }) {
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState(null); // parsed rows
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null); // { success: n } or { error: msg }
  const fileRef = useRef(null);

  function handlePreview() {
    if (!csv.trim()) return;
    try {
      const rows = parseFundsCsv(csv);
      setPreview(rows);
      setResult(null);
    } catch (err) {
      setResult({ error: err.message });
    }
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      setCsv(evt.target.result);
      setPreview(null);
      setResult(null);
    };
    reader.readAsText(file, 'utf-8');
  }

  function downloadTemplate() {
    const content = generateCsvTemplate();
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'funds_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    if (!preview) return;
    setImporting(true);
    setResult(null);
    try {
      const n = await importFunds(preview, funds);
      setResult({ success: n });
      setCsv('');
      setPreview(null);
      refetch();
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setImporting(false);
    }
  }

  const validCount = preview?.filter(r => !r._errors?.length).length ?? 0;
  const invalidCount = preview?.filter(r => r._errors?.length).length ?? 0;

  const inputCls = 'w-full rounded-zx-sm border border-zx-line bg-zx-bg px-3 py-2 text-xs text-zx-text focus:outline-none focus:ring-2 focus:ring-zx-accent';

  return (
    <div className="space-y-5">
      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={downloadTemplate}
          className="flex items-center gap-2 rounded-zx-sm border border-zx-line px-3 py-2 text-xs text-zx-text-soft hover:text-zx-text transition">
          <Download className="h-3.5 w-3.5" />
          {t('adminFunds.templateDownload')}
        </button>
        <button type="button" onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 rounded-zx-sm border border-zx-line px-3 py-2 text-xs text-zx-text-soft hover:text-zx-text transition">
          <Upload className="h-3.5 w-3.5" />
          {t('adminFunds.importUpload')}
        </button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileUpload} />
      </div>

      {/* CSV Format reminder */}
      <div className="rounded-zx-sm bg-zx-surface-2 px-3 py-2 text-[11px] text-zx-text-soft leading-relaxed">
        <span className="font-semibold text-zx-text">Cột bắt buộc:</span> id, name &nbsp;|&nbsp;
        <span className="font-semibold text-zx-text">assetType:</span> equity / balanced / bond / money_market / etf / flexible &nbsp;|&nbsp;
        <span className="font-semibold text-zx-text">return*:</span> để trống = giữ nguyên giá trị cũ &nbsp;|&nbsp;
        Giá trị không được chứa dấu phẩy.
      </div>

      {/* Textarea */}
      <div>
        <label className="text-xs text-zx-text-soft block mb-1">{t('adminFunds.importLabel')}</label>
        <textarea
          value={csv}
          onChange={e => { setCsv(e.target.value); setPreview(null); setResult(null); }}
          rows={8}
          className={`${inputCls} font-mono`}
          placeholder="id,name,fullName,manager,assetType,fundAgeYears,aumBillion,expenseRatioPct,riskTier,return1y,return3y,return5y,navPublic,source"
        />
      </div>

      {/* Preview button */}
      <button type="button" onClick={handlePreview} disabled={!csv.trim()}
        className="rounded-zx-sm border border-zx-accent px-4 py-2 text-sm font-medium text-zx-accent hover:bg-zx-accent/10 disabled:opacity-40 transition">
        {t('adminFunds.importPreview')}
      </button>

      {/* Result feedback */}
      {result?.success != null && (
        <p className="rounded-zx-sm border border-zx-positive/40 bg-zx-positive/10 px-3 py-2 text-sm text-zx-positive">
          {t('adminFunds.importSuccess', { n: result.success })}
        </p>
      )}
      {result?.error && (
        <p className="rounded-zx-sm border border-zx-negative/40 bg-zx-negative/10 px-3 py-2 text-sm text-zx-negative">
          {t('adminFunds.importGenericError', { msg: result.error })}
        </p>
      )}

      {/* Preview table */}
      {preview && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-xs">
            {validCount > 0 && (
              <span className="text-zx-positive font-medium">✓ {t('adminFunds.validRows', { n: validCount })}</span>
            )}
            {invalidCount > 0 && (
              <span className="text-zx-negative font-medium">✗ {t('adminFunds.invalidRows', { n: invalidCount })}</span>
            )}
          </div>

          <div className="overflow-x-auto rounded-zx border border-zx-line text-xs">
            <table className="w-full">
              <thead>
                <tr className="bg-zx-surface-2 border-b border-zx-line">
                  {['id', 'name', 'manager', 'return1y', 'return3y', 'return5y', 'status'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-zx-text-soft uppercase tracking-[0.1em]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zx-line">
                {preview.map(row => {
                  const ok = !row._errors?.length;
                  return (
                    <tr key={row._rowIndex} className={ok ? 'bg-zx-surface' : 'bg-zx-negative/5'}>
                      <td className="px-3 py-2 text-zx-text font-mono">{row._fund.id || '—'}</td>
                      <td className="px-3 py-2 text-zx-text">{row._fund.name || '—'}</td>
                      <td className="px-3 py-2 text-zx-text-soft">{row._fund.manager || '—'}</td>
                      <td className="px-3 py-2 text-center text-zx-text">
                        {row._fund._returnUpdates?.['1y'] != null ? `${row._fund._returnUpdates['1y']}%` : '—'}
                      </td>
                      <td className="px-3 py-2 text-center text-zx-text">
                        {row._fund._returnUpdates?.['3y'] != null ? `${row._fund._returnUpdates['3y']}%` : '—'}
                      </td>
                      <td className="px-3 py-2 text-center text-zx-text">
                        {row._fund._returnUpdates?.['5y'] != null ? `${row._fund._returnUpdates['5y']}%` : '—'}
                      </td>
                      <td className="px-3 py-2">
                        {ok ? (
                          <span className="text-zx-positive font-medium">✓ OK</span>
                        ) : (
                          <span className="text-zx-negative">{row._errors.join('; ')}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {validCount > 0 && (
            <button type="button" onClick={handleImport} disabled={importing}
              className="rounded-zx-sm bg-zx-accent px-5 py-2.5 text-sm font-semibold text-zx-on-accent hover:opacity-90 disabled:opacity-50 transition">
              {importing ? t('adminFunds.saving') : t('adminFunds.importBtn', { n: validCount })}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main page ─── */
export default function AdminFunds() {
  const { t } = useI18n();
  const { data: funds, loading, refetch } = useFundsData();
  const [activeTab, setActiveTab] = useState('list');

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-zx-line bg-zx-surface px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-zx-accent mb-2">
          <ShieldCheck className="h-3.5 w-3.5" />
          Moderator
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{t('adminFunds.pageTitle')}</h1>
        <p className="text-sm text-zx-text-soft mt-1">{t('adminFunds.pageSubtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-zx-line mb-6">
        <Tab active={activeTab === 'list'} onClick={() => setActiveTab('list')}>{t('adminFunds.tabList')}</Tab>
        <Tab active={activeTab === 'import'} onClick={() => setActiveTab('import')}>{t('adminFunds.tabImport')}</Tab>
      </div>

      {loading ? (
        <p className="text-sm text-zx-text-soft">{t('common.loading')}</p>
      ) : (
        <>
          {activeTab === 'list' && <FundListTab funds={funds} refetch={refetch} t={t} />}
          {activeTab === 'import' && <ImportCsvTab funds={funds} refetch={refetch} t={t} />}
        </>
      )}
    </main>
  );
}
