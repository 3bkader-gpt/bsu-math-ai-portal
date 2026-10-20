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
        // Server returned success: false -> count as retry attempt
        await incrementRetryCount(ids);
      }
    } catch (rpcErr: any) {
      console.warn('[Outbox Sync] Ingestion error, will retry later:', rpcErr);
      // Only count retry if it was an explicit server-side error (e.g. 4xx/5xx/syntax),
      // NEVER count network dropouts, offline state, or fetch failures!
      const isNetworkFailure =
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        rpcErr?.message?.includes('Failed to fetch') ||
        rpcErr?.message?.includes('NetworkError') ||
        rpcErr?.message?.includes('network') ||
        rpcErr?.message?.includes('timeout') ||
        rpcErr?.name === 'TypeError';

      if (!isNetworkFailure) {
        await incrementRetryCount(ids);
      }
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
 * Synchronously reads any pending outbox items and dispatches them with keepalive: true / sendBeacon
 * ensuring delivery even when the tab is immediately closed or killed by the user.
 */
export async function flushOutboxKeepalive(): Promise<boolean> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.onLine) {
    return false;
  }
  try {
    // 1. Cap to at most 20 events per keepalive dispatch to guarantee payload stays well below browser's 64KB limit
    const pending = await getOutboxEvents(20);
    if (!pending || pending.length === 0) return false;

    const payload: IngestRpcPayload[] = pending.map((item) => ({
      id: item.id,
      type: item.type,
      lectureId: item.lectureId,
      payload: item.payload,
      clientTs: item.clientTs,
    }));

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cjmlnpdtfclzcvehebsv.supabase.co';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_iukVp-1coXRxhHD3T_pqoQ_k2g1PnN5';

    let authToken = anonKey;
    try {
      const rawAuth = localStorage.getItem('bsu_portal_supabase_auth');
      if (rawAuth) {
        const parsed = JSON.parse(rawAuth);
        if (parsed?.access_token) {
          authToken = parsed.access_token;
        }
      }
    } catch {}

    const endpoint = `${supabaseUrl}/rest/v1/rpc/ingest_events`;
    const bodyStr = JSON.stringify({ events: payload });

    // Ensure payload is under the 60KB safety threshold
    if (bodyStr.length > 60000) {
      console.warn('[Outbox Keepalive] payload too large for keepalive:', bodyStr.length);
      return false;
    }

    // 2. Dispatch via fetch keepalive (or fallback to sendBeacon)
    if (typeof fetch === 'function') {
      fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${authToken}`,
        },
        body: bodyStr,
        keepalive: true,
      }).catch(() => {});
    } else if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([bodyStr], { type: 'application/json' });
      navigator.sendBeacon(`${endpoint}?apikey=${anonKey}`, blob);
    }

    // NOTE: We deliberately do NOT remove items from IndexedDB here.
    // Because keepalive is unconfirmed fire-and-forget, keeping items in IndexedDB guarantees
    // zero data loss if network drops. Upon next session, flushOutboxBatch will confirm delivery with 200 OK
    // and remove them safely, while the server's event UUID idempotency prevents duplicate XP.
    return true;
  } catch (e) {
    console.warn('[Outbox Keepalive] error:', e);
    return false;
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
      flushOutboxKeepalive();
      flushOutboxBatch();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Hook 3: Page hide / unload
  const handlePageHide = () => {
    flushOutboxKeepalive();
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
