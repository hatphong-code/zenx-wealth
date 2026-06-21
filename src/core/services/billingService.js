import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore/lite';
import { app } from './firebaseApp';
import { db } from './firebaseDb';

const functions = getFunctions(app, 'asia-southeast1');

export const DEFAULT_PLANS = {
  monthly: { id: 'monthly', amount: 99000, label: 'Gói tháng', durationLabel: '/ tháng', days: 30, badge: null },
  yearly:  { id: 'yearly',  amount: 799000, label: 'Gói năm',  durationLabel: '/ năm',   days: 365, badge: 'Tiết kiệm 33%' },
};

export const DEFAULT_PLAN_TEMPLATES = {
  free: {
    name: 'Miễn phí',
    description: 'Theo dõi dòng tiền, quỹ dự phòng và lộ trình tài chính cơ bản.',
    features: ['dashboard', 'transactions', 'add_transaction', 'latte_factor', 'emergency_fund', 'weekly_review', 'debt_control', 'income_builder', 'roadmap'],
  },
  premium: {
    name: 'Premium',
    description: 'Hệ điều hành tài chính đầy đủ với phân tích nâng cao và coaching AI.',
    features: ['pay_yourself_first', 'assets', 'trading_risk', 'reports', 'ai_coach', 'settings', 'health_score', 'budget_templates', 'import_transactions'],
  },
};

let _plansCache = null;
let _plansCacheAt = 0;
const PLANS_CACHE_TTL_MS = 5 * 60 * 1000;

let _billingCache = null;
let _billingCacheAt = 0;

async function fetchBillingSettings() {
  const now = Date.now();
  if (_billingCache && now - _billingCacheAt < PLANS_CACHE_TTL_MS) return _billingCache;
  try {
    const snap = await getDoc(doc(db, 'appConfig', 'billing-settings'));
    _billingCache = snap.data() || {};
  } catch {
    _billingCache = {};
  }
  _billingCacheAt = now;
  return _billingCache;
}

export async function getPlans() {
  const data = await fetchBillingSettings();
  if (data?.plans) {
    return {
      monthly: { id: 'monthly', ...DEFAULT_PLANS.monthly, ...data.plans.monthly },
      yearly:  { id: 'yearly',  ...DEFAULT_PLANS.yearly,  ...data.plans.yearly  },
    };
  }
  return DEFAULT_PLANS;
}

export async function getPlanTemplates() {
  const data = await fetchBillingSettings();
  if (data?.planTemplates) {
    return {
      free:    { ...DEFAULT_PLAN_TEMPLATES.free,    ...data.planTemplates.free    },
      premium: { ...DEFAULT_PLAN_TEMPLATES.premium, ...data.planTemplates.premium },
    };
  }
  return DEFAULT_PLAN_TEMPLATES;
}

export function invalidatePlansCache() {
  _plansCache = null;
  _plansCacheAt = 0;
  _billingCache = null;
  _billingCacheAt = 0;
}

// Legacy sync export — for backwards compat with any existing imports
export const PLANS = DEFAULT_PLANS;

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
