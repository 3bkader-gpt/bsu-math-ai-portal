'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Headphones,
  Video,
  HelpCircle,
  FileText,
  Layers,
  Play,
  GraduationCap,
  Clock,
} from 'lucide-react';
import content from '@/data/content.json';
import StaplePin3D from '@/components/StaplePin3D';
import { AcademicSubject } from '@/types/academic';
import { SUBJECT_THEME_STYLES, getDoctorTrackDetails } from '@/lib/subjectMeta';
import { PortalLectureItem, CohortMomentumMap } from '@/hooks/usePortalCatalog';

interface ActiveSubjectLecturesSectionProps {
  activeSubject: AcademicSubject;
  subjectLectures: PortalLectureItem[];
  displayedLectures: PortalLectureItem[];
  selectedDoctor: string;
  onSelectDoctor: (doc: string) => void;
  isLoadingLectures: boolean;
  cohortMomentum: CohortMomentumMap;
  isGirls: boolean;
  isDark: boolean;
  onOpenExamBuilder: () => void;
  onOpenFormulaSheet: () => void;
  onOpenHurdles: () => void;
  onOpenRecoveryPlanner: () => void;
  onOpenFocusAmbience: () => void;
  onOpenMathScratchpad: () => void;
  onOpenStudentBinder: () => void;
}

export default function ActiveSubjectLecturesSection({
  activeSubject,
  subjectLectures,
  displayedLectures,
  selectedDoctor,
  onSelectDoctor,
  isLoadingLectures,
  cohortMomentum,
  isGirls,
  isDark,
  onOpenExamBuilder,
  onOpenFormulaSheet,
  onOpenHurdles,
  onOpenRecoveryPlanner,
  onOpenFocusAmbience,
  onOpenMathScratchpad,
  onOpenStudentBinder,
}: ActiveSubjectLecturesSectionProps) {
  const router = useRouter();

  const baseActiveConfig = SUBJECT_THEME_STYLES[activeSubject?.name || ''] || {
    charm: '🎀',
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
  const activeSubjectConfig =
    activeSubject?.theme_config && typeof activeSubject.theme_config === 'object'
      ? { ...baseActiveConfig, ...activeSubject.theme_config }
      : baseActiveConfig;
  const activeSubjectCharm = isGirls ? activeSubjectConfig.charm : activeSubjectConfig.boysCharm;
  const activeSubjectGlow = isGirls ? activeSubjectConfig.glowColor : activeSubjectConfig.boysGlowColor;
  const activeSubjectDarkBadge = isGirls ? activeSubjectConfig.darkBadge : activeSubjectConfig.boysDarkBadge;
  const activeSubjectLightBadge = isGirls ? activeSubjectConfig.lightBadge : activeSubjectConfig.boysLightBadge;

  return (
    <section
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
        boxShadow: 'var(--card-shadow)',
      }}
      className="p-3.5 sm:p-8 rounded-2xl sm:rounded-3xl border transition-colors"
    >
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative w-12 h-12 shrink-0">
            <div
              className={`w-12 h-12 rounded-2xl border flex items-center justify-center text-2xl shadow-sm select-none leading-none ${
                isDark ? activeSubjectDarkBadge : activeSubjectLightBadge
              }`}
            >
              <span className="flex items-center justify-center">{activeSubject?.icon || '📐'}</span>
            </div>
            {isGirls && activeSubjectCharm && (
              <div
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full border shadow-sm flex items-center justify-center text-[11px] select-none leading-none pointer-events-none"
                style={{
                  backgroundColor: isDark ? '#28162F' : '#FFFFFF',
                  borderColor: isDark ? `${activeSubjectGlow}80` : '#F2CBD5',
                }}
              >
                {activeSubjectCharm}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: activeSubjectGlow }}>
                {isGirls ? '🌸 المادة اللي اخترتيها يا شطورة' : 'المقرر المختار'}
              </span>
              {activeSubject?.canonicalDoctor && (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border whitespace-nowrap shrink-0"
                  style={{
                    backgroundColor: isDark ? `${activeSubjectGlow}20` : `${activeSubjectGlow}15`,
                    borderColor: `${activeSubjectGlow}45`,
                    color: activeSubjectGlow,
                  }}
                >
                  {activeSubject.canonicalDoctor.includes('مروة') ||
                  activeSubject.canonicalDoctor.includes('ايه') ||
                  activeSubject.canonicalDoctor.includes('ايمان')
                    ? '👩‍🏫'
                    : '👨‍🏫'}{' '}
                  {activeSubject.canonicalDoctor} {isGirls ? '🌸' : ''}
                </span>
              )}
            </div>
            <h3 className="text-xl sm:text-3xl font-black mt-1 flex items-center gap-2 flex-wrap break-words" style={{ color: 'var(--text-primary)' }}>
              <span>{activeSubject?.name || content.lecturesSection.defaultPrompt}</span>
              {isGirls && <span className="text-xl">✨</span>}
            </h3>
          </div>
        </div>

        <div
          className="text-xs sm:text-sm font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shrink-0 shadow-xs self-start sm:self-auto"
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-muted)',
          }}
        >
          {isGirls ? <span>☕</span> : <span>🔥</span>}
          <span>متاح {displayedLectures.length} محاضرات</span>
          {isGirls ? <span>بروقان</span> : <span>جاهزة للفرم</span>}
        </div>
      </div>

      {/* Study & Synthesis Tools Ribbon */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:flex-wrap scrollbar-none mb-6">
        <button
          type="button"
          onClick={onOpenExamBuilder}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-black transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer shrink-0"
          style={{
            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 246, 255, 0.95)',
            borderColor: isDark ? 'rgba(59, 130, 246, 0.4)' : 'rgba(191, 219, 254, 0.8)',
            color: isDark ? '#93C5FD' : '#1D4ED8',
          }}
          title="توليف امتحان مخصص ومحاكاة ميدترم بنطاق محاضرات مرن"
        >
          <span>⚡</span>
          <span>محاكي الامتحانات</span>
        </button>

        <button
          type="button"
          onClick={onOpenFormulaSheet}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-black transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer shrink-0"
          style={{
            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(236, 253, 245, 0.95)',
            borderColor: isDark ? 'rgba(16, 185, 129, 0.4)' : 'rgba(167, 243, 208, 0.8)',
            color: isDark ? '#6EE7B7' : '#047857',
          }}
          title="استعراض بنك القوانين والنظريات وتصديرها كـ PDF للطباعة الورقية"
        >
          <span>📐</span>
          <span>كشكول القوانين</span>
        </button>

        <button
          type="button"
          onClick={onOpenHurdles}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-black transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer shrink-0"
          style={{
            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(254, 242, 242, 0.95)',
            borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : 'rgba(252, 165, 165, 0.8)',
            color: isDark ? '#FCA5A5' : '#B91C1C',
          }}
          title="استعراض أصعب أسئلة كويزات الدفعة مع الإجابات النموذجية والشرح"
        >
          <span>🎯</span>
          <span>أصعب الفخاخ</span>
        </button>

        <button
          type="button"
          onClick={onOpenRecoveryPlanner}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-black transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer shrink-0"
          style={{
            backgroundColor: isDark ? 'rgba(168, 85, 247, 0.15)' : 'rgba(250, 245, 255, 0.95)',
            borderColor: isDark ? 'rgba(168, 85, 247, 0.4)' : 'rgba(233, 213, 255, 0.8)',
            color: isDark ? '#D8B4FE' : '#7E22CE',
          }}
          title="توليف خطة إنقاذ وسد التراكمات اليومية وحصد نقاط XP"
        >
          <span>📅</span>
          <span>خطة الإنقاذ</span>
        </button>

        <button
          type="button"
          onClick={onOpenFocusAmbience}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-black transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer shrink-0"
          style={{
            backgroundColor: isDark ? 'rgba(234, 179, 8, 0.15)' : 'rgba(254, 252, 232, 0.95)',
            borderColor: isDark ? 'rgba(234, 179, 8, 0.4)' : 'rgba(254, 240, 138, 0.8)',
            color: isDark ? '#FDE047' : '#A16207',
          }}
          title="بيئة صوتية طبيعية ومؤقت بومودورو للتركيز وحصد XP"
        >
          <span>🧘</span>
          <span>ركن التركيز</span>
        </button>

        <button
          type="button"
          onClick={onOpenMathScratchpad}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-black transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer shrink-0"
          style={{
            backgroundColor: isDark ? 'rgba(6, 182, 212, 0.15)' : 'rgba(236, 254, 255, 0.95)',
            borderColor: isDark ? 'rgba(6, 182, 212, 0.4)' : 'rgba(165, 243, 252, 0.8)',
            color: isDark ? '#67E8F9' : '#0E7490',
          }}
          title="مسودة بيضاء تفاعلية وحاسبة علمية لحل المعادلات والمسائل"
        >
          <span>✏️</span>
          <span>مسودة الرياضيات</span>
        </button>

        <button
          type="button"
          onClick={onOpenStudentBinder}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-black transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer shrink-0"
          style={{
            backgroundColor: isDark ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255, 247, 237, 0.95)',
            borderColor: isDark ? 'rgba(249, 115, 22, 0.4)' : 'rgba(254, 215, 170, 0.8)',
            color: isDark ? '#FDBA74' : '#C2410C',
          }}
          title="كشكول ملاحظاتي الشخصية وقوانيني وقوالب المذاكرة"
        >
          <span>📌</span>
          <span>كشكول ملاحظاتي</span>
        </button>
      </div>

      {/* Doctor / Professor Tracks Switcher */}
      {activeSubject?.doctors && activeSubject.doctors.length > 1 && (
        <div className="flex items-center gap-2.5 mb-6 overflow-x-auto pb-2 scrollbar-none">
          {activeSubject.doctors.map((doc) => {
            const isSelected = selectedDoctor === doc;
            const count = subjectLectures.filter((l) => l.doctor === doc).length;
            const track = getDoctorTrackDetails(activeSubject.name, doc);
            return (
              <button
                key={doc}
                type="button"
                onClick={() => onSelectDoctor(doc)}
                className={`shrink-0 min-w-fit px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold border transition-all cursor-pointer flex items-center gap-2.5 shadow-sm ${
                  isSelected ? 'scale-[1.02] shadow-md' : 'opacity-85 hover:opacity-100 hover:scale-[1.01]'
                }`}
                style={{
                  backgroundColor: isSelected ? 'var(--accent-primary)' : 'var(--bg-surface-elevated)',
                  borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)',
                  color: isSelected
                    ? isGirls && isDark
                      ? '#0D0811'
                      : !isGirls && isDark
                      ? '#0B0F14'
                      : '#ffffff'
                    : 'var(--text-secondary)',
                }}
              >
                <span className="text-base sm:text-lg shrink-0">{track.icon}</span>
                <div className="flex flex-col text-right leading-tight">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span>{track.label}</span>
                    {track.badge && (
                      <span
                        className="text-[10px] px-1.5 py-0.2 rounded font-semibold border"
                        style={{
                          backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.2)' : 'var(--bg-surface)',
                          borderColor: isSelected ? 'rgba(255, 255, 255, 0.3)' : 'var(--border-subtle)',
                          color: isSelected ? 'inherit' : 'var(--text-muted)',
                        }}
                      >
                        {track.badge}
                      </span>
                    )}
                  </div>
                  {track.subtext !== track.label && (
                    <span className="text-[11px] font-medium opacity-85 mt-0.5">{track.subtext}</span>
                  )}
                </div>
                <span
                  className="inline-flex items-center justify-center text-xs font-bold px-2 py-0.5 rounded-full shrink-0 font-mono ms-1 border"
                  style={{
                    backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.25)' : 'var(--bg-surface)',
                    borderColor: isSelected ? 'transparent' : 'var(--border-subtle)',
                    color: isSelected ? 'inherit' : 'var(--text-muted)',
                  }}
                >
                  {count > 0 ? count : track.badge === 'عملي' ? 'قريباً' : 0}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {isLoadingLectures ? (
        <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
          <div
            style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }}
            className="w-10 h-10 border-3 rounded-full animate-spin mx-auto mb-3"
          />
          <span className="text-base font-semibold">{content.lecturesSection.loading}</span>
        </div>
      ) : displayedLectures.length === 0 ? (
        <div
          className="text-center py-12 px-4 rounded-3xl border border-dashed my-4 max-w-xl mx-auto backdrop-blur-xs"
          style={{ backgroundColor: 'var(--bg-surface-elevated)', borderColor: 'var(--border-subtle)' }}
        >
          <div
            style={{
              backgroundColor: isGirls ? 'rgba(236, 72, 153, 0.12)' : 'rgba(59, 130, 246, 0.12)',
              borderColor: isGirls ? 'rgba(236, 72, 153, 0.25)' : 'rgba(59, 130, 246, 0.25)',
            }}
            className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center border text-3xl shadow-inner"
          >
            {selectedDoctor.includes('ايه') ? '💻' : <GraduationCap className="w-8 h-8 opacity-60" />}
          </div>
          <p className="text-base sm:text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {selectedDoctor.includes('ايه')
              ? 'السكاشن العملية (د/ آية) - جاري التجهيز'
              : content.lecturesSection.emptyTitle}
          </p>
          <p className="text-xs sm:text-sm mt-1.5 max-w-md mx-auto leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {selectedDoctor.includes('ايه')
              ? 'سيتم رفع وإتاحة السكاشن العملية مع كافة ملخصاتها واختباراتها الذكية هنا فور تسليمها 🌸'
              : content.lecturesSection.emptySubtitle}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-3 sm:gap-5">
          {displayedLectures.map((lec) => {
            const isReady =
              lec.is_ready !== undefined
                ? lec.is_ready
                : lec.status === 'completed' && (lec.study_resources_count || lec.assets_count) > 0;
            const resourceCount =
              lec.study_resources_count !== undefined ? lec.study_resources_count : lec.assets_count;

            return (
              <div
                key={lec.id}
                onClick={isReady ? () => router.push(`/lecture?id=${lec.id}`) : undefined}
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: isReady ? 'var(--border-subtle)' : 'var(--border-prominent)',
                }}
                className={`lecture-card p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border transition-all flex flex-col justify-between shadow-sm relative overflow-hidden ${
                  isReady
                    ? 'cursor-pointer group hover:border-cyan-500 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0'
                    : 'opacity-85 select-none'
                }`}
              >
                {isReady && (
                  <StaplePin3D
                    isGirls={isGirls}
                    className="absolute top-2 left-2 sm:top-3 sm:left-3 group-hover:scale-110 group-hover:-translate-y-0.5"
                  />
                )}
                <div className="mb-4">
                  <div className="lecture-card-header-inner gap-2.5 sm:gap-4">
                    <div
                      style={{
                        backgroundColor: isReady
                          ? isGirls
                            ? isDark
                              ? 'rgba(255, 101, 132, 0.2)'
                              : '#FFE4EC'
                            : isDark
                            ? `${activeSubjectGlow}25`
                            : 'var(--accent-primary)'
                          : 'var(--bg-surface)',
                        color: isReady
                          ? isGirls
                            ? isDark
                              ? '#FF87A2'
                              : '#C46D82'
                            : isDark
                            ? activeSubjectGlow
                            : '#ffffff'
                          : 'var(--text-muted)',
                        borderColor: isReady
                          ? isGirls
                            ? isDark
                              ? 'rgba(255, 101, 132, 0.4)'
                              : '#F2CBD5'
                            : `${activeSubjectGlow}50`
                          : 'var(--border-subtle)',
                      }}
                      className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-base sm:text-xl shrink-0 border shadow-md"
                    >
                      {isGirls ? `🌸 ${lec.lecture_num}` : lec.lecture_num}
                    </div>
                    <div className="min-w-0 flex-1 w-full space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        {lec.doctor && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs sm:text-sm font-bold border whitespace-nowrap"
                            style={{
                              backgroundColor: lec.doctor.includes('مروة')
                                ? 'rgba(236, 72, 153, 0.12)'
                                : 'rgba(59, 130, 246, 0.12)',
                              borderColor: lec.doctor.includes('مروة')
                                ? 'rgba(236, 72, 153, 0.3)'
                                : 'rgba(59, 130, 246, 0.3)',
                              color: lec.doctor.includes('مروة') ? '#ec4899' : '#3b82f6',
                            }}
                          >
                            {lec.doctor.includes('مروة') ? '👩‍🏫' : '👨‍🏫'} {lec.doctor} {isGirls ? '🌸' : ''}
                          </span>
                        )}
                        {(() => {
                          const mInfo = cohortMomentum[lec.id] || cohortMomentum[String(lec.id)];
                          const badge = mInfo?.badge || mInfo?.badge_text;
                          if (!badge) return null;
                          return (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border whitespace-nowrap animate-pulse"
                              style={{
                                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(254, 243, 199, 0.9)',
                                borderColor: isDark ? 'rgba(245, 158, 11, 0.4)' : 'rgba(245, 158, 11, 0.5)',
                                color: isDark ? '#FBBF24' : '#B45309',
                              }}
                              title={`نشاط طلاب الدفعة: ${mInfo.weekly_activity_count} تفاعل هذا الأسبوع`}
                            >
                              {badge}
                            </span>
                          );
                        })()}
                      </div>
                      <h4
                        className="font-extrabold text-sm sm:text-xl transition-colors group-hover:text-cyan-500 dark:group-hover:text-cyan-400 break-words leading-snug"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {lec.title}
                      </h4>
                      <p className="text-xs sm:text-sm font-medium mt-1 break-words leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        {isReady
                          ? resourceCount >= 5
                            ? isGirls
                              ? 'المحاضرة مكتملة بجميع المصادر 🎀✨'
                              : 'المحاضرة مكتملة بجميع مصادر المذاكرة (5/5)'
                            : isGirls
                            ? `متاح ${resourceCount} من 5 مصادر للمذاكرة 🌸`
                            : `متاح ${resourceCount} من 5 مصادر للمذاكرة`
                          : isGirls
                          ? 'قيد المعالجة السحابية بروقان ⏳'
                          : 'قيد المعالجة السحابية'}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className="pt-4 border-t flex flex-wrap items-center justify-between gap-3"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                    <span
                      className={`flex items-center gap-1 transition-opacity ${
                        lec.has_audio ? 'text-cyan-500 dark:text-cyan-400 font-bold opacity-100' : 'opacity-30'
                      }`}
                      title={lec.has_audio ? 'ريكورد صوتي متاح' : 'الريكورد قيد التجهيز'}
                    >
                      <Headphones className="w-4 h-4" />
                      <span className="hidden sm:inline">{isGirls ? 'ريكورد 🌸' : 'ريكورد'}</span>
                    </span>

                    <span
                      className={`flex items-center gap-1 transition-opacity ${
                        lec.has_video ? 'text-purple-500 dark:text-purple-400 font-bold opacity-100' : 'opacity-30'
                      }`}
                      title={lec.has_video ? 'فيديو توضيحي متاح' : 'الفيديو قيد التجهيز'}
                    >
                      <Video className="w-4 h-4" />
                      <span className="hidden sm:inline">فيديو</span>
                    </span>

                    <span
                      className={`flex items-center gap-1 transition-opacity ${
                        lec.has_quiz ? 'text-amber-500 dark:text-amber-400 font-bold opacity-100' : 'opacity-30'
                      }`}
                      title={lec.has_quiz ? 'كويز تفاعلي متاح' : 'الكويز قيد التجهيز'}
                    >
                      <HelpCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">كويز</span>
                    </span>

                    <span
                      className={`flex items-center gap-1 transition-opacity ${
                        lec.has_guide ? 'text-emerald-500 dark:text-emerald-400 font-bold opacity-100' : 'opacity-30'
                      }`}
                      title={lec.has_guide ? 'دليل دراسي متاح' : 'الدليل قيد التجهيز'}
                    >
                      <FileText className="w-4 h-4" />
                      <span className="hidden sm:inline">زتونة</span>
                    </span>

                    <span
                      className={`flex items-center gap-1 transition-opacity ${
                        lec.has_flashcards ? 'text-pink-500 dark:text-pink-400 font-bold opacity-100' : 'opacity-30'
                      }`}
                      title={lec.has_flashcards ? 'بطاقات استذكار متاحة' : 'البطاقات قيد التجهيز'}
                    >
                      <Layers className="w-4 h-4" />
                      <span className="hidden sm:inline">كروت</span>
                    </span>

                    <span
                      className="mr-1 text-xs font-bold px-2.5 py-0.5 rounded-full border shadow-2xs"
                      style={{
                        backgroundColor: isReady ? 'var(--bg-surface)' : 'var(--bg-surface-elevated)',
                        borderColor: isReady ? 'var(--border-prominent)' : 'var(--border-subtle)',
                        color: isReady ? 'var(--accent-primary)' : 'var(--text-muted)',
                      }}
                    >
                      {resourceCount > 0 ? `${resourceCount}/5 مصادر` : 'قيد الإنتاج'}
                    </span>
                  </div>

                  <Link
                    href={isReady ? `/lecture?id=${lec.id}` : '#'}
                    onClick={(e) => {
                      if (!isReady) e.preventDefault();
                    }}
                    style={{
                      backgroundColor: isReady ? 'var(--accent-primary)' : 'var(--bg-surface)',
                      color: isReady
                        ? isGirls && isDark
                          ? '#0D0811'
                          : !isGirls && isDark
                          ? '#0B0F14'
                          : '#ffffff'
                        : 'var(--text-muted)',
                      borderColor: 'var(--border-subtle)',
                    }}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 border shadow-sm ${
                      isReady ? 'hover:opacity-95 cursor-pointer shadow-cyan-500/20' : 'opacity-70 cursor-not-allowed'
                    }`}
                  >
                    {isReady ? <Play className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                    <span>
                      {isReady
                        ? isGirls
                          ? 'افتحي المحاضرة 🎀'
                          : 'افتح المحاضرة'
                        : isGirls
                        ? 'بتتجهز يا شطورة ⏳'
                        : 'قيد التجهيز'}
                    </span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
