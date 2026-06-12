import { useAuth } from '../auth/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { AlertTriangle, Zap } from 'lucide-react';
import AppNav from '../components/AppNav';
import { formatMoney } from '../utils/formatters';
import { useLatteFactor } from '../hooks/useLatteFactor';

export default function LatteFactor() {
  const { user } = useAuth();
  const { latteData, loading, refreshing, error } = useLatteFactor(user?.uid);
  const currency = latteData.currency || 'VND';

  const handleConvert = () => {
    alert('Emergency Fund conversion flow will be added in a dedicated module.');
  };

  return (
    <div className="min-h-screen bg-[#0B1020] text-white">
      <AppNav />
      <main className="mx-auto max-w-6xl space-y-6 p-4 pb-24 md:p-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Latte Factor Engine</h1>
          {loading && <p className="text-sm text-gray-400">Analyzing current month...</p>}
          {refreshing && <p className="text-sm text-blue-300">Refreshing Latte Factor data...</p>}
        </div>

        {error && <div className="rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</div>}

        <Card className="border-[#1F2937] bg-[#111827]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="text-orange-400" /> This month&apos;s leakage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-orange-400">{formatMoney(latteData.total, currency)}</div>
            <p className="mt-2 text-gray-400">Daily average: {formatMoney(latteData.total / 30, currency)}</p>
            <p className="mt-1 text-red-400">
              Annualized impact: <span className="font-bold">{formatMoney(latteData.annualImpact, currency)}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#1F2937] bg-[#111827]">
          <CardHeader>
            <CardTitle>Top 3 leakage categories</CardTitle>
          </CardHeader>
          <CardContent>
            {latteData.topCategories.length === 0 ? (
              <p className="text-sm text-gray-400">No Latte Factor transactions recorded this month.</p>
            ) : (
              <ul className="space-y-2">
                {latteData.topCategories.map((item) => (
                  <li key={item.category} className="flex justify-between border-b border-gray-800 py-2">
                    <span>{item.category}</span>
                    <span className="font-mono">{formatMoney(item.amount, currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Button onClick={handleConvert} className="w-full bg-green-600 hover:bg-green-700">
          <Zap className="mr-2 h-4 w-4" /> Move {formatMoney(Math.floor(latteData.total * 0.6), currency)} to emergency fund
        </Button>
      </main>
    </div>
  );
}


