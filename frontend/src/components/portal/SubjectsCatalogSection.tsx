'use client';

import React from 'react';
import { ChevronLeft } from 'lucide-react';
import content from '@/data/content.json';
import { AcademicSubject } from '@/types/academic';
import { SUBJECT_THEME_STYLES } from '@/lib/subjectMeta';

interface SubjectsCatalogSectionProps {
  subjects: AcademicSubject[];
  filteredSubjects: AcademicSubject[];
  selectedSemester: 1 | 2;
  onSemesterChange: (sem: 1 | 2) => void;
  activeSubjectId: number | null;
  onSelectSubject: (id: number) => void;
  isLoadingSubjects: boolean;
  searchQuery: string;
  isGirls: boolean;
  isDark: boolean;
}

export default function SubjectsCatalogSection({
  subjects,
  filteredSubjects,
  selectedSemester,
  onSemesterChange,
  activeSubjectId,
  onSelectSubject,
  isLoadingSubjects,
  searchQuery,
  isGirls,
  isDark,
}: SubjectsCatalogSectionProps) {
  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
            {isGirls && <span className="text-2xl">🌸</span>}
            <span className="inline-flex items-center gap-2 flex-wrap">
              <span>{selectedSemester === 1 ? 'مواد الترم الأول' : 'مواد الترم الثاني'}</span>
              <span className="inline-flex items-center justify-center text-xs font-bold px-2.5 py-0.5 rounded-full font-mono bg-black/5 dark:bg-white/10 text-[var(--text-secondary)] border border-[var(--border-subtle)] shrink-0">
                {filteredSubjects.length} {filteredSubjects.length === 1 ? 'مادة' : 'مواد'}
              </span>
            </span>
          </h3>
          <p className="text-sm font-medium mt-1" style={{ color: 'var(--text-muted)' }}>
            {isGirls
              ? 'اختاري المادة واستمتعي بالمحاضرات والشرح والزتونة 🎀'
              : 'اختار المادة وتصفح المحاضرات والشرح والملخصات الذكية'}
          </p>
        </div>

        {/* Semester Switcher Tabs */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
          className="inline-flex items-center p-0.5 rounded-xl border self-start sm:self-auto shadow-xs"
        >
          <button
            type="button"
            onClick={() => onSemesterChange(1)}
            style={{
              backgroundColor:
                selectedSemester === 1
                  ? isGirls
                    ? '#F43F5E'
                    : 'var(--accent-primary)'
                  : 'transparent',
              color: selectedSemester === 1 ? '#FFFFFF' : 'var(--text-secondary)',
            }}
            className="shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
          >
            <span className="shrink-0">الترم الأول</span>
            <span className="shrink-0 inline-flex items-center justify-center text-xs px-1.5 py-0.5 rounded-full bg-black/20 text-white font-mono">
              <bdi dir="ltr">{subjects.filter((s) => (s.semester ?? 1) === 1).length}</bdi>
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSemesterChange(2)}
            style={{
              backgroundColor:
                selectedSemester === 2
                  ? isGirls
                    ? '#F43F5E'
                    : 'var(--accent-primary)'
                  : 'transparent',
              color: selectedSemester === 2 ? '#FFFFFF' : 'var(--text-secondary)',
            }}
            className="shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
          >
            <span className="shrink-0">الترم الثاني</span>
            <span className="shrink-0 inline-flex items-center justify-center text-xs px-1.5 py-0.5 rounded-full bg-black/20 text-white font-mono">
              <bdi dir="ltr">{subjects.filter((s) => (s.semester ?? 1) === 2).length}</bdi>
            </span>
          </button>
        </div>
      </div>

      {isLoadingSubjects && filteredSubjects.length === 0 ? (
        <div className="flex md:grid md:grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-2.5 pb-2.5 pt-1 md:py-0 px-1 overflow-hidden">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
              className="h-28 rounded-2xl border animate-pulse p-4 flex flex-col justify-between"
            >
              <div className="w-8 h-8 rounded-xl bg-gray-500/10" />
              <div className="h-4 w-3/4 bg-gray-500/15 rounded" />
            </div>
          ))}
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
          className="rounded-3xl border p-8 sm:p-12 text-center max-w-xl mx-auto my-6 transition-colors shadow-sm"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-3xl select-none">
            {searchQuery ? '🔍' : selectedSemester === 2 ? '⏳' : '📚'}
          </div>
          <h4 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            {searchQuery
              ? content.semesters.searchEmpty.title
              : selectedSemester === 2
              ? content.semesters.semester2.emptyTitle
              : content.semesters.semester1.emptyTitle}
          </h4>
          <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {searchQuery
              ? content.semesters.searchEmpty.subtitle
              : selectedSemester === 2
              ? content.semesters.semester2.emptySubtitle
              : content.semesters.semester1.emptySubtitle}
          </p>
        </div>
      ) : (
        <div>
          {/* Mobile Swipe Hint */}
          <div className="flex md:hidden items-center justify-between text-xs font-semibold px-1 mb-2.5" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1.5">
              <span>{content.semesters.mobileSwipeHint}</span>
              <span className="text-xs opacity-75">↔</span>
            </span>
            <span className="text-xs opacity-80">{filteredSubjects.length} مادة</span>
          </div>

          <div className="flex md:grid md:grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] overflow-x-auto md:overflow-x-visible overscroll-x-contain snap-x snap-mandatory gap-2.5 pb-2.5 pt-3 md:py-0 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rail-courses-mobile">
            {filteredSubjects.map((sub) => {
              const isActive = sub.id === activeSubjectId;
              const baseStyleConfig = SUBJECT_THEME_STYLES[sub.name] || {
                charm: '🌸',
                badgeTag: 'مقرر دراسي 🌸',
                darkBadge: 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-950/60',
                lightBadge: 'bg-rose-100 text-rose-700 border-rose-200',
                glowColor: '#FB7185',
                boysCharm: '',
                boysBadgeTag: 'مقرر دراسي',
                boysDarkBadge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-950/60',
                boysLightBadge: 'bg-cyan-100 text-cyan-800 border-cyan-200',
                boysGlowColor: '#06B6D4',
              };
              const styleConfig =
                sub.theme_config && typeof sub.theme_config === 'object'
                  ? { ...baseStyleConfig, ...sub.theme_config }
                  : baseStyleConfig;

              const activeCharm = isGirls ? styleConfig.charm : styleConfig.boysCharm;
              const activeBadgeTag = isGirls ? styleConfig.badgeTag : styleConfig.boysBadgeTag;
              const activeDarkBadge = isGirls ? styleConfig.darkBadge : styleConfig.boysDarkBadge;
              const activeLightBadge = isGirls ? styleConfig.lightBadge : styleConfig.boysLightBadge;
              const activeGlowColor = isGirls ? styleConfig.glowColor : styleConfig.boysGlowColor;

              return (
                <button
                  key={sub.id}
                  onClick={() => onSelectSubject(sub.id)}
                  style={{
                    backgroundColor: isActive ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                    borderColor: isActive ? activeGlowColor : 'var(--border-subtle)',
                    boxShadow: isActive
                      ? isDark
                        ? `0 0 20px ${activeGlowColor}33, var(--card-shadow-hover)`
                        : `0 0 16px ${activeGlowColor}22, var(--card-shadow-hover)`
                      : 'var(--card-shadow)',
                  }}
                  className={`relative p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-right transition-all flex flex-col justify-between cursor-pointer group min-w-[130px] w-[138px] xs:w-[150px] sm:w-[165px] md:w-auto shrink-0 snap-start ${
                    isActive ? 'ring-2 ring-cyan-500/40' : 'sm:hover:scale-[1.01]'
                  }`}
                >
                  {isActive && (
                    <div className="absolute -top-2 right-2.5 z-10">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full border shadow-sm flex items-center gap-1 tracking-wide"
                        style={{
                          backgroundColor: isDark ? (isGirls ? '#28162F' : '#0B132B') : isGirls ? '#FFF0F3' : '#EFF6FF',
                          borderColor: activeGlowColor,
                          color: activeGlowColor,
                        }}
                      >
                        {isGirls ? '🎀 المختارة' : 'المقرر النشط'}
                      </span>
                    </div>
                  )}

                  <div>
                    <div className="relative w-9 h-9 sm:w-11 sm:h-11 mb-2">
                      <div
                        className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl border flex items-center justify-center font-bold text-base sm:text-lg shadow-sm transition-transform duration-200 group-hover:scale-105 select-none leading-none ${
                          isDark ? activeDarkBadge : activeLightBadge
                        }`}
                      >
                        <span className="flex items-center justify-center">{sub.icon || sub.name.slice(0, 2)}</span>
                      </div>

                      {isGirls && activeCharm && (
                        <div
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border shadow-sm flex items-center justify-center text-xs select-none leading-none pointer-events-none"
                          style={{
                            backgroundColor: isDark ? '#28162F' : '#FFFFFF',
                            borderColor: isDark ? `${activeGlowColor}80` : '#F2CBD5',
                          }}
                        >
                          {activeCharm}
                        </div>
                      )}
                    </div>
                    <h4 className="font-bold text-xs sm:text-sm line-clamp-2 leading-tight break-words" style={{ color: 'var(--text-primary)' }}>
                      {sub.name}
                    </h4>
                    {sub.canonicalDoctor && (
                      <span
                        className="inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-md mt-1 truncate max-w-full border"
                        style={{
                          backgroundColor: isDark ? `${activeGlowColor}18` : `${activeGlowColor}12`,
                          color: activeGlowColor,
                          borderColor: `${activeGlowColor}35`,
                        }}
                      >
                        {sub.canonicalDoctor.includes('مروة') || sub.canonicalDoctor.includes('ايه') || sub.canonicalDoctor.includes('ايمان')
                          ? '👩‍🏫'
                          : '👨‍🏫'}{' '}
                        {sub.canonicalDoctor} {isGirls ? '🌸' : ''}
                      </span>
                    )}
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
                    <span className="font-semibold text-xs sm:text-sm whitespace-nowrap" style={{ color: activeGlowColor }}>
                      {activeBadgeTag}
                    </span>
                    <ChevronLeft className="w-3.5 h-3.5 opacity-70 transition-transform group-hover:-translate-x-1 shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
