/**
 * Type definitions for Telemetry Detectors & Content Modalities Integration.
 */

export interface MediaDetectorState {
  lectureId: number;
  kind: 'audio' | 'video';
  durationSec: number;
  actualSecondsPlayed: number;
  lastReportedTime: number;
  lastEmittedSecond: number;
  milestone5MinEmitted: boolean;
  isCompleted: boolean;
}

export interface QuizDetectorState {
  lectureId: number;
  totalQuestions: number;
  attemptNumber: number;
  startTimeMs: number;
  answers: Record<number, number>;
  isCompleted: boolean;
}

export interface FlashcardDetectorState {
  lectureId: number;
  totalCards: number;
  flippedCards: Set<number>;
  startTimeMs: number;
  isDeckCompleted: boolean;
}

export interface StudyGuideDetectorState {
  lectureId: number;
  dwellSeconds: number;
  isActive: boolean;
  milestoneEmitted: boolean;
}
