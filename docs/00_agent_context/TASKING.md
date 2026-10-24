# ✅ TASKING.md — Current Backlog & Execution Queue
> Living task tracker. Update after every session.
> Last Updated: 2026-10-21 | Current Version: v1.3.0

---

## 🔴 Active Sprint (Now)

### v1.3.1 — Security Hardening (2026-10-24) — ✅ DONE & DEPLOYED (frontend + backend + DB verified live)
- [x] Purge hardcoded admin password, autofill helper, and on-screen hint from `/admin` login (server-verified login only, 45s cold-start window)
- [x] Remove chunked GitHub PAT from dashboard bundle → provisioned server-side on login, stored per-device in localStorage (`gh_dispatch_token`)
- [x] Harden `admin_upsert_lecture` RPC with SHA-256 secret digest (`20261024_admin_rpc_sha256_secret.sql`) — **verified live via PostgREST**: garbage secret → `42501`, real key → success
- [x] Remove insecure `SECRET_KEY` / `ADMIN_PASSWORD` defaults in `auth_service.py` (fail closed)
- [x] Rotate live admin password hash (old compromised default now returns 401) + new `ADMIN_MASTER_KEY` in `.env`
- [x] Split lectures storage `FOR ALL public` policy → public SELECT+INSERT, service-role ALL — deployed live
- [x] Restore leitner-parity `ingest_events` (400 cap, speed guard, idempotency, notebook auto-ingestion) — deployed live
- [x] Frontend deployed to Cloudflare Pages (bundle verified clean); backend deployed to Render (commit `5f63c9c` live)
- [x] Sanitize 3 deploy scripts that carried the Render API token in-repo → `RENDER_API_KEY` from `.env`
- [x] **Deployment lesson recorded:** the first hardening attempt was silently rolled back by a same-transaction error-handling rollback; re-applied with autocommit and verified from an external connection. Always verify security changes through a fresh session.

**Owner decisions (2026-10-24):** the leaked GitHub PAT stays active and Render env vars stay unchanged (accepted risk). Consequence: `ops_key`/`gh_dispatch_token` are NOT auto-provisioned at login — paste `ADMIN_MASTER_KEY` (from local `.env`) and a GitHub dispatch token into the dashboard ⚙️ settings modal once per device to enable the autonomous cloud pipeline.

---

## 🟡 Next In Queue (Phase 3 — Behavioral Plan)

### Phase 3: Cognitive Guard & Hint Ladder
**Goal:** Break down complex proofs and preserve learning momentum when students are stuck.

#### Tasks:
- [ ] **3.1 — 3-Tier Hint Ladder UI**
  - Hint 0: General conceptual direction ("فكر في خاصية التوزيع")
  - Hint 1: First concrete step ("ابدأ بعزل المجهول")
  - Hint 2: Full worked solution (marks as "رجعنا لها بكره" in notebook)
  - Track `hintLevelUsed: 0|1|2|3` in `quiz.question_answered` event
  - Integrate into `QuizViewer` component in `lecture/page.tsx`

- [ ] **3.2 — Worked Example Fading**
  - First question: fully solved
  - Second: missing last step
  - Third: missing last two steps
  - Requires new question type flag in `content.json`

- [ ] **3.3 — Burnout / Frustration Detector**
  - Trigger: 3 consecutive wrong answers OR >2min on single question
  - UI response: compassionate modal offering hint or difficulty reduction
  - Client-side only (no RPC needed)
  - Add to `QuizViewer` local state

- [ ] **3.4 — 25-Minute Session Timer** (optional visual)
  - Subtle progress bar in lecture header
  - At 25 min: gentle "أخد استراحة؟" prompt (not forced)

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
