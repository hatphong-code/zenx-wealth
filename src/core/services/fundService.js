import { collection, doc, getDocs, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore/lite';
import { referenceFunds } from '../data/referenceFunds';
import { db } from './firebaseDb';

const COLLECTION = 'funds';
const VALID_ASSET_TYPES = ['equity', 'balanced', 'bond', 'money_market', 'etf', 'flexible'];

let _cache = null;
let _cacheAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export function invalidateFundsCache() {
  _cache = null;
  _cacheAt = 0;
}

export function getCachedFunds() {
  if (!_cache || Date.now() - _cacheAt > CACHE_TTL_MS) return null;
  return _cache;
}

export async function getFunds({ forceFresh = false } = {}) {
  if (!forceFresh && getCachedFunds()) return _cache;
  try {
    const snap = await getDocs(collection(db, COLLECTION));
    if (snap.empty) {
      _cache = referenceFunds;
    } else {
      _cache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    _cacheAt = Date.now();
    return _cache;
  } catch {
    return _cache ?? referenceFunds;
  }
}

export async function upsertFund(fundData) {
  const { id, ...rest } = fundData;
  if (!id) throw new Error('Fund id required');
  await setDoc(doc(db, COLLECTION, id), { ...rest, updatedAt: serverTimestamp() }, { merge: true });
  invalidateFundsCache();
}

export const CSV_COLUMNS = [
  'id', 'name', 'fullName', 'manager', 'assetType',
  'fundAgeYears', 'aumBillion', 'expenseRatioPct', 'riskTier',
  'return1y', 'return3y', 'return5y', 'navPublic', 'source',
];

function parseNum(val) { return val === '' || val == null ? undefined : Number(val); }
function parsePct(val) { return val === '' || val == null ? undefined : parseFloat(val); }

export function parseFundsCsv(csvText) {
  const lines = csvText.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) throw new Error('CSV phải có header và ít nhất một dòng dữ liệu.');

  const headers = lines[0].split(',').map(h => h.trim().replace(/\r/, ''));

  return lines.slice(1).map((line, i) => {
    const cells = line.split(',').map(c => c.trim().replace(/\r/, ''));
    const raw = {};
    headers.forEach((h, idx) => { raw[h] = cells[idx] ?? ''; });

    const errors = [];
    if (!raw.id) errors.push('id bắt buộc');
    if (!raw.name) errors.push('name bắt buộc');
    if (raw.assetType && !VALID_ASSET_TYPES.includes(raw.assetType))
      errors.push(`assetType không hợp lệ: "${raw.assetType}"`);
    if (raw.riskTier && (Number(raw.riskTier) < 1 || Number(raw.riskTier) > 5))
      errors.push('riskTier phải từ 1-5');

    const fund = {
      id: raw.id,
      ...(raw.name         && { name: raw.name }),
      ...(raw.fullName     && { fullName: raw.fullName }),
      ...(raw.manager      && { manager: raw.manager }),
      ...(raw.assetType    && { assetType: raw.assetType }),
      ...(raw.source       && { source: raw.source }),
      ...(raw.fundAgeYears   !== '' && parseNum(raw.fundAgeYears) != null    && { fundAgeYears: parseNum(raw.fundAgeYears) }),
      ...(raw.aumBillion     !== '' && parseNum(raw.aumBillion) != null       && { aumBillion: parseNum(raw.aumBillion) }),
      ...(raw.expenseRatioPct !== '' && parsePct(raw.expenseRatioPct) != null && { expenseRatioPct: parsePct(raw.expenseRatioPct) }),
      ...(raw.riskTier       !== '' && parseNum(raw.riskTier) != null         && { riskTier: parseNum(raw.riskTier) }),
      ...(raw.navPublic      !== '' && { navPublic: raw.navPublic === 'true' || raw.navPublic === '1' }),
    };

    // Returns — only include if provided
    const r1y = parsePct(raw.return1y);
    const r3y = parsePct(raw.return3y);
    const r5y = parsePct(raw.return5y);
    const hasReturns = r1y !== undefined || r3y !== undefined || r5y !== undefined;
    if (hasReturns) {
      fund._returnUpdates = {
        ...(r1y !== undefined && { '1y': r1y }),
        ...(r3y !== undefined && { '3y': r3y }),
        ...(r5y !== undefined && { '5y': r5y }),
      };
    }

    return { _rowIndex: i + 2, _fund: fund, _errors: errors, _raw: raw };
  });
}

export async function importFunds(parsedRows, existingFunds = []) {
  const valid = parsedRows.filter(r => !r._errors?.length);
  if (valid.length === 0) throw new Error('Không có dòng hợp lệ để import.');

  const byId = Object.fromEntries(existingFunds.map(f => [f.id, f]));
  const batch = writeBatch(db);

  for (const row of valid) {
    const { _fund: fund } = row;
    const { _returnUpdates, id, ...rest } = fund;
    const existing = byId[id];
    const existingReturns = existing?.historicalReturns ?? { '1y': null, '3y': null, '5y': null };
    const mergedReturns = _returnUpdates ? { ...existingReturns, ..._returnUpdates } : existingReturns;

    batch.set(doc(db, COLLECTION, id), {
      ...rest,
      historicalReturns: mergedReturns,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  await batch.commit();
  invalidateFundsCache();
  return valid.length;
}

export function generateCsvTemplate() {
  const header = CSV_COLUMNS.join(',');
  const example = [
    'veof', 'VEOF', 'Quỹ Đầu Tư Cổ Phiếu Cơ Hội VinaCapital', 'VinaCapital',
    'equity', '20', '2500', '1.75', '4', '12.5', '8.2', '', 'true', 'VinaCapital factsheet 2026-06',
  ].join(',');
  return `${header}\n${example}\n`;
}
