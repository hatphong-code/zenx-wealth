import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore/lite';
import { app } from './firebaseApp';
import { db } from './firebaseDb';

const functions = getFunctions(app, 'asia-southeast1');

export const PLANS = {
  monthly: { id: 'monthly', amount: 99000, label: 'Gói tháng', durationLabel: '/ tháng' },
  yearly:  { id: 'yearly',  amount: 799000, label: 'Gói năm',  durationLabel: '/ năm', badge: 'Tiết kiệm 33%' },
};

export async function startMomoCheckout({ plan }) {
  const createPayment = httpsCallable(functions, 'createMomoPayment');
  const result = await createPayment({ plan, returnHost: window.location.origin });
  const { payUrl } = result.data;
  window.location.href = payUrl;
}

export async function getSubscriptionStatus(userId) {
  if (!userId) return { tier: 'free', expiresAt: null, isActive: false };
  const snap = await getDoc(doc(db, 'users', userId));
  const data = snap.data() || {};
  const tier = data.subscriptionTier || 'free';
  const expiresAt = data.subscriptionExpiresAt?.toDate?.() ?? null;
  const isActive = tier === 'premium' && (!expiresAt || expiresAt > new Date());
  return { tier: isActive ? 'premium' : 'free', expiresAt, isActive, plan: data.subscriptionPlan || null };
}
