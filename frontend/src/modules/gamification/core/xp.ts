import { GAMIFICATION_CONFIG } from '@/config/gamification-rules';
import { GamificationEffect } from '@/shared/events/types';
import { createEffect } from '@/shared/events/bus';
import { GamificationState } from './types';

/**
 * Calculates current level from total XP: level = floor(sqrt(xp / 60)) + 1
 */
export function calculateLevel(totalXp: number): number {
  if (totalXp <= 0) return 1;
  return Math.floor(Math.sqrt(totalXp / GAMIFICATION_CONFIG.levelCurve.baseDivisor)) + 1;
}

/**
 * Calculates the exact XP required to unlock a given level: xp = (level - 1)^2 * 60
 */
export function getXpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.pow(level - 1, 2) * GAMIFICATION_CONFIG.levelCurve.baseDivisor;
}

/**
 * Returns collegiate title for the student's level.
 */
export function getLevelTitle(level: number): string {
  const match = GAMIFICATION_CONFIG.levelCurve.titles.find(
    (t) => level >= t.minLevel && level <= t.maxLevel
  );
  return match ? match.title : 'أسطورة الكلية 👑';
}

/**
 * Pure function: Applies XP gain to state with daily cap guard,
 * checks for level-up transitions, and produces effects.
 */
export function applyXpGain(
  state: GamificationState,
  amount: number,
  reason: string,
  currentCairoDate: string
): { nextState: GamificationState; effects: GamificationEffect[] } {
  const effects: GamificationEffect[] = [];

  // 1. Reset daily cap if day changed
  let currentDailyDate = state.dailyDate;
  let currentDailyXp = state.dailyXpEarned;

  if (currentDailyDate !== currentCairoDate) {
    currentDailyDate = currentCairoDate;
    currentDailyXp = 0;
  }

  // 2. Enforce Daily Cap
  const availableDailyXp = Math.max(0, GAMIFICATION_CONFIG.dailyXpCap - currentDailyXp);
  const effectiveAmount = Math.min(amount, availableDailyXp);

  if (effectiveAmount <= 0) {
    return {
      nextState: {
        ...state,
        dailyDate: currentDailyDate,
        dailyXpEarned: currentDailyXp,
      },
      effects: [],
    };
  }

  const nextTotalXp = state.totalXp + effectiveAmount;
  const nextDailyXp = currentDailyXp + effectiveAmount;
  const oldLevel = state.level;
  const nextLevel = calculateLevel(nextTotalXp);

  // Emit XP Gained Effect
  effects.push(
    createEffect('xp.gained', {
      amount: effectiveAmount,
      reason,
      totalXp: nextTotalXp,
    })
  );

  // Check Level-Up Transition
  if (nextLevel > oldLevel) {
    const levelTitle = getLevelTitle(nextLevel);
    effects.push(
      createEffect('level.up', {
        newLevel: nextLevel,
        oldLevel,
        levelTitle,
      })
    );
    // Sound & Confetti on level up
    effects.push(createEffect('sound.play', { sound: 'level_up' }));
    effects.push(createEffect('confetti.trigger', { intensity: 'epic' }));
  } else {
    // Normal XP chime
    effects.push(createEffect('sound.play', { sound: 'xp_chime' }));
  }

  const nextState: GamificationState = {
    ...state,
    totalXp: nextTotalXp,
    level: nextLevel,
    dailyDate: currentDailyDate,
    dailyXpEarned: nextDailyXp,
  };

  return { nextState, effects };
}
