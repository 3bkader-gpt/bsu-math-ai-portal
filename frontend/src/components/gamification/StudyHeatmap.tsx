'use client';

import React, { useMemo, useState } from 'react';
import {
  buildStudyHeatmapGrid,
  DailyActivityInput,
  HeatmapCell,
  HeatmapIntensity,
} from '@/modules/gamification/core/heatmap';
import { CalendarDays, Sparkles } from 'lucide-react';

interface StudyHeatmapProps {
  rows: DailyActivityInput[];
  isGirls?: boolean;
  isDark?: boolean;
  loading?: boolean;
}

export function StudyHeatmap({
  rows,
  isGirls = false,
  isDark = false,
  loading = false,
}: StudyHeatmapProps) {
  const grid = useMemo(() => buildStudyHeatmapGrid(rows, { weeksCount: 16 }), [rows]);
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null);

  const getCellStyle = (intensity: HeatmapIntensity, isToday: boolean): React.CSSProperties => {
    if (intensity === 0) {
      return {
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)',
        borderColor: isToday
          ? isGirls
            ? '#F472B6'
            : '#2DD4BF'
          : isDark
          ? 'rgba(255, 255, 255, 0.08)'
          : 'rgba(15, 23, 42, 0.08)',
      };
    }

    if (isGirls) {
      const shades: Record<1 | 2 | 3 | 4, string> = isDark
        ? {
            1: 'rgba(244, 114, 182, 0.28)',
            2: 'rgba(244, 114, 182, 0.50)',
            3: 'rgba(236, 72, 153, 0.75)',
            4: '#EC4899',
          }
        : {
            1: '#FBCFE8',
            2: '#F472B6',
            3: '#EC4899',
            4: '#BE185D',
          };
      return {
        backgroundColor: shades[intensity],
        borderColor: isToday ? '#FFFFFF' : 'transparent',
      };
    }

    const shades: Record<1 | 2 | 3 | 4, string> = isDark
      ? {
          1: 'rgba(45, 212, 191, 0.25)',
          2: 'rgba(45, 212, 191, 0.48)',
          3: 'rgba(20, 184, 166, 0.75)',
          4: '#14B8A6',
        }
      : {
          1: '#99F6E4',
          2: '#2DD4BF',
          3: '#0D9488',
          4: '#115E59',
        };
    return {
      backgroundColor: shades[intensity],
      borderColor: isToday ? '#F59E0B' : 'transparent',
    };
  };

  const formatArabicDate = (isoDate: string) => {
    try {
      const [y, m, d] = isoDate.split('-').map((n) => parseInt(n, 10));
      const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
      return dt.toLocaleDateString('ar-EG', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      });
    } catch {
      return isoDate;
    }
  };

  return (
    <div
      style={{
        backgroundColor: isDark ? '#1C2533' : '#FAF5EA',
        borderColor: isDark ? '#2A3B4F' : '#E3D7C1',
      }}
      className="p-4 rounded-2xl border space-y-3"
      data-testid="study-heatmap-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarDays
            className="w-4 h-4 shrink-0"
            style={{ color: isGirls ? '#EC4899' : '#14B8A6' }}
          />
          <h4
            style={{ color: isDark ? '#F1F5F9' : '#162828' }}
            className="text-xs sm:text-sm font-extrabold"
          >
            خريطة الالتزام الدراسي (آخر 16 أسبوعاً)
          </h4>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-bold">
          <span
            style={{
              backgroundColor: isGirls
                ? 'rgba(236, 72, 153, 0.15)'
                : 'rgba(20, 184, 166, 0.15)',
              color: isGirls ? '#F472B6' : '#2DD4BF',
            }}
            className="px-2 py-0.5 rounded-full font-mono"
          >
            {grid.activeDaysCount} يوم نشط
          </span>
          {grid.totalXpInWindow > 0 && (
            <span
              style={{ color: isDark ? '#94A3B8' : '#526E6E' }}
              className="font-mono text-[10px]"
            >
              • {grid.totalXpInWindow} XP
            </span>
          )}
        </div>
      </div>

      {/* 16-Week Grid */}
      {loading ? (
        <div
          style={{ color: isDark ? '#94A3B8' : '#526E6E' }}
          className="py-6 text-center text-xs font-bold animate-pulse"
        >
          جاري تحميل سجل نشاطك اليومي...
        </div>
      ) : (
        <div className="overflow-x-auto pb-1 no-scrollbar">
          <div className="inline-flex flex-col gap-1 min-w-full">
            {/* Month Labels Row */}
            <div className="grid grid-cols-16 gap-1 text-[9px] font-bold select-none" style={{ color: isDark ? '#94A3B8' : '#526E6E' }}>
              {grid.weeks.map((week) => (
                <div key={`month-${week.weekIndex}`} className="truncate text-center">
                  {week.monthLabel || ''}
                </div>
              ))}
            </div>

            {/* Weeks Columns */}
            <div className="grid grid-cols-16 gap-1">
              {grid.weeks.map((week) => (
                <div key={`week-${week.weekIndex}`} className="flex flex-col gap-1">
                  {week.days.map((cell) => {
                    const isSelected = selectedCell?.date === cell.date;
                    return (
                      <button
                        key={cell.date}
                        type="button"
                        onClick={() => setSelectedCell(cell)}
                        onMouseEnter={() => setSelectedCell(cell)}
                        title={`${formatArabicDate(cell.date)}: ${cell.xpEarned} XP (${cell.itemsCompleted} مهام)`}
                        style={getCellStyle(cell.intensity, cell.isToday)}
                        className={`w-full aspect-square min-w-[12px] max-w-[18px] rounded-[4px] border transition-transform cursor-pointer ${
                          isSelected ? 'scale-125 ring-1 ring-amber-400 z-10' : 'hover:scale-110'
                        }`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Day Details + Intensity Legend */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-black/5 dark:border-white/5 text-[11px]">
        <div
          style={{ color: isDark ? '#CBD5E1' : '#526E6E' }}
          className="font-bold truncate"
        >
          {selectedCell ? (
            <span>
              📅 {formatArabicDate(selectedCell.date)}:{' '}
              <strong style={{ color: isGirls ? '#F472B6' : '#2DD4BF' }}>
                {selectedCell.xpEarned} XP
              </strong>{' '}
              • {selectedCell.itemsCompleted} عنصر مكتمل
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 opacity-85">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>المس أي مربع لعرض تفاصيل مذاكرتك في ذلك اليوم</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0" style={{ color: isDark ? '#94A3B8' : '#526E6E' }}>
          <span className="text-[9px]">أقل</span>
          {([0, 1, 2, 3, 4] as HeatmapIntensity[]).map((lvl) => (
            <span
              key={lvl}
              style={getCellStyle(lvl, false)}
              className="w-2.5 h-2.5 rounded-[3px] border inline-block"
            />
          ))}
          <span className="text-[9px]">أكثر</span>
        </div>
      </div>
    </div>
  );
}
