# 🚀 Soft Launch Deployment & Changelog Log

This changelog records all production deployments during the 7-day Soft Launch observation period. To ensure scientific integrity of telemetry and retention measurements, **only critical bugfixes are permitted** during this window. All behavioral mechanics (XP, streaks, caps) are frozen.

---

### [2026-10-20 14:20 Cairo] — Release `v1.2.1` (Production Baseline)
* **Git Commit:** `5466cc3` / `v1.2.1`
* **Cloudflare Pages:** `https://bsu-math-ai-portal.pages.dev`
* **Changes:**
  - Hardened `cleanup_test_data.py` to match `zz_test.%`, `concurrent.%`, `playwright.%` and protect real students.
  - Stripped redundant WebSocket polyfill from `frontend/src/modules/gamification/supabase/client.ts`.
  - Replaced accidental service_role key fallback in `.github/workflows/ci.yml` with anon key.
  - Calibrated soft launch KPIs in `BEHAVIORAL_ARCHITECTURE_PLAN.md` to directional indicators ($N = 10\text{--}20$).
  - Frozen Flow timer and Burnout detector until Phase 3 to preserve baseline session length.
  - Created automated daily telemetry monitor `scripts/monitor_soft_launch.py`.
* **State of Database at Launch:**
  - `auth.users`: 0
  - `profiles`: 0
  - `activity_events`: 0
  - `mistake_notebook`: 0
  - `ingestion_errors`: 0

---
