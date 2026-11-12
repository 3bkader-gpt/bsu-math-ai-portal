'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import { StudentGamificationPill } from '@/components/gamification/StudentGamificationPill';
import NotificationBell from '@/components/NotificationBell';
import content from '@/data/content.json';
import { Search, GraduationCap, Lock, Menu } from 'lucide-react';
import MobileNavDrawer from '@/components/MobileNavDrawer';
import DeveloperCreditsModal from '@/components/DeveloperCreditsModal';
import DeveloperCreditsPill from '@/components/DeveloperCreditsPill';
import WelcomeStudentModal from '@/components/WelcomeStudentModal';
import {
  getStudentProfileLocal,
  shouldPromptOnboarding,
  PROFILE_UPDATED_EVENT,
} from '@/lib/studentProfile';
import {
  SmartResumeCard,
  CohortChallengeWidget,
} from '@/modules/gamification/ui';
import DailyMicroHookCard from '@/components/home/DailyMicroHookCard';
import { useSmartHeaderVisibility } from '@/lib/useSmartHeaderVisibility';
import {
  CANONICAL_COURSES,
  SUBJECT_THEME_STYLES,
  mergeSubjects,
  type SubjectStyleConfig,
} from '@/lib/subjectMeta';
import { usePortalCatalog } from '@/hooks/usePortalCatalog';
import SubjectsCatalogSection from '@/components/portal/SubjectsCatalogSection';
import ActiveSubjectLecturesSection from '@/components/portal/ActiveSubjectLecturesSection';
import PortalModalsHost from '@/components/portal/PortalModalsHost';

export { CANONICAL_COURSES, SUBJECT_THEME_STYLES, mergeSubjects, type SubjectStyleConfig };

export default function Home() {
  const [currentPersona, setCurrentPersona] = useState<'boys' | 'girls'>('boys');
  const [currentMode, setCurrentMode] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    try {
      const p = (localStorage.getItem('bsu_portal_persona') as 'boys' | 'girls') || 'boys';
      const m =
        (localStorage.getItem('bsu_portal_mode') as 'light' | 'dark') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      setCurrentPersona(p);
      setCurrentMode(m);
    } catch {}

    const handleThemeChange = (e: any) => {
      if (e.detail?.persona) setCurrentPersona(e.detail.persona);
      if (e.detail?.mode) setCurrentMode(e.detail.mode);
    };

    window.addEventListener('bsu_theme_changed', handleThemeChange);
    return () => window.removeEventListener('bsu_theme_changed', handleThemeChange);
  }, []);

  const isGirls = currentPersona === 'girls';
  const isDark = currentMode === 'dark';

  const {
    subjects,
    selectedSemester,
    activeSubjectId,
    setActiveSubjectId,
    selectedDoctor,
    setSelectedDoctor,
    subjectLectures,
    isLoadingLectures,
    isLoadingSubjects,
    searchQuery,
    setSearchQuery,
    cohortMomentum,
    handleSemesterChange,
    filteredSubjects,
    activeSubject,
    displayedLectures,
  } = usePortalCatalog();

  const [isMicroSessionOpen, setIsMicroSessionOpen] = useState(false);
  const [isWrapUpOpen, setIsWrapUpOpen] = useState(false);
  const [isMistakeNotebookOpen, setIsMistakeNotebookOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isDevCreditsOpen, setIsDevCreditsOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [isHurdlesModalOpen, setIsHurdlesModalOpen] = useState(false);
  const [isExamBuilderOpen, setIsExamBuilderOpen] = useState(false);
  const [isFormulaSheetOpen, setIsFormulaSheetOpen] = useState(false);
  const [isRecoveryPlannerOpen, setIsRecoveryPlannerOpen] = useState(false);
  const [isFocusAmbienceOpen, setIsFocusAmbienceOpen] = useState(false);
  const [isMathScratchpadOpen, setIsMathScratchpadOpen] = useState(false);
  const [isStudentBinderOpen, setIsStudentBinderOpen] = useState(false);
  const [studentName, setStudentName] = useState<string>('');
  const [, setTimeGreeting] = useState<{ icon: string; title: string; subtitle: string } | null>(null);
  const isHeaderVisible = useSmartHeaderVisibility({ threshold: 12, topBoundary: 25 });

  // Load student profile & prompt onboarding if first visit
  useEffect(() => {
    const profile = getStudentProfileLocal();
    if (profile.name) {
      setStudentName(profile.name);
    }
    if (shouldPromptOnboarding()) {
      const timer = setTimeout(() => {
        setIsWelcomeModalOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

  // Sync profile changes across components
  useEffect(() => {
    const handleProfileUpdate = (e: any) => {
      if (e.detail?.name !== undefined) {
        setStudentName(e.detail.name);
      }
      if (e.detail?.persona) {
        setCurrentPersona(e.detail.persona);
      }
    };
    window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdate);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdate);
  }, []);

  // Dynamic time-of-day greeting
  useEffect(() => {
    const hour = new Date().getHours();
    const namePrefix = studentName ? ` يا ${studentName}` : '';

    if (hour >= 5 && hour < 12) {
      setTimeGreeting({
        icon: '☕',
        title: isGirls ? `صباح الفل${namePrefix} ✨` : `صباح النشاط${namePrefix} 🎯`,
        subtitle: isGirls
          ? 'فنجان نسكافيهك الرايق ومحاضرة د/ سيد.. يومك لطيف وسالك بإذن الله 🌸'
          : 'فنجان قهوتك ومحاضرة د/ سيد.. يومك سالك وموفق بإذن الله 🚀',
      });
    } else if (hour >= 12 && hour < 17) {
      setTimeGreeting({
        icon: '⏱️',
        title: isGirls ? `شدي حيلك${namePrefix} 🌸` : `وقت الإنجاز${namePrefix} 💪`,
        subtitle: isGirls
          ? 'لميلك مسألتين في السريع واليوم هيعدي زي الفل ✨'
          : 'لملك مسألتين في السريع قبل ما اليوم يهرب، الزتونة معاك 🎯',
      });
    } else {
      setTimeGreeting({
        icon: '🌙',
        title: isGirls ? `سهرة مذاكرة رايقة${namePrefix} 🎀` : `سهرة الدحيحة${namePrefix} 🚀`,
        subtitle: isGirls
          ? 'سهرانة مع المعادلات والنظريات؟ متقلقيش، الزتونة هنا هتلملك الدنيا ✨'
          : 'سهران مع فيرما والمعادلات؟ متقلقش، الزتونة هنا هتلملك الحوار 💡',
      });
    }
  }, [isGirls, studentName]);

  return (
    <div
      style={{
        backgroundColor: 'transparent',
        color: 'var(--text-primary)',
      }}
      className="min-h-screen flex flex-col transition-colors duration-200"
    >
      {/* Top Academic Header (Auto-hides on scroll-down, reveals on scroll-up to maximize screen real estate) */}
      <header
        style={{
          backgroundColor: 'var(--bg-surface-translucent)',
          borderColor: 'var(--border-subtle)',
          boxShadow: isHeaderVisible ? 'var(--card-shadow)' : 'none',
        }}
        className={`sticky top-0 z-40 border-b backdrop-blur-md transition-all duration-300 ease-in-out ${
          isHeaderVisible
            ? 'translate-y-0 opacity-100'
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 min-h-[3.5rem] sm:min-h-[4rem] py-1.5 sm:py-2 flex items-center justify-between gap-1.5 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div
              style={{
                backgroundColor: isGirls
                  ? isDark
                    ? 'rgba(255, 101, 132, 0.2)'
                    : '#FFE4EC'
                  : isDark
                  ? 'rgba(45, 212, 191, 0.15)'
                  : '#E6F4F1',
                borderColor: isGirls
                  ? isDark
                    ? 'rgba(255, 101, 132, 0.4)'
                    : '#F2CBD5'
                  : isDark
                  ? 'rgba(45, 212, 191, 0.35)'
                  : '#B2DFDB',
              }}
              className="w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center shadow-xs shrink-0"
            >
              {isGirls ? (
                <span className="text-lg sm:text-xl">🎀</span>
              ) : (
                <GraduationCap className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5" style={{ color: 'var(--accent-primary)' }} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="font-extrabold text-xs xs:text-sm sm:text-base tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>
                  {isGirls ? 'منصة المنهج 🎀' : 'منصة المنهج'}
                </h1>
                <span
                  style={{
                    backgroundColor: isGirls
                      ? isDark
                        ? 'rgba(255, 101, 132, 0.15)'
                        : '#FFF0F3'
                      : isDark
                      ? 'rgba(45, 212, 191, 0.15)'
                      : '#E6F4F1',
                    borderColor: isGirls
                      ? isDark
                        ? 'rgba(255, 101, 132, 0.35)'
                        : '#F4D7DE'
                      : isDark
                      ? 'rgba(45, 212, 191, 0.35)'
                      : '#B2DFDB',
                    color: isGirls ? (isDark ? '#FFA0B5' : '#C46D82') : isDark ? '#2DD4BF' : '#184E4E',
                  }}
                  className="hidden lg:inline-block px-2.5 py-0.5 text-xs font-bold rounded-full border shrink-0"
                >
                  {isGirls ? 'نسخة البنات 🌸' : 'نسخة الشباب'}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium mt-0.5 leading-snug truncate" style={{ color: 'var(--text-muted)' }}>
                <span className="sm:hidden">تربية بني سويف • تانية رياضيات</span>
                <span className="hidden sm:inline">
                  {isGirls
                    ? 'كلية التربية • الفرقة الثانية • شعبة رياضيات 🌸'
                    : 'كلية التربية • الفرقة الثانية • شعبة رياضيات'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => setIsMistakeNotebookOpen(true)}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl border text-xs font-bold hover:scale-102 active:scale-98 transition-all shadow-xs cursor-pointer whitespace-nowrap shrink-0"
              title="كراسة الأخطاء الذكية وتكرار لايتنر"
            >
              <span>🧠</span>
              <span className="hidden sm:inline">كراسة الأخطاء</span>
            </button>
            <button
              onClick={() => setIsMicroSessionOpen(true)}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-bold hover:scale-102 active:scale-98 transition-all shadow-xs cursor-pointer whitespace-nowrap shrink-0"
              title="جلسة الـ 5 دقائق السريعة"
            >
              <span>⏱️ 5 دقائق</span>
            </button>
            <button
              onClick={() => setIsWrapUpOpen(true)}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-bold hover:scale-102 active:scale-98 transition-all shadow-xs cursor-pointer whitespace-nowrap shrink-0"
              title="أنهيت مذاكرتي لليوم"
            >
              <span>☕ استريح</span>
            </button>
            <StudentGamificationPill isGirls={isGirls} isDark={isDark} />
            <NotificationBell isGirls={isGirls} isDark={isDark} />
            {studentName && (
              <button
                type="button"
                onClick={() => setIsWelcomeModalOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-extrabold hover:scale-105 active:scale-95 transition-all shadow-2xs cursor-pointer select-none"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: isGirls ? 'rgba(244, 63, 94, 0.35)' : 'var(--border-interactive)',
                  color: isGirls ? '#F43F5E' : 'var(--accent-primary)',
                }}
                title="تعديل اسمك وهويتك في المنصة"
              >
                <span>{isGirls ? '👩‍🎓' : '👨‍🎓'}</span>
                <span className="truncate max-w-[120px]">{studentName}</span>
              </button>
            )}
            <div className="hidden md:inline-flex">
              <ThemeToggle />
            </div>
            <button
              onClick={() => setIsMobileNavOpen(true)}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              className="lg:hidden p-1.5 rounded-lg border flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0"
              title="القائمة والإعدادات"
              aria-label="القائمة والإعدادات"
            >
              <Menu className="w-4.5 h-4.5" style={{ color: 'var(--accent-primary)' }} />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Showcase Section */}
      <section
        style={{ borderColor: 'var(--border-subtle)' }}
        className="relative overflow-hidden pt-4 pb-6 sm:pt-8 sm:pb-10 px-4 sm:px-6 lg:px-8 border-b"
      >
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-3 sm:space-y-4">
          <h2
            className="fluid-h1 font-black tracking-tight leading-snug max-w-4xl mx-auto"
            style={{ color: 'var(--text-primary)' }}
          >
            {isGirls ? content.personas.girls.heroTitle : content.personas.boys.heroTitle}
          </h2>

          <p
            className="fluid-body max-w-2xl mx-auto leading-relaxed text-xs sm:text-sm font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            {isGirls ? content.personas.girls.heroSubtitle : content.personas.boys.heroSubtitle}
          </p>

          <div className="max-w-md mx-auto relative pt-1 sm:pt-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isGirls ? content.personas.girls.searchPlaceholder : content.personas.boys.searchPlaceholder}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: isGirls ? (isDark ? 'rgba(255, 101, 132, 0.35)' : '#F2CBD5') : 'var(--border-prominent)',
                color: 'var(--text-primary)',
              }}
              className="w-full pr-10 pl-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-all placeholder:text-slate-400"
            />
            <Search className="w-4 h-4 absolute right-3.5 top-[15px] sm:top-[18px] pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-8" suppressHydrationWarning>
        <SmartResumeCard />
        <CohortChallengeWidget isGirls={isGirls} />
        <DailyMicroHookCard isGirls={isGirls} />

        <SubjectsCatalogSection
          subjects={subjects}
          filteredSubjects={filteredSubjects}
          selectedSemester={selectedSemester}
          onSemesterChange={handleSemesterChange}
          activeSubjectId={activeSubjectId}
          onSelectSubject={setActiveSubjectId}
          isLoadingSubjects={isLoadingSubjects}
          searchQuery={searchQuery}
          isGirls={isGirls}
          isDark={isDark}
        />

        {activeSubject && (
          <ActiveSubjectLecturesSection
            activeSubject={activeSubject}
            subjectLectures={subjectLectures}
            displayedLectures={displayedLectures}
            selectedDoctor={selectedDoctor}
            onSelectDoctor={setSelectedDoctor}
            isLoadingLectures={isLoadingLectures}
            cohortMomentum={cohortMomentum}
            isGirls={isGirls}
            isDark={isDark}
            onOpenExamBuilder={() => setIsExamBuilderOpen(true)}
            onOpenFormulaSheet={() => setIsFormulaSheetOpen(true)}
            onOpenHurdles={() => setIsHurdlesModalOpen(true)}
            onOpenRecoveryPlanner={() => setIsRecoveryPlannerOpen(true)}
            onOpenFocusAmbience={() => setIsFocusAmbienceOpen(true)}
            onOpenMathScratchpad={() => setIsMathScratchpadOpen(true)}
            onOpenStudentBinder={() => setIsStudentBinderOpen(true)}
          />
        )}
      </main>

      {/* Academic Footer with subtle Admin Link */}
      <footer
        style={{
          borderColor: 'var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
        }}
        className="mt-16 border-t py-8 px-4 text-center transition-colors"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          <div>
            <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{content.footer.copyright}</p>
            <p className="mt-0.5">{content.footer.description}</p>
          </div>

          <div className="flex items-center justify-center my-2 sm:my-0">
            <DeveloperCreditsPill
              isGirls={isGirls}
              onClick={() => setIsDevCreditsOpen(true)}
            />
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all opacity-60 hover:opacity-100 hover:border-blue-400"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
            >
              <Lock className="w-3 h-3" />
              <span>{content.footer.adminPortalLink}</span>
            </Link>
          </div>
        </div>
      </footer>

      <MobileNavDrawer
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        isGirls={isGirls}
        isDark={isDark}
        onOpenMistakeNotebook={() => setIsMistakeNotebookOpen(true)}
        onOpenMicroSession={() => setIsMicroSessionOpen(true)}
        onOpenWrapUp={() => setIsWrapUpOpen(true)}
        onOpenDevCredits={() => setIsDevCreditsOpen(true)}
        onOpenEditProfile={() => setIsWelcomeModalOpen(true)}
        onOpenHurdles={() => setIsHurdlesModalOpen(true)}
        onOpenExamBuilder={() => setIsExamBuilderOpen(true)}
        onOpenFormulaSheet={() => setIsFormulaSheetOpen(true)}
        onOpenRecoveryPlanner={() => setIsRecoveryPlannerOpen(true)}
        onOpenFocusAmbience={() => setIsFocusAmbienceOpen(true)}
        onOpenMathScratchpad={() => setIsMathScratchpadOpen(true)}
        onOpenStudentBinder={() => setIsStudentBinderOpen(true)}
      />

      <DeveloperCreditsModal
        isOpen={isDevCreditsOpen}
        onClose={() => setIsDevCreditsOpen(false)}
        isGirls={isGirls}
      />

      <WelcomeStudentModal
        isOpen={isWelcomeModalOpen}
        onClose={() => setIsWelcomeModalOpen(false)}
        isInitialOnboarding={!studentName}
      />

      <PortalModalsHost
        activeSubject={activeSubject}
        displayedLectures={displayedLectures}
        isDark={isDark}
        isGirls={isGirls}
        isMicroSessionOpen={isMicroSessionOpen}
        setIsMicroSessionOpen={setIsMicroSessionOpen}
        isWrapUpOpen={isWrapUpOpen}
        setIsWrapUpOpen={setIsWrapUpOpen}
        isMistakeNotebookOpen={isMistakeNotebookOpen}
        setIsMistakeNotebookOpen={setIsMistakeNotebookOpen}
        isHurdlesModalOpen={isHurdlesModalOpen}
        setIsHurdlesModalOpen={setIsHurdlesModalOpen}
        isExamBuilderOpen={isExamBuilderOpen}
        setIsExamBuilderOpen={setIsExamBuilderOpen}
        isFormulaSheetOpen={isFormulaSheetOpen}
        setIsFormulaSheetOpen={setIsFormulaSheetOpen}
        isRecoveryPlannerOpen={isRecoveryPlannerOpen}
        setIsRecoveryPlannerOpen={setIsRecoveryPlannerOpen}
        isFocusAmbienceOpen={isFocusAmbienceOpen}
        setIsFocusAmbienceOpen={setIsFocusAmbienceOpen}
        isMathScratchpadOpen={isMathScratchpadOpen}
        setIsMathScratchpadOpen={setIsMathScratchpadOpen}
        isStudentBinderOpen={isStudentBinderOpen}
        setIsStudentBinderOpen={setIsStudentBinderOpen}
      />
    </div>
  );
}
