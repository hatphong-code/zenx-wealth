import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebaseApp';

const functions = getFunctions(app, 'asia-southeast1');

export async function sendMonthlyLetterEmail({ to, letterContent, monthLabel }) {
  const fn = httpsCallable(functions, 'sendMonthlyLetter');
  const result = await fn({ to, letterContent, monthLabel });
  return result.data;
}
