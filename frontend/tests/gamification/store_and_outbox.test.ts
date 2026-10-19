import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGamificationStore } from '@/modules/gamification/store/useGamificationStore';
import { createAppEvent } from '@/shared/events/bus';
import { effectBus } from '@/shared/events/bus';
import type { IngestRpcResponse } from '@/modules/gamification/supabase/types';

// Mock IndexedDB outbox helpers in tests
vi.mock('@/modules/gamification/sync/idb', () => {
  let mockQueue: any[] = [];
  return {
    enqueueOutboxEvent: vi.fn(async (rec) => {
      mockQueue.push(rec);
    }),
    getOutboxEvents: vi.fn(async (limit = 20) => mockQueue.slice(0, limit)),
    removeOutboxEvents: vi.fn(async (ids: string[]) => {
      const set = new Set(ids);
      mockQueue = mockQueue.filter((item) => !set.has(item.id));
    }),
    incrementRetryCount: vi.fn(async (ids: string[]) => {
      const set = new Set(ids);
      mockQueue = mockQueue.map((item) =>
        set.has(item.id) ? { ...item, retryCount: item.retryCount + 1 } : item
      );
    }),
    getOutboxCount: vi.fn(async () => mockQueue.length),
    clearOutbox: vi.fn(async () => {
      mockQueue = [];
    }),
  };
});

describe('Phase 3: Zustand Store & Optimistic Dispatcher', () => {
  beforeEach(() => {
    // Reset store state
    useGamificationStore.setState({
      userId: 'test-user',
      totalXp: 0,
      level: 1,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      freezesRemaining: 1,
      unlockedBadges: [],
      dailyDate: '',
      dailyXpEarned: 0,
      audioCompletedCount: 0,
      videoCompletedCount: 0,
      decksCompletedCount: 0,
      lecturesCompletedCount: 0,
      isInitialized: true,
      isSyncing: false,
      pendingCount: 0,
      lastSyncedAt: null,
    });
  });

  it('1. should optimistically update totalXp and level on media.completed event', () => {
    const store = useGamificationStore.getState();
    expect(store.totalXp).toBe(0);
    expect(store.level).toBe(1);

    const event = createAppEvent('media.completed', {
      lectureId: 28,
      kind: 'video',
      durationSec: 1800,
    }, 28);

    store.dispatchAppEvent(event);

    const updated = useGamificationStore.getState();
    expect(updated.totalXp).toBeGreaterThan(0);
    expect(updated.videoCompletedCount).toBe(1);
    expect(updated.pendingCount).toBe(1);
  });

  it('2. should emit effects onto effectBus when events are dispatched', () => {
    const emittedEffects: string[] = [];
    const unsub = effectBus.on('xp.gained', (eff: any) => {
      emittedEffects.push(eff.type);
    });

    const store = useGamificationStore.getState();
    const event = createAppEvent('quiz.finished', {
      lectureId: 28,
      score: 10,
      total: 10,
      attempt: 1,
      durationMs: 30000,
    }, 28);

    store.dispatchAppEvent(event);
    unsub();

    expect(emittedEffects).toContain('xp.gained');
    expect(useGamificationStore.getState().unlockedBadges).toContain('perfect_quiz');
  });

  it('3. should reconcile with authoritative server response', () => {
    const store = useGamificationStore.getState();
    expect(store.totalXp).toBe(0);

    const serverResponse: IngestRpcResponse = {
      success: true,
      awardedXp: 75,
      profile: {
        id: 'test-user',
        nickname: 'دحيح المنصة',
        persona: 'boys',
        totalXp: 240,
        level: 3,
        currentStreak: 4,
        longestStreak: 4,
        lastActiveDate: '2026-10-19',
        freezesLeft: 1,
      },
      newBadges: ['first_step', 'streak_3'],
    };

    store.reconcileWithServer(serverResponse);

    const updated = useGamificationStore.getState();
    expect(updated.totalXp).toBe(240);
    expect(updated.level).toBe(3);
    expect(updated.currentStreak).toBe(4);
    expect(updated.unlockedBadges).toContain('first_step');
    expect(updated.unlockedBadges).toContain('streak_3');
    expect(updated.lastSyncedAt).not.toBeNull();
  });
});
