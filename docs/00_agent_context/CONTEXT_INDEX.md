# 📋 CONTEXT_INDEX.md — Project Feature-to-File Master Index
> Navigation guide for AI agents: maps every feature to its exact files.
> Last Updated: 2026-10-21

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
| App entry point | `app/main.py` |
| Telegram CDN streaming | `app/routes/` + `cloud_lecture_executor.py` |
| NotebookLM pipeline | `app/services/` |
| System prompts (11 subjects) | `app/services/prompt_service.py` |

### 🚀 Deployment & CI/CD
| Feature | File(s) |
|---|---|
| GitHub Actions CI | `.github/workflows/ci.yml` |
| Cloudflare Pages config | `frontend/wrangler.toml` (or `wrangler.jsonc`) |
| Render backend config | `render.yaml` |
| Multi-cloud deploy script | `scripts/deploy_and_verify.py` |

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
