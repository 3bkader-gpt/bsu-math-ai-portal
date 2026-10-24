# 📚 BSU Math AI Portal — Project Documentation

> Current Phase: **Soft Launch (7-Day Observation Window)**  
> Production: https://bsu-math-ai-portal.pages.dev  
> Version: `v1.2.2` (Frozen baseline — no behavioral changes during observation)

---

## 🗂️ Structure

```
docs/
├── 01_planning/          # خطط المشروع والخارطة الزمنية
├── 02_architecture/      # المعمارية والأمن
├── 03_testing/           # نتائج الاختبارات اليدوية
└── 04_deployment/        # سجل الإصدارات
```

---

## 📊 Overall Status

| المجال | الحالة | التفاصيل |
|--------|--------|----------|
| **المشروع العام** | 🔄 80% | Phases 1–4 مكتملة، Phase 5 (Production Readiness) بدأت |
| **Gamification Engine** | ✅ 100% | Phases 0–6 مكتملة بالكامل — deployed & verified |
| **Behavioral Features** | 🔄 Phase 1–2 Live | Phase 1 ✅، Phase 2 (Leitner) ✅، Phases 3–6 قادمة |
| **Security Audit** | ✅ P0 Resolved | كل الـ P0 issues تم حلها، 3 OPT improvements باقية |
| **Testing** | 🟡 Most Passed | معظم الحالات PASS على المحاكي، بعض NOT TESTED |
| **Soft Launch** | 🟢 Live Now | v1.2.2 deployed — قيد المراقبة (7 أيام) |

---

## 📁 Documents

### 01 — Planning

| الملف | الوصف | الحالة |
|-------|--------|--------|
| [PROJECT_PLAN.md](./01_planning/PROJECT_PLAN.md) | خطة المشروع الشاملة (5 مراحل) | Phase 5 عند 50% |
| [GAMIFICATION_ROADMAP.md](./01_planning/GAMIFICATION_ROADMAP.md) | خارطة طريق محرك الـ Gamification (6 phases) | ✅ 100% Complete |

### 02 — Architecture

| الملف | الوصف | الحالة |
|-------|--------|--------|
| [BEHAVIORAL_ARCHITECTURE_PLAN.md](./02_architecture/BEHAVIORAL_ARCHITECTURE_PLAN.md) | المعمارية السلوكية والنفسية الكاملة (6 phases) | Phase 1–2 Live، 3–6 Planned |
| [SECURITY_AUDIT.md](./02_architecture/SECURITY_AUDIT.md) | Audit أمني شامل للـ Architecture | P0 كله Resolved ✅، 3 OPT باقية |

### 03 — Testing

| الملف | الوصف | الحالة |
|-------|--------|--------|
| [MANUAL_TESTING_CHECKLIST.md](./03_testing/MANUAL_TESTING_CHECKLIST.md) | Checklist الاختبار اليدوي على المحاكي والـ DB | معظمه PASS ✅ |

### 04 — Deployment

| الملف | الوصف | الحالة |
|-------|--------|--------|
| [DEPLOYMENT_CHANGELOG.md](./04_deployment/DEPLOYMENT_CHANGELOG.md) | سجل كل releases في فترة الـ Soft Launch | v1.2.2 هو الـ baseline الحالي |

---

## 🎯 Next After Soft Launch (7 Days)

بعد انتهاء نافذة المراقبة:

1. **Phase 3 — Cognitive Guard & Hint Ladder**
   Flow timer (25 min) + Burnout detector + 3-tier hint ladder

2. **Phase 4 — Compassionate Feedback**
   Diagnostic error taxonomy + Dynamic praise bank (Boys/Girls) + Haptics

3. **Phase 5 — Anti-Gaming Integrity**
   Flexible streak + Confidence rating + Speed guard + Neighborhood leaderboard

4. **Phase 6 — Cohort Collaboration**
   Append-only contributions table + Sybil-proof caps

---

## ⚠️ Open OPT Items (Non-Blocking)

من SECURITY_AUDIT.md:
- [OPT-FE-01] Refactor monolithic page.tsx & admin/dashboard/page.tsx into hooks
- [OPT-ENV-01] Standardize Windows paths for container portability
- [OPT-STR-01] Replace sync file reading in local fallback with async FileResponse
