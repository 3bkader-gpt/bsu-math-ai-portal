import {
  trackMediaProgress,
  trackMediaCompleted,
  trackAudioStreak5Min,
  trackVideoStreak5Min,
} from '../collector';
import { MediaDetectorState } from '../types';

export interface MediaDetectorOptions {
  lectureId: number;
  kind: 'audio' | 'video';
  durationSec?: number;
  throttleIntervalSec?: number; // Default 5s
  completionRatioThreshold?: number; // Default 0.70 (70%)
}

export function createMediaDetector(options: MediaDetectorOptions) {
  const {
    lectureId,
    kind,
    throttleIntervalSec = 5,
    completionRatioThreshold = 0.7,
  } = options;

  let state: MediaDetectorState = {
    lectureId,
    kind,
    durationSec: options.durationSec || 0,
    actualSecondsPlayed: 0,
    lastReportedTime: -1,
    lastEmittedSecond: -1,
    milestone5MinEmitted: false,
    isCompleted: false,
  };

  return {
    /**
     * Updates media total duration once metadata is loaded.
     */
    setDuration(durationSec: number) {
      if (durationSec > 0) {
        state.durationSec = durationSec;
      }
    },

    /**
     * Called on media 'timeupdate' event.
     * Throttles progress emission and tracks honest elapsed listening time.
     */
    onTimeUpdate(currentTime: number) {
      if (currentTime < 0 || isNaN(currentTime)) return;

      // 1. Anti-Scrubbing Honest Playback Tracking
      if (state.lastReportedTime >= 0) {
        const delta = currentTime - state.lastReportedTime;
        // Normal playback step is typically ~0.25s to 1.5s (accounting for 2x playback speed)
        if (delta > 0 && delta <= 2.5) {
          state.actualSecondsPlayed += delta;
        }
      }
      state.lastReportedTime = currentTime;

      // 2. Throttled Progress Emission (every 5 seconds)
      const shouldEmit =
        state.lastEmittedSecond === -1 ||
        Math.abs(currentTime - state.lastEmittedSecond) >= throttleIntervalSec;

      if (shouldEmit) {
        state.lastEmittedSecond = Math.floor(currentTime);
        trackMediaProgress(
          state.kind,
          state.lectureId,
          Math.floor(currentTime),
          Math.floor(state.durationSec)
        );
      }

      // 3. 5-Minute Continuous Listening/Watching Milestone (300 seconds)
      if (state.actualSecondsPlayed >= 300 && !state.milestone5MinEmitted) {
        state.milestone5MinEmitted = true;
        if (state.kind === 'audio') {
          trackAudioStreak5Min(state.lectureId, 5);
        } else {
          trackVideoStreak5Min(state.lectureId, 5);
        }
      }
    },

    /**
     * Called when media playback ends.
     * Enforces anti-scrubbing integrity check before awarding completion XP.
     */
    onEnded(): { completed: boolean; actualSeconds: number; reason?: string } {
      if (state.isCompleted) {
        return { completed: true, actualSeconds: state.actualSecondsPlayed };
      }

      const totalDuration = state.durationSec;
      const requiredPlayTime = totalDuration > 0
        ? Math.min(totalDuration * completionRatioThreshold, Math.max(10, totalDuration - 15))
        : 10;

      // Verify that user actually played at least 70% of the media
      if (state.actualSecondsPlayed >= requiredPlayTime) {
        state.isCompleted = true;
        trackMediaCompleted(state.kind, state.lectureId, Math.floor(totalDuration));
        return { completed: true, actualSeconds: state.actualSecondsPlayed };
      } else {
        return {
          completed: false,
          actualSeconds: state.actualSecondsPlayed,
          reason: 'scrubbing_detected',
        };
      }
    },

    /**
     * Resets detector internal state.
     */
    reset(newLectureId?: number, newDuration?: number) {
      state = {
        lectureId: newLectureId ?? state.lectureId,
        kind: state.kind,
        durationSec: newDuration ?? 0,
        actualSecondsPlayed: 0,
        lastReportedTime: -1,
        lastEmittedSecond: -1,
        milestone5MinEmitted: false,
        isCompleted: false,
      };
    },

    /**
     * Diagnostic state snapshot.
     */
    getState(): Readonly<MediaDetectorState> {
      return { ...state };
    },
  };
}
