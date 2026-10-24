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

---
