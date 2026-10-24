# 🤖 AI_HANDOFF.md — Agent Context & Onboarding Document
> **READ THIS FIRST.** This is the single most important file for any AI agent working on this project.
> Last Updated: 2026-10-21 | Version: v1.3.x

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

## 3. Current Project State (as of 2026-10-21)

### Gamification Engine — Phase Status
| Phase | Title | Status |
|---|---|---|
| Phase 0 | Baseline Freeze & CI/CD | ✅ COMPLETE |
| Phase 1 | Frictionless Habit Ignition (Smart Resume, Micro-Session, Wrap-Up) | ✅ COMPLETE |
| Phase 2 | Leitner Mistake Notebook (Spaced Repetition) | ✅ COMPLETE |
| Phase 3 | Cognitive Guard & Hint Ladder | 📋 PLANNED |
| Phase 4 | Compassionate Feedback (Math Anxiety Reduction) | 📋 PLANNED |
| Phase 5 | Sybil-Proof Fair Gamification | 📋 PLANNED |
| Phase 6 | Collaborative Cohort Challenge | 📋 PLANNED |

### Latest Commits
- `3b77c13` — docs: mark Phase 2 COMPLETED
- `dbf6661` — leaderboard self-highlight + edit nickname + loading spinner
- `68abf54` — visual density sweet spot (typography + component sizing)
- `24d57eb` — segmented selectors for sound/display toggles

### Deployed Database Migrations (in order)
1. `20261016_add_semester_to_subjects.sql`
2. `20261019_phase2_gamification_schema.sql` — core profiles, XP, streak, badges
3. `20261020_add_resume_state.sql` — last_active_lecture_id, last_active_tab
4. `20261020_fix_ingest_events_rpc.sql` — patched ingest RPC
5. `20261020_lockdown_kpi_views.sql`
6. `20261020_phase2_kpi_views.sql`
7. `20261020_phase2_leitner_notebook.sql` — mistake_notebook table + submit_mistake_review RPC
8. `20261020_phase2_security_hardening.sql`

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
