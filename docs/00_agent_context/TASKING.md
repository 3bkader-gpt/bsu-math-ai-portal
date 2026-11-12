# ✅ TASKING.md — Current Backlog & Execution Queue
> Living task tracker. Update after every session.
> Last Updated: 2026-11-12 | Current Version: v1.5.0

---

## 🔴 Recently Completed Infrastructure & Hardening (v1.5.0, 2026-11-11 → 2026-11-12)

### AWS Lightsail Migration & Worker Consolidation (`cbddb0f`, `e8e7a0f`) — ✅ DEPLOYED & VERIFIED
- [x] Migrated FastAPI backend (`bsu-math-api.service`) and unified worker (`lecture-worker.service` with `LOCAL_DATA_PLANE=1`) onto AWS Lightsail `bsu-math-backend` (`13.63.217.38`, Ubuntu 24.04 kernel `7.0.0-1017-aws`, Caddy HTTPS at `https://api.bsumath.bond`, custom frontend domain `https://bsumath.bond`).
- [x] Retired Render.com (`render.yaml`), GitHub Actions `media_transfer.yml`, `NOTEBOOKLM_STORAGE_STATE_B64`, legacy `telegram_cloud_bot.py`, and home-server `192.168.1.5` worker hosting.
- [x] Fixed Typst Pandoc 3.9 compilation regressions (`sect` -> `inter`, empty `sqrt("")`, `#strong[...]` call spacing, mono font stack) — verified `72/72` study guides OK on Lightsail.
- [x] Updated NotebookLM dynamic account pool (`default`, `acc_mo`, `acc_p1`, `acc_p2`, `acc_passplay`; removed `acc_p4`) + automated 4h session refresh (`scripts/refresh_notebooklm_auth.py` + `notebooklm-refresh.timer`) + `_sync_sibling_sid_cookies`.
- [x] Added NVMe LRU caches (`app/services/media_cache.py`): `/var/cache/bsu-media` (`15 GB` max, single-flight background warm-up preventing Telegram `FloodWait`, full `Range 206` support) + `/var/cache/bsu-pdf` (`1 GB` max, `SHA-256` key, `Cache-Control: public, max-age=86400`, `ETag`, `304 Not Modified`).
- [x] Isolated `lecture-worker.service` cgroup resources (`MemoryHigh=700M`, `MemoryMax=900M`, `CPUQuota=60%`, `Nice=15`, `OOMScoreAdjust=500`).
- [x] Installed `postgresql-client-17` (`pg_dump 17.11`) matching Supabase PostgreSQL 17.11; added `scripts/db_backup_and_prune.py` + `bsu-db-backup.timer` (daily local 14d + Telegram private channel archive) + `bsu-telemetry-prune.timer` (weekly >30d `activity_events` cleanup) + Lightsail `AutoSnapshot`, `ufw`, `fail2ban`, `2 GB Swap`.
- [x] Verified full local `pytest tests/ -v` (`70 passed`), GitHub Actions CI (`43213802393` `success`), and live `MISS` -> `HIT` -> `304` / `206` endpoints.

---

## 🟢 Active / Feature Sprints (Gamification Phases 3–6)

### Phase 6 — Sybil-Proof Cohort Collaboration (2026-10-26) — ✅ BUILT & TESTED
- [x] `20261026_cohort_challenges.sql`: Non-blocking append-only contributions schema + daily per-student cap guard (15/day) + `get_active_cohort_challenge` and `record_cohort_contribution` RPCs.
- [x] `core/cohortChallenge.ts` pure engine (11/11 Vitest): Progress percentage math, milestone stage messages (25%, 50%, 75%, 100%), and daily quota checks.
- [x] `CohortChallengeWidget.tsx`: Beautiful cohort goal progress widget displaying collective count, milestone motivation, and individual contribution quotas.
- [x] Wired into home page (`page.tsx`) and student leaderboard modal (`StudentGamificationPill.tsx`) + auto-contribute on correct quiz answers (`lecture/page.tsx`).

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

## 🟢 Completed Roadmap (Phases 0–6 All Complete)

| Date | Feature | Commit |
|---|---|---|
| 2026-10-26 | Phase 6: Sybil-Proof Collaborative Cohort Challenge (Append-Only + Daily Cap + Widget) | Current |
| 2026-10-26 | Phase 5: Confidence Assessment + Neighborhood Leaderboard + Weekly Freezes | `88672f9` |
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

## 🔧 Technical Debt & Remaining Backlog (SSOT)

> **المصدر الوحيد المعتمد (SSOT):** راجع [`docs/01_planning/UNBUILT_FEATURES_SSOT.md`](../01_planning/UNBUILT_FEATURES_SSOT.md) للتفاصيل الكاملة لكل الميزات غير المبنية (Micro-Tutor، عارض `MindMapViewer`، Slide RAG، Doctor Audio-to-Notes، Exam Cloning، لوحة تحليلات الأدمن، تفكيك `[OPT-FE-01]`، وتنظيف Git History).  
> *(تم استبعاد PWA وPush Notifications وCustom Exam Builder والـ Formula Sheet لأنها تبيّن أنها مُنفذة بالفعل في الكود).*

| Item | Priority | Notes |
|---|---|---|
| ~~`mistake_notebook` auto-ingest from quiz wrong answers~~ | ✅ Resolved 2026-10-24 | Restored via `20261024_fix_ingest_events_leitner_parity.sql` and verified live. |
| ~~Hint Ladder `hintLevelUsed` field not wired in quiz events~~ | ✅ Resolved 2026-10-25 | Wired in Phase 3 and verified in telemetry. |
| ~~Neighborhood leaderboard (10-peer)~~ | ✅ Resolved 2026-10-26 | Built in Phase 5 with actionable next-rank distance banner. |
| ~~PWA / offline support & Push notifications~~ | ✅ Built | Implemented (`public/manifest.json`, `public/sw.js`, `app/routes/notifications.py`). |
| AI Micro-Tutor + `MindMapViewer` (`mind_map_json`) | High | See `UNBUILT_FEATURES_SSOT.md` §1.1–1.3 |
| Admin dashboard gamification analytics | Medium | KPI SQL views exist in DB; UI charts pending |
| Decompose monolithic `page.tsx` / `admin/dashboard/page.tsx` (`OPT-FE-01`) | Low | Working in prod; optional refactor |
| Git history scrubbing (`git filter-repo`) | Low | Old PAT + admin pass already rotated/revoked |

---

## 🚦 Quality Gate (Before Any Commit)

```bash
cd frontend
npm run typecheck   # Must: 0 TypeScript errors
npm run test        # Must: all Vitest tests pass
npm run build       # Must: clean Turbopack build, 0 warnings
```
