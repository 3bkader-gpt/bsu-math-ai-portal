# 📋 CONTEXT_INDEX.md — Project Feature-to-File Master Index
> Navigation guide for AI agents: maps every feature to its exact files.
> Last Updated: 2026-11-12 (v1.5.0)

---

## Feature → File Map

### 🎓 Student Portal (Homepage)
| Feature | File(s) |
|---|---|
| Subject grid & search | `frontend/src/app/page.tsx` |
| Smart Resume hero card | `frontend/src/modules/gamification/ui/SmartResumeCard.tsx` |
| 5-min micro-session modal | `frontend/src/modules/gamification/ui/QuickMicroSessionModal.tsx` |
| Session wrap-up (ethical exit) | `frontend/src/modules/gamification/ui/EthicalWrapUpModal.tsx` |
| Mistake notebook modal | `frontend/src/modules/gamification/ui/MistakeNotebookModal.tsx` |
| Lecture view (all tabs) | `frontend/src/app/lecture/page.tsx` |
| Mobile navigation drawer | `frontend/src/components/MobileNavDrawer.tsx` |
| Theme toggle (dark/light) | `frontend/src/components/ThemeToggle.tsx` |

### 🎮 Gamification Engine
| Feature | File(s) |
|---|---|
| XP calculation (pure) | `frontend/src/modules/gamification/core/xp.ts` |
| Streak logic (Cairo TZ) | `frontend/src/modules/gamification/core/streak.ts` |
| Achievement criteria | `frontend/src/modules/gamification/core/achievements.ts` |
| Root event reducer | `frontend/src/modules/gamification/core/reducer.ts` |
| Domain types | `frontend/src/modules/gamification/core/types.ts` |
| Gamification rules config | `frontend/src/config/gamification-rules.ts` |
| Zustand store | `frontend/src/modules/gamification/store/useGamificationStore.ts` |
| IndexedDB outbox + sync | `frontend/src/modules/gamification/sync/outbox.ts` |
| Background sync island | `frontend/src/modules/gamification/ui/GamificationHost.tsx` |
| Floating XP pill + modal | `frontend/src/components/gamification/StudentGamificationPill.tsx` |
| Event bus (pub/sub) | `frontend/src/shared/events/bus.ts` |
| Event type contracts | `frontend/src/shared/events/types.ts` |

### 📔 Leitner Mistake Notebook (Phase 2)
| Feature | File(s) |
|---|---|
| UI modal (review cards) | `frontend/src/modules/gamification/ui/MistakeNotebookModal.tsx` |
| React hook + state | `frontend/src/modules/gamification/notebook/mistakeManager.ts` |
| Supabase RPC wrappers | `frontend/src/modules/gamification/supabase/gamification.ts` → `fetchDueMistakes`, `submitMistakeReviewRpc` |
| DB table + RPC SQL | `supabase/migrations/20261020_phase2_leitner_notebook.sql` |

### 📍 Smart Resume (Phase 1)
| Feature | File(s) |
|---|---|
| State manager (local + remote) | `frontend/src/modules/gamification/resume/resumeManager.ts` |
| UI card | `frontend/src/modules/gamification/ui/SmartResumeCard.tsx` |
| DB columns | `supabase/migrations/20261020_add_resume_state.sql` |

### 🔐 Auth & Session
| Feature | File(s) |
|---|---|
| Anonymous session creation | `frontend/src/modules/gamification/supabase/auth.ts` → `getOrCreateAnonymousSession()` |
| Nickname persistence | `frontend/src/modules/gamification/supabase/auth.ts` → `updateStudentProfile()` |
| Supabase client | `frontend/src/modules/gamification/supabase/client.ts` |
| TypeScript types | `frontend/src/modules/gamification/supabase/types.ts` |

### 📡 Telemetry (Event Tracking)
| Feature | File(s) |
|---|---|
| Telemetry collector | `frontend/src/modules/telemetry/collector.ts` |
| Audio/video progress detector | `frontend/src/modules/telemetry/detectors/mediaDetector.ts` |
| Quiz answer detector | `frontend/src/modules/telemetry/detectors/quizDetector.ts` |
| Flashcard detector | `frontend/src/modules/telemetry/detectors/flashcardDetector.ts` |
| Study guide detector | `frontend/src/modules/telemetry/detectors/studyGuideDetector.ts` |

### 🔊 Audio & Effects
| Feature | File(s) |
|---|---|
| Web Audio synthesizer | `frontend/src/lib/audio/soundEngine.ts` |
| Canvas confetti engine | `frontend/src/lib/effects/confetti.ts` |
| KaTeX render cache | `frontend/src/lib/katexRenderCache.ts` |
| Math renderer component | `frontend/src/components/common/MathRenderer.tsx` |

### 🗄️ Database (Supabase)
| Feature | File(s) |
|---|---|
| Core gamification schema | `supabase/migrations/20261019_phase2_gamification_schema.sql` |
| `ingest_events` RPC (patched) | `supabase/migrations/20261020_fix_ingest_events_rpc.sql` |
| Leitner notebook schema | `supabase/migrations/20261020_phase2_leitner_notebook.sql` |
| KPI views | `supabase/migrations/20261020_phase2_kpi_views.sql` |

### ⚙️ Backend (FastAPI + Python)
| Feature | File(s) |
|---|---|
| App entry point | `app/main.py`, `app/config.py` |
| Media streaming + 15GB NVMe LRU cache | `app/routes/stream.py`, `app/services/media_cache.py`, `app/services/telethon_service.py` |
| Typst PDF export + 1GB cache + ETag | `app/routes/study_guides.py`, `app/services/typst_service.py` |
| Portable upload & lectures API | `app/routes/upload.py`, `app/routes/lectures.py` |
| NotebookLM pipeline & cookie pool | `home_worker.py`, `media_transfer_worker.py`, `app/services/notebooklm_service.py`, `app/services/notebooklm_client.py` |
| System prompts (11 subjects) | `app/services/prompt_service.py`, `prompts/` |
| Backend tests (70 tests) | `tests/test_hardening_cache.py`, `tests/test_typst_export.py`, `tests/test_cloud_fixes.py`, `tests/test_phase*.py` |

### 📌 Planning & Backlog (Single Source of Truth)
| Feature | File(s) |
|---|---|
| Unbuilt Non-AI features & open tech debt (Active SSOT) | `docs/01_planning/UNBUILT_FEATURES_SSOT.md` |
| Parked AI features (no active LLM provider yet) | `docs/99_parked_ai/PARKED_AI_FEATURES.md` |
| Active sprint & execution backlog | `docs/00_agent_context/TASKING.md` |
| Agent onboarding & ops runbook | `docs/00_agent_context/AI_HANDOFF.md` |

### 🚀 Deployment, Automation & Operations (AWS Lightsail)
| Feature | File(s) |
|---|---|
| GitHub Actions CI | `.github/workflows/ci.yml` |
| Cloudflare Pages config | `frontend/wrangler.toml` / `frontend/next.config.ts` |
| Daily Supabase `pg_dump` backup & 30d prune | `scripts/db_backup_and_prune.py` (`bsu-db-backup.timer`, `bsu-telemetry-prune.timer`) |
| 4h NotebookLM cookie refresh | `scripts/refresh_notebooklm_auth.py` (`notebooklm-refresh.timer`) |
| Worker dependencies (Playwright, NLM) | `requirements-worker.txt` |
| Lightsail systemd units (on host) | `/etc/systemd/system/bsu-math-api.service`, `lecture-worker.service` (`MemoryMax=900M`, `CPUQuota=60%`, `Nice=15`) |
| Reverse proxy (on host) | `/etc/caddy/Caddyfile` (`api.bsumath.bond`) |

---

## Supabase Table Quick Reference

| Table | Purpose |
|---|---|
| `public.profiles` | Student XP, level, streak, nickname, persona, freeze tokens |
| `public.activity_events` | Raw audit trail of all XP-earning events |
| `public.daily_activity` | Rolled-up daily stats per student |
| `public.user_achievements` | Unlocked badge timestamps |
| `public.lecture_progress` | Per-lecture progress + `media_progress` JSONB (resume state) |
| `public.mistake_notebook` | Leitner boxes 1–5, next_review_date, is_mastered |

## Supabase RPC Quick Reference

| RPC | Called from | Purpose |
|---|---|---|
| `ingest_events(p_events jsonb)` | `outbox.ts` | Atomic batch XP ingestion, idempotent |
| `submit_mistake_review(hash, correct, ms)` | `mistakeManager.ts` | Advance/demote Leitner box, award XP |
| `update_resume_state(lecture_id, tab, progress)` | `resumeManager.ts` | Persist playback position |
| `get_cohort_leaderboard(limit)` | `StudentGamificationPill.tsx` | Anonymized top-N ranking |
