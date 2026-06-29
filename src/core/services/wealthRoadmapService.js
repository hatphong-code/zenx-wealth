import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore/lite';
import { db } from './firebaseDb';
import { getCachedValue, loadWithCache, removeCachedValue, setCachedValue } from './sessionCache';
import { getUserProfile } from './userService';
import { roadmapPhases } from '../data/roadmapPhases';
import { getDashboardStats } from './dashboardService';
import { getDebts } from './debtService';
import { getIncomeSources } from './incomeBuilderService';
import { getAssets } from './assetService';
import { computeRoadmapSignals, mergeRoadmapPhase } from './roadmapCalculations';
import { listSavingsPlans } from './savingsPlanService';

const ROADMAP_CACHE_TTL_MS = 60 * 1000;
const ROADMAP_SNAPSHOT_ID = 'roadmap-current';

function getRoadmapCacheKey(userId) {
  return `wealth-roadmap:${userId}`;
}

function getPhaseDocRef(userId, phaseId) {
  return doc(db, 'users', userId, 'roadmap', phaseId);
}

function getRoadmapSnapshotRef(userId) {
  return doc(db, 'users', userId, 'snapshots', ROADMAP_SNAPSHOT_ID);
}

async function fetchPhaseStates(userId) {
  const docs = await Promise.all(
    roadmapPhases.map(async (phase) => {
      const snapshot = await getDoc(getPhaseDocRef(userId, phase.id));
      return [phase.id, snapshot.data() || {}];
    })
  );

  return Object.fromEntries(docs);
}

function normalizeRoadmap(data = {}) {
  return {
    phases: data.phases || [],
    currentPhaseId: data.currentPhaseId || roadmapPhases[0].id,
    completedPhases: data.completedPhases || 0,
    signals: data.signals || {},
  };
}

async function computeRoadmap(userId) {
  const [profile, dashboard, debtsState, incomeState, assetsState, savingsPlans, storedStates] = await Promise.all([
    getUserProfile(userId),
    getDashboardStats(userId),
    getDebts(userId),
    getIncomeSources(userId),
    getAssets(userId),
    listSavingsPlans(userId),
    fetchPhaseStates(userId),
  ]);

  const signals = computeRoadmapSignals({ profile, dashboard, debtsState, incomeState, assetsState, savingsPlans });
  const phases = roadmapPhases.map((phase) => mergeRoadmapPhase(phase, storedStates[phase.id] || {}, signals));
  const currentPhase = phases.find((phase) => !phase.completed) || phases[phases.length - 1];
  const completedPhases = phases.filter((phase) => phase.completed).length;

  return {
    phases,
    currentPhaseId: currentPhase?.id || roadmapPhases[0].id,
    completedPhases,
    signals,
  };
}

async function persistRoadmapSnapshot(userId, roadmap) {
  await setDoc(getRoadmapSnapshotRef(userId), {
    ...roadmap,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

function rehydrateWithTemplate(storedData) {
  const storedPhases = storedData.phases || [];
  const phases = roadmapPhases.map((templatePhase) => {
    const stored = storedPhases.find((p) => p.id === templatePhase.id);
    if (!stored) {
      return {
        ...templatePhase,
        completed: false,
        notes: '',
        checklist: templatePhase.checklist.map((item) => ({ ...item, completed: false, autoValue: false })),
      };
    }
    return {
      ...stored,
      title: templatePhase.title,
      description: templatePhase.description,
      checklist: templatePhase.checklist.map((templateItem) => {
        const storedItem = stored.checklist?.find((i) => i.key === templateItem.key);
        return {
          ...templateItem,
          completed: storedItem?.completed ?? false,
          autoValue: storedItem?.autoValue ?? false,
          ...(typeof storedItem?.manualValue === 'boolean' ? { manualValue: storedItem.manualValue } : {}),
        };
      }),
    };
  });
  return normalizeRoadmap({ ...storedData, phases });
}

async function fetchRoadmap(userId) {
  const snapshot = await getDoc(getRoadmapSnapshotRef(userId));
  if (snapshot.exists()) {
    // Always re-merge with current template so title/description/labels stay up-to-date
    return rehydrateWithTemplate(snapshot.data());
  }

  const computedRoadmap = await computeRoadmap(userId);
  await persistRoadmapSnapshot(userId, computedRoadmap);
  return computedRoadmap;
}

export function getCachedWealthRoadmap(userId) {
  return getCachedValue(getRoadmapCacheKey(userId), ROADMAP_CACHE_TTL_MS);
}

export function getWealthRoadmap(userId, { forceFresh = false } = {}) {
  return loadWithCache({
    key: getRoadmapCacheKey(userId),
    maxAgeMs: ROADMAP_CACHE_TTL_MS,
    forceFresh,
    loader: () => fetchRoadmap(userId),
  });
}

export function setWealthRoadmapCache(userId, value) {
  setCachedValue(getRoadmapCacheKey(userId), value);
}

export function invalidateWealthRoadmapCache(userId) {
  removeCachedValue(getRoadmapCacheKey(userId));
}

export async function refreshWealthRoadmapSnapshot(userId) {
  const roadmap = await computeRoadmap(userId);
  await persistRoadmapSnapshot(userId, roadmap);
  setWealthRoadmapCache(userId, roadmap);
  return roadmap;
}

export async function saveRoadmapPhase(userId, phaseId, updates, roadmapSnapshot = null) {
  await setDoc(getPhaseDocRef(userId, phaseId), {
    ...updates,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  if (roadmapSnapshot) {
    await persistRoadmapSnapshot(userId, roadmapSnapshot);
    setWealthRoadmapCache(userId, roadmapSnapshot);
  }
}
