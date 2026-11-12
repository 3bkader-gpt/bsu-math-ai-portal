# 🤖 AI_HANDOFF.md — Agent Context & Onboarding Document
> **READ THIS FIRST.** This is the single most important file for any AI agent working on this project.
> Last Updated: 2026-11-12 | Version: v1.5.0

---

## 1. Project Identity

| Field | Value |
|---|---|
| **Project Name** | BSU Math & AI Portal (بوابة قسم الرياضيات الذكية) |
| **University** | Faculty of Science, Beni-Suef University, Egypt |
| **Purpose** | Convert dense academic PDFs into multi-modal learning assets (podcast, video, quiz, flashcards, study guide, compiled Arabic+Math PDFs) and serve them via a gamified student web portal |
| **Live Frontend URLs** | https://bsumath.bond (Cloudflare Pages: https://bsu-math-ai-portal.pages.dev) |
| **Backend API** | https://api.bsumath.bond (AWS Lightsail `13.63.217.38` behind Caddy HTTPS) |
| **Supabase Project** | `cjmlnpdtfclzcvehebsv` (Frankfurt, `eu-central-1`, PostgreSQL 17.11) |
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
- **Hosting:** Cloudflare Pages (`bsumath.bond` / `bsu-math-ai-portal.pages.dev`)

### Backend & Infrastructure (AWS Lightsail Single-Node Production)
- **Host:** AWS Lightsail `bsu-math-backend` (`eu-north-1`, `small_3_0`: `2 vCPU`, `2 GB RAM` + `2 GB Swap`, `60 GB NVMe SSD` — ~50 GB free), Ubuntu 24.04 LTS (kernel `7.0.0-1017-aws`), static IP `13.63.217.38` (`ssh aws`).
- **Reverse Proxy:** Caddy (`api.bsumath.bond` -> `127.0.0.1:8000`, `flush_interval -1`).
- **Runtime:** Python 3.12 + FastAPI (`bsu-math-api.service`, Uvicorn 1 worker).
- **AI Pipeline:** `notebooklm-py` + headless Google Chrome (`lecture-worker.service` running `home_worker.py` with `LOCAL_DATA_PLANE=1`). Legacy Render (`render.yaml`), GitHub Actions `media_transfer.yml`, and home server `192.168.1.5` worker hosting were retired and cleaned up.
- **Storage & Caching:** Telegram Cloud (MTProto via Telethon) + **Local NVMe LRU Caches** (`app/services/media_cache.py`):
  - Media cache: `/var/cache/bsu-media` (`15 GB` max LRU) with single-flight background fill preventing Telegram `FloodWait` + byte-range `206` support (`X-Media-Cache: HIT|MISS`).
  - Study Guide PDF cache: `/var/cache/bsu-pdf` (`1 GB` max LRU), keyed by `SHA-256(asset_id, lecture_num, content_text)` with `Cache-Control: public, max-age=86400`, `ETag`, and `304 Not Modified` (`X-PDF-Cache: HIT|MISS`).
- **Typst PDF Compilation:** Pandoc 3.9 + Typst (`app/services/typst_service.py` + `app/routes/study_guides.py`) with bilingual Arabic RTL + KaTeX/Typst math normalization (`sect` -> `inter`, empty `sqrt("")`, `#strong[...]` call spacing, `("DejaVu Sans Mono", "Courier New")` font stack).
- **Database:** Supabase PostgreSQL 17.11 (via Supavisor session pooler port `5432`, ~18 MB size).
- **Backups, Retention & Hardening:**
  - `postgresql-client-17` (`pg_dump 17.11`) + [`scripts/db_backup_and_prune.py`](../../scripts/db_backup_and_prune.py): daily `bsu-db-backup.timer` (`03:30 UTC`) saves gzipped `.sql.gz` backups to `/var/backups/bsu-db` (14-day local retention, min 3 kept) and uploads archive to the private Telegram channel; weekly `bsu-telemetry-prune.timer` (Sunday `04:00 UTC`) prunes `activity_events` older than 30 days by `server_ts`.
  - `lecture-worker.service` cgroup isolation: `MemoryHigh=700M`, `MemoryMax=900M`, `CPUQuota=60%`, `Nice=15`, `OOMScoreAdjust=500`.
  - Security & Availability: `ufw` (`22`, `80`, `443`), `fail2ban`, key-only SSH, Lightsail daily `AutoSnapshot` (`03:00 UTC`), UptimeRobot monitor (`804349204`).

### Production Pipeline — Unified Plane on Lightsail (`v1.5.0`)
- **`lecture-worker.service` (`home_worker.py` with `LOCAL_DATA_PLANE=1`):** Polls `lectures WHERE status='queued'`, manages dynamic 5-account NotebookLM pool (`default`, `acc_mo`, `acc_p1`, `acc_p2`, `acc_passplay` — `acc_p4` retired), generates text assets, downloads generated audio/video locally on Lightsail, uploads directly to Telegram MTProto, registers `media_assets`, and cleans temporary directories.
- **Session Refresh (`notebooklm-refresh.timer`):** Runs `scripts/refresh_notebooklm_auth.py` every 4 hours against Chrome profile `/home/ubuntu/.notebooklm-profile` using dynamic `authuser` discovery, `/trynow` guard, atomic writes, and sibling SID cookie sync (`_sync_sibling_sid_cookies`).
- **Admin Upload Flow:** Dashboard PDF upload -> Supabase Storage or portable `/api/upload` -> `POST /api/lectures/register` (JWT-protected).

### Ops Cheat Sheet (AWS Lightsail)
```bash
ssh aws
cd /home/ubuntu/bsu-math-ai-portal
git pull --ff-only origin main
sudo systemctl restart bsu-math-api lecture-worker
journalctl -u bsu-math-api -f
journalctl -u lecture-worker -f
systemctl list-timers --no-pager | grep -E "bsu-|notebooklm"
```

### Key Infrastructure Files
```
d:\الكليه\BOT\
├── frontend/                        # Next.js 16 app (Cloudflare Pages)
├── app/
│   ├── main.py                      # FastAPI entrypoint & router registration
│   ├── config.py                    # Settings (MEDIA_DIR, DATABASE_URL, Telegram)
│   ├── routes/                      # auth, diagnostics, lectures, notifications, stats, stream, study_guides, upload
│   ├── services/
│   │   ├── media_cache.py           # NVMe DiskLRUCache (15GB media + 1GB PDF, single-flight)
│   │   ├── typst_service.py         # Pandoc + Typst academic PDF compiler
│   │   ├── telethon_service.py      # MTProto upload/stream with 30m message cache
│   │   ├── notebooklm_client.py     # Dynamic slot cookie manager
│   │   ├── notebooklm_service.py    # NotebookLM pipeline
│   │   └── ...
│   └── db/                          # SQLAlchemy models & Supabase engine
├── supabase/migrations/             # All DB schema migrations (source of truth)
├── docs/                            # All planning, context, testing & deployment docs
├── scripts/
│   ├── db_backup_and_prune.py       # Daily pg_dump + Telegram archive + weekly 30d telemetry prune
│   ├── refresh_notebooklm_auth.py   # 4h headless Chrome cookie refresh
│   └── ...
├── home_worker.py                   # Unified Control+Data worker on Lightsail
├── media_transfer_worker.py         # Media upload helper module
├── requirements.txt                 # API server dependencies
├── requirements-worker.txt          # Worker extra dependencies (notebooklm-py, playwright)
└── tests/                           # 70 backend pytest tests
```

---

## 3. Current Project State (as of 2026-11-12)

### Security & Hardening Posture (`v1.5.0`)
- **No secrets in the client bundle. EVER.** Admin login is server-verified via FastAPI JWT (`PBKDF2` + fail-closed `SECRET_KEY`).
- `admin_upsert_lecture` RPC enforces SHA-256 `ADMIN_MASTER_KEY` digest; all Supabase tables enforce RLS (`SECURITY DEFINER` RPCs for mutations).
- Unapproved local path access on `/api/stream/{id}` is rejected (`403`) via `is_safe_path`; `pg_dump` receives DB credentials exclusively via `PGPASSWORD` env var (never argv).
- Lightsail firewall (`ufw` 22/80/443), `fail2ban`, `PasswordAuthentication no`, `MemoryMax=900M` worker isolation, and automated daily backups verified live.

### Gamification Engine — Phase Status
| Phase | Title | Status |
|---|---|---|
| Phase 0 | Baseline Freeze & CI/CD | ✅ COMPLETE |
| Phase 1 | Frictionless Habit Ignition (Smart Resume, Micro-Session, Wrap-Up) | ✅ COMPLETE |
| Phase 2 | Leitner Mistake Notebook (Spaced Repetition) | ✅ COMPLETE |
| Phase 3 | Cognitive Guard & Hint Ladder | ✅ COMPLETE |
| Phase 4 | Compassionate Feedback (Math Anxiety Reduction) | ✅ COMPLETE |
| Phase 5 | Confidence Assessment, Neighborhood Leaderboard & Freezes | ✅ COMPLETE |
| Phase 6 | Collaborative Cohort Challenge | ✅ COMPLETE |

### ⚠️ Production Function Parity Lesson (2026-10-24)
The live `ingest_events` had silently regressed once despite migrations. Always verify live `pg_proc` source against migration files when behavioral parity matters.

### Recent Releases / Commits
- `e8e7a0f` (2026-11-12) — Harden streaming & Typst PDF with NVMe LRU cache (`media_cache.py`), plus `db_backup_and_prune.py`
- `cbddb0f` (2026-11-12) — Fix Typst Pandoc 3.9 normalization (`72/72` OK), NotebookLM dynamic slots/cookie sync, portable `/api/upload`, legacy Render/`hp-server` cleanup
- See [`docs/04_deployment/DEPLOYMENT_CHANGELOG.md`](../04_deployment/DEPLOYMENT_CHANGELOG.md) for full release history.

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
