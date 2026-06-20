import { useEffect } from 'react';
import { useAuth } from '../auth/useAuth';
import { useI18n } from '../i18n/useI18n';
import { useTheme } from '../hooks/useTheme';
import { useNumberFormat } from '../hooks/useNumberFormat';
import { getCachedUserProfile, getUserProfile } from '../services/userService';

/**
 * Runs on login and syncs locale, theme, numberUnit from Firestore
 * to their respective React contexts (and localStorage).
 * Renders nothing — place once inside App.jsx.
 */
export function UserSettingsSync() {
  const { user } = useAuth();
  const { locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const { unit, setUnit } = useNumberFormat();

  useEffect(() => {
    if (!user?.uid) return;
    let active = true;

    const sync = async () => {
      try {
        const profile = getCachedUserProfile(user.uid) || await getUserProfile(user.uid);
        if (!active) return;
        const s = profile?.settings || {};
        if (s.locale   && s.locale    !== locale) setLocale(s.locale);
        if (s.theme    && s.theme     !== theme)  setTheme(s.theme);
        if (s.numberUnit && s.numberUnit !== unit) setUnit(s.numberUnit);
      } catch {
        // Silent fail — app continues with localStorage defaults
      }
    };

    sync();
    return () => { active = false; };
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
