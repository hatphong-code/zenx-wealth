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
