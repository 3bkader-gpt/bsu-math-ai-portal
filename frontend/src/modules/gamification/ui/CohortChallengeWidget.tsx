'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, Users, Sparkles, CheckCircle2, Clock } from 'lucide-react';
import {
  calculateCohortProgress,
  CohortChallengeData,
} from '../core/cohortChallenge';
import { fetchActiveCohortChallenge } from '../supabase/cohortChallenge';

interface CohortChallengeWidgetProps {
  userId?: string | null;
  isGirls?: boolean;
  compact?: boolean;
}

export default function CohortChallengeWidget({
  userId,
  isGirls = false,
  compact = false,
}: CohortChallengeWidgetProps) {
  const [data, setData] = useState<CohortChallengeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchActiveCohortChallenge(userId).then((res) => {
      if (mounted) {
        setData(res);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [userId]);

  if (loading || !data) {
    return (
      <div
        className="p-4 rounded-2xl border animate-pulse"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3 mb-3" />
        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full w-full" />
      </div>
    );
  }

  const {
    percent,
    remaining,
    isCompleted,
    motivationalMessage,
    canContributeMoreToday,
    remainingTodayQuota,
  } = calculateCohortProgress(
    data.currentCount,
    data.targetCount,
    data.userToday,
    data.dailyCap
  );

  const accent = isGirls ? '#F43F5E' : '#0D9488';
  const progressBg = isCompleted
    ? 'linear-gradient(90deg, #10B981, #059669)'
    : isGirls
    ? 'linear-gradient(90deg, #F43F5E, #FB7185)'
    : 'linear-gradient(90deg, #0D9488, #2DD4BF)';

  return (
    <div
      className={`rounded-2xl sm:rounded-3xl border transition-all ${
        compact ? 'p-3.5 sm:p-4' : 'p-5 sm:p-6 shadow-sm'
      }`}
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: isCompleted ? 'var(--accent-emerald)' : 'var(--border-subtle)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
            style={{
              backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.15)' : `${accent}18`,
              color: isCompleted ? '#10B981' : accent,
            }}
          >
            {isCompleted ? <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" /> : <Users className="w-4 h-4 sm:w-5 sm:h-5" />}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-extrabold truncate" style={{ color: 'var(--text-primary)' }}>
              {data.title}
            </h4>
            <div className="flex items-center gap-2 text-[10px] sm:text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              <span>الهدف: {data.targetCount} سؤال</span>
              {data.daysRemaining !== undefined && (
                <span className="flex items-center gap-1 opacity-80">
                  <Clock className="w-3 h-3" />
                  <span>باقي {data.daysRemaining} أيام</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Completion or Percentage Badge */}
        <div
          className="px-2.5 py-1 rounded-xl text-xs font-black shrink-0 border"
          style={{
            backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.15)' : `${accent}12`,
            borderColor: isCompleted ? '#10B981' : `${accent}30`,
            color: isCompleted ? '#10B981' : accent,
          }}
        >
          {isCompleted ? 'مكتمل 🏆' : `${percent}٪`}
        </div>
      </div>

      {/* Progress Track */}
      <div
        className="w-full h-3 sm:h-3.5 rounded-full overflow-hidden p-0.5 border"
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          borderColor: 'var(--border-subtle)',
        }}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${percent}%`,
            background: progressBg,
          }}
        />
      </div>

      {/* Progress Numbers */}
      <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold mt-2" style={{ color: 'var(--text-secondary)' }}>
        <span>حلّت الدفعة: {data.currentCount} سؤال</span>
        <span>
          {isCompleted ? (
            <span className="text-emerald-500 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              تم الهدف!
            </span>
          ) : (
            `باقي ${remaining} سؤال`
          )}
        </span>
      </div>

      {/* Motivational Callout */}
      <div
        className="mt-3 p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in"
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-primary)',
        }}
      >
        <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: accent }} />
        <span className="leading-relaxed">{motivationalMessage}</span>
      </div>

      {/* Student Personal Contribution Footer */}
      <div
        className="mt-2.5 pt-2 border-t flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-[11px] font-semibold"
        style={{
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-muted)',
        }}
      >
        <span>
          مساهمتك الإجمالية: <strong className="font-extrabold" style={{ color: accent }}>{data.userTotal} سؤال</strong>
        </span>
        <span>
          {canContributeMoreToday ? (
            <span>اليوم: {data.userToday} / {data.dailyCap ?? 15} (باقي {remainingTodayQuota})</span>
          ) : (
            <span className="text-amber-500 font-bold">وصلت للحد الأقصى اليوم (15/15) 🛡️</span>
          )}
        </span>
      </div>
    </div>
  );
}
