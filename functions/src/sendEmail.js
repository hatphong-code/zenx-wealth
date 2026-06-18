import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';

async function getEmailSettings() {
  const db = getFirestore();
  const snap = await db.doc('appConfig/api-settings').get();
  return snap.data() || {};
}

function letterToHtml(text, monthLabel) {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const paragraphs = escaped
    .split(/\n{2,}/)
    .map(p => `<p style="margin:0 0 14px;line-height:1.6">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f13;font-family:system-ui,-apple-system,sans-serif;color:#e8e3d8">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f13;padding:40px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
        <tr><td style="padding-bottom:24px;border-bottom:1px solid #2a2830">
          <p style="margin:0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#7a7585">ZenX Wealth</p>
          <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#e8e3d8">${monthLabel || 'Monthly Letter'}</h1>
        </td></tr>
        <tr><td style="padding:28px 0;color:#c9c3b8;font-size:14px">
          ${paragraphs}
        </td></tr>
        <tr><td style="padding-top:24px;border-top:1px solid #2a2830">
          <p style="margin:0;font-size:11px;color:#7a7585">
            ZenX Wealth — Personal Finance OS<br>
            <a href="https://wealth.zenx.asia" style="color:#c9a24b;text-decoration:none">wealth.zenx.asia</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export const sendMonthlyLetter = onCall(
  { region: 'asia-southeast1', timeoutSeconds: 30, memory: '128MiB' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be authenticated.');

    const { to, letterContent, monthLabel } = request.data;
    if (!to || !letterContent) throw new HttpsError('invalid-argument', 'Missing required fields.');

    const settings = await getEmailSettings();
    const resendApiKey = settings.resendApiKey;
    const fromEmail = settings.emailFrom || 'ZenX Wealth <noreply@zenx.asia>';
    const fromName = settings.emailFromName || 'ZenX Wealth';

    if (!resendApiKey) {
      throw new HttpsError('failed-precondition', 'Email not configured. Admin must add Resend API key in Admin Settings.');
    }

    const subject = monthLabel ? `${fromName} — ${monthLabel}` : `${fromName} — Monthly Letter`;
    const html = letterToHtml(letterContent, monthLabel);

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: fromEmail, to, subject, html, text: letterContent }),
      });

      if (!response.ok) {
        const err = await response.text();
        logger.error('[sendEmail] Resend error', { status: response.status, body: err });
        throw new HttpsError('internal', 'Email delivery failed. Check Resend API key in Admin Settings.');
      }

      const data = await response.json();
      logger.info('[sendEmail] Sent', { to, id: data.id, userId: request.auth.uid });
      return { success: true, id: data.id };
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      logger.error('[sendEmail] Unexpected error', { error: err.message });
      throw new HttpsError('internal', 'Failed to send email.');
    }
  }
);
