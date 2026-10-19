import {
  getOutboxEvents,
  removeOutboxEvents,
  incrementRetryCount,
  getOutboxCount,
} from './idb';
import { ingestEventsRpc } from '../supabase/gamification';
import { useGamificationStore } from '../store/useGamificationStore';
import { IngestRpcPayload } from '../supabase/types';

let syncTimer: any = null;
let isFlushing = false;

/**
 * Drains a batch of events from the IndexedDB queue and ingests them via Supabase RPC.
 */
export async function flushOutboxBatch(batchLimit = 25): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (isFlushing) return false;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }

  isFlushing = true;
  useGamificationStore.getState().setSyncing(true);

  try {
    const pending = await getOutboxEvents(batchLimit);
    if (pending.length === 0) {
      return true;
    }

    const payload: IngestRpcPayload[] = pending.map((item) => ({
      id: item.id,
      type: item.type,
      lectureId: item.lectureId,
      payload: item.payload,
      clientTs: item.clientTs,
    }));

    const ids = pending.map((item) => item.id);

    try {
      const response = await ingestEventsRpc(payload);
      if (response && response.success) {
        // Successfully ingested -> remove from outbox
        await removeOutboxEvents(ids);
        // Reconcile state with authoritative server profile
        useGamificationStore.getState().reconcileWithServer(response);
      } else {
        await incrementRetryCount(ids);
      }
    } catch (rpcErr) {
      console.warn('[Outbox Sync] Ingestion error, will retry later:', rpcErr);
      await incrementRetryCount(ids);
    }

    return true;
  } catch (err) {
    console.error('[Outbox Sync] Unexpected failure during flush:', err);
    return false;
  } finally {
    isFlushing = false;
    useGamificationStore.getState().setSyncing(false);
    useGamificationStore.getState().updatePendingCount();
  }
}

/**
 * Initializes the background synchronizer with periodic flushes and lifecycle event hooks.
 */
export function startOutboxSyncService(intervalMs = 20000): () => void {
  if (typeof window === 'undefined') return () => {};

  // Initial flush
  flushOutboxBatch();

  // Periodic flush
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = setInterval(() => {
    flushOutboxBatch();
  }, intervalMs);

  // Hook 1: Network reconnect
  const handleOnline = () => {
    flushOutboxBatch();
  };
  window.addEventListener('online', handleOnline);

  // Hook 2: Tab visibility change (sync when student leaves the tab)
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      flushOutboxBatch();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Hook 3: Page hide / unload
  const handlePageHide = () => {
    flushOutboxBatch();
  };
  window.addEventListener('pagehide', handlePageHide);

  // Return unsubscribe/cleanup
  return () => {
    if (syncTimer) clearInterval(syncTimer);
    window.removeEventListener('online', handleOnline);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('pagehide', handlePageHide);
  };
}
