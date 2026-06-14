import { createHmac } from 'crypto';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

const MOMO_PARTNER_CODE = defineSecret('MOMO_PARTNER_CODE');
const MOMO_ACCESS_KEY = defineSecret('MOMO_ACCESS_KEY');
const MOMO_SECRET_KEY = defineSecret('MOMO_SECRET_KEY');

const MOMO_ENDPOINT = 'https://payment.momo.vn/v2/gateway/api/create';
const REGION = 'asia-southeast1';

const PLANS = {
  monthly: { amount: 99000, label: 'ZenX Wealth Premium — 1 tháng', days: 30 },
  yearly:  { amount: 799000, label: 'ZenX Wealth Premium — 12 tháng', days: 365 },
};

function momoSignature(rawStr, secretKey) {
  return createHmac('sha256', secretKey).update(rawStr).digest('hex');
}

function buildCreateSignature(params, secretKey) {
  const raw = [
    `accessKey=${params.accessKey}`,
    `amount=${params.amount}`,
    `extraData=${params.extraData}`,
    `ipnUrl=${params.ipnUrl}`,
    `orderId=${params.orderId}`,
    `orderInfo=${params.orderInfo}`,
    `partnerCode=${params.partnerCode}`,
    `redirectUrl=${params.redirectUrl}`,
    `requestId=${params.requestId}`,
    `requestType=${params.requestType}`,
  ].join('&');
  return momoSignature(raw, secretKey);
}

function buildIpnSignature(data, accessKey, secretKey) {
  const raw = [
    `accessKey=${accessKey}`,
    `amount=${data.amount}`,
    `extraData=${data.extraData}`,
    `message=${data.message}`,
    `orderId=${data.orderId}`,
    `orderType=${data.orderType}`,
    `partnerCode=${data.partnerCode}`,
    `payType=${data.payType}`,
    `requestId=${data.requestId}`,
    `responseTime=${data.responseTime}`,
    `resultCode=${data.resultCode}`,
    `transId=${data.transId}`,
  ].join('&');
  return momoSignature(raw, secretKey);
}

export const createMomoPayment = onCall({
  region: REGION,
  secrets: [MOMO_PARTNER_CODE, MOMO_ACCESS_KEY, MOMO_SECRET_KEY],
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in.');

  const { plan, returnHost } = request.data;
  if (!PLANS[plan]) throw new HttpsError('invalid-argument', 'Invalid plan.');

  const userId = request.auth.uid;
  const partnerCode = MOMO_PARTNER_CODE.value();
  const accessKey = MOMO_ACCESS_KEY.value();
  const secretKey = MOMO_SECRET_KEY.value();

  const { amount, label, days } = PLANS[plan];
  const requestId = `${partnerCode}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const orderId = requestId;
  const extraData = Buffer.from(JSON.stringify({ userId, plan, days })).toString('base64');
  const ipnUrl = `https://${REGION}-zenx-wealth.cloudfunctions.net/momoIPN`;
  const redirectUrl = `${returnHost || 'https://wealth.zenx.asia'}/upgrade?status=success&orderId=${orderId}`;
  const requestType = 'payWithMethod';

  const params = { partnerCode, accessKey, requestId, amount, orderId, orderInfo: label, redirectUrl, ipnUrl, requestType, extraData };
  const signature = buildCreateSignature(params, secretKey);

  const body = JSON.stringify({ ...params, lang: 'vi', signature });

  const db = getFirestore();
  await db.doc(`momoPayments/${orderId}`).set({
    userId,
    plan,
    amount,
    days,
    status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
  });

  const response = await fetch(MOMO_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  const result = await response.json();

  if (result.resultCode !== 0) {
    logger.error('momo_create_failed', { userId, plan, resultCode: result.resultCode, message: result.message });
    throw new HttpsError('internal', result.message || 'Không thể tạo thanh toán MoMo.');
  }

  logger.info('momo_payment_created', { userId, plan, orderId, amount });
  return { payUrl: result.payUrl, orderId };
});

export const momoIPN = onRequest({
  region: REGION,
  secrets: [MOMO_ACCESS_KEY, MOMO_SECRET_KEY],
}, async (req, res) => {
  if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

  const data = req.body;
  const accessKey = MOMO_ACCESS_KEY.value();
  const secretKey = MOMO_SECRET_KEY.value();

  const expected = buildIpnSignature(data, accessKey, secretKey);
  if (expected !== data.signature) {
    logger.warn('momo_ipn_invalid_signature', { orderId: data.orderId });
    res.status(400).json({ message: 'Invalid signature.' });
    return;
  }

  const db = getFirestore();
  const paymentRef = db.doc(`momoPayments/${data.orderId}`);
  const paymentSnap = await paymentRef.get();

  if (!paymentSnap.exists) {
    logger.warn('momo_ipn_unknown_order', { orderId: data.orderId });
    res.status(200).json({ message: 'OK' });
    return;
  }

  const payment = paymentSnap.data();

  if (payment.status === 'completed') {
    res.status(200).json({ message: 'Already processed.' });
    return;
  }

  if (Number(data.resultCode) === 0) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + payment.days);

    await db.runTransaction(async (tx) => {
      tx.update(paymentRef, {
        status: 'completed',
        transId: String(data.transId),
        payType: data.payType,
        completedAt: FieldValue.serverTimestamp(),
      });
      tx.update(db.doc(`users/${payment.userId}`), {
        subscriptionTier: 'premium',
        subscriptionExpiresAt: expiresAt,
        subscriptionPlan: payment.plan,
      });
    });

    logger.info('momo_payment_success', { userId: payment.userId, plan: payment.plan, orderId: data.orderId, transId: data.transId });
  } else {
    await paymentRef.update({ status: 'failed', resultCode: data.resultCode, completedAt: FieldValue.serverTimestamp() });
    logger.info('momo_payment_failed', { orderId: data.orderId, resultCode: data.resultCode });
  }

  res.status(200).json({ message: 'OK' });
});
