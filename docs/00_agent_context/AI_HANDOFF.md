# 🤖 AI_HANDOFF.md — Agent Context & Onboarding Document
> **READ THIS FIRST.** This is the single most important file for any AI agent working on this project.
> Last Updated: 2026-10-25 | Version: v1.4.1

---

## 1. Project Identity

| Field | Value |
|---|---|
| **Project Name** | BSU Math & AI Portal (بوابة قسم الرياضيات الذكية) |
| **University** | Faculty of Science, Beni-Suef University, Egypt |
| **Purpose** | Convert dense academic PDFs into multi-modal learning assets (podcast, video, quiz, flashcards, study guide) and serve them via a gamified student web portal |
| **Live URL** | https://bsu-math-ai-portal.pages.dev |
| **Backend API** | https://bsu-math-api.onrender.com |
| **Supabase Project** | `cjmlnpdtfclzcvehebsv` (Frankfurt, eu-central-1) |
| **GitHub Repo** | https://github.com/3bkader-gpt/bsu-math-ai-portal |

---

## 2. Tech Stack (Source of Truth)

### Frontend
- **Framework:** Next.js 16 (App Router) + TypeScript + Turbopack
- **Styling:** Tailwind CSS v4 + CSS custom properties (design tokens in `globals.css`)
- **Icons:** Lucide React
- **Math Rendering:** KaTeX (forced LTR, isolated from gamification re-renders)
- **State:** Zustand (`useGamificationStore`) + IndexedDB outbox
- **Fonts:** Cairo (Arabic UI) + Outfit (numbers/XP)
- **Hosting:** Cloudflare Pages (via Wrangler CLI)

### Backend
- **Runtime:** Python 3.12 + FastAPI
- **AI Pipeline:** `notebooklm-py` (Playwright automation for Google NotebookLM)
- **Storage:** Telegram Cloud (MTProto via Telethon) — free unlimited CDN
- **Database:** Supabase PostgreSQL 17 (via Supavisor pooler for IPv6 compat)
- **Hosting:** Render.com (free tier with keepalive GitHub Action)

### Production Pipeline — Split-Plane Architecture (v1.4.0, 2026-10-24)
The NotebookLM Google session **never lives in CI** (datacenter IP churn kills it). See `BLUEPRINT.md`.
- **Control Plane — home server `abkader@192.168.1.5`:** `lecture-worker.service` (systemd user unit, linger enabled, `Restart=always`) runs `home_worker.py`: polls `lectures WHERE status='queued'` every 15s, drives NotebookLM, auto re-mints dead cookies by driving **system Chrome against `/home/abkader/.notebooklm-profile`** (L3 `browser="chrome"`), generates texts, waits for Google-side media readiness by status (ZERO media bytes at home), writes `media_handoffs` + dispatches the cloud plane. **Ops:** `ssh abkader@192.168.1.5`, logs `journalctl --user -u lecture-worker -f`, updates `cd ~/bsu-math-ai-portal && git pull && systemctl --user restart lecture-worker`.
- **Data Plane — GitHub Actions `media_transfer.yml` + `media_transfer_worker.py`:** pulls media straight from Google (one-shot cookie jar from the handoff row) → uploads to Telegram via **Telethon MTProto (2GB cap; Bot API is 50MB-capped and fails 401/413 on large files)** → registers assets → `status='completed'` → purges the credential-bearing handoff row.
- **Dashboard upload flow (uploader needs ZERO setup, v1.4.1):** PDF → Supabase Storage → `POST /api/lectures/register` (JWT-protected; authorizes with her admin login — no keys in any browser; the master-key RPC remains as a server-side API path) → daemon claims within 15s. No GitHub PAT in any browser.
- **Known session facts:** the legacy `TELETHON_SESSION_STRING` user session is DEAD (`AuthKeyDuplicated`) — do not use it; the GitHub repo secrets `TELEGRAM_*` were refreshed 2026-10-24 to match the live `.env` values.

### Key Infrastructure Files
```
d:\الكليه\BOT\
├── frontend/              # Next.js app (PRIMARY WORKSPACE)
├── app/                   # FastAPI backend
├── supabase/migrations/   # All DB schema migrations (source of truth)
├── docs/                  # All planning & architecture docs
├── scripts/               # Deploy + verify scripts
└── render.yaml            # Render deployment config
```

---

## 3. Current Project State (as of 2026-10-24)

### Security Posture (v1.3.1 hardening — 2026-10-24)
- **No secrets in the client bundle. EVER.** No admin passwords, no GitHub PATs, no fallback keys. Violations were purged on 2026-10-24.
- `/admin` login is exclusively server-verified (FastAPI JWT). The old client-fabricated `bsu_master_academic_*` session bypass was removed; such tokens are auto-purged on page load.
- Cloud-ops credentials (`ADMIN_MASTER_KEY`, `GITHUB_DISPATCH_TOKEN`) live in backend env only and are provisioned to the dashboard **in the login response**, stored per-device in localStorage. A ⚙️ settings modal in the dashboard manages them manually.
- `admin_upsert_lecture` RPC authorizes via SHA-256 digest of `ADMIN_MASTER_KEY` (digest-only in migration SQL). Insecure defaults in `auth_service.py` (`SECRET_KEY`, `ADMIN_PASSWORD`) were removed — fail closed.
- Lectures storage bucket: public SELECT + INSERT only; UPDATE/DELETE are service-role only.
- **Pending user actions:** revoke the leaked GitHub PAT (was still valid on 2026-10-24), set the rotated env vars on Render, redeploy backend + frontend.

### Gamification Engine — Phase Status
| Phase | Title | Status |
|---|---|---|
| Phase 0 | Baseline Freeze & CI/CD | ✅ COMPLETE |
| Phase 1 | Frictionless Habit Ignition (Smart Resume, Micro-Session, Wrap-Up) | ✅ COMPLETE |
| Phase 2 | Leitner Mistake Notebook (Spaced Repetition) | ✅ COMPLETE (live parity restored 2026-10-24) |
| Phase 3 | Cognitive Guard & Hint Ladder | 📋 PLANNED |
| Phase 4 | Compassionate Feedback (Math Anxiety Reduction) | 📋 PLANNED |
| Phase 5 | Sybil-Proof Fair Gamification | 📋 PLANNED |
| Phase 6 | Collaborative Cohort Challenge | 📋 PLANNED |

### ⚠️ Production Function Parity Lesson (2026-10-24)
The live `ingest_events` had silently regressed to the older Phase-2-core body (500 XP cap, no speed guard, no mistake auto-ingestion) despite the migration file being "deployed". Trust nothing: **verify live `pg_proc` source against migration files** when behavioral parity matters. Restored via `20261024_fix_ingest_events_leitner_parity.sql`.

### Latest Commits
- `9532834` — feat(security): RLS across all tables + admin_upsert_lecture RPC
- `3b77c13` — docs: mark Phase 2 COMPLETED
- `dbf6661` — leaderboard self-highlight + edit nickname + loading spinner

### Deployed Database Migrations (in order)
1. `20261016_add_semester_to_subjects.sql`
2. `20261019_phase2_gamification_schema.sql` — core profiles, XP, streak, badges
3. `20261020_add_resume_state.sql` — last_active_lecture_id, last_active_tab
4. `20261020_fix_ingest_events_rpc.sql` — patched ingest RPC
5. `20261020_lockdown_kpi_views.sql`
6. `20261020_phase2_kpi_views.sql`
7. `20261020_phase2_leitner_notebook.sql` — mistake_notebook table + submit_mistake_review RPC
8. `20261020_phase2_security_hardening.sql`
9. `20261023_enable_rls_subjects_lectures.sql`
10. `20261024_admin_upsert_lecture_and_security.sql` — admin RPC + media_assets/users RLS
11. `20261024_admin_rpc_sha256_secret.sql` — **LIVE-DEPLOYED** SHA-256 secret gate
12. `20261024_fix_ingest_events_leitner_parity.sql` — **LIVE-DEPLOYED** behavioral parity restore
13. `20261024_lectures_storage_least_privilege.sql` — **LIVE-DEPLOYED** storage policy split
14. `20261024_split_plane_handoffs.sql` — **LIVE-DEPLOYED** `lectures.source_pdf_url` + `media_handoffs` (service-role only) + 8-arg RPC

---

## 4. Architecture Rules (NEVER VIOLATE)

1. **Pure Core:** `src/modules/gamification/core/` has ZERO React/DOM imports. It is pure TypeScript tested by Vitest.
2. **Server Authority:** XP, streaks, and Leitner box transitions happen ONLY via Supabase SECURITY DEFINER RPCs. Never trust client-side XP claims.
3. **Cairo Timezone:** All date calculations use `Africa/Cairo` timezone. Never use UTC dates for streak logic.
4. **No Direct Mutations:** Clients READ from Supabase tables via RLS. All WRITES go through RPCs (`ingest_events`, `submit_mistake_review`, `update_resume_state`).
5. **KaTeX Isolation:** `StudyGuideViewer` and `FlashcardsViewer` must have ZERO gamification state subscriptions. Gamification is an isolated island via `<GamificationHost />`.
6. **Domain Boundaries (ESLint enforced):**
   - `modules/content` can import `shared/events` only (not gamification)
   - `modules/gamification` can import `shared` only
   - `core/` cannot import React or DOM
7. **Zero Secrets in the Client Bundle:** No passwords, PATs, or fallback keys in frontend source or `NEXT_PUBLIC_*` env. Cloud-ops keys are provisioned by the backend login response and stored per-device in localStorage.

---

## 5. Key File Map (for rapid navigation)

```
frontend/src/
├── app/
│   ├── page.tsx                          # Homepage (subjects grid + SmartResumeCard)
│   └── lecture/page.tsx                  # Lecture view (all tabs + gamification)
├── components/
│   └── gamification/
│       ├── StudentGamificationPill.tsx   # Floating XP pill + modal drawer + leaderboard
│       └── GamificationInitializer.tsx   # Mounts event listeners
├── modules/
│   └── gamification/
│       ├── core/                         # Pure TS engine (xp, streak, achievements, reducer)
│       ├── notebook/mistakeManager.ts    # useMistakeNotebook hook
│       ├── resume/resumeManager.ts       # Smart resume (local + throttled remote sync)
│       ├── store/useGamificationStore.ts # Zustand store
│       ├── supabase/
│       │   ├── auth.ts                   # getOrCreateAnonymousSession + nickname sync
│       │   ├── gamification.ts           # All RPC wrappers (ingest, leaderboard, mistakes)
│       │   └── types.ts                  # Shared TypeScript types
│       ├── sync/outbox.ts                # IndexedDB outbox + periodic flush
│       └── ui/
│           ├── GamificationHost.tsx      # Background sync island
│           ├── SmartResumeCard.tsx       # "Resume where you left off" hero card
│           ├── QuickMicroSessionModal.tsx # 5-min session (3 cards + 1 quiz)
│           ├── EthicalWrapUpModal.tsx    # Session summary + quiet hours
│           └── MistakeNotebookModal.tsx  # Leitner review UI
├── shared/events/
│   ├── bus.ts                            # Event pub/sub with buffering queue
│   └── types.ts                          # All AppEvent & GamificationEffect types
├── config/gamification-rules.ts          # XP table, level formula, badge criteria
└── lib/
    ├── audio/soundEngine.ts              # Web Audio API procedural synth
    ├── effects/confetti.ts               # Canvas confetti engine
    └── katexRenderCache.ts               # In-memory KaTeX cache
```

---

## 6. Conventional Commit Rules (STRICT)

```
feat(scope):     New feature
fix(scope):      Bug fix
perf(scope):     Performance improvement
docs(scope):     Documentation only
chore(scope):    Tooling / config
refactor(scope): Refactor (no behavior change)
test(scope):     Test only
```

**Scopes in use:** `gamification`, `ui`, `auth`, `sync`, `telemetry`, `docs`, `layout`, `security`

**Always run before committing:**
```bash
npm run typecheck   # 0 errors required
npm run test        # All Vitest tests must pass
npm run build       # Clean Turbopack build
```

---

## 7. Student Personas & UX Language

| Persona | Trigger | Accent Color |
|---|---|---|
| Boys (`boys`) | Default | Teal `#0D9488` / `#2DD4BF` |
| Girls (`girls`) | `localStorage.bsu_portal_persona === 'girls'` | Rose `#FF6584` / `#F43F5E` |

**Voice:** Warm Egyptian Arabic — "يا بطل", "عاش", "برافو عليك". Never formal Modern Standard Arabic in UI copy.

**Error Messages:** Never "إجابة خاطئة ❌". Use "قريب جداً! الخطأ ده شائع في..." (compassionate diagnostic).

---

## 8. localStorage Keys (all prefixed `bsu_portal_`)

| Key | Value |
|---|---|
| `bsu_portal_persona` | `'boys'` \| `'girls'` |
| `bsu_portal_audio_muted` | `'true'` \| `'false'` |
| `bsu_portal_student_nickname` | string (display name) |
| `bsu_portal_display_mode` | `'comfortable'` \| `'compact'` |
| `bsu_smart_resume_state` | JSON `ResumeState` object |
| `bsu_session_quiet_until` | Unix timestamp (ms) |
| `adminToken` | FastAPI admin JWT (server-issued only) |
| `bsu_admin_master_key` | Cloud-ops key for `admin_upsert_lecture` RPC (from login response) |
| `gh_dispatch_token` | GitHub dispatch PAT (from login response) |

---

## 9. Referenced Documentation Index

| Doc | Path | Purpose |
|---|---|---|
| Product Brief | `/docs/00_agent_context/PROJECT_BRIEF.md` | Vision, users, goals |
| Architecture | `/docs/00_agent_context/ARCHITECTURE.md` | System design |
| Database | `/docs/00_agent_context/DATABASE.md` | All tables & RPCs |
| Design System | `/docs/00_agent_context/DESIGN_SYSTEM.md` | Colors, typography, components |
| Git Workflow | `/docs/00_agent_context/GIT_WORKFLOW.md` | Branching & commit rules |
| Context Index | `/docs/00_agent_context/CONTEXT_INDEX.md` | Full file→feature map |
| Tasking | `/docs/00_agent_context/TASKING.md` | Current backlog & next steps |
| Gamification Roadmap | `/docs/01_planning/GAMIFICATION_ROADMAP.md` | 6-phase gamification retrospective |
| Behavioral Plan | `/docs/02_architecture/BEHAVIORAL_ARCHITECTURE_PLAN.md` | Psychology & UX engine specs |
| Manual Testing | `/docs/03_testing/MANUAL_TESTING_CHECKLIST.md` | QA checklist |
