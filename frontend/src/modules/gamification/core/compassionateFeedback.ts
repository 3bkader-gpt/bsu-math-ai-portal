/**
 * Phase 4 — Compassionate Feedback & Math Anxiety Relief (pure core).
 *
 * ZERO React/DOM imports (Architecture Rule 1):
 *   - Dynamic praise bank (30+ per persona, no repeat within the last 10)
 *   - Diagnostic error taxonomy for wrong answers (sign / magnitude /
 *     units / reversed / conceptual) with Egyptian Arabic tutoring copy
 * Everything deterministic given inputs + caller-owned history.
 */

export type Persona = 'boys' | 'girls';

/* ------------------------------------------------------------------ */
/* 4.1 Dynamic praise bank                                             */
/* ------------------------------------------------------------------ */

/** Existing 16 beloved lines (kept verbatim for tone continuity) + 16 new. */
export const PRAISE_BANK: Record<Persona, string[]> = {
  girls: [
    'أشطر كتكوتة في الدنيا! إجابة في الجون 💖🐣',
    'إيه الحلاوة دي يا بطة! جبتيها صح من أول مرة 🦆✨',
    'عاش يا أحلى قطة! تركيزك عالي أوي النهارده 🐱💖',
    'برافو يا بطوطة! دماغك دي ألماظ والله 💎🦆',
    'صح الصح يا قطقوطة! أيوه كده فرحيني بشطارتك 🐾🌸',
    'الله ينور يا فرفوشة، إجابة تفتح النفس زيّك 🦋✨',
    'إجابة صح يا سكرة، مفيش حلاوة ولا شطارة بعد كده! 🍬💖',
    'برافو يا عسولة! خطواتك وتفكيرك مظبوطين بالمللي 🍯✨',
    'صح يا فراولة! إيه الدماغ الرايقة والجميلة دي؟ 🍓🌸',
    'شطورة أوي يا بنبوناية! كملي على نفس المستوى ده 🍬🥰',
    'يا جمالوا! إجابة مية فل وعشرة يا عسلية 🍯👏',
    'صح يا قمر! منورة الكويز بإجاباتك الصح 🌙💖',
    'برافو يا نجمة! إجابة تلمع من كتر ما هي صح 🌟🌸',
    'الله أكبر عليكي يا غزالة، سريعة وشاطرة! 🦌💖',
    'إجابة نموذجية يا أحلى وردة! تسلم دماغك 🌷🥰',
    'عبقرية يا أميرة! ولا أجدعها دكتور في الكلية 👑👏',
    'دماغك بتشتغل زي الساعة يا باشمهندسة! ⚙️✨',
    'ده تفوق وذكاء ما شاء الله، كمّلي بثقة 🌸💪',
    'إجابة تفتح النفس! الدكتورة نفسها هتصقق لك 👏💖',
    'دقيقتين بس وكانت هتفتلك! شطارة إنك ركزتي 🎯🌟',
    'برافو عليكي! الحل ده يتحط في الكشكول كمثال 📘✨',
    'وردة الدفعة بجد! دايماً في القمة يا رب 🔥🌷',
    'مفيش أسهل من كده عليكي واضح! إجابة صافية 💎🦆',
    'الله يبارك لكي، فهمتِ المبدأ مش حفظيه — ده الصح 🧠💖',
    'قوية أوي النهارده! الإجابة جات من غير تفكير 🚀🌸',
    'يا سلام علي الذوق والشطارة مع بعض 🍯👑',
    'نظيفة وحلوة زي كده دايماً يا رب ✍️✨',
    'على وضعك يا قمر! مستوى ثابت وممتاز 🌙⭐',
    'برافو! المعلومة دي هتفيدك في الامتحان أكيد 📝💖',
    'إجابة تفرح القلب يا أجمل مهندسة! 🌷🐣',
    'ذهب خالص يا نجمة! فعلاً انتي عيني وبصري 🌟👀',
    'كده بقولي بجد إنك جاهزة للامتحان! 💪🌸',
  ],
  boys: [
    'عاش يا بطل! إجابة في الجون 🔥💪',
    'هندسة وتركيز عالي يا وحش! 🔥🧠',
    'بروفيسور الدفعة بجد! الله ينور 🎓✨',
    'دحيح والله! مفيش كلام، إجابة مية المية 💯🚀',
    'دايماً في القمة يا كابتن! كمّل 🔥⚽',
    'الله ينور يا هندسة، حل يفتح النفس 👌✨',
    'أيوه يا معلم! كده بتتأكد إنك فاهم مش حافظ 🧠💪',
    'علي وضعك يا نجم! إجابة نظيفة وواضحة ⭐✨',
    'جامدة يا بطل! الدكتورة نفسها هتعجب بالحل ده 📝🔥',
    'إجابة ذهبية يا كبير! منورة الكويز 🏆💯',
    'مستوى ثابت وممتاز يا صاحبي! عاش 🌟💪',
    'فاهم المبدأ مش واطيها حفظ — ده اللي مطلوب 🧠✨',
    'كده تبقي جاهز للامتحان فعلاً يا بطل 📝🔥',
    'قول للحظ إنه محظوظ إنك بتحسبه! 😂⚡',
    'تريكاية نظيفة أوي! عاش التفكير المنطقي 🔍💪',
    'زي الساعة يا هندسة! دقة في الدقة ⚙️✨',
    'عااش! الإجابة دي هترفع معدلك مش بس نقاطك 📈🔥',
    'بروف جداً يا معلم! سرعة ودقة في نفس الوقت ⚡🏆',
    'ما شاء الله عليك، مستوى عالي أوي النهارده 🌟💪',
    'أول مرة من آخر مرة! إجابة صح من أول محاولة 🎯✨',
    'يا سلام علي الذكاء ده! باين إنك مركز النهارده 🧠🔥',
    'خليك كده يا هندسة، الدفعة كلها بتتباهى بيك 🏆👏',
    'حل مظبوط بالمللي! عاش يا كبير 🔧✨',
    'الرياضيات بتحبك واضح! كمّل بنفس القوة 💪🔢',
    'ده اللي بنسميه حل هندسي بجد! 📐🔥',
    'ما تنساش تملي على نفسك شوية！ عاش 💯⚡',
    'إجابة تتحدى التوقعات يا بطل! 🔥🌟',
    'رجلتك في الرملة الأولى! صح عليك 👏💪',
    'التركيز ده هو سلاحك السري، حافظ عليه 🧠⚡',
    'عاش يا دكتور! مفيش زتونة أجمل من دي 📖✨',
    'قمة في الروعة! إجابة تستاهل صققة إيد 👏🔥',
    'واضح إنك كنت مركز في المحاضرة، برافو 🎧💪',
  ],
};

/** Keeps the last N praise messages so none repeats too soon. */
export const PRAISE_NO_REPEAT_WINDOW = 10;

/** Picks a praise message avoiding the recent window; pure. */
export function pickPraise(persona: Persona, recentUsed: string[]): string {
  const bank = PRAISE_BANK[persona];
  const recent = new Set(recentUsed.slice(-PRAISE_NO_REPEAT_WINDOW));
  const pool = bank.filter((msg) => !recent.has(msg));
  const source = pool.length > 0 ? pool : bank;
  return source[Math.floor(Math.random() * source.length)];
}

/** Appends to the recent history, capped to the no-repeat window. Pure. */
export function trackPraise(recentUsed: string[], message: string): string[] {
  const next = [...recentUsed, message];
  return next.slice(-PRAISE_NO_REPEAT_WINDOW);
}

/* ------------------------------------------------------------------ */
/* 4.2 Diagnostic error taxonomy                                       */
/* ------------------------------------------------------------------ */

export type WrongKind = 'sign' | 'magnitude' | 'units' | 'reversed' | 'conceptual';

const UNIT_TOKENS = [
  'م/ث', 'م/س', 'سم', 'كم', 'جول', 'نيوتن', 'واط', 'أمبير', 'فولت', 'أوم',
  'راديان', 'درجة', 'ثانية', 'كجم', 'جرام', 'لتر', 'متر', 'm/s', 'kg', 'N', 'J', 'W',
];

/** Normalizes LaTeX noise so numeric/sign comparisons are meaningful. */
function normalizeForCompare(text: string): string {
  return text
    .replace(/\$[^$]*\$/g, ' ')
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/[{}$\\\\()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractNumbers(text: string): number[] {
  // Keep LaTeX CONTENT (numbers live inside $...$) but strip markup noise.
  const s = text
    .replace(/\$/g, ' ')
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/[{}()]/g, ' ');
  return [...s.matchAll(/-?\d+(?:\.\d+)?/g)]
    .map((m) => parseFloat(m[0]))
    .filter((n) => !Number.isNaN(n));
}

function hasUnits(text: string): boolean {
  const clean = normalizeForCompare(text);
  return UNIT_TOKENS.some((unit) => clean.includes(unit));
}

function unitDifference(userAnswer: string, correctAnswer: string): boolean {
  const u = hasUnits(userAnswer);
  const c = hasUnits(correctAnswer);
  return u !== c;
}

/** Classifies WHY the wrong answer is wrong, then returns tutoring copy. */
export function diagnoseWrongAnswer(
  userAnswer: string,
  correctAnswer: string,
  persona: Persona = 'boys'
): { kind: WrongKind; message: string } {
  const user = (userAnswer || '').trim();
  const correct = (correctAnswer || '').trim();

  // 1. Numeric analysis: sign flip or near-miss magnitude
  const userNums = extractNumbers(user);
  const correctNums = extractNumbers(correct);
  if (userNums.length > 0 && userNums.length === correctNums.length) {
    const allOpposite = userNums.every((u, i) => u === -correctNums[i] && u !== 0);
    const allEqual = userNums.every((u, i) => u === correctNums[i]);

    if (allOpposite) {
      return {
        kind: 'sign',
        message:
          persona === 'girls'
            ? 'قربتي أوي من الحل! بصي على الإشارة بس — سالب ولا موجب؟ 🧐📌'
            : 'قربت أوي من الحل يا هندسة! المشكلة في الإشارة بس — سالب ولا موجب؟ 🧐📌',
      };
    }

    if (!allEqual) {
      const withinTolerance = userNums.every((u, i) => {
        const c = correctNums[i];
        return c !== 0 && Math.abs(u - c) <= Math.abs(c) * 0.1;
      });
      if (withinTolerance) {
        return {
          kind: 'magnitude',
          message:
            persona === 'girls'
              ? 'فكرتك صح والحساب ماشي! بس في خطوة أخيرة في التقريب أو الظبط — راجعيها 🧮✨'
              : 'الفكرة صح والحساب ماشي يا هندسة! بس في خطوة أخيرة في التقريب — راجعها 🧮✨',
        };
      }
    }
  }

  // 2. Units: right idea, missing/extra unit token
  if (unitDifference(user, correct)) {
    return {
      kind: 'units',
      message:
        persona === 'girls'
          ? 'الفكرة واصلة! بس متنسيش الوحدات — الامتحان بياكل على الوحدة الناقصة 📏⚠️'
          : 'الفكرة واصلة يا هندسة! بس الوحدات هي اللي بتحسم — متنساهاش في الإجابة 📏⚠️',
    };
  }

  // 3. Reversed: same words, different order
  const uWords = normalizeForCompare(user).split(' ').filter(Boolean).sort();
  const cWords = normalizeForCompare(correct).split(' ').filter(Boolean).sort();
  if (uWords.length > 1 && uWords.join(' ') === cWords.join(' ')) {
    return {
      kind: 'reversed',
      message:
        persona === 'girls'
          ? 'كل الكلمات صح! بس الترتيب هو اللي الفرق — اقرا السؤال تاني بتركيز 🔄📖'
          : 'كل الكلمات صح يا هندسة! بس الترتيب هو اللي غلط — ركز في صياغة السؤال 🔄📖',
    };
  }

  // 4. Default: conceptual conflation — empathetic + route to the guide
  return {
    kind: 'conceptual',
    message:
      persona === 'girls'
        ? 'الالتباس ده شائع جداً وبيحصل لأجمد الطلبة! راجعي المفهوم من الدليل الدراسي وهتلاقيه بيلف في دماغك 📖💡'
        : 'الالتباس ده شائع جداً يا هندسة وبيلخبط أذكياء! راجع المفهوم من الدليل الدراسي وهتلاقيه واضح 📖💡',
  };
}

/* ------------------------------------------------------------------ */
/* 4.4 Ethical exit                                                    */
/* ------------------------------------------------------------------ */

/** Copy for the ethical exit button + its supportive confirmation. */
export const ETHICAL_EXIT = {
  button: (persona: Persona) =>
    persona === 'girls' ? 'مكسبتي لليوم، استريحي ☕' : 'مكسبت لليوم، استريح ☕',
  headline: (persona: Persona) =>
    persona === 'girls'
      ? 'شغل النهارده كفاية يا بطلة — دماغك محتاجة ترتاح عشان تثبّت اللي فهمتيه 🌿'
      : 'شغل النهارده كفاية يا بطل — دماغك محتاجة ترتاح عشان تثبّت اللي فهمته 🌿',
} as const;
