import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebaseApp';

const functions = getFunctions(app, 'asia-southeast1');

export async function generateLLMInsights({ reports, roadmap, profile }) {
  const generateInsights = httpsCallable(functions, 'generateAIInsights');
  const result = await generateInsights({ reports, roadmap, profile });
  return result.data;
}
