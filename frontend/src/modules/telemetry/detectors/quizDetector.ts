import { trackQuizFinished, trackQuizPerfectScore } from '../collector';
import { QuizDetectorState } from '../types';

export function createQuizDetector(lectureId: number, totalQuestions = 0) {
  let state: QuizDetectorState = {
    lectureId,
    totalQuestions,
    attemptNumber: 0,
    startTimeMs: Date.now(),
    answers: {},
    isCompleted: false,
  };

  return {
    setTotalQuestions(total: number) {
      state.totalQuestions = total;
    },

    onAnswerSelected(questionIndex: number, optionIndex: number) {
      state.answers[questionIndex] = optionIndex;
    },

    submitQuiz(score: number, totalOverride?: number): {
      score: number;
      total: number;
      isPerfect: boolean;
      attempt: number;
      durationMs: number;
    } {
      state.attemptNumber += 1;
      const total = totalOverride ?? state.totalQuestions;
      const durationMs = Math.max(1000, Date.now() - state.startTimeMs);
      const isPerfect = total > 0 && score === total;

      state.isCompleted = true;

      // 1. Emit base quiz finish
      trackQuizFinished(
        state.lectureId,
        score,
        total,
        state.attemptNumber,
        durationMs
      );

      // 2. Emit perfect score bonus if achieved
      if (isPerfect) {
        trackQuizPerfectScore(state.lectureId, total, durationMs);
      }

      return {
        score,
        total,
        isPerfect,
        attempt: state.attemptNumber,
        durationMs,
      };
    },

    reset(newLectureId?: number, newTotal?: number) {
      state = {
        lectureId: newLectureId ?? state.lectureId,
        totalQuestions: newTotal ?? state.totalQuestions,
        attemptNumber: state.attemptNumber, // preserve attempt count across resets in same session
        startTimeMs: Date.now(),
        answers: {},
        isCompleted: false,
      };
    },

    getState(): Readonly<QuizDetectorState> {
      return { ...state, answers: { ...state.answers } };
    },
  };
}
