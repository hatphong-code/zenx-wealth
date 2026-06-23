import { collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore/lite';
import { db } from './firebaseDb';
import { seedQuotes, QUOTE_SOURCE } from '../data/dailyQuotes';

const COLLECTION = 'quotes';
const CACHE_KEY = 'zx-quotes-cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

// ── Cache helpers ──

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { quotes, cachedAt } = JSON.parse(raw);
    if (Date.now() - cachedAt > CACHE_TTL_MS) return null;
    return quotes;
  } catch {
    return null;
  }
}

function writeCache(quotes) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ quotes, cachedAt: Date.now() }));
  } catch {
    // storage full — ignore
  }
}

export function invalidateQuotesCache() {
  localStorage.removeItem(CACHE_KEY);
}

// ── Read ──

export async function getQuotes({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cached = readCache();
    if (cached) return cached;
  }

  try {
    const q = query(collection(db, COLLECTION), orderBy('order', 'asc'));
    const snap = await getDocs(q);

    if (snap.empty) {
      // First run — seed Firestore from local data then return seed
      await seedFirestore();
      const seeded = seedQuotes.map((s, i) => ({ ...s, source: QUOTE_SOURCE, active: true, order: i }));
      writeCache(seeded);
      return seeded;
    }

    const quotes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    writeCache(quotes);
    return quotes;
  } catch {
    // Offline fallback — return seed data
    return seedQuotes.map((s, i) => ({ ...s, source: QUOTE_SOURCE, active: true, order: i }));
  }
}

async function seedFirestore() {
  const batch = seedQuotes.map((q, i) =>
    setDoc(doc(db, COLLECTION, q.id), {
      ...q,
      source: QUOTE_SOURCE,
      active: true,
      order: i,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
  await Promise.all(batch);
}

// ── Quote selection ──

export function pickTodayQuote(quotes, userTemplate) {
  const active = quotes.filter(q =>
    q.active !== false &&
    (q.templates?.includes('all') || q.templates?.includes(userTemplate))
  );
  if (active.length === 0) return null;

  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000);
  return active[dayOfYear % active.length];
}

// ── Admin CRUD ──

export async function createQuote(data) {
  const id = `q${Date.now()}`;
  const snap = await getDocs(collection(db, COLLECTION));
  const maxOrder = snap.empty ? 0 : Math.max(...snap.docs.map(d => d.data().order ?? 0)) + 1;

  await setDoc(doc(db, COLLECTION, id), {
    ...data,
    id,
    source: data.source || QUOTE_SOURCE,
    active: data.active ?? true,
    order: maxOrder,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  invalidateQuotesCache();
}

export async function updateQuote(id, data) {
  await updateDoc(doc(db, COLLECTION, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
  invalidateQuotesCache();
}

export async function deleteQuote(id) {
  await deleteDoc(doc(db, COLLECTION, id));
  invalidateQuotesCache();
}

export async function toggleQuoteActive(id, active) {
  await updateDoc(doc(db, COLLECTION, id), { active, updatedAt: serverTimestamp() });
  invalidateQuotesCache();
}
