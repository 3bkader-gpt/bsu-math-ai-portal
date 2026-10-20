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
  isCompletedActivity,
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

    it('REGRESSION GUARD: media.progress on playback start must NOT grant XP, streak, or first_step badge', () => {
      const state = createInitialGamificationState('student-fresh');
      const progressEvent = createAppEvent('media.progress', {
        kind: 'audio',
        lectureId: 1,
        currentSec: 0,
        totalSec: 1200,
      });

      const result = processGamificationEvent(state, progressEvent);

      // Must be 100% clean - 0 XP, 0 streak, 0 badges, 0 sound/confetti
      expect(result.state.totalXp).toBe(0);
      expect(result.state.currentStreak).toBe(0);
      expect(result.state.lastActiveDate).toBeNull();
      expect(result.state.unlockedBadges).toHaveLength(0);
      expect(result.effects).toHaveLength(0);
    });

    it('media.completed awards completion XP, extends daily streak, and unlocks "أول الغيث"', () => {
      const state = createInitialGamificationState('student-fresh');
      const completedEvent = createAppEvent('media.completed', {
        kind: 'audio',
        lectureId: 1,
        durationSec: 1200,
      });

      const result = processGamificationEvent(state, completedEvent);

      // Audio (25) + Daily Streak Bonus (10) = 35 XP
      expect(result.state.totalXp).toBe(35);
      expect(result.state.currentStreak).toBe(1);
      expect(result.state.unlockedBadges).toContain('first_step');

      const effectTypes = result.effects.map((e) => e.type);
      expect(effectTypes).toContain('xp.gained');
      expect(effectTypes).toContain('badge.unlocked');
      expect(effectTypes).toContain('sound.play');
    });

    it('session.* events (started, first_action, ended) produce 0 XP and do not alter streak or badges', () => {
      const state = createInitialGamificationState('student-session');
      const startEvt = createAppEvent('session.started', {
        sessionId: 'sess-123',
        deviceType: 'mobile',
      });
      const firstActionEvt = createAppEvent('session.first_action', {
        sessionId: 'sess-123',
        actionType: 'audio_play',
        timeToFirstActionMs: 1200,
      });
      const endEvt = createAppEvent('session.ended', {
        sessionId: 'sess-123',
        durationSec: 300,
        conceptsLearned: 2,
        cardsReviewed: 3,
        quizAccuracy: 100,
      });

      // Assert they are not considered completed educational milestones
      expect(isCompletedActivity(startEvt)).toBe(false);
      expect(isCompletedActivity(firstActionEvt)).toBe(false);
      expect(isCompletedActivity(endEvt)).toBe(false);

      // Process through gamification reducer
      let res = processGamificationEvent(state, startEvt);
      expect(res.state.totalXp).toBe(0);
      expect(res.state.currentStreak).toBe(0);
      expect(res.effects).toHaveLength(0);

      res = processGamificationEvent(res.state, firstActionEvt);
      expect(res.state.totalXp).toBe(0);
      expect(res.state.currentStreak).toBe(0);
      expect(res.effects).toHaveLength(0);

      res = processGamificationEvent(res.state, endEvt);
      expect(res.state.totalXp).toBe(0);
      expect(res.state.currentStreak).toBe(0);
      expect(res.effects).toHaveLength(0);
    });

    it('handles Phase 2 quiz.question_answered with anti-speed guard and confidence bonus', () => {
      // User who already performed their daily activity today
      const today = getCairoDate();
      const state = {
        ...createInitialGamificationState('student-phase2'),
        lastActiveDate: today,
        currentStreak: 2,
      };

      // 1. Fast answer (< 3000ms): no XP
      const fastEvt = createAppEvent('quiz.question_answered', {
        lectureId: 10,
        questionIndex: 0,
        questionHash: 'q_test_1',
        questionText: 'ما هو التكامل المحدد؟',
        selectedOption: 0,
        correctOption: 0,
        userAnswer: 'مساحة تحت المنحنى',
        correctAnswer: 'مساحة تحت المنحنى',
        isCorrect: true,
        durationMs: 1500,
        confidence: 'high',
        hintLevelUsed: 0,
      });
      expect(isCompletedActivity(fastEvt)).toBe(false);
      const resFast = processGamificationEvent(state, fastEvt);
      expect(resFast.state.totalXp).toBe(0);

      // 2. Deliberate correct answer (>= 3000ms) with high confidence: 5 base + 3 bonus = 8 XP
      const deliberateEvt = createAppEvent('quiz.question_answered', {
        lectureId: 10,
        questionIndex: 1,
        questionHash: 'q_test_2',
        questionText: 'ما هي المشتقة الأولى؟',
        selectedOption: 1,
        correctOption: 1,
        userAnswer: 'ميل المماس',
        correctAnswer: 'ميل المماس',
        isCorrect: true,
        durationMs: 4500,
        confidence: 'high',
        hintLevelUsed: 0,
      });
      expect(isCompletedActivity(deliberateEvt)).toBe(true);
      const resDeliberate = processGamificationEvent(state, deliberateEvt);
      expect(resDeliberate.state.totalXp).toBe(8);

      // 3. Wrong answer: 0 XP
      const wrongEvt = createAppEvent('quiz.question_answered', {
        lectureId: 10,
        questionIndex: 2,
        questionHash: 'q_test_3',
        questionText: 'ما هو المتجه العمودي؟',
        selectedOption: 2,
        correctOption: 0,
        userAnswer: 'المتجه الموازي',
        correctAnswer: 'المتجه المتعامد',
        isCorrect: false,
        durationMs: 5000,
        confidence: 'low',
        hintLevelUsed: 0,
      });
      expect(isCompletedActivity(wrongEvt)).toBe(false);
      const resWrong = processGamificationEvent(resDeliberate.state, wrongEvt);
      expect(resWrong.state.totalXp).toBe(8);
    });

    it('handles Phase 2 quiz.mistake_reviewed (Leitner review)', () => {
      const today = getCairoDate();
      const state = {
        ...createInitialGamificationState('student-phase2-review'),
        lastActiveDate: today,
        currentStreak: 2,
      };

      // Deliberate correct review: 15 XP
      const reviewEvt = createAppEvent('quiz.mistake_reviewed', {
        questionHash: 'q_mistake_1',
        boxLevel: 2,
        boxBefore: 1,
        boxAfter: 2,
        isCorrect: true,
        durationMs: 4000,
      });
      expect(isCompletedActivity(reviewEvt)).toBe(true);
      const res = processGamificationEvent(state, reviewEvt);
      expect(res.state.totalXp).toBe(15);
      expect(res.state.dailyXpEarned).toBe(15);

      // Fast review (< 3000ms): 0 XP
      const fastReviewEvt = createAppEvent('quiz.mistake_reviewed', {
        questionHash: 'q_mistake_2',
        boxLevel: 2,
        boxBefore: 1,
        boxAfter: 2,
        isCorrect: true,
        durationMs: 1200,
      });
      expect(isCompletedActivity(fastReviewEvt)).toBe(false);
      const resFast = processGamificationEvent(res.state, fastReviewEvt);
      expect(resFast.state.totalXp).toBe(15);
    });
  });
});

