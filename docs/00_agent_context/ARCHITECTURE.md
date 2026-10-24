# 🏗️ ARCHITECTURE.md — System Architecture Reference
> Last Updated: 2026-10-21

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

## Backend Architecture (FastAPI)

```
app/
├── main.py              # FastAPI app, CORS, routers registration
├── config.py            # Environment config (Supabase, Telegram, etc.)
├── routes/
│   ├── lectures.py      # GET /api/lectures, GET /api/subjects
│   ├── stream.py        # HTTP 206 partial content streamer (audio/video)
│   └── auth.py          # POST /api/auth/anonymous-session
├── services/
│   ├── prompt_service.py # 11 subject master prompts
│   ├── notebooklm.py    # Playwright automation for AI generation
│   └── telegram.py      # Telethon MTProto file upload/download
└── db/
    └── supabase.py      # Supabase admin client (service role key)
```

### Telegram CDN Architecture
- **Channel:** `المنصه` (`-1004453609138`) — private storage channel
- **Bot:** `@BSUMath_bot` — receives uploaded assets
- **File limit:** 2GB per file (sufficient for all audio/video assets)
- **Retrieval:** `GET /stream/{telegram_file_id}` → HTTP 206 range-supporting proxy

---

## Deployment Architecture

```
GitHub main branch push
    │
    ├─→ Cloudflare Pages (frontend)
    │   Wrangler CLI → Next.js static export → CDN global edge
    │   Domain: bsu-math-ai-portal.pages.dev
    │
    └─→ Render.com (backend)
        Docker container → FastAPI on port 10000
        Keepalive: GitHub Action pings /health every 14min (prevents sleep)
        Domain: bsu-math-api.onrender.com
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
