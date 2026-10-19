import { supabase } from './client';
import {
  IngestRpcPayload,
  IngestRpcResponse,
  LeaderboardEntry,
  UserAchievementRow,
  LectureProgressRow,
} from './types';

/**
 * Sends a batch of events to the atomic server RPC `ingest_events`.
 * Automatically deduplicates via client UUIDs and reconciles state in Africa/Cairo timezone.
 */
export async function ingestEventsRpc(
  events: IngestRpcPayload[]
): Promise<IngestRpcResponse> {
  if (!events || events.length === 0) {
    return {
      success: true,
      awardedXp: 0,
      profile: {
        id: '',
        nickname: '',
        persona: 'boys',
        totalXp: 0,
        level: 1,
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: null,
        freezesLeft: 1,
      },
      newBadges: [],
    };
  }

  const { data, error } = await supabase.rpc('ingest_events', {
    events,
  });

  if (error) {
    throw new Error(`Ingest RPC failed: ${error.message}`);
  }

  return data as IngestRpcResponse;
}

/**
 * Fetches the current cohort leaderboard.
 */
export async function fetchCohortLeaderboard(
  limit = 50
): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('get_cohort_leaderboard', {
    limit_count: limit,
  });

  if (error || !data) {
    return [];
  }

  return (data as any[]).map((r) => ({
    user_id: r.user_id,
    nickname: r.nickname,
    persona: r.persona,
    total_xp: Number(r.total_xp),
    level: Number(r.level),
    current_streak: Number(r.current_streak),
    rank: Number(r.rank),
  }));
}

/**
 * Fetches all achievements unlocked by the current authenticated user.
 */
export async function fetchUserAchievements(): Promise<UserAchievementRow[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_achievements')
    .select('*')
    .eq('user_id', user.id);

  if (error || !data) return [];
  return data as UserAchievementRow[];
}

/**
 * Fetches progress for a specific lecture for the current user.
 */
export async function fetchLectureProgress(
  lectureId: number
): Promise<LectureProgressRow | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('lecture_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('lecture_id', lectureId)
    .single();

  if (error || !data) return null;
  return data as LectureProgressRow;
}
