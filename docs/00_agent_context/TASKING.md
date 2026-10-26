# ✅ TASKING.md — Current Backlog & Execution Queue
> Living task tracker. Update after every session.
> Last Updated: 2026-10-25 | Current Version: v1.4.1

---

## 🔴 Active Sprint (Now)

### Phase 4 — Compassionate Feedback (2026-10-25) — ✅ BUILT, DEPLOYED & MCP-TESTED
- [x] `core/compassionateFeedback.ts` pure engine (12/12 Vitest): 32-line praise bank per persona with no-repeat-within-10, diagnostic error taxonomy (sign / magnitude / units / reversed / conceptual) with never-shaming Egyptian copy, ethical exit copy
- [x] Praise on correct (variety verified live), diagnostic panel (🧭) on wrong — sign flips, rounding near-misses and missing units each get tailored tutoring
- [x] Haptics (15ms correct / [10,50,10] wrong, fail-safe) + ascending streak chime (semitone per consecutive correct) + gentle 'quiz_wrong' tone
- [x] Epic confetti reserved for a perfect score; ethical exit button on quiz completion opening the Phase-1 wrap-up modal with THIS attempt's real stats (27 concepts / 80 cards / 26% verified live)
- [x] Easter eggs: π / e / 1729 footer chips open math trivia (Ramanujan taxicab verified live)
- [x] Live-test fix: ethical exit button no longer self-destructs on first click

### Phase 3 — Cognitive Guard & Hint Ladder (2026-10-25) — ✅ BUILT & DEPLOYED
- [x] `core/hintLadder.ts` pure engine (13/13 Vitest): tier splitting, burnout gate, worked-example fading
- [x] 3.1 Hint ladder in QuizViewer — 3 tiers (conceptual → full hint → answer + 'نراجعها غداً في الدفتر'), `hintLevelUsed` 0-3 sent on every answer
- [x] 3.3 Burnout relief — 3 consecutive wrong OR 2-min stall (IntersectionObserver dwell clocks) → compassionate modal (hint or breather), once per attempt
- [x] 3.4 Session flow — whisper-thin 25-min bar + single gentle break prompt (zero store subscriptions → KaTeX isolation preserved)
- [x] 3.2 Worked-example fading — `**Steps:**` parser + visible/hidden ladder UI; home worker prompt now generates Hint + numbered Steps for every question
- Server untouched: `hintLevelUsed` was already accepted in the RPC payload

### v1.4.1 — Keyless uploader (2026-10-25) — ✅ DONE, LIVE-VERIFIED & CLEANED
- [x] New JWT-protected `POST /api/lectures/register` replaces the browser-side master-key RPC: the uploader's authorization is simply her admin login — zero keys, zero ⚙️, zero setup of any kind
- [x] `lectures.source_pdf_url` added to the SQLAlchemy model (was DB-only; crashed the new endpoint until fixed)
- [x] E2E live-verified from a fresh browser session: login → subject → PDF → one click → lecture queued → daemon claimed within seconds → artifacts cleaned (29 lectures intact)
- Note: live E2E also caught + fixed a sticky-header click-swallowing bug and added client-side PDF magic-byte/size validation, duplicate-number warning, single-file honesty

### v1.4.0 — Split-Plane Pipeline (2026-10-24) — ✅ DONE, E2E-VERIFIED & CLEANED
- [x] Home Control-Plane daemon (`lecture-worker.service` on 192.168.1.5, linger, auto L3 reauth via system Chrome profile)
- [x] Cloud Data-Plane (`media_transfer.yml` + MTProto uploads) with credential purge
- [x] Dashboard: zero-setup upload (no PAT in browser, source_pdf_url via RPC)
- [x] E2E proof: 73MB podcast + 34MB video → Telegram (msgs 203/204) → student streaming HTTP 206
- [x] Full test-residue cleanup (DB/Storage/Telegram/Google/local) — 29 lectures remain
- Live bugs fixed en route: Render dead-end upload path; artifact URL absence (status-based handoff); Bot API 50MB cap + stale `TELEGRAM_BOT_TOKEN` repo secret (401/413) → MTProto routing + secrets refresh; silent local-fallback now raises.

> Nothing currently in progress. Ready to start next task.

<details>
<summary><b>v1.3.1 — Security Hardening (2026-10-24) — ✅ DONE & DEPLOYED (collapsed history)</b></summary>

- [x] Purge hardcoded admin password, autofill helper, and on-screen hint from `/admin` login (server-verified login only, 45s cold-start window)
- [x] Harden `admin_upsert_lecture` RPC with SHA-256 secret digest — verified live via PostgREST (garbage secret → `42501`)
- [x] Remove insecure `SECRET_KEY` / `ADMIN_PASSWORD` defaults in `auth_service.py` (fail closed)
- [x] Rotate live admin password hash + `ADMIN_MASTER_KEY`; split lectures storage policies (public SELECT+INSERT only)
- [x] Restore leitner-parity `ingest_events`; sanitize Render API token from 3 deploy scripts
- [x] **Note (superseded in v1.4.0):** the browser-side ⚙️ GH dispatch token is no longer needed at all — the home daemon owns dispatch. Only `ADMIN_MASTER_KEY` is entered once per device.

</details>

---

## 🟡 Next In Queue (Phase 5 — Fair Play & Anti-Cheat)

### Phase 5: Fair Play, Confidence Assessment & Peer Leaderboards
**Goal:** Promote intrinsic motivation, calibrate meta-cognition, and protect daily streaks fairly.

#### Tasks:
- [ ] **5.1 — Pre-Answer Confidence Assessment UI**
  - Prompt before answer selection: 'متأكد' (+3 bonus), 'مش متأكد' (+1 bonus), 'بتخمين' (0 bonus)
  - Send confidence level in `quiz.question_answered` event (RPC already supports `confidence_rating`)
- [ ] **5.2 — 10-Peer Leaderboard Window**
  - Display user within a local window of 10 peers by XP rather than the full university list
- [ ] **5.3 — Automatic Weekly Streak Freezes**
  - Auto-recharge 2 streak freezes per week (RPC mechanic exists; needs scheduled/weekly trigger)

---

## 🟢 Completed (Recent)

| Date | Feature | Commit |
|---|---|---|
| 2026-10-21 | Phase 2 docs updated to COMPLETED | `3b77c13` |
| 2026-10-21 | Leaderboard self-highlight + nickname edit + spinner | `dbf6661` |
| 2026-10-20 | Visual density sweet spot (typography + sizing) | `68abf54` |
| 2026-10-20 | Segmented selectors for sound/display toggles | `24d57eb` |
| 2026-10-20 | Zero-friction nickname prompt (first-time + edit) | `dbf6661` |
| 2026-10-19 | Phase 2: Leitner Notebook (full implementation) | multiple |
| 2026-10-19 | Phase 1: Smart Resume + Micro-Session + Wrap-Up | multiple |
| 2026-10-19 | Phase 0: CI/CD + baseline freeze v1.0.0-stable | `544e60b` |

---

## 📋 Full Backlog (Behavioral Plan — Phases 4–6)

### Phase 4: Compassionate Feedback
- [ ] Diagnostic error message engine (per question type)
- [ ] Dynamic praise bank (30–40 msgs, boys/girls personas, no repeat < 10)
- [ ] Haptic feedback (`navigator.vibrate(15)` on correct, `vibrate([10,50,10])` on wrong)
- [ ] "مكسبت لليوم، استريح" ethical exit button on quiz completion

### Phase 5: Sybil-Proof Fair Gamification
- [ ] Pre-answer confidence rating (متأكد / مش متأكد) — affects XP multiplier
- [ ] Server-side speed guard (<3000ms = 0 XP) — already in RPC spec, needs quiz wiring
- [ ] 10-peer neighborhood leaderboard (relative ranking, opt-in)
- [ ] 2 automatic weekly streak freeze tokens (Sunday + 1 choice)
- [ ] Daily XP cap enforcement in `ingest_events` RPC

### Phase 6: Collaborative Cohort Challenge
- [ ] `cohort_challenge_contributions` append-only table
- [ ] Weekly collective goal display (e.g. "الدفعة حلت 500 سؤال استاتيكا")
- [ ] Student daily contribution cap
- [ ] Asynchronous materialized rollup (cron or DB trigger)

---

## 🔧 Technical Debt & Polish

| Item | Priority | Notes |
|---|---|---|
| ~~`mistake_notebook` auto-ingest from quiz wrong answers~~ | ✅ Resolved 2026-10-24 | This row was CORRECT (plan docs were optimistic): the live `ingest_events` had regressed to the old Phase-2-core body with no notebook ingestion. Restored via `20261024_fix_ingest_events_leitner_parity.sql` and verified live (400 cap, 3s speed guard, per-question idempotency, notebook auto-ingestion). |
| Hint Ladder `hintLevelUsed` field not wired in quiz events | High | Needed for Phase 3 |
| Neighborhood leaderboard (10-peer) | Medium | Planned Phase 5 |
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
