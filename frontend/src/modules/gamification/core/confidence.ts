/**
 * Phase 5.1 — Pre-Answer Confidence Assessment (Meta-Cognition Engine).
 *
 * ZERO React/DOM imports (Architecture Rule 1):
 *   - Calibrates meta-cognition before answer submission.
 *   - Certainty rewards: High + Correct => +3 XP bonus.
 *   - Severe Misconception detection: High + Incorrect => flags misconception
 *     for priority Leitner spaced repetition.
 *   - Guessing feedback: Low + Correct => alerts student to consolidate intuition.
 */

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ConfidenceOption {
  level: ConfidenceLevel;
  label: string;
  sublabel: string;
  bonusXp: number;
  badgeEmoji: string;
}

export const CONFIDENCE_OPTIONS: Record<ConfidenceLevel, ConfidenceOption> = {
  high: {
    level: 'high',
    label: 'متأكد',
    sublabel: '+3 بونص',
    bonusXp: 3,
    badgeEmoji: '🎯',
  },
  medium: {
    level: 'medium',
    label: 'مش متأكد',
    sublabel: 'النقاط العادية',
    bonusXp: 0,
    badgeEmoji: '🤔',
  },
  low: {
    level: 'low',
    label: 'بتخمين',
    sublabel: 'بدون بونص',
    bonusXp: 0,
    badgeEmoji: '🎲',
  },
};

/** Calculates XP bonus for the confidence rating. */
export function calculateConfidenceXpBonus(level: ConfidenceLevel, isCorrect: boolean): number {
  if (!isCorrect) return 0;
  return level === 'high' ? 3 : 0;
}

export interface MetaCognitiveFeedback {
  isMisconception: boolean;
  headline: string;
  message: string;
}

/**
 * Returns compassionate meta-cognitive commentary on the confidence vs accuracy alignment.
 * Pure and deterministic.
 */
export function getConfidenceFeedback(
  level: ConfidenceLevel,
  isCorrect: boolean,
  persona: 'boys' | 'girls' = 'boys'
): MetaCognitiveFeedback {
  const isGirls = persona === 'girls';

  // 1. Severe misconception: Student was 100% certain, but was wrong!
  if (level === 'high' && !isCorrect) {
    return {
      isMisconception: true,
      headline: isGirls ? 'التباس خادع يا باشمهندسة! ⚠️' : 'التباس خادع يا هندسة! ⚠️',
      message: isGirls
        ? 'كنتِ واثقة من الإجابة بس في فخ مفاهيمي دقيق وقعك! السؤال ده اتحط في أولويات دفتر الأخطاء عشان نثبته بكرة 📖🧠'
        : 'كنت واثق من الإجابة بس في فخ مفاهيمي دقيق وقعك! السؤال ده اتحط في أولويات دفتر الأخطاء عشان نثبته بكرة 📖🧠',
    };
  }

  // 2. Lucky guess: Low confidence, but answer was correct!
  if (level === 'low' && isCorrect) {
    return {
      isMisconception: false,
      headline: isGirls ? 'حدسك الرياضي صاب! 🎲✨' : 'حدسك الرياضي صاب! 🎲✨',
      message: isGirls
        ? 'التخمين طلع صح المرة دي! بس بصي على خطوات الحل في الدليل عشان المرة الجاية تجاوبيها بثقة كاملة 🎯'
        : 'التخمين طلع صح المرة دي! بس بص على خطوات الحل في الدليل عشان المرة الجاية تجاوبها بثقة كاملة 🎯',
    };
  }

  // 3. High confidence confirmed: Deserved mastery praise
  if (level === 'high' && isCorrect) {
    return {
      isMisconception: false,
      headline: isGirls ? 'ثقة في محلها! 🎯🔥' : 'ثقة في محلها! 🎯🔥',
      message: isGirls
        ? 'ما شاء الله! ثقة تامة وإجابة نموذجية، استحقيتي بونص الـ +3 XP بجدارة 💎'
        : 'ما شاء الله! ثقة تامة وإجابة نموذجية، استحقيت بونص الـ +3 XP بجدارة 💎',
    };
  }

  // 4. Default: Medium or low-incorrect
  return {
    isMisconception: false,
    headline: '',
    message: '',
  };
}
