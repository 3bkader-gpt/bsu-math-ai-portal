import { appEventBus, createAppEvent } from '@/shared/events/bus';
import { AllAppEvents, AppEventName, SpecificAppEvent } from '@/shared/events/types';
import { isTestModeActive } from '@/lib/studentProfile';

/**
 * Universal event emitter helper.
 * Generates an event with a unique UUID v4 and timestamp, then emits it onto the global event bus.
 */
export function emitTelemetryEvent<K extends AppEventName>(
  type: K,
  payload: AllAppEvents[K],
  lectureId?: number
): SpecificAppEvent<K> {
  const isTest = isTestModeActive();
  const eventPayload = isTest
    ? { ...(payload as any), is_test: true }
    : payload;
  const event = createAppEvent(type, eventPayload, lectureId);
  appEventBus.emit(type, event as any);
  return event;
}

/**
 * Emits raw media playback progress (throttled).
 */
export function trackMediaProgress(
  kind: 'audio' | 'video',
  lectureId: number,
  currentSec: number,
  totalSec: number
) {
  return emitTelemetryEvent(
    'media.progress',
    { kind, lectureId, currentSec, totalSec },
    lectureId
  );
}

/**
 * Emits verified full media playback completion (guarded against scrubbing).
 */
export function trackMediaCompleted(
  kind: 'audio' | 'video',
  lectureId: number,
  durationSec: number
) {
  return emitTelemetryEvent(
    'media.completed',
    { kind, lectureId, durationSec },
    lectureId
  );
}

/**
 * Emits 5-minute continuous listening milestone.
 */
export function trackAudioStreak5Min(lectureId: number, sessionMinutes = 5) {
  return emitTelemetryEvent(
    'audio.streak_5min',
    { lectureId, sessionMinutes },
    lectureId
  );
}

/**
 * Emits 5-minute continuous video watching milestone.
 */
export function trackVideoStreak5Min(lectureId: number, sessionMinutes = 5) {
  return emitTelemetryEvent(
    'video.streak_5min',
    { lectureId, sessionMinutes },
    lectureId
  );
}

/**
 * Emits quiz completion metrics.
 */
export function trackQuizFinished(
  lectureId: number,
  score: number,
  total: number,
  attempt = 1,
  durationMs = 0
) {
  return emitTelemetryEvent(
    'quiz.finished',
    { lectureId, score, total, attempt, durationMs },
    lectureId
  );
}

/**
 * Emits individual quiz question answer metrics with full text payloads for mistake notebook ingestion.
 */
export function trackQuizQuestionAnswered(
  lectureId: number,
  questionIndex: number,
  questionHash: string,
  questionText: string,
  selectedOption: number,
  correctOption: number,
  userAnswer: string,
  correctAnswer: string,
  isCorrect: boolean,
  durationMs: number,
  confidence: 'high' | 'medium' | 'low' = 'medium',
  explanation?: string,
  hintLevelUsed: 0 | 1 | 2 | 3 = 0
) {
  return emitTelemetryEvent(
    'quiz.question_answered',
    {
      lectureId,
      questionIndex,
      questionHash,
      questionText,
      selectedOption,
      correctOption,
      userAnswer,
      correctAnswer,
      explanation,
      isCorrect,
      durationMs,
      confidence,
      hintLevelUsed,
    },
    lectureId
  );
}

/**
 * Emits perfect score milestone on quiz.
 */
export function trackQuizPerfectScore(
  lectureId: number,
  total: number,
  durationMs = 0
) {
  return emitTelemetryEvent(
    'quiz.perfect_score',
    { lectureId, total, durationMs },
    lectureId
  );
}

/**
 * Emits flashcard flip interaction.
 */
export function trackFlashcardFlipped(lectureId: number, cardIndex: number) {
  return emitTelemetryEvent(
    'flashcard.flipped',
    { lectureId, cardIndex },
    lectureId
  );
}

/**
 * Emits full flashcards deck completion.
 */
export function trackFlashcardDeckCompleted(lectureId: number, totalCards: number) {
  return emitTelemetryEvent(
    'flashcard.deck_completed',
    { lectureId, totalCards },
    lectureId
  );
}

/**
 * Emits speed-run milestone for completing flashcards quickly.
 */
export function trackFlashcardSpeedRun(lectureId: number, durationMs: number) {
  return emitTelemetryEvent(
    'flashcard.speed_run',
    { lectureId, durationMs },
    lectureId
  );
}

/**
 * Emits study guide dwell-time reading milestone.
 */
export function trackStudyGuideRead(lectureId: number, dwellSec: number) {
  return emitTelemetryEvent(
    'study_guide.read',
    { lectureId, dwellSec },
    lectureId
  );
}

/**
 * Emits comprehensive lecture completion.
 */
export function trackLectureCompleted(lectureId: number) {
  return emitTelemetryEvent(
    'lecture.completed',
    { lectureId },
    lectureId
  );
}

/**
 * Emits session start event for KPI telemetry.
 */
export function trackSessionStarted(sessionId: string, deviceType: 'mobile' | 'desktop') {
  return emitTelemetryEvent('session.started', { sessionId, deviceType });
}

/**
 * Emits time to first action event for KPI telemetry.
 */
export function trackSessionFirstAction(
  sessionId: string,
  actionType: string,
  timeToFirstActionMs: number
) {
  return emitTelemetryEvent('session.first_action', {
    sessionId,
    actionType,
    timeToFirstActionMs,
  });
}

/**
 * Emits ethical session wrap-up event.
 */
export function trackSessionEnded(
  sessionId: string,
  durationSec: number,
  conceptsLearned: number,
  cardsReviewed: number,
  quizAccuracy: number
) {
  return emitTelemetryEvent('session.ended', {
    sessionId,
    durationSec,
    conceptsLearned,
    cardsReviewed,
    quizAccuracy,
  });
}

