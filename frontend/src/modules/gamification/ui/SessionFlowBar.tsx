'use client';

import { useEffect, useRef, useState } from 'react';
import { Coffee, X } from 'lucide-react';

import { SESSION_FLOW } from '@/modules/gamification/core/hintLadder';

/**
 * Phase 3.4 — 25-minute structured-flow indicator.
 *
 * A whisper-thin progress bar under the lecture header that fills across
 * the flow window, then offers ONE gentle break prompt. Deliberately:
 *   - zero gamification-store subscriptions (KaTeX isolation rule),
 *   - zero telemetry events (measurement stays clean),
 *   - never blocks or interrupts — it only suggests.
 */
export default function SessionFlowBar({ isGirls = false }: { isGirls?: boolean }) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [promptDismissed, setPromptDismissed] = useState(false);
  const startRef = useRef<number>(Date.now());
  const shownRef = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - startRef.current);
    }, 30_000); // 2px bar: half-minute resolution is invisible-to-the-eye smooth
    return () => window.clearInterval(id);
  }, []);

  const ratio = Math.min(1, elapsedMs / SESSION_FLOW.durationMs);
  const reached = ratio >= 1;
  if (reached) shownRef.current = true;

  const accent = isGirls ? '#F43F5E' : '#0D9488';

  return (
    <>
      <div
        aria-hidden="true"
        className="h-[3px] w-full overflow-hidden"
        style={{ backgroundColor: 'var(--bg-surface-elevated)' }}
      >
        <div
          className="h-full transition-[width] duration-1000 ease-linear"
          style={{ width: `${ratio * 100}%`, backgroundColor: accent, opacity: 0.65 }}
        />
      </div>

      {reached && shownRef.current && !promptDismissed && (
        <div
          className="mx-auto mt-3 w-fit max-w-[92vw] flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border shadow-sm animate-in fade-in"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
          role="status"
        >
          <Coffee className="w-4 h-4 shrink-0" style={{ color: accent }} />
          <span className="text-xs sm:text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
            {isGirls ? 'وصلتي لـ 25 دقيقة مذاكرة مركزة — أخدتي استراحة صغيرة؟ 🌿' : 'وصلت لـ 25 دقيقة مذاكرة مركزة — أخدت استراحة صغيرة؟ 🌿'}
          </span>
          <button
            type="button"
            onClick={() => setPromptDismissed(true)}
            className="p-1 rounded-lg cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{ color: 'var(--text-muted)' }}
            aria-label="إغلاق التنبيه"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
}
