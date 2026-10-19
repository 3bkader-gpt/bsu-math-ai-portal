import { AppEvent, GamificationEffect } from '@/shared/events/types';

/**
 * Returns true if the event represents a verified, completed educational activity.
 * Raw heartbeats (media.progress, flashcard.flipped) must never trigger streaks or outbox spam.
 */
export function isCompletedActivity(event: AppEvent): boolean {
  return (
    event.type === 'media.completed' ||
    event.type === 'audio.streak_5min' ||
    event.type === 'video.streak_5min' ||
    event.type === 'quiz.finished' ||
    event.type === 'flashcard.deck_completed' ||
    event.type === 'study_guide.read' ||
    event.type === 'lecture.completed'
  );
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
