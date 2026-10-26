import { describe, expect, it } from 'vitest';
import {
  calculateCohortProgress,
  canStudentContributeToday,
  DEFAULT_DAILY_CONTRIBUTION_CAP,
  getCohortMotivationalMessage,
} from '@/modules/gamification/core/cohortChallenge';

describe('Phase 6: Collaborative Cohort Challenge Core Engine', () => {
  describe('calculateCohortProgress', () => {
    it('calculates 0% progress at start', () => {
      const res = calculateCohortProgress(0, 500, 0, 15);
      expect(res.percent).toBe(0);
      expect(res.remaining).toBe(500);
      expect(res.isCompleted).toBe(false);
      expect(res.stage).toBe('start');
      expect(res.canContributeMoreToday).toBe(true);
      expect(res.remainingTodayQuota).toBe(15);
      expect(res.motivationalMessage).toContain('بداية أسبوع جديدة');
    });

    it('calculates quarter progress (25% - 49%)', () => {
      const res = calculateCohortProgress(150, 500, 5, 15);
      expect(res.percent).toBe(30);
      expect(res.remaining).toBe(350);
      expect(res.isCompleted).toBe(false);
      expect(res.stage).toBe('quarter');
      expect(res.remainingTodayQuota).toBe(10);
      expect(res.motivationalMessage).toContain('ربع المسافة');
    });

    it('calculates half progress (50% - 74%)', () => {
      const res = calculateCohortProgress(300, 500, 10, 15);
      expect(res.percent).toBe(60);
      expect(res.remaining).toBe(200);
      expect(res.stage).toBe('half');
      expect(res.motivationalMessage).toContain('عدينا النص');
    });

    it('calculates three-quarters progress (75% - 99%)', () => {
      const res = calculateCohortProgress(450, 500, 14, 15);
      expect(res.percent).toBe(90);
      expect(res.remaining).toBe(50);
      expect(res.stage).toBe('threeQuarters');
      expect(res.motivationalMessage).toContain('فاضل تكّة');
    });

    it('handles completion (100% or more)', () => {
      const res = calculateCohortProgress(520, 500, 8, 15);
      expect(res.percent).toBe(100);
      expect(res.remaining).toBe(0);
      expect(res.isCompleted).toBe(true);
      expect(res.stage).toBe('completed');
      expect(res.canContributeMoreToday).toBe(false);
      expect(res.motivationalMessage).toContain('مبروك يا دفعة');
    });

    it('handles student reaching daily cap (15/15)', () => {
      const res = calculateCohortProgress(200, 500, 15, 15);
      expect(res.canContributeMoreToday).toBe(false);
      expect(res.remainingTodayQuota).toBe(0);
    });

    it('protects against division by zero or negative counts', () => {
      const res = calculateCohortProgress(-10, 0, -2, -5);
      expect(res.percent).toBe(0);
      expect(res.isCompleted).toBe(false);
      expect(res.remaining).toBe(1);
    });
  });

  describe('canStudentContributeToday', () => {
    it('returns true when below daily cap', () => {
      expect(canStudentContributeToday(0, 15)).toBe(true);
      expect(canStudentContributeToday(14, 15)).toBe(true);
    });

    it('returns false when at or above daily cap', () => {
      expect(canStudentContributeToday(15, 15)).toBe(false);
      expect(canStudentContributeToday(18, 15)).toBe(false);
    });

    it('uses DEFAULT_DAILY_CONTRIBUTION_CAP of 15 by default', () => {
      expect(DEFAULT_DAILY_CONTRIBUTION_CAP).toBe(15);
      expect(canStudentContributeToday(14)).toBe(true);
      expect(canStudentContributeToday(15)).toBe(false);
    });
  });

  describe('getCohortMotivationalMessage', () => {
    it('returns distinct motivational stages', () => {
      expect(getCohortMotivationalMessage(10).stage).toBe('start');
      expect(getCohortMotivationalMessage(25).stage).toBe('quarter');
      expect(getCohortMotivationalMessage(55).stage).toBe('half');
      expect(getCohortMotivationalMessage(80).stage).toBe('threeQuarters');
      expect(getCohortMotivationalMessage(100).stage).toBe('completed');
    });
  });
});
