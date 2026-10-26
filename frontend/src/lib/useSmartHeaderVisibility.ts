'use client';

import { useState, useEffect, useRef } from 'react';

export interface UseSmartHeaderVisibilityOptions {
  /** Minimum scroll delta in pixels before triggering visibility change (avoids jitter) */
  threshold?: number;
  /** Top boundary threshold where the header is unconditionally forced visible */
  topBoundary?: number;
}

/**
 * Smart Sticky Header Visibility Hook
 * - Hides (fades out & slides up) when scrolling DOWN into page content to maximize screen real estate.
 * - Reveals immediately (fades in & slides down) when scrolling UP anywhere on the page.
 * - Always remains visible at the top of the page.
 * - Uses requestAnimationFrame and passive listeners for 60/120fps mobile performance.
 */
export function useSmartHeaderVisibility({
  threshold = 10,
  topBoundary = 25,
}: UseSmartHeaderVisibilityOptions = {}): boolean {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    lastScrollY.current = window.scrollY;

    const handleScroll = () => {
      if (ticking.current) return;

      ticking.current = true;
      window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;

        // Skip rubber-band overscroll (iOS Safari / Android pull)
        if (currentScrollY < 0) {
          setIsVisible(true);
          lastScrollY.current = 0;
          ticking.current = false;
          return;
        }

        // At or near top boundary: always visible
        if (currentScrollY <= topBoundary) {
          setIsVisible(true);
        } else {
          const delta = currentScrollY - lastScrollY.current;

          // Scrolling DOWN into content -> fade out & slide up to maximize display area
          if (delta > threshold) {
            setIsVisible(false);
          }
          // Scrolling UP -> reveal immediately anywhere on the page
          else if (delta < -threshold) {
            setIsVisible(true);
          }
        }

        lastScrollY.current = currentScrollY;
        ticking.current = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold, topBoundary]);

  return isVisible;
}
