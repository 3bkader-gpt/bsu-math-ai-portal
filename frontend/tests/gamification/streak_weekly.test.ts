import { describe, expect, it } from 'vitest';
import {
  checkAndRechargeWeeklyFreezes,
  evaluateDailyStreak,
  getCairoWeekKey,
  getIntermediateDate,
  isFriday,
} from '@/modules/gamification/core/streak';
import { createInitialGamificationState } from '@/modules/gamification/core/types';

describe('Phase 5.3: Automatic Weekly Streak Freezes & Friday Exemption', () => {
  describe('Calendar helpers', () => {
    it('accurately identifies Fridays', () => {
      expect(isFriday('2026-10-23')).toBe(true); // Friday
      expect(isFriday('2026-10-24')).toBe(false); // Saturday
      expect(isFriday('2026-10-22')).toBe(false); // Thursday
    });

    it('calculates intermediate dates', () => {
      expect(getIntermediateDate('2026-10-22', 1)).toBe('2026-10-23');
      expect(getIntermediateDate('2026-10-31', 1)).toBe('2026-11-01');
    });

    it('determines the Sunday week key for Cairo dates', () => {
      // 2026-10-26 is Monday. Sunday of that week was 2026-10-25.
      expect(getCairoWeekKey('2026-10-26')).toBe('2026-10-25');
      // Sunday itself
      expect(getCairoWeekKey('2026-10-25')).toBe('2026-10-25');
    });
  });

  describe('checkAndRechargeWeeklyFreezes', () => {
    it('recharges freezes up to 2 when entering a new calendar week', () => {
      const state = {
        ...createInitialGamificationState('student-1'),
        freezesRemaining: 0,
        lastFreezeRechargeWeek: '2026-10-18', // Prior week
      };

      const res = checkAndRechargeWeeklyFreezes(state, '2026-10-26');
      expect(res.recharged).toBe(true);
      expect(res.freezesAdded).toBe(2);
      expect(res.nextState.freezesRemaining).toBe(2);
      expect(res.nextState.lastFreezeRechargeWeek).toBe('2026-10-25');
    });

    it('does not duplicate recharge in the same calendar week', () => {
      const state = {
        ...createInitialGamificationState('student-1'),
        freezesRemaining: 1,
        lastFreezeRechargeWeek: '2026-10-25', // Current week
      };

      const res = checkAndRechargeWeeklyFreezes(state, '2026-10-27');
      expect(res.recharged).toBe(false);
      expect(res.freezesAdded).toBe(0);
      expect(res.nextState.freezesRemaining).toBe(1);
    });
  });

  describe('Friday Academic Exemption in evaluateDailyStreak', () => {
    it('protects the streak when the missed day was Friday WITHOUT deducting a freeze', () => {
      // Student active on Thursday 2026-10-22, missed Friday 2026-10-23, returns Saturday 2026-10-24
      const state = {
        ...createInitialGamificationState('student-1'),
        currentStreak: 5,
        lastActiveDate: '2026-10-22', // Thursday
        freezesRemaining: 2,
      };

      const saturdayTimestamp = new Date('2026-10-24T12:00:00+03:00').getTime();
      const res = evaluateDailyStreak(state, saturdayTimestamp);

      expect(res.isNewDay).toBe(true);
      expect(res.streakFrozen).toBe(true);
      expect(res.streakExtended).toBe(true);
      expect(res.nextState.currentStreak).toBe(6);
      // Crucial: 0 freezes deducted due to Friday academic exemption!
      expect(res.nextState.freezesRemaining).toBe(2);
    });

    it('deducts a freeze when missing a regular non-Friday weekday', () => {
      // Student active on Monday 2026-10-19, missed Tuesday 2026-10-20, returns Wednesday 2026-10-21
      const state = {
        ...createInitialGamificationState('student-1'),
        currentStreak: 5,
        lastActiveDate: '2026-10-19', // Monday
        freezesRemaining: 2,
      };

      const wednesdayTimestamp = new Date('2026-10-21T12:00:00+03:00').getTime();
      const res = evaluateDailyStreak(state, wednesdayTimestamp);

      expect(res.isNewDay).toBe(true);
      expect(res.streakFrozen).toBe(true);
      expect(res.nextState.currentStreak).toBe(6);
      expect(res.nextState.freezesRemaining).toBe(1); // 1 freeze deducted
    });
  });
});
