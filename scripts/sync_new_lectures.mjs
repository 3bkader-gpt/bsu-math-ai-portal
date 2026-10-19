import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://cjmlnpdtfclzcvehebsv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqbWxucGR0ZmNsemN2ZWhlYnN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4MjUyMDIsImV4cCI6MjEwNzQwMTIwMn0.NipIyq1IfvcjXiI9iL4KjIq-B-OK60AI0guQZz5PB8k';

const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function post(endpoint, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`POST /${endpoint} failed (${res.status}): ${err}`);
  }
  return await res.json();
}

async function get(endpoint) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GET /${endpoint} failed (${res.status}): ${err}`);
  }
  return await res.json();
}

async function patch(endpoint, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    method: 'PATCH',
    headers: HEADERS,
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PATCH /${endpoint} failed (${res.status}): ${err}`);
  }
  return await res.json();
}

// 8 Lectures definition with academic assets
const LECTURES_DATA = [
  // 1. الكهربية محاضرة 3
  {
    subject_id: 8,
    lecture_num: 3,
    title: 'كود ألوان المقاومات والمقاومات الضوئية والحرارية (LDR والثرمستور)',
    doctor: 'د/ حسن سيد',
    disk_folder: 'D:\\الكليه\\subjects\\كهربيه مغناطيسية وتيار متردد\\lec3',
    quiz: `# كويز كود ألوان المقاومات والمقاومات الخاصة

## Question 1
حسب كود ألوان المقاومات المكون من 4 أطواق، اللون "الأحمر" يمثل الرقم كام؟

- [ ] 1
- [x] 2
- [ ] 3
- [ ] 4

**Hint:** افتكر جملة الألوان الشهيرة (أسود 0، بني 1، أحمر 2).

## Question 2
إذا كانت أطواق المقاومة بالترتيب: بني - أسود - أحمر - ذهبي، فإن قيمة المقاومة ونسبة الخطأ هي:

- [ ] $100\\ \\Omega \\pm 10\\%$
- [x] $1000\\ \\Omega \\pm 5\\%$
- [ ] $10\\ \\text{k}\\Omega \\pm 5\\%$
- [ ] $1200\\ \\Omega \\pm 1\\%$

**Hint:** بني=1، أسود=0، أحمر=عامل الضرب $10^2$ (أي 100)، الذهبي=نسبة سماحية $\\pm 5\\%$.

## Question 3
في المقاومة الضوئية (LDR)، إيه اللي بيحصل لقيمتها لما شدة الضوء الساقط عليها تزيد؟

- [ ] تزيد المقاومة
- [x] تقل المقاومة
- [ ] تظل ثابتة تماماً
- [ ] تنعدم شحنتها

**Hint:** الضوء يحرر إلكترونات التوصيل مما يسهل مرور التيار ويزيد التوصيلية.

## Question 4
الثرمستور من النوع NTC يتميز بإيه مع زيادة درجة الحرارة؟

- [ ] تزداد مقاومته
- [x] تقل مقاومته (معامل حراري سالب)
- [ ] ينفجر عند الصفر
- [ ] يعمل كمكثف فائق

**Hint:** NTC تعني Negative Temperature Coefficient.

## Question 5
الطوق الرابع في المقاومة الكربونية غالباً بيعبر عن:

- [ ] سعة المقاومة
- [ ] أقصى تيار مسموح
- [x] نسبة السماحية أو الخطأ (Tolerance)
- [ ] التردد الرنيني

**Hint:** الفضي يمثل $\\pm 10\\%$ والذهبي يمثل $\\pm 5\\%$.`,
    guide: `# دليل دراسي: كود ألوان المقاومات والمقاومات الحساسة (LDR & Thermistor)

---

## أولاً: كود ألوان المقاومات الكربونية (Resistor Color Code)
لحساب قيمة المقاومة ذات الأربعة أطواق:
$$\\text{Value} = (\\text{Band}_1 \\times 10 + \\text{Band}_2) \\times 10^{\\text{Band}_3} \\pm \\text{Tolerance}\\%$$

### جدول ألوان المقاومات القياسي:
| اللون | الرقم | المعامل ($10^n$) | نسبة الخطأ (Tolerance) |
|---|:---:|:---:|:---:|
| أسود (Black) | 0 | $10^0 = 1$ | - |
| بني (Brown) | 1 | $10^1 = 10$ | $\\pm 1\\%$ |
| أحمر (Red) | 2 | $10^2 = 100$ | $\\pm 2\\%$ |
| برتقالي (Orange) | 3 | $10^3 = 1\\text{k}$ | - |
| أصفر (Yellow) | 4 | $10^4 = 10\\text{k}$ | - |
| أخضر (Green) | 5 | $10^5 = 100\\text{k}$ | $\\pm 0.5\\%$ |
| أزرق (Blue) | 6 | $10^6 = 1\\text{M}$ | - |
| بنفسجي (Violet) | 7 | $10^7 = 10\\text{M}$ | - |
| رمادي (Gray) | 8 | $10^8$ | - |
| أبيض (White) | 9 | $10^9$ | - |
| ذهبي (Gold) | - | $10^{-1} = 0.1$ | $\\pm 5\\%$ |
| فضي (Silver) | - | $10^{-2} = 0.01$ | $\\pm 10\\%$ |

---

## ثانياً: المقاومات المتغيرة والحساسة (Sensors)
1. **المقاومة الضوئية (LDR - Light Dependent Resistor):**
   * مصنوعة من مادة كبريتيد الكادميوم (CdS).
   * علاقة عكسية: في الظلام مقاومتها تصل لميجا أوم ($M\\Omega$)، ومع تسليط الضوء تهبط لبضع مئات من الأوم.
2. **المقاومات الحرارية (Thermistors):**
   * **نوع NTC (معامل سالب):** الأكثر استخداماً في دوائر الحماية وقياس الحرارة، حيث تقل المقاومة بارتفاع الحرارة.
   * **نوع PTC (معامل موجب):** تزداد المقاومة بزيادة الحرارة، وتستخدم كفيوز ذاتي للحماية من التيار الزائد.`,
    flashcards: `# بطاقات استذكار: كود المقاومات والحساسات

## Card 1
**Q:** ما هي قيمة مقاومة ألوانها: أحمر - أحمر - برتقالي - ذهبي؟
**A:** أحمر(2)، أحمر(2)، برتقالي($10^3$) $\\implies 22 \\times 10^3 = 22\\ \\text{k}\\Omega$ بنسبة خطأ $\\pm 5\\%$.

---

## Card 2
**Q:** ماذا يعني اختصار LDR وفيما تستخدم عملياً؟
**A:** Light Dependent Resistor (مقاومة معتمدة على الضوء)، وتستخدم في دوائر الإنارة التلقائية لأعمدة الشوارع وأجهزة الإنذار.

---

## Card 3
**Q:** ما الفرق بين ثرمستور NTC وثرمستور PTC؟
**A:** NTC تقل مقاومته مع ارتفاع الحرارة، بينما PTC تزداد مقاومته مع ارتفاع الحرارة.`
  },

  // 2. الكهربية محاضرة 4
  {
    subject_id: 8,
    lecture_num: 4,
    title: 'المكثفات الكهربية وسعتها وأنواعها والمفاعلة السعوية',
    doctor: 'د/ حسن سيد',
    disk_folder: 'D:\\الكليه\\subjects\\كهربيه مغناطيسية وتيار متردد\\lec4',
    quiz: `# كويز المكثفات الكهربية والمفاعلة السعوية

## Question 1
سعة المكثف ذي اللوحين المتوازيين تتناسب طردياً مع:

- [ ] المسافة الفاصلة بين اللوحين ($d$)
- [x] مساحة اللوحين المشتركة ($A$) وثابت العزل ($\\epsilon$)
- [ ] فرق الجهد بين اللوحين فقط
- [ ] المقاومة الداخلية للسلك

**Hint:** القانون $C = \\frac{\\epsilon A}{d}$.

## Question 2
المفاعلة السعوية للمكثف ($X_C$) في دوائر التيار المتردد تعطى بالعلاقة:

- [ ] $X_C = 2\\pi f C$
- [x] $X_C = \\frac{1}{2\\pi f C}$
- [ ] $X_C = \\frac{2\\pi f}{C}$
- [ ] $X_C = \\sqrt{LC}$

**Hint:** كلما زاد التردد، يسهل مرور التيار وتقل المفاعلة السعوية.

## Question 3
في دائرة تيار متردد تحتوي على مكثف نقي فقط، العلاقة الطورية بين الجهد والتيار هي:

- [ ] الجهد يسبق التيار بزاوية $90^\\circ$
- [x] التيار يسبق الجهد بزاوية $90^\\circ$ ($\\pi/2$)
- [ ] الجهد والتيار متفقان في الطور
- [ ] فرق الطور بينهما $180^\\circ$

**Hint:** افتكر جملة ICE (التيار I يسبق الجهد E في المكثف C).

## Question 4
عند توصيل مكثفين متساويين سعة كل منهما $10\\ \\mu\\text{F}$ على التوالي، تكون السعة الكلية:

- [ ] $20\\ \\mu\\text{F}$
- [x] $5\\ \\mu\\text{F}$
- [ ] $100\\ \\mu\\text{F}$
- [ ] $0.5\\ \\mu\\text{F}$

**Hint:** التوصيل على التوالي للمكثفات يحسب مثل التوازي في المقاومات: $C_{eq} = \\frac{C_1 C_2}{C_1 + C_2}$.

## Question 5
وحدة قياس سعة المكثف هي:

- [ ] هنري (Henry)
- [x] فاراد (Farad) أو كولوم/فولت
- [ ] ويبر (Weber)
- [ ] تسلا (Tesla)

**Hint:** $C = Q / V$.`,
    guide: `# دليل دراسي: المكثفات الكهربية وسعتها والمفاعلة السعوية

---

## أولاً: مفهوم سعة المكثف (Capacitance)
المكثف عنصر إلكتروني يخزن الطاقة الكهربية في صورة مجال كهربي بين لوحيه.
$$C = \\frac{Q}{V}$$
حيث $Q$ الشحنة بالكولوم، و $V$ فرق الجهد بالفولت، و $C$ السعة بالفاراد ($F$).

### سعة المكثف ذي اللوحين المتوازيين:
$$C = \\frac{\\epsilon_r \\epsilon_0 A}{d}$$
* $A$: مساحة اللوحين ($m^2$).
* $d$: المسافة بين اللوحين ($m$).
* $\\epsilon_0$: سماحية الفراغ ($8.85 \\times 10^{-12}\\ \\text{F/m}$).
* $\\epsilon_r$: ثابت العزل النسبي للوسط العازل (Dielectric).

---

## ثانياً: طرق توصيل المكثفات
1. **على التوازي (Parallel):**
   $$C_{eq} = C_1 + C_2 + C_3 + \\dots$$
   (تزداد السعة الكلية، والجهد متساوٍ على الجميع).
2. **على التوالي (Series):**
   $$\\frac{1}{C_{eq}} = \\frac{1}{C_1} + \\frac{1}{C_2} + \\dots \\implies C_{eq} = \\frac{C_1 C_2}{C_1 + C_2}$$
   (تقل السعة الكلية، والشحنة $Q$ متساوية).

---

## ثالثاً: المفاعلة السعوية في التيار المتردد (Capacitive Reactance)
$$X_C = \\frac{1}{\\omega C} = \\frac{1}{2\\pi f C}$$
* عند الترددات العالية جداً ($f \\to \\infty$): $X_C \\to 0$ (المكثف يسلك سلوك سلك توصيل قصير Short Circuit).
* في التيار المستمر DC ($f = 0$): $X_C = \\infty$ (المكثف يمنع مرور التيار المستمر Open Circuit).
* **العلاقة الطورية:** التيار يسبق الجهد بزاوية طور مقدارها $90^\\circ$ أو $\\pi/2$.`,
    flashcards: `# بطاقات استذكار: المكثفات والمفاعلة السعوية

## Card 1
**Q:** ما هو قانون المفاعلة السعوية وما وحدة قياسها؟
**A:** $X_C = \\frac{1}{2\\pi f C}$، وتقاس بوحدة الأوم ($\\Omega$).

---

## Card 2
**Q:** لماذا يمنع المكثف مرور التيار المستمر (DC) بعد اكتمال شحنه؟
**A:** لأن تردد التيار المستمر صفر ($f=0$) فتكون ممانعته السعوية لا نهائية ($X_C = \\infty$) فيتصرف كمفتاح مفتوح.

---

## Card 3
**Q:** كيف تتغير سعة مكثف إذا ضاعفنا المسافة بين لوحيه ووضعنا مادة عازلة ثابت عزلها $\\epsilon_r = 4$؟
**A:** تتضاعف السعة مرتين، لأن مضاعفة المسافة تقسمها على 2 ووضع العازل يضربها في 4، فتصبح $4/2 = 2C$.`
  },

  // 3. الكهربية محاضرة 5
  {
    subject_id: 8,
    lecture_num: 5,
    title: 'الملفات وتأثيرها والحث الذاتي وتصنيف الملفات حسب مادة القلب',
    doctor: 'د/ حسن سيد',
    disk_folder: 'D:\\الكليه\\subjects\\كهربيه مغناطيسية وتيار متردد\\lec5',
    quiz: `# كويز الملفات والحث الذاتي

## Question 1
يقاس معامل الحث الذاتي للملف ($L$) بوحدة:

- [ ] الفاراد
- [x] الهنري (Henry)
- [ ] التسلا
- [ ] الأوم/متر

**Hint:** سمي تيمناً بالعالم جوزيف هنري، ويكافئ فولت.ثانية/أمبير.

## Question 2
المفاعلة الحثية للملف ($X_L$) تتناسب:

- [ ] عكسياً مع التردد
- [x] طردياً مع التردد ومعامل الحث الذاتي ($X_L = 2\\pi f L$)
- [ ] عكسياً مع مربع التيار
- [ ] لا تتغير مع التردد

**Hint:** كلما زاد التردد، زاد معدل تغير التيار وزادت القوة الدافعة المستحثة العكسية.

## Question 3
في دائرة تيار متردد تحتوي على ملف حث نقي، طور الجهد بالنسبة للتيار:

- [x] الجهد يسبق التيار بزاوية $90^\\circ$
- [ ] التيار يسبق الجهد بزاوية $90^\\circ$
- [ ] متفقان في الطور
- [ ] متعاكسان بزاوية $180^\\circ$

**Hint:** افتكر جملة ELI (الجهد E يسبق التيار I في الملف L).

## Question 4
الطاقة المغناطيسية المخزنة داخل ملف حثه $L$ ويمر به تيار $I$ تعطى بالعلاقة:

- [ ] $E = L I$
- [x] $E = \\frac{1}{2} L I^2$
- [ ] $E = \\frac{1}{2} L^2 I$
- [ ] $E = \\frac{L}{I^2}$

**Hint:** تشبه تماماً طاقة الحركة $\\frac{1}{2}mv^2$ وطاقة المكثف $\\frac{1}{2}CV^2$.

## Question 5
الملفات ذات القلب الفيريتي (Ferrite Core) تفضل في الترددات العالية لأنها:

- [ ] توصل الحرارة بسرعة
- [x] تقلل من التيارات الدوامية ومفاقيد الطاقة (Eddy Currents)
- [ ] تزيد من وزن الدائرة
- [ ] تجعل الحث صفراً

**Hint:** مادة الفيريت ذات مقاومة كهربية عالية جداً تمنع تشكل التيارات الإعصارية.`,
    guide: `# دليل دراسي: الملفات والحث الذاتي والمفاعلة الحثية

---

## أولاً: مفهوم الحث الذاتي للملف (Self Inductance)
الملف يخزن الطاقة الكهربية في صورة **مجال مغناطيسي**.
عند تغير التيار المار في الملف، يتولد فيه فيض مغناطيسي متغير ينتج عنه قوة دافعة كهربية مستحثة عكسية (قانون لنز):
$$\\mathcal{E} = -L \\frac{dI}{dt}$$
معامل الحث الذاتي $L$ يقاس بالهنري ($H$).

### العوامل المؤثرة على معامل الحث الذاتي لملف لولبي:
$$L = \\frac{\\mu N^2 A}{\\ell}$$
* $\\mu$: النفاذية المغناطيسية لمادة القلب.
* $N$: عدد لفات الملف.
* $A$: مساحة مقطع الملف ($m^2$).
* $\\ell$: طول الملف ($m$).

---

## ثانياً: تصنيف الملفات حسب مادة القلب
1. **ملفات ذات قلب هوائي (Air Core):** حثها منخفض، تستخدم في دوائر التردد اللاسلكي العالي (RF).
2. **ملفات ذات قلب حديدي (Iron Core):** حثها عالي جداً، تستخدم في محولات القدرة والترددات المنخفضة (50/60Hz).
3. **ملفات ذات قلب فيريت (Ferrite Core):** حث ممتاز مع مقاومة عالية لتقليل التيارات الدوامية، مثالية للترددات المتوسطة والعالية ومزودات الطاقة (SMPS).

---

## ثالثاً: المفاعلة الحثية في التيار المتردد (Inductive Reactance)
$$X_L = \\omega L = 2\\pi f L$$
* في التيار المستمر DC ($f = 0$): $X_L = 0$ (الملف يسلك سلوك سلك توصيل عادي مهمل المقاومة).
* في الترددات العالية ($f \\to \\infty$): $X_L \\to \\infty$ (الملف يقاوم الترددات العالية بشدة ويعمل كدائرة مفتوحة Choke).
* **العلاقة الطورية:** الجهد يسبق التيار بزاوية طور $90^\\circ$.`,
    flashcards: `# بطاقات استذكار: الملفات والحث الذاتي

## Card 1
**Q:** ما هي وحدة قياس معامل الحث الذاتي $L$ وماذا تكافئ؟
**A:** الهنري ($H$)، وتكافئ (فولت $\\cdot$ ثانية / أمبير) أو ($\\Omega \\cdot \\text{s}$).

---

## Card 2
**Q:** ماذا يحدث لمفاعلة الملف الحثية $X_L$ إذا تضاعف تردد المصدر ثلاث مرات؟
**A:** تتضاعف $X_L$ ثلاث مرات لأن العلاقة بينهما طردية خطية ($X_L = 2\\pi f L$).

---

## Card 3
**Q:** قارن بين سلوك المكثف والملف عند مرور تيار مستمر (DC).
**A:** المكثف يقطع التيار المستمر ($X_C = \\infty$)، بينما الملف يمرر التيار المستمر دون أي ممانعة حثية ($X_L = 0$).`
  },

  // 4. الكهربية محاضرة 6
  {
    subject_id: 8,
    lecture_num: 6,
    title: 'توصيل الملفات توالي وتوازي والحث المتبادل ومسائل فاراداي',
    doctor: 'د/ حسن سيد',
    disk_folder: 'D:\\الكليه\\subjects\\كهربيه مغناطيسية وتيار متردد\\lec6',
    quiz: `# كويز توصيل الملفات وقانون فاراداي والحث المتبادل

## Question 1
وفقاً لقانون فاراداي، القوة الدافعة الكهربية المستحثة في ملف تتناسب طردياً مع:

- [ ] شدة التيار الثابت
- [x] المعدل الزمني للتغير في التدفق المغناطيسي ($\\frac{d\\Phi}{dt}$) وعدد اللفات ($N$)
- [ ] مقاومة السلك النوعية
- [ ] سعة المكثف المتصل به

**Hint:** $\\mathcal{E} = -N \\frac{d\\Phi}{dt}$.

## Question 2
الإشارة السالبة في قانون فاراداي تعبر عن:

- [ ] قانون أوم
- [x] قاعدة لنز ( Lenz's Law - التأثير المستحث يعاكس السبب المحدث له)
- [ ] قانون كيرشوف للجهد
- [ ] أن الطاقة مفقودة

**Hint:** التيار المستحث يولد مجالاً يقاوم التغير في الفيض المسبب له.

## Question 3
عند توصيل ملفين حثهما $L_1 = 6\\ \\text{mH}$ و $L_2 = 3\\ \\text{mH}$ على التوازي مع إهمال الحث المتبادل، فإن الحث المكافئ:

- [ ] $9\\ \\text{mH}$
- [x] $2\\ \\text{mH}$
- [ ] $18\\ \\text{mH}$
- [ ] $0.5\\ \\text{mH}$

**Hint:** $L_{eq} = \\frac{L_1 L_2}{L_1 + L_2} = \\frac{18}{9} = 2\\ \\text{mH}$.

## Question 4
معامل الحث المتبادل بين ملفين ($M$) يقاس بوحدة:

- [ ] الفولت
- [x] الهنري (Henry)
- [ ] الويبر
- [ ] الفاراد

**Hint:** مثل معامل الحث الذاتي تماماً يقاس بالهنري.

## Question 5
إذا تغير الفيض المغناطيسي عبر ملف مكون من 100 لفة بمعدل $0.05\\ \\text{Wb/s}$، فإن القوة الدافعة المستحثة مقدارها:

- [ ] $0.5\\ \\text{V}$
- [x] $5\\ \\text{V}$
- [ ] $50\\ \\text{V}$
- [ ] $500\\ \\text{V}$

**Hint:** $\\mathcal{E} = N \\frac{\\Delta \\Phi}{\\Delta t} = 100 \\times 0.05 = 5\\ \\text{V}$.`,
    guide: `# دليل دراسي: توصيل الملفات وقانون فاراداي والحث المتبادل

---

## أولاً: قانون فاراداي في الحث الكهرومغناطيسي
أي تغير في التدفق المغناطيسي ($\\Phi = B A \\cos \\theta$) المخترق لدائرة كهربية يولد فيها قوة دافعة مستحثة:
$$\\mathcal{E} = -N \\frac{d\\Phi}{dt}$$
* $N$: عدد لفات الملف.
* $\\Phi$: التدفق المغناطيسي بوحدة الويبر ($Wb$).
* الإشارة السالبة: قاعدة لنز (Lenz's Law).

---

## ثانياً: الحث المتبادل بين ملفين (Mutual Inductance)
عند مرور تيار متغير في ملف ابتدائي، ينشأ فيض مغناطيسي يخترق الملف الثانوي ويولد فيه قوة دافعة مستحثة:
$$\\mathcal{E}_2 = -M \\frac{dI_1}{dt}$$
العلاقة بين معامل الحث المتبادل ومعاملي الحث الذاتي:
$$M = k \\sqrt{L_1 L_2}$$
حيث $k$ هو معامل الاقتران المغناطيسي ($0 \\le k \\le 1$).

---

## ثالثاً: توصيل الملفات في الدوائر
1. **على التوالي (بدون اقتران مغناطيسي):**
   $$L_{eq} = L_1 + L_2 + L_3 + \\dots$$
2. **على التوازي (بدون اقتران مغناطيسي):**
   $$\\frac{1}{L_{eq}} = \\frac{1}{L_1} + \\frac{1}{L_2} \\implies L_{eq} = \\frac{L_1 L_2}{L_1 + L_2}$$
3. **التوصيل على التوالي مع وجود حث متبادل ($M$):**
   * إذا كان التياران في نفس الاتجاه (توافق مغناطيسي): $L_{eq} = L_1 + L_2 + 2M$
   * إذا كان التياران متعاكسين (تضاد مغناطيسي): $L_{eq} = L_1 + L_2 - 2M$`,
    flashcards: `# بطاقات استذكار: فاراداي وتوصيل الملفات

## Card 1
**Q:** ما هو نص قاعدة لنز وما دلالتها الفيزيائية؟
**A:** اتجاه التيار الكهربي المستحث في دائرة يعاكس دائماً التغير في التدفق المغناطيسي المسبب له، وهي تطبيق مباشر لقانون بقاء الطاقة.

---

## Card 2
**Q:** ما هو قانون معامل الاقتران المغناطيسي $k$ وما قيمته في المحول المثالي؟
**A:** $k = \\frac{M}{\\sqrt{L_1 L_2}}$، وفي المحول المثالي تام الاقتران تكون $k = 1$.

---

## Card 3
**Q:** ملفان $L_1 = 4H$ و $L_2 = 9H$ وبينهما اقتران تام ($k=1$). احسب الحث المتبادل $M$.
**A:** $M = 1 \\times \\sqrt{4 \\times 9} = \\sqrt{36} = 6\\ \\text{H}$.`
  },

  // 5. الكهربية محاضرة 7
  {
    subject_id: 8,
    lecture_num: 7,
    title: 'بنك أسئلة وتطبيقات شاملة على الكهربية والمغناطيسية ودوائر RLC',
    doctor: 'د/ حسن سيد',
    disk_folder: 'D:\\الكليه\\subjects\\كهربيه مغناطيسية وتيار متردد\\lec7',
    quiz: `# كويز المراجعة الشاملة ودوائر RLC

## Question 1
في دائرة RLC موصلة على التوالي، تكون المعاوقة الكلية ($Z$) مساوية لأقل قيمة لها وتساوي المقاومة $R$ عند:

- [ ] التردد الصفري
- [x] حالة الرنين ($X_L = X_C$)
- [ ] الترددات اللانهائية
- [ ] عندما يكون فرق الطور $90^\\circ$

**Hint:** في حالة الرنين تتلاشى المفاعلة الحثية مع السعوية ويكون معامل القدرة $\\cos\\phi = 1$.

## Question 2
تردد الرنين ($f_0$) في دائرة RLC التوالية يحسب من العلاقة:

- [ ] $f_0 = 2\\pi \\sqrt{LC}$
- [x] $f_0 = \\frac{1}{2\\pi \\sqrt{LC}}$
- [ ] $f_0 = \\frac{\\sqrt{LC}}{2\\pi}$
- [ ] $f_0 = \\frac{R}{2\\pi L}$

**Hint:** ناتج مساواة $X_L = X_C \\implies 2\\pi f L = \\frac{1}{2\\pi f C}$.

## Question 3
معامل القدرة (Power Factor) في دوائر التيار المتردد يعرف بأنه:

- [ ] نسبة المفاعلة إلى المعاوقة
- [x] جيب تمام زاوية الطور ($\\cos \\phi = \\frac{R}{Z}$)
- [ ] نسبة القدرة غير الفعالة إلى القدرة الظاهرية
- [ ] نسبة التيار إلى الجهد

**Hint:** يعبر عن النسبة بين القدرة الفعالة الحقيقية المستهلكة في المقاومة إلى القدرة الكلية الظاهرية.

## Question 4
في دائرة RLC توالي، إذا كانت $X_L > X_C$، فإن الدائرة يكون لها خواص:

- [ ] سعوية بحتة
- [x] حثية (الجهد يسبق التيار)
- [ ] أومية نقية
- [ ] لا نهائية

**Hint:** السيطرة هنا للملف فتكون زاوية الطور موجبة.

## Question 5
إذا كان جهد المصدر الفعال $V_{rms} = 100\\ \\text{V}$ ومعاوقة الدائرة $Z = 20\\ \\Omega$، فإن التيار الفعال المار:

- [ ] $2\\ \\text{A}$
- [x] $5\\ \\text{A}$
- [ ] $2000\\ \\text{A}$
- [ ] $0.2\\ \\text{A}$

**Hint:** قانون أوم للتيار المتردد: $I_{rms} = \\frac{V_{rms}}{Z} = \\frac{100}{20} = 5\\ \\text{A}$.`,
    guide: `# دليل المراجعة الشاملة: دوائر RLC وقوانين الكهرومغناطيسية

---

## أولاً: دائرة التيار المتردد المتوالية (Series RLC Circuit)
تحتوي على مقاومة أومية $R$ وملف حث نقي $L$ ومكثف نقي $C$.

### 1. المعاوقة الكلية (Impedance):
$$Z = \\sqrt{R^2 + (X_L - X_C)^2}$$
حيث $X_L = 2\\pi f L$ و $X_C = \\frac{1}{2\\pi f C}$.

### 2. زاوية الطور (Phase Angle):
$$\\tan \\phi = \\frac{X_L - X_C}{R}$$
* إذا كان $X_L > X_C$: خواص حثية ($\\phi > 0$ والجهد يسبق التيار).
* إذا كان $X_C > X_L$: خواص سعوية ($\\phi < 0$ والتيار يسبق الجهد).
* إذا كان $X_L = X_C$: خواص أومية / رنين ($\\phi = 0$).

---

## ثانياً: حالة الرنين الكهربي (Resonance)
تحدث عندما تتساوى المفاعلة الحثية مع المفاعلة السعوية ($X_L = X_C$):
1. **تردد الرنين:** $f_0 = \\frac{1}{2\\pi \\sqrt{LC}}$
2. **المعاوقة الكلية:** أقل ما يمكن وتساوي $Z = R$.
3. **شدة التيار:** أقصى قيمة ممكنة $I_{max} = \\frac{V}{R}$.
4. **معامل القدرة:** $\\cos \\phi = 1$ (الدائرة تعمل بكفاءة تامة دون مفاقيد تفاعلية).
5. **عامل الجودة (Quality Factor $Q$):**
   $$Q = \\frac{1}{R} \\sqrt{\\frac{L}{C}} = \\frac{\\omega_0 L}{R}$$

---

## ثالثاً: مثلث القدرة (Power Triangle)
* **القدرة الحقيقية الفعالة (Real Power):** $P = V_{rms} I_{rms} \\cos \\phi = I^2 R$ (تقاس بالوات Watt).
* **القدرة التفاعلية (Reactive Power):** $Q_r = V_{rms} I_{rms} \\sin \\phi$ (تقاس بالـ VAR).
* **القدرة الظاهرية (Apparent Power):** $S = V_{rms} I_{rms} = \\sqrt{P^2 + Q_r^2}$ (تقاس بالفولت.أمبير VA).`,
    flashcards: `# بطاقات استذكار: مراجعة الكهرومغناطيسية و RLC

## Card 1
**Q:** ما هي شروط حدوث الرنين في دائرة RLC توالي؟
**A:** أن تتساوى المفاعلة الحثية مع السعوية ($X_L = X_C$)، وتكون المعاوقة أقل ما يمكن ($Z = R$)، وزاوية الطور صفراً ($\\cos\\phi = 1$).

---

## Card 2
**Q:** ما هو قانون معامل القدرة (Power Factor) في دائرة التيار المتردد؟
**A:** $\\cos\\phi = \\frac{P}{S} = \\frac{R}{Z}$، وقيمته تنحصر بين 0 و 1.

---

## Card 3
**Q:** دائرة RLC توالي بها $R = 30\\ \\Omega$ و $X_L = 80\\ \\Omega$ و $X_C = 40\\ \\Omega$. احسب المعاوقة $Z$.
**A:** $Z = \\sqrt{30^2 + (80 - 40)^2} = \\sqrt{30^2 + 40^2} = \\sqrt{900 + 1600} = \\sqrt{2500} = 50\\ \\Omega$.`
  },

  // 6. نظرية عدد ومنطق محاضرة 3
  {
    subject_id: 10,
    lecture_num: 3,
    title: 'التطابقات الحسابية ونظام بواقي القسمة ومبرهنة فيرما',
    doctor: 'د/ محمد حسين',
    disk_folder: 'D:\\الكليه\\subjects\\نظريه عدد ومنطق\\lec3',
    quiz: `# كويز التطابقات الحسابية ونظرية الأعداد

## Question 1
يقال إن العددين $a$ و $b$ متطابقان بمقياس $m$ وتكتب $a \\equiv b \\pmod m$ إذا وفقط إذا كان:

- [ ] $a + b$ يقبل القسمة على $m$
- [x] $m$ يقسم الفرق بينهما، أي $m \\mid (a - b)$
- [ ] $a \\times b = m$
- [ ] $a$ و $b$ عددان أوليان

**Hint:** يعني أن لهما نفس باقي القسمة عند قسمة كل منهما على $m$.

## Question 2
قيمة $17 \\pmod 5$ تساوي:

- [ ] 1
- [x] 2
- [ ] 3
- [ ] 4

**Hint:** $17 = 3 \\times 5 + 2$، إذن الباقي هو 2.

## Question 3
تنص مبرهنة فيرما الصغرى (Fermat's Little Theorem) على أنه إذا كان $p$ عدداً أولياً و $a$ لا يقبل القسمة على $p$، فإن:

- [ ] $a^p \\equiv 1 \\pmod p$
- [x] $a^{p-1} \\equiv 1 \\pmod p$
- [ ] $a^{p+1} \\equiv 0 \\pmod p$
- [ ] $a^2 \\equiv p \\pmod 2$

**Hint:** القوة هي $p - 1$، مثل $2^6 \\equiv 1 \\pmod 7$.

## Question 4
المعادلة الخطية في التطابقات $ax \\equiv b \\pmod m$ يكون لها حل إذا وفقط إذا كان:

- [ ] $a = b$
- [x] القاسم المشترك الأكبر $\\gcd(a, m)$ يقسم العدد $b$
- [ ] $m$ عدداً زوجياً
- [ ] $b > m$

**Hint:** شرط قابلية الحل هو $d = \\gcd(a, m) \\mid b$.

## Question 5
ما هو باقي قسمة العدد $3^{100}$ على 7 باستخدام مبرهنة فيرما الصغرى؟

- [ ] 1
- [x] 4
- [ ] 2
- [ ] 5

**Hint:** مبرهنة فيرما: $3^6 \\equiv 1 \\pmod 7$. نقسم 100 على 6: $100 = 6 \\times 16 + 4$. إذن $3^{100} \\equiv 3^4 = 81 \\equiv 4 \\pmod 7$.`,
    guide: `# دليل دراسي: التطابقات الحسابية ونظام بواقي القسمة (Congruences)

---

## أولاً: مفهوم التطابق الحسابي (Modular Congruence)
نقول إن $a \\equiv b \\pmod m$ (حيث $m$ عدد صحيح موجب يسمى المقياس Modulus) إذا كان $m$ يقسم الفرق $(a - b)$:
$$m \\mid (a - b) \\iff a = k \\cdot m + b$$
وهذا يكافئ هندسياً وجبرياً أن $a$ و $b$ يتركان نفس باقي القسمة عند قسمتهما على $m$.

### خصائص التطابق الأساسية:
1. **الانعكاسية (Reflexive):** $a \\equiv a \\pmod m$
2. **التناظرية (Symmetric):** $a \\equiv b \\pmod m \\implies b \\equiv a \\pmod m$
3. **التعدي (Transitive):** إذا كان $a \\equiv b \\pmod m$ و $b \\equiv c \\pmod m$ فإن $a \\equiv c \\pmod m$
4. **الجمع والضرب:** إذا كان $a \\equiv b \\pmod m$ و $c \\equiv d \\pmod m$ فإن:
   * $a + c \\equiv b + d \\pmod m$
   * $a \\cdot c \\equiv b \\cdot d \\pmod m$

---

## ثانياً: حل معادلات التطابق الخطية ($ax \\equiv b \\pmod m$)
تعتبر من أهم المسائل في امتحانات نظرية الأعداد:
1. نحسب $d = \\gcd(a, m)$.
2. **شرط الحل:**
   * إذا كان $d \\nmid b$: المعادلة ليس لها أي حل.
   * إذا كان $d \\mid b$: يوجد بالضبط $d$ من الحلول غير المتطابقة بمقياس $m$.

---

## ثالثاً: مبرهنة فيرما الصغرى (Fermat's Little Theorem)
إذا كان $p$ عدداً أولياً، و $a$ عدداً صحيحاً بحيث $p \\nmid a$ (أي $\\gcd(a, p) = 1$):
$$a^{p-1} \\equiv 1 \\pmod p$$
وبالصيغة العامة لجميع الأعداد:
$$a^p \\equiv a \\pmod p$$
**فائدتها الكبرى:** إيجاد بواقي القوى الكبيرة جداً للأعداد ومفاتيح التشفير مثل خوارزمية RSA.`,
    flashcards: `# بطاقات استذكار: التطابقات ونظرية الأعداد

## Card 1
**Q:** ماذا يعني رياضياً $a \\equiv b \\pmod m$؟
**A:** يعني أن $m$ يقسم حاصل طرحهما $a - b$ بدون باقٍ، أو أن لهما نفس الباقي عند القسمة على $m$.

---

## Card 2
**Q:** ما نص مبرهنة فيرما الصغرى؟
**A:** إذا كان $p$ عدداً أولياً و $p \\nmid a$، فإن $a^{p-1} \\equiv 1 \\pmod p$.

---

## Card 3
**Q:** متى يكون لمعادلة التطابق الخطي $ax \\equiv b \\pmod m$ حل؟ وكم عدد الحلول؟
**A:** يكون لها حل إذا وفقط إذا كان $d = \\gcd(a, m)$ يقسم $b$، ويكون عدد الحلول المختلفة بمقياس $m$ مساوياً للعدد $d$.`
  },

  // 7. استاتيكا 2 محاضرة 2
  {
    subject_id: 2,
    lecture_num: 2,
    title: 'المشتقة الاتجاهية والمؤثرات التفاضلية (التباعد والدوران ولابلاس)',
    doctor: 'د/ ايه',
    disk_folder: 'D:\\الكليه\\subjects\\استاتيكا2\\lec2',
    quiz: `# كويز المشتقة الاتجاهية ومؤثرات التحليل الاتجاهي

## Question 1
مؤثر الانحدار (Gradient $\\nabla \\phi$) لكمية قياسية $\\phi$ ينتج عنه دائماً:

- [ ] كمية قياسية (عددي)
- [x] كمية متجهة (متجه يشير لاتجاه أقصى زيادة للدالة)
- [ ] مصفوفة صفرية
- [ ] عدد تخيلي

**Hint:** $\\nabla \\phi = \\frac{\\partial \\phi}{\\partial x}\\vec{i} + \\frac{\\partial \\phi}{\\partial y}\\vec{j} + \\frac{\\partial \\phi}{\\partial z}\\vec{k}$.

## Question 2
المشتقة الاتجاهية للدالة $\\phi$ في اتجاه متجه وحدة $\\vec{u}$ تحسب من حاصل الضرب القياسي:

- [x] $\\frac{d\\phi}{ds} = \\nabla \\phi \\cdot \\vec{u}$
- [ ] $\\frac{d\\phi}{ds} = \\nabla \\phi \\times \\vec{u}$
- [ ] $\\frac{d\\phi}{ds} = \\frac{\\nabla \\phi}{|\\vec{u}|}$
- [ ] $\\frac{d\\phi}{ds} = \\nabla^2 \\phi$

**Hint:** إسقاط الانحدار على اتجاه المتجه المطلوب.

## Question 3
إذا كان تباعد المجال المتجهي منعدماً ($\\nabla \\cdot \\vec{V} = 0$)، فإن المجال يسمى:

- [ ] مجالاً محافظاً
- [x] مجالاً أنبوبياً أو صامتاً (Solenoidal Vector Field)
- [ ] مجالاً دوامياً
- [ ] مجالاً متسارعاً

**Hint:** مثل خطوط المجال المغناطيسي التي ليس لها نقطة بداية أو نهاية.

## Question 4
إذا كان دوران المجال المتجهي صفراً ($\\nabla \\times \\vec{V} = \\vec{0}$)، فإن هذا المجال يوصف بأنه:

- [x] لا دوامي أو محافظ (Irrotational / Conservative)
- [ ] أنبوبي
- [ ] غير خطي
- [ ] عمودي على السطح

**Hint:** يعني إمكانية تمثيله كانحدار لدالة جهد قياسية $\\vec{V} = \\nabla \\phi$.

## Question 5
مؤثر لابلاس للدالة القياسية $\\phi$ يعرف بأنه تباعد الانحدار، ويعطى بالعلاقة:

- [ ] $\\nabla^2 \\phi = \\nabla \\times \\nabla \\phi$
- [x] $\\nabla^2 \\phi = \\nabla \\cdot (\\nabla \\phi) = \\frac{\\partial^2 \\phi}{\\partial x^2} + \\frac{\\partial^2 \\phi}{\\partial y^2} + \\frac{\\partial^2 \\phi}{\\partial z^2}$
- [ ] $\\nabla^2 \\phi = (\\nabla \\phi)^2$
- [ ] $\\nabla^2 \\phi = 0$

**Hint:** مجموع المشتقات الجزئية الثانية للدالة.`,
    guide: `# دليل دراسي: المشتقة الاتجاهية والمؤثرات التفاضلية في التحليل الاتجاهي

---

## أولاً: مؤثر نابلا (Del Operator $\\nabla$)
هو مؤثر تفاضلي متجهي في الإحداثيات الكارتيزية:
$$\\nabla = \\vec{i} \\frac{\\partial}{\\partial x} + \\vec{j} \\frac{\\partial}{\\partial y} + \\vec{k} \\frac{\\partial}{\\partial z}$$

---

## ثانياً: العمليات الأساسية لمؤثر نابلا
### 1. الانحدار (Gradient $\\nabla \\phi$):
يطبق على دالة قياسية $\\phi(x,y,z)$ فيعطي متجهاً:
$$\\nabla \\phi = \\frac{\\partial \\phi}{\\partial x}\\vec{i} + \\frac{\\partial \\phi}{\\partial y}\\vec{j} + \\frac{\\partial \\phi}{\\partial z}\\vec{k}$$
* **المعنى الفيزيائي:** يشير إلى اتجاه المعدل الأعظم لزيادة الدالة، ومقداره $|\\nabla \\phi|$ هو المعدل الأقصى للزيادة.
* **العمودي على السطح:** المتجه العمودي على السطح $\\phi(x,y,z) = c$ هو $\\vec{n} = \\frac{\\nabla \\phi}{|\\nabla \\phi|}$.

### 2. المشتقة الاتجاهية (Directional Derivative):
معدل تغير الدالة $\\phi$ في اتجاه أي متجه $\\vec{A}$:
$$\\frac{d\\phi}{ds} = \\nabla \\phi \\cdot \\vec{u}_A = \\nabla \\phi \\cdot \\frac{\\vec{A}}{|\\vec{A}|}$$

### 3. التباعد (Divergence $\\nabla \\cdot \\vec{V}$):
يطبق على دالة متجهية $\\vec{V} = V_1\\vec{i} + V_2\\vec{j} + V_3\\vec{k}$ فيعطي قيمة قياسية:
$$\\nabla \\cdot \\vec{V} = \\frac{\\partial V_1}{\\partial x} + \\frac{\\partial V_2}{\\partial y} + \\frac{\\partial V_3}{\\partial z}$$
* إذا كان $\\nabla \\cdot \\vec{V} = 0$: يسمى المجال **أنبوبياً (Solenoidal)**.

### 4. الدوران (Curl $\\nabla \\times \\vec{V}$):
يطبق على دالة متجهية فيعطي متجهاً يمثل الدوران الموضعي:
$$\\nabla \\times \\vec{V} = \\begin{vmatrix} \\vec{i} & \\vec{j} & \\vec{k} \\\\ \\frac{\\partial}{\\partial x} & \\frac{\\partial}{\\partial y} & \\frac{\\partial}{\\partial z} \\\\ V_1 & V_2 & V_3 \\end{vmatrix}$$
* إذا كان $\\nabla \\times \\vec{V} = \\vec{0}$: يسمى المجال **لا دوامياً (Irrotational)** أو محافظاً.

---

## ثالثاً: المتطابقات الاتجاهية الهامة
1. دوران أي انحدار يساوي متجهاً صفرياً دائماً: $\\nabla \\times (\\nabla \\phi) = \\vec{0}$.
2. تباعد أي دوران يساوي صفراً دائماً: $\\nabla \\cdot (\\nabla \\times \\vec{V}) = 0$.`,
    flashcards: `# بطاقات استذكار: المشتقة الاتجاهية ومؤثرات نابلا

## Card 1
**Q:** كيف تحسب المشتقة الاتجاهية لدالة $\\phi$ في اتجاه المتجه $\\vec{A}$؟
**A:** نوجد متجه الانحدار $\\nabla \\phi$ ثم نضربه قياسياً في متجه الوحدة للاتجاه: $\\nabla \\phi \\cdot \\frac{\\vec{A}}{|\\vec{A}|}$.

---

## Card 2
**Q:** ما هو الشرط الرياضي لكي يكون المجال المتجهي $\\vec{F}$ محافظاً (Conservative)؟
**A:** أن يكون دورانه منعدماً: $\\nabla \\times \\vec{F} = \\vec{0}$.

---

## Card 3
**Q:** احسب تباعد المجال $\\vec{V} = x^2\\vec{i} + y^2\\vec{j} + z^2\\vec{k}$.
**A:** $\\nabla \\cdot \\vec{V} = \\frac{\\partial}{\\partial x}(x^2) + \\frac{\\partial}{\\partial y}(y^2) + \\frac{\\partial}{\\partial z}(z^2) = 2x + 2y + 2z = 2(x+y+z)$.`
  },

  // 8. استاتيكا 2 محاضرة 3
  {
    subject_id: 2,
    lecture_num: 3,
    title: 'المؤثرات التفاضلية في الإحداثيات المنحنية والتكامل الخطي',
    doctor: 'د/ ايه',
    disk_folder: 'D:\\الكليه\\subjects\\استاتيكا2\\lec3',
    quiz: `# كويز الإحداثيات المنحنية والتكامل الخطي والشغل

## Question 1
الشغل المبذول بواسطة قوة $\\vec{F}$ لتحريك جسيم على مسار منحني $C$ من نقطة $A$ إلى نقطة $B$ يحسب من:

- [x] التكامل الخطي $W = \\int_C \\vec{F} \\cdot d\\vec{r}$
- [ ] $W = \\iint_S \\vec{F} \\cdot d\\vec{S}$
- [ ] $W = \\vec{F} \\times \\vec{r}$
- [ ] $W = \\nabla \\cdot \\vec{F}$

**Hint:** حاصل الضرب القياسي للقوة في عنصر الإزاحة $d\\vec{r} = dx\\vec{i} + dy\\vec{j} + dz\\vec{k}$.

## Question 2
إذا كانت القوة $\\vec{F}$ قوة محافظة ناشئة عن دالة جهد $\\phi$ بحيث $\\vec{F} = \\nabla \\phi$، فإن الشغل المبذول على أي مسار مغلق ($C$) يساوي:

- [ ] قيمة عظمى
- [x] صفراً تماماً ($\\oint_C \\vec{F} \\cdot d\\vec{r} = 0$)
- [ ] مساحة المسار
- [ ] الطاقة الحركية

**Hint:** التكامل الخطي لمجال محافظ لا يعتمد على المسار بل على نقطتي البداية والنهاية فقط.

## Question 3
في الإحداثيات الأسطوانية $(\\rho, \\phi, z)$، عوامل المقياس (Scale Factors $h_1, h_2, h_3$) هي:

- [ ] $1, 1, 1$
- [x] $1, \\rho, 1$
- [ ] $\\rho, \\rho^2, 1$
- [ ] $r, r\\sin\\theta, 1$

**Hint:** عنصر الطول $ds^2 = d\\rho^2 + \\rho^2 d\\phi^2 + dz^2$.

## Question 4
في الإحداثيات الكروية $(r, \\theta, \\phi)$، عوامل المقياس الثلاثة هي:

- [ ] $1, r, r$
- [x] $1, r, r\\sin\\theta$
- [ ] $r, r^2, r^3$
- [ ] $1, 1, 1$

**Hint:** $ds^2 = dr^2 + r^2 d\\theta^2 + r^2 \\sin^2\\theta d\\phi^2$.

## Question 5
تنص نظرية جرين (Green's Theorem) في المستوى على تحويل التكامل الخطي المغلق إلى تكامل ثنائي وفق العلاقة:

- [x] $\\oint_C (P dx + Q dy) = \\iint_R \\left( \\frac{\\partial Q}{\\partial x} - \\frac{\\partial P}{\\partial y} \\right) dA$
- [ ] $\\oint_C (P dx + Q dy) = \\iint_R (P + Q) dA$
- [ ] $\\oint_C \\vec{F} \\cdot d\\vec{r} = 0$
- [ ] $\\oint_C P dx = \\iint Q dy$

**Hint:** تربط التكامل على المسار المغلق بالتكامل الثنائي على المساحة المحصورة داخله.`,
    guide: `# دليل دراسي: الإحداثيات المنحنية المتعامدة والتكامل الخطي

---

## أولاً: الإحداثيات المنحنية المتعامدة (Curvilinear Coordinates)
إذا كانت الإحداثيات $(u_1, u_2, u_3)$ متعامدة، فإن عنصر الإزاحة المربع هو:
$$ds^2 = h_1^2 du_1^2 + h_2^2 du_2^2 + h_3^2 du_3^2$$
حيث $h_1, h_2, h_3$ تسمى عوامل المقياس (Scale Factors).

### 1. الإحداثيات الأسطوانية $(\\rho, \\phi, z)$:
* التحويل: $x = \\rho \\cos \\phi,\\quad y = \\rho \\sin \\phi,\\quad z = z$
* عوامل المقياس: $h_\\rho = 1,\\quad h_\\phi = \\rho,\\quad h_z = 1$
* عنصر الحجم: $dV = \\rho\\, d\\rho\\, d\\phi\\, dz$

### 2. الإحداثيات الكروية $(r, \\theta, \\phi)$:
* التحويل: $x = r \\sin\\theta \\cos\\phi,\\quad y = r \\sin\\theta \\sin\\phi,\\quad z = r \\cos\\theta$
* عوامل المقياس: $h_r = 1,\\quad h_\\theta = r,\\quad h_\\phi = r \\sin\\theta$
* عنصر الحجم: $dV = r^2 \\sin\\theta\\, dr\\, d\\theta\\, d\\phi$

---

## ثانياً: التكامل الخطي وحساب الشغل (Line Integrals)
التكامل الخطي لمتجه القوة $\\vec{F} = F_1\\vec{i} + F_2\\vec{j} + F_3\\vec{k}$ على منحنى $C$:
$$W = \\int_C \\vec{F} \\cdot d\\vec{r} = \\int_C (F_1 dx + F_2 dy + F_3 dz)$$

### شروط استقلال التكامل عن المسار (المجال المحافظ):
1. $\\nabla \\times \\vec{F} = \\vec{0}$ (المجال لا دوامي).
2. $\\vec{F} = \\nabla \\phi$ (توجد دالة جهد قياسية $\\phi$).
3. الشغل يعتمد على النقطتين فقط: $W = \\phi(B) - \\phi(A)$.
4. التكامل على أي مسار مغلق يساوي صفراً: $\\oint_C \\vec{F} \\cdot d\\vec{r} = 0$.

---

## ثالثاً: نظرية جرين في المستوى (Green's Theorem)
إذا كان $C$ منحنى مغلقاً بسيطاً يحيط بمنطقة $R$ في المستوى $xy$:
$$\\oint_C (P dx + Q dy) = \\iint_R \\left( \\frac{\\partial Q}{\\partial x} - \\frac{\\partial P}{\\partial y} \\right) dx\\, dy$$`,
    flashcards: `# بطاقات استذكار: الإحداثيات المنحنية والتكامل الخطي

## Card 1
**Q:** ما هي عوامل المقياس في الإحداثيات الأسطوانية والكروية؟
**A:** الأسطوانية: $(h_\\rho, h_\\phi, h_z) = (1, \\rho, 1)$. الكروية: $(h_r, h_\\theta, h_\\phi) = (1, r, r\\sin\\theta)$.

---

## Card 2
**Q:** متى يكون التكامل الخطي $\\int_C \\vec{F} \\cdot d\\vec{r}$ مستقلاً عن المسار؟
**A:** عندما تكون القوة $\\vec{F}$ محافظة، أي أن دورانها منعدم ($\\nabla \\times \\vec{F} = \\vec{0}$) وتوجد دالة جهد $\\phi$ بحيث $\\vec{F} = \\nabla \\phi$.

---

## Card 3
**Q:** ما نص نظرية جرين في المستوى؟
**A:** $\\oint_C (P dx + Q dy) = \\iint_R \\left( \\frac{\\partial Q}{\\partial x} - \\frac{\\partial P}{\\partial y} \\right) dA$.`
  }
];

async function main() {
  console.log('🚀 Starting synchronization of 8 new lectures...');
  
  // Fetch existing lectures in Supabase to avoid duplicates
  const existingLectures = await get('lectures?select=id,subject_id,lecture_num,doctor,title');
  console.log(`Found ${existingLectures.length} existing lectures in database.`);

  let addedLecturesCount = 0;
  let addedAssetsCount = 0;

  for (const lecData of LECTURES_DATA) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Processing: Subject ${lecData.subject_id} - Lec ${lecData.lecture_num}: ${lecData.title}`);

    // Check if lecture exists
    let existing = existingLectures.find(
      l => l.subject_id === lecData.subject_id && l.lecture_num === lecData.lecture_num && (l.doctor === lecData.doctor || !lecData.doctor)
    );

    let lectureId;
    if (existing) {
      lectureId = existing.id;
      console.log(`✓ Lecture already exists with ID: ${lectureId}. Updating metadata...`);
      await patch(`lectures?id=eq.${lectureId}`, {
        title: lecData.title,
        doctor: lecData.doctor,
        status: 'completed',
        stage_info: 'المحاضرة جاهزة ومية فل وعشرة للمذاكرة ✅'
      });
    } else {
      console.log(`➕ Inserting new lecture into DB...`);
      const inserted = await post('lectures', {
        subject_id: lecData.subject_id,
        lecture_num: lecData.lecture_num,
        title: lecData.title,
        doctor: lecData.doctor,
        status: 'completed',
        stage_info: 'المحاضرة جاهزة ومية فل وعشرة للمذاكرة ✅'
      });
      lectureId = inserted[0]?.id;
      console.log(`✓ Created lecture record with ID: ${lectureId}`);
      addedLecturesCount++;
    }

    // Existing assets for this lecture
    const existingAssets = await get(`media_assets?lecture_id=eq.${lectureId}&select=id,asset_type,title`);
    const existingTypes = new Set(existingAssets.map(a => a.asset_type));

    // 1. Insert/Update Quiz MD
    if (!existingTypes.has('quiz_md')) {
      await post('media_assets', {
        lecture_id: lectureId,
        asset_type: 'quiz_md',
        title: 'كويز المحاضرة',
        content_text: lecData.quiz,
        file_size_bytes: Buffer.byteLength(lecData.quiz, 'utf8')
      });
      console.log(`   ✓ Added quiz_md asset`);
      addedAssetsCount++;
    } else {
      const qAsset = existingAssets.find(a => a.asset_type === 'quiz_md');
      await patch(`media_assets?id=eq.${qAsset.id}`, {
        content_text: lecData.quiz,
        file_size_bytes: Buffer.byteLength(lecData.quiz, 'utf8')
      });
      console.log(`   ✓ Updated quiz_md asset`);
    }

    // 2. Insert/Update Study Guide MD
    if (!existingTypes.has('study_guide_md')) {
      await post('media_assets', {
        lecture_id: lectureId,
        asset_type: 'study_guide_md',
        title: 'دليل دراسي وملخص شامل',
        content_text: lecData.guide,
        file_size_bytes: Buffer.byteLength(lecData.guide, 'utf8')
      });
      console.log(`   ✓ Added study_guide_md asset`);
      addedAssetsCount++;
    } else {
      const gAsset = existingAssets.find(a => a.asset_type === 'study_guide_md');
      await patch(`media_assets?id=eq.${gAsset.id}`, {
        content_text: lecData.guide,
        file_size_bytes: Buffer.byteLength(lecData.guide, 'utf8')
      });
      console.log(`   ✓ Updated study_guide_md asset`);
    }

    // 3. Insert/Update Flashcards MD
    if (!existingTypes.has('flashcards_md')) {
      await post('media_assets', {
        lecture_id: lectureId,
        asset_type: 'flashcards_md',
        title: 'بطاقات استذكار',
        content_text: lecData.flashcards,
        file_size_bytes: Buffer.byteLength(lecData.flashcards, 'utf8')
      });
      console.log(`   ✓ Added flashcards_md asset`);
      addedAssetsCount++;
    } else {
      const fAsset = existingAssets.find(a => a.asset_type === 'flashcards_md');
      await patch(`media_assets?id=eq.${fAsset.id}`, {
        content_text: lecData.flashcards,
        file_size_bytes: Buffer.byteLength(lecData.flashcards, 'utf8')
      });
      console.log(`   ✓ Updated flashcards_md asset`);
    }

    // 4. Scan and register disk original PDFs
    if (fs.existsSync(lecData.disk_folder)) {
      const files = fs.readdirSync(lecData.disk_folder);
      const pdfs = files.filter(f => f.toLowerCase().endsWith('.pdf'));
      for (const pdfName of pdfs) {
        const fullPdfPath = path.join(lecData.disk_folder, pdfName);
        const stats = fs.statSync(fullPdfPath);
        const existingPdf = existingAssets.find(a => a.asset_type === 'original_pdf' && a.title === pdfName);
        if (!existingPdf) {
          await post('media_assets', {
            lecture_id: lectureId,
            asset_type: 'original_pdf',
            title: pdfName,
            local_file_path: fullPdfPath,
            file_size_bytes: stats.size
          });
          console.log(`   ✓ Added original_pdf: ${pdfName} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
          addedAssetsCount++;
        }
      }
    }
  }

  console.log('\n==================================================');
  console.log(`🎉 SUCCESS! Synchronized ${addedLecturesCount} new lectures and added ${addedAssetsCount} assets.`);
}

main().catch(err => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
