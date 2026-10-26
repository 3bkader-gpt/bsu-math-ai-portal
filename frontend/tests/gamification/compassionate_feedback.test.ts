import { describe, expect, it } from 'vitest';

import {
  ETHICAL_EXIT,
  PRAISE_BANK,
  PRAISE_NO_REPEAT_WINDOW,
  diagnoseWrongAnswer,
  pickPraise,
  trackPraise,
} from '@/modules/gamification/core/compassionateFeedback';

describe('dynamic praise bank', () => {
  it('has 30+ distinct messages per persona', () => {
    expect(PRAISE_BANK.boys.length).toBeGreaterThanOrEqual(30);
    expect(PRAISE_BANK.girls.length).toBeGreaterThanOrEqual(30);
    expect(new Set(PRAISE_BANK.boys).size).toBe(PRAISE_BANK.boys.length);
    expect(new Set(PRAISE_BANK.girls).size).toBe(PRAISE_BANK.girls.length);
  });

  it('never picks a message used within the recent window', () => {
    const bank = PRAISE_BANK.boys;
    const recent = bank.slice(0, 10);
    for (let i = 0; i < 50; i++) {
      const picked = pickPraise('boys', recent);
      expect(recent).not.toContain(picked);
    }
  });

  it('falls back to the full bank when the whole window is exhausted', () => {
    const entire = PRAISE_BANK.girls;
    const picked = pickPraise('girls', entire);
    expect(PRAISE_BANK.girls).toContain(picked);
  });

  it('trackPraise caps history at the no-repeat window', () => {
    let history: string[] = [];
    for (let i = 0; i < 25; i++) {
      history = trackPraise(history, `msg-${i}`);
      expect(history.length).toBeLessThanOrEqual(PRAISE_NO_REPEAT_WINDOW);
    }
    expect(history[history.length - 1]).toBe('msg-24');
  });
});

describe('diagnostic error taxonomy', () => {
  it('detects a pure sign error', () => {
    const { kind, message } = diagnoseWrongAnswer('-5', '5', 'boys');
    expect(kind).toBe('sign');
    expect(message).toContain('الإشارة');
  });

  it('detects a sign flip inside a numeric expression', () => {
    const { kind } = diagnoseWrongAnswer('$W = -50$ جول', '$W = 50$ جول', 'girls');
    expect(kind).toBe('sign');
  });

  it('detects a near-miss magnitude (rounding / last step)', () => {
    const { kind, message } = diagnoseWrongAnswer('3.14', '3.142', 'boys');
    expect(kind).toBe('magnitude');
    expect(message).toContain('خطوة');
  });

  it('detects missing or extra units', () => {
    const { kind } = diagnoseWrongAnswer('50', '50 م/ث', 'boys');
    expect(kind).toBe('units');
    expect(diagnoseWrongAnswer('50 م/ث', '50', 'girls').kind).toBe('units');
  });

  it('detects reversed word order', () => {
    const { kind } = diagnoseWrongAnswer('قوة محافظة مجال', 'مجال قوة محافظة', 'boys');
    expect(kind).toBe('reversed');
  });

  it('falls back to conceptual conflation with a route to the guide', () => {
    const { kind, message } = diagnoseWrongAnswer('الطاقة الحركية', 'الطاقة الكامنة', 'girls');
    expect(kind).toBe('conceptual');
    expect(message).toContain('الدليل');
  });

  it('never blames or shames the student', () => {
    const wrongSamples = [
      ['-3', '3'],
      ['10', '10 كجم'],
      ['صفر', 'واحد'],
    ];
    for (const [u, c] of wrongSamples) {
      for (const persona of ['boys', 'girls'] as const) {
        const { message } = diagnoseWrongAnswer(u, c, persona);
        expect(message).not.toMatch(/غلط|فشلت|سيئة|يؤسف/);
      }
    }
  });
});

describe('ethical exit copy', () => {
  it('differs per persona but stays warm for both', () => {
    expect(ETHICAL_EXIT.button('boys')).toContain('استريح');
    expect(ETHICAL_EXIT.button('girls')).toContain('استريحي');
    expect(ETHICAL_EXIT.headline('boys')).toContain('🌿');
  });
});
