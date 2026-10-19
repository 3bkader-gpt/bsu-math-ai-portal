/**
 * Single Source of Truth for Application & Gamification Events.
 * Pure TypeScript contract shared across UI components, detectors, and core engines.
 */

export interface EventMetadata {
  id: string; // Unique UUID v4
  timestamp: number; // Unix epoch ms
  lectureId?: number;
  userId?: string;
}

/**
 * Raw Fact Events: Emitted by players, quiz viewers, flashcards, and navigation.
 * UI components report FACTS only, not game decisions or XP points.
 */
export interface RawAppEvents {
  'media.progress': {
    kind: 'audio' | 'video';
    lectureId: number;
    currentSec: number;
    totalSec: number;
  };
  'media.completed': {
    kind: 'audio' | 'video';
    lectureId: number;
    durationSec: number;
  };
  'quiz.finished': {
    lectureId: number;
    score: number;
    total: number;
    attempt: number;
    durationMs: number;
  };
  'flashcard.flipped': {
    lectureId: number;
    cardIndex: number;
  };
  'flashcard.deck_completed': {
    lectureId: number;
    totalCards: number;
  };
  'study_guide.read': {
    lectureId: number;
    dwellSec: number;
  };
  'lecture.completed': {
    lectureId: number;
  };
}

/**
 * Derived Action Events: Emitted by Telemetry Detectors after processing raw facts.
 */
export interface DerivedAppEvents {
  'audio.streak_5min': {
    lectureId: number;
    sessionMinutes: number;
  };
  'video.streak_5min': {
    lectureId: number;
    sessionMinutes: number;
  };
  'quiz.perfect_score': {
    lectureId: number;
    total: number;
    durationMs: number;
  };
  'flashcard.speed_run': {
    lectureId: number;
    durationMs: number;
  };
}

export type AllAppEvents = RawAppEvents & DerivedAppEvents;

export type AppEventName = keyof AllAppEvents;

export type AppEvent = {
  [K in AppEventName]: {
    type: K;
    payload: AllAppEvents[K];
    meta: EventMetadata;
  };
}[AppEventName];

/**
 * Effects: Imperative outputs emitted by the Gamification Engine for UI consumption
 * (e.g., sound playback, confetti burst, level-up celebration modal, toast).
 */
export interface GamificationEffects {
  'xp.gained': {
    amount: number;
    reason: string;
    totalXp: number;
  };
  'level.up': {
    newLevel: number;
    oldLevel: number;
    levelTitle: string;
  };
  'streak.updated': {
    currentStreak: number;
    isNewDay: boolean;
  };
  'badge.unlocked': {
    badgeId: string;
    title: string;
    description: string;
    icon: string;
  };
  'confetti.trigger': {
    intensity: 'subtle' | 'medium' | 'epic';
  };
  'sound.play': {
    sound: 'badge_unlock' | 'level_up' | 'streak_fire' | 'xp_chime' | 'quiz_correct' | 'success';
  };
}

export type EffectEventName = keyof GamificationEffects;

export type GamificationEffect = {
  [K in EffectEventName]: {
    type: K;
    payload: GamificationEffects[K];
    meta: EventMetadata;
  };
}[EffectEventName];

export type SpecificAppEvent<K extends AppEventName> = Extract<AppEvent, { type: K }>;
export type SpecificEffect<K extends EffectEventName> = Extract<GamificationEffect, { type: K }>;
