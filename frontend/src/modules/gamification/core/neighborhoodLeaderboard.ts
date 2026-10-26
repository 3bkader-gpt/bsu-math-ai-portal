/**
 * Phase 5.2 — 10-Peer Neighborhood Relative Leaderboard.
 *
 * ZERO React/DOM imports (Architecture Rule 1):
 *   - Prevents social comparison demotivation by centering the student
 *     among their 10 closest peers in XP.
 *   - Calculates distance (XP points) to the next rank above for actionable progress.
 *   - Deterministic and covered by Vitest.
 */

import { LeaderboardEntry } from '../supabase/types';

export interface NeighborhoodResult {
  /** The 10-peer (or fewer if cohort is smaller) slice centered around the student. */
  entries: LeaderboardEntry[];
  /** 1-based rank of the current student in the global cohort, if found. */
  currentRank: number | null;
  /** XP needed to overtake the immediate peer ranked right above. null if rank #1 or not found. */
  xpToNextRank: number | null;
  /** True if the student is already in the top 10 of the cohort. */
  isTopTier: boolean;
}

/**
 * Extracts a localized window of `windowSize` peers centered around the student.
 * If the student is not in the list or unauthenticated, returns the top `windowSize` entries.
 */
export function getNeighborhoodWindow(
  allEntries: LeaderboardEntry[],
  currentUserId: string | null,
  windowSize = 10
): NeighborhoodResult {
  if (!allEntries || allEntries.length === 0) {
    return {
      entries: [],
      currentRank: null,
      xpToNextRank: null,
      isTopTier: false,
    };
  }

  // Find student index in the sorted roster
  const studentIndex = currentUserId
    ? allEntries.findIndex((e) => e.user_id === currentUserId)
    : -1;

  if (studentIndex === -1) {
    // Student not on leaderboard (e.g. 0 XP or guest) -> show top cohort window
    const slice = allEntries.slice(0, windowSize);
    return {
      entries: slice,
      currentRank: null,
      xpToNextRank: null,
      isTopTier: false,
    };
  }

  const student = allEntries[studentIndex];
  const currentRank = student.rank || studentIndex + 1;
  const isTopTier = currentRank <= windowSize;

  // Calculate XP to overtake the peer right above
  let xpToNextRank: number | null = null;
  if (studentIndex > 0) {
    const peerAbove = allEntries[studentIndex - 1];
    xpToNextRank = Math.max(1, peerAbove.total_xp - student.total_xp + 1);
  }

  // If the total entries are less than or equal to windowSize, return all
  if (allEntries.length <= windowSize) {
    return {
      entries: allEntries,
      currentRank,
      xpToNextRank,
      isTopTier,
    };
  }

  // Calculate centered window bounds
  const halfWindow = Math.floor(windowSize / 2);
  let startIndex = studentIndex - halfWindow;
  let endIndex = startIndex + windowSize;

  if (startIndex < 0) {
    startIndex = 0;
    endIndex = windowSize;
  } else if (endIndex > allEntries.length) {
    endIndex = allEntries.length;
    startIndex = Math.max(0, endIndex - windowSize);
  }

  const windowSlice = allEntries.slice(startIndex, endIndex);

  return {
    entries: windowSlice,
    currentRank,
    xpToNextRank,
    isTopTier,
  };
}
