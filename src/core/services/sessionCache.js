import { storage } from './storageAdapter';

const memoryCache = new Map();
const inflightRequests = new Map();

function readStoredEntry(key) {
  const memoryEntry = memoryCache.get(key);
  if (memoryEntry) {
    return memoryEntry;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = storage.getItem(key);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.timestamp !== 'number') {
      return null;
    }

    memoryCache.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function getCachedValue(key, maxAgeMs) {
  const entry = readStoredEntry(key);
  if (!entry) {
    return null;
  }

  if (Date.now() - entry.timestamp > maxAgeMs) {
    return null;
  }

  return entry.value;
}

export function setCachedValue(key, value) {
  const entry = {
    timestamp: Date.now(),
    value,
  };

  memoryCache.set(key, entry);

  if (typeof window === 'undefined') {
    return;
  }

  try {
    storage.setItem(key, JSON.stringify(entry));
  } catch {
    // Ignore cache write failures.
  }
}

export function removeCachedValue(key) {
  memoryCache.delete(key);

  if (typeof window === 'undefined') {
    return;
  }

  try {
    storage.removeItem(key);
  } catch {
    // Ignore cache removal failures.
  }
}

export async function loadWithCache({ key, maxAgeMs, loader, forceFresh = false }) {
  if (!forceFresh) {
    const cached = getCachedValue(key, maxAgeMs);
    if (cached !== null) {
      return cached;
    }
  }

  if (inflightRequests.has(key)) {
    return inflightRequests.get(key);
  }

  const request = loader()
    .then((value) => {
      setCachedValue(key, value);
      return value;
    })
    .finally(() => {
      inflightRequests.delete(key);
    });

  inflightRequests.set(key, request);
  return request;
}
