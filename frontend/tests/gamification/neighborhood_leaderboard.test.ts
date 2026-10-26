import { describe, expect, it } from 'vitest';
import { getNeighborhoodWindow } from '@/modules/gamification/core/neighborhoodLeaderboard';
import { LeaderboardEntry } from '@/modules/gamification/supabase/types';

function createMockEntry(id: string, xp: number, rank: number): LeaderboardEntry {
  return {
    user_id: id,
    nickname: `طالب_${rank}`,
    persona: 'boys',
    total_xp: xp,
    level: Math.floor(xp / 100) + 1,
    current_streak: 3,
    rank,
  };
}

describe('Phase 5.2: 10-Peer Neighborhood Leaderboard Window', () => {
  // Generate 30 mock students with descending XP
  const mockStudents: LeaderboardEntry[] = Array.from({ length: 30 }, (_, i) =>
    createMockEntry(`user_${i + 1}`, 3000 - i * 50, i + 1)
  );

  it('handles empty leaderboard gracefully', () => {
    const res = getNeighborhoodWindow([], 'user_1');
    expect(res.entries).toEqual([]);
    expect(res.currentRank).toBeNull();
    expect(res.xpToNextRank).toBeNull();
  });

  it('returns top 10 if student is not found or unauthenticated', () => {
    const res = getNeighborhoodWindow(mockStudents, 'unknown_id', 10);
    expect(res.entries.length).toBe(10);
    expect(res.entries[0].user_id).toBe('user_1');
    expect(res.currentRank).toBeNull();
    expect(res.isTopTier).toBe(false);
  });

  it('anchors to ranks 1-10 when student is in the top tier (e.g. rank 3)', () => {
    const res = getNeighborhoodWindow(mockStudents, 'user_3', 10);
    expect(res.entries.length).toBe(10);
    expect(res.entries[0].user_id).toBe('user_1');
    expect(res.entries[9].user_id).toBe('user_10');
    expect(res.currentRank).toBe(3);
    expect(res.isTopTier).toBe(true);
    // Student #3 (2900 XP) vs Student #2 (2950 XP) -> needs 51 XP to overtake
    expect(res.xpToNextRank).toBe(51);
  });

  it('correctly reports null xpToNextRank for rank #1 student', () => {
    const res = getNeighborhoodWindow(mockStudents, 'user_1', 10);
    expect(res.currentRank).toBe(1);
    expect(res.xpToNextRank).toBeNull();
  });

  it('centers the 10-peer window when student is in the middle (e.g. rank 15)', () => {
    const res = getNeighborhoodWindow(mockStudents, 'user_15', 10);
    expect(res.entries.length).toBe(10);
    // Rank 15 is index 14. Half window = 5. Start index = 14 - 5 = 9 (Rank 10) to index 19 (Rank 19).
    expect(res.entries[0].user_id).toBe('user_10');
    expect(res.entries[res.entries.length - 1].user_id).toBe('user_19');
    expect(res.entries.some((e) => e.user_id === 'user_15')).toBe(true);
    expect(res.currentRank).toBe(15);
    expect(res.isTopTier).toBe(false);
  });

  it('clamps to bottom 10 when student is near the end (e.g. rank 29)', () => {
    const res = getNeighborhoodWindow(mockStudents, 'user_29', 10);
    expect(res.entries.length).toBe(10);
    expect(res.entries[res.entries.length - 1].user_id).toBe('user_30');
    expect(res.entries[0].user_id).toBe('user_21');
    expect(res.currentRank).toBe(29);
  });

  it('returns all entries when total students are fewer than windowSize', () => {
    const smallCohort = mockStudents.slice(0, 5);
    const res = getNeighborhoodWindow(smallCohort, 'user_3', 10);
    expect(res.entries.length).toBe(5);
    expect(res.currentRank).toBe(3);
  });
});
