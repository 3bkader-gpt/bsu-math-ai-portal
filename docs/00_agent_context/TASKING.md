# ✅ TASKING.md — Current Backlog & Execution Queue
> Living task tracker. Update after every session.
> Last Updated: 2026-10-25 | Current Version: v1.4.1

---

## 🔴 Active Sprint (Now)

### Phase 5 — Fair Play, Confidence Assessment & Peer Leaderboards (2026-10-26) — ✅ BUILT & TESTED
- [x] `core/confidence.ts` pure engine (8/8 Vitest): Calibrates meta-cognition before answer submission, Certainty rewards (High + Correct => +3 XP bonus), Severe Misconception detection (High + Wrong => priority Leitner flag).
- [x] `ConfidenceSelector.tsx`: Tactile 3-pill selector (🎯 متأكد / 🤔 مش متأكد / 🎲 بتخمين) integrated seamlessly into `QuizViewer`.
- [x] Wire live confidence rating into `trackQuizQuestionAnswered` (replaces hardcoded 'medium').
- [x] `core/neighborhoodLeaderboard.ts` pure engine (7/7 Vitest): 10-peer relative window centered around the student + actionable XP distance to next rank.
- [x] `StudentGamificationPill.tsx`: Sub-selector toggle between `[ 👥 جيراني (حولك) ]` (default) and `[ 🏆 أوائل الدفعة ]` + distance banner (`🎯 فارقك للمركز التالي: +X XP`).
- [x] `core/streak.ts` (7/7 Vitest): Automatic weekly streak freeze recharge up to 2 freezes per Cairo week + Friday academic exemption.

### Phase 4 — Compassionate Feedback (2026-10-25) — ✅ BUILT, DEPLOYED & MCP-TESTED
- [x] `core/compassionateFeedback.ts` pure engine (12/12 Vitest): 32-line praise bank per persona with no-repeat-within-10, diagnostic error taxonomy (sign / magnitude / units / reversed / conceptual) with never-shaming Egyptian copy, ethical exit copy
- [x] Praise on correct (variety verified live), diagnostic panel (🧭) on wrong — sign flips, rounding near-misses and missing units each get tailored tutoring
- [x] Haptics (15ms correct / [10,50,10] wrong, fail-safe) + ascending streak chime (semitone per consecutive correct) + gentle 'quiz_wrong' tone
- [x] Epic confetti reserved for a perfect score; ethical exit button on quiz completion opening the Phase-1 wrap-up modal with THIS attempt's real stats
- [x] Easter eggs: π / e / 1729 footer chips open math trivia
- [x] Live-test fix: ethical exit button no longer self-destructs on first click

### Phase 3 — Cognitive Guard & Hint Ladder (2026-10-25) — ✅ BUILT & DEPLOYED
- [x] `core/hintLadder.ts` pure engine (13/13 Vitest): tier splitting, burnout gate, worked-example fading
- [x] 3.1 Hint ladder in QuizViewer — 3 tiers (conceptual → full hint → answer + 'نراجعها غداً في الدفتر'), `hintLevelUsed` 0-3 sent on every answer
- [x] 3.3 Burnout relief — 3 consecutive wrong OR 2-min stall (IntersectionObserver dwell clocks) → compassionate modal (hint or breather), once per attempt
- [x] 3.4 Session flow — whisper-thin 25-min bar + single gentle break prompt (zero store subscriptions → KaTeX isolation preserved)
- [x] 3.2 Worked-example fading — `**Steps:**` parser + visible/hidden ladder UI; home worker prompt now generates Hint + numbered Steps for every question

---

## 🟡 Next In Queue (Phase 6 — Cohort Collaboration)

### Phase 6: Sybil-Proof Cohort Collaboration
**Goal:** Cultivate cohort solidarity ("كلنا في نفس المركب") without database lock contention.

#### Tasks:
- [ ] **6.1 — Cohort Challenges Schema & RPC**
  - Append-only `cohort_challenge_contributions` table with Cairo date and question hash
  - Daily per-student contribution cap (15/day)
- [ ] **6.2 — Collective Challenge UI Progress Widget**
  - Progress bar towards weekly cohort goal (e.g. "الدفعة حلت 500 سؤال")
  - Materialized view / non-blocking cached aggregator

---

## 🟢 Completed (Recent)

| Date | Feature | Commit |
|---|---|---|
| 2026-10-26 | Phase 5: Confidence Assessment + Neighborhood Leaderboard + Weekly Freezes | Current |
| 2026-10-26 | Phase 4: Compassionate Feedback + Diagnostics + Haptics + Easter Eggs | `4c59b3e` |
| 2026-10-25 | Phase 3: Cognitive Guard & Hint Ladder | `6a30c55` |
| 2026-10-21 | Phase 2 docs updated to COMPLETED | `3b77c13` |
| 2026-10-21 | Leaderboard self-highlight + nickname edit + spinner | `dbf6661` |
| 2026-10-20 | Visual density sweet spot (typography + sizing) | `68abf54` |
| 2026-10-20 | Segmented selectors for sound/display toggles | `24d57eb` |
| 2026-10-20 | Zero-friction nickname prompt (first-time + edit) | `dbf6661` |
| 2026-10-19 | Phase 2: Leitner Notebook (full implementation) | multiple |
| 2026-10-19 | Phase 1: Smart Resume + Micro-Session + Wrap-Up | multiple |
| 2026-10-19 | Phase 0: CI/CD + baseline freeze v1.0.0-stable | `544e60b` |

---

## 🔧 Technical Debt & Polish

| Item | Priority | Notes |
|---|---|---|
| ~~`mistake_notebook` auto-ingest from quiz wrong answers~~ | ✅ Resolved 2026-10-24 | Restored via `20261024_fix_ingest_events_leitner_parity.sql` and verified live. |
| ~~Hint Ladder `hintLevelUsed` field not wired in quiz events~~ | ✅ Resolved 2026-10-25 | Wired in Phase 3 and verified in telemetry. |
| ~~Neighborhood leaderboard (10-peer)~~ | ✅ Resolved 2026-10-26 | Built in Phase 5 with actionable next-rank distance banner. |
| PWA / offline support | Low | Future consideration |
| Push notifications (1/day, student-chosen time) | Low | Requires service worker |
| Admin dashboard gamification analytics | Low | KPI views exist in DB |
| Git history still contains the old leaked PAT + admin password | Low | Harmless AFTER revocation/rotation (both done); optional `git filter-repo` rewrite if desired |

---

## 🚦 Quality Gate (Before Any Commit)

```bash
cd frontend
npm run typecheck   # Must: 0 TypeScript errors
npm run test        # Must: all Vitest tests pass
npm run build       # Must: clean Turbopack build, 0 warnings
```
