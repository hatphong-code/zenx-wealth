import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore/lite';
import { db } from './firebaseDb';

function plansCol(userId) {
  return collection(db, 'users', userId, 'savingsPlans');
}

function checkinsCol(userId, planId) {
  return collection(db, 'users', userId, 'savingsPlans', planId, 'checkins');
}

export function currentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function addMonthsToKey(yearMonthKey, n) {
  let [y, m] = yearMonthKey.split('-').map(Number);
  m += n;
  while (m > 12) { m -= 12; y++; }
  while (m < 1) { m += 12; y--; }
  return `${y}-${String(m).padStart(2, '0')}`;
}

// 1-indexed month number in the plan for "now" (1 = executionStartDate month)
export function getCurrentPlanMonthIdx(executionStartDate) {
  const [startYear, startMonth] = executionStartDate.split('-').map(Number);
  const now = new Date();
  const diff = (now.getFullYear() - startYear) * 12 + (now.getMonth() + 1 - startMonth);
  return Math.max(1, diff + 1);
}

export async function createSavingsPlan(userId, { name, params, result, executionStartDate }) {
  const ref = await addDoc(plansCol(userId), {
    name: name || 'Kế hoạch Coast FI',
    createdAt: serverTimestamp(),
    executionStartDate: executionStartDate || currentYearMonth(),
    activeScenario: null,
    params,
    result,
  });
  return ref.id;
}

export async function getSavingsPlan(userId, planId) {
  const snap = await getDoc(doc(db, 'users', userId, 'savingsPlans', planId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listSavingsPlans(userId) {
  const snap = await getDocs(query(plansCol(userId), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updatePlanActiveScenario(userId, planId, scenario) {
  await setDoc(doc(db, 'users', userId, 'savingsPlans', planId), { activeScenario: scenario }, { merge: true });
}

export async function addMonthlyCheckin(userId, planId, monthKey, { actualAmount, note }) {
  await setDoc(doc(checkinsCol(userId, planId), monthKey), {
    actualAmount: Number(actualAmount) || 0,
    note: note || '',
    checkedAt: serverTimestamp(),
  }, { merge: true });
}

export async function getMonthlyCheckins(userId, planId) {
  const snap = await getDocs(checkinsCol(userId, planId));
  const result = {};
  snap.docs.forEach(d => { result[d.id] = d.data(); });
  return result;
}
