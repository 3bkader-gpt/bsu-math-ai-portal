# Phase 6 Execution Plan: Audio Sprite, Micro-Interactions, Badges & Cohort Leaderboard

> **Architecture Standard:**
> - Zero-Dependency Web Audio Synth: In addition to audio assets, provide an ultra-lightweight Web Audio API synthesizer fallback for crisp dopamine chimes (Level Up, Success Ding, Whoosh) requiring 0 external asset downloads.
> - GPU-Composited Animations: Micro-interactions and confetti bursts run on the canvas/compositor layer without interfering with DOM layout or KaTeX formulas.
> - Egyptian Collegiate Soul: Badges catalog with authentic Cairo faculty mathematics flavor (*"دحيح الدفعة"*, *"سهران مع فيرما"*, *"وحش الاستاتيكا"*, *"محارب الشلل"*, *"ختم المنهج"*).
> - Respect User Autonomy: Sound effects toggle with persistent localStorage preference (`bsu_portal_audio_muted`).

---

## 🎯 Phase 6 Objectives

1. **Web Audio Synthesizer Engine (`src/lib/audio/soundEngine.ts`):**
   - Synthesizes delightful procedural sounds using the browser's native `AudioContext`:
     - `playSuccessDing()`: High cheerful sine chime (E6 -> G6 -> B6).
     - `playLevelUpFanfare()`: Glorious collegiate arpeggio with decay.
     - `playStreakWhoosh()`: Warm filtered noise whoosh.
     - `playBadgeChime()`: C-major chord burst.
   - Respects audio mute state.
2. **Confetti Burst Service (`src/lib/effects/confetti.ts`):**
   - Canvas-confetti integration with tailored Egyptian collegiate colors (Gold, Emerald, Cyan, Coral).
   - Intensity levels: `standard` (XP milestones), `epic` (Level up & perfect quiz).
3. **Interactive Badges Catalog & Modal:**
   - Full Egyptian badges display with unlock conditions, progress, and date unlocked.
4. **Cohort Leaderboard Showcase:**
   - Tabbed view: Cohort Ranking (Boys / Girls / Combined).
   - Highlights current student position with distance to next rank.
5. **Automated Verification:**
   - Vitest tests for sound engine and audio preferences.
   - Multi-cloud deploy via Wrangler CLI & Render CLI + live Playwright production tests.

---

## 📋 Granular Subtasks

### Subtask 6.1: Zero-Dependency Web Audio Synthesizer (`src/lib/audio/soundEngine.ts`)
- [x] Implement procedural audio generator with Web Audio `AudioContext`.
- [x] Implement sound triggers for `xp_chime`, `level_up`, `streak_fire`, `badge_unlock`.
- [x] Connect `sound.play` events from `effectBus` directly to `soundEngine`.
- [x] Add mute/unmute state management with persistent LocalStorage storage.

### Subtask 6.2: Canvas Confetti Celebrations (`src/lib/effects/confetti.ts`)
- [x] Integrate lightweight canvas confetti emitter.
- [x] Connect `confetti.trigger` events from `effectBus`.

### Subtask 6.3: Badges Showcase & Cohort Leaderboard UI
- [x] Polish `<StudentGamificationPill />` badges view with Egyptian iconography and localized collegiate descriptions.
- [x] Verify leaderboard sorting, avatar crowns, and rank indicators.

### Subtask 6.4: Automated Verification & Quality Gate
- [x] Write Vitest unit tests `frontend/tests/gamification/sound_and_effects.test.ts`.
- [x] Run full 5-step Quality Gate:
  - `npm run typecheck`, `npm test`, `npm run build`.
  - Atomic commit & push.
  - Deploy via Wrangler CLI & verify Render CLI.
  - Playwright live production test on `https://bsu-math-ai-portal.pages.dev`.
