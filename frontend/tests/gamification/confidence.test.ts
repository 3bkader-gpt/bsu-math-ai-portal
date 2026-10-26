import { describe, expect, it } from 'vitest';
import {
  calculateConfidenceXpBonus,
  CONFIDENCE_OPTIONS,
  getConfidenceFeedback,
} from '@/modules/gamification/core/confidence';

describe('Phase 5.1: Pre-Answer Confidence Assessment (Meta-Cognition)', () => {
  it('exposes all three calibrated confidence tiers with appropriate labels and bonus', () => {
    expect(CONFIDENCE_OPTIONS.high.bonusXp).toBe(3);
    expect(CONFIDENCE_OPTIONS.high.label).toBe('متأكد');
    expect(CONFIDENCE_OPTIONS.medium.bonusXp).toBe(0);
    expect(CONFIDENCE_OPTIONS.low.bonusXp).toBe(0);
  });

  describe('calculateConfidenceXpBonus', () => {
    it('awards +3 XP for high confidence on correct answers', () => {
      expect(calculateConfidenceXpBonus('high', true)).toBe(3);
    });

    it('awards 0 bonus for medium and low confidence on correct answers', () => {
      expect(calculateConfidenceXpBonus('medium', true)).toBe(0);
      expect(calculateConfidenceXpBonus('low', true)).toBe(0);
    });

    it('awards 0 bonus on incorrect answers regardless of confidence level', () => {
      expect(calculateConfidenceXpBonus('high', false)).toBe(0);
      expect(calculateConfidenceXpBonus('medium', false)).toBe(0);
      expect(calculateConfidenceXpBonus('low', false)).toBe(0);
    });
  });

  describe('getConfidenceFeedback (Meta-cognitive calibration)', () => {
    it('flags severe misconception when student was high confidence but incorrect', () => {
      const boysFeedback = getConfidenceFeedback('high', false, 'boys');
      expect(boysFeedback.isMisconception).toBe(true);
      expect(boysFeedback.headline).toContain('التباس خادع يا هندسة');
      expect(boysFeedback.message).toContain('دفتر الأخطاء');

      const girlsFeedback = getConfidenceFeedback('high', false, 'girls');
      expect(girlsFeedback.isMisconception).toBe(true);
      expect(girlsFeedback.headline).toContain('التباس خادع يا باشمهندسة');
      expect(girlsFeedback.message).toContain('دفتر الأخطاء');
    });

    it('encourages consolidation when student guessed (low confidence) but answered correctly', () => {
      const boysFeedback = getConfidenceFeedback('low', true, 'boys');
      expect(boysFeedback.isMisconception).toBe(false);
      expect(boysFeedback.headline).toContain('حدسك الرياضي صاب');
      expect(boysFeedback.message).toContain('خطوات الحل في الدليل');

      const girlsFeedback = getConfidenceFeedback('low', true, 'girls');
      expect(girlsFeedback.isMisconception).toBe(false);
      expect(girlsFeedback.headline).toContain('حدسك الرياضي صاب');
      expect(girlsFeedback.message).toContain('خطوات الحل في الدليل');
    });

    it('celebrates high confidence + correct answer with mastery praise', () => {
      const feedback = getConfidenceFeedback('high', true, 'boys');
      expect(feedback.isMisconception).toBe(false);
      expect(feedback.headline).toContain('ثقة في محلها');
      expect(feedback.message).toContain('+3 XP');
    });

    it('returns empty message for normal medium confidence', () => {
      const feedback = getConfidenceFeedback('medium', true, 'boys');
      expect(feedback.isMisconception).toBe(false);
      expect(feedback.message).toBe('');
    });
  });
});
