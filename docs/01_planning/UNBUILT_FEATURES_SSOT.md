# 📌 UNBUILT_FEATURES_SSOT.md — المرجع الوحيد المعتمد للميزات غير المنفذة

> **Single Source of Truth (SSOT)** لجميع الميزات المتبقية، الأفكار البحثية غير المبنية، والديون التقنية المفتوحة في المشروع.  
> **تاريخ التدقيق الفعلي ضد الكود:** `2026-11-12` (`v1.5.0`)  
> **القاعدة:** أي ميزة تُنفَّذ تُنقل هنا من قسم "غير المنفذ" أو تُحذف مع تحديث المرجع، وقد تم استبعاد كل ما تبيّن وجوده فعلياً في الكود (راجع القسم 5 أسفله).

---

## 1. ميزات الذكاء الاصطناعي والتفاعل التعليمي (AI Tutoring & Study Features)

| # | الميزة | الوصف المختصر | المصدر | ما يوجد حالياً في الكود vs ما ينقص | الأولوية |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **1.1** | **Zero-Prompt Micro-Tutor (مصحح الأخطاء بالذكاء الاصطناعي)** | زران تحت الإجابة الخاطئة في الكويز (`"اشرحهالي ببساطة"`، `"القانون ده جه منين؟"`) لشرح الخطأ بـ 3 نقاط مركزة في $< 800\text{ms}$ عبر Groq LLaMA أو Gemini Flash مع كاش مشترك. | [`AUTONOMOUS_ECOSYSTEM_SPECIFICATION.md`](../AUTONOMOUS_ECOSYSTEM_SPECIFICATION.md#L214-L274) | لا يوجد Endpoint أو UI زر Micro-Tutor. دالة السياق [`getStudentContextForAI()`](../../frontend/src/lib/studentProfile.ts#L118) موجودة ومستعدة للربط. | 🔴 عالية |
| **1.2** | **AI Private Tutor ("The Big One")** | معلم خاص 1-on-1 يخاطب الطالب باسمه ويركّز تلقائياً على أسئلة Box 1 الصعبة والمحاضرات الأقل درجة. | [`PLATFORM_FEATURES.md`](../PLATFORM_FEATURES.md#L212-L220) | دالة تجميع السياق `getStudentContextForAI()` مبنية بالكامل في Frontend، لكن لا توجد واجهة محادثة أو LLM API موصولة بها. | 🟡 متوسطة |
| **1.3** | **عارض الخرائط الذهنية (`MindMapViewer`)** | واجهة بصرية تفاعلية لعرض هيكل المفاهيم وعلاقاتها لكل محاضرة. | [`notebooklm_service.py`](../../app/services/notebooklm_service.py#L225-L234) | الباك-إند يولّد ويرفع ويبث `mind_map_json` عبر `/api/stream/{id}` بالفعل، لكن لا يوجد أي مكون يعرض `mind_map` في `frontend/src` (فجوة جاهزة للتشغيل الفوري). | 🔴 عالية |
| **1.4** | **Slide-Aware RAG & Multimodal Vision OCR** | ربط قارئ الـ PDF برقم الصفحة Open Slide بحيث يرى الشات الصفحة الحالية + الرسومات/المنحنيات (`Area Selection / Figure Context`) مع أوامر سريعة (`اشرح السلايد دي ببساطة`). | [`physiotalk_reverse/CORE_FEATURES_BREAKDOWN.md`](../../physiotalk_reverse/CORE_FEATURES_BREAKDOWN.md#L3-L12) | غير مبني نهائياً؛ المنصة الحالية تعتمد على أصول NotebookLM المولدة مسبقاً (`study_guide_md`, `quiz_md`, ...). | 🟡 متوسطة |
| **1.5** | **Doctor Recording to Slide Annotations ("Doctor Tab")** | رفع تسجيل الدكتور الصوتي/المرئي في المدرج، تفريغه (عامية مصرية + مصطلحات رياضية)، استخراج تنبيهات الامتحان (`"بتيجي في الامتحان"`)، وربطها بمواضع السلايدات مع حذف الصوت ومسح أي PII. | [`physiotalk_reverse/ACTIONABLE_BLUEPRINT_FOR_OUR_PLATFORM.md`](../../physiotalk_reverse/ACTIONABLE_BLUEPRINT_FOR_OUR_PLATFORM.md) | غير مبني نهائياً. | 🟢 مستقبلية |
| **1.6** | **University Exam Cloning (محاكي امتحانات السنين السابقة)** | رفع صورة أو PDF لامتحان كلية قديم لتحليل أسلوب الأسئلة وتوزيع الدرجات وتوليد امتحان محاكٍ بنفس البنية من المنهج الحالي. | [`physiotalk_reverse/ACTIONABLE_BLUEPRINT_FOR_OUR_PLATFORM.md`](../../physiotalk_reverse/ACTIONABLE_BLUEPRINT_FOR_OUR_PLATFORM.md) | غير مبني (`CustomExamBuilderModal.tsx` يبني امتحانات من بنك أسئلة الكويزات الموجودة فقط ولا يحلل أوراق امتحانات خارجية). | 🟡 متوسطة |

---

## 2. ميزات الإدارة والتحليلات (Admin & Analytics)

| # | الميزة | الوصف المختصر | المصدر | ما يوجد حالياً في الكود vs ما ينقص | الأولوية |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **2.1** | **لوحة تحليلات الـ Gamification والأداء للأدمن** | شاشة في `/admin/dashboard` تعرض معدلات الاحتفاظ (D1/D7)، نشاط الدفعة اليومي، أكثر المحاضرات مشاهدة، وأصعب الأسئلة. | [`TASKING.md`](./TASKING.md) & `supabase/migrations/20261020_phase2_kpi_views.sql` | الـ SQL KPI Views موجودة ومؤمّنة في Supabase، لكن `/admin/dashboard` يعرض إدارة الأصول والتشخيص الفني فقط بدون تبويب تحليلات سلوكية. | 🟡 متوسطة |

---

## 3. الديون التقنية، الصيانة والأمان (Technical Debt & Security Hygiene)

| # | البند | التفاصيل | المصدر | الوضع الحالي | الأولوية |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **3.1** | **تفكيك المكونات الضخمة `[OPT-FE-01]`** | تقسيم [`frontend/src/app/page.tsx`](../../frontend/src/app/page.tsx) (1,479 سطراً) و [`frontend/src/app/admin/dashboard/page.tsx`](../../frontend/src/app/admin/dashboard/page.tsx) (1,532 سطراً) إلى Custom Hooks ومكونات أصغر لسهولة الصيانة. | [`SECURITY_AUDIT.md`](../02_architecture/SECURITY_AUDIT.md#L28) | المكونات تعمل باستقرار في الإنتاج؛ التحسين اختياري للصيانة. | 🟢 منخفضة |
| **3.2** | **تنظيف سجل Git التاريخي (`git filter-repo`)** | إزالة آثار الـ PAT وكلمة مرور الأدمن القديمة من تاريخ Git القديم. | [`TASKING.md`](./TASKING.md) | الـ PAT وكلمة المرور القديمة تم إبطالهما وتدويرهما منذ 2026-10-24 ولا خطر نشط؛ التنظيف اختياري. | 🟢 منخفضة |
| **3.3** | **ضوابط أمان ميزات الـ AI المستقبلية** | تطبيق `Prompt Injection Isolation` (`<lecture_content>...</lecture_content>`) وحذف الملفات الصوتية المرفوعة فوراً (`Ephemeral Audio`) وفلترة PII عند بناء البندين **1.4** أو **1.5**. | [`physiotalk_reverse/SECURITY_AND_VULNERABILITIES_AUDIT.md`](../../physiotalk_reverse/SECURITY_AND_VULNERABILITIES_AUDIT.md#L65-L99) | غير مطبق لعدم وجود شات RAG مفتوح أو تفريغ تسجيلات طلابية حتى الآن — شرط أساسي عند بنائهما. | 🔴 إلزامي وقت التنفيذ |

---

## 4. خطة التوسع التجاري والخطط المدفوعة (Optional Commercialization — مؤجلة)

> البوابة مجانية بالكامل حالياً لطلاب قسم الرياضيات بجامعة بني سويف؛ هذه البنود تُنفّذ **فقط** عند التوسع لنظام باقات أو جامعات أخرى:

- **4.1** **نظام رصيد واضح بدون تحايل (`Honest Quotas` + `Atomic Server Credit Deduction`)** داخل معاملة الباك-إند قبل استدعاء أي LLM (بديلاً عن ثغرة الـ Client-side Paywall).  
- **4.2** **بوابات الدفع المصرية (بدون تجديد تلقائي):** تكامل **Paymob** (بطاقات/محافظ كاش/Apple Pay) + تحقق فوري لـ **InstaPay** + خطط **اشتراك الشلة/الدفعة (3–5 طلاب)** ([`ACTIONABLE_BLUEPRINT_FOR_OUR_PLATFORM.md`](../../physiotalk_reverse/ACTIONABLE_BLUEPRINT_FOR_OUR_PLATFORM.md)).  
- **4.3** **Dynamic PDF Watermarking:** علامة مائية خفيفة بمعرّف الطالب على ملفات المذكرات عند وجود محتوى مدفوع ([`SECURITY_AND_VULNERABILITIES_AUDIT.md`](../../physiotalk_reverse/SECURITY_AND_VULNERABILITIES_AUDIT.md#L24)).

---

## 5. ميزات تم التحقق من بنائها فعلياً (Excluded — Already Built in Code)

> كانت بعض الخطط القديمة تذكر هذه العناصر كمؤجلة، لكن الفحص الفعلي للمستودع أثبت أنها **مكتملة وموجودة في الكود**:

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
