import { GamificationEffect } from '@/shared/events/types';
import { createEffect } from '@/shared/events/bus';
import { GamificationState } from './types';

/**
 * Returns YYYY-MM-DD representation of a timestamp in Africa/Cairo timezone.
 * Handles Egypt standard/daylight time automatically.
 */
export function getCairoDate(timestamp = Date.now()): string {
  const d = new Date(timestamp);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
}

/**
 * Calculates calendar day difference between two YYYY-MM-DD strings.
 */
export function getDaysDifference(earlierDate: string, laterDate: string): number {
  const d1 = new Date(earlierDate + 'T00:00:00Z');
  const d2 = new Date(laterDate + 'T00:00:00Z');
  const diffMs = d2.getTime() - d1.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Pure function: Evaluates and updates student's streak based on Cairo calendar days.
 */
export function evaluateDailyStreak(
  state: GamificationState,
  eventTimestamp: number
): {
  nextState: GamificationState;
  isNewDay: boolean;
  streakExtended: boolean;
  streakFrozen: boolean;
  effects: GamificationEffect[];
} {
  const today = getCairoDate(eventTimestamp);
  const lastActive = state.lastActiveDate;
  const effects: GamificationEffect[] = [];

  // 1. Same Cairo day: already counted today
  if (lastActive === today) {
    return {
      nextState: state,
      isNewDay: false,
      streakExtended: false,
      streakFrozen: false,
      effects: [],
    };
  }

  // 2. First ever activity
  if (!lastActive) {
    const nextState: GamificationState = {
      ...state,
      currentStreak: 1,
      longestStreak: Math.max(state.longestStreak, 1),
      lastActiveDate: today,
    };
    effects.push(
      createEffect('streak.updated', {
        currentStreak: 1,
        isNewDay: true,
      })
    );
    effects.push(createEffect('sound.play', { sound: 'streak_fire' }));
    return {
      nextState,
      isNewDay: true,
      streakExtended: true,
      streakFrozen: false,
      effects,
    };
  }

  const diff = getDaysDifference(lastActive, today);

  // 3. Consecutive day (yesterday -> today)
  if (diff === 1) {
    const nextStreak = state.currentStreak + 1;
    const nextState: GamificationState = {
      ...state,
      currentStreak: nextStreak,
      longestStreak: Math.max(state.longestStreak, nextStreak),
      lastActiveDate: today,
    };
    effects.push(
      createEffect('streak.updated', {
        currentStreak: nextStreak,
        isNewDay: true,
      })
    );
    effects.push(createEffect('sound.play', { sound: 'streak_fire' }));
    return {
      nextState,
      isNewDay: true,
      streakExtended: true,
      streakFrozen: false,
      effects,
    };
  }

  // 4. Missed exactly one day (diff === 2): Try streak freeze
  if (diff === 2 && state.freezesRemaining > 0) {
    const nextStreak = state.currentStreak + 1;
    const nextState: GamificationState = {
      ...state,
      currentStreak: nextStreak,
      longestStreak: Math.max(state.longestStreak, nextStreak),
      lastActiveDate: today,
      freezesRemaining: state.freezesRemaining - 1,
    };
    effects.push(
      createEffect('streak.updated', {
        currentStreak: nextStreak,
        isNewDay: true,
      })
    );
    effects.push(createEffect('sound.play', { sound: 'streak_fire' }));
    return {
      nextState,
      isNewDay: true,
      streakExtended: true,
      streakFrozen: true,
      effects,
    };
  }

  // 5. Streak broken (diff > 1 without freeze): Reset to 1
  const nextState: GamificationState = {
    ...state,
    currentStreak: 1,
    longestStreak: Math.max(state.longestStreak, 1),
    lastActiveDate: today,
  };
  effects.push(
    createEffect('streak.updated', {
      currentStreak: 1,
      isNewDay: true,
    })
  );
  return {
    nextState,
    isNewDay: true,
    streakExtended: false,
    streakFrozen: false,
    effects,
  };
}
