import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Orientation & Mobile Landscape Resilience (Phase 7)', () => {
  const ethicalModalPath = path.resolve(__dirname, '../../src/modules/gamification/ui/EthicalWrapUpModal.tsx');
  const burnoutModalPath = path.resolve(__dirname, '../../src/modules/gamification/ui/BurnoutReliefModal.tsx');
  const mistakeModalPath = path.resolve(__dirname, '../../src/modules/gamification/ui/MistakeNotebookModal.tsx');
  const pillPath = path.resolve(__dirname, '../../src/components/gamification/StudentGamificationPill.tsx');
  const pagePath = path.resolve(__dirname, '../../src/app/page.tsx');
  const globalsCssPath = path.resolve(__dirname, '../../src/app/globals.css');

  describe('Modal Landscape Viewport Safety (Prevent clipping & enable closure)', () => {
    it('EthicalWrapUpModal has scrollable backdrop and max-height guard for landscape', () => {
      const code = fs.readFileSync(ethicalModalPath, 'utf8');
      expect(code).toContain('overflow-y-auto');
      expect(code).toContain('overscroll-contain');
      expect(code).toContain('max-h-[92dvh]');
      expect(code).toContain('onClick={onClose}');
    });

    it('BurnoutReliefModal has scrollable backdrop and max-height guard', () => {
      const code = fs.readFileSync(burnoutModalPath, 'utf8');
      expect(code).toContain('overflow-y-auto');
      expect(code).toContain('overscroll-contain');
      expect(code).toContain('max-h-[92dvh]');
      expect(code).toContain('onClick={onClose}');
    });

    it('MistakeNotebookModal has scrollable backdrop and max-height guard', () => {
      const code = fs.readFileSync(mistakeModalPath, 'utf8');
      expect(code).toContain('overflow-y-auto');
      expect(code).toContain('overscroll-contain');
      expect(code).toContain('max-h-[92dvh]');
      expect(code).toContain('onClick={onClose}');
    });

    it('StudentGamificationPill modal is safe in landscape rotation', () => {
      const code = fs.readFileSync(pillPath, 'utf8');
      expect(code).toContain('overflow-y-auto');
      expect(code).toContain('overscroll-contain');
      expect(code).toContain('max-h-[92dvh]');
    });
  });

  describe('Header Anti-Collision in Mobile Landscape', () => {
    it('restricts secondary header pills to lg: screens to avoid overlapping brand in landscape', () => {
      const code = fs.readFileSync(pagePath, 'utf8');
      // Must use hidden lg:inline-flex for secondary pills
      expect(code).toContain('hidden lg:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-bold hover:scale-102 active:scale-98 transition-all shadow-xs cursor-pointer whitespace-nowrap shrink-0');
      // Brand tag must be hidden on screens below lg
      expect(code).toContain("hidden lg:inline-block px-2.5 py-0.5 text-xs font-bold rounded-full border shrink-0");
      // Hamburger drawer trigger must be accessible on landscape mobile (< lg)
      expect(code).toContain('className="lg:hidden p-1.5 rounded-lg border flex items-center justify-center');
    });
  });

  describe('Course Rail Touch-Action & Vertical Page Scroll', () => {
    it('does NOT contain touch-pan-x on rail-courses-mobile, ensuring vertical swipes scroll the page', () => {
      const code = fs.readFileSync(pagePath, 'utf8');
      const railRegex = /rail-courses-mobile[\s\S]*?>/i;
      // Search the line with rail-courses-mobile
      const railLine = code.split('\n').find((l) => l.includes('rail-courses-mobile')) || '';
      expect(railLine).not.toContain('touch-pan-x');
    });
  });

  describe('Arabic Typography Scale (2.4% Optimal Growth)', () => {
    it('sets root font-size to 14.85px for mobile in globals.css', () => {
      const css = fs.readFileSync(globalsCssPath, 'utf8');
      expect(css).toContain('font-size: 14.85px;');
      expect(css).toContain('font-size: 15.35px;');
      expect(css).toContain('font-size: 15.65px;');
    });
  });

  describe('Smart Auto-Hiding Header (Maximize Screen Real Estate)', () => {
    const smartHeaderPath = path.resolve(__dirname, '../../src/lib/useSmartHeaderVisibility.ts');
    const lecturePagePath = path.resolve(__dirname, '../../src/app/lecture/page.tsx');

    it('implements useSmartHeaderVisibility with RAF throttling, delta threshold, and top boundary', () => {
      const code = fs.readFileSync(smartHeaderPath, 'utf8');
      expect(code).toContain('export function useSmartHeaderVisibility');
      expect(code).toContain('requestAnimationFrame');
      expect(code).toContain('delta > threshold');
      expect(code).toContain('delta < -threshold');
      expect(code).toContain('currentScrollY <= topBoundary');
    });

    it('applies smart auto-hiding and reveal transitions to header in page.tsx', () => {
      const code = fs.readFileSync(pagePath, 'utf8');
      expect(code).toContain('useSmartHeaderVisibility');
      expect(code).toContain('translate-y-0 opacity-100');
      expect(code).toContain('-translate-y-full opacity-0 pointer-events-none');
    });

    it('applies smart auto-hiding and reveal transitions to header in lecture/page.tsx', () => {
      const code = fs.readFileSync(lecturePagePath, 'utf8');
      expect(code).toContain('useSmartHeaderVisibility');
      expect(code).toContain('translate-y-0 opacity-100');
      expect(code).toContain('-translate-y-full opacity-0 pointer-events-none');
      expect(code).toContain('className="lg:hidden p-1.5 rounded-lg border flex items-center justify-center');
    });
  });
});

