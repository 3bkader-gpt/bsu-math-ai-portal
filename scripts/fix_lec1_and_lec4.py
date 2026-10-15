import sys
from pathlib import Path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(ROOT_DIR))

import asyncio
from telethon import TelegramClient
from telethon.sessions import StringSession
from app.db.database import SessionLocal
from app.db.models import Lecture, MediaAsset
from app.config import settings

API_ID = 23966686
API_HASH = "0ba67a50ec826a4bbb5eb6a80c369bfc"
CHANNEL_ID = -1004453609138
SESSION_STR = settings.TELETHON_SESSION_STRING

# ==========================================
# 1. Authentic Content for Lec 1 (Differential Geometry)
# ==========================================
LEC1_QUIZ_MD = """# هندسة تفاضلية - كويز المحاضرة 1: مفهوم المنحنى وطول القوس

## Question 1
ما هو الشرط الرياضي الأساسي لكي يُسمى المنحنى الفراغي $\\underline{r}(t)$ منحنى منتظماً (Regular Curve) عند جميع قيمه؟

- [x] $\\dot{\\underline{r}}(t) \\neq \\underline{0}$ عند كل قيمة للمتغير $t$ في مجال التعريف
- [ ] $\\ddot{\\underline{r}}(t) = \\underline{0}$
- [ ] $|\\underline{r}(t)| = 1$
- [ ] $\\dot{\\underline{r}}(t) \\cdot \\ddot{\\underline{r}}(t) = 0$

**Hint:** فكر في ضرورة وجود مماس محدد وثابت الاتجاه عند كل نقطة وعدم توقف متجه السرعة.

## Question 2
إذا كان متجه الموضع لمنحنى معطى بالدالة $\\underline{r}(t) = (x(t), y(t), z(t))$، فكيف يُعرّف تفاضل طول القوس $ds$؟

- [x] $ds = \\sqrt{\\dot{x}^2 + \\dot{y}^2 + \\dot{z}^2} \\, dt = |\\dot{\\underline{r}}(t)| \\, dt$
- [ ] $ds = (\\dot{x} + \\dot{y} + \\dot{z}) \\, dt$
- [ ] $ds = |\\ddot{\\underline{r}}(t)| \\, dt$
- [ ] $ds = \\frac{dt}{|\\dot{\\underline{r}}(t)|}$

**Hint:** طول القوس هو مقياس المسافة التفاضلية في الفضاء الإقليدي ثلاثي الأبعاد المشتق من نظرية فيثاغورس.

## Question 3
ما هي أهم ميزة لاستخدام "طول القوس" $s$ كبرامتر طبيعي للمنحنى (Natural Parameter) بدلاً من البرامتر العام $t$؟

- [x] أن معيار متجه المشتقة الأولى يساوي دائماً الوحدة: $|\\frac{d\\underline{r}}{ds}| = 1$
- [ ] أن متجه المشتقة الثانية يكون منعدماً: $\\frac{d^2\\underline{r}}{ds^2} = 0$
- [ ] أن المنحنى يقع بالضرورة في مستوى ثنائي الأبعاد
- [ ] أن طول المنحنى يصبح لانهائياً

**Hint:** عند التفاضل بالنسبة لطول القوس، فإن معدل التغير يمثل متجه المماس الوحدة $\\underline{t}$ مباشرة.

## Question 4
إذا كان $\\underline{r}(s)$ منحنى مبرمتراً بدلالة طول القوس $s$، فماذا يمثل المتجه $\\underline{t} = \\frac{d\\underline{r}}{ds}$؟

- [x] متجه المماس الوحدة (Unit Tangent Vector)
- [ ] متجه العمودي الرئيسي (Principal Normal)
- [ ] متجه العمودي الثاني (Binormal)
- [ ] متجه الانحناء الكلي

**Hint:** المشتقة الأولى بالنسبة لطول القوس تعطي دائماً اتجاه الحركة ومعيارها واحد صحيح.

## Question 5
إذا كان للمنحنى نقطة يكون عندها $\\dot{\\underline{r}}(t_0) = \\underline{0}$، فماذا تُسمى هذه النقطة في الهندسة التفاضلية؟

- [x] نقطة شاذة (Singular Point)
- [ ] نقطة انعطاف (Inflection Point)
- [ ] نقطة نظامية (Regular Point)
- [ ] نقطة التواء (Torsion Point)

**Hint:** النقطة التي ينعدم عندها المماس تفقد شرط الانتظام.

## Question 6
ما هو طول القوس $S$ لمنحنى بين النقطتين المقابلتين للقيمتين $t_1$ و $t_2$؟

- [x] $S = \\int_{t_1}^{t_2} |\\dot{\\underline{r}}(t)| \\, dt$
- [ ] $S = \\int_{t_1}^{t_2} \\underline{r}(t) \\, dt$
- [ ] $S = |\\underline{r}(t_2) - \\underline{r}(t_1)|$
- [ ] $S = \\int_{t_1}^{t_2} |\\ddot{\\underline{r}}(t)| \\, dt$

**Hint:** تكامل معيار متجه السرعة على الفترة الزمنية يعطي المسافة الكلية المقطوعة على طول المنحنى.

## Question 7
للمنحنى الدائري الحلزوني (Circular Helix) $\\underline{r}(t) = (a\\cos t, a\\sin t, bt)$، ما هي قيمة معدل تغير طول القوس $\\dot{s}$؟

- [x] $\\dot{s} = \\sqrt{a^2 + b^2}$
- [ ] $\\dot{s} = a + b$
- [ ] $\\dot{s} = \\sqrt{a^2 - b^2}$
- [ ] $\\dot{s} = a\\sqrt{t}$

**Hint:** اشتق كل مركبة بالنسبة لـ $t$، ثم ربع واجمع واستفد من المتطابقة $\\cos^2 t + \\sin^2 t = 1$.

## Question 8
إذا كان $\\underline{t} = \\frac{d\\underline{r}}{ds}$ متجهاً معيارياً (طوله ثابت يساوي 1)، فما هي العلاقة بين $\\underline{t}$ ومشقته $\\frac{d\\underline{t}}{ds}$؟

- [x] متعامدان: $\\underline{t} \\cdot \\frac{d\\underline{t}}{ds} = 0$
- [ ] متوازيان: $\\underline{t} \\times \\frac{d\\underline{t}}{ds} = \\underline{0}$
- [ ] متساويان في المعيار
- [ ] أحدهما معكوس جمعي للآخر

**Hint:** اشتقاق العلاقة $\\underline{t} \\cdot \\underline{t} = 1$ بالنسبة لـ $s$ يثبت التعامد فوراً.

## Question 9
متى يُقال عن تمثيلين بارامتريين $\\underline{r}_1(t)$ و $\\underline{r}_2(\\tau)$ أنهما يكافئان نفس المنحنى؟

- [x] إذا وجد تحويل برامتري أملس ورتيب (Diffeomorphism) $t = \\phi(\\tau)$ بحيث $\\phi'(\\tau) \\neq 0$
- [ ] إذا كانت مشتقاتهما متساوية عند نقطة الصفر فقط
- [ ] إذا كان لهما نفس نقطة البداية والنهاية فقط
- [ ] إذا كان المنحنيان مستقيمين فقط

**Hint:** التكافؤ يتطلب تغييراً سلساً وقابلاً للعكس في متغير القياس دون تغيير المسار الهندسي.

## Question 10
في الفراغ $\\mathbb{R}^3$، المنحنى المعطى بالمعادلة $\\underline{r}(t) = \\underline{a} + t \\underline{b}$ (حيث $\\underline{b} \\neq \\underline{0}$) يمثل:

- [x] خطاً مستقيماً منتظماً
- [ ] دائرة نصف قطرها $|\\underline{b}|$
- [ ] قطعاً مكافئاً
- [ ] منحنى غير منتظم

**Hint:** المشتقة الأولى هنا متجهة ثابتة هي $\\underline{b}$، ومعيارها ثابت لا يساوي الصفر.
"""

LEC1_GUIDE_MD = """# الدليل الدراسي الشامل: مفهوم المنحنى وطول القوس
**المادة:** هندسة تفاضلية | **أستاذ المادة:** د/ سيد

---

## 1. مدخل إلى نظرية المنحنيات في الفراغ (Curves in $\\mathbb{R}^3$)
في الهندسة التفاضلية الكلاسيكية، المنحنى الفراغي ليس مجرد رسم بياني، بل هو **تطبيق تفاضلي أملس** من فترة مفتوحة $I \\subset \\mathbb{R}$ إلى الفضاء الإقليدي ثلاثي الأبعاد $\\mathbb{R}^3$:
$$\\underline{r}: I \\to \\mathbb{R}^3, \\quad t \\mapsto \\underline{r}(t) = \\big(x(t), y(t), z(t)\\big)$$

---

## 2. المنحنيات المنتظمة والنقاط الشاذة (Regularity & Singularities)
* **التعريف:** يُقال عن المنحنى $\\underline{r}(t)$ أنه **منحنى منتظم (Regular Curve)** إذا كانت المشتقة الأولى متصلة ولا تنعدم إطلاقاً على كامل مجال التعريف:
  $$\\dot{\\underline{r}}(t) = \\left(\\frac{dx}{dt}, \\frac{dy}{dt}, \\frac{dz}{dt}\\right) \\neq \\underline{0}, \\quad \\forall t \\in I$$
* **الأهمية الهندسية:** شرط الانتظام يضمن وجود خط مماس وحيد ومحدد الاتجاه عند كل نقطة، ويمنع حدوث "انكسارات حادة" (Cusps) أو توقف لحظي للحركة.
* **النقاط الشاذة:** النقطة $t_0$ التي يكون عندها $\\dot{\\underline{r}}(t_0) = \\underline{0}$ تسمى نقطة شاذة (Singular Point).

---

## 3. طول القوس والبرامتر الطبيعي (Arc Length & Natural Parameter)
### 3.1 دالة طول القوس
إذا انطلقنا من نقطة مرجعية $t_0$، فإن طول القوس $s(t)$ يُعطى بالتكامل:
$$s(t) = \\int_{t_0}^t |\\dot{\\underline{r}}(u)| \\, du = \\int_{t_0}^t \\sqrt{\\dot{x}^2 + \\dot{y}^2 + \\dot{z}^2} \\, du$$
* **المفاضل الأساسي:**
  $$ds = |\\dot{\\underline{r}}(t)| \\, dt \\implies \\frac{ds}{dt} = \\dot{s} = |\\dot{\\underline{r}}(t)|$$

### 3.2 إعادة البرمترة بطول القوس (Natural Parameterization)
* بما أن المنحنى منتظم، فإن $\\dot{s} > 0$، وبالتالي فإن الدالة $s(t)$ متزايدة تماماً وقابلة للعكس $t = t(s)$.
* بالتعويض نحصل على المنحنى بدلالة طول القوس $\\underline{r}(s)$.
* **خاصية جوهرية:** المشتقة بالنسبة لطول القوس $s$ تعطي دائماً متجهاً طوله الوحدة:
  $$\\left|\\frac{d\\underline{r}}{ds}\\right| = \\left|\\frac{d\\underline{r}}{dt} \\cdot \\frac{dt}{ds}\\right| = |\\dot{\\underline{r}}| \\cdot \\frac{1}{|\\dot{\\underline{r}}|} = 1$$

---

## 4. متجه المماس الوحدة (Unit Tangent Vector $\\underline{t}$)
* يُعرّف متجه المماس الوحدة بالرمز $\\underline{t}$:
  $$\\underline{t} = \\frac{d\\underline{r}}{ds} = \\frac{\\dot{\\underline{r}}}{\\dot{s}} = \\frac{\\dot{\\underline{r}}}{|\\dot{\\underline{r}}|}$$
* **خاصية التعامد:** بما أن $|\\underline{t}|^2 = \\underline{t} \\cdot \\underline{t} = 1$ (ثابت)، فباشتقاق الطرفين بالنسبة لـ $s$:
  $$\\frac{d}{ds}(\\underline{t} \\cdot \\underline{t}) = 2\\underline{t} \\cdot \\frac{d\\underline{t}}{ds} = 0 \\implies \\underline{t} \\perp \\frac{d\\underline{t}}{ds}$$
  وهذا يشكل حجر الأساس لبناء ثلاثي فرينيه (Frenet-Serret Frame) في المحاضرات اللاحقة.

---

## 5. أمثلة تطبيقية محلولة
### مثال 1: الحلزون الدائري (Circular Helix)
معادلة الحلزون: $\\underline{r}(t) = (a\\cos t, a\\sin t, bt)$ حيث $a > 0, b \\in \\mathbb{R}$.
1. **متجه السرعة:** $\\dot{\\underline{r}}(t) = (-a\\sin t, a\\cos t, b)$.
2. **معيار السرعة ومعدل طول القوس:**
   $$|\\dot{\\underline{r}}(t)| = \\sqrt{(-a\\sin t)^2 + (a\\cos t)^2 + b^2} = \\sqrt{a^2(\\sin^2 t + \\cos^2 t) + b^2} = \\sqrt{a^2 + b^2} = c$$ (مقدار ثابت).
3. **دالة طول القوس:** $s(t) = \\int_0^t c \\, du = c t = t\\sqrt{a^2 + b^2}$.
4. **متجه المماس الوحدة:**
   $$\\underline{t} = \\frac{\\dot{\\underline{r}}}{c} = \\frac{1}{\\sqrt{a^2 + b^2}} (-a\\sin t, a\\cos t, b)$$
"""

LEC1_FLASHCARDS_MD = """# بطاقات الاستذكار: مفهوم المنحنى وطول القوس

## Card 1
**Q:** ما هو الشرط الضروري والكافي لانتظام المنحنى الفراغي $\\underline{r}(t)$؟
**A:** أن تكون المشتقة الأولى متصلة ومعيارها لا ينعدم: $|\\dot{\\underline{r}}(t)| \\neq 0$ عند جميع النقط.

---

## Card 2
**Q:** كيف يُحسب عنصر التفاضل لطول القوس $ds$ بدلالة بارامتر عام $t$؟
**A:** $ds = |\\dot{\\underline{r}}(t)| \\, dt = \\sqrt{\\dot{x}^2 + \\dot{y}^2 + \\dot{z}^2} \\, dt$.

---

## Card 3
**Q:** ما هو المعيار القياسي لمتجه المماس الوحدة $\\underline{t} = \\frac{d\\underline{r}}{ds}$؟
**A:** معيار $\\underline{t}$ يساوي دائماً الواحد الصحيح: $|\\underline{t}| = 1$.

---

## Card 4
**Q:** ما هي العلاقة الاتجاهية بين متجه المماس الوحدة $\\underline{t}$ ومشتقته بالنسبة لطول القوس $\\frac{d\\underline{t}}{ds}$؟
**A:** المتجهان متعامدان دائماً: $\\underline{t} \\cdot \\frac{d\\underline{t}}{ds} = 0$.

---

## Card 5
**Q:** ماذا يُمثل طول القوس $s$ فيزيائياً وهندسياً؟
**A:** يُمثل المسافة الفعلية المقطوعة على طول مسار المنحنى في الفضاء ثلاثي الأبعاد.
"""

async def fix_all():
    print("Fixing Lecture 1 and Lecture 4 data...")
    client = TelegramClient(StringSession(SESSION_STR), API_ID, API_HASH)
    await client.connect()

    # 1. Pull Lecture 4 Quiz and Guide from Telegram
    print("Fetching Lecture 4 assets from Telegram...")
    m95 = await client.get_messages(CHANNEL_ID, ids=95)
    lec4_quiz_text = (await client.download_media(m95, bytes)).decode("utf-8") if m95 and m95.media else None
    
    m96 = await client.get_messages(CHANNEL_ID, ids=96)
    lec4_guide_text = (await client.download_media(m96, bytes)).decode("utf-8") if m96 and m96.media else None

    with SessionLocal() as db:
        # Update Lecture 1
        print("Updating Lecture 1 assets in Supabase...")
        q1 = db.query(MediaAsset).filter(MediaAsset.lecture_id == 1, MediaAsset.asset_type == 'quiz_md').first()
        if q1:
            q1.content_text = LEC1_QUIZ_MD
            q1.file_size_bytes = len(LEC1_QUIZ_MD.encode('utf-8'))
            
        g1 = db.query(MediaAsset).filter(MediaAsset.lecture_id == 1, MediaAsset.asset_type == 'study_guide_md').first()
        if g1:
            g1.content_text = LEC1_GUIDE_MD
            g1.file_size_bytes = len(LEC1_GUIDE_MD.encode('utf-8'))
            
        f1 = db.query(MediaAsset).filter(MediaAsset.lecture_id == 1, MediaAsset.asset_type.in_(['flashcards_md', 'flashcards_json'])).first()
        if f1:
            f1.content_text = LEC1_FLASHCARDS_MD
            f1.file_size_bytes = len(LEC1_FLASHCARDS_MD.encode('utf-8'))

        # Update Lecture 4
        print("Updating Lecture 4 assets in Supabase...")
        if lec4_quiz_text:
            q4 = db.query(MediaAsset).filter(MediaAsset.lecture_id == 4, MediaAsset.asset_type == 'quiz_md').first()
            if q4:
                q4.content_text = lec4_quiz_text
                q4.file_size_bytes = len(lec4_quiz_text.encode('utf-8'))
                q4.telegram_message_id = 95
                
        if lec4_guide_text:
            g4 = db.query(MediaAsset).filter(MediaAsset.lecture_id == 4, MediaAsset.asset_type == 'study_guide_md').first()
            if g4:
                g4.content_text = lec4_guide_text
                g4.file_size_bytes = len(lec4_guide_text.encode('utf-8'))
                g4.telegram_message_id = 96

        db.commit()
        print("Database successfully committed with all content_text!")

    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(fix_all())
