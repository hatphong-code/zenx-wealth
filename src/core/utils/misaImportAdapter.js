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
