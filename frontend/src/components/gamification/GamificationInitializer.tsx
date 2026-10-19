'use client';

import { useEffect } from 'react';
import { appEventBus, effectBus, createAppEvent } from '@/shared/events/bus';
import {
  createInitialGamificationState,
  processGamificationEvent,
  calculateLevel,
} from '@/modules/gamification/core';
import { GAMIFICATION_CONFIG } from '@/config/gamification-rules';
import {
  getOrCreateAnonymousSession,
  ingestEventsRpc,
  fetchCohortLeaderboard,
} from '@/modules/gamification/supabase';

declare global {
  interface Window {
    __GAMIFICATION_CORE__?: {
      version: string;
      appEventBus: typeof appEventBus;
      effectBus: typeof effectBus;
      config: typeof GAMIFICATION_CONFIG;
      createInitialState: typeof createInitialGamificationState;
      processEvent: typeof processGamificationEvent;
      ingestEventsRpc: typeof ingestEventsRpc;
      fetchCohortLeaderboard: typeof fetchCohortLeaderboard;
      getOrCreateAnonymousSession: typeof getOrCreateAnonymousSession;
      runSelfCheck: () => {
        passed: boolean;
        initialXp: number;
        finalXp: number;
        level: number;
        unlockedBadges: string[];
        streak: number;
        effectsEmitted: number;
      };
      runServerCheck: () => Promise<{
        passed: boolean;
        leaderboardCount: number;
        topUser: string | null;
        error?: string;
      }>;
    };
  }
}

export function GamificationInitializer() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.__GAMIFICATION_CORE__ = {
      version: '2.0.0-phase2',
      appEventBus,
      effectBus,
      config: GAMIFICATION_CONFIG,
      createInitialState: createInitialGamificationState,
      processEvent: processGamificationEvent,
      ingestEventsRpc,
      fetchCohortLeaderboard,
      getOrCreateAnonymousSession,
      runSelfCheck: () => {
        let state = createInitialGamificationState('test-user');
        const emittedEffects: string[] = [];

        // 1. First event: media.completed
        const mediaEvent = createAppEvent(
          'media.completed',
          {
            lectureId: 28,
            kind: 'audio',
            durationSec: 1200,
          },
          28
        );
        const res1 = processGamificationEvent(state, mediaEvent);
        state = res1.state;
        res1.effects.forEach((eff) => emittedEffects.push(eff.type));

        // 2. Second event: quiz.finished with perfect score
        const quizEvent = createAppEvent(
          'quiz.finished',
          {
            lectureId: 28,
            score: 10,
            total: 10,
            attempt: 1,
            durationMs: 45000,
          },
          28
        );
        const res2 = processGamificationEvent(state, quizEvent);
        state = res2.state;
        res2.effects.forEach((eff) => emittedEffects.push(eff.type));

        const level = calculateLevel(state.totalXp);
        const passed =
          state.totalXp > 0 &&
          level >= 1 &&
          state.unlockedBadges.length > 0 &&
          state.currentStreak >= 1 &&
          emittedEffects.includes('xp.gained') &&
          emittedEffects.includes('badge.unlocked');

        return {
          passed,
          initialXp: 0,
          finalXp: state.totalXp,
          level,
          unlockedBadges: state.unlockedBadges,
          streak: state.currentStreak,
          effectsEmitted: emittedEffects.length,
        };
      },
      runServerCheck: async () => {
        try {
          const leaderboard = await fetchCohortLeaderboard(5);
          return {
            passed: true,
            leaderboardCount: leaderboard.length,
            topUser: leaderboard[0]?.nickname || null,
          };
        } catch (err: any) {
          return {
            passed: false,
            leaderboardCount: 0,
            topUser: null,
            error: err?.message || String(err),
          };
        }
      },
    };
  }, []);

  return null;
}
