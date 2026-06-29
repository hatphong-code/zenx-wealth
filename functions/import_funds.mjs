import { readFileSync } from 'fs';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

initializeApp({ projectId: 'zenx-wealth' });
const db = getFirestore();

const text = readFileSync('../250627/funds_export_20260627.csv', 'utf-8');
const lines = text.trim().split('\n').filter(l => l.trim());
const headers = lines[0].split(',').map(h => h.trim().replace(/\r/, ''));

function parseNum(v) { return v === '' || v == null ? null : Number(v); }

const rows = lines.slice(1).map(line => {
  const cells = line.split(',').map(c => c.trim().replace(/\r/, ''));
  const r = {};
  headers.forEach((h, i) => { r[h] = cells[i] ?? ''; });
  return {
    id: r.id,
    name: r.name,
    fullName: r.fullName || null,
    manager: r.manager,
    assetType: r.assetType,
    fundAgeYears: parseNum(r.fundAgeYears),
    aumBillion: parseNum(r.aumBillion),
    expenseRatioPct: parseNum(r.expenseRatioPct),
    riskTier: parseNum(r.riskTier),
    historicalReturns: {
      '1y': parseNum(r.return1y),
      '3y': parseNum(r.return3y),
      '5y': parseNum(r.return5y),
    },
    navPublic: r.navPublic === 'true',
    source: r.source || null,
    updatedAt: FieldValue.serverTimestamp(),
  };
});

console.log(`Importing ${rows.length} funds...`);
const batch = db.batch();
for (const { id, ...data } of rows) {
  batch.set(db.collection('funds').doc(id), data, { merge: true });
}
await batch.commit();
console.log('Done:');
rows.forEach(f => {
  const r = f.historicalReturns;
  console.log(`  ${f.id.padEnd(10)} 1y:${String(r['1y']).padEnd(6)} 3y:${String(r['3y']).padEnd(6)} 5y:${r['5y']}`);
});
