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

  if (loading) return <div className="min-h-screen bg-zx-bg p-10 text-center text-zx-text">{t('common.loading')}</div>;
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
    <div className="min-h-screen bg-zx-bg text-zx-text">
      <main className="mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-4 py-8 lg:grid-cols-[1fr_420px] lg:px-6">
        <section className="space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-zx-sm border border-zx-line bg-zx-surface px-3 py-2 text-sm text-zx-text-soft">
              <WalletCards className="h-4 w-4 text-zx-accent" />
              {t('login.badge')}
            </div>
            <div className="space-y-3">
              <h1 className="font-zx-head max-w-2xl text-4xl font-bold leading-tight md:text-5xl">
                {t('login.title')}
              </h1>
              <p className="max-w-xl text-base leading-7 text-zx-text-soft">{t('login.subtitle')}</p>
            </div>
          </div>

          <div className="grid max-w-2xl gap-3 md:grid-cols-3">
            {[
              { titleKey: 'login.pillars.trackTitle', bodyKey: 'login.pillars.trackBody' },
              { titleKey: 'login.pillars.reduceTitle', bodyKey: 'login.pillars.reduceBody' },
              { titleKey: 'login.pillars.buildTitle', bodyKey: 'login.pillars.buildBody' },
            ].map((p) => (
              <div key={p.titleKey} className="rounded-zx-sm border border-zx-line bg-zx-surface p-4 shadow-zx zx-transition">
                <p className="text-sm font-semibold text-zx-text">{t(p.titleKey)}</p>
                <p className="mt-2 text-sm text-zx-text-soft">{t(p.bodyKey)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-zx border border-zx-line bg-zx-surface p-6 shadow-zx zx-transition">
          <div className="mb-6 space-y-2">
            <h2 className="font-zx-head text-2xl font-bold">
              {isLogin ? t('login.signIn') : t('login.signUp')}
            </h2>
            <p className="text-sm text-zx-text-soft">{t('login.socialHint')}</p>
          </div>

          {/* Apple sign-in — always white/dark per Apple HIG */}
          <button
            type="button"
            onClick={() => handleProviderSignIn('apple')}
            disabled={submitting}
            className="mb-3 flex w-full items-center justify-center gap-3 rounded-zx-sm bg-white px-4 py-3 font-semibold text-[#111827] transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Apple className="h-5 w-5" />
            {t('login.continueApple')}
          </button>

          <button
            type="button"
            onClick={() => handleProviderSignIn('google')}
            disabled={submitting}
            className="mb-5 flex w-full items-center justify-center gap-3 rounded-zx-sm border border-zx-line bg-zx-bg px-4 py-3 font-semibold text-zx-text transition hover:bg-zx-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-zx-line text-sm font-bold">G</span>
            {t('login.continueGoogle')}
          </button>

          <div className="mb-5 flex items-center gap-3 text-xs uppercase tracking-wide text-zx-text-soft">
            <div className="h-px flex-1 bg-zx-line" />
            {t('login.emailDivider')}
            <div className="h-px flex-1 bg-zx-line" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm text-zx-text-soft">{t('login.emailLabel')}</span>
              <div className="flex items-center gap-3 rounded-zx-sm border border-zx-line bg-zx-surface-2 px-3 focus-within:ring-2 focus-within:ring-zx-accent">
                <Mail className="h-4 w-4 text-zx-text-soft" />
                <input
                  type="email"
                  placeholder={t('login.emailPlaceholder')}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full bg-transparent py-3 text-zx-text outline-none"
                  aria-describedby={error ? 'login-error' : undefined}
                  required
                />
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-zx-text-soft">{t('login.passwordLabel')}</span>
              <input
                type="password"
                placeholder={t('login.passwordPlaceholder')}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 p-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent"
                aria-describedby={error ? 'login-error' : undefined}
                required
              />
            </label>

            {error && (
              <p id="login-error" role="alert" className="rounded-zx-sm border border-zx-negative/40 bg-zx-negative/10 p-3 text-sm text-zx-negative">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-zx-sm bg-zx-accent p-3 font-bold text-zx-on-accent transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLogin ? t('login.submitSignIn') : t('login.submitSignUp')}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="mt-5 w-full text-center text-sm text-zx-text-soft transition hover:text-zx-text"
          >
            {isLogin ? t('login.switchToSignUp') : t('login.switchToSignIn')}
          </button>

          <div className="mt-6 flex items-start gap-3 rounded-zx-sm border border-zx-line bg-zx-surface-2 p-3 text-xs text-zx-text-soft">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-zx-positive" />
            {t('login.dataPrivacy')}
          </div>
        </section>
      </main>
    </div>
  );
}
