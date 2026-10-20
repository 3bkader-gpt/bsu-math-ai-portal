export interface ProfileRow {
  id: string;
  nickname: string;
  persona: 'boys' | 'girls';
  cohort_id: number;
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  freezes_left: number;
  created_at: string;
  updated_at: string;
}

export interface ActivityEventRow {
  id: string;
  user_id: string;
  event_type: string;
  lecture_id: number | null;
  payload: Record<string, any>;
  client_ts: string;
  server_ts: string;
}

export interface DailyActivityRow {
  user_id: string;
  day: string;
  xp_earned: number;
  seconds_active: number;
  items_completed: number;
  created_at: string;
  updated_at: string;
}

export interface UserAchievementRow {
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}

export interface LectureProgressRow {
  user_id: string;
  lecture_id: number;
  audio_completed: boolean;
  video_completed: boolean;
  flashcards_completed: boolean;
  study_guide_read: boolean;
  quiz_completed: boolean;
  quiz_score: number | null;
  quiz_total: number | null;
  media_progress: Record<string, any>;
  updated_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  nickname: string;
  persona: string;
  total_xp: number;
  level: number;
  current_streak: number;
  rank: number;
}

export interface IngestRpcPayload {
  id: string;
  type: string;
  lectureId?: number | null;
  payload?: Record<string, any>;
  clientTs?: string;
}

export interface IngestRpcResponse {
  success: boolean;
  awardedXp: number;
  profile: {
    id: string;
    nickname: string;
    persona: 'boys' | 'girls';
    totalXp: number;
    level: number;
    currentStreak: number;
    longestStreak: number;
    lastActiveDate: string | null;
    freezesLeft: number;
  };
  newBadges: string[];
}

export interface MistakeNotebookItem {
  id: string;
  user_id: string;
  lecture_id: number;
  question_hash: string;
  question_text: string;
  correct_answer: string;
  user_last_mistake: string;
  explanation?: string | null;
  box_level: number;
  next_review_date: string; // YYYY-MM-DD
  is_mastered: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubmitMistakeReviewResponse {
  success: boolean;
  boxLevel: number;
  nextReviewDate: string;
  isMastered: boolean;
  awardedXp: number;
}

