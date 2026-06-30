import { Flame } from 'lucide-react';
import { useI18n } from '../../core/i18n/useI18n';

export default function StreakBadge({ streak, size = 'md' }) {
  const { t } = useI18n();
  if (!streak || streak < 1) return null;
  const isSm = size === 'sm';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-zx-accent-soft border border-zx-accent/20 font-semibold text-zx-accent ${
      isSm ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
    }`}>
      <Flame className={isSm ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {t('reviewHub.streakWeeks', { count: streak })}
    </span>
  );
}
