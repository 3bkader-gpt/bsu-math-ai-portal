# 📌 UNBUILT_FEATURES_SSOT.md — المرجع الوحيد المعتمد للميزات المتبقية (بدون AI)

> **Single Source of Truth (SSOT)** لجميع الميزات المتبقية والديون التقنية المفتوحة في المشروع التي **لا تعتمد على مزود AI خارجي جديد**.  
> **طبيعة المنصة:** تعليمية مجانية بالكامل (لا توجد أي خطط مدفوعة، وميزات الـ AI التفاعلية مجمّدة حالياً).  
> **تاريخ التدقيق الفعلي ضد الكود:** `2026-11-12` (`v1.5.0`)  
> 🧊 **ملاحظة:** تم عزل كل ميزات الذكاء الاصطناعي التفاعلي غير المبنية (Micro-Tutor، AI Private Tutor، Slide RAG، Exam Cloning، Audio-to-Slide) في مجلد مستقل بعيداً عن خطة التنفيذ الحالية: [`docs/99_parked_ai/PARKED_AI_FEATURES.md`](../99_parked_ai/PARKED_AI_FEATURES.md).

---

## 1. الميزات المتبقية الجاهزة للتطوير (Non-AI — من بيانات وباك-إند المنصة الحالي)

| # | الميزة | الوصف المختصر | ما يوجد حالياً في الكود vs ما ينقص | الأولوية |
| :---: | :--- | :--- | :--- | :---: |
| **1.1** | **عارض الخرائط الذهنية (`MindMapViewer`)** | واجهة بصرية تفاعلية لعرض الخريطة الذهنية لكل محاضرة. | الباك-إند يولّد `mind_map_json` أصلاً من NotebookLM ويرفعه ويبثه عبر `/api/stream/{id}` ([`notebooklm_service.py`](../../app/services/notebooklm_service.py#L225-L234) و[`stream.py`](../../app/routes/stream.py#L189))، لكن لا يوجد مكون لعرضه في `frontend/src`. | 🔴 عالية |
| **1.2** | **Study Heatmap (خريطة الالتزام الـ 16 أسبوعاً)** | شبكة نشاط شبيهة بـ GitHub في ملف الطالب توضح أيام وكثافة المذاكرة. | جدول `daily_activity` موجود في Supabase ويسجّل النشاط اليومي بالفعل، وينقصه فقط مكون الـ Heatmap في الواجهة. | 🟡 متوسطة |
| **1.3** | **لوحة تحليلات الـ Gamification والأداء للأدمن** | تبويب في `/admin/dashboard` يعرض معدلات الاحتفاظ (D1/D7)، نشاط الدفعة اليومي، أكثر المحاضرات مشاهدة، وأصعب الأسئلة. | الـ SQL KPI Views موجودة ومؤمّنة في Supabase (`20261020_phase2_kpi_views.sql`)، وينقصها فقط واجهة الرسوم البيانية في `/admin/dashboard`. | 🟡 متوسطة |
| **1.4** | **التشطيب التلقائي لخطة التعويض (Self-Ticking Plan)** | تعليم مهام اليوم في `RecoveryPlannerModal` كمكتملة تلقائياً بمجرد إنهاء كويز أو قراءة ملخص المحاضرة المرتبطة. | [`RecoveryPlannerModal.tsx`](../../frontend/src/components/RecoveryPlannerModal.tsx) و[`studyPlanner.ts`](../../frontend/src/lib/studyPlanner.ts) يعتمدان حالياً على التأشير اليدوي من الطالب. | 🟢 منخفضة |

---

## 2. الديون التقنية والصيانة (Technical Debt — اختيارية)

| # | البند | التفاصيل | المصدر | الوضع الحالي | الأولوية |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **2.1** | **تفكيك المكونات الضخمة `[OPT-FE-01]`** | تقسيم [`frontend/src/app/page.tsx`](../../frontend/src/app/page.tsx) (1,479 سطراً) و[`frontend/src/app/admin/dashboard/page.tsx`](../../frontend/src/app/admin/dashboard/page.tsx) (1,532 سطراً) إلى Custom Hooks ومكونات أصغر لسهولة الصيانة. | [`SECURITY_AUDIT.md`](../02_architecture/SECURITY_AUDIT.md#L28) | المكونات تعمل باستقرار في الإنتاج؛ التحسين اختياري للصيانة. | 🟢 منخفضة |
| **2.2** | **تنظيف سجل Git التاريخي (`git filter-repo`)** | إزالة آثار الـ PAT وكلمة مرور الأدمن القديمة من تاريخ Git القديم. | [`TASKING.md`](../00_agent_context/TASKING.md) | الـ PAT وكلمة المرور القديمة تم إبطالهما وتدويرهما منذ 2026-10-24 ولا خطر نشط؛ التنظيف اختياري. | 🟢 منخفضة |

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
