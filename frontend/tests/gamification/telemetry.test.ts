import { describe, it, expect, beforeEach, vi } from 'vitest';
import { appEventBus } from '@/shared/events/bus';
import {
  createMediaDetector,
  createQuizDetector,
  createFlashcardDetector,
  createStudyGuideDetector,
  trackMediaProgress,
  trackMediaCompleted,
  trackQuizFinished,
} from '@/modules/telemetry';

describe('Phase 4 Telemetry Engine & Detectors Suite', () => {
  beforeEach(() => {
    appEventBus.clear();
    vi.useRealTimers();
  });

  describe('1. Streaming Media Detector & Anti-Scrubbing Guard', () => {
    it('throttles media.progress events to 5-second intervals', () => {
      const emitted: any[] = [];
      const unsub = appEventBus.on('media.progress', (e) => emitted.push(e));

      const detector = createMediaDetector({
        lectureId: 28,
        kind: 'audio',
        durationSec: 600,
        throttleIntervalSec: 5,
      });

      // Rapid time updates within 1 second
      detector.onTimeUpdate(0.25);
      detector.onTimeUpdate(0.5);
      detector.onTimeUpdate(1.0);
      detector.onTimeUpdate(2.0);

      expect(emitted.length).toBe(1); // Only initial progress emitted
      expect(emitted[0].payload.currentSec).toBe(0);

      // Advance past 5 seconds
      detector.onTimeUpdate(5.5);
      expect(emitted.length).toBe(2);
      expect(emitted[1].payload.currentSec).toBe(5);

      unsub();
    });

    it('detects scrubbing and rejects unearned completion XP', () => {
      const completedEvents: any[] = [];
      const unsub = appEventBus.on('media.completed', (e) => completedEvents.push(e));

      const detector = createMediaDetector({
        lectureId: 28,
        kind: 'video',
        durationSec: 1000,
        completionRatioThreshold: 0.7,
      });

      // User plays 5 seconds then scrubs to the very end (999s)
      detector.onTimeUpdate(1.0);
      detector.onTimeUpdate(2.0);
      detector.onTimeUpdate(999.0); // Jump of 997s (scrubbing)

      const result = detector.onEnded();
      expect(result.completed).toBe(false);
      expect(result.reason).toBe('scrubbing_detected');
      expect(completedEvents.length).toBe(0); // Did NOT emit media.completed

      unsub();
    });

    it('verifies honest playback and emits media.completed when >= 70% played', () => {
      const completedEvents: any[] = [];
      const unsub = appEventBus.on('media.completed', (e) => completedEvents.push(e));

      const detector = createMediaDetector({
        lectureId: 28,
        kind: 'audio',
        durationSec: 100,
        completionRatioThreshold: 0.7,
      });

      // Honest simulation: playing 75 seconds continuously in 1s steps
      for (let sec = 1; sec <= 75; sec++) {
        detector.onTimeUpdate(sec);
      }

      const result = detector.onEnded();
      expect(result.completed).toBe(true);
      expect(completedEvents.length).toBe(1);
      expect(completedEvents[0].payload.lectureId).toBe(28);
      expect(completedEvents[0].payload.kind).toBe('audio');

      unsub();
    });

    it('triggers 5-minute milestone event upon reaching 300 seconds of active listening', () => {
      const streakEvents: any[] = [];
      const unsub = appEventBus.on('audio.streak_5min', (e) => streakEvents.push(e));

      const detector = createMediaDetector({
        lectureId: 28,
        kind: 'audio',
        durationSec: 600,
      });

      // Simulate 305 seconds of continuous playback
      for (let sec = 1; sec <= 305; sec++) {
        detector.onTimeUpdate(sec);
      }

      expect(streakEvents.length).toBe(1);
      expect(streakEvents[0].payload.lectureId).toBe(28);
      expect(streakEvents[0].payload.sessionMinutes).toBe(5);

      unsub();
    });
  });

  describe('2. Active Recall Quiz Detector', () => {
    it('emits quiz.finished and quiz.perfect_score on 100% score', () => {
      const finished: any[] = [];
      const perfect: any[] = [];

      const unsub1 = appEventBus.on('quiz.finished', (e) => finished.push(e));
      const unsub2 = appEventBus.on('quiz.perfect_score', (e) => perfect.push(e));

      const detector = createQuizDetector(28, 5);
      detector.onAnswerSelected(0, 1);
      detector.onAnswerSelected(1, 2);
      detector.onAnswerSelected(2, 0);
      detector.onAnswerSelected(3, 3);
      detector.onAnswerSelected(4, 1);

      const result = detector.submitQuiz(5, 5);

      expect(result.isPerfect).toBe(true);
      expect(result.attempt).toBe(1);
      expect(finished.length).toBe(1);
      expect(finished[0].payload.score).toBe(5);
      expect(perfect.length).toBe(1);
      expect(perfect[0].payload.total).toBe(5);

      unsub1();
      unsub2();
    });

    it('does not emit quiz.perfect_score if score < total', () => {
      const perfect: any[] = [];
      const unsub = appEventBus.on('quiz.perfect_score', (e) => perfect.push(e));

      const detector = createQuizDetector(28, 5);
      const result = detector.submitQuiz(4, 5);

      expect(result.isPerfect).toBe(false);
      expect(perfect.length).toBe(0);

      unsub();
    });
  });

  describe('3. Flashcards Detector', () => {
    it('emits flashcard.flipped for unique cards and flashcard.deck_completed when all flipped', () => {
      const flips: any[] = [];
      const deckCompleted: any[] = [];

      const unsub1 = appEventBus.on('flashcard.flipped', (e) => flips.push(e));
      const unsub2 = appEventBus.on('flashcard.deck_completed', (e) => deckCompleted.push(e));

      const detector = createFlashcardDetector(28, 3);

      detector.onCardFlipped(0);
      detector.onCardFlipped(0); // Duplicate flip on same card should NOT re-emit
      detector.onCardFlipped(1);
      expect(deckCompleted.length).toBe(0);

      detector.onCardFlipped(2); // Last card
      expect(flips.length).toBe(3);
      expect(deckCompleted.length).toBe(1);
      expect(deckCompleted[0].payload.totalCards).toBe(3);

      unsub1();
      unsub2();
    });
  });

  describe('4. Study Guide Dwell Time Detector', () => {
    it('emits study_guide.read once dwell threshold is satisfied', () => {
      vi.useFakeTimers();
      const readEvents: any[] = [];
      const unsub = appEventBus.on('study_guide.read', (e) => readEvents.push(e));

      const detector = createStudyGuideDetector(28, 5); // 5 seconds for test
      detector.start();

      vi.advanceTimersByTime(3000);
      expect(readEvents.length).toBe(0);

      vi.advanceTimersByTime(3000);
      expect(readEvents.length).toBe(1);
      expect(readEvents[0].payload.dwellSec).toBeGreaterThanOrEqual(5);

      detector.stop();
      unsub();
      vi.useRealTimers();
    });
  });

  describe('5. Direct Telemetry Collector Dispatchers', () => {
    it('stamps valid UUID v4 and timestamp on emitted events', () => {
      const events: any[] = [];
      const unsub = appEventBus.on('media.progress', (e) => events.push(e));

      trackMediaProgress('audio', 28, 45, 300);

      expect(events.length).toBe(1);
      expect(events[0].meta.id).toBeDefined();
      expect(events[0].meta.timestamp).toBeGreaterThan(0);
      expect(events[0].meta.lectureId).toBe(28);
      expect(events[0].payload.currentSec).toBe(45);

      unsub();
    });
  });
});
