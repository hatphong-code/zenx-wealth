import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore/lite';
import { db } from './firebaseDb';
import { budgetTemplates as HARDCODED } from '../data/budgetTemplates';

const DOC_REF = () => doc(db, 'appConfig', 'budget-templates');

let _cache = null;
let _cacheAt = 0;
const TTL_MS = 5 * 60 * 1000;

export async function getBudgetTemplates() {
  const now = Date.now();
  if (_cache && now - _cacheAt < TTL_MS) return _cache;

  try {
    const snap = await getDoc(DOC_REF());
    const data = snap.data();
    if (data?.templates?.length) {
      _cache = data.templates;
      _cacheAt = now;
      return _cache;
    }
  } catch {}

  _cache = HARDCODED;
  _cacheAt = now;
  return _cache;
}

export async function saveBudgetTemplates(templates) {
  await setDoc(DOC_REF(), { templates, updatedAt: serverTimestamp() });
  _cache = templates;
  _cacheAt = Date.now();
}

export function invalidateBudgetTemplatesCache() {
  _cache = null;
  _cacheAt = 0;
}
