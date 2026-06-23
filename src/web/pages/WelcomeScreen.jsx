import { useNavigate, useLocation } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import { ArrowRight, MapPin, Plus, LayoutDashboard, BookOpen } from 'lucide-react';
import { useAuth } from '../../core/auth/useAuth';
import { useI18n } from '../../core/i18n/useI18n';

const ACTIONS = [
  {
    key: 'addTx',
    icon: Plus,
    to: '/transactions/new',
    primary: true,
    iconBg: 'bg-zx-accent',
    iconColor: 'text-zx-on-accent',
  },
  {
    key: 'roadmap',
    icon: MapPin,
    to: '/roadmap',
    primary: false,
    iconBg: 'bg-zx-icon-bg',
    iconColor: 'text-zx-gold',
  },
  {
    key: 'dashboard',
    icon: LayoutDashboard,
    to: '/',
    primary: false,
    iconBg: 'bg-zx-icon-bg',
    iconColor: 'text-zx-accent',
  },
];

export default function WelcomeScreen() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const recommendedTemplateId = location.state?.recommendedTemplateId;

  if (!user) return <Navigate to="/login" replace />;

  const handleAction = (to) => navigate(to);

  return (
    <div className="min-h-screen bg-zx-bg flex flex-col items-center justify-center p-6 zx-transition">
      <div className="w-full max-w-md space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="text-5xl mb-2">✦</div>
          <h1 className="font-zx-head text-2xl font-bold text-zx-text">{t('welcome.title')}</h1>
          <p className="text-sm text-zx-text-soft">{t('welcome.subtitle')}</p>
        </div>

        {/* Action cards */}
        <div className="space-y-3">
          {recommendedTemplateId && (
            <button
              onClick={() => navigate(`/budget-templates?recommend=${recommendedTemplateId}`)}
              className="w-full flex items-center gap-4 rounded-zx border-2 border-zx-gold bg-zx-gold/10 p-4 text-left transition hover:bg-zx-gold/20"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-zx-sm bg-zx-gold/20">
                <BookOpen className="h-5 w-5 text-zx-gold" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-zx-text">{t('welcome.templateTitle')}</p>
                <p className="text-xs mt-0.5 text-zx-text-soft">{t('welcome.templateHint')}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-zx-gold" />
            </button>
          )}
          {ACTIONS.map(action => {
            const Icon = action.icon;
            const titleKey = `welcome.${action.key}Title`;
            const hintKey = `welcome.${action.key}Hint`;

            return (
              <button
                key={action.key}
                onClick={() => handleAction(action.to)}
                className={`w-full flex items-center gap-4 rounded-zx border p-4 text-left transition group ${
                  action.primary
                    ? 'border-zx-accent bg-zx-accent-soft hover:bg-zx-accent hover:text-zx-on-accent shadow-zx'
                    : 'border-zx-line bg-zx-surface hover:border-zx-accent hover:bg-zx-surface-2'
                }`}
              >
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-zx-sm ${
                  action.primary ? 'bg-zx-accent group-hover:bg-zx-on-accent/20' : action.iconBg
                }`}>
                  <Icon className={`h-5 w-5 ${action.primary ? 'text-zx-on-accent' : action.iconColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold text-sm ${action.primary ? 'text-zx-accent group-hover:text-zx-on-accent' : 'text-zx-text'}`}>
                    {t(titleKey)}
                  </p>
                  <p className={`text-xs mt-0.5 ${action.primary ? 'text-zx-accent/80 group-hover:text-zx-on-accent/80' : 'text-zx-text-soft'}`}>
                    {t(hintKey)}
                  </p>
                </div>
                <ArrowRight className={`h-4 w-4 shrink-0 ${
                  action.primary ? 'text-zx-accent group-hover:text-zx-on-accent' : 'text-zx-text-soft'
                }`} />
              </button>
            );
          })}
        </div>

        {/* Skip link */}
        <p className="text-center">
          <button onClick={() => navigate('/')}
            className="text-xs text-zx-text-soft hover:text-zx-text underline underline-offset-2 transition">
            {t('welcome.skip')}
          </button>
        </p>
      </div>
    </div>
  );
}
