import { createDataHook } from './createDataHook';
import { listSavingsPlans } from '../services/savingsPlanService';

async function fetchSavingsPlans(userId) {
  const plans = await listSavingsPlans(userId);
  return {
    plans,
    activePlans: plans.filter(p => (p.status ?? 'active') === 'active'),
    pendingPlans: plans.filter(p => p.status === 'pending'),
  };
}

export const useSavingsPlansData = createDataHook(fetchSavingsPlans);
