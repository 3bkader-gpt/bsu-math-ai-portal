import { AppEvent, GamificationEffect } from '@/shared/events/types';

/**
 * Returns true if the event represents a verified, completed educational activity.
 * Raw heartbeats (media.progress, flashcard.flipped) and rushed guesses (<3s) must never trigger streaks or outbox spam.
 */
export function isCompletedActivity(event: AppEvent): boolean {
  if (event.type === 'media.completed') return true;
  if (event.type === 'audio.streak_5min' || event.type === 'video.streak_5min') return true;
  if (event.type === 'quiz.finished') {
    return (event.payload.durationMs ?? 0) >= 3000 && event.payload.total >= 1;
  }
  if (event.type === 'flashcard.deck_completed') return true;
  if (event.type === 'study_guide.read') return (event.payload.dwellSec ?? 0) >= 60;
  if (event.type === 'lecture.completed') return true;
  if (event.type === 'quiz.question_answered') {
    return !!event.payload.isCorrect && (event.payload.durationMs ?? 0) >= 3000;
  }
  if (event.type === 'quiz.mistake_reviewed') {
    return event.payload.isCorrect !== false && (event.payload.durationMs ?? 0) >= 3000;
  }
  return false;
}

export interface GamificationState {
  userId: string | null;
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null; // Format: YYYY-MM-DD (Cairo timezone)
  freezesRemaining: number;
  unlockedBadges: string[]; // List of badge IDs
  dailyDate: string; // Current tracked Cairo date (YYYY-MM-DD)
  dailyXpEarned: number; // XP earned today (for daily cap check)
  lastFreezeRechargeWeek?: string | null; // Cairo calendar week of last freeze top-up
  
  // Counters for badge conditions
  audioCompletedCount: number;
  videoCompletedCount: number;
  decksCompletedCount: number;
  lecturesCompletedCount: number;
}

export interface ReducerResult {
  state: GamificationState;
  effects: GamificationEffect[];
}

export function createInitialGamificationState(userId: string | null = null): GamificationState {
  return {
    userId,
    totalXp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    freezesRemaining: 1, // Every student starts with 1 streak freeze protection
    unlockedBadges: [],
    dailyDate: '',
    dailyXpEarned: 0,
    audioCompletedCount: 0,
    videoCompletedCount: 0,
    decksCompletedCount: 0,
    lecturesCompletedCount: 0,
  };
}
