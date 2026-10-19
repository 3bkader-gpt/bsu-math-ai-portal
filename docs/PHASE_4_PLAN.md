# Phase 4 Execution Plan: Telemetry Detectors & Content Modalities Integration

> **Architecture Standard:**
> - Non-Invasive Telemetry: Media players, quizes, flashcards, and study guides report factual events only. Zero gamification rules or XP calculations are embedded inside UI components.
> - Scrubbing & Abuse Guard: Throttled timeupdate progress detectors with honest dwell-time verification to prevent fake scrubbing skips from awarding full completion XP.
> - Modality Decoupling: Each content modality (Audio, Video, Quiz, Flashcards, Study Guide) has a dedicated typed detector in `src/modules/telemetry/detectors/`.
> - KaTeX Isolation: Telemetry events pass through the zero-dependency `eventBus` without triggering re-renders in the lecture view or KaTeX mathematical blocks.

---

## 🎯 Phase 4 Objectives

1. **Telemetry Collector (`src/modules/telemetry/collector.ts`):** 
   A centralized emitter providing typed dispatch helpers (`trackMediaProgress`, `trackMediaCompletion`, `trackQuizFinished`, `trackFlashcardFlipped`, `trackStudyGuideRead`).
2. **Streaming Progress Detector (`src/modules/telemetry/detectors/mediaDetector.ts`):** 
   Throttled tracker (every 5 seconds of active playback) and completion detector with active listen-time verification.
3. **Active Recall Quiz Detector (`src/modules/telemetry/detectors/quizDetector.ts`):** 
   Processes quiz submissions, computing score ratios, attempt counts, and perfect score triggers.
4. **Flashcards Deck Detector (`src/modules/telemetry/detectors/flashcardDetector.ts`):** 
   Tracks unique card flips and triggers deck completion once all cards have been reviewed.
5. **Academic Study Guide Detector (`src/modules/telemetry/detectors/studyGuideDetector.ts`):** 
   Tracks focused reading time (dwell time) on Typst academic guides and section scroll depth.
6. **Component Wiring in Lecture View (`src/app/lecture/page.tsx`):**
   Seamlessly attach detectors to audio, video, quiz, flashcards, and study guide viewers.
7. **Automated Verification:**
   Vitest unit test suite (`frontend/tests/gamification/telemetry.test.ts`) and live Playwright E2E verification.

---

## 📋 Granular Subtasks

### Subtask 4.1: Telemetry Collector (`src/modules/telemetry/collector.ts`)
- [ ] Implement `emitAppEvent(event)` helper that stamps `eventId: uuid` and `timestamp: Date.now()`.
- [ ] Export strongly-typed convenience dispatchers:
  - `emitMediaProgress(payload)`
  - `emitLectureCompleted(payload)`
  - `emitQuizFinished(payload)`
  - `emitFlashcardFlipped(payload)`
  - `emitStudyGuideRead(payload)`

### Subtask 4.2: Media Progress & Completion Detector (`src/modules/telemetry/detectors/mediaDetector.ts`)
- [ ] Implement `createMediaDetector(lectureId, kind: 'audio'|'video', duration)`:
  - `onTimeUpdate(currentTime)`: Throttled to emit `media.progress` every 5 seconds.
  - Active time accumulation: Increments `actualSecondsPlayed` only when time advances by <= 1.5s per interval.
  - `onEnded()`: Checks `actualSecondsPlayed >= duration * 0.75` before emitting `lecture.completed` to eliminate scrubbing abuse.
  - `reset()`: Resets detector state when switching lectures or media tracks.

### Subtask 4.3: Quiz Performance Detector (`src/modules/telemetry/detectors/quizDetector.ts`)
- [ ] Implement `trackQuizCompletion(lectureId, score, total, answers)`:
  - Validates `total > 0` and `score <= total`.
  - Stays idempotent per quiz session attempt.
  - Emits `quiz.finished` with score, total, isPerfect (`score === total`), and attempts count.

### Subtask 4.4: Flashcards & Study Guide Detectors (`src/modules/telemetry/detectors/flashcardDetector.ts`, `studyGuideDetector.ts`)
- [ ] `createFlashcardTracker(lectureId, totalCards)`:
  - Set of flipped card indices.
  - Emits `flashcard.flipped` on new card interactions.
  - Emits completion when `flippedIndices.size === totalCards`.
- [ ] `createStudyGuideTracker(lectureId)`:
  - Tracks reading session dwell-time using requestAnimationFrame / interval when window is active.
  - Emits `study_guide.read` after student spends at least 60 seconds reading the academic summary.

### Subtask 4.5: Wire Detectors into `src/app/lecture/page.tsx`
- [ ] Wire `AudioPlayer` component events to `mediaDetector`.
- [ ] Wire `VideoPlayer` component events to `mediaDetector`.
- [ ] Wire `QuizViewer` submit button to `quizDetector`.
- [ ] Wire `FlashcardsViewer` flip handler to `flashcardDetector`.
- [ ] Wire `StudyGuideViewer` mount/unmount to `studyGuideDetector`.

### Subtask 4.6: Unit Test Suite & Automated Quality Gate
- [ ] Write Vitest test suite `frontend/tests/gamification/telemetry.test.ts`:
  - Test media throttle intervals and anti-scrubbing guard.
  - Test quiz event emission with perfect score flag.
  - Test flashcard deck completion trigger.
  - Test study guide dwell-time threshold.
- [ ] Run full 5-step Quality Gate:
  - `npm run typecheck`, `npm test`, `npm run build`.
  - Atomic commit & push.
  - Deploy via Wrangler CLI & verify Render CLI.
  - Playwright live production test on `https://bsu-math-ai-portal.pages.dev`.
