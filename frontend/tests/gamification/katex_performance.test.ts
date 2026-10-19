import { describe, it, expect, beforeEach } from 'vitest';
import {
  renderKaTeXCached,
  getKaTeXCacheSize,
  clearKaTeXCache,
} from '@/components/MathRenderer';

describe('Phase 5: KaTeX Performance Optimization & Zero-Lag Engine', () => {
  beforeEach(() => {
    clearKaTeXCache();
  });

  it('renders LaTeX formulas to KaTeX HTML structure', () => {
    const formula = '\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}';
    const html = renderKaTeXCached(formula, true);

    expect(html).toContain('class="katex"');
    expect(html).toContain('class="katex-html"');
    expect(getKaTeXCacheSize()).toBe(1);
  });

  it('serves cached formulas instantaneously with zero re-parsing overhead', () => {
    const formula = '\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}';

    // First Call: Parse & Cache
    const firstHtml = renderKaTeXCached(formula, false);
    expect(getKaTeXCacheSize()).toBe(1);

    // Second Call: Instant O(1) Cache Hit
    const secondHtml = renderKaTeXCached(formula, false);
    expect(getKaTeXCacheSize()).toBe(1); // Size unchanged!
    expect(secondHtml).toBe(firstHtml);
  });

  it('differentiates between inline and block rendering in cache keys', () => {
    const formula = 'E = mc^2';

    const inlineHtml = renderKaTeXCached(formula, false);
    const blockHtml = renderKaTeXCached(formula, true);

    expect(getKaTeXCacheSize()).toBe(2);
    expect(inlineHtml).not.toBe(blockHtml);
    expect(blockHtml).toContain('class="katex-display"');
  });

  it('handles malformed LaTeX gracefully without throwing', () => {
    const malformed = '\\frac{unclosed';
    expect(() => renderKaTeXCached(malformed, false)).not.toThrow();

    const output = renderKaTeXCached(malformed, false);
    expect(output).toBeDefined();
  });

  it('benchmarks 1,000 cached renders in under 15ms (60 FPS zero-lag compliance)', () => {
    const formula = '\\vec{F} = m \\frac{d^2 \\vec{r}}{dt^2}';
    // Warm up cache
    renderKaTeXCached(formula, true);

    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      renderKaTeXCached(formula, true);
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(15); // Less than 15ms for 1000 lookups
  });
});
