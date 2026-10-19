import { create } from 'zustand';
import {
  GamificationState,
  createInitialGamificationState,
  processGamificationEvent,
} from '../core';
import { effectBus } from '@/shared/events/bus';
import type { AppEvent } from '@/shared/events/types';
import { enqueueOutboxEvent, getOutboxCount } from '../sync/idb';
import { IngestRpcResponse } from '../supabase/types';

const STATE_CACHE_KEY = 'bsu_portal_gamification_state_v1';

export interface GamificationStoreState extends GamificationState {
  isInitialized: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: number | null;

  // Actions
  dispatchAppEvent: (event: AppEvent) => void;
  reconcileWithServer: (response: IngestRpcResponse) => void;
  setSyncing: (isSyncing: boolean) => void;
  initializeFromCacheOrSession: (userId?: string | null) => Promise<void>;
  updatePendingCount: () => Promise<void>;
}

function loadCachedState(userId: string | null = null): GamificationState {
  if (typeof window === 'undefined') {
    return createInitialGamificationState(userId);
  }
  try {
    const raw = localStorage.getItem(STATE_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...createInitialGamificationState(userId),
        ...parsed,
      };
    }
  } catch (err) {
    console.warn('[GamificationStore] Error parsing cached state:', err);
  }
  return createInitialGamificationState(userId);
}

function saveCachedState(state: GamificationState): void {
  if (typeof window === 'undefined') return;
  try {
    const toSave: Partial<GamificationState> = {
      userId: state.userId,
      totalXp: state.totalXp,
      level: state.level,
      currentStreak: state.currentStreak,
      longestStreak: state.longestStreak,
      lastActiveDate: state.lastActiveDate,
      freezesRemaining: state.freezesRemaining,
      unlockedBadges: state.unlockedBadges,
      dailyDate: state.dailyDate,
      dailyXpEarned: state.dailyXpEarned,
      audioCompletedCount: state.audioCompletedCount,
      videoCompletedCount: state.videoCompletedCount,
      decksCompletedCount: state.decksCompletedCount,
      lecturesCompletedCount: state.lecturesCompletedCount,
    };
    localStorage.setItem(STATE_CACHE_KEY, JSON.stringify(toSave));
  } catch (err) {
    console.warn('[GamificationStore] Error saving cached state:', err);
  }
}

export const useGamificationStore = create<GamificationStoreState>(
  (set, get) => ({
    ...createInitialGamificationState(null),
    isInitialized: false,
    isSyncing: false,
    pendingCount: 0,
    lastSyncedAt: null,

    dispatchAppEvent: (event: AppEvent) => {
      const currentState = get();

      // 1. Pure Reducer evaluation (0ms, 100% pure)
      const { state: nextState, effects } = processGamificationEvent(
        currentState,
        event
      );

      // 2. Optimistic local state update
      set({
        ...nextState,
        pendingCount: currentState.pendingCount + 1,
      });

      // 3. Persist to cache
      saveCachedState(nextState);

      // 4. Emit all effects imperatively onto effectBus for UI fanfares
      effects.forEach((eff) => {
        effectBus.emit(eff.type as any, eff as any);
      });

      // 5. Enqueue event into persistent IndexedDB outbox
      enqueueOutboxEvent({
        id: event.meta?.id || crypto.randomUUID(),
        type: event.type,
        lectureId: event.meta?.lectureId || null,
        payload: event.payload as Record<string, any>,
        clientTs: event.meta?.timestamp
          ? new Date(event.meta.timestamp).toISOString()
          : new Date().toISOString(),
        retryCount: 0,
        enqueuedAt: Date.now(),
      }).catch((err) => {
        console.error('[GamificationStore] Failed to enqueue to outbox:', err);
      });
    },

    reconcileWithServer: (response: IngestRpcResponse) => {
      if (!response || !response.success || !response.profile) return;

      const p = response.profile;
      const current = get();

      // Merge authoritative server values
      const reconciled: Partial<GamificationStoreState> = {
        totalXp: Math.max(current.totalXp, p.totalXp),
        level: Math.max(current.level, p.level),
        currentStreak: p.currentStreak,
        longestStreak: Math.max(current.longestStreak, p.longestStreak),
        lastActiveDate: p.lastActiveDate,
        freezesRemaining: p.freezesLeft,
        lastSyncedAt: Date.now(),
      };

      // Merge newly unlocked badges
      if (response.newBadges && response.newBadges.length > 0) {
        const badgeSet = new Set([
          ...current.unlockedBadges,
          ...response.newBadges,
        ]);
        reconciled.unlockedBadges = Array.from(badgeSet);
      }

      set(reconciled as any);
      saveCachedState(get());

      // Update remaining outbox count
      getOutboxCount().then((count) => {
        set({ pendingCount: count });
      });
    },

    setSyncing: (isSyncing: boolean) => {
      set({ isSyncing });
    },

    initializeFromCacheOrSession: async (userId: string | null = null) => {
      const cached = loadCachedState(userId);
      const count = await getOutboxCount();

      set({
        ...cached,
        isInitialized: true,
        pendingCount: count,
      });
    },

    updatePendingCount: async () => {
      const count = await getOutboxCount();
      set({ pendingCount: count });
    },
  })
);

// Atomic fine-grained selectors
export const useTotalXp = () => useGamificationStore((s) => s.totalXp);
export const useLevel = () => useGamificationStore((s) => s.level);
export const useStreak = () => useGamificationStore((s) => s.currentStreak);
export const useLongestStreak = () =>
  useGamificationStore((s) => s.longestStreak);
export const useBadges = () => useGamificationStore((s) => s.unlockedBadges);
export const usePendingCount = () =>
  useGamificationStore((s) => s.pendingCount);
export const useIsSyncing = () => useGamificationStore((s) => s.isSyncing);
