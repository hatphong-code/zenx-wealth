import { useAuth } from '../auth/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { AlertTriangle, Zap } from 'lucide-react';
import { formatMoney } from '../utils/formatters';
import { useLatteFactor } from '../hooks/useLatteFactor';
import { useI18n } from '../i18n/useI18n';

export default function LatteFactor() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { latteData, loading, refreshing, error } = useLatteFactor(user?.uid);
  const currency = latteData.currency || 'VND';

  const handleConvert = () => {
    alert(t('latte.convertButton', { amount: formatMoney(Math.floor(latteData.total * 0.6), currency) }));
  };

  return (
      <main className="mx-auto max-w-6xl space-y-6 p-4 pb-24 md:p-6">
        <div className="space-y-2">
          <h1 className="font-zx-head text-2xl font-bold">{t('latte.title')}</h1>
          {loading && <p className="text-sm text-zx-text-soft">{t('latte.loading')}</p>}
          {refreshing && <p className="text-sm text-zx-accent">{t('latte.refreshing')}</p>}
        </div>

        {error && (
          <div className="rounded-zx-sm border border-zx-negative/40 bg-zx-negative/10 p-3 text-sm text-zx-negative">{error}</div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="text-zx-accent" /> {t('latte.thisMonthLeakage')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-zx-display text-4xl font-bold text-zx-accent">
              {formatMoney(latteData.total, currency)}
            </div>
            <p className="mt-2 text-zx-text-soft">{t('latte.dailyAverage')} {formatMoney(latteData.total / 30, currency)}</p>
            <p className="mt-1 text-red-400">
              {t('latte.annualImpact')} <span className="font-bold">{formatMoney(latteData.annualImpact, currency)}</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('latte.topCategories')}</CardTitle>
          </CardHeader>
          <CardContent>
            {latteData.topCategories.length === 0 ? (
              <p className="text-sm text-zx-text-soft">{t('latte.noTransactions')}</p>
            ) : (
              <ul className="space-y-2">
                {latteData.topCategories.map((item) => (
                  <li
                    key={item.category}
                    className="flex justify-between border-b border-zx-line py-2 text-sm"
                  >
                    <span>{item.category}</span>
                    <span className="font-mono">{formatMoney(item.amount, currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Button
          onClick={handleConvert}
          className="w-full bg-zx-positive text-zx-on-accent hover:opacity-90"
        >
          <Zap className="mr-2 h-4 w-4" />
          {t('latte.convertButton', { amount: formatMoney(Math.floor(latteData.total * 0.6), currency) })}
        </Button>
      </main>
  );
}


