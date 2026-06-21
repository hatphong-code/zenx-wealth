import { useEffect } from 'react';
import { SyncQueue } from '../../core/services/syncQueue';
import {
  createTransaction, updateTransaction, deleteTransaction,
} from '../../core/services/transactionService';
import {
  updateUserSettings, updateTheme, updateLocale,
} from '../../core/services/userService';
import {
  createEmergencyFundRecord,
} from '../../core/services/emergencyFundService';
import {
  saveWeeklyReview,
} from '../../core/services/weeklyReviewService';

const OPERATION_HANDLERS = {
  createTransaction: async (op) => {
    await createTransaction(op.userId, op.data);
  },
  updateTransaction: async (op) => {
    await updateTransaction(op.userId, op.resourceId, op.data);
  },
  deleteTransaction: async (op) => {
    await deleteTransaction(op.userId, op.resourceId);
  },
  updateUserSettings: async (op) => {
    await updateUserSettings(op.userId, op.data);
  },
  updateTheme: async (op) => {
    await updateTheme(op.userId, op.data);
  },
  updateLocale: async (op) => {
    await updateLocale(op.userId, op.data);
  },
  createEmergencyFundRecord: async (op) => {
    await createEmergencyFundRecord(op.userId, op.data);
  },
  saveWeeklyReview: async (op) => {
    await saveWeeklyReview(op.userId, op.weekKey, op.data);
  },
};

export function useQueueProcessor() {
  useEffect(() => {
    const processQueue = async () => {
      window.dispatchEvent(new Event('sync-queue:start'));
      try {
        const result = await SyncQueue.processQueue(OPERATION_HANDLERS);
        window.dispatchEvent(new Event('sync-queue:update'));
        console.log('Queue processed:', result);
      } catch (err) {
        console.error('Queue processing failed:', err);
      }
      window.dispatchEvent(new Event('sync-queue:end'));
    };

    const handleOnline = () => {
      console.log('Back online, processing queue...');
      processQueue();
    };

    const handleProcessRequest = () => {
      if (navigator.onLine) {
        processQueue();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('sync-queue:process', handleProcessRequest);

    // Process queue on mount if online and queue has items
    if (navigator.onLine && SyncQueue.getQueueLength() > 0) {
      processQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('sync-queue:process', handleProcessRequest);
    };
  }, []);
}
