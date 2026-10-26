'use client';

import { Headphones, Lightbulb, X } from 'lucide-react';

/**
 * Phase 3.3 — Compassionate burnout-relief modal.
 *
 * Fired by the Cognitive Guard when the student is stuck (3 consecutive
 * wrong answers OR a 2-minute stall on one question). Offers exactly two
 * dignity-preserving paths: a stronger hint, or a breather. Never shames.
 */
export default function BurnoutReliefModal({
  isGirls = false,
  questionHint,
  onClose,
  onOpenHint,
}: {
  isGirls?: boolean;
  questionHint: string | null;
  onClose: () => void;
  /** Opens the full hint ladder for the stuck question (tier 2). */
  onOpenHint: () => void;
}) {
  const accent = isGirls ? '#F43F5E' : '#0D9488';
  const name = isGirls ? 'باشمهندسة' : 'يا هندسة';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md overflow-y-auto overscroll-contain animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[92dvh] overflow-y-auto my-auto rounded-3xl border p-5 sm:p-7 shadow-2xl animate-in zoom-in-95 duration-200"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-prominent)',
          boxShadow: 'var(--card-shadow-hover)',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="float-left p-1.5 rounded-lg cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5"
          style={{ color: 'var(--text-muted)' }}
          aria-label="إغلاق"
        >
          <X className="w-4 h-4" />
        </button>

        <div
          className="w-12 h-12 mx-auto mb-3.5 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: `${accent}1a`, color: accent }}
        >
          <Headphones className="w-6 h-6" />
        </div>

        <h3 className="text-lg sm:text-xl font-black text-center leading-relaxed" style={{ color: 'var(--text-primary)' }}>
          المفهوم ده تقيل شوية دلوقتي، {name} 💙
        </h3>
        <p className="text-sm sm:text-base font-bold text-center mt-2.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          ده طبيعي جداً في الرياضيات — والوقفة دي معلومة مفيدة مش عيب.
          <br />
          تحب نساعدك إزاي؟
        </p>

        <div className="space-y-2.5 mt-5">
          {questionHint && (
            <button
              type="button"
              onClick={onOpenHint}
              className="w-full py-3.5 px-4 rounded-2xl border font-black text-sm sm:text-base transition-all hover:opacity-90 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              style={{ backgroundColor: accent, borderColor: accent, color: '#ffffff' }}
            >
              <Lightbulb className="w-4.5 h-4.5" />
              <span>وريني تلميح أقوى 🪜</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 px-4 rounded-2xl border font-black text-sm sm:text-base transition-all hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-prominent)',
              color: 'var(--text-primary)',
            }}
          >
            <span>هسيبها في دفتر الأخطاء وأرتاح شوية ☕</span>
          </button>
        </div>

        <p className="text-[11px] sm:text-xs font-bold text-center mt-4" style={{ color: 'var(--text-muted)' }}>
          السؤال هيتحفظ في دفتر الأخطاء تلقائياً وهيراجعه معاك التكرار المتباعد
        </p>
      </div>
    </div>
  );
}
