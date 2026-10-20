/**
 * Smart Resume State Engine (Zero-Redundancy Architecture)
 * 
 * Manages playback & study position persistence:
 * - LocalStorage for instant 0ms retrieval on Homepage / Hero.
 * - Throttled (20-30s) remote sync to public.lecture_progress.media_progress & public.profiles.
 * - Immediate flush on pause, tab change, visibility hidden, or window unload.
 */

import { getSupabase } from '@/modules/gamification/supabase/client';

export interface ResumeState {
  lectureId: number;
  lectureNum?: number;
  subjectName?: string;
  lectureTitle?: string;
  lastTab: 'guide' | 'audio' | 'video' | 'quiz' | 'flashcards';
  audioSec?: number;
  videoSec?: number;
  cardIndex?: number;
  updatedAt: number; // Unix timestamp in ms
}

const LOCAL_STORAGE_KEY = 'bsu_smart_resume_state';
const REMOTE_THROTTLE_MS = 25000; // 25 seconds throttle window

let activePendingState: ResumeState | null = null;
let lastRemoteSyncTime = 0;
let throttleTimer: NodeJS.Timeout | null = null;

/**
 * Reads local resume state from localStorage (synchronous, 0ms latency).
 */
export function getLocalResumeState(): ResumeState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.lectureId === 'number') {
      return parsed as ResumeState;
    }
  } catch (err) {
    console.warn('[ResumeManager] Failed to read local resume state:', err);
  }
  return null;
}

/**
 * Saves resume state locally immediately and schedules throttled remote sync.
 */
export function saveResumeState(state: ResumeState, immediateRemote = false): void {
  if (typeof window === 'undefined') return;

  activePendingState = {
    ...state,
    updatedAt: Date.now(),
  };

  // 1. Instant local persistence
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(activePendingState));
  } catch (err) {
    console.warn('[ResumeManager] Failed to write local resume state:', err);
  }

  // 2. Dispatch event so UI components (e.g. SmartResumeCard) update reactively
  window.dispatchEvent(new CustomEvent('bsu_resume_updated', { detail: activePendingState }));

  // 3. Remote Sync (Immediate or Throttled)
  if (immediateRemote) {
    flushResumeState();
  } else {
    scheduleThrottledSync();
  }
}

/**
 * Throttles remote writes to DB so we don't spam Supabase during continuous playback.
 */
function scheduleThrottledSync(): void {
  const now = Date.now();
  const timeSinceLastSync = now - lastRemoteSyncTime;

  if (timeSinceLastSync >= REMOTE_THROTTLE_MS) {
    // Throttle window expired -> flush right now
    flushResumeState();
  } else if (!throttleTimer) {
    // Schedule flush for remainder of throttle window
    const delay = REMOTE_THROTTLE_MS - timeSinceLastSync;
    throttleTimer = setTimeout(() => {
      throttleTimer = null;
      flushResumeState();
    }, delay);
  }
}

/**
 * Flushes pending resume state to Supabase RPC immediately.
 * Called automatically on pause, tab change, visibilitychange (hidden), and pagehide.
 */
export async function flushResumeState(): Promise<void> {
  if (throttleTimer) {
    clearTimeout(throttleTimer);
    throttleTimer = null;
  }

  if (!activePendingState) return;

  const stateToSync = { ...activePendingState };
  lastRemoteSyncTime = Date.now();

  try {
    const supabase = getSupabase();
    if (!supabase?.auth) return;
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if (!session?.user) {
      // Guest user: local persistence is sufficient
      return;
    }

    const mediaProgressPayload = {
      audioSec: stateToSync.audioSec ?? 0,
      videoSec: stateToSync.videoSec ?? 0,
      cardIndex: stateToSync.cardIndex ?? 0,
      lastTab: stateToSync.lastTab,
      updatedAt: stateToSync.updatedAt,
    };

    await supabase.rpc('update_resume_state', {
      p_lecture_id: stateToSync.lectureId,
      p_tab: stateToSync.lastTab,
      p_media_progress: mediaProgressPayload,
    });
  } catch (err) {
    console.warn('[ResumeManager] Failed to sync resume state to remote DB:', err);
  }
}

/**
 * Records playback position without spamming DB.
 * Safe to call from media timeupdate listener.
 */
export function recordPlaybackProgress(
  lectureId: number,
  kind: 'audio' | 'video',
  currentSec: number,
  metadata?: {
    lectureNum?: number;
    subjectName?: string;
    lectureTitle?: string;
  }
): void {
  const current = getLocalResumeState() || {
    lectureId,
    lastTab: kind,
    updatedAt: Date.now(),
  };

  const updated: ResumeState = {
    ...current,
    lectureId,
    lastTab: kind,
    ...(kind === 'audio' ? { audioSec: Math.floor(currentSec) } : { videoSec: Math.floor(currentSec) }),
    ...(metadata?.lectureNum ? { lectureNum: metadata.lectureNum } : {}),
    ...(metadata?.subjectName ? { subjectName: metadata.subjectName } : {}),
    ...(metadata?.lectureTitle ? { lectureTitle: metadata.lectureTitle } : {}),
    updatedAt: Date.now(),
  };

  // Regular playback timeupdates must be throttled (immediateRemote = false)
  saveResumeState(updated, false);
}

/**
 * Records a critical user transition that should be saved immediately to the server.
 * E.g., student paused audio/video, switched lecture tabs, or flipped to a new flashcard.
 */
export function recordImmediateTransition(
  lectureId: number,
  tab: ResumeState['lastTab'],
  details?: Partial<ResumeState>
): void {
  const current = getLocalResumeState() || {
    lectureId,
    lastTab: tab,
    updatedAt: Date.now(),
  };

  const updated: ResumeState = {
    ...current,
    ...details,
    lectureId,
    lastTab: tab,
    updatedAt: Date.now(),
  };

  saveResumeState(updated, true);
}

/**
 * Loads remote resume state from Supabase for authenticated students.
 */
export async function fetchRemoteResumeState(): Promise<ResumeState | null> {
  try {
    const supabase = getSupabase();
    if (!supabase?.auth) return null;
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if (!session?.user) return null;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('last_active_lecture_id, last_active_tab')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error || !profile?.last_active_lecture_id) return null;

    const lectureId = profile.last_active_lecture_id;
    const lastTab = (profile.last_active_tab as ResumeState['lastTab']) || 'guide';

    // Retrieve media progress details from lecture_progress
    const { data: progress } = await supabase
      .from('lecture_progress')
      .select('media_progress')
      .eq('user_id', session.user.id)
      .eq('lecture_id', lectureId)
      .maybeSingle();

    const media = progress?.media_progress || {};

    const remoteState: ResumeState = {
      lectureId,
      lastTab,
      audioSec: media.audioSec,
      videoSec: media.videoSec,
      cardIndex: media.cardIndex,
      updatedAt: media.updatedAt || Date.now(),
    };

    // Reconcile with local storage if remote is newer
    const local = getLocalResumeState();
    if (!local || remoteState.updatedAt > local.updatedAt) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(remoteState));
      }
      return remoteState;
    }

    return local;
  } catch (err) {
    console.warn('[ResumeManager] Error fetching remote resume state:', err);
    return null;
  }
}

// Lifecycle listeners for clean window unload / visibility change
if (typeof window !== 'undefined') {
  const handlePageExit = () => {
    flushResumeState();
  };

  window.addEventListener('pagehide', handlePageExit);
  window.addEventListener('beforeunload', handlePageExit);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushResumeState();
    }
  });
}
