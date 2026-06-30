import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore/lite';
import { startOfWeek, subWeeks, format } from 'date-fns';
import { db } from './firebaseDb';
import { getCachedValue, loadWithCache, removeCachedValue } from './sessionCache';

const STREAK_CACHE_TTL_MS = 5 * 60 * 1000;
const STREAK_HISTORY_LIMIT = 208; // ~4 years

function getStreakCacheKey(userId) {
  return `review-streak:${userId}`;
}

/**
 * Pure function — no Firestore dependency, easy to unit test.
 * reviewDocs: [{ weekKey: 'yyyy-MM-dd', weekStart: Date, reviewed: boolean }]
 */
export function computeReviewStreak(reviewDocs = [], now = new Date()) {
  if (!reviewDocs.length) return { streak: 0 };

  const reviewedKeys = new Set(reviewDocs.filter(d => d.reviewed).map(d => d.weekKey));
  const earliestWeekKey = reviewDocs.reduce(
    (min, d) => (d.weekKey < min ? d.weekKey : min),
    reviewDocs[0].weekKey
  );

  const freezesUsedByMonth = {};
  let streak = 0;
  let cursor = startOfWeek(now, { weekStartsOn: 1 });

  // Current week not yet reviewed — don't penalise, start counting from previous week
  if (!reviewedKeys.has(format(cursor, 'yyyy-MM-dd'))) {
    cursor = subWeeks(cursor, 1);
  }

  while (true) {
    const weekKey = format(cursor, 'yyyy-MM-dd');
    if (weekKey < earliestWeekKey) break; // past earliest data — not a miss, just stop

    if (reviewedKeys.has(weekKey)) {
      streak += 1;
    } else {
      const monthKey = format(cursor, 'yyyy-MM');
      if (!freezesUsedByMonth[monthKey]) {
        freezesUsedByMonth[monthKey] = true; // use monthly free freeze
      } else {
        break; // second miss in same month — streak ends here
      }
    }
    cursor = subWeeks(cursor, 1);
  }

  return { streak };
}

async function fetchReviewStreak(userId) {
  const snapshot = await getDocs(query(
    collection(db, 'users', userId, 'weeklyReviews'),
    orderBy('weekStart', 'desc'),
    limit(STREAK_HISTORY_LIMIT)
  ));

  const reviewDocs = snapshot.docs.map((entry) => {
    const data = entry.data();
    const weekStart = data.weekStart?.toDate ? data.weekStart.toDate() : new Date(data.weekStart);
    return {
      weekKey: entry.id,
      weekStart,
      reviewed: Boolean(data.oneLesson || data.oneActionNextWeek),
    };
  });

  return computeReviewStreak(reviewDocs);
}

export function getCachedReviewStreak(userId) {
  return getCachedValue(getStreakCacheKey(userId), STREAK_CACHE_TTL_MS);
}

export function getReviewStreak(userId, { forceFresh = false } = {}) {
  return loadWithCache({
    key: getStreakCacheKey(userId),
    maxAgeMs: STREAK_CACHE_TTL_MS,
    forceFresh,
    loader: () => fetchReviewStreak(userId),
  });
}

export function invalidateReviewStreakCache(userId) {
  removeCachedValue(getStreakCacheKey(userId));
}
