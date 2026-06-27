import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

const REGION = 'asia-southeast1';
const ADMIN_EMAILS = ['hatphong@gmail.com'];

async function assertAdmin(authContext) {
  if (!authContext?.uid) {
    throw new HttpsError('unauthenticated', 'Must be signed in.');
  }
  const db = getFirestore();
  const doc = await db.doc(`users/${authContext.uid}`).get();
  const profile = doc.data() || {};
  const email = (authContext.token?.email || '').toLowerCase();
  const isAdmin =
    profile.role === 'admin' ||
    profile.isAdmin === true ||
    ADMIN_EMAILS.includes(email);
  if (!isAdmin) {
    throw new HttpsError('permission-denied', 'Admin only.');
  }
}

export const adminListUsers = onCall({ region: REGION }, async (request) => {
  await assertAdmin(request.auth);

  const { pageToken = null, maxResults = 200 } = request.data || {};
  const auth = getAuth();
  const db = getFirestore();

  const listResult = await auth.listUsers(maxResults, pageToken || undefined);

  // Batch-fetch Firestore profiles
  const profileDocs = await Promise.all(
    listResult.users.map((u) => db.doc(`users/${u.uid}`).get())
  );

  const users = listResult.users.map((u, i) => {
    const profile = profileDocs[i].data() || {};
    return {
      uid: u.uid,
      email: u.email || '',
      displayName: u.displayName || '',
      photoURL: u.photoURL || '',
      createdAt: u.metadata.creationTime || null,
      lastSignIn: u.metadata.lastSignInTime || null,
      subscriptionTier: profile.subscriptionTier || 'free',
      onboardingCompleted: Boolean(profile.onboardingCompleted),
      role: profile.role || null,
    };
  });

  return {
    users,
    nextPageToken: listResult.pageToken || null,
    total: users.length,
  };
});

export const adminUpdateUser = onCall({ region: REGION }, async (request) => {
  await assertAdmin(request.auth);

  const { targetUid, action, tier } = request.data || {};
  if (!targetUid) throw new HttpsError('invalid-argument', 'targetUid required.');

  const db = getFirestore();
  const ref = db.doc(`users/${targetUid}`);

  if (action === 'setTier') {
    if (!['free', 'premium'].includes(tier)) {
      throw new HttpsError('invalid-argument', `Invalid tier: ${tier}`);
    }
    await ref.set({ subscriptionTier: tier }, { merge: true });
    return { success: true, uid: targetUid, tier };
  }

  if (action === 'resetOnboarding') {
    await ref.set({ onboardingCompleted: false }, { merge: true });
    return { success: true, uid: targetUid };
  }

  if (action === 'setRole') {
    const { role } = request.data || {};
    const validRoles = ['moderator', null];
    if (!validRoles.includes(role)) {
      throw new HttpsError('invalid-argument', `Invalid role: ${role}`);
    }
    await ref.set({ role: role ?? null }, { merge: true });
    return { success: true, uid: targetUid, role };
  }

  throw new HttpsError('invalid-argument', `Unknown action: ${action}`);
});
