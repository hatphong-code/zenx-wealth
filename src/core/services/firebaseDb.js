import { getFirestore } from 'firebase/firestore/lite';
import { app } from './firebaseApp';

export const db = getFirestore(app);
