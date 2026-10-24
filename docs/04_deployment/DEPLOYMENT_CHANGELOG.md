# ≡ƒÜÇ Soft Launch Deployment & Changelog Log

This changelog records all production deployments during the 7-day Soft Launch observation period. To ensure scientific integrity of telemetry and retention measurements, **only critical bugfixes are permitted** during this window. All behavioral mechanics (XP, streaks, caps) are frozen.

---

### [2026-10-20 14:20 Cairo] ΓÇö Release `v1.2.1` (Production Baseline)
* **Git Commit:** `5466cc3` / `v1.2.1`
* **Cloudflare Pages:** `https://bsu-math-ai-portal.pages.dev`
* **Changes:**
  - Hardened `cleanup_test_data.py` to match `zz_test.%`, `concurrent.%`, `playwright.%` and protect real students.
  - Stripped redundant WebSocket polyfill from `frontend/src/modules/gamification/supabase/client.ts`.
  - Replaced accidental service_role key fallback in `.github/workflows/ci.yml` with anon key.
  - Calibrated soft launch KPIs in `BEHAVIORAL_ARCHITECTURE_PLAN.md` to directional indicators ($N = 10\text{--}20$).
  - Frozen Flow timer and Burnout detector until Phase 3 to preserve baseline session length.
  - Activated official UptimeRobot 5-minute HTTP monitor (ID 804349204) and removed redundant keepalive_render.yml workflow.
  - Sanitized all tracked scripts to load credentials strictly from .env and updated .gitignore.
* **State of Database at Launch:**
  - `auth.users`: 0
  - `profiles`: 0
  - `activity_events`: 0
  - `mistake_notebook`: 0
  - `ingestion_errors`: 0

### [2026-10-20 22:15 Cairo] ΓÇö Release `v1.2.2` (Freeze & Soft Launch Baseline)
* **Git Commit / Tag:** `v1.2.2`
* **Cloudflare Pages:** `https://bsu-math-ai-portal.pages.dev`
* **Changes & Calibrations:**
  - **XP Baseline Confirmation (Client & Server Parity):**
    - Audio completion: **25 XP** (5-min milestone: +5 XP).
    - Video completion: **35 XP** (5-min milestone: +10 XP).
    - Study guide dwell (>=60s): **15 XP**.
    - Flashcard Deck completion: **15 XP** (Card flip: +1 XP up to 5).
    - Leitner Mistake Review (thoughtful >=3s): **15 XP**.
    - Quiz question (thoughtful >=3s): **+5 XP**, Perfect score bonus: **+20 XP**.
    - *Note:* Earlier planning notes contemplated 30/40/25 XP, but the active database migration and frontend rules are unified at 25/35/15 XP. This baseline is now strictly frozen for the entire 7-day observation period.
  - **Keepalive / SendBeacon Tab Close Hardening:**
    - Capped keepalive batch limit to 20 events (<60KB) to respect browser keepalive quota (64KB max).
    - Retained events in IndexedDB during unconfirmed keepalive dispatches so that next session's normal flush safely reconciles with 200 OK without data loss, while server UUID idempotency prevents duplicates.
    - Verified empirically via CDP and Supabase direct query: event in IndexedDB confirmed NOT in DB before page closure, and confirmed FOUND in DB immediately after `pagehide` navigation.
  - **Checklist Honesty Restructuring:**
    - `MANUAL_TESTING_CHECKLIST.md` calibrated to 4 distinct states: `PASS` (empirically tested on emulator/DB), `FAIL` (0), `NOT TESTED` (scheduled for week 1 non-blocker exploration), `N/A` (multi-device sync for anonymous guest sessions).
* **State of Database at Freeze:**
  - `auth.users`: 0
  - `profiles`: 0
  - `activity_events`: cleaned of all synthetic test events
  - `mistake_notebook`: 0
  - `ingestion_errors`: 0 student errors

### [2026-10-20 22:48 → 2026-10-21 00:00 Cairo] — Visual Polish Wave (`v1.2.3` → `v1.3.0`)
* Cloudflare Pages deployments. Cosmetic/sensory polish only — zero behavioral mechanics touched (soft-launch discipline preserved).
* **v1.2.3** `e8760cd` — resolve badge lucide icons instead of rendering raw string names.
* **v1.2.4** `d370612` — boost font visibility and contrast in dark-mode gamification modal.
* **v1.2.5** `dacb214` — boost text contrast; remove opacity dimming on original lecture files cards.
* **v1.2.6** `8daa593` — eliminate mobile header truncation ('هـ...') and text clipping across portal.
* **v1.2.7** `22e5423` — eliminate toast notification bleeding on mobile with safe inset boundaries.
* **v1.2.8** `3f5d3a1` — remove unnecessary scrollbar on empty state; no-scrollbar on modals.
* **v1.2.9** `24d57eb` — display mode and sound toggles become segmented selectors.
* **v1.3.0** `68abf54` — visual density sweet spot (typography scale + component sizing).

### [2026-10-21 Cairo] — Post-v1.3.0 Iterations (untagged)
* `dbf6661` — leaderboard UX: self-highlight, inline nickname edit, loading spinner, persistent nickname sync.
* `3b77c13` — docs: Phase 2 (Leitner Mistake Notebook) marked COMPLETED & DEPLOYED.
* `9532834` — feat(security): enable RLS across all remaining tables, add `admin_upsert_lecture` RPC, and update content.

### [2026-10-24 Cairo] — Release `v1.4.0` (Split-Plane Pipeline Architecture)
* **Blueprint:** `BLUEPRINT.md` (rev 1). Owner decision: retire the CI-held NotebookLM session (`NOTEBOOKLM_STORAGE_STATE_B64`) — datacenter IP churn made Google kill it every ~2 days.
* **Control Plane (home server `abkader@192.168.1.5`, Debian 13):** `home_worker.py` as `lecture-worker.service` (systemd user unit, `Restart=always`, linger enabled) — polls `lectures WHERE status='queued'` every 15s, drives NotebookLM via notebooklm-py, re-mints dead cookies automatically by driving **system Chrome against the owner's persistent profile** (`/home/abkader/.notebooklm-profile`, L3 `browser="chrome"`, SingletonLock cleanup) from the residential IP. Generates texts (KB-scale Telegram uploads only), then waits for Google-side artifact readiness **by status polling (zero media bytes at home)**, writes a `media_handoffs` row and dispatches the cloud plane. Resume support: an existing notebook with all four text assets skips regeneration.
* **Data Plane (GitHub Actions `media_transfer.yml` + `media_transfer_worker.py`):** fetches the handoff row (RLS service-role only), downloads `.m4a`/`.mp4` from Google via notebooklm CLI with the one-shot fresh cookie jar, uploads to Telegram via **Telethon MTProto (2GB cap)**, registers `media_assets`, marks the lecture `completed`, then **purges the credential-bearing handoff row**. Strict validation: non-telegram storage modes fail loudly.
* **Dashboard simplification:** browser no longer dispatches GitHub at all (no PAT in the browser — the PAT lives only in the home server env). Upload flow = PDF → Supabase Storage → `admin_upsert_lecture` (now 8-arg with `p_source_pdf_url`) → done; the daemon picks it up within 15s.
* **Bugs discovered during live E2E and fixed:**
  1. Dashboard hit Render `/api/upload` which accepted the file then died (`notebooklm` CLI not installed on Render), stranding lectures as `failed` and skipping the cloud path — fixed in `361b9af` (skip non-processing backend).
  2. `artifact list` JSON exposes no download URLs — readiness detection switched to artifact status + CLI-based cloud download (owner-approved fallback).
  3. Bot API upload cap: `sendAudio` 73MB → **413**; and the repo secret `TELEGRAM_BOT_TOKEN` was **stale** → `sendVideo` 401 / MTProto `ACCESS_TOKEN_EXPIRED`. Fixed by routing all audio/video through Telethon MTProto + refreshing all four Telegram repo secrets. Silent local-fallback now raises instead of marking lectures complete.
* **E2E proof (test lecture, fully cleaned afterwards):** dashboard upload (isolated fresh browser session) → daemon claim in 15s → notebook + texts + 73MB podcast + 34MB video → handoff → Action `success` → `telegram_message_id` 203/204 → student streaming verified live (**HTTP 206** `audio/mp4` + `video/mp4`). Home-bandwidth usage: <1MB (PDF + API calls) — zero media bytes.
* **Cleanup verified:** lectures 39/40 + 7 assets + handoffs deleted (29 lectures remain), Storage test PDF deleted, Telegram test messages 197–204 deleted, Google test notebook deleted, runner/home/local temp files removed.
* **Ops runbook:** daemon logs via `journalctl --user -u lecture-worker -f` on the home server; code updates via `git pull` + `systemctl --user restart lecture-worker`; the Google session self-heals through the persistent Chrome profile — no manual login expected.

---

### [2026-10-24 Cairo] — Release `v1.3.1` (Security Hardening & Behavioral Parity Restoration)
* **Scope:** Critical security remediation + production behavioral-parity restoration. Cosmetic-only soft-launch rule suspended for this release under the critical-bugfix exception.
* **Security fixes:**
  - **Purged all hardcoded credentials from the client bundle:**
    - Removed `MASTER_ADMIN_PASS = 'admin_academic_2026'`, the on-screen password hint, the autofill helper, and the client-fabricated `bsu_master_academic_*` session bypass from `frontend/src/app/admin/page.tsx`. Login is now exclusively server-verified via FastAPI with a 45s cold-start window (Render free tier wake-up) — no local fallback tokens.
    - Removed the chunked GitHub PAT (`gho_DxSMOH…`) hardcoded in `frontend/src/app/admin/dashboard/page.tsx`. **The leaked token must be revoked manually in GitHub settings (it was still valid at discovery).**
  - **`admin_upsert_lecture` RPC hardened** (`20261024_admin_rpc_sha256_secret.sql`): replaced the plaintext literal + permissive fallbacks (`bsu_master_academic_%`, `ey%` prefix, `length >= 16`) with a strict SHA-256 digest check against `ADMIN_MASTER_KEY`. The plaintext key exists only in the backend env and is provisioned to the dashboard in the login response (`ops_key`), stored per-device in localStorage. Verified live: wrong secret → `42501`, correct secret → success.
  - **Insecure backend defaults removed** (`app/services/auth_service.py`): `SECRET_KEY` no longer falls back to the public `academic_super_secret_jwt_key_2026`; `ADMIN_PASSWORD` no longer falls back to `admin_academic_2026`. Both now fail closed (ephemeral random values + loud warning) instead of silently running on public constants.
  - **Live admin credentials rotated:** the production `users.password_hash` for `admin` was PBKDF2-rotated (the previous live password WAS the compromised default), and `.env` / Render env blueprint (`render.yaml`: `SECRET_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_MASTER_KEY`, `GITHUB_DISPATCH_TOKEN`) updated.
  - **Lectures storage bucket least-privilege** (`20261024_lectures_storage_least_privilege.sql`): the single `FOR ALL … TO public` policy was split into public SELECT + public INSERT (needed by the autonomous dashboard upload) + service-role ALL. Anonymous UPDATE/DELETE revoked — bucket content can no longer be wiped or tampered with via the anon key.
* **Behavioral parity restoration (critical bugfix):**
  - Discovered the live `ingest_events` function had regressed to the older Phase-2-core body: 500 XP cap (frontend expects 400), no 3000ms deliberation speed guard, no per-question/per-lecture daily idempotency, no mistake-notebook auto-ingestion, and an `ELSE → 5 XP` branch that silently rewarded unknown events.
  - Restored the frozen v1.2.2 baseline verbatim from `20261020_phase2_leitner_notebook.sql` via `20261024_fix_ingest_events_leitner_parity.sql` and verified live: 400 cap ✓, speed guard ✓, idempotency ✓, mistake auto-ingestion ✓, `quiz.mistake_reviewed` → 15 XP ✓.
  - Dashboard gained a per-device cloud-ops settings modal (⚙️) for manual key management.
* **State of Database after Release:**
  - `profiles`: 13 — soft-launch cohort confirmed by owner as friends testing responsiveness (1 real student). The true student launch is still pending; D7 measurement window restarts at the real launch.

---
