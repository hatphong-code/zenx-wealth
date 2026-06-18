import { useEffect, useState } from 'react';
import { CheckCircle2, Download, Loader2, Mail } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useI18n } from '../i18n/useI18n';
import { getMonthlyLetter } from '../services/monthlyLetterService';
import { sendMonthlyLetterEmail } from '../services/emailService';
import { Button } from '../components/ui/button';

export default function MonthlyLetter() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [letter, setLetter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [emailTo, setEmailTo] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setEmailTo(user.email || '');

    (async () => {
      try {
        const data = await getMonthlyLetter(user.uid);
        if (!active) return;
        setLetter(data);
        setError('');
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Failed to load letter');
      } finally {
        if (!active) return;
        setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [user]);

  const handleDownload = () => {
    if (!letter) return;
    const blob = new Blob([letter.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zenx-letter-${letter.monthKey}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!emailTo || !letter) return;
    setEmailSending(true); setEmailError(''); setEmailSent(false);
    try {
      await sendMonthlyLetterEmail({
        to: emailTo,
        letterContent: letter.content,
        monthLabel: letter.month,
      });
      setEmailSent(true);
      setShowEmailForm(false);
    } catch (err) {
      setEmailError(err.message || t('monthlyLetter.emailError'));
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 md:px-8 py-6 pb-24 md:pb-8">
      <div className="space-y-2 mb-6">
        <h1 className="font-zx-head text-2xl font-bold text-zx-text">
          {letter?.month ? t('monthlyLetter.monthTitle', { month: letter.month }) : t('monthlyLetter.title')}
        </h1>
        <p className="text-sm text-zx-text-soft">{t('monthlyLetter.subtitle')}</p>
      </div>

      {error && (
        <div className="rounded border border-red-900 bg-red-950/40 p-4 text-sm text-red-300 mb-4">{error}</div>
      )}

      {loading ? (
        <div className="p-10 text-center text-zx-text-soft">{t('common.loading')}</div>
      ) : letter ? (
        <>
          <article className="prose prose-invert max-w-none mb-6 rounded-zx border border-zx-line bg-zx-surface p-6">
            <div className="whitespace-pre-wrap font-body text-sm leading-relaxed text-zx-text">
              {letter.content}
            </div>
          </article>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {Object.entries(letter.metrics).map(([key, value]) => (
              <div key={key} className="rounded-zx border border-zx-line bg-zx-surface p-3">
                <p className="text-xs uppercase tracking-wide text-zx-text-soft mb-1">
                  {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                </p>
                <p className="font-zx-display text-base font-bold text-zx-text">
                  {typeof value === 'number' ? value.toFixed(1) : value}
                </p>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 md:flex-row">
              <Button onClick={handleDownload}
                className="flex items-center justify-center gap-2 bg-zx-accent text-zx-on-accent hover:opacity-90">
                <Download className="h-4 w-4" /> {t('monthlyLetter.downloadButton')}
              </Button>
              <Button onClick={() => { setShowEmailForm(v => !v); setEmailSent(false); setEmailError(''); }}
                className={`flex items-center justify-center gap-2 transition ${
                  showEmailForm ? 'bg-zx-accent-soft border border-zx-accent text-zx-accent' : 'bg-zx-surface-2 text-zx-text-soft hover:text-zx-text'
                }`}>
                <Mail className="h-4 w-4" /> {t('monthlyLetter.emailButton')}
              </Button>
            </div>

            {/* Email success */}
            {emailSent && (
              <div className="flex items-center gap-2 rounded-zx-sm border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                {t('monthlyLetter.emailSentTo', { email: emailTo })}
              </div>
            )}

            {/* Email form */}
            {showEmailForm && (
              <form onSubmit={handleSendEmail}
                className="rounded-zx-sm border border-zx-line bg-zx-surface-2 p-4 space-y-3">
                <p className="text-sm font-medium text-zx-text">{t('monthlyLetter.sendTo')}</p>
                <div className="flex gap-2">
                  <input
                    type="email" required
                    value={emailTo}
                    onChange={e => setEmailTo(e.target.value)}
                    placeholder="you@example.com"
                    className="flex-1 rounded-zx-sm border border-zx-line bg-zx-bg px-4 py-2.5 text-sm text-zx-text outline-none focus:ring-2 focus:ring-zx-accent"
                  />
                  <button type="submit" disabled={emailSending}
                    className="flex items-center gap-2 rounded-zx-sm bg-zx-accent px-4 py-2.5 text-sm font-semibold text-zx-on-accent hover:opacity-90 disabled:opacity-50 transition">
                    {emailSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    {emailSending ? t('monthlyLetter.sending') : t('monthlyLetter.sendButton')}
                  </button>
                </div>
                {emailError && <p className="text-sm text-red-300">{emailError}</p>}
              </form>
            )}
          </div>
        </>
      ) : (
        <div className="text-center p-10 text-zx-text-soft">{t('monthlyLetter.noLetter')}</div>
      )}
    </main>
  );
}
