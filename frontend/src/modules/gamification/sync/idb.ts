import { get, set, createStore, UseStore } from 'idb-keyval';

export interface OutboxRecord {
  id: string;
  type: string;
  lectureId?: number | null;
  payload: Record<string, any>;
  clientTs: string;
  retryCount: number;
  enqueuedAt: number;
}

const OUTBOX_KEY = 'bsu_gamification_outbox_queue';
let customStore: UseStore | null = null;

function getStore(): UseStore | undefined {
  if (typeof window === 'undefined') return undefined;
  if (!customStore) {
    customStore = createStore('bsu_portal_gamification', 'outbox');
  }
  return customStore;
}

/**
 * Appends an event to the persistent IndexedDB outbox queue.
 */
export async function enqueueOutboxEvent(
  record: OutboxRecord
): Promise<void> {
  const store = getStore();
  if (!store) return;

  try {
    const queue = (await get<OutboxRecord[]>(OUTBOX_KEY, store)) || [];
    // Prevent duplicate enqueues by ID
    if (!queue.some((item) => item.id === record.id)) {
      queue.push(record);
      await set(OUTBOX_KEY, queue, store);
    }
  } catch (err) {
    console.error('[IDB Outbox] Error enqueuing event:', err);
  }
}

/**
 * Retrieves the oldest pending events from the queue up to the specified limit.
 */
export async function getOutboxEvents(
  limit = 25
): Promise<OutboxRecord[]> {
  const store = getStore();
  if (!store) return [];

  try {
    const queue = (await get<OutboxRecord[]>(OUTBOX_KEY, store)) || [];
    return queue.slice(0, limit);
  } catch (err) {
    console.error('[IDB Outbox] Error reading queue:', err);
    return [];
  }
}

/**
 * Removes successfully synced events from the queue by their IDs.
 */
export async function removeOutboxEvents(
  ids: string[]
): Promise<void> {
  const store = getStore();
  if (!store || ids.length === 0) return;

  try {
    const idSet = new Set(ids);
    const queue = (await get<OutboxRecord[]>(OUTBOX_KEY, store)) || [];
    const remaining = queue.filter((item) => !idSet.has(item.id));
    await set(OUTBOX_KEY, remaining, store);
  } catch (err) {
    console.error('[IDB Outbox] Error removing events:', err);
  }
}

/**
 * Increments the retry count for events that failed to sync.
 */
export async function incrementRetryCount(
  ids: string[]
): Promise<void> {
  const store = getStore();
  if (!store || ids.length === 0) return;

  try {
    const idSet = new Set(ids);
    const queue = (await get<OutboxRecord[]>(OUTBOX_KEY, store)) || [];
    const updated = queue.map((item) => {
      if (idSet.has(item.id)) {
        return { ...item, retryCount: item.retryCount + 1 };
      }
      return item;
    });
    await set(OUTBOX_KEY, updated, store);
  } catch (err) {
    console.error('[IDB Outbox] Error updating retry counts:', err);
  }
}

/**
 * Returns current number of pending items in the outbox.
 */
export async function getOutboxCount(): Promise<number> {
  const store = getStore();
  if (!store) return 0;

  try {
    const queue = (await get<OutboxRecord[]>(OUTBOX_KEY, store)) || [];
    return queue.length;
  } catch {
    return 0;
  }
}

/**
 * Empties the queue completely. Useful for testing or resetting state.
 */
export async function clearOutbox(): Promise<void> {
  const store = getStore();
  if (!store) return;

  try {
    await set(OUTBOX_KEY, [], store);
  } catch (err) {
    console.error('[IDB Outbox] Error clearing outbox:', err);
  }
}
