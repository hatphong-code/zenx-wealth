import { getCachedValue, setCachedValue } from './sessionCache';

const QUEUE_CACHE_KEY = 'sync-queue:pending';
const SYNCING_KEY = 'sync-queue:syncing';

export class SyncQueue {
  static async addOperation(operation) {
    const queue = this.getQueue();
    queue.push({
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      ...operation,
    });
    this.setQueue(queue);
    return operation.id;
  }

  static getQueue() {
    const cached = getCachedValue(QUEUE_CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  }

  static setQueue(queue) {
    setCachedValue(QUEUE_CACHE_KEY, JSON.stringify(queue));
  }

  static clearQueue() {
    this.setQueue([]);
  }

  static deduplicateQueue(queue) {
    // For each resource, keep only the latest operation
    const resourceMap = new Map();
    queue.forEach((op) => {
      const key = `${op.type}:${op.userId}:${op.resourceId || ''}`;
      resourceMap.set(key, op);
    });
    return Array.from(resourceMap.values());
  }

  static async processQueue(handlers) {
    if (this.isSyncing()) return;

    const queue = this.getQueue();
    if (queue.length === 0) return;

    this.setSyncing(true);
    const deduped = this.deduplicateQueue(queue);

    let successful = 0;
    let failed = 0;

    for (const operation of deduped) {
      try {
        const handler = handlers[operation.type];
        if (!handler) {
          console.warn(`No handler for operation type: ${operation.type}`);
          failed++;
          continue;
        }

        await handler(operation);
        successful++;
      } catch (err) {
        console.error(`Failed to sync operation ${operation.id}:`, err);
        failed++;
      }
    }

    // Remove successfully synced operations
    const remainingQueue = queue.filter((op) => {
      const dedupeKey = `${op.type}:${op.userId}:${op.resourceId || ''}`;
      return !deduped.some((d) => `${d.type}:${d.userId}:${d.resourceId || ''}` === dedupeKey);
    });

    this.setQueue(remainingQueue);
    this.setSyncing(false);

    return { successful, failed, remaining: remainingQueue.length };
  }

  static isSyncing() {
    return getCachedValue(SYNCING_KEY) === 'true';
  }

  static setSyncing(value) {
    setCachedValue(SYNCING_KEY, value ? 'true' : 'false');
  }

  static getQueueLength() {
    return this.getQueue().length;
  }
}
