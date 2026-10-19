import { trackStudyGuideRead } from '../collector';
import { StudyGuideDetectorState } from '../types';

export function createStudyGuideDetector(
  lectureId: number,
  targetDwellSec = 60
) {
  let state: StudyGuideDetectorState = {
    lectureId,
    dwellSeconds: 0,
    isActive: false,
    milestoneEmitted: false,
  };

  let timerId: ReturnType<typeof setInterval> | null = null;

  const tick = () => {
    // Only increment when document is actively visible
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return;
    }

    state.dwellSeconds += 1;

    // Check if student reached reading dwell threshold (default 60s)
    if (state.dwellSeconds >= targetDwellSec && !state.milestoneEmitted) {
      state.milestoneEmitted = true;
      trackStudyGuideRead(state.lectureId, state.dwellSeconds);
    }
  };

  return {
    start() {
      if (state.isActive) return;
      state.isActive = true;
      timerId = setInterval(tick, 1000);
    },

    pause() {
      state.isActive = false;
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
    },

    resume() {
      if (!state.isActive) {
        this.start();
      }
    },

    stop() {
      this.pause();
    },

    reset(newLectureId?: number) {
      this.pause();
      state = {
        lectureId: newLectureId ?? state.lectureId,
        dwellSeconds: 0,
        isActive: false,
        milestoneEmitted: false,
      };
    },

    getState(): Readonly<StudyGuideDetectorState> {
      return { ...state };
    },
  };
}
