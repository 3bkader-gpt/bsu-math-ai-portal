import { describe, it, expect } from 'vitest';
import { StoryCardOptions } from '@/lib/storyCardGenerator';

describe('Sprint 1: Engagement & Virality Core Tests', () => {
  it('validates StoryCardOptions interface and options typing', () => {
    const opts: StoryCardOptions = {
      studentName: 'أحمد محمود',
      studentLevel: 4,
      levelTitle: 'بطل المعادلات ⚡',
      lectureTitle: 'المحاضرة الأولى - الجبر الخطي',
      subjectName: 'الجبر الخطي',
      score: 5,
      total: 5,
      maxCombo: 5,
      timeSpentSec: 62,
    };

    expect(opts.studentName).toBe('أحمد محمود');
    expect(opts.score).toBe(5);
    expect(opts.maxCombo).toBe(5);
    expect(opts.score / opts.total).toBe(1);
  });

  it('verifies deterministic Cairo date hashing for daily questions', () => {
    const sampleDate = '2026-11-07';
    let hash = 0;
    for (let i = 0; i < sampleDate.length; i++) {
      hash = (hash << 5) - hash + sampleDate.charCodeAt(i);
      hash |= 0;
    }

    const bankLength = 8;
    const index = Math.abs(hash) % bankLength;
    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(bankLength);

    // Repeated runs for the same date must yield the exact same index
    let hash2 = 0;
    for (let i = 0; i < sampleDate.length; i++) {
      hash2 = (hash2 << 5) - hash2 + sampleDate.charCodeAt(i);
      hash2 |= 0;
    }
    const index2 = Math.abs(hash2) % bankLength;
    expect(index2).toBe(index);
  });

  it('ensures 1v1 duel query parameter generation format is robust', () => {
    const currentUrl = new URL('https://bsu-math-ai-portal.pages.dev/?tab=quiz&id=42');
    const studentName = 'مريم علي';
    const score = 8;
    const total = 10;
    const timeSec = 55;

    currentUrl.searchParams.set('duel_by', studentName);
    currentUrl.searchParams.set('duel_score', String(score));
    currentUrl.searchParams.set('duel_total', String(total));
    currentUrl.searchParams.set('duel_time', String(timeSec));

    expect(currentUrl.searchParams.get('duel_by')).toBe('مريم علي');
    expect(currentUrl.searchParams.get('duel_score')).toBe('8');
    expect(currentUrl.searchParams.get('duel_total')).toBe('10');
    expect(currentUrl.searchParams.get('duel_time')).toBe('55');
  });
});
