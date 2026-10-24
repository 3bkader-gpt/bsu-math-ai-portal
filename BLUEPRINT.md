# BLUEPRINT.md — Split-Plane Lecture Pipeline (Control Plane @ Home + Data Plane @ Cloud)

> **Revision History**
> | Rev | Date | Author | Change |
> |---|---|---|---|
> | 1 | 2026-10-24 | ZCode (orchestrating-project-blueprint) | Initial blueprint: replaces the dead `NOTEBOOKLM_STORAGE_STATE_B64` CI path with a Split-Plane architecture. Pre-approved for immediate execution by the project owner. |

---

## 1. Executive Summary

**Goal.** Restore and harden the automated lecture pipeline (PDF → NotebookLM → texts + podcast + video → Telegram CDN → student portal) after Google began killing the NotebookLM session minted inside GitHub Actions VMs (rotating datacenter IPs, `__Secure-1PSIDTS` churn).

**Decision (owner, final).** Retire the CI-held Google session entirely. Move the **Google-session-bound work** to the owner's home server (`abkader@192.168.1.5`, Debian 13, always-on, residential IP — matches the profile's origin) and keep only the **bandwidth-heavy media transfer** (`.m4a`/`.mp4` → Telegram) in the cloud.

**Users.** (1) The uploader (a female classmate of the owner) via the admin dashboard; (2) students via the public portal.

**Hard constraints.**
- The home server must NEVER download audio/video media to local disk nor spend home bandwidth on media bytes (texts/KB-scale only).
- No GitHub PAT in the uploader's browser anymore (the daemon picks work from the DB queue).
- Zero plaintext secrets in repo/client bundle (continues the v1.3.1 hardening).
- The uploader needs zero manual steps beyond: pick subject → number → PDF → click.

## 2. Project Signals Observed (evidence)

| Signal | Evidence |
|---|---|
| Home server ready | SSH BatchMode OK; Debian 13 (6.12 kernel); Python 3.13.5; git 2.47.3; 200 GB free; 7.2 GB RAM; passwordless sudo |
| Chrome + live profile | `/usr/bin/google-chrome-stable` installed; `/home/abkader/.notebooklm-profile` is a live Chrome user-data-dir (Default/ touched today; owner reports 100% tested) |
| Network | Home server reaches Supabase (401=auth-gated OK), GitHub API (200), notebook.google.com (200) |
| notebooklm-py capabilities | `attempt_headless_reauth(browser="chrome", browser_profile=<explicit dir>)` — drives SYSTEM Chrome against a given user-data-dir and re-mints `storage_state.json`; CLI `--storage PATH` for per-job cookie files; artifact rows carry direct download URLs (`art[6][5]` audio, `art[8][i][0][0]` video); commands `artifact list/poll/wait`, `download audio/video` |
| Existing pipeline | `cloud_lecture_executor.py` (polling pipeline, DB via SQLAlchemy), `.github/workflows/process_lecture.yml` (VM runner), dashboard dual-path upload (fixed today: Render path skipped) |
| DB | Supabase Postgres; `lectures`, `media_assets`, RLS on; `admin_upsert_lecture` SHA-256-gated RPC (deployed today) |
| systemd | User manager running; `Linger=no` → must `loginctl enable-linger abkader` (sudo OK) |

## 3. The Engineering Squad (Global Skills activated)

| Skill | Why |
|---|---|
| `architecting-systems` | Two-plane decomposition, module boundaries, failure-mode design |
| `enforcing-security` | Cookie jars are account-equivalent credentials: RLS-only handoff table, no secrets in logs/workflow inputs, purge-after-consume |
| `automating-github-actions` | Data Plane workflow rewrite (specific versions, secrets, minimal permissions, no session secret) |
| `planning-implementation` | Phased, verifiable rollout with E2E gate before cleanup |
| `validating-software` | Live verification at each phase; E2E on real test lecture |

## 4. Architecture (High-Level)

```
┌──────────────────────────── Control Plane ────────────────────────────┐
│ abkader@192.168.1.5 (residential IP) — lecture-worker.service 24/7     │
│                                                                        │
│  poll lectures WHERE status='queued' (every 15s, Supabase)             │
│   ├─ download source PDF from Supabase Storage (KB-scale? no—MB but    │
│   │  one-time & tiny vs media; allowed)                                │
│   ├─ NotebookLM via notebooklm-py with storage_state at                │
│   │  ~/.notebooklm/profiles/worker/storage_state.json                  │
│   │   └─ on auth death: attempt_headless_reauth(browser="chrome",      │
│   │        browser_profile=/home/abkader/.notebooklm-profile)          │
│   │        + remove stale SingletonLock first                          │
│   ├─ create notebook → upload source → apply prompt → texts            │
│   │  (quiz/guide/flashcards/mind-map) → media_assets.content_text      │
│   ├─ artifact poll until audio+video URLs populated (ZERO media bytes) │
│   ├─ export fresh cookie jar (~2 KB) + artifact download URLs          │
│   └─ INSERT media_handoffs row (RLS: service-role only) + dispatch     │
│      GitHub Action "media-transfer" (PAT lives in home .env)           │
└────────────────────────────────────────────────────────────────────────┘
                                  │ (handoff row id only)
┌──────────────────────────── Data Plane ───────────────────────────────┐
│ GitHub Actions VM (datacenter bandwidth, disposable)                   │
│  fetch media_handoffs row (service key) → download .m4a/.mp4          │
│  directly from googleusercontent URLs (+ fresh cookie header) →        │
│  upload to Telegram channel → media_assets rows (telegram ids) →       │
│  lectures.status='completed' → DELETE handoff row (credential purge)   │
└────────────────────────────────────────────────────────────────────────┘

Dashboard (after Phase 2): PDF → Supabase Storage; RPC creates lecture
'queued' (+source_pdf_url). NO PAT, NO dispatch from the browser.
```

**Key trade-offs.**
- *Why not Render for Data Plane?* Free tier sleeps + egress via Python is fine but Actions VMs have fatter pipes and already hold Telegram/DB secrets; zero new attack surface.
- *Why handoff via DB table not workflow inputs?* `workflow_dispatch` inputs land in run metadata/logs (cookie jar ≈ account credential). A service-role-only RLS table with purge-after-consume keeps the credential out of GitHub entirely.
- *Why cookies AND URLs?* Signed googleusercontent URLs may be cookie-free; if not, the one-shot fresh jar (used within minutes, from any IP) satisfies the download. Belt & suspenders; fallback is explicitly owner-approved.
- *Why not run everything at home?* Media bytes would consume home bandwidth — prohibited.

## 5. Phased Roadmap (pre-approved by owner — execute without stopping)

- **Phase 1 — DB contract (migrations, live-applied):** `lectures.source_pdf_url` column; `media_handoffs` table (service-role only, no anon policies); extend `admin_upsert_lecture` with `p_source_pdf_url`.
- **Phase 2 — Dashboard simplification:** pass `p_source_pdf_url`; drop the browser-side GitHub dispatch + `gh_dispatch_token` requirement entirely (daemon owns dispatch). Quality gate → Cloudflare deploy.
- **Phase 3 — Control Plane on home server:** clone repo to `~/bsu-math-ai-portal`; venv + deps (notebooklm-py[cookies,browser], playwright + system Chrome channel); write `home_worker.py` (poller + pipeline + L3 reauth + handoff + dispatch); `.env` (chmod 600) with DATABASE_URL/SUPABASE keys/GH PAT; `lecture-worker.service` (user unit, `Restart=always`) + `loginctl enable-linger`.
- **Phase 4 — Data Plane workflow:** rewrite `process_lecture.yml` → `media_transfer.yml`: `workflow_dispatch` + `repository_dispatch [media_transfer]`; env: DATABASE_URL/SUPABASE_SERVICE_ROLE_KEY/TELEGRAM_*; new `media_transfer_worker.py` (fetch handoff → download → Telegram → DB rows → status → purge handoff). Remove `NOTEBOOKLM_STORAGE_STATE_B64` dependency.
- **Phase 5 — E2E gate:** reset test lecture 40 → `queued`; watch daemon produce texts; watch Action transfer media; verify `completed` + student portal renders quiz/guide/cards + audio/video play; screenshots.
- **Phase 6 — Cleanup & report:** delete test lectures (39, 40) + assets + storage PDF + Telegram test messages + test notebook; verify zero residue; final report (bugs found, fixes, architecture doc updates: AI_HANDOFF/DEPLOYMENT_CHANGELOG/TASKING).

## 6. Open Questions (none blocking Phase 1)

- Are googleusercontent artifact URLs cookie-free? → resolved empirically in Phase 5 (worker tries no-cookie first, falls back to jar).
- Audio/video auto-generation latency after source upload (observed 10–20 min in prior runs) → poll loop with generous timeout (40 min).
