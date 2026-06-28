import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore/lite';
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

export function getMonthsElapsed(yearMonthKey) {
  if (!yearMonthKey) return 0;
  const [y, m] = yearMonthKey.split('-').map(Number);
  const now = new Date();
  return Math.max(0, (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m));
}

// 1-indexed month number in the plan for "now" (1 = executionStartDate month)
export function getCurrentPlanMonthIdx(executionStartDate) {
  const [startYear, startMonth] = executionStartDate.split('-').map(Number);
  const now = new Date();
  const diff = (now.getFullYear() - startYear) * 12 + (now.getMonth() + 1 - startMonth);
  return Math.max(1, diff + 1);
}

function calcConsistency(checkins, executionStartDate) {
  const elapsed = getMonthsElapsed(executionStartDate);
  if (elapsed === 0) return 1;
  return Math.min(1, Object.keys(checkins).length / elapsed);
}

// Returns { allowed, newStatus, blockReason, blockDetail, warn, warnReason, avgPct, riskWarning }
export async function checkCanCreatePlan(userId, newPlanRatePct = 0) {
  const plans = await listSavingsPlans(userId);
  const activePlans = plans.filter(p => (p.status ?? 'active') === 'active');
  const pendingPlans = plans.filter(p => p.status === 'pending');

  // < 3 active plans: always allowed
  if (activePlans.length < 3) {
    return { allowed: true, newStatus: 'active', riskWarning: newPlanRatePct > 10 };
  }

  // Already has a pending plan
  if (pendingPlans.length >= 1) {
    return { allowed: false, blockReason: 'pending_exists', blockDetail: { name: pendingPlans[0].name } };
  }

  // Check all active plans are ≥ 6 months old
  for (const plan of activePlans) {
    const monthsOld = getMonthsElapsed(plan.executionStartDate);
    if (monthsOld < 6) {
      return {
        allowed: false,
        blockReason: 'too_young',
        blockDetail: { name: plan.name, months: monthsOld },
      };
    }
  }

  // Calculate avg consistency across all active plans
  const checkinResults = await Promise.all(
    activePlans.map(p => getMonthlyCheckins(userId, p.id))
  );
  const consistencies = activePlans.map((p, i) =>
    calcConsistency(checkinResults[i], p.executionStartDate)
  );
  const avgConsistency = consistencies.reduce((a, b) => a + b, 0) / consistencies.length;
  const avgPct = Math.round(avgConsistency * 100);
  const riskWarning = newPlanRatePct > 10;

  if (avgConsistency < 0.6) {
    return { allowed: false, blockReason: 'low_consistency', blockDetail: { pct: avgPct } };
  }

  const hasMaturePlan = activePlans.some(p => getMonthsElapsed(p.executionStartDate) >= 12);

  if (avgConsistency < 0.8 || !hasMaturePlan) {
    return {
      allowed: true,
      newStatus: 'pending',
      warn: true,
      warnReason: avgConsistency < 0.8 ? 'consistency' : 'no_mature_plan',
      avgPct,
      riskWarning,
    };
  }

  return { allowed: true, newStatus: 'active', riskWarning };
}

// Re-evaluates all pending plans and activates any that now qualify (avg ≥ 80%)
// Returns list of newly activated planIds
export async function activatePendingPlans(userId) {
  const plans = await listSavingsPlans(userId);
  const pendingPlans = plans.filter(p => p.status === 'pending');
  if (!pendingPlans.length) return [];

  const activePlans = plans.filter(p => (p.status ?? 'active') === 'active');
  if (!activePlans.length) return [];

  const checkinResults = await Promise.all(
    activePlans.map(p => getMonthlyCheckins(userId, p.id))
  );
  const consistencies = activePlans.map((p, i) =>
    calcConsistency(checkinResults[i], p.executionStartDate)
  );
  const avg = consistencies.reduce((a, b) => a + b, 0) / consistencies.length;
  if (avg < 0.8) return [];

  const startMonth = currentYearMonth();
  const activated = [];
  for (const plan of pendingPlans) {
    await setDoc(doc(db, 'users', userId, 'savingsPlans', plan.id), {
      status: 'active',
      executionStartDate: startMonth,
      activatedAt: serverTimestamp(),
    }, { merge: true });
    activated.push(plan.id);
  }
  return activated;
}

export async function createSavingsPlan(userId, { name, params, result, executionStartDate, status = 'active', channelType = 'bank' }) {
  const ref = await addDoc(plansCol(userId), {
    name: name || 'Kế hoạch Coast FI',
    channelType,
    createdAt: serverTimestamp(),
    status,
    executionStartDate: status === 'active' ? (executionStartDate || currentYearMonth()) : null,
    activatedAt: status === 'active' ? serverTimestamp() : null,
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

export async function updateSavingsPlan(userId, planId, fields) {
  await setDoc(doc(db, 'users', userId, 'savingsPlans', planId), fields, { merge: true });
}

export async function deleteSavingsPlan(userId, planId) {
  const checkins = await getDocs(checkinsCol(userId, planId));
  await Promise.all(checkins.docs.map(d => deleteDoc(d.ref)));
  await deleteDoc(doc(db, 'users', userId, 'savingsPlans', planId));
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
