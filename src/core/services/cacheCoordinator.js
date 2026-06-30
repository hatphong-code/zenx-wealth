// Cache Invalidation Coordinator
// Centralizes cache invalidation logic by operation type to avoid fan-out in pages

import { invalidateDashboardStatsCache } from './dashboardService';
import { invalidateLatteFactorCache } from './latteFactorService';
import { invalidatePayYourselfFirstCache } from './payYourselfFirstService';
import { invalidateReportsCache } from './reportsService';
import { invalidateAICoachCache } from './aiCoachService';
import { invalidateWealthRoadmapCache } from './wealthRoadmapService';
import { invalidateWeeklyReviewCache } from './weeklyReviewService';
import { invalidateReviewStreakCache } from './reviewStreakService';
import { invalidateUserProfileCache } from './userService';
import { invalidateEmergencyFundCache } from './emergencyFundService';

// After any transaction (add/edit/delete): invalidate all dependent caches
export function invalidateAfterTransactionWrite(userId, weekKey = null) {
  invalidateDashboardStatsCache(userId);
  invalidateLatteFactorCache(userId);
  invalidatePayYourselfFirstCache(userId);
  invalidateReportsCache(userId);
  invalidateAICoachCache(userId);
  invalidateWealthRoadmapCache(userId);
  if (weekKey) invalidateWeeklyReviewCache(userId, weekKey);
}

// After user settings change (theme, locale, categories, allocation): invalidate dependent caches
export function invalidateAfterSettingsWrite(userId) {
  invalidateUserProfileCache(userId);
  invalidatePayYourselfFirstCache(userId);
  invalidateReportsCache(userId);
  invalidateWealthRoadmapCache(userId);
  invalidateAICoachCache(userId);
}

// After emergency fund record added: invalidate dependent caches
export function invalidateAfterEmergencyFundWrite(userId) {
  invalidateEmergencyFundCache(userId);
  invalidateDashboardStatsCache(userId);
}

// After weekly review saved: invalidate dependent caches
export function invalidateAfterWeeklyReviewWrite(userId) {
  invalidateReportsCache(userId);
  invalidateAICoachCache(userId);
  invalidateReviewStreakCache(userId);
}
