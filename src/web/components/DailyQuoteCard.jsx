import { useEffect, useState } from 'react';
import { BookOpen, X } from 'lucide-react';
import { useAuth } from '../../core/auth/useAuth';
import { useI18n } from '../../core/i18n/useI18n';
import { getUserProfile } from '../../core/services/userService';
import { getQuotes, pickTodayQuote } from '../../core/services/quoteService';

const DISMISS_KEY = 'zx-quote-dismissed';

function getDismissedDate() {
  return localStorage.getItem(DISMISS_KEY) || '';
}

function setDismissedToday() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  localStorage.setItem(DISMISS_KEY, today);
}

function isDismissedToday() {
  const today = new Date().toISOString().slice(0, 10);
  return getDismissedDate() === today;
}

export default function DailyQuoteCard() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const [quote, setQuote] = useState(null);
  const [dismissed, setDismissed] = useState(isDismissedToday);

  useEffect(() => {
    if (!user || dismissed) return;

    async function load() {
      try {
        const [quotes, profile] = await Promise.all([
          getQuotes(),
          getUserProfile(user.uid),
        ]);
        const template = profile?.settings?.budgetTemplate || 'young_pro';
        const today = pickTodayQuote(quotes, template);
        setQuote(today);
      } catch {
        // silently skip if unavailable
      }
    }

    load();
  }, [user, dismissed]);

  if (dismissed || !quote) return null;

  const text = locale === 'vi' ? quote.vi : quote.en;
  const sub  = locale === 'vi' ? quote.en : null;

  return (
    <section className="pb-6">
      <div className="rounded-zx border border-zx-line bg-zx-surface p-5 relative">
        <button
          onClick={() => { setDismissedToday(); setDismissed(true); }}
          className="absolute right-3 top-3 p-1 rounded text-zx-text-soft hover:text-zx-text transition"
          aria-label={t('dailyQuote.dismiss')}
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="flex gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-7 h-7 rounded-zx-sm bg-zx-icon-bg flex items-center justify-center" style={{ color: 'var(--zx-gold-fg)' }}>
              <BookOpen className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="min-w-0 pr-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zx-gold mb-2">
              {t('dailyQuote.dayLabel')}
            </p>
            <p className="text-sm font-medium leading-relaxed text-zx-text">
              "{text}"
            </p>
            {sub && (
              <p className="mt-1.5 text-xs leading-relaxed text-zx-text-soft italic">
                "{sub}"
              </p>
            )}
            <p className="mt-2.5 text-[11px] text-zx-text-soft">
              — {quote.source || t('dailyQuote.source')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
