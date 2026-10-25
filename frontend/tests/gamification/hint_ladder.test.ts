import { describe, expect, it } from 'vitest';

import {
  BURNOUT,
  SESSION_FLOW,
  fadedStepsCount,
  nextHintAction,
  shouldShowBurnoutRelief,
  splitFadedSteps,
  splitHintTiers,
  type HintTier,
} from '@/modules/gamification/core/hintLadder';

describe('hint ladder tiers', () => {
  it('splits a multi-sentence hint into first-sentence (tier1) and full (tier2)', () => {
    const hint = 'التكامل الخطي لمجال محافظ لا يعتمد على المسار. بل على نقطتي البداية والنهاية فقط.';
    const { tier1, tier2 } = splitHintTiers(hint);
    expect(tier1).toBe('التكامل الخطي لمجال محافظ لا يعتمد على المسار.');
    expect(tier2).toBe(hint);
  });

  it('keeps short hints generic at tier 1 and full at tier 2', () => {
    const { tier1, tier2 } = splitHintTiers('استخدم خاصية التوزيع');
    expect(tier1).toContain('فكّر');
    expect(tier2).toBe('استخدم خاصية التوزيع');
  });

  it('handles missing hints gracefully', () => {
    expect(splitHintTiers('')).toEqual({ tier1: '', tier2: '' });
    expect(splitHintTiers(undefined as unknown as string)).toEqual({ tier1: '', tier2: '' });
  });

  it('stops offering next actions after the top tier', () => {
    expect(nextHintAction(0)).toBeTruthy();
    expect(nextHintAction(1)).toBeTruthy();
    expect(nextHintAction(2)).toBeTruthy();
    expect(nextHintAction(3)).toBeNull();
  });

  it('exposes the frozen flow and burnout constants from the plan', () => {
    expect(SESSION_FLOW.durationMs).toBe(25 * 60 * 1000);
    expect(BURNOUT.consecutiveWrongThreshold).toBe(3);
    expect(BURNOUT.dwellMsThreshold).toBe(120_000);
  });
});

describe('burnout relief gate', () => {
  it('does not fire for healthy signals', () => {
    expect(shouldShowBurnoutRelief({ consecutiveWrong: 2, dwellMs: 60_000 })).toBe(false);
    expect(shouldShowBurnoutRelief({ consecutiveWrong: 0, dwellMs: 10_000 })).toBe(false);
  });

  it('fires on three consecutive wrong answers', () => {
    expect(shouldShowBurnoutRelief({ consecutiveWrong: 3, dwellMs: 5_000 })).toBe(true);
    expect(shouldShowBurnoutRelief({ consecutiveWrong: 7, dwellMs: 0 })).toBe(true);
  });

  it('fires on a two-minute stall even without wrong answers', () => {
    expect(shouldShowBurnoutRelief({ consecutiveWrong: 0, dwellMs: 120_000 })).toBe(true);
  });
});

describe('worked-example fading', () => {
  const steps = ['نكتب المعادلة', 'نعزل المجهول', 'نعوّض بالقيم', 'نبسّط الناتج'];

  it('question 1 is fully solved', () => {
    expect(fadedStepsCount(1)).toBe(0);
    expect(splitFadedSteps(steps, 1)).toEqual({ visible: steps, hidden: [] });
  });

  it('question 2 hides the last step', () => {
    const { visible, hidden } = splitFadedSteps(steps, 2);
    expect(visible).toEqual(steps.slice(0, 3));
    expect(hidden).toEqual([steps[3]]);
  });

  it('question 3+ hides the last two steps', () => {
    const { visible, hidden } = splitFadedSteps(steps, 3);
    expect(visible).toEqual(steps.slice(0, 2));
    expect(hidden).toEqual(steps.slice(2));
    expect(splitFadedSteps(steps, 9).hidden).toHaveLength(2);
  });

  it('never hides every step', () => {
    const short = ['خطوة واحدة'];
    expect(splitFadedSteps(short, 5)).toEqual({ visible: short, hidden: [] });
  });

  it('tier typing stays within 0..3', () => {
    const tiers: HintTier[] = [0, 1, 2, 3];
    expect(tiers).toHaveLength(4);
  });
});
