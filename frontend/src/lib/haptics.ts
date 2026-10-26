/**
 * Phase 4.3 — Micro-delight haptics. Thin, fail-safe wrapper over
 * navigator.vibrate with graceful degradation on desktop/unsupported.
 */

export function vibrateCorrect(): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(15);
    }
  } catch {
    /* haptics are decorative — never throw */
  }
}

export function vibrateWrong(): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([10, 50, 10]);
    }
  } catch {
    /* haptics are decorative — never throw */
  }
}
