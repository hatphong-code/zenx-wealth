import { useEffect, useMemo, useState } from 'react';
import {
  getCachedAccessControl,
  getAccessControl,
  isAdminProfile,
  isFeatureEnabled,
  normalizeSubscriptionTier,
} from '../services/accessControlService';
import { getCachedUserProfile, getUserProfile } from '../services/userService';

function buildState(user, profile, accessControl) {
  const subscriptionTier = normalizeSubscriptionTier(profile?.subscriptionTier);
  const isAdmin = isAdminProfile(user, profile || {});

  return {
    profile,
    accessControl,
    subscriptionTier,
    isAdmin,
  };
}

export function useFeatureAccess(user) {
  const initialProfile = user?.uid ? getCachedUserProfile(user.uid) : null;
  const initialAccessControl = getCachedAccessControl();
  const [state, setState] = useState(() => buildState(user, initialProfile, initialAccessControl));
  const [loading, setLoading] = useState(Boolean(user?.uid));

  useEffect(() => {
    if (!user?.uid) {
      setState(buildState(user, null, null));
      setLoading(false);
      return;
    }

    const cachedProfile = getCachedUserProfile(user.uid);
    const cachedAccessControl = getCachedAccessControl();
    if (cachedProfile || cachedAccessControl) {
      setState(buildState(user, cachedProfile, cachedAccessControl));
      setLoading(false);
    } else {
      setLoading(true);
    }

    let active = true;
    Promise.all([
      getUserProfile(user.uid, { forceFresh: true }),
      getAccessControl({ forceFresh: true }),
    ])
      .then(([profile, accessControl]) => {
        if (!active) return;
        setState(buildState(user, profile, accessControl));
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (typeof window === 'undefined' || !user?.uid) return undefined;

    const handleAccessChange = () => {
      setState(buildState(user, getCachedUserProfile(user.uid), getCachedAccessControl()));
    };

    const handleUserChange = (event) => {
      if (!event.detail?.userId || event.detail.userId === user.uid) {
        handleAccessChange();
      }
    };

    window.addEventListener('zenx:access-control-changed', handleAccessChange);
    window.addEventListener('zenx:user-profile-changed', handleUserChange);

    return () => {
      window.removeEventListener('zenx:access-control-changed', handleAccessChange);
      window.removeEventListener('zenx:user-profile-changed', handleUserChange);
    };
  }, [user]);

  const helpers = useMemo(() => ({
    canAccess(featureKey) {
      return isFeatureEnabled(featureKey, state.subscriptionTier, state.accessControl);
    },
  }), [state.accessControl, state.subscriptionTier]);

  return {
    ...state,
    ...helpers,
    loading,
  };
}
