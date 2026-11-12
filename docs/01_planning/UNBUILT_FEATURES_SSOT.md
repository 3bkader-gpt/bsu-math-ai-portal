# 📌 UNBUILT_FEATURES_SSOT.md — المرجع الوحيد المعتمد للميزات المتبقية (بدون AI)

> **Single Source of Truth (SSOT)** لجميع الميزات المتبقية والديون التقنية المفتوحة في المشروع التي **لا تعتمد على مزود AI خارجي جديد**.  
> **طبيعة المنصة:** تعليمية مجانية بالكامل (لا توجد أي خطط مدفوعة، وميزات الـ AI التفاعلية مجمّدة حالياً).  
> **تاريخ التدقيق الفعلي ضد الكود:** `2026-11-12` (`v1.5.0`)  
> 🧊 **ملاحظة:** تم عزل كل ميزات الذكاء الاصطناعي التفاعلي غير المبنية (Micro-Tutor، AI Private Tutor، Slide RAG، Exam Cloning، Audio-to-Slide) في مجلد مستقل بعيداً عن خطة التنفيذ الحالية: [`docs/99_parked_ai/PARKED_AI_FEATURES.md`](../99_parked_ai/PARKED_AI_FEATURES.md).

---

## 1. الميزات الجاهزة للتطوير سابقاً (Non-AI — تم تنفيذها بالكامل في المرحلة الأولى `dd3847e`)

| # | الميزة | الحالة | التفاصيل والأدلة في الكود |
| :---: | :--- | :---: | :--- |
| **1.1** | **عارض الخرائط الذهنية (`MindMapViewer`)** | ✅ مُنفذ | `parseMindMapJson` + `countMindMapNodes` في [`lecture-utils.ts`](../../frontend/src/lib/lecture-utils.ts)، ومكون [`MindMapViewer.tsx`](../../frontend/src/components/lecture/MindMapViewer.tsx)، وتبويب `mindmap` في [`lecture/page.tsx`](../../frontend/src/app/lecture/page.tsx). |
| **1.2** | **Study Heatmap (خريطة الالتزام الـ 16 أسبوعاً)** | ✅ مُنفذ | [`heatmap.ts`](../../frontend/src/modules/gamification/core/heatmap.ts)، [`fetchStudentDailyActivity`](../../frontend/src/modules/gamification/supabase/gamification.ts)، ومكون [`StudyHeatmap.tsx`](../../frontend/src/components/gamification/StudyHeatmap.tsx) مدمجاً في [`StudentGamificationPill.tsx`](../../frontend/src/components/gamification/StudentGamificationPill.tsx). |
| **1.3** | **لوحة تحليلات الـ Gamification والأداء للأدمن** | ✅ مُنفذ | Endpoint `GET /api/diagnostics/cohort-analytics` في [`diagnostics.py`](../../app/routes/diagnostics.py) وواجهة تبويب `cohort` في [`AdminDiagnosticsModal.tsx`](../../frontend/src/components/admin/AdminDiagnosticsModal.tsx). |
| **1.4** | **التشطيب التلقائي لخطة التعويض (Self-Ticking Plan)** | ✅ مُنفذ | `mapAppEventToTaskType` و`reconcileRecoveryPlanWithEvent` في [`studyPlanner.ts`](../../frontend/src/lib/studyPlanner.ts)، وتحديث تلقائي عبر [`GamificationHost.tsx`](../../frontend/src/modules/gamification/ui/GamificationHost.tsx) و[`RecoveryPlannerModal.tsx`](../../frontend/src/components/RecoveryPlannerModal.tsx). |

---

## 2. الديون التقنية والصيانة (Technical Debt)

| # | البند | التفاصيل | المصدر | الوضع الحالي | الأولوية |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **2.1** | **تفكيك المكونات الضخمة `[OPT-FE-01]`** | تقسيم [`frontend/src/app/page.tsx`](../../frontend/src/app/page.tsx) (1,479 → 471 سطراً) و[`frontend/src/app/admin/dashboard/page.tsx`](../../frontend/src/app/admin/dashboard/page.tsx) (1,545 → 386 سطراً) إلى Custom Hooks (`usePortalCatalog`, `useAdminDiagnostics`, `useLectureUploadPipeline`) ومكونات أصغر (`components/portal/*`, `components/admin/*`). | [`SECURITY_AUDIT.md`](../02_architecture/SECURITY_AUDIT.md#L28) | ✅ **مُنفذ** (المرحلة الثانية). | 🟢 مكتمل |
| **2.2** | **تنظيف سجل Git التاريخي (`git filter-repo`)** | إزالة آثار الـ PAT وكلمة مرور الأدمن القديمة من تاريخ Git القديم. | [`TASKING.md`](../00_agent_context/TASKING.md) | ⏳ قيد التنفيذ في المرحلة الثانية. | 🟢 منخفضة |

---

## 3. ميزات تم التحقق من بنائها فعلياً (Excluded — Already Built in Code)

> تم فحص المستودع والتأكد أن كل العناصر التالية **مكتملة وموجودة بالفعل**:

| الميزة / البند | الدليل الفعلي في المستودع |
| :--- | :--- |
| **Exam Trap Radar & Cohort Hurdles (ذكاء الدفعة السلبي)** | [`ExamTrapBadge.tsx`](../../frontend/src/components/ExamTrapBadge.tsx), [`CohortHurdlesModal.tsx`](../../frontend/src/components/CohortHurdlesModal.tsx), [`stats.py`](../../app/routes/stats.py) |
| **Custom Exam Builder (منشئ الامتحانات التفاعلي)** | [`CustomExamBuilderModal.tsx`](../../frontend/src/components/CustomExamBuilderModal.tsx), [`examEngine.ts`](../../frontend/src/lib/examEngine.ts) |
| **Unified Formula Cheat Sheet (ورقة القوانين المجمعة)** | [`FormulaSheetModal.tsx`](../../frontend/src/components/FormulaSheetModal.tsx), [`formulaExtractor.ts`](../../frontend/src/lib/formulaExtractor.ts) |
| **Auto-Study Recovery Planner ("Clear My Backlog")** | [`RecoveryPlannerModal.tsx`](../../frontend/src/components/RecoveryPlannerModal.tsx), [`studyPlanner.ts`](../../frontend/src/lib/studyPlanner.ts) |
| **Focus Sound Engine & Pomodoro (الضوضاء البيضاء/البنية)** | [`FocusAmbienceModal.tsx`](../../frontend/src/components/FocusAmbienceModal.tsx), [`ambientFocusEngine.ts`](../../frontend/src/lib/ambientFocusEngine.ts) |
| **Floating Quiz Scratchpad & Scientific Calculator** | [`MathScratchpadModal.tsx`](../../frontend/src/components/MathScratchpadModal.tsx) |
| **Student Highlight Binder (كشكول مراجعاتي)** | [`StudentBinderModal.tsx`](../../frontend/src/components/StudentBinderModal.tsx) |
| **PWA Offline Support & Push Notifications** | [`manifest.json`](../../frontend/public/manifest.json), [`sw.js`](../../frontend/public/sw.js), [`pushNotifications.ts`](../../frontend/src/lib/pushNotifications.ts), [`notifications.py`](../../app/routes/notifications.py) |
| **Gamification Phases 3–6** (Hints, Diagnostics, Confidence, Neighborhood, Weekly Cohort Challenge) | [`BurnoutReliefModal.tsx`](../../frontend/src/modules/gamification/ui/BurnoutReliefModal.tsx), [`SessionFlowBar.tsx`](../../frontend/src/modules/gamification/ui/SessionFlowBar.tsx), [`ConfidenceSelector.tsx`](../../frontend/src/modules/gamification/ui/ConfidenceSelector.tsx), [`CohortChallengeWidget.tsx`](../../frontend/src/modules/gamification/ui/CohortChallengeWidget.tsx) |
| **`[OPT-ENV-01]` توحيد مسارات Windows/Linux و `[OPT-STR-01]` `FileResponse`** | [`upload.py`](../../app/routes/upload.py), [`prompt_service.py`](../../app/services/prompt_service.py), [`stream.py`](../../app/routes/stream.py) |
