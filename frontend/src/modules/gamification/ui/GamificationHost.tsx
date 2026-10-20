'use client';

import { useEffect, useState } from 'react';
import { appEventBus, effectBus } from '@/shared/events/bus';
import { useGamificationStore } from '../store/useGamificationStore';
import { startOutboxSyncService, flushOutboxBatch } from '../sync/outbox';
import { getOrCreateAnonymousSession } from '../supabase/auth';
import { clearOutbox, getOutboxCount } from '../sync/idb';
import { fetchCohortLeaderboard } from '../supabase/gamification';
import { playSound } from '@/lib/audio/soundEngine';
import { triggerConfetti } from '@/lib/effects/confetti';
import type { AppEvent, GamificationEffect } from '@/shared/events/types';

interface ToastItem {
  id: string;
  type: 'xp' | 'badge' | 'level' | 'streak';
  title: string;
  subtitle?: string;
}

declare global {
  interface Window {
    __GAMIFICATION_HOST__?: {
      version: string;
      store: typeof useGamificationStore;
      flushOutbox: typeof flushOutboxBatch;
      clearOutbox: typeof clearOutbox;
      getOutboxCount: typeof getOutboxCount;
      runHostVerification: () => Promise<{
        passed: boolean;
        storeInitialized: boolean;
        initialXp: number;
        optimisticXp: number;
        level: number;
        pendingOutboxCount: number;
        leaderboardCount: number;
      }>;
    };
  }
}

export function GamificationHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cleanupSync: (() => void) | null = null;
    let unsubAppBus: (() => void) | null = null;
    let unsubEffects: (() => void) | null = null;

    // 1. Initialize anonymous session and store in idle/background
    const bootstrap = async () => {
      try {
        const session = await getOrCreateAnonymousSession();
        await useGamificationStore
          .getState()
          .initializeFromCacheOrSession(session.userId);

        // Start background outbox synchronization service
        cleanupSync = startOutboxSyncService(20000);
      } catch (err) {
        console.warn('[GamificationHost] Bootstrap warning:', err);
      }
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(bootstrap);
    } else {
      setTimeout(bootstrap, 100);
    }

    // 2. Connect App Event Bus -> Gamification Store Dispatcher
    const handleAppEvent = (event: AppEvent) => {
      useGamificationStore.getState().dispatchAppEvent(event);
    };

    // Listen to milestone and educational activity events (excluding raw telemetry heartbeats)
    const eventTypes = [
      'media.completed',
      'audio.streak_5min',
      'video.streak_5min',
      'quiz.finished',
      'quiz.perfect_score',
      'quiz.question_answered',
      'quiz.mistake_reviewed',
      'flashcard.flipped',
      'flashcard.deck_completed',
      'flashcard.speed_run',
      'study_guide.read',
      'lecture.completed',
    ] as const;

    const unsubs = eventTypes.map((t) =>
      appEventBus.on(t as any, handleAppEvent as any)
    );
    unsubAppBus = () => unsubs.forEach((u) => u());

    // 3. Listen to Effect Bus for visual micro-feedback
    const handleEffect = (effect: GamificationEffect) => {
      if (effect.type === 'xp.gained') {
        const payload = effect.payload as any;
        addToast({
          id: Math.random().toString(),
          type: 'xp',
          title: `+${payload.amount} XP`,
          subtitle: payload.reason,
        });
      } else if (effect.type === 'level.up') {
        const payload = effect.payload as any;
        addToast({
          id: Math.random().toString(),
          type: 'level',
          title: `🎉 ترقية جديدة: المستوى ${payload.newLevel}!`,
          subtitle: payload.levelTitle,
        });
      } else if (effect.type === 'badge.unlocked') {
        const payload = effect.payload as any;
        addToast({
          id: Math.random().toString(),
          type: 'badge',
          title: `🎖️ وسام جديد: ${payload.title}`,
          subtitle: payload.description,
        });
      } else if (effect.type === 'confetti.trigger') {
        const payload = effect.payload as any;
        triggerConfetti(payload.intensity || 'standard');
      } else if (effect.type === 'sound.play') {
        const payload = effect.payload as any;
        playSound(payload.sound);
      }
    };

    const effectTypes = [
      'xp.gained',
      'level.up',
      'badge.unlocked',
      'streak.updated',
      'confetti.trigger',
      'sound.play',
    ] as const;

    const effectUnsubs = effectTypes.map((t) =>
      effectBus.on(t as any, handleEffect as any)
    );
    unsubEffects = () => effectUnsubs.forEach((u) => u());

    // 4. Expose Runtime Diagnostic Probe for automated CI/CD Quality Gate
    window.__GAMIFICATION_HOST__ = {
      version: '3.0.0-phase3',
      store: useGamificationStore,
      flushOutbox: flushOutboxBatch,
      clearOutbox,
      getOutboxCount,
      runHostVerification: async () => {
        const store = useGamificationStore.getState();
        const initialXp = store.totalXp;

        // Dispatch a factual event
        const testEvent: AppEvent = {
          type: 'media.completed',
          payload: {
            lectureId: 28,
            kind: 'video',
            durationSec: 1500,
          },
          meta: {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            lectureId: 28,
          },
        };

        store.dispatchAppEvent(testEvent);

        const optimisticState = useGamificationStore.getState();
        const optimisticXp = optimisticState.totalXp;
        const pendingCount = await getOutboxCount();

        // Check leaderboard connectivity
        let lbCount = 0;
        try {
          const lb = await fetchCohortLeaderboard(5);
          lbCount = lb.length;
        } catch {}

        const passed =
          optimisticXp > initialXp &&
          pendingCount >= 1 &&
          optimisticState.level >= 1;

        return {
          passed,
          storeInitialized: true,
          initialXp,
          optimisticXp,
          level: optimisticState.level,
          pendingOutboxCount: pendingCount,
          leaderboardCount: lbCount,
        };
      },
    };

    return () => {
      if (cleanupSync) cleanupSync();
      if (unsubAppBus) unsubAppBus();
      if (unsubEffects) unsubEffects();
    };
  }, []);

  const addToast = (toast: ToastItem) => {
    setToasts((prev) => [...prev.slice(-3), toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 4000);
  };

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 inset-x-3 sm:bottom-6 sm:inset-x-auto sm:left-6 sm:max-w-sm z-[9999] pointer-events-none flex flex-col gap-2.5"
      dir="rtl"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto bg-[#131922]/95 dark:bg-[#0B0F14]/95 text-white border border-teal-500/40 rounded-2xl p-3.5 shadow-2xl flex items-center gap-3 backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0 text-lg">
            {t.type === 'xp' ? '⚡' : t.type === 'level' ? '🎉' : '🎖️'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-black text-sm tracking-wide text-teal-300">
              {t.title}
            </div>
            {t.subtitle && (
              <div className="text-xs text-slate-200 font-medium mt-0.5 line-clamp-2 leading-relaxed">
                {t.subtitle}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
