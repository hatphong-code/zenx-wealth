import { useEffect, useState } from 'react';

export function createDataHook(fetcher, cacheGetter) {
  return function useData(userId, options = {}) {
    const [data, setData] = useState(() => cacheGetter?.(userId) ?? null);
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
            setError(err.message);
            setLoading(false);
            setRefreshing(false);
          }
        });

      return () => { cancelled = true; };
    }, [userId]);

    return { data, setData, loading, refreshing, error, setError };
  };
}
