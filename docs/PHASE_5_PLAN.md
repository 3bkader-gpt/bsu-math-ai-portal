# Phase 5 Execution Plan: KaTeX Performance Optimization & Zero-Lag Guard

> **Architecture Standard:**
> - Zero KaTeX Re-renders: Mathematical formulas rendered via KaTeX must NEVER re-parse, re-layout, or re-render when XP counters, level badges, streaks, or confetti animations update.
> - KaTeX Memoization & String Caching: Cache rendered LaTeX HTML strings in a fast LRU or Map cache to eliminate repeated CPU-heavy KaTeX parse trees.
> - CSS Custom Properties for Playback & Telemetry: Media progress bars and high-frequency UI updates leverage CSS custom properties (`--progress-pct`) rather than triggering top-level React component tree re-renders.
> - Strict 60 FPS Target: Gamification micro-interactions run on the GPU compositing layer (`transform`, `opacity`) without blocking math layout calculations.

---

## 🎯 Phase 5 Objectives

1. **KaTeX Memoization & Cache Layer (`src/components/MathRenderer.tsx`):**
   - Wrap `MathRenderer` with `React.memo` with custom value equality.
   - Introduce an in-memory LRU render cache for math expression strings to guarantee O(1) instantaneous lookups.
2. **Pure HTML String SSR/Pre-render Guard:**
   - Audit KaTeX usage across `MathRenderer.tsx`, `StudyGuideViewer.tsx`, and `FlashcardsViewer.tsx`.
   - Ensure KaTeX `renderToString` errors degrade gracefully into raw monospace expressions without throwing or breaking page layout.
3. **Decouple Fast-Changing Playback State from Math Elements:**
   - Isolate `currentTime` and `duration` audio/video updates using localized DOM refs or CSS variables so that reading complex math while listening produces 0 frame drops.
4. **Automated Verification:**
   - Vitest performance and memoization tests.
   - Live production Quality Gate deploy and verification.

---

## 📋 Granular Subtasks

### Subtask 5.1: High-Performance MathRenderer with Memoization & String Cache
- [ ] Implement `katexCache` map in `src/components/MathRenderer.tsx`.
- [ ] Memoize `MathRenderer` component with `React.memo`.
- [ ] Add error boundary fallback (`throwOnError: false`).

### Subtask 5.2: Study Guide & Flashcards KaTeX Isolation
- [ ] Verify `StudyGuideViewer` table and text parser uses cached math rendering.
- [ ] Ensure card flipping animation in `FlashcardsViewer` runs purely via CSS 3D transforms (`rotateY`) on GPU without re-running KaTeX parsing.

### Subtask 5.3: Automated Verification & Quality Gate
- [ ] Benchmark KaTeX memoization with Vitest unit tests.
- [ ] Run full 5-step Quality Gate:
  - `npm run typecheck`, `npm test`, `npm run build`.
  - Atomic commit & push.
  - Deploy via Wrangler CLI & verify Render CLI.
  - Playwright live production test on `https://bsu-math-ai-portal.pages.dev`.
