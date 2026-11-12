# 🧊 PARKED_AI_FEATURES.md — ميزات الذكاء الاصطناعي المؤجلة (بدون مزود حالياً)

> **الحالة:** ⏸️ **مجمّدة مؤقتاً (Parked / On Hold)** — بسبب إغلاق مزود الـ LLM الذي كان مخططاً الاعتماد عليه.  
> **الغرض من هذا المجلد المنفصل (`docs/99_parked_ai/`):** الاحتفاظ بجميع مواصفات وأفكار الذكاء الاصطناعي التفاعلي وضوابط أمانه كاملةً في مكان بعيد ومعزول عن خريطة التطوير الحالية، لحين توفر مزود AI جديد ومناسب (مجاني أو بسعر منخفض).  
> *ملحوظة: هذا الملف لا يشمل خط إنتاج المحاضرات القائم (`NotebookLM` على Lightsail)، بل يقتصر على ميزات الـ AI التفاعلية للطالب غير المنفذة.*

---

## 1. Zero-Prompt Micro-Tutor (مصحح الأخطاء التفاعلي تحت الكويز)
- **المصدر الأصلي:** [`docs/AUTONOMOUS_ECOSYSTEM_SPECIFICATION.md`](../AUTONOMOUS_ECOSYSTEM_SPECIFICATION.md#L214-L274)
- **الفكرة:** عرض زرَّين محددين مباشرة أسفل أي سؤال يُخطئ فيه الطالب في الكويز:
  - `"اشرحهالي ببساطة"`
  - `"القانون ده جه منين؟"`
- **الآلية المقترحة:** إرسال سياق محدود (المادة، المحاضرة، السؤال، إجابة الطالب، الإجابة الصحيحة) بحد أقصى `180` توكن ودرجة حرارة `0.2` للحصول على شرح بالعامية المصرية في 3 نقاط مختصرة، مع كاش مشترك في IndexedDB أو السيرفر لتقليل الاستهلاك بنسبة $> 75\%$.
- **ما يوجد بالفعل في الكود:** دالة [`getStudentContextForAI()`](../../frontend/src/lib/studentProfile.ts#L118) جاهزة ومستعدة للربط وقت توفر مزود LLM.

---

## 2. AI Private Tutor ("The Big One" — المعلم الشخصي الذكي)
- **المصدر الأصلي:** [`docs/PLATFORM_FEATURES.md`](../PLATFORM_FEATURES.md#L212-L220)
- **الفكرة:** معلم خاص 1-on-1 يخاطب الطالب باسمه، يقرأ سياقه الأكاديمي، يحدد نقاط ضعفه التلقائية من صندوق Leitner الأول (`Box 1`) والمحاضرات ذات الدرجات المنخفضة، ويشرح له البراهين والخطوات تفاعلياً.
- **ما يوجد بالفعل في الكود:** دالة تجميع السياق [`getStudentContextForAI()`](../../frontend/src/lib/studentProfile.ts#L118) مبنية على الواجهة، بدون شات أو LLM API متصل بها.

---

## 3. Slide-Aware RAG & Multimodal Vision OCR (الشات المرتبط برقم السلايد والرسم)
- **المصدر الأصلي:** [`physiotalk_reverse/CORE_FEATURES_BREAKDOWN.md`](../../physiotalk_reverse/CORE_FEATURES_BREAKDOWN.md#L3-L12)
- **الفكرة:**
  - ربط قارئ الـ PDF بالمساعد بحيث يرى رقم الصفحة المفتوحة `{ lecture_id, page_number }` ومحتوى النص والرسومات/المنحنيات (`Figure Context`).
  - أداة قص مساحة (`Area Explanation Tool`) لتحديد أي رسم بياني أو معادلة وطلب شرحها مباشرة.
  - أوامر جاهزة: `"اشرح السلايد دي ببساطة"`، `"فسّر الرسمة/الإثبات خطوة بخطوة"`، `"إيه الأسئلة المتوقعة هنا؟"`.

---

## 4. Doctor Recording to Slide Annotations ("Doctor Tab" / تفريغ تسجيلات المحاضرات)
- **المصدر الأصلي:** [`physiotalk_reverse/ACTIONABLE_BLUEPRINT_FOR_OUR_PLATFORM.md`](../../physiotalk_reverse/ACTIONABLE_BLUEPRINT_FOR_OUR_PLATFORM.md)
- **الفكرة:**
  - رفع تسجيل الدكتور الصوتي أو المرئي من المدرج.
  - تفريغ الكلام المختلط (عامية مصرية + مصطلحات رياضية وعلمية).
  - استخراج تنبيهات الامتحان تلقائياً (`"مهمة"`، `"بتيجي في الامتحان"`، `"ركزوا هنا"`) وربطها بأرقام السلايدات المقابلة.

---

## 5. University Exam Cloning (تحليل وتوليد امتحانات مشابهة لامتحانات السنين السابقة)
- **المصدر الأصلي:** [`physiotalk_reverse/ACTIONABLE_BLUEPRINT_FOR_OUR_PLATFORM.md`](../../physiotalk_reverse/ACTIONABLE_BLUEPRINT_FOR_OUR_PLATFORM.md)
- **الفكرة:** رفع صورة أو PDF لامتحان كلية قديم (فاينال أو ميدترم) لتحليل أنماط الأسئلة وتوزيع الدرجات وتوليد امتحان جديد مطابق للهيكل من محاضرات المنهج الحالي.  
*(ملاحظة: [`CustomExamBuilderModal.tsx`](../../frontend/src/components/CustomExamBuilderModal.tsx) الحالي يبني امتحانات عشوائية من بنك الكويزات الموجودة فقط بالـ Fisher-Yates بدون AI).*

---

## 6. متطلبات الأمان الإلزامية عند إعادة تفعيل أي ميزة AI من القائمة أعلاه
- **المصدر:** [`physiotalk_reverse/SECURITY_AND_VULNERABILITIES_AUDIT.md`](../../physiotalk_reverse/SECURITY_AND_VULNERABILITIES_AUDIT.md)
1. **Server-Side Rate Limiting:** فرض حد يومي عادل لكل جلسة طالب على الباك-إند (`429 DAILY_AI_LIMIT_REACHED`) مع رسالة واضحة بموعد التجدد لحماية حصة المزود المجانية من الاستنزاف.
2. **Prompt Injection Context Isolation:** تغليف أي نص مستخرج من ملفات PDF مرفوعة بـ delimiters صارمة مثل `<lecture_content>...</lecture_content>` ومنع كشف System Prompts.
3. **Ephemeral Audio & PII Scrubbing (للبند 4):** معالجة الملف الصوتي مؤقتاً وحذفه فور انتهاء التفريغ، مع تمرير النص على فلتر لإزالة أي أسماء أو أرقام هواتف.
