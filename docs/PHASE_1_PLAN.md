# Phase 1 Execution Plan: Event Bus & Pure Core Engine

> **Architecture Standard:** Strict separation of concerns. Pure domain TypeScript without React or DOM dependencies. Zero side-effects in core reducers.

---

## 🎯 Phase 1 Objectives
1. **Contract Definition (`src/shared/events/types.ts`):** Single source of truth for all application events (factual raw inputs) and effects (gamification visual/auditory outputs).
2. **Buffered Event Bus (`src/shared/events/bus.ts`):** Typed, zero-dependency pub/sub system with an internal replay queue to prevent lost events during lazy loading.
3. **Gamification Rules Config (`src/config/gamification-rules.ts`):** Centralized XP rules, level curves, and Egyptian collegiate badge definitions.
4. **Pure Domain Core (`src/modules/gamification/core/`):** Stateless math reducers: `(state, event) => { nextState, effects[] }`.
5. **Automated Verification:** Comprehensive Vitest unit test suite covering XP, Level-ups, Streaks, Cairo dates, and Badge evaluation.

---

## 📋 Granular Subtasks

### Subtask 1.1: Shared Event Types (`src/shared/events/types.ts`)
- [x] Define `AppEventMap`:
  - `media.progress`: `{ kind: 'audio'|'video', lectureId: number, currentSec: number, totalSec: number }`
  - `media.completed`: `{ kind: 'audio'|'video', lectureId: number, durationSec: number }`
  - `quiz.finished`: `{ lectureId: number, score: number, total: number, attempt: number, durationMs: number }`
  - `flashcard.flipped`: `{ lectureId: number, cardIndex: number }`
  - `flashcard.deck_completed`: `{ lectureId: number, totalCards: number }`
  - `study_guide.read`: `{ lectureId: number, dwellSec: number }`
  - `lecture.completed`: `{ lectureId: number }`
- [x] Define `EffectEventMap`:
  - `xp.gained`: `{ amount: number, reason: string, totalXp: number }`
  - `level.up`: `{ newLevel: number, oldLevel: number, title: string }`
  - `streak.updated`: `{ currentStreak: number, isNewDay: boolean }`
  - `badge.unlocked`: `{ badgeId: string, title: string, description: string, icon: string }`
  - `confetti.trigger`: `{ intensity: 'subtle' | 'medium' | 'epic' }`
  - `sound.play`: `{ sound: 'success' | 'level_up' | 'streak_fire' | 'chime' }`

### Subtask 1.2: Buffered Event Bus (`src/shared/events/bus.ts`)
- [x] Typed event emitter with `.on()`, `.off()`, and `.emit()`.
- [x] Internal queue buffer: if no subscribers exist for an event type when emitted, enqueue it; replay immediately upon first `.on()` registration.
- [x] Memory-safe cleanup with unsubscribe functions.

### Subtask 1.3: Gamification Configuration (`src/config/gamification-rules.ts`)
- [x] XP Table with activity multipliers and daily caps.
- [x] Level scaling formula: `Level = floor(sqrt(XP / 60)) + 1`.
- [x] Badges catalog with Egyptian student persona names & icons.

### Subtask 1.4: Pure Core Logic (`src/modules/gamification/core/`)
- [x] `types.ts`: Define `GamificationState`, `GamificationAction`, and return shape.
- [x] `xp.ts`: Functions `calculateLevel(xp)`, `xpForNextLevel(level)`, `applyXpGain(state, amount)`.
- [x] `streak.ts`: Functions `evaluateStreak(lastActiveDate, currentDate, currentStreak, freezes)`.
- [x] `achievements.ts`: Pure criteria checker `evaluateBadges(state, event)`.
- [x] `reducer.ts`: Pure root reducer `processGamificationEvent(state, event) => { state, effects }`.

### Subtask 1.5: Unit Test Suite & Validation
- [x] Install `vitest` in `frontend/`.
- [x] Write `frontend/tests/gamification/core.test.ts` testing:
  - Event Bus pub/sub and buffering.
  - XP progression and Level-up transitions.
  - Streak preservation and consecutive day incrementation.
  - Badge unlock criteria and duplicate prevention.
  - Correct effect generation (`confetti`, `sound`).
- [x] Execute `npm run test` and `npm run typecheck` to verify 100% pass rate.
- [x] Commit, push, and confirm CI workflow green light.
