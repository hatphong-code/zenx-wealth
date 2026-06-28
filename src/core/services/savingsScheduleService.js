import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp } from 'firebase/firestore/lite';
import { db } from './firebaseDb';

function scheduleCol(userId) {
  return collection(db, 'users', userId, 'savingsSchedule');
}

export async function getSavingsSchedule(userId) {
  const snap = await getDocs(scheduleCol(userId));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.maturityDate || '').localeCompare(b.maturityDate || ''));
}

export async function addSavingsScheduleEntry(userId, entry) {
  const ref = await addDoc(scheduleCol(userId), {
    label: entry.label || '',
    openDate: entry.openDate || '',
    maturityDate: entry.maturityDate || '',
    amount: Number(entry.amount) || 0,
    note: entry.note || '',
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteSavingsScheduleEntry(userId, entryId) {
  await deleteDoc(doc(db, 'users', userId, 'savingsSchedule', entryId));
}

export function getUpcomingMaturities(entries, windowDays = 7) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today.getTime() + windowDays * 24 * 60 * 60 * 1000);

  return entries.filter(e => {
    if (!e.maturityDate) return false;
    const maturity = new Date(e.maturityDate);
    return maturity >= today && maturity <= cutoff;
  }).sort((a, b) => new Date(a.maturityDate) - new Date(b.maturityDate));
}

export function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.round((target - today) / (24 * 60 * 60 * 1000));
}
