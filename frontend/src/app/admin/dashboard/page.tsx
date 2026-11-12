'use client';

import Link from 'next/link';
import {
  Sparkles,
  BookOpen,
  Headphones,
  CheckCircle2,
  LogOut,
  ExternalLink,
  Cloud,
  GraduationCap,
  Activity,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import AdminDiagnosticsModal from '@/components/admin/AdminDiagnosticsModal';
import AdminTrackedLectureCard from '@/components/admin/AdminTrackedLectureCard';
import AdminSmartUploaderForm from '@/components/admin/AdminSmartUploaderForm';
import AdminSubjectLecturesExplorer from '@/components/admin/AdminSubjectLecturesExplorer';
import { useLectureUploadPipeline } from '@/hooks/useLectureUploadPipeline';
import { useAdminDiagnostics } from '@/hooks/useAdminDiagnostics';

export default function AdminDashboardPage() {
  const {
    token,
    subjects,
    selectedSubjectId,
    setSelectedSubjectId,
    selectedSubject,
    selectedDoctor,
    setSelectedDoctor,
    subjectLectures,
    lectureNum,
    setLectureNum,
    lectureTitle,
    setLectureTitle,
    selectedFiles,
    isUploading,
    uploadError,
    setActiveTrackingId,
    trackedLecture,
    fileInputRef,
    handleLogout,
    handleFileChange,
    handleDrop,
    handleRemoveFile,
    handleClearAllFiles,
    handleUploadSubmit,
  } = useLectureUploadPipeline();

  const {
    showDiagnosticsModal,
    setShowDiagnosticsModal,
    diagnosticsData,
    isLoadingDiagnostics,
    diagnosticsTab,
    setDiagnosticsTab,
    logsData,
    logsStats,
    isLoadingLogs,
    logFilterLevel,
    setLogFilterLevel,
    logSearch,
    setLogSearch,
    matrixFilter,
    setMatrixFilter,
    matrixSearch,
    setMatrixSearch,
    copiedReport,
    cohortAnalytics,
    isLoadingCohort,
    fetchDiagnostics,
    fetchLogs,
    fetchCohortAnalytics,
    handleClearLogs,
    handleCopyReport,
  } = useAdminDiagnostics(token);

  return (
    <div
      className="min-h-screen flex flex-col transition-colors selection:bg-teal-500/25 selection:text-teal-200"
      style={{
        backgroundColor: 'var(--bg-page)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Top Glass Navigation Bar */}
      <header
        className="sticky top-0 z-50 border-b backdrop-blur-xl transition-colors"
        style={{
          backgroundColor: 'var(--bg-surface-translucent)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 min-h-[3.75rem] sm:min-h-[4.5rem] py-1.5 sm:py-2 flex items-center justify-between gap-1.5 sm:gap-4">
          {/* Logo & Platform Info */}
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
            <div
              className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shadow-lg shrink-0"
              style={{ backgroundColor: 'var(--accent-primary)', color: '#ffffff' }}
            >
              <Sparkles className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h1
                className="font-black text-xs xs:text-sm sm:text-xl lg:text-2xl tracking-tight leading-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                <span className="hidden sm:inline">لوحة الإدارة والرفع الذكي</span>
                <span className="sm:hidden">لوحة الإدارة</span>
              </h1>
              <p
                className="text-xs sm:text-sm hidden md:block font-bold mt-0.5 truncate"
                style={{ color: 'var(--text-secondary)' }}
              >
                قسم الرياضيات | جامعة بني سويف
              </p>
            </div>
          </div>

          {/* Top Action Buttons & Theme Switcher */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            <ThemeToggle />

            <Link
              href="/"
              target="_blank"
              title="بوابة الطلاب"
              className="inline-flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-black border transition-all sm:hover:scale-[1.02] shadow-sm shrink-0"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-500 shrink-0" />
              <span className="hidden lg:inline">بوابة الطلاب</span>
            </Link>

            <button
              onClick={() => {
                setDiagnosticsTab('cohort');
                setShowDiagnosticsModal(true);
                fetchCohortAnalytics();
              }}
              title="تحليلات ونبض نشاط الدفعة المباشر"
              className="inline-flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-black border transition-all sm:hover:scale-[1.02] shadow-sm shrink-0 cursor-pointer"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                borderColor: 'rgba(16, 185, 129, 0.4)',
                color: '#10b981',
              }}
            >
              <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-emerald-500" />
              <span className="hidden sm:inline">نبض الدفعة 🎓</span>
            </button>

            <button
              onClick={() => {
                setShowDiagnosticsModal(true);
                fetchDiagnostics();
              }}
              title="سجلات وفحص النظام والمصادر"
              className="inline-flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-black border transition-all sm:hover:scale-[1.02] shadow-sm shrink-0 cursor-pointer"
              style={{
                backgroundColor: 'var(--accent-primary)',
                borderColor: 'var(--accent-primary)',
                color: '#ffffff',
              }}
            >
              <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">سجلات وفحص النظام 📊</span>
            </button>

            <button
              onClick={handleLogout}
              title="تسجيل الخروج"
              className="p-1.5 sm:p-2.5 rounded-xl border transition-all hover:text-rose-500 hover:border-rose-400 cursor-pointer shadow-sm shrink-0"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* KPI Quick Stats Row */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-4 sm:gap-6">
          <div
            className="p-5 sm:p-6 rounded-3xl border transition-all relative overflow-hidden group shadow-sm hover:shadow-md"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-sm sm:text-base font-black uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}
              >
                المواد المسجلة
              </span>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-xs"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  color: 'var(--accent-primary)',
                }}
              >
                <BookOpen className="w-5 h-5" />
              </div>
            </div>
            <div
              className="text-3xl sm:text-4xl font-black tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {subjects.length}
            </div>
            <div
              className="text-xs sm:text-sm mt-2 flex items-center gap-1.5 font-black"
              style={{ color: 'var(--accent-primary)' }}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>جاهزة ومربوطة بالبرومبتس</span>
            </div>
          </div>

          <div
            className="p-5 sm:p-6 rounded-3xl border transition-all relative overflow-hidden group shadow-sm hover:shadow-md"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-sm sm:text-base font-black uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}
              >
                المحاضرات الجاهزة
              </span>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-cyan-500 shadow-xs"
                style={{ backgroundColor: 'var(--bg-surface-elevated)' }}
              >
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>
            <div
              className="text-3xl sm:text-4xl font-black tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {subjects.reduce((sum, s) => sum + s.lecture_count, 0)}
            </div>
            <div className="text-xs sm:text-sm text-cyan-600 dark:text-cyan-300 mt-2 flex items-center gap-1.5 font-black">
              <GraduationCap className="w-4 h-4 shrink-0" />
              <span>باقة متكاملة متاحة للطلاب</span>
            </div>
          </div>

          <div
            className="p-5 sm:p-6 rounded-3xl border transition-all relative overflow-hidden group shadow-sm hover:shadow-md"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-sm sm:text-base font-black uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}
              >
                سعة التخزين
              </span>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-sky-500 shadow-xs"
                style={{ backgroundColor: 'var(--bg-surface-elevated)' }}
              >
                <Cloud className="w-5 h-5" />
              </div>
            </div>
            <div
              className="text-3xl sm:text-4xl font-black tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              ∞ لا نهائي
            </div>
            <div className="text-xs sm:text-sm text-sky-600 dark:text-sky-300 mt-2 flex items-center gap-1.5 font-black">
              <Cloud className="w-4 h-4 shrink-0" />
              <span>سحابة تليجرام CDN (حتى 2GB)</span>
            </div>
          </div>

          <div
            className="p-5 sm:p-6 rounded-3xl border transition-all relative overflow-hidden group shadow-sm hover:shadow-md"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-sm sm:text-base font-black uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}
              >
                محرك الذكاء
              </span>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-emerald-500 shadow-xs"
                style={{ backgroundColor: 'var(--bg-surface-elevated)' }}
              >
                <Headphones className="w-5 h-5" />
              </div>
            </div>
            <div
              className="text-2xl sm:text-3xl font-black tracking-tight truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              المصرية 🇪🇬
            </div>
            <div className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-300 mt-2 flex items-center gap-1.5 font-black">
              <Headphones className="w-4 h-4 shrink-0" />
              <span>بودكاست وفيديو وكويز</span>
            </div>
          </div>
        </div>

        {/* Live Active Job Tracking Card */}
        <AdminTrackedLectureCard trackedLecture={trackedLecture} />

        {/* Two-Column Studio */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start w-full max-w-full min-w-0">
          <AdminSmartUploaderForm
            subjects={subjects}
            selectedSubjectId={selectedSubjectId}
            setSelectedSubjectId={setSelectedSubjectId}
            selectedSubject={selectedSubject}
            selectedDoctor={selectedDoctor}
            setSelectedDoctor={setSelectedDoctor}
            subjectLectures={subjectLectures}
            lectureNum={lectureNum}
            setLectureNum={setLectureNum}
            lectureTitle={lectureTitle}
            setLectureTitle={setLectureTitle}
            selectedFiles={selectedFiles}
            isUploading={isUploading}
            uploadError={uploadError}
            fileInputRef={fileInputRef}
            handleFileChange={handleFileChange}
            handleDrop={handleDrop}
            handleRemoveFile={handleRemoveFile}
            handleClearAllFiles={handleClearAllFiles}
            handleUploadSubmit={handleUploadSubmit}
          />

          <AdminSubjectLecturesExplorer
            selectedSubject={selectedSubject}
            subjectLectures={subjectLectures}
            onSelectTrackingLecture={setActiveTrackingId}
          />
        </div>
      </main>

      <AdminDiagnosticsModal
        showDiagnosticsModal={showDiagnosticsModal}
        setShowDiagnosticsModal={setShowDiagnosticsModal}
        diagnosticsData={diagnosticsData}
        isLoadingDiagnostics={isLoadingDiagnostics}
        diagnosticsTab={diagnosticsTab}
        setDiagnosticsTab={setDiagnosticsTab}
        logsData={logsData}
        logsStats={logsStats}
        isLoadingLogs={isLoadingLogs}
        logFilterLevel={logFilterLevel}
        setLogFilterLevel={setLogFilterLevel}
        logSearch={logSearch}
        setLogSearch={setLogSearch}
        matrixFilter={matrixFilter}
        setMatrixFilter={setMatrixFilter}
        matrixSearch={matrixSearch}
        setMatrixSearch={setMatrixSearch}
        copiedReport={copiedReport}
        cohortAnalytics={cohortAnalytics}
        isLoadingCohort={isLoadingCohort}
        fetchDiagnostics={fetchDiagnostics}
        fetchLogs={fetchLogs}
        fetchCohortAnalytics={fetchCohortAnalytics}
        handleClearLogs={handleClearLogs}
        handleCopyReport={handleCopyReport}
      />
    </div>
  );
}
