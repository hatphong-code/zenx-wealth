import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Apple, ArrowRight, Mail, ShieldCheck, WalletCards } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useI18n } from '../i18n/useI18n';
import { auth } from '../services/firebaseAuth';

async function ensureUserDocument(user) {
  const [{ doc, getDoc, serverTimestamp, setDoc }, { db }] = await Promise.all([
    import('firebase/firestore/lite'),
    import('../services/firebaseDb'),
  ]);

  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);

  const defaults = {
    currency: 'VND',
    monthlyEssentialExpense: 15000000,
    emergencyFundTargetMonths: 6,
    payYourselfFirstRate: 0.3,
    allocationRule: {
      living: 55,
      emergencyFund: 15,
      longTermAsset: 15,
      businessLearning: 10,
      highRiskTrading: 5,
    },
    customCategories: {
      income: [],
      expense: [],
    },
  };

  if (!snapshot.exists()) {
    await setDoc(userRef, {
      email: user.email,
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
      photoURL: user.photoURL || '',
      subscriptionTier: 'free',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      settings: defaults,
    });
    return;
  }

  const existing = snapshot.data();
  await setDoc(userRef, {
    email: user.email || existing.email || '',
    displayName: user.displayName || existing.displayName || user.email?.split('@')[0] || 'User',
    photoURL: user.photoURL || existing.photoURL || '',
    subscriptionTier: existing.subscriptionTier || 'free',
    updatedAt: serverTimestamp(),
    settings: {
      ...defaults,
      ...(existing.settings || {}),
    },
  }, { merge: true });
}

export default function Login() {
  const { t } = useI18n();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const friendlyAuthError = (authError) => {
    switch (authError.code) {
      case 'auth/popup-closed-by-user':
        return t('login.errors.popupClosed');
      case 'auth/unauthorized-domain':
        return t('login.errors.unauthorizedDomain');
      case 'auth/operation-not-allowed':
        return t('login.errors.operationNotAllowed');
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return t('login.errors.invalidCredential');
      case 'auth/email-already-in-use':
        return t('login.errors.emailInUse');
      case 'auth/weak-password':
        return t('login.errors.weakPassword');
      default:
        return authError.message || t('login.errors.generic');
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0B1020] p-10 text-center text-white">{t('common.loading')}</div>;
  if (user) return <Navigate to="/" replace />;

  const handleProviderSignIn = async (provider) => {
    setSubmitting(true);
    setError('');
    try {
      const { GoogleAuthProvider, OAuthProvider, signInWithPopup } = await import('firebase/auth');
      const resolvedProvider = provider === 'apple' ? new OAuthProvider('apple.com') : new GoogleAuthProvider();
      const result = await signInWithPopup(auth, resolvedProvider);
      await ensureUserDocument(result.user);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const { createUserWithEmailAndPassword, signInWithEmailAndPassword } = await import('firebase/auth');
      const result = isLogin
        ? await signInWithEmailAndPassword(auth, email, password)
        : await createUserWithEmailAndPassword(auth, email, password);
      await ensureUserDocument(result.user);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1020] text-white">
      <main className="mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-4 py-8 lg:grid-cols-[1fr_420px] lg:px-6">
        <section className="space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded border border-[#1F2937] bg-[#111827] px-3 py-2 text-sm text-gray-300">
              <WalletCards className="h-4 w-4 text-blue-400" />
              {t('login.badge')}
            </div>
            <div className="space-y-3">
              <h1 className="max-w-2xl text-4xl font-bold leading-tight md:text-5xl">{t('login.title')}</h1>
              <p className="max-w-xl text-base leading-7 text-gray-300">{t('login.subtitle')}</p>
            </div>
          </div>

          <div className="grid max-w-2xl gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-[#1F2937] bg-[#111827] p-4">
              <p className="text-sm font-semibold">{t('login.pillars.trackTitle')}</p>
              <p className="mt-2 text-sm text-gray-400">{t('login.pillars.trackBody')}</p>
            </div>
            <div className="rounded-lg border border-[#1F2937] bg-[#111827] p-4">
              <p className="text-sm font-semibold">{t('login.pillars.reduceTitle')}</p>
              <p className="mt-2 text-sm text-gray-400">{t('login.pillars.reduceBody')}</p>
            </div>
            <div className="rounded-lg border border-[#1F2937] bg-[#111827] p-4">
              <p className="text-sm font-semibold">{t('login.pillars.buildTitle')}</p>
              <p className="mt-2 text-sm text-gray-400">{t('login.pillars.buildBody')}</p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-[#1F2937] bg-[#111827] p-6 shadow-2xl shadow-black/30">
          <div className="mb-6 space-y-2">
            <h2 className="text-2xl font-bold">{isLogin ? t('login.signIn') : t('login.signUp')}</h2>
            <p className="text-sm text-gray-400">{t('login.socialHint')}</p>
          </div>

          <button
            type="button"
            onClick={() => handleProviderSignIn('apple')}
            disabled={submitting}
            className="mb-3 flex w-full items-center justify-center gap-3 rounded bg-white px-4 py-3 font-semibold text-[#111827] transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Apple className="h-5 w-5" />
            {t('login.continueApple')}
          </button>

          <button
            type="button"
            onClick={() => handleProviderSignIn('google')}
            disabled={submitting}
            className="mb-5 flex w-full items-center justify-center gap-3 rounded border border-gray-600 bg-[#0B1020] px-4 py-3 font-semibold text-white transition hover:bg-[#111827] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-sm font-bold">G</span>
            {t('login.continueGoogle')}
          </button>

          <div className="mb-5 flex items-center gap-3 text-xs uppercase tracking-wide text-gray-500">
            <div className="h-px flex-1 bg-[#1F2937]" />
            {t('login.emailDivider')}
            <div className="h-px flex-1 bg-[#1F2937]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm text-gray-300">{t('login.emailLabel')}</span>
              <div className="flex items-center gap-3 rounded border border-gray-600 bg-[#1F2937] px-3 focus-within:ring-2 focus-within:ring-blue-500">
                <Mail className="h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  placeholder={t('login.emailPlaceholder')}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full bg-transparent py-3 text-white outline-none"
                  required
                />
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-gray-300">{t('login.passwordLabel')}</span>
              <input
                type="password"
                placeholder={t('login.passwordPlaceholder')}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded border border-gray-600 bg-[#1F2937] p-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </label>

            {error && <p className="rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded bg-blue-600 p-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLogin ? t('login.submitSignIn') : t('login.submitSignUp')}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="mt-5 w-full text-center text-sm text-gray-400 transition hover:text-gray-200"
          >
            {isLogin ? t('login.switchToSignUp') : t('login.switchToSignIn')}
          </button>

          <div className="mt-6 flex items-start gap-3 rounded border border-[#1F2937] bg-[#0B1020] p-3 text-xs text-gray-400">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
            {t('login.dataPrivacy')}
          </div>
        </section>
      </main>
    </div>
  );
}
