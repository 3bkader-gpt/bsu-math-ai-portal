/**
 * Phase 6 — Sybil-Proof Collaborative Cohort Challenge (Pure Core).
 *
 * ZERO React/DOM imports (Architecture Rule 1):
 *   - Calculates aggregate progress percentages & stage indicators.
 *   - Enforces daily per-student contribution limits (default 15/day).
 *   - Produces milestone-aware Egyptian tutoring commentary.
 *   - Fully deterministic and covered by Vitest.
 */

export const DEFAULT_DAILY_CONTRIBUTION_CAP = 15;

export type ChallengeStage = 'start' | 'quarter' | 'half' | 'threeQuarters' | 'completed';

export interface CohortChallengeData {
  id: string;
  title: string;
  description: string;
  targetCount: number;
  currentCount: number;
  userTotal: number;
  userToday: number;
  dailyCap?: number;
  isCompleted?: boolean;
  daysRemaining?: number;
}

export interface CohortProgressResult {
  percent: number;
  remaining: number;
  isCompleted: boolean;
  stage: ChallengeStage;
  motivationalMessage: string;
  canContributeMoreToday: boolean;
  remainingTodayQuota: number;
}

/**
 * Maps completion ratio to milestone stage and empathetic Egyptian Arabic copy.
 */
export function getCohortMotivationalMessage(percent: number): {
  stage: ChallengeStage;
  message: string;
} {
  if (percent >= 100) {
    return {
      stage: 'completed',
      message: 'مبروك يا دفعة! تم إنجاز التحدي الجماعي بنجاح مذهل 🏆🎉',
    };
  }
  if (percent >= 75) {
    return {
      stage: 'threeQuarters',
      message: 'فاضل تكّة بسيطة! الدفعة كلها على بعد خطوات من خط النهاية ⚡🏁',
    };
  }
  if (percent >= 50) {
    return {
      stage: 'half',
      message: 'عدينا النص يا هندسة! استمرار ممتاز والهدف بيقرب 🔥💪',
    };
  }
  if (percent >= 25) {
    return {
      stage: 'quarter',
      message: 'ربع المسافة انحسمت! كملوا بنفس الحماس يا شباب 🚀✨',
    };
  }
  return {
    stage: 'start',
    message: 'بداية أسبوع جديدة وتحدي جديد للدفعة! كل سؤال بتفتحه بيفرق 🎯🌿',
  };
}

/**
 * Calculates all progress metrics for the cohort challenge. Pure function.
 */
export function calculateCohortProgress(
  currentCount: number,
  targetCount: number,
  userToday = 0,
  dailyCap = DEFAULT_DAILY_CONTRIBUTION_CAP
): CohortProgressResult {
  const safeTarget = Math.max(1, targetCount);
  const safeCurrent = Math.max(0, currentCount);
  const percent = Math.min(100, Math.round((safeCurrent / safeTarget) * 100));
  const remaining = Math.max(0, safeTarget - safeCurrent);
  const isCompleted = percent >= 100;
  const { stage, message } = getCohortMotivationalMessage(percent);

  const safeCap = Math.max(1, dailyCap);
  const safeUserToday = Math.max(0, userToday);
  const canContributeMoreToday = safeUserToday < safeCap && !isCompleted;
  const remainingTodayQuota = Math.max(0, safeCap - safeUserToday);

  return {
    percent,
    remaining,
    isCompleted,
    stage,
    motivationalMessage: message,
    canContributeMoreToday,
    remainingTodayQuota,
  };
}

/**
 * Checks if a student can add another contribution today without exceeding the daily cap.
 */
export function canStudentContributeToday(
  userTodayCount: number,
  dailyCap = DEFAULT_DAILY_CONTRIBUTION_CAP
): boolean {
  return userTodayCount < dailyCap;
}
