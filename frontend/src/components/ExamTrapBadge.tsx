'use client';

import React from 'react';
import { Flame, AlertTriangle } from 'lucide-react';

interface ExamTrapBadgeProps {
  failureRatePct: number;
  totalAttempts?: number;
  isDark?: boolean;
}

export default function ExamTrapBadge({ failureRatePct, totalAttempts, isDark = true }: ExamTrapBadgeProps) {
  // Format percentage cleanly
  const roundedPct = Math.round(failureRatePct);

  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-bold shadow-lg transition-all animate-pulse"
      style={{
        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(254, 242, 242, 0.95)',
        borderColor: isDark ? 'rgba(239, 68, 68, 0.45)' : 'rgba(252, 165, 165, 0.8)',
        color: isDark ? '#FCA5A5' : '#B91C1C',
        boxShadow: isDark
          ? '0 0 15px rgba(239, 68, 68, 0.25)'
          : '0 2px 8px rgba(239, 68, 68, 0.12)'
      }}
      title={`سؤال مصنف فخ امتحانات بناءً على نتائج الدفعة: نسبة الخطأ ${roundedPct}%`}
    >
      <span className="flex items-center justify-center text-amber-500 animate-bounce">
        <Flame className="w-4 h-4 fill-amber-500 text-amber-500 shrink-0" />
      </span>
      <span className="leading-tight">
        فخ امتحانات <span className="font-mono font-black underline decoration-red-400">({roundedPct}%</span> من زملائك وقعوا فيه)
      </span>
    </div>
  );
}
