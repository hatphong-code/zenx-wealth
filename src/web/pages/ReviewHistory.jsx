import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../core/auth/useAuth';
import { useI18n } from '../../core/i18n/useI18n';
import { listWeeklyReviews } from '../../core/services/weeklyReviewService';
import { formatDate } from '../../core/utils/formatters';

export default function ReviewHistory() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    setLoading(true);
    listWeeklyReviews(user.uid)
      .then(({ items: page, nextCursor }) => {
        if (cancelled) return;
        setItems(page);
        setCursor(nextCursor);
        setHasMore(Boolean(nextCursor));
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.uid]);

  const loadMore = async () => {
    if (!user?.uid || !cursor) return;
    setLoadingMore(true);
    try {
      const { items: page, nextCursor } = await listWeeklyReviews(user.uid, { cursor });
      setItems((prev) => [...prev, ...page]);
      setCursor(nextCursor);
      setHasMore(Boolean(nextCursor));
    } finally {
      setLoadingMore(false);
    }
  };

  const reviewed = items.filter((item) => item.oneLesson || item.oneActionNextWeek);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-8">
      <Link to="/review" className="inline-flex items-center gap-1.5 text-sm text-zx-text-soft hover:text-zx-accent transition mb-6">
        <ArrowLeft className="h-4 w-4" /> {t('reviewHistory.back')}
      </Link>
      <h1 className="font-zx-head text-xl font-semibold text-zx-text mb-6">{t('reviewHistory.title')}</h1>

      {loading ? (
        <p className="text-sm text-zx-text-soft">{t('common.loading')}</p>
      ) : reviewed.length === 0 ? (
        <p className="text-sm text-zx-text-soft">{t('reviewHistory.empty')}</p>
      ) : (
        <div className="divide-y divide-zx-line">
          {reviewed.map((item) => {
            const score = item.wealthDisciplineScore || 0;
            const scoreColor = score >= 80 ? 'text-zx-positive' : score >= 50 ? 'text-zx-gold' : 'text-zx-accent';
            return (
              <div key={item.weekKey} className="py-5">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zx-text-soft">
                    {formatDate(item.weekStart)}
                  </p>
                  <p className={`font-zx-display text-sm font-bold ${scoreColor}`}>{score}/100</p>
                </div>
                {item.oneLesson && <p className="text-sm text-zx-text italic mb-1">"{item.oneLesson}"</p>}
                {item.oneActionNextWeek && <p className="text-sm text-zx-text-soft">→ {item.oneActionNextWeek}</p>}
              </div>
            );
          })}
        </div>
      )}

      {hasMore && !loading && (
        <button onClick={loadMore} disabled={loadingMore}
          className="mt-6 w-full rounded-zx-sm border border-zx-line py-3 text-sm text-zx-text-soft hover:text-zx-text transition disabled:opacity-50">
          {loadingMore ? t('common.loading') : t('reviewHistory.loadMore')}
        </button>
      )}
    </div>
  );
}
