import { useEffect, useRef, useState } from 'react';
import { Check, Download, Pencil, Plus, ShieldCheck, Upload, X } from 'lucide-react';
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

const selectCls = 'rounded-zx-sm border border-zx-line bg-zx-surface px-2 py-1.5 text-xs text-zx-text focus:outline-none focus:ring-1 focus:ring-zx-accent';

/* ─── Fund List Tab ─── */
function FundListTab({ funds, refetch, t }) {
  const { user } = useAuth();
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [managerFilter, setManagerFilter] = useState('all');

  const usedTypes = [...new Set(funds.map(f => f.assetType))].sort();
  const usedManagers = [...new Set(funds.map(f => f.manager))].sort();

  const visible = funds
    .filter(f => typeFilter === 'all' || f.assetType === typeFilter)
    .filter(f => managerFilter === 'all' || f.manager === managerFilter);

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
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-zx-text-soft">{t('adminFunds.filterByType')}</label>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={selectCls}>
            <option value="all">{t('adminFunds.filterAll')}</option>
            {usedTypes.map(type => (
              <option key={type} value={type}>{ASSET_TYPE_LABELS[type]?.vi ?? type}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-zx-text-soft">{t('adminFunds.filterByManager')}</label>
          <select value={managerFilter} onChange={e => setManagerFilter(e.target.value)} className={selectCls}>
            <option value="all">{t('adminFunds.filterAll')}</option>
            {usedManagers.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <span className="text-xs text-zx-text-soft ml-auto">{visible.length} / {funds.length}</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-zx border border-zx-line">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-zx-surface-2 border-b border-zx-line">
              {['colName', 'colType', 'colAum', 'colExpense', 'colRisk', 'col1y', 'col3y', 'col5y', 'colUpdated', ''].map(k => (
                <th key={k} className="px-3 py-2.5 text-left font-semibold text-zx-text-soft uppercase tracking-[0.1em] whitespace-nowrap">
                  {k ? t(`adminFunds.${k}`) : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zx-line">
            {visible.map(fund => {
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
                  <td className="px-3 py-3 text-right">
                    {isEditing ? (
                      <input type="number" step="1" value={editForm.aumBillion ?? ''}
                        onChange={e => setEditForm(f => ({ ...f, aumBillion: e.target.value }))}
                        className="w-20 rounded border border-zx-line bg-zx-bg px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-zx-accent" />
                    ) : (
                      <span>{fund.aumBillion != null ? fund.aumBillion.toLocaleString() : '—'}</span>
                    )}
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
    </div>
  );
}

/* ─── Add Fund Tab ─── */
const EMPTY_FORM = {
  id: '', name: '', fullName: '', manager: '', assetType: 'equity',
  fundAgeYears: '', aumBillion: '', expenseRatioPct: '', riskTier: '4',
  return1y: '', return3y: '', return5y: '', navPublic: true, source: '',
};

function AddFundTab({ funds, refetch, onSuccess, t }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const existingIds = new Set(funds.map(f => f.id));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.id.trim() || !form.name.trim()) return;
    if (existingIds.has(form.id.trim())) {
      setError(t('adminFunds.addDuplicateId'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const toNum = v => v === '' ? null : Number(v);
      await upsertFund({
        id: form.id.trim(),
        name: form.name.trim(),
        fullName: form.fullName.trim() || null,
        manager: form.manager.trim(),
        assetType: form.assetType,
        fundAgeYears: toNum(form.fundAgeYears),
        aumBillion: toNum(form.aumBillion),
        expenseRatioPct: toNum(form.expenseRatioPct),
        riskTier: Number(form.riskTier),
        historicalReturns: {
          '1y': toNum(form.return1y),
          '3y': toNum(form.return3y),
          '5y': toNum(form.return5y),
        },
        navPublic: form.navPublic,
        source: form.source.trim() || null,
      });
      setForm(EMPTY_FORM);
      setSuccess(true);
      refetch();
      setTimeout(() => { setSuccess(false); onSuccess(); }, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full rounded-zx-sm border border-zx-line bg-zx-bg px-3 py-2 text-sm text-zx-text focus:outline-none focus:ring-2 focus:ring-zx-accent placeholder:text-zx-text-soft';
  const labelCls = 'text-xs text-zx-text-soft font-medium block mb-1';

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <h2 className="font-semibold text-zx-text">{t('adminFunds.addTitle')}</h2>

      {/* ID + Name */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="add-id" className={labelCls}>{t('adminFunds.fieldId')} *</label>
          <input id="add-id" required value={form.id}
            onChange={e => { set('id', e.target.value.toLowerCase().replace(/\s/g, '-')); setError(null); }}
            className={inputCls} placeholder="veof" />
        </div>
        <div>
          <label htmlFor="add-name" className={labelCls}>{t('adminFunds.fieldName')} *</label>
          <input id="add-name" required value={form.name}
            onChange={e => set('name', e.target.value)}
            className={inputCls} placeholder="VEOF" />
        </div>
      </div>

      {/* Full name */}
      <div>
        <label htmlFor="add-fullname" className={labelCls}>{t('adminFunds.fieldFullName')}</label>
        <input id="add-fullname" value={form.fullName}
          onChange={e => set('fullName', e.target.value)}
          className={inputCls} placeholder="Quỹ Đầu Tư Cổ Phiếu Cơ Hội VinaCapital" />
      </div>

      {/* Manager + AssetType */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="add-manager" className={labelCls}>{t('adminFunds.fieldManager')}</label>
          <input id="add-manager" value={form.manager}
            onChange={e => set('manager', e.target.value)}
            className={inputCls} placeholder="VinaCapital" />
        </div>
        <div>
          <label htmlFor="add-assettype" className={labelCls}>{t('adminFunds.fieldAssetType')}</label>
          <select id="add-assettype" value={form.assetType}
            onChange={e => set('assetType', e.target.value)}
            className={inputCls}>
            {Object.entries(ASSET_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v.vi}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Age + AUM + Expense + Risk */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <label htmlFor="add-age" className={labelCls}>{t('adminFunds.fieldAge')}</label>
          <input id="add-age" type="number" min="0" value={form.fundAgeYears}
            onChange={e => set('fundAgeYears', e.target.value)}
            className={inputCls} placeholder="10" />
        </div>
        <div>
          <label htmlFor="add-aum" className={labelCls}>{t('adminFunds.colAum')}</label>
          <input id="add-aum" type="number" min="0" value={form.aumBillion}
            onChange={e => set('aumBillion', e.target.value)}
            className={inputCls} placeholder="1000" />
        </div>
        <div>
          <label htmlFor="add-expense" className={labelCls}>{t('adminFunds.colExpense')}</label>
          <input id="add-expense" type="number" min="0" step="0.01" value={form.expenseRatioPct}
            onChange={e => set('expenseRatioPct', e.target.value)}
            className={inputCls} placeholder="1.50" />
        </div>
        <div>
          <label htmlFor="add-risk" className={labelCls}>{t('adminFunds.colRisk')}</label>
          <select id="add-risk" value={form.riskTier}
            onChange={e => set('riskTier', e.target.value)}
            className={inputCls}>
            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* Returns */}
      <div>
        <p className={labelCls}>Lợi nhuận lịch sử (%) — để trống nếu chưa có</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="add-r1y" className={labelCls}>{t('adminFunds.col1y')}</label>
            <input id="add-r1y" type="number" step="0.01" value={form.return1y}
              onChange={e => set('return1y', e.target.value)}
              className={inputCls} placeholder="—" />
          </div>
          <div>
            <label htmlFor="add-r3y" className={labelCls}>{t('adminFunds.col3y')}</label>
            <input id="add-r3y" type="number" step="0.01" value={form.return3y}
              onChange={e => set('return3y', e.target.value)}
              className={inputCls} placeholder="—" />
          </div>
          <div>
            <label htmlFor="add-r5y" className={labelCls}>{t('adminFunds.col5y')}</label>
            <input id="add-r5y" type="number" step="0.01" value={form.return5y}
              onChange={e => set('return5y', e.target.value)}
              className={inputCls} placeholder="—" />
          </div>
        </div>
      </div>

      {/* Source */}
      <div>
        <label htmlFor="add-source" className={labelCls}>{t('adminFunds.fieldSource')}</label>
        <input id="add-source" value={form.source}
          onChange={e => set('source', e.target.value)}
          className={inputCls} placeholder="VinaCapital factsheet — 2026-06" />
      </div>

      {/* Feedback */}
      {error && <p className="text-sm text-zx-negative">{error}</p>}
      {success && (
        <p className="rounded-zx-sm border border-zx-positive/40 bg-zx-positive/10 px-3 py-2 text-sm text-zx-positive">
          {t('adminFunds.addSuccess')}
        </p>
      )}

      {/* Submit */}
      <button type="submit" disabled={saving || !form.id.trim() || !form.name.trim()}
        className="flex items-center gap-2 rounded-zx-sm bg-zx-accent px-6 py-2.5 text-sm font-semibold text-zx-on-accent hover:opacity-90 disabled:opacity-50 transition">
        <Plus className="h-4 w-4" />
        {saving ? t('adminFunds.saving') : t('adminFunds.addBtn')}
      </button>
    </form>
  );
}

/* ─── Import CSV Tab ─── */
function ImportCsvTab({ funds, refetch, t }) {
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
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

      <div className="rounded-zx-sm bg-zx-surface-2 px-3 py-2 text-[11px] text-zx-text-soft leading-relaxed">
        <span className="font-semibold text-zx-text">Cột bắt buộc:</span> id, name &nbsp;|&nbsp;
        <span className="font-semibold text-zx-text">assetType:</span> equity / balanced / bond / money_market / etf / flexible &nbsp;|&nbsp;
        <span className="font-semibold text-zx-text">return*:</span> để trống = giữ nguyên giá trị cũ &nbsp;|&nbsp;
        Giá trị không được chứa dấu phẩy.
      </div>

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

      <button type="button" onClick={handlePreview} disabled={!csv.trim()}
        className="rounded-zx-sm border border-zx-accent px-4 py-2 text-sm font-medium text-zx-accent hover:bg-zx-accent/10 disabled:opacity-40 transition">
        {t('adminFunds.importPreview')}
      </button>

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
        <Tab active={activeTab === 'add'} onClick={() => setActiveTab('add')}>
          <span className="flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            {t('adminFunds.tabAdd')}
          </span>
        </Tab>
        <Tab active={activeTab === 'import'} onClick={() => setActiveTab('import')}>{t('adminFunds.tabImport')}</Tab>
      </div>

      {loading ? (
        <p className="text-sm text-zx-text-soft">{t('common.loading')}</p>
      ) : (
        <>
          {activeTab === 'list'   && <FundListTab funds={funds} refetch={refetch} t={t} />}
          {activeTab === 'add'    && <AddFundTab  funds={funds} refetch={refetch} t={t} onSuccess={() => setActiveTab('list')} />}
          {activeTab === 'import' && <ImportCsvTab funds={funds} refetch={refetch} t={t} />}
        </>
      )}
    </main>
  );
}
