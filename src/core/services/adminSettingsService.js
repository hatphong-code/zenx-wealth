import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore/lite';
import { db } from './firebaseDb';

const SETTINGS_PATH = ['appConfig', 'api-settings'];

export async function getApiSettings() {
  const snap = await getDoc(doc(db, ...SETTINGS_PATH));
  return snap.data() || {};
}

export async function saveApiSettings(updates) {
  await setDoc(doc(db, ...SETTINGS_PATH), { ...updates, updatedAt: serverTimestamp() }, { merge: true });
}
