import { useEffect, useState } from 'react';
import { SyncQueue } from '../../core/services/syncQueue';

export function useSyncStatus() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(() => SyncQueue.isSyncing());
  const [queueLength, setQueueLength] = useState(() => SyncQueue.getQueueLength());

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Process queue when coming back online
      window.dispatchEvent(new Event('sync-queue:process'));
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleSyncStart = () => {
      setIsSyncing(true);
    };

    const handleSyncEnd = () => {
      setIsSyncing(false);
      setQueueLength(SyncQueue.getQueueLength());
    };

    const handleQueueUpdate = () => {
      setQueueLength(SyncQueue.getQueueLength());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sync-queue:start', handleSyncStart);
    window.addEventListener('sync-queue:end', handleSyncEnd);
    window.addEventListener('sync-queue:update', handleQueueUpdate);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync-queue:start', handleSyncStart);
      window.removeEventListener('sync-queue:end', handleSyncEnd);
      window.removeEventListener('sync-queue:update', handleQueueUpdate);
    };
  }, []);

  return {
    isOnline,
    isSyncing,
    queueLength,
    status: !isOnline ? 'offline' : isSyncing ? 'syncing' : 'online',
  };
}
