import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebaseApp';

const functions = getFunctions(app, 'asia-southeast1');

const listUsersFn = httpsCallable(functions, 'adminListUsers');
const updateUserFn = httpsCallable(functions, 'adminUpdateUser');

export async function adminListUsers(pageToken = null) {
  const result = await listUsersFn({ pageToken, maxResults: 200 });
  return result.data;
}

export async function adminSetUserTier(targetUid, tier) {
  const result = await updateUserFn({ targetUid, action: 'setTier', tier });
  return result.data;
}

export async function adminResetUserOnboarding(targetUid) {
  const result = await updateUserFn({ targetUid, action: 'resetOnboarding' });
  return result.data;
}

export async function adminSetUserRole(targetUid, role) {
  const result = await updateUserFn({ targetUid, action: 'setRole', role: role ?? null });
  return result.data;
}
