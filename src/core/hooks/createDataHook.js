import { useEffect, useState } from 'react';

export function createDataHook(fetcher, cacheGetter, defaultValue = null) {
  return function useData(userId, options = {}) {
    const [data, setData] = useState(() => cacheGetter?.(userId) ?? defaultValue);
    const [loading, setLoading] = useState(!data);
    const [refreshing, setRefreshing] = useState(!!data);
    const [error, setError] = useState(null);

    useEffect(() => {
      if (!userId) return;
      let cancelled = false;

      fetcher(userId, { forceFresh: true })
        .then(result => {
          if (!cancelled) {
            setData(result);
            setLoading(false);
            setRefreshing(false);
          }
        })
        .catch(err => {
          if (!cancelled) {
            // If offline or network error, don't set error - use cached data
            const isNetworkError =
              err?.message?.includes('ERR_INTERNET_DISCONNECTED') ||
              err?.message?.includes('HTTP error has no status') ||
              err?.code === 'unknown' ||
              !navigator.onLine;

            if (isNetworkError) {
              // Offline: keep existing data (from cache), don't error
              setLoading(false);
              setRefreshing(false);
              console.log('[createDataHook] Offline, using cached data');
              return;
            }

            // Real error: set it
            setError(err?.message || 'Unknown error');
            setLoading(false);
            setRefreshing(false);
          }
        });

      return () => { cancelled = true; };
    }, [userId]);

    return { data, setData, loading, refreshing, error, setError };
  };
}
