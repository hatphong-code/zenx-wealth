import { useEffect, useState } from 'react';
import { referenceFunds } from '../data/referenceFunds';
import { getCachedFunds, getFunds, invalidateFundsCache } from '../services/fundService';

export function useFundsData() {
  const [data, setData] = useState(getCachedFunds() ?? referenceFunds);
  const [loading, setLoading] = useState(!getCachedFunds());
  const [error, setError] = useState(null);
  const [rev, setRev] = useState(0);

  useEffect(() => {
    let active = true;
    getFunds({ forceFresh: rev > 0 })
      .then(funds => { if (active) { setData(funds); setError(null); } })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [rev]);

  function refetch() {
    invalidateFundsCache();
    setLoading(true);
    setRev(r => r + 1);
  }

  return { data, loading, error, refetch };
}
