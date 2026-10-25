/**
 * Phase 3 — Cognitive Guard: pure logic for the hint ladder, burnout
 * relief trigger, and the 25-minute flow window.
 *
 * ZERO React/DOM imports (Architecture Rule 1). Everything here is
 * deterministic and covered by Vitest.
 */

export type HintTier = 0 | 1 | 2 | 3;

/** Session flow constants (Behavioral Plan §Phase 3). */
export const SESSION_FLOW = {
  /** Structured flow window in milliseconds. */
  durationMs: 25 * 60 * 1000,
} as const;

/** Burnout relief constants (Behavioral Plan §Phase 3.4). */
export const BURNOUT = {
  /** Consecutive wrong answers that trigger compassionate relief. */
  consecutiveWrongThreshold: 3,
  /** Single-question dwell time (ms) that triggers relief. */
  dwellMsThreshold: 2 * 60 * 1000,
} as const;

export interface HintTierContent {
  tier: HintTier;
  /** Human-safe label shown on the ladder button after this tier is open. */
  nextActionLabel: string;
  /** Text revealed at this tier (empty string when nothing to show). */
  text: string;
  /** True when this tier reveals the final answer (ladder top). */
  revealsAnswer: boolean;
}

const TIER_ACTION_LABELS: Record<Exclude<HintTier, 0>, string> = {
  1: '💡 تلميح',
  2: '🪜 تلميح أقوى',
  3: '✅ وريّني الإجابة',
};

/**
 * Splits a question hint into progressive tiers:
 *   Tier 1 — conceptual direction: first sentence only.
 *   Tier 2 — concrete setup: the full hint (usually carries the formula).
 * Tier 3 (the correct answer itself) is assembled by the caller from the
 * options — kept out of this function so it stays string-pure.
 */
export function splitHintTiers(hint: string): { tier1: string; tier2: string } {
  const clean = (hint || '').trim();
  if (!clean) return { tier1: '', tier2: '' };

  // First sentence boundary: . ! ? ؛ ؟ or a LaTeX display block end.
  const match = clean.match(/^(.+?[.!؟;؛])(\s|$)/);
  const firstSentence = match ? match[1].trim() : clean;
  const singleSentence = firstSentence.length >= clean.length * 0.85;

  if (singleSentence) {
    // One-sentence hint: tier 1 nudges, tier 2 shows it fully.
    return {
      tier1: 'فكّر في الفكرة اللي السؤال بيدور حواليها 🤔',
      tier2: clean,
    };
  }
  return { tier1: firstSentence, tier2: clean };
}

/** Ladder state after opening `tier` — what the button should offer next. */
export function nextHintAction(tier: HintTier): string | null {
  if (tier >= 3) return null;
  return TIER_ACTION_LABELS[(tier + 1) as Exclude<HintTier, 0>];
}

export interface BurnoutSignal {
  /** Current streak of consecutive wrong answers (reset on any correct). */
  consecutiveWrong: number;
  /** Time the student has spent on the current question (ms). */
  dwellMs: number;
}

/**
 * Compassionate relief gate: fires on 3 consecutive wrong answers OR a
 * 2-minute stall on one question. Pure — the UI decides how to present it.
 */
export function shouldShowBurnoutRelief(signal: BurnoutSignal): boolean {
  return (
    signal.consecutiveWrong >= BURNOUT.consecutiveWrongThreshold ||
    signal.dwellMs >= BURNOUT.dwellMsThreshold
  );
}

/**
 * Worked-example fading: given the 1-based question number and its steps,
 * returns how many trailing steps must be hidden (completed by the student).
 *   Q1 — fully solved, Q2 — last step hidden, Q3+ — last two hidden.
 */
export function fadedStepsCount(questionNumber: number): number {
  if (questionNumber <= 1) return 0;
  if (questionNumber === 2) return 1;
  return 2;
}

/** Splits worked-example steps into visible / hidden (student-completes). */
export function splitFadedSteps(steps: string[], questionNumber: number): {
  visible: string[];
  hidden: string[];
} {
  const hide = Math.min(fadedStepsCount(questionNumber), Math.max(steps.length - 1, 0));
  return {
    visible: steps.slice(0, steps.length - hide),
    hidden: steps.slice(steps.length - hide),
  };
}
