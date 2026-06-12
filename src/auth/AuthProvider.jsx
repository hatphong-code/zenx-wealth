import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { AuthContext } from './AuthContext';
import { auth } from '../services/firebaseAuth';

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    user: null,
    loading: true,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setState({
        user,
        loading: false,
      });

      if (!user) {
        return;
      }

      const preload = async () => {
        try {
          const [{ getUserProfile }, { getDashboardStats }] = await Promise.all([
            import('../services/userService'),
            import('../services/dashboardService'),
          ]);

          await Promise.all([
            getUserProfile(user.uid),
            getDashboardStats(user.uid),
          ]);
        } catch {
          // Ignore preload failures. Pages will fetch on demand.
        }
      };

      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        window.requestIdleCallback(preload);
      } else {
        window.setTimeout(preload, 0);
      }
    });

    return unsubscribe;
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
