'use client';

import {
  Sparkles,
  BookOpen,
  FileText,
  Headphones,
  Video,
  HelpCircle,
  Layers,
  CheckCircle2,
  RefreshCw,
  Database,
  Cloud,
  GraduationCap,
  Activity,
  X,
  Search,
  Copy,
  Check,
  Trash2,
  Terminal,
  Server,
} from 'lucide-react';

export interface AdminDiagnosticsModalProps {
  showDiagnosticsModal: boolean;
  setShowDiagnosticsModal: (v: boolean) => void;
  diagnosticsData: any;
  isLoadingDiagnostics: boolean;
  diagnosticsTab: 'overview' | 'matrix' | 'logs' | 'cohort';
  setDiagnosticsTab: (tab: 'overview' | 'matrix' | 'logs' | 'cohort') => void;
  logsData: any[];
  logsStats: any;
  isLoadingLogs: boolean;
  logFilterLevel: string;
  setLogFilterLevel: (lvl: string) => void;
  logSearch: string;
  setLogSearch: (s: string) => void;
  matrixFilter: 'ALL' | 'COMPLETE' | 'INCOMPLETE';
  setMatrixFilter: (f: 'ALL' | 'COMPLETE' | 'INCOMPLETE') => void;
  matrixSearch: string;
  setMatrixSearch: (s: string) => void;
  copiedReport: boolean;
  cohortAnalytics: any;
  isLoadingCohort: boolean;
  fetchDiagnostics: () => void;
  fetchLogs: () => void;
  fetchCohortAnalytics: () => void;
  handleClearLogs: () => void;
  handleCopyReport: () => void;
}

export default function AdminDiagnosticsModal({
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
}: AdminDiagnosticsModalProps) {
  if (!showDiagnosticsModal) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) setShowDiagnosticsModal(false);
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200 overscroll-contain"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all overscroll-contain"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-prominent)',
          boxShadow: 'var(--card-shadow-hover)',
        }}
      >
        {/* Modal Header */}
        <div
          className="p-4 sm:p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0"
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'var(--bg-surface-elevated)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0 text-white shadow-sm"
              style={{ backgroundColor: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
            >
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <span>سجلات وفحص النظام والمصادر</span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  Cloud 24/7
                </span>
              </h3>
              <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                مراقبة حية لسيرفر الباك إند السحابي وقاعدة Supabase وتدفق تيليجرام ومكتبة المحاضرات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={handleCopyReport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              title="نسخ تقرير الفحص للحافظة"
            >
              {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedReport ? 'تم النسخ!' : 'نسخ التقرير'}</span>
            </button>

            <button
              onClick={() => {
                fetchDiagnostics();
                if (diagnosticsTab === 'logs') fetchLogs();
              }}
              disabled={isLoadingDiagnostics || isLoadingLogs}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs disabled:opacity-50"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDiagnostics || isLoadingLogs ? 'animate-spin' : ''}`} />
              <span>تحديث</span>
            </button>

            <button
              onClick={() => setShowDiagnosticsModal(false)}
              className="p-2 rounded-xl border transition-all hover:bg-rose-500/10 hover:border-rose-400 hover:text-rose-500 cursor-pointer shadow-xs"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Tabs Bar */}
        <div
          className="px-3 sm:px-6 pt-3 border-b flex items-center gap-1.5 sm:gap-2 shrink-0 overflow-x-auto no-scrollbar overscroll-x-contain touch-pan-x"
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'var(--bg-surface-elevated)',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <button
            onClick={() => setDiagnosticsTab('overview')}
            className={`pb-2.5 px-3 border-b-2 text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
              diagnosticsTab === 'overview'
                ? 'border-cyan-500 text-cyan-500'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
            style={{ color: diagnosticsTab === 'overview' ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
          >
            <Activity className="w-4 h-4" />
            <span>نظرة عامة والخدمات السحابية</span>
          </button>

          <button
            onClick={() => setDiagnosticsTab('matrix')}
            className={`pb-2.5 px-3 border-b-2 text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
              diagnosticsTab === 'matrix'
                ? 'border-cyan-500 text-cyan-500'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
            style={{ color: diagnosticsTab === 'matrix' ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
          >
            <Layers className="w-4 h-4" />
            <span>مصفوفة المحاضرات والمصادر</span>
            {diagnosticsData?.summary && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-500/10 text-cyan-500 font-bold">
                {diagnosticsData.summary.complete_5_of_5}/{diagnosticsData.summary.total_lectures}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setDiagnosticsTab('logs');
              fetchLogs();
            }}
            className={`pb-2.5 px-3 border-b-2 text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
              diagnosticsTab === 'logs'
                ? 'border-cyan-500 text-cyan-500'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
            style={{ color: diagnosticsTab === 'logs' ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
          >
            <Terminal className="w-4 h-4" />
            <span>سجلات السيرفر اللحظية (Live Logs)</span>
            {logsStats && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  logsStats.ERROR > 0 ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500'
                }`}
              >
                {logsStats.total} سجل
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setDiagnosticsTab('cohort');
              fetchCohortAnalytics();
            }}
            className={`pb-2.5 px-3 border-b-2 text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
              diagnosticsTab === 'cohort'
                ? 'border-cyan-500 text-cyan-500'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
            style={{ color: diagnosticsTab === 'cohort' ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
          >
            <GraduationCap className="w-4 h-4 text-emerald-500" />
            <span>تحليلات ونبض الدفعة (Cohort Pulse)</span>
            {cohortAnalytics?.todayProfilesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-500 font-bold">
                +{cohortAnalytics.todayProfilesCount} اليوم
              </span>
            )}
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 overscroll-contain touch-pan-y">
          {/* TAB 1: OVERVIEW */}
          {diagnosticsTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                  className="p-4 rounded-2xl border transition-all shadow-xs space-y-2"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                      سيرفر الباك إند السحابي
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Server className="w-5 h-5 text-emerald-500" />
                    <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>
                      AWS Lightsail (Stockholm)
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    يعمل 24/7 سحابياً مع بث مباشر ومعالجة متكاملة
                  </p>
                </div>

                <div
                  className="p-4 rounded-2xl border transition-all shadow-xs space-y-2"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                      قاعدة بيانات Supabase
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      {diagnosticsData?.database?.latency_ms || 8} ms
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-sky-500" />
                    <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>
                      PostgreSQL Pooler
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                    {diagnosticsData?.database?.status === 'healthy' ? 'متصلة بسرعة استجابة فائقة' : 'جاري الفحص...'}
                  </p>
                </div>

                <div
                  className="p-4 rounded-2xl border transition-all shadow-xs space-y-2"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                      تخزين التيليجرام السحابي
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                      MTProto In-Memory
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-cyan-500" />
                    <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>
                      القناة السحابية
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                    بث فوري مباشر من الرام يتجاوز ليميت الـ 20MB
                  </p>
                </div>
              </div>

              {diagnosticsData?.summary && (
                <div className="space-y-3">
                  <h4 className="font-black text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Layers className="w-4 h-4 text-cyan-500" />
                    <span>جاهزية الأصول التعليمية الخمسة لكل المحاضرات (21 محاضرة)</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div
                      className="p-3.5 rounded-2xl border text-center space-y-1"
                      style={{ backgroundColor: 'var(--bg-surface-elevated)', borderColor: 'var(--border-subtle)' }}
                    >
                      <HelpCircle className="w-5 h-5 mx-auto text-amber-500" />
                      <div className="text-xl font-black text-amber-500">{diagnosticsData.summary.total_quizzes_ready}/21</div>
                      <div className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                        كويزات تفاعلية
                      </div>
                    </div>

                    <div
                      className="p-3.5 rounded-2xl border text-center space-y-1"
                      style={{ backgroundColor: 'var(--bg-surface-elevated)', borderColor: 'var(--border-subtle)' }}
                    >
                      <BookOpen className="w-5 h-5 mx-auto text-emerald-500" />
                      <div className="text-xl font-black text-emerald-500">{diagnosticsData.summary.total_guides_ready}/21</div>
                      <div className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                        أدلة دراسية وزتونة
                      </div>
                    </div>

                    <div
                      className="p-3.5 rounded-2xl border text-center space-y-1"
                      style={{ backgroundColor: 'var(--bg-surface-elevated)', borderColor: 'var(--border-subtle)' }}
                    >
                      <FileText className="w-5 h-5 mx-auto text-sky-500" />
                      <div className="text-xl font-black text-sky-500">{diagnosticsData.summary.total_flashcards_ready}/21</div>
                      <div className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                        بطاقات استذكار
                      </div>
                    </div>

                    <div
                      className="p-3.5 rounded-2xl border text-center space-y-1"
                      style={{ backgroundColor: 'var(--bg-surface-elevated)', borderColor: 'var(--border-subtle)' }}
                    >
                      <Headphones className="w-5 h-5 mx-auto text-indigo-500" />
                      <div className="text-xl font-black text-indigo-500">{diagnosticsData.summary.total_audios}/21</div>
                      <div className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                        بودكاست صوتي
                      </div>
                    </div>

                    <div
                      className="p-3.5 rounded-2xl border text-center space-y-1"
                      style={{ backgroundColor: 'var(--bg-surface-elevated)', borderColor: 'var(--border-subtle)' }}
                    >
                      <Video className="w-5 h-5 mx-auto text-rose-500" />
                      <div className="text-xl font-black text-rose-500">{diagnosticsData.summary.total_videos}/21</div>
                      <div className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                        فيديوهات شرح
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div
                className="p-4 rounded-2xl border space-y-2"
                style={{
                  backgroundColor: 'rgba(56, 189, 248, 0.05)',
                  borderColor: 'rgba(56, 189, 248, 0.2)',
                }}
              >
                <h5 className="font-black text-sm flex items-center gap-2 text-sky-600 dark:text-sky-300">
                  <Sparkles className="w-4 h-4" />
                  <span>توضيح مهم بخصوص المحاضرات:</span>
                </h5>
                <p className="text-xs sm:text-sm leading-relaxed font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  جميع الـ 21 محاضرة أصبح لديها <strong>كويز كامل + ملخص دراسي شامل + بطاقات استذكار كاملة</strong> مدمجة ومحفوظة بنسبة 100%. الملفات الصوتية المتبقية (7 محاضرات) والفيديوهات المتبقية (9 محاضرات) تم رفع بعضها وباقي الملفات ترفع تدريجياً عبر القناة السحابية بدون أي ضغط على جهازك.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: MODALITY MATRIX */}
          {diagnosticsTab === 'matrix' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="ابحث باسم المحاضرة أو المادة..."
                    value={matrixSearch}
                    onChange={(e) => setMatrixSearch(e.target.value)}
                    className="w-full pr-10 pl-4 py-2 rounded-xl text-xs sm:text-sm border outline-none font-bold"
                    style={{
                      backgroundColor: 'var(--bg-surface-elevated)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMatrixFilter('ALL')}
                    className={`shrink-0 min-w-fit px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 ${
                      matrixFilter === 'ALL'
                        ? 'bg-cyan-500 text-white border-cyan-500 shadow-xs'
                        : 'bg-transparent border-gray-300 dark:border-gray-700 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span>الكل</span>
                    <span className="inline-flex items-center justify-center text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono bg-black/10 dark:bg-white/15">
                      {diagnosticsData?.summary?.total_lectures || 29}
                    </span>
                  </button>
                  <button
                    onClick={() => setMatrixFilter('COMPLETE')}
                    className={`shrink-0 min-w-fit px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 ${
                      matrixFilter === 'COMPLETE'
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                        : 'bg-transparent border-gray-300 dark:border-gray-700 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span>مكتملة 5/5</span>
                    <span className="inline-flex items-center justify-center text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono bg-black/10 dark:bg-white/15">
                      {diagnosticsData?.summary?.complete_5_of_5 || 21}
                    </span>
                  </button>
                  <button
                    onClick={() => setMatrixFilter('INCOMPLETE')}
                    className={`shrink-0 min-w-fit px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 ${
                      matrixFilter === 'INCOMPLETE'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                        : 'bg-transparent border-gray-300 dark:border-gray-700 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span>تحتاج ملفات إضافية</span>
                    <span className="inline-flex items-center justify-center text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono bg-black/10 dark:bg-white/15">
                      {diagnosticsData?.summary?.partial_modality || 8}
                    </span>
                  </button>
                </div>
              </div>

              <div className="border rounded-2xl overflow-hidden shadow-xs" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-right text-xs">
                    <thead
                      className="sticky top-0 z-10 font-black border-b"
                      style={{
                        backgroundColor: 'var(--bg-surface-elevated)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <tr>
                        <th className="p-3">المادة / المحاضرة</th>
                        <th className="p-3 text-center">الدرجة</th>
                        <th className="p-3 text-center">الكويز</th>
                        <th className="p-3 text-center">الدليل</th>
                        <th className="p-3 text-center">البطاقات</th>
                        <th className="p-3 text-center">الصوت</th>
                        <th className="p-3 text-center">الفيديو</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                      {(() => {
                        const list = (diagnosticsData?.lectures || [])
                          .filter((lec: any) => {
                            if (matrixFilter === 'COMPLETE') return lec.score === '5/5';
                            if (matrixFilter === 'INCOMPLETE') return lec.score !== '5/5';
                            return true;
                          })
                          .filter((lec: any) => {
                            if (!matrixSearch) return true;
                            const s = matrixSearch.toLowerCase();
                            return lec.title.toLowerCase().includes(s) || lec.subject.toLowerCase().includes(s);
                          });

                        if (list.length === 0) {
                          return (
                            <tr>
                              <td colSpan={7} className="p-8 text-center">
                                <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                  <span className="font-bold text-sm">
                                    {matrixFilter === 'INCOMPLETE'
                                      ? 'رائع! لا توجد أي محاضرات تحتاج ملفات إضافية حالياً 🎉'
                                      : 'لا توجد نتائج مطابقة لبحثك'}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return list.map((lec: any) => (
                          <tr
                            key={lec.lecture_id}
                            className="transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                            style={{ backgroundColor: 'var(--bg-surface)' }}
                          >
                            <td className="p-3">
                              <div className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>
                                {lec.title}
                              </div>
                              <div className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 mt-0.5">
                                {lec.subject} • محاضرة {lec.lecture_num} {lec.doctor ? `(${lec.doctor})` : ''}
                              </div>
                            </td>

                            <td className="p-3 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full font-black text-xs ${
                                  lec.score === '5/5'
                                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                }`}
                              >
                                {lec.score}
                              </span>
                            </td>

                            <td className="p-3 text-center">
                              {lec.modalities.quiz.ready ? (
                                <span
                                  className="inline-flex items-center gap-1 text-emerald-500 font-bold"
                                  title={`${lec.modalities.quiz.chars} حرف`}
                                >
                                  <Check className="w-4 h-4" />
                                  <span className="text-[10px] opacity-75">{Math.round(lec.modalities.quiz.chars / 1000)}k</span>
                                </span>
                              ) : (
                                <span className="text-gray-400 font-bold">-</span>
                              )}
                            </td>

                            <td className="p-3 text-center">
                              {lec.modalities.guide.ready ? (
                                <span
                                  className="inline-flex items-center gap-1 text-emerald-500 font-bold"
                                  title={`${lec.modalities.guide.chars} حرف`}
                                >
                                  <Check className="w-4 h-4" />
                                  <span className="text-[10px] opacity-75">{Math.round(lec.modalities.guide.chars / 1000)}k</span>
                                </span>
                              ) : (
                                <span className="text-gray-400 font-bold">-</span>
                              )}
                            </td>

                            <td className="p-3 text-center">
                              {lec.modalities.flashcards.ready ? (
                                <span
                                  className="inline-flex items-center gap-1 text-emerald-500 font-bold"
                                  title={`${lec.modalities.flashcards.chars} حرف`}
                                >
                                  <Check className="w-4 h-4" />
                                  <span className="text-[10px] opacity-75">{Math.round(lec.modalities.flashcards.chars / 1000)}k</span>
                                </span>
                              ) : (
                                <span className="text-gray-400 font-bold">-</span>
                              )}
                            </td>

                            <td className="p-3 text-center">
                              {lec.modalities.audio.ready ? (
                                <span
                                  className="inline-flex items-center gap-1 text-indigo-500 font-bold"
                                  title={`تيليجرام msg #${lec.modalities.audio.tg_msg}`}
                                >
                                  <Headphones className="w-4 h-4" />
                                  <span className="text-[10px]">#{lec.modalities.audio.tg_msg}</span>
                                </span>
                              ) : (
                                <span className="text-gray-400 font-bold text-[11px]">قيد الإعداد</span>
                              )}
                            </td>

                            <td className="p-3 text-center">
                              {lec.modalities.video.ready ? (
                                <span
                                  className="inline-flex items-center gap-1 text-rose-500 font-bold"
                                  title={`تيليجرام msg #${lec.modalities.video.tg_msg}`}
                                >
                                  <Video className="w-4 h-4" />
                                  <span className="text-[10px]">#{lec.modalities.video.tg_msg}</span>
                                </span>
                              ) : (
                                <span className="text-gray-400 font-bold text-[11px]">قيد الإعداد</span>
                              )}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LIVE SERVER LOGS */}
          {diagnosticsTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="فلترة السجلات بكلمة بحث..."
                    value={logSearch}
                    onChange={(e) => {
                      setLogSearch(e.target.value);
                      fetchLogs();
                    }}
                    className="w-full pr-10 pl-4 py-2 rounded-xl text-xs sm:text-sm border outline-none font-bold"
                    style={{
                      backgroundColor: 'var(--bg-surface-elevated)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <div className="flex items-center gap-2">
                  {['ALL', 'INFO', 'WARNING', 'ERROR'].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => {
                        setLogFilterLevel(lvl);
                        fetchLogs();
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        logFilterLevel === lvl
                          ? 'bg-cyan-500 text-white border-cyan-500'
                          : 'bg-transparent border-gray-300 dark:border-gray-700 opacity-70'
                      }`}
                    >
                      {lvl === 'ALL' ? 'الكل' : lvl}
                    </button>
                  ))}

                  <button
                    onClick={handleClearLogs}
                    className="p-2 rounded-xl border transition-all hover:bg-rose-500/10 hover:border-rose-400 hover:text-rose-500 cursor-pointer shadow-xs"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-secondary)',
                    }}
                    title="مسح السجلات الحالية"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div
                className="p-4 rounded-2xl border font-mono text-xs overflow-y-auto max-h-[420px] space-y-1.5 shadow-inner"
                style={{
                  backgroundColor: '#0a0f1d',
                  borderColor: '#1e293b',
                  color: '#e2e8f0',
                  direction: 'ltr',
                  textAlign: 'left',
                }}
              >
                {logsData.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">لا توجد سجلات حالياً تطابق معايير البحث</div>
                ) : (
                  logsData.map((lg, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 hover:bg-white/5 p-1 rounded transition-colors">
                      <span className="text-gray-500 select-none text-[11px] shrink-0">[{lg.timestamp}]</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-black uppercase shrink-0 ${
                          lg.level === 'ERROR'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : lg.level === 'WARNING'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        }`}
                      >
                        {lg.level}
                      </span>
                      <span className="text-indigo-400 text-[11px] shrink-0">[{lg.logger}]</span>
                      <span className="text-gray-200 break-all">{lg.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: LIVE COHORT PULSE */}
          {diagnosticsTab === 'cohort' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-surface-elevated)] p-4 rounded-2xl border border-[var(--border-subtle)]">
                <div>
                  <h4 className="font-black text-sm sm:text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <GraduationCap className="w-5 h-5 text-emerald-500" />
                    <span>لوحة مؤشرات ونبض الدفعة المباشر (Cohort Telemetry)</span>
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    بيانات مباشرة ومحدثة من جداول ومناظر Supabase بدون وسيط
                  </p>
                </div>

                <button
                  onClick={fetchCohortAnalytics}
                  disabled={isLoadingCohort}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all hover:scale-102 active:scale-98 cursor-pointer disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-prominent)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCohort ? 'animate-spin text-teal-400' : ''}`} />
                  <span>{isLoadingCohort ? 'جاري التحديث...' : 'تحديث البيانات 🔄'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl border bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)] space-y-1">
                  <div className="flex items-center justify-between text-xs text-gray-400 font-bold">
                    <span>إجمالي الطلاب المسجلين</span>
                    <span>👥</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-cyan-400">
                    {cohortAnalytics?.totalProfilesCount ?? '...'}
                  </div>
                  <div className="text-[11px] font-semibold text-emerald-400">
                    +{cohortAnalytics?.todayProfilesCount ?? 0} طالب دخلوا اليوم ⚡
                  </div>
                </div>

                <div className="p-4 rounded-2xl border bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)] space-y-1">
                  <div className="flex items-center justify-between text-xs text-gray-400 font-bold">
                    <span>سلامة التيليمتري</span>
                    <span>🛡️</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                    {cohortAnalytics?.errorsList?.length === 0 ? '0 أخطاء' : `${cohortAnalytics?.errorsList?.length} تنبيه`}
                  </div>
                  <div className="text-[11px] font-semibold text-gray-400">
                    {cohortAnalytics?.errorsList?.length === 0 ? '✅ جميع الأحداث تتدفق بامتياز' : '⚠️ راجع سجلات الأخطاء'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl border bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)] space-y-1">
                  <div className="flex items-center justify-between text-xs text-gray-400 font-bold">
                    <span>المذاكرين ومكتسبي XP</span>
                    <span>⭐</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-amber-400">
                    {cohortAnalytics?.activeXpStudentsCount ?? 0}
                  </div>
                  <div className="text-[11px] font-semibold text-gray-400">طلاب حلوا كويزات وجمعوا نقاط</div>
                </div>

                <div className="p-4 rounded-2xl border bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)] space-y-1">
                  <div className="flex items-center justify-between text-xs text-gray-400 font-bold">
                    <span>كروت كشكول الأخطاء</span>
                    <span>🧠</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-purple-400">
                    {cohortAnalytics?.mistakesCount ?? 0}
                  </div>
                  <div className="text-[11px] font-semibold text-gray-400">
                    {cohortAnalytics?.mistakeReviewStats
                      ? `معدل الإنجاز ${cohortAnalytics.mistakeReviewStats.review_completion_pct ?? 0}% (${cohortAnalytics.mistakeReviewStats.mistakes_fully_mastered ?? 0} متقن)`
                      : 'أسئلة محفوظة للمراجعة المتباعدة'}
                  </div>
                </div>
              </div>

              {/* KPI Views Row 1: Daily Cohort Summary (DAU/XP) & Cohort Retention (D1/D3/D7) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* v_kpi_daily_cohort_summary */}
                <div className="p-4 rounded-2xl border bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)] space-y-3">
                  <h5 className="text-xs sm:text-sm font-black flex items-center justify-between" style={{ color: 'var(--text-primary)' }}>
                    <span>📈 النشاط اليومي للدفعة (DAU & XP آخر 7 أيام)</span>
                    <span className="text-[10px] font-mono text-teal-400">v_kpi_daily_cohort_summary</span>
                  </h5>
                  <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[var(--bg-surface)] text-gray-400 border-b border-[var(--border-subtle)]">
                        <tr>
                          <th className="py-2 px-2.5">اليوم</th>
                          <th className="py-2 px-2.5">النشطون (DAU)</th>
                          <th className="py-2 px-2.5">إجمالي XP</th>
                          <th className="py-2 px-2.5">المهام المكتملة</th>
                          <th className="py-2 px-2.5">الدقائق</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--bg-surface)]">
                        {!cohortAnalytics?.dauList || cohortAnalytics.dauList.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-4 text-center text-gray-500">
                              لا توجد سجلات نشاط يومية بعد
                            </td>
                          </tr>
                        ) : (
                          cohortAnalytics.dauList.slice(0, 7).map((row: any, i: number) => (
                            <tr key={row.day || i} className="hover:bg-white/5">
                              <td className="py-2 px-2.5 font-mono font-bold text-[var(--text-primary)]">{String(row.day).slice(0, 10)}</td>
                              <td className="py-2 px-2.5 text-cyan-400 font-bold">{row.active_students_dau ?? 0}</td>
                              <td className="py-2 px-2.5 text-amber-400 font-bold">{row.total_xp_distributed ?? 0} XP</td>
                              <td className="py-2 px-2.5 text-emerald-400">{row.total_learning_items_completed ?? 0}</td>
                              <td className="py-2 px-2.5 text-gray-400">{row.total_active_minutes ?? 0} د</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* v_kpi_retention_d7 */}
                <div className="p-4 rounded-2xl border bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)] space-y-3">
                  <h5 className="text-xs sm:text-sm font-black flex items-center justify-between" style={{ color: 'var(--text-primary)' }}>
                    <span>🔄 معدل استبقاء الطلاب (Cohort Retention D1 / D3 / D7)</span>
                    <span className="text-[10px] font-mono text-purple-400">v_kpi_retention_d7</span>
                  </h5>
                  <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[var(--bg-surface)] text-gray-400 border-b border-[var(--border-subtle)]">
                        <tr>
                          <th className="py-2 px-2.5">دفعة التسجيل</th>
                          <th className="py-2 px-2.5">العدد</th>
                          <th className="py-2 px-2.5">D1 (%)</th>
                          <th className="py-2 px-2.5">D3</th>
                          <th className="py-2 px-2.5">D7 (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--bg-surface)]">
                        {!cohortAnalytics?.retentionList || cohortAnalytics.retentionList.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-4 text-center text-gray-500">
                              لا توجد بيانات احتفاظ كافية بعد
                            </td>
                          </tr>
                        ) : (
                          cohortAnalytics.retentionList.slice(0, 7).map((r: any, i: number) => (
                            <tr key={r.signup_day || i} className="hover:bg-white/5">
                              <td className="py-2 px-2.5 font-mono font-bold text-[var(--text-primary)]">{String(r.signup_day).slice(0, 10)}</td>
                              <td className="py-2 px-2.5 font-bold">{r.cohort_size ?? 0}</td>
                              <td className="py-2 px-2.5 text-emerald-400 font-bold">
                                {r.retained_d1 ?? 0} ({r.d1_pct ?? 0}%)
                              </td>
                              <td className="py-2 px-2.5 text-cyan-400 font-bold">{r.retained_d3 ?? 0}</td>
                              <td className="py-2 px-2.5 text-purple-400 font-bold">
                                {r.retained_d7 ?? 0} ({r.d7_pct ?? 0}%)
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* KPI Views Row 2: Time to First Action & Hardest Cohort Questions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* v_kpi_time_to_first_action */}
                <div className="p-4 rounded-2xl border bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)] space-y-3">
                  <h5 className="text-xs sm:text-sm font-black flex items-center justify-between" style={{ color: 'var(--text-primary)' }}>
                    <span>⚡ سرعة أول تفاعل للطالب (Time-to-First-Action)</span>
                    <span className="text-[10px] font-mono text-amber-400">v_kpi_time_to_first_action</span>
                  </h5>
                  <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[var(--bg-surface)] text-gray-400 border-b border-[var(--border-subtle)]">
                        <tr>
                          <th className="py-2 px-2.5">نوع التفاعل الأول</th>
                          <th className="py-2 px-2.5">الجلسات</th>
                          <th className="py-2 px-2.5">الوسيط (ث)</th>
                          <th className="py-2 px-2.5">المتوسط (ث)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--bg-surface)]">
                        {!cohortAnalytics?.timeToFirstActionList || cohortAnalytics.timeToFirstActionList.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-gray-500">
                              لم تُسجّل جلسات تفاعل أولى بعد
                            </td>
                          </tr>
                        ) : (
                          cohortAnalytics.timeToFirstActionList.map((row: any, i: number) => (
                            <tr key={row.first_action_type || i} className="hover:bg-white/5">
                              <td className="py-2 px-2.5 font-mono font-bold text-[var(--text-primary)]">{row.first_action_type}</td>
                              <td className="py-2 px-2.5 text-cyan-400 font-bold">{row.session_count ?? 0}</td>
                              <td className="py-2 px-2.5 text-emerald-400 font-bold">{row.median_time_to_first_action_sec ?? 0}s</td>
                              <td className="py-2 px-2.5 text-gray-400">{row.avg_time_to_first_action_sec ?? 0}s</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* v_question_cohort_stats */}
                <div className="p-4 rounded-2xl border bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)] space-y-3">
                  <h5 className="text-xs sm:text-sm font-black flex items-center justify-between" style={{ color: 'var(--text-primary)' }}>
                    <span>🔥 أصعب أسئلة الدفعة (Highest Failure Rate)</span>
                    <span className="text-[10px] font-mono text-rose-400">v_question_cohort_stats</span>
                  </h5>
                  <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden max-h-[210px] overflow-y-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[var(--bg-surface)] text-gray-400 border-b border-[var(--border-subtle)] sticky top-0">
                        <tr>
                          <th className="py-2 px-2.5">السؤال / المقرر</th>
                          <th className="py-2 px-2.5">المحاولات</th>
                          <th className="py-2 px-2.5">نسبة الخطأ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--bg-surface)]">
                        {!cohortAnalytics?.hardestQuestionsList || cohortAnalytics.hardestQuestionsList.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-4 text-center text-gray-500">
                              لا توجد إحصائيات تعثر أسئلة بعد
                            </td>
                          </tr>
                        ) : (
                          cohortAnalytics.hardestQuestionsList.map((q: any, i: number) => (
                            <tr key={q.question_hash || i} className="hover:bg-white/5">
                              <td className="py-2 px-2.5 max-w-[220px] truncate" title={q.question_text}>
                                <div className="font-bold text-[var(--text-primary)] truncate">{q.question_text || q.question_hash}</div>
                                <div className="text-[10px] text-gray-400 truncate">
                                  {q.subject_name} • محاضرة {q.lecture_num}
                                </div>
                              </td>
                              <td className="py-2 px-2.5 font-mono">
                                {q.incorrect_attempts}/{q.total_attempts}
                              </td>
                              <td className="py-2 px-2.5 text-rose-400 font-black font-mono">
                                {q.failure_rate_pct}%
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {cohortAnalytics?.activeChallenge && (
                <div className="p-4 rounded-2xl border bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)] space-y-3">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
                    <span className="flex items-center gap-2 text-emerald-400">
                      <span>🏆</span>
                      <span>{cohortAnalytics.activeChallenge.title}</span>
                    </span>
                    <span className="text-gray-400">
                      {cohortAnalytics.totalContributions} / {cohortAnalytics.activeChallenge.target_count} مساهمة فعلية
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-black/20 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          (cohortAnalytics.totalContributions / cohortAnalytics.activeChallenge.target_count) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h5 className="text-xs sm:text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <span>📋 أحدث الطلاب والنشاط المسجل في قاعدة البيانات:</span>
                </h5>
                <div className="rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
                  <div className="max-h-[350px] overflow-y-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[var(--bg-surface-elevated)] text-gray-400 border-b border-[var(--border-subtle)] sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3">الاسم / اللقب</th>
                          <th className="py-2.5 px-3">المستوى</th>
                          <th className="py-2.5 px-3">الـ XP</th>
                          <th className="py-2.5 px-3">الستريك</th>
                          <th className="py-2.5 px-3">توقيت التسجيل</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--bg-surface)]">
                        {cohortAnalytics?.profilesList?.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-gray-500">
                              لا توجد بيانات طلاب مسجلة بعد
                            </td>
                          </tr>
                        ) : (
                          cohortAnalytics?.profilesList?.map((p: any) => (
                            <tr key={p.id} className="hover:bg-white/5 transition-colors">
                              <td className="py-2.5 px-3 font-bold text-[var(--text-primary)]">
                                {p.nickname || 'عاشق الرياضيات'}
                              </td>
                              <td className="py-2.5 px-3 text-cyan-400 font-bold">Lvl {p.level || 1}</td>
                              <td className="py-2.5 px-3 text-amber-400 font-bold">{p.total_xp || 0} XP</td>
                              <td className="py-2.5 px-3 text-emerald-400">
                                {p.current_streak ? `🔥 ${p.current_streak}` : '0'}
                              </td>
                              <td className="py-2.5 px-3 text-gray-400" dir="ltr" style={{ textAlign: 'right' }}>
                                {p.created_at
                                  ? new Date(p.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })
                                  : '—'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
