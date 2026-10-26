import { supabase } from './client';
import { CohortChallengeData } from '../core/cohortChallenge';

const FALLBACK_CHALLENGE: CohortChallengeData = {
  id: 'mock-weekly-challenge',
  title: 'تحدي الأسبوع: ٥٠٠ سؤال للدفعة 🎓',
  description: 'كل سؤال كويز صحيح تحله يساهم مباشرة في تحقيق هدف الدفعة الأسبوعي!',
  targetCount: 500,
  currentCount: 342,
  userTotal: 14,
  userToday: 4,
  dailyCap: 15,
  isCompleted: false,
  daysRemaining: 4,
};

/**
 * Fetches the active weekly cohort challenge and current student's contributions.
 * Returns a fallback demonstration state if offline or RPC unavailable.
 */
export async function fetchActiveCohortChallenge(
  userId?: string | null
): Promise<CohortChallengeData> {
  try {
    const { data, error } = await supabase.rpc('get_active_cohort_challenge', {
      p_user_id: userId || null,
    });

    if (error || !data || data.length === 0) {
      return FALLBACK_CHALLENGE;
    }

    const row = data[0];
    return {
      id: row.challenge_id,
      title: row.title,
      description: row.description,
      targetCount: row.target_count,
      currentCount: Number(row.current_count),
      userTotal: Number(row.user_contributions_total),
      userToday: Number(row.user_contributions_today),
      dailyCap: row.daily_cap,
      isCompleted: row.is_completed,
      daysRemaining: row.days_remaining,
    };
  } catch {
    return FALLBACK_CHALLENGE;
  }
}

/**
 * Records an individual student contribution to the active cohort challenge.
 */
export async function recordCohortContribution(
  challengeId: string,
  questionHash: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('record_cohort_contribution', {
      p_challenge_id: challengeId,
      p_question_hash: questionHash,
    });

    if (error) {
      return false;
    }
    return !!data;
  } catch {
    return false;
  }
}
