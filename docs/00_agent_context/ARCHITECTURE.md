# 🏗️ ARCHITECTURE.md — System Architecture Reference
> Last Updated: 2026-11-12 (v1.5.0)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Student Browser                          │
│  Next.js 16 (App Router) + Turbopack + Tailwind CSS v4     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Homepage    │  │ Lecture View │  │ Gamification     │  │
│  │  (subjects)  │  │ (5 tabs)     │  │ (XP pill+drawer) │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│           │               │                   │             │
│  ┌────────▼───────────────▼───────────────────▼──────────┐  │
│  │           Event Bus (pub/sub + buffer queue)          │  │
│  └────────────────────────┬──────────────────────────────┘  │
│                           │                                 │
│  ┌────────────────────────▼──────────────────────────────┐  │
│  │          Gamification Engine (Pure TypeScript)        │  │
│  │  core/xp.ts + core/streak.ts + core/reducer.ts       │  │
│  │  Zero React/DOM — fully deterministic + Vitest tested │  │
│  └────────────────────────┬──────────────────────────────┘  │
│                           │                                 │
│  ┌────────────────────────▼──────────────────────────────┐  │
│  │  Zustand Store ←→ IndexedDB Outbox → sendBeacon()    │  │
│  └────────────────────────┬──────────────────────────────┘  │
└───────────────────────────┼─────────────────────────────────┘
                            │ HTTPS (ingest_events RPC)
┌───────────────────────────▼─────────────────────────────────┐
│                  Supabase PostgreSQL 17                      │
│  ┌─────────────┐ ┌─────────────────┐ ┌───────────────────┐  │
│  │  profiles   │ │ activity_events │ │ mistake_notebook  │  │
│  │  (XP/level/ │ │ (raw audit log) │ │ (Leitner boxes)   │  │
│  │   streak)   │ └─────────────────┘ └───────────────────┘  │
│  └─────────────┘                                            │
│  All writes via SECURITY DEFINER RPCs (never direct INSERT) │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Admin Browser                            │
│  Next.js /admin → FastAPI Backend (Python 3.12)            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  PDF Upload → NotebookLM Automation → Asset Bundle  │   │
│  │  → Telegram CDN upload → Supabase metadata mirror   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Module Boundaries (ESLint Enforced)
```
src/
├── app/              → Pages only. No business logic.
├── components/       → Presentational UI. Can import modules.
├── modules/
│   ├── gamification/ → All gamification state & logic
│   │   ├── core/     → ZERO React imports. Pure TS.
│   │   ├── notebook/ → Leitner hook
│   │   ├── resume/   → Resume state manager
│   │   ├── store/    → Zustand store
│   │   ├── supabase/ → RPC wrappers + auth
│   │   ├── sync/     → IndexedDB outbox
│   │   └── ui/       → Gamification-specific React components
│   └── telemetry/    → Event detectors (media, quiz, flashcard)
├── shared/
│   └── events/       → Event bus + type contracts
├── config/           → gamification-rules.ts
├── lib/              → Audio engine, confetti, KaTeX cache
└── types/            → Global TypeScript types
```

### Data Flow: Student Earns XP
```
1. Student watches audio → mediaDetector.ts throttles → emits media.progress every 5s
2. EventBus.emit('media.progress', payload)
3. GamificationHost receives → processEvent(currentState, event) → { nextState, effects }
4. Effects dispatched: xp.gained → Zustand store updates → UI pill animates
5. Outbox queues event to IndexedDB
6. Every 20s OR on pagehide: sendBeacon → ingest_events RPC
7. Supabase RPC: validates, deduplicates, computes Cairo-TZ streak, returns reconciled profile
8. Zustand reconcileWithServer() → final authoritative state
```

### Data Flow: Student Reviews Mistake
```
1. MistakeNotebookModal loads → fetchDueMistakes() (next_review_date <= cairo_today)
2. Student answers question
3. submitMistakeReviewRpc(hash, isCorrect, durationMs)
4. Server: validates due date, checks speed (< 3000ms = 0 XP), advances Leitner box
5. Returns { boxLevel, isMastered, awardedXp }
6. Client updates local summary, Zustand XP if awarded
```

---

## Backend Architecture (FastAPI + Lightsail Workers)

```
app/
├── main.py                       # FastAPI app, CORS, routers registration
├── config.py                     # Environment config (Supabase, Telegram, Paths)
├── routes/
│   ├── auth.py                   # POST /api/auth/anonymous-session & admin JWT login
│   ├── diagnostics.py            # GET /api/diagnostics overview
│   ├── lectures.py               # GET /api/lectures, GET /api/subjects, register
│   ├── notifications.py          # Notifications & web push
│   ├── stats.py                  # Platform momentum & analytics routes
│   ├── stream.py                 # NVMe LRU cache first -> HTTP 206 Telethon streamer -> local safe fallback
│   ├── study_guides.py           # Typst PDF export with /var/cache/bsu-pdf + Cache-Control + ETag (304)
│   └── upload.py                 # Portable PDF/material upload handler
├── services/
│   ├── media_cache.py            # DiskLRUCache (15 GB media + 1 GB PDF, single-flight dedup)
│   ├── typst_service.py          # Pandoc 3.9 + Typst bilingual math-safe PDF compiler
│   ├── prompt_service.py         # 11 subject master prompts (portable prompts/ resolution)
│   ├── notebooklm_client.py      # Multi-account pool + cookie sync (_sync_sibling_sid_cookies)
│   ├── notebooklm_service.py     # NotebookLM pipeline orchestration
│   ├── telethon_service.py       # Telethon MTProto upload/download + 30m _message_cache
│   └── telegram_storage.py       # Bot API / Telethon upload dispatcher
└── db/
    ├── database.py               # SQLAlchemy engine & SessionLocal (Supabase pooler)
    └── models.py                 # ORM models (Subject, Lecture, MediaAsset, etc.)
```

### Telegram CDN + NVMe LRU Cache Architecture
- **Channel:** `المنصه` (`-1004453609138`) — private storage channel (origin archive)
- **Bot:** `@BSUMath_bot` — uploads assets & daily DB `.sql.gz` backups
- **NVMe Local Cache (`/var/cache/bsu-media`, 15 GB max):** Eliminates Telegram `FloodWait` under exam-night traffic spikes via single-flight background warm-up and atomic `.part` -> `.bin` commits (`X-Media-Cache: HIT|MISS`). Preserves HTTP `206 Partial Content` & `HEAD`.
- **Typst PDF Cache (`/var/cache/bsu-pdf`, 1 GB max):** Content-addressed (`SHA-256`) disk cache + `Cache-Control: public, max-age=86400` + `ETag` (`X-PDF-Cache: HIT|MISS`).

---

## Deployment Architecture

```
GitHub main branch push
    │
    ├─→ CI Quality Gate (.github/workflows/ci.yml)
    │   pytest (70 backend tests) + Typecheck/Vitest/Build
    │
    ├─→ Cloudflare Pages (frontend)
    │   Next.js static export → CDN global edge
    │   Domains: bsumath.bond / bsu-math-ai-portal.pages.dev
    │
    └─→ AWS Lightsail: bsu-math-backend (13.63.217.38, eu-north-1)
        Ubuntu 24.04 (2 vCPU, 2 GB RAM + 2 GB Swap, 60 GB NVMe SSD)
        ├── Caddy reverse proxy (api.bsumath.bond HTTPS → 127.0.0.1:8000)
        ├── bsu-math-api.service (Uvicorn FastAPI + /var/cache/bsu-media + /var/cache/bsu-pdf)
        ├── lecture-worker.service (home_worker.py, LOCAL_DATA_PLANE=1; MemoryMax=900M, CPUQuota=60%, Nice=15)
        ├── notebooklm-refresh.timer (4h Chrome headless cookie refresh)
        ├── bsu-db-backup.timer (daily pg_dump 17.11 → /var/backups/bsu-db + Telegram channel)
        └── bsu-telemetry-prune.timer (weekly prune of activity_events > 30 days)
```

---

## Security Model

| Layer | Mechanism |
|---|---|
| RLS (Row Level Security) | Every table has RLS enabled. Clients can only read their own rows. |
| SECURITY DEFINER RPCs | All writes go through server-side functions that run as postgres superuser. |
| Anonymous Auth | Supabase anonymous sign-in gives every student a real `auth.uid()` without email. |
| Speed Guard | `durationMs < 3000` → `awarded_xp = 0` (anti-click-spam). |
| Idempotency | Events have UUID `id`. `ON CONFLICT (id) DO NOTHING` prevents replay attacks. |
| Cairo TZ | All dates computed as `(now() AT TIME ZONE 'Africa/Cairo')::DATE`. |
| Publishable Key Only | Frontend uses Supabase `anon` key (publishable). Service role key is backend-only. |
