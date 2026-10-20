import { supabase } from './client';
import {
  IngestRpcPayload,
  IngestRpcResponse,
  LeaderboardEntry,
  UserAchievementRow,
  LectureProgressRow,
  MistakeNotebookItem,
  SubmitMistakeReviewResponse,
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

/**
 * Fetches all mistakes currently due for review for the authenticated student.
 */
export async function fetchDueMistakes(): Promise<MistakeNotebookItem[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Get current date in Cairo timezone (YYYY-MM-DD)
  const cairoToday = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const { data, error } = await supabase
    .from('mistake_notebook')
    .select('*')
    .eq('user_id', user.id)
    .lte('next_review_date', cairoToday)
    .eq('is_mastered', false)
    .order('box_level', { ascending: true })
    .order('next_review_date', { ascending: true });

  if (error || !data) {
    console.error('[MistakeNotebook] Failed to fetch due mistakes:', error);
    return [];
  }

  return data as MistakeNotebookItem[];
}

/**
 * Fetches summary statistics across all Leitner boxes (1 to 5) for the student.
 */
export async function fetchMistakeNotebookSummary(): Promise<{
  total: number;
  dueCount: number;
  boxCounts: Record<number, number>;
  masteredCount: number;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { total: 0, dueCount: 0, boxCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, masteredCount: 0 };
  }

  const cairoToday = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const { data, error } = await supabase
    .from('mistake_notebook')
    .select('box_level, next_review_date, is_mastered')
    .eq('user_id', user.id);

  if (error || !data) {
    return { total: 0, dueCount: 0, boxCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, masteredCount: 0 };
  }

  const boxCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let dueCount = 0;
  let masteredCount = 0;

  for (const item of data) {
    if (item.is_mastered) {
      masteredCount++;
    } else {
      boxCounts[item.box_level] = (boxCounts[item.box_level] || 0) + 1;
      if (item.next_review_date <= cairoToday) {
        dueCount++;
      }
    }
  }

  return {
    total: data.length,
    dueCount,
    boxCounts,
    masteredCount,
  };
}

/**
 * Submits a validated Leitner review for a specific question.
 * Transitions the box deterministically and routes XP atomically via server RPC.
 */
export async function submitMistakeReviewRpc(
  questionHash: string,
  isCorrect: boolean,
  durationMs: number
): Promise<SubmitMistakeReviewResponse> {
  const { data, error } = await supabase.rpc('submit_mistake_review', {
    p_question_hash: questionHash,
    p_is_correct: isCorrect,
    p_duration_ms: durationMs,
  });

  if (error) {
    throw new Error(`Review submission failed: ${error.message}`);
  }

  return data as SubmitMistakeReviewResponse;
}

