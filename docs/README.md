# 📚 BSU Math AI Portal — Project Documentation

> Current Phase: **Production Hardened (`v1.5.0`)**  
> Live Frontend: https://bsumath.bond (Cloudflare Pages: https://bsu-math-ai-portal.pages.dev)  
> Backend API: https://api.bsumath.bond (AWS Lightsail `13.63.217.38` + Caddy HTTPS)  
> Version: `v1.5.0` (Last Updated: 2026-11-12)

---

## 🗂️ Structure

```
docs/
├── 00_agent_context/     # المرجع الرئيسي لأي AI Agent أو مطور (ابدأ من AI_HANDOFF.md)
├── 01_planning/          # خطط المشروع والخارطة الزمنية
├── 02_architecture/      # المعمارية والأمن
├── 03_testing/           # نتائج الاختبارات والتقارير
└── 04_deployment/        # سجل الإصدارات والترحيل
```

---

## 📊 Overall Status

| المجال | الحالة | التفاصيل |
| :--- | :--- | :--- |
| **البنية التحتية والباك-إند** | ✅ AWS Lightsail | تم الترحيل من Render إلى `bsu-math-backend` (`small_3_0`, `2 vCPU`, `2 GB RAM` + `2 GB Swap`, `60 GB SSD`, `Ubuntu 24.04` kernel `7.0.0-1017-aws`) مع Caddy HTTPS وتحصين `ufw`/`fail2ban` و`AutoSnapshot` يومي. |
| **خط معالجة المحاضرات** | ✅ Unified Control + Data Plane | `bsu-math-api` و `lecture-worker` (`home_worker.py` بقيود `MemoryMax=900M`, `CPUQuota=60%`, `Nice=15`) يعملان محلياً على Lightsail مع تدوير ديناميكي لـ 5 حسابات NotebookLM وتجديد جلسات تلقائي كل 4 ساعات. |
| **الكاش وتصدير الـ PDF** | ✅ NVMe LRU + Typst 3.9 | كاش ميديا `/var/cache/bsu-media` (15 GB LRU) مع single-flight lock + كاش `/var/cache/bsu-pdf` (1 GB LRU) وهيدرات `Cache-Control: public, max-age=86400` + `ETag` + `304` + إصلاح تطبيع Pandoc/Typst (`72/72` OK). |
| **حماية قاعدة البيانات** | ✅ Backups + Retention | `pg_dump` (PostgreSQL 17.11) يومياً في `/var/backups/bsu-db` (14 يوماً) + أرشفة على قناة تليجرام الخاصة (`bsu-db-backup.timer`) + تنظيف أسبوعي لـ `activity_events` الأقدم من 30 يوماً (`bsu-telemetry-prune.timer`). |
| **Gamification Engine** | ✅ 100% Complete | Phases 0–6 مكتملة بالكامل — deployed & verified. |
| **Security & CI Gate** | ✅ Verified | كل الـ P0 issues محلولة، اختبارات الباك-إند (`70 passed`) وVitest (`142 passed`) وGitHub Actions CI تمر بنجاح. |

---

## 📁 Documents

### 00 — Agent Context
| الملف | الوصف | الحالة |
| :--- | :--- | :--- |
| [AI_HANDOFF.md](./00_agent_context/AI_HANDOFF.md) | المرجع الأول لأي Agent: الهوية، البنية التحتية، أوامر التشغيل، الملفات، وقواعد المعمارية | ✅ Updated `2026-11-12` (`v1.5.0`) |
| [ARCHITECTURE.md](./00_agent_context/ARCHITECTURE.md) | المخطط المعماري للـ Frontend والباك-إند وLightsail والكاش والتليجرام | ✅ Updated `2026-11-12` |
| [CONTEXT_INDEX.md](./00_agent_context/CONTEXT_INDEX.md) | خريطة الميزات إلى الملفات والجداول والـ RPCs | ✅ Updated `2026-11-12` |
| [DATABASE.md](./00_agent_context/DATABASE.md) | توثيق الجداول والدوال (`SECURITY DEFINER` RPCs) | ✅ Reference |
| [PROJECT_BRIEF.md](./00_agent_context/PROJECT_BRIEF.md) | الرؤية، المستخدمون، والمتطلبات غير الوظيفية | ✅ Updated `2026-11-12` |
| [TASKING.md](./00_agent_context/TASKING.md) | سجل المهام المنجزة والمؤجلات الحالية | ✅ Updated `2026-11-12` |

### 01–04 — Planning, Architecture, Testing & Deployment
| الملف | الوصف | الحالة |
| :--- | :--- | :--- |
| [PROJECT_PLAN.md](./01_planning/PROJECT_PLAN.md) | خطة المشروع الشاملة (5 مراحل) | 📋 Historical Roadmap |
| [UNBUILT_FEATURES_SSOT.md](./01_planning/UNBUILT_FEATURES_SSOT.md) | **المرجع الوحيد المعتمد للميزات المتبقية (بدون AI)** | 📌 Active SSOT (`2026-11-12`) |
| [PARKED_AI_FEATURES.md](./99_parked_ai/PARKED_AI_FEATURES.md) | **ميزات الـ AI المؤجلة (معزولة لحين توفر مزود)** | 🧊 Parked (`2026-11-12`) |
| [GAMIFICATION_ROADMAP.md](./01_planning/GAMIFICATION_ROADMAP.md) | خارطة طريق محرك الـ Gamification (Phases 0–6) | ✅ Complete |
| [BEHAVIORAL_ARCHITECTURE_PLAN.md](./02_architecture/BEHAVIORAL_ARCHITECTURE_PLAN.md) | المعمارية السلوكية والنفسية الكاملة | 📋 Design Spec |
| [SECURITY_AUDIT.md](./02_architecture/SECURITY_AUDIT.md) | Audit أمني شامل للـ Architecture | ✅ P0 Resolved |
| [MANUAL_TESTING_CHECKLIST.md](./03_testing/MANUAL_TESTING_CHECKLIST.md) | Checklist الاختبار اليدوي والأدلة | ✅ Baseline Verified |
| [DEPLOYMENT_CHANGELOG.md](./04_deployment/DEPLOYMENT_CHANGELOG.md) | سجل الإصدارات والترحيل (`v1.2.1` → `v1.5.0`) | ✅ Updated `2026-11-12` |
