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
 * Adds N calendar days to a YYYY-MM-DD date string.
 */
export function getIntermediateDate(dateStr: string, daysToAdd = 1): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + daysToAdd, 12, 0, 0));
  const ny = dt.getUTCFullYear();
  const nm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const nd = String(dt.getUTCDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

/**
 * Checks whether a given YYYY-MM-DD date is a Friday (day index 5).
 */
export function isFriday(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return dt.getUTCDay() === 5;
}

/**
 * Returns the Sunday-anchored week identifier YYYY-MM-DD for Cairo calendar weeks.
 */
export function getCairoWeekKey(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const day = dt.getUTCDay(); // 0 is Sunday
  dt.setUTCDate(dt.getUTCDate() - day);
  const sy = dt.getUTCFullYear();
  const sm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const sd = String(dt.getUTCDate()).padStart(2, '0');
  return `${sy}-${sm}-${sd}`;
}

export const WEEKLY_FREEZE_ALLOWANCE = 2;

/**
 * Recharges weekly streak freezes up to WEEKLY_FREEZE_ALLOWANCE (2)
 * if entering a new Cairo calendar week.
 */
export function checkAndRechargeWeeklyFreezes(
  state: GamificationState,
  todayCairo: string
): { nextState: GamificationState; recharged: boolean; freezesAdded: number } {
  const currentWeek = getCairoWeekKey(todayCairo);
  if (state.lastFreezeRechargeWeek !== currentWeek) {
    const nextFreezes = Math.max(state.freezesRemaining, WEEKLY_FREEZE_ALLOWANCE);
    const added = nextFreezes - state.freezesRemaining;
    return {
      nextState: {
        ...state,
        freezesRemaining: nextFreezes,
        lastFreezeRechargeWeek: currentWeek,
      },
      recharged: true,
      freezesAdded: added,
    };
  }
  return {
    nextState: state,
    recharged: false,
    freezesAdded: 0,
  };
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

  // 4. Missed exactly one day (diff === 2): Check Friday academic exemption or streak freeze
  if (diff === 2) {
    const missedDate = getIntermediateDate(lastActive, 1);
    const fridayExempt = isFriday(missedDate);

    if (fridayExempt || state.freezesRemaining > 0) {
      const nextStreak = state.currentStreak + 1;
      const nextState: GamificationState = {
        ...state,
        currentStreak: nextStreak,
        longestStreak: Math.max(state.longestStreak, nextStreak),
        lastActiveDate: today,
        // Friday academic exemption protects without consuming a freeze
        freezesRemaining: fridayExempt ? state.freezesRemaining : state.freezesRemaining - 1,
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
