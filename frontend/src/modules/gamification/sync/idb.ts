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

export const MAX_OUTBOX_RETRIES = 5;
const DEAD_LETTER_KEY = 'bsu_gamification_dead_letter';

/**
 * Retrieves the oldest pending events from the queue up to the specified limit.
 * Events exceeding MAX_OUTBOX_RETRIES are automatically quarantined to Dead Letter storage.
 */
export async function getOutboxEvents(
  limit = 25
): Promise<OutboxRecord[]> {
  const store = getStore();
  if (!store) return [];

  try {
    const queue = (await get<OutboxRecord[]>(OUTBOX_KEY, store)) || [];
    const active = queue.filter((item) => item.retryCount < MAX_OUTBOX_RETRIES);
    const poisoned = queue.filter((item) => item.retryCount >= MAX_OUTBOX_RETRIES);

    if (poisoned.length > 0) {
      try {
        const existingDead = (await get<OutboxRecord[]>(DEAD_LETTER_KEY, store)) || [];
        await set(DEAD_LETTER_KEY, [...existingDead, ...poisoned], store);
        await set(OUTBOX_KEY, active, store);
        console.warn(`[IDB Outbox] Quarantined ${poisoned.length} poisoned events exceeding max retries.`);
      } catch (qErr) {
        console.error('[IDB Outbox] Failed to quarantine dead-letter events:', qErr);
      }
    }

    return active.slice(0, limit);
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

/**
 * Restores quarantined dead-letter events back into the active queue with reset retry counts.
 */
export async function replayDeadLetterEvents(): Promise<number> {
  const store = getStore();
  if (!store) return 0;

  try {
    const dead = (await get<OutboxRecord[]>(DEAD_LETTER_KEY, store)) || [];
    if (dead.length === 0) return 0;

    const restored = dead.map((item) => ({ ...item, retryCount: 0 }));
    const queue = (await get<OutboxRecord[]>(OUTBOX_KEY, store)) || [];
    const existingIds = new Set(queue.map((item) => item.id));
    const toAdd = restored.filter((item) => !existingIds.has(item.id));

    await set(OUTBOX_KEY, [...queue, ...toAdd], store);
    await set(DEAD_LETTER_KEY, [], store);
    console.info(`[IDB Outbox] Successfully restored ${toAdd.length} events from dead-letter.`);
    return toAdd.length;
  } catch (err) {
    console.error('[IDB Outbox] Error replaying dead-letter events:', err);
    return 0;
  }
}

