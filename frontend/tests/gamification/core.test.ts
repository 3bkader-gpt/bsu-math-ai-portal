import { describe, it, expect, beforeEach } from 'vitest';
import { BufferedEventBus, createAppEvent } from '@/shared/events/bus';
import {
  createInitialGamificationState,
  processGamificationEvent,
  calculateLevel,
  getXpRequiredForLevel,
  getLevelTitle,
  getCairoDate,
  evaluateDailyStreak,
  applyXpGain,
} from '@/modules/gamification/core';

describe('Gamification Engine - Phase 1 Verification', () => {
  describe('Buffered Event Bus', () => {
    let bus: BufferedEventBus<any>;

    beforeEach(() => {
      bus = new BufferedEventBus(50);
    });

    it('should deliver events to active subscribers', () => {
      const received: any[] = [];
      const unsub = bus.on('test.event', (data) => received.push(data));

      bus.emit('test.event', { message: 'hello' });
      expect(received).toEqual([{ message: 'hello' }]);

      unsub();
      bus.emit('test.event', { message: 'world' });
      expect(received).toHaveLength(1);
    });

    it('should buffer events emitted before subscription and replay immediately upon registration', () => {
      // Emit before any listener exists
      bus.emit('early.event', { val: 1 });
      bus.emit('early.event', { val: 2 });
      expect(bus.bufferedCount).toBe(2);

      const received: any[] = [];
      // Listener connects later (lazy load simulation)
      bus.on('early.event', (data) => received.push(data));

      expect(received).toEqual([{ val: 1 }, { val: 2 }]);
      expect(bus.bufferedCount).toBe(0);
    });
  });

  describe('Pure XP & Level Formulas', () => {
    it('calculates levels correctly according to formula floor(sqrt(xp/60)) + 1', () => {
      expect(calculateLevel(0)).toBe(1);
      expect(calculateLevel(59)).toBe(1);
      expect(calculateLevel(60)).toBe(2);
      expect(calculateLevel(239)).toBe(2);
      expect(calculateLevel(240)).toBe(3); // sqrt(240/60) = 2 -> 2+1 = 3
      expect(calculateLevel(540)).toBe(4); // sqrt(540/60) = 3 -> 3+1 = 4
    });

    it('returns valid collegiate level titles', () => {
      expect(getLevelTitle(1)).toContain('طالب طازة');
      expect(getLevelTitle(3)).toContain('شغّال بروقان');
      expect(getLevelTitle(5)).toContain('دحيح صاعد');
      expect(getLevelTitle(7)).toContain('وحش الرياضيات');
      expect(getLevelTitle(10)).toContain('بروفيسور السكشن');
      expect(getLevelTitle(20)).toContain('أسطورة الكلية');
    });

    it('enforces the 400 XP daily cap', () => {
      const state = createInitialGamificationState('test-user');
      const today = getCairoDate();

      // First gain 350 XP
      const res1 = applyXpGain(state, 350, 'Big win', today);
      expect(res1.nextState.totalXp).toBe(350);
      expect(res1.nextState.dailyXpEarned).toBe(350);

      // Try gaining 100 XP more (should only accept 50 XP to hit 400 cap)
      const res2 = applyXpGain(res1.nextState, 100, 'Another win', today);
      expect(res2.nextState.totalXp).toBe(400);
      expect(res2.nextState.dailyXpEarned).toBe(400);

      // Third gain when already capped: should earn 0 XP
      const res3 = applyXpGain(res2.nextState, 50, 'Excess', today);
      expect(res3.nextState.totalXp).toBe(400);
      expect(res3.effects).toHaveLength(0);
    });
  });

  describe('Cairo Daily Streak Evaluation', () => {
    it('initializes streak to 1 on first ever activity', () => {
      const state = createInitialGamificationState('student-1');
      const now = new Date('2026-10-19T14:00:00Z').getTime();
      const res = evaluateDailyStreak(state, now);

      expect(res.isNewDay).toBe(true);
      expect(res.streakExtended).toBe(true);
      expect(res.nextState.currentStreak).toBe(1);
      expect(res.nextState.lastActiveDate).toBe('2026-10-19');
    });

    it('does not increment streak twice on the same Cairo day', () => {
      const state = {
        ...createInitialGamificationState('student-1'),
        currentStreak: 3,
        lastActiveDate: '2026-10-19',
      };
      const laterSameDay = new Date('2026-10-19T22:30:00+03:00').getTime();
      const res = evaluateDailyStreak(state, laterSameDay);

      expect(res.isNewDay).toBe(false);
      expect(res.streakExtended).toBe(false);
      expect(res.nextState.currentStreak).toBe(3);
    });

    it('increments streak on consecutive day', () => {
      const state = {
        ...createInitialGamificationState('student-1'),
        currentStreak: 4,
        longestStreak: 4,
        lastActiveDate: '2026-10-18',
      };
      const nextDay = new Date('2026-10-19T10:00:00+03:00').getTime();
      const res = evaluateDailyStreak(state, nextDay);

      expect(res.isNewDay).toBe(true);
      expect(res.streakExtended).toBe(true);
      expect(res.nextState.currentStreak).toBe(5);
      expect(res.nextState.longestStreak).toBe(5);
    });

    it('uses streak freeze when missing exactly 1 day with freezes remaining', () => {
      const state = {
        ...createInitialGamificationState('student-1'),
        currentStreak: 6,
        lastActiveDate: '2026-10-17', // Missed 18th
        freezesRemaining: 1,
      };
      const dayAfterMiss = new Date('2026-10-19T11:00:00+03:00').getTime();
      const res = evaluateDailyStreak(state, dayAfterMiss);

      expect(res.isNewDay).toBe(true);
      expect(res.streakFrozen).toBe(true);
      expect(res.nextState.currentStreak).toBe(7);
      expect(res.nextState.freezesRemaining).toBe(0);
    });
  });

  describe('Full Reducer & Achievements Integration', () => {
    it('awards full score + perfect quiz bonuses, badges, and triggers sound/confetti', () => {
      const state = createInitialGamificationState('student-100');
      const event = createAppEvent('quiz.finished', {
        lectureId: 28,
        score: 10,
        total: 10,
        attempt: 1,
        durationMs: 45000,
      });

      const result = processGamificationEvent(state, event);

      // Base (10) + ScoreBonus (40) + PerfectBonus (25) + StreakDailyBonus (10) = 85 XP
      expect(result.state.totalXp).toBe(85);
      expect(result.state.unlockedBadges).toContain('perfect_quiz');
      expect(result.state.unlockedBadges).toContain('first_step');

      // Check effects
      const effectTypes = result.effects.map((e) => e.type);
      expect(effectTypes).toContain('xp.gained');
      expect(effectTypes).toContain('badge.unlocked');
      expect(effectTypes).toContain('confetti.trigger');
      expect(effectTypes).toContain('sound.play');
    });

    it('unlocks "دحيح الدفعة" on lecture.completed', () => {
      const state = createInitialGamificationState('student-100');
      const event = createAppEvent('lecture.completed', {
        lectureId: 30,
      });

      const result = processGamificationEvent(state, event);
      expect(result.state.unlockedBadges).toContain('five_of_five');
      expect(result.state.lecturesCompletedCount).toBe(1);
    });
  });
});
