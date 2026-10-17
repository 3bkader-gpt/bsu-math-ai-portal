'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import 'katex/dist/katex.min.css';
import MathRenderer from '@/components/MathRenderer';
import StudyGuideViewer from '@/components/StudyGuideViewer';
import FlashcardsViewer from '@/components/FlashcardsViewer';
import ThemeToggle from '@/components/ThemeToggle';
import content from '@/data/content.json';
import {
  ArrowRight,
  BookOpen,
  Headphones,
  Video,
  HelpCircle,
  FileText,
  Layers,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Award,
  Sparkles,
  Lightbulb,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ExternalLink,
  GraduationCap
} from 'lucide-react';
import { getApiUrl, getApiBaseUrl } from '@/lib/api';
import { getDirectSupabaseBundle, getDirectSupabaseSubjects } from '@/lib/supabase';
import { AcademicLectureBundle, AcademicMediaAsset } from '@/types/academic';
import {
  QuizQuestion,
  Flashcard,
  OriginalPdfInfo,
  getOriginalPdfDetails,
  parseQuizMarkdown,
  parseFlashcardsMarkdown,
  getQuizFeedback,
  getQuizHintPrefix,
  getMascotEmoji,
  formatTime,
  downloadPdfFile,
  isAssetStorageAvailable,
} from '@/lib/lecture-utils';

function LectureLoadingSkeleton() {
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-page)',
        color: 'var(--text-primary)',
      }}
      className="min-h-screen flex flex-col items-center justify-center p-6 space-y-4"
    >
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center border animate-pulse shadow-sm"
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--accent-primary)',
        }}
      >
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
      <div className="text-center space-y-1">
        <h3 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>
          جاري فتح المحاضرة بروقان...
        </h3>
        <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
          بنجهزلك كل مصادر الشرح والكويز والزتونة
        </p>
      </div>
    </div>
  );
}

function LectureContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const lectureIdParam = searchParams.get('id');

  const [currentPersona, setCurrentPersona] = useState<'boys' | 'girls'>('boys');
  const [currentMode, setCurrentMode] = useState<'light' | 'dark'>('light');

  // Theme & Persona synchronization
  useEffect(() => {
    try {
      const p = (localStorage.getItem('bsu_portal_persona') as 'boys' | 'girls') || 'boys';
      const m = (localStorage.getItem('bsu_portal_mode') as 'light' | 'dark') ||
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

  // Lecture State
  const [lectureBundle, setLectureBundle] = useState<AcademicLectureBundle | null>(null);
  const [subjectName, setSubjectName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'audio' | 'video' | 'quiz' | 'guide' | 'flashcards'>('audio');

  // Quiz Engine
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [showHints, setShowHints] = useState<Record<number, boolean>>({});
  const [score, setScore] = useState<number | null>(null);

  // Study Guide & Flashcards
  const [guideText, setGuideText] = useState<string>('');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [downloadingAssetId, setDownloadingAssetId] = useState<number | string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Audio Player
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Load Lecture Bundle on mount or ID change
  useEffect(() => {
    if (!lectureIdParam) {
      setLoadError('لم يتم تحديد كود المحاضرة.');
      setIsLoading(false);
      return;
    }

    const lectureId = parseInt(lectureIdParam, 10);
    if (isNaN(lectureId)) {
      setLoadError('كود المحاضرة غير صحيح.');
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setLoadError(null);

    const loadData = async () => {
      try {
        let bundle: AcademicLectureBundle | null = null;
        try {
          bundle = await getDirectSupabaseBundle(lectureId, getApiBaseUrl());
        } catch (supabaseErr) {
          console.warn('Direct Supabase fetch failed, falling back to API:', supabaseErr);
          const res = await fetch(getApiUrl(`/api/lectures/${lectureId}`));
          if (res.ok) {
            bundle = await res.json();
          }
        }

        if (!bundle) {
          throw new Error('لم يتم العثور على بيانات المحاضرة.');
        }

        if (!isMounted) return;

        setLectureBundle(bundle);

        // Resolve subject name if not embedded
        if (bundle.subject_name) {
          setSubjectName(bundle.subject_name);
        } else if (bundle.subject_id) {
          try {
            const subs = await getDirectSupabaseSubjects();
            const matched = subs.find(s => s.id === bundle?.subject_id);
            if (matched && isMounted) {
              setSubjectName(matched.name);
            }
          } catch {}
        }

        // Parse Quiz
        const quizAsset = bundle.assets?.find((a) => a.asset_type === 'quiz_md');
        if (quizAsset) {
          if (quizAsset.content_text) {
            setQuizQuestions(parseQuizMarkdown(quizAsset.content_text));
          } else if (quizAsset.stream_url) {
            fetch(getApiUrl(quizAsset.stream_url))
              .then((r) => r.text())
              .then((text) => {
                if (isMounted) setQuizQuestions(parseQuizMarkdown(text));
              })
              .catch(console.error);
          }
        }

        // Parse Study Guide
        const guideAsset = bundle.assets?.find((a) => a.asset_type === 'study_guide_md');
        if (guideAsset) {
          if (guideAsset.content_text) {
            setGuideText(guideAsset.content_text);
          } else if (guideAsset.stream_url) {
            fetch(getApiUrl(guideAsset.stream_url))
              .then((r) => r.text())
              .then((text) => {
                if (isMounted) setGuideText(text);
              })
              .catch(console.error);
          }
        }

        // Parse Flashcards
        const cardsAsset = bundle.assets?.find((a) => a.asset_type === 'flashcards_md');
        if (cardsAsset) {
          if (cardsAsset.content_text) {
            setFlashcards(parseFlashcardsMarkdown(cardsAsset.content_text));
          } else if (cardsAsset.stream_url) {
            fetch(getApiUrl(cardsAsset.stream_url))
              .then((r) => r.text())
              .then((text) => {
                if (isMounted) setFlashcards(parseFlashcardsMarkdown(text));
              })
              .catch(console.error);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Lecture loading error:', err);
          setLoadError(err.message || 'تعذر تحميل المحاضرة.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [lectureIdParam]);

  // Audio Controls
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(console.error);
    }
  };

  const seekRelative = (delta: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + delta));
  };

  const handleSpeedChange = (speed: number) => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
  };

  const handleDownloadOriginalFile = (url: string, fallbackFilename: string, assetId: number | string) => {
    downloadPdfFile(url, fallbackFilename, assetId, setDownloadingAssetId, setPdfError);
  };

  const handleDownloadStudyGuidePdf = () => {
    if (!studyGuideAsset || downloadingAssetId !== null || !lectureBundle) return;
    const defaultName = `المحاضرة ${lectureBundle.lecture_num} - ملخص المذاكرة والزتونة.pdf`;
    handleDownloadOriginalFile(`/api/study-guides/${studyGuideAsset.id}/pdf`, defaultName, 'study-guide');
  };

  // Assets Helpers
  const audioAsset = lectureBundle?.assets?.find((a) => a.asset_type === 'audio');
  const videoAsset = lectureBundle?.assets?.find((a) => a.asset_type === 'video');
  const isAudioReady = Boolean(audioAsset && (audioAsset.has_telegram || audioAsset.telegram_message_id));
  const isVideoReady = Boolean(videoAsset && (videoAsset.has_telegram || videoAsset.telegram_message_id));

  const originalPdfAssets = (lectureBundle?.assets || []).filter(
    (a) =>
      (a.asset_type === 'original_pdf' || a.asset_type === 'pdf') &&
      isAssetStorageAvailable(a)
  );

  const sortedOriginalPdfs = [...originalPdfAssets].sort((a, b) => {
    const isBookA = /كتاب/i.test(a.title || '');
    const isBookB = /كتاب/i.test(b.title || '');
    if (!isBookA && isBookB) return -1;
    if (isBookA && !isBookB) return 1;
    return 0;
  });

  const studyGuideAsset = lectureBundle?.assets?.find((a) => a.asset_type === 'study_guide_md');
  const isGuideReady = Boolean(
    studyGuideAsset && (studyGuideAsset.content_text?.trim() || guideText.trim())
  );

  if (isLoading) {
    return <LectureLoadingSkeleton />;
  }

  if (loadError || !lectureBundle) {
    return (
      <div
        style={{
          backgroundColor: 'var(--bg-page)',
          color: 'var(--text-primary)',
        }}
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-5"
      >
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center border shadow-sm"
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--accent-rose)',
          }}
        >
          <XCircle className="w-10 h-10" />
        </div>
        <div className="space-y-1.5 max-w-md">
          <h2 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
            عفواً، تعذر فتح المحاضرة
          </h2>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {loadError || 'لم يتم العثور على بيانات المحاضرة المطلوبة.'}
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold border transition-all hover:scale-105 active:scale-95 shadow-md"
          style={{
            backgroundColor: 'var(--accent-primary)',
            borderColor: 'var(--accent-primary)',
            color: isGirls && isDark ? '#0D0811' : (!isGirls && isDark ? '#0B0F14' : '#ffffff'),
          }}
        >
          <ArrowRight className="w-4 h-4" />
          <span>الرجوع إلى المقررات الدراسية</span>
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-page)',
        color: 'var(--text-primary)',
      }}
      className="min-h-screen flex flex-col transition-colors duration-200"
    >
      {/* Top Academic Navigation Bar */}
      <header
        style={{
          backgroundColor: 'var(--bg-surface-translucent)',
          borderColor: 'var(--border-subtle)',
        }}
        className="sticky top-0 z-40 border-b backdrop-blur-md transition-colors"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
          
          {/* Back to Courses Link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl border text-xs sm:text-sm font-bold transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98] group"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>رجوع للمقررات</span>
          </Link>

          {/* Subject & Doctor Badge in Center */}
          <div className="flex items-center gap-2 min-w-0">
            {subjectName && (
              <span
                className="text-xs sm:text-sm font-black px-3 py-1 rounded-xl border truncate max-w-[150px] sm:max-w-[260px]"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--accent-primary)',
                }}
              >
                {subjectName}
              </span>
            )}
            {lectureBundle.doctor && (
              <span
                className="hidden md:inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl border opacity-90"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                {lectureBundle.doctor.includes('مروة') ? '👩‍🏫' : '👨‍🏫'} {lectureBundle.doctor}
              </span>
            )}
          </div>

          {/* Theme & Persona Switcher */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Spacious Lecture Page Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
        
        {/* Lecture Hero Banner Card */}
        <section
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--card-shadow)',
          }}
          className="p-6 sm:p-10 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all"
        >
          <div className="flex items-start sm:items-center gap-4 sm:gap-6 min-w-0">
            {/* Big Lecture Number */}
            <div
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: isGirls && isDark ? '#0D0811' : (!isGirls && isDark ? '#0B0F14' : '#ffffff'),
              }}
              className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl flex items-center justify-center font-black text-xl sm:text-3xl shadow-md shrink-0"
            >
              {isGirls ? `🌸 ${lectureBundle.lecture_num}` : lectureBundle.lecture_num}
            </div>

            <div className="min-w-0 space-y-1 sm:space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-xs sm:text-sm font-extrabold"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  {subjectName || 'المقرر الدراسي'}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>•</span>
                <span className="text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {isGirls ? 'جاهزة ومية مية 🎀' : 'المحاضرة متاحة'}
                </span>
                {lectureBundle.doctor && (
                  <>
                    <span className="hidden sm:inline" style={{ color: 'var(--text-muted)' }}>•</span>
                    <span className="text-xs font-bold sm:hidden" style={{ color: 'var(--text-muted)' }}>
                      {lectureBundle.doctor}
                    </span>
                  </>
                )}
              </div>

              <h1
                className="text-xl sm:text-3xl md:text-4xl font-black leading-snug sm:leading-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                {lectureBundle.title}
              </h1>

              <p className="text-xs sm:text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                {isGirls 
                  ? 'كل المصادر مشروحة ومترتبة عشان تذاكري بروقان وتركيز 🌸' 
                  : 'جميع المصادر الأكاديمية مشروحة ومفصلة للمذاكرة الذكية'}
              </p>
            </div>
          </div>
        </section>

        {/* Original Materials Bar (الكشكول بخط اليد ومن الكتاب) */}
        {sortedOriginalPdfs.length > 0 && (
          <section
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)',
              boxShadow: 'var(--card-shadow)',
            }}
            className="p-4 sm:p-6 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                }}
              >
                <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <div className="font-extrabold text-sm sm:text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <span>ملفات المحاضرة الأصلية المعتمدة</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {sortedOriginalPdfs.length} {sortedOriginalPdfs.length === 1 ? 'ملف' : 'ملفات'}
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-medium mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  المصادر الرسمية المرفوعة للمحاضرة (الكشكول بخط اليد وجزء الكتاب المقرر)
                </div>
              </div>
            </div>

            <div className="flex items-stretch sm:items-center gap-3 flex-wrap">
              {sortedOriginalPdfs.map((pdf) => {
                const info = getOriginalPdfDetails(pdf, lectureBundle.lecture_num);
                const isDownloading = downloadingAssetId === pdf.id;
                return (
                  <button
                    key={pdf.id}
                    type="button"
                    onClick={() => handleDownloadOriginalFile(info.downloadUrl, info.suggestedFilename, pdf.id)}
                    disabled={downloadingAssetId !== null}
                    className={`flex-1 sm:flex-initial inline-flex items-center justify-between sm:justify-start gap-3 px-4 py-2.5 rounded-2xl border text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${
                      info.isBook
                        ? 'hover:border-blue-500 bg-blue-500/5 hover:bg-blue-500/10 border-blue-500/20 text-blue-900 dark:text-blue-100'
                        : 'hover:border-amber-500 bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-100'
                    }`}
                    title={`تحميل ${info.title} (${info.subtitle})`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg shrink-0">{info.badgeEmoji}</span>
                      <div className="flex flex-col text-right">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                            info.isBook
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                          }`}>
                            {info.badgeText}
                          </span>
                          <span className="font-bold text-xs sm:text-sm truncate max-w-[160px] sm:max-w-[220px]">
                            {info.title}
                          </span>
                        </div>
                        {info.subtitle && info.isBook && (
                          <span className="text-[11px] opacity-75 truncate max-w-[200px] sm:max-w-[240px]">
                            {info.subtitle}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pr-1">
                      {isDownloading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
                      ) : (
                        <>
                          {info.formattedSize && (
                            <span className="text-[11px] font-mono opacity-70">
                              ({info.formattedSize})
                            </span>
                          )}
                          <Download className="w-4 h-4 opacity-80" />
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Global Error Banner for PDF or Network */}
        {pdfError && (
          <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-sm">
            <span>{pdfError}</span>
            <button
              type="button"
              onClick={() => setPdfError(null)}
              className="text-xs underline hover:no-underline font-bold"
            >
              إغلاق
            </button>
          </div>
        )}

        {/* Spacious Tabs Navigation */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--card-shadow)',
          }}
          className="rounded-3xl border p-2 flex items-center gap-2 overflow-x-auto no-scrollbar touch-pan-x"
        >
          <button
            onClick={() => setActiveTab('audio')}
            style={{
              backgroundColor: activeTab === 'audio' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'audio' ? (isGirls && isDark ? '#0D0811' : (!isGirls && isDark ? '#0B0F14' : '#ffffff')) : 'var(--text-secondary)',
            }}
            className="flex-1 min-w-[120px] sm:min-w-[150px] py-3 sm:py-3.5 px-3 rounded-2xl transition-all flex items-center justify-center gap-2 font-black text-xs sm:text-sm cursor-pointer hover:opacity-90"
          >
            <Headphones className="w-4 h-4 shrink-0" />
            <span>{isGirls ? '🌸 بودكاست روقان' : 'بودكاست الشرح'}</span>
          </button>

          <button
            onClick={() => setActiveTab('video')}
            style={{
              backgroundColor: activeTab === 'video' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'video' ? (isGirls && isDark ? '#0D0811' : (!isGirls && isDark ? '#0B0F14' : '#ffffff')) : 'var(--text-secondary)',
            }}
            className="flex-1 min-w-[120px] sm:min-w-[150px] py-3 sm:py-3.5 px-3 rounded-2xl transition-all flex items-center justify-center gap-2 font-black text-xs sm:text-sm cursor-pointer hover:opacity-90"
          >
            <Video className="w-4 h-4 shrink-0" />
            <span>{isGirls ? '🎬 فيديو الشرح' : 'فيديو الشرح'}</span>
          </button>

          <button
            onClick={() => setActiveTab('quiz')}
            style={{
              backgroundColor: activeTab === 'quiz' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'quiz' ? (isGirls && isDark ? '#0D0811' : (!isGirls && isDark ? '#0B0F14' : '#ffffff')) : 'var(--text-secondary)',
            }}
            className="flex-1 min-w-[130px] sm:min-w-[170px] py-3 sm:py-3.5 px-3 rounded-2xl transition-all flex items-center justify-center gap-2 font-black text-xs sm:text-sm cursor-pointer hover:opacity-90"
          >
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span>{isGirls ? '🧁 اختبري شطارتك' : 'كويز المحاضرة'} ({quizQuestions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            style={{
              backgroundColor: activeTab === 'guide' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'guide' ? (isGirls && isDark ? '#0D0811' : (!isGirls && isDark ? '#0B0F14' : '#ffffff')) : 'var(--text-secondary)',
            }}
            className="flex-1 min-w-[130px] sm:min-w-[170px] py-3 sm:py-3.5 px-3 rounded-2xl transition-all flex items-center justify-center gap-2 font-black text-xs sm:text-sm cursor-pointer hover:opacity-90"
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>{isGirls ? '🎀 النوتس والزتونة' : 'الدليل والزتونة'}</span>
          </button>

          <button
            onClick={() => setActiveTab('flashcards')}
            style={{
              backgroundColor: activeTab === 'flashcards' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'flashcards' ? (isGirls && isDark ? '#0D0811' : (!isGirls && isDark ? '#0B0F14' : '#ffffff')) : 'var(--text-secondary)',
            }}
            className="flex-1 min-w-[120px] sm:min-w-[160px] py-3 sm:py-3.5 px-3 rounded-2xl transition-all flex items-center justify-center gap-2 font-black text-xs sm:text-sm cursor-pointer hover:opacity-90"
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span>{isGirls ? '🪞 فلاش كاردز' : 'كروت المراجعة'} ({flashcards.length})</span>
          </button>
        </div>

        {/* Tab Content Display Area */}
        <div className="pt-2">

          {/* TAB 1: AUDIO PODCAST */}
          {activeTab === 'audio' && (
            <div className="space-y-6 max-w-3xl mx-auto py-4">
              {isAudioReady && audioAsset ? (
                <div
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    boxShadow: 'var(--card-shadow)',
                  }}
                  className="p-6 sm:p-12 rounded-3xl border text-center space-y-6 sm:space-y-8"
                >
                  <audio
                    ref={audioRef}
                    src={getApiUrl(audioAsset.stream_url)}
                    onTimeUpdate={() => {
                      if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
                    }}
                    onLoadedMetadata={() => {
                      if (audioRef.current) setDuration(audioRef.current.duration);
                    }}
                    onEnded={() => setIsPlaying(false)}
                    onError={(e) => console.error('Audio playback error:', e)}
                  />

                  {/* Big Headphones Visual */}
                  <div
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      color: isGirls && isDark ? '#0D0811' : (!isGirls && isDark ? '#0B0F14' : '#ffffff'),
                    }}
                    className="w-24 h-24 sm:w-32 sm:h-32 mx-auto rounded-full flex items-center justify-center shadow-xl"
                  >
                    <Headphones className="w-12 h-12 sm:w-16 sm:h-16" />
                  </div>

                  <div>
                    <h3 className="text-2xl sm:text-3xl font-black" style={{ color: 'var(--text-primary)' }}>
                      {audioAsset.title}
                    </h3>
                    <p className="text-xs sm:text-sm font-semibold mt-2" style={{ color: 'var(--text-muted)' }}>
                      {content.audioTab.descriptionFormat.replace(
                        '{size}',
                        (((audioAsset.file_size_bytes || 0) / (1024 * 1024)).toFixed(1))
                      )}
                    </p>
                  </div>

                  {/* Audio Progress Scrubber */}
                  <div className="space-y-2.5 max-w-xl mx-auto">
                    <input
                      type="range"
                      min="0"
                      max={duration || 100}
                      value={currentTime}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setCurrentTime(val);
                        if (audioRef.current) audioRef.current.currentTime = val;
                      }}
                      className="w-full accent-blue-600 cursor-pointer h-2.5 rounded-lg"
                    />
                    <div className="flex justify-between text-xs font-mono font-bold" style={{ color: 'var(--text-muted)' }}>
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Controls: -10s, Play/Pause, +10s */}
                  <div className="flex items-center justify-center gap-6 sm:gap-8">
                    <button
                      onClick={() => seekRelative(-10)}
                      title={content.audioTab.rewindTitle}
                      className="p-4 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <RotateCcw className="w-7 h-7" />
                    </button>

                    <button
                      onClick={togglePlay}
                      style={{
                        backgroundColor: 'var(--accent-primary)',
                        color: isGirls && isDark ? '#0D0811' : (!isGirls && isDark ? '#0B0F14' : '#ffffff'),
                      }}
                      className="w-20 h-20 rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                      {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 translate-x-0.5" />}
                    </button>

                    <button
                      onClick={() => seekRelative(10)}
                      title={content.audioTab.forwardTitle}
                      className="p-4 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <RotateCw className="w-7 h-7" />
                    </button>
                  </div>

                  {/* Speed Controls */}
                  <div
                    className="pt-6 border-t flex flex-wrap items-center justify-center gap-2 sm:gap-3"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                      {content.audioTab.speedLabel}
                    </span>
                    {[0.75, 1, 1.25, 1.5, 2].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSpeedChange(s)}
                        style={{
                          backgroundColor: playbackSpeed === s ? 'var(--accent-primary)' : 'var(--bg-surface-elevated)',
                          color: playbackSpeed === s ? (isGirls && isDark ? '#0D0811' : (!isGirls && isDark ? '#0B0F14' : '#ffffff')) : 'var(--text-secondary)',
                          borderColor: 'var(--border-subtle)',
                        }}
                        className="px-4 py-2 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer shadow-xs"
                      >
                        {s}x
                      </button>
                    ))}
                  </div>

                  {/* Telegram Audio Link */}
                  {audioAsset.telegram_message_id && (
                    <div className="pt-2 flex justify-center">
                      <a
                        href={`https://t.me/c/4453609138/${audioAsset.telegram_message_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-sm hover:scale-105 active:scale-95 text-white"
                        style={{ backgroundColor: '#229ED9' }}
                      >
                        <span>فتح واستماع في تطبيق تليجرام ✈️</span>
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-16 space-y-4 max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
                  <div
                    className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center border shadow-sm"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                  >
                    <Headphones className="w-10 h-10 opacity-40 text-cyan-500 animate-pulse" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>
                      بودكاست الشرح قيد المعالجة السحابية ⏳
                    </h3>
                    <p className="text-xs sm:text-sm font-semibold leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      يتم تسجيل ومزامنة الصوت لهذه المحاضرة على السحابة. يمكنك حالياً دراسة محتوى المحاضرة كاملاً عبر الكويز التفاعلي والدليل والزتونة.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-3">
                    <button
                      onClick={() => setActiveTab('quiz')}
                      className="px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold border transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm text-white"
                      style={{ backgroundColor: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
                    >
                      كويز المحاضرة 🎯
                    </button>
                    <button
                      onClick={() => setActiveTab('guide')}
                      className="px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold border transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                    >
                      الدليل الدراسي والزتونة 📖
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VIDEO EXPLAINER */}
          {activeTab === 'video' && (
            <div className="space-y-6 max-w-4xl mx-auto py-4">
              {isVideoReady && videoAsset ? (
                <div
                  style={{
                    backgroundColor: '#000000',
                    borderColor: 'var(--border-subtle)',
                    boxShadow: 'var(--card-shadow)',
                  }}
                  className="rounded-3xl overflow-hidden border shadow-2xl"
                >
                  <video
                    controls
                    playsInline
                    preload="metadata"
                    src={getApiUrl(videoAsset.stream_url)}
                    className="w-full max-h-[580px] bg-black"
                  >
                    {content.videoTab.unsupported}
                  </video>
                  <div
                    className="p-5 flex items-center justify-between text-xs sm:text-sm font-medium border-t border-white/10"
                    style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)' }}
                  >
                    <span className="font-bold text-sm sm:text-base" style={{ color: 'var(--text-primary)' }}>
                      {videoAsset.title}
                    </span>
                    <span className="font-mono">
                      {content.videoTab.fileSizeFormat.replace(
                        '{size}',
                        (((videoAsset.file_size_bytes || 0) / (1024 * 1024)).toFixed(1))
                      )}
                    </span>
                  </div>

                  {videoAsset.telegram_message_id && (
                    <div className="p-4 bg-black/40 flex justify-center border-t border-white/5">
                      <a
                        href={`https://t.me/c/4453609138/${videoAsset.telegram_message_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-sm hover:scale-105 active:scale-95 text-white"
                        style={{ backgroundColor: '#229ED9' }}
                      >
                        <span>مشاهدة وتحميل في تطبيق تليجرام 🎬</span>
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-16 space-y-4 max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
                  <div
                    className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center border shadow-sm"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                  >
                    <Video className="w-10 h-10 opacity-40 text-rose-500 animate-pulse" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>
                      فيديو الشرح التفاعلي قيد المعالجة السحابية ⏳
                    </h3>
                    <p className="text-xs sm:text-sm font-semibold leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      يتم إنتاج ورندرة الفيديو التفاعلي لهذه المحاضرة سحابياً. يمكنك الاستفادة الآن من الكويز والدليل والبطاقات التعليمية المكتملة.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-3">
                    <button
                      onClick={() => setActiveTab('quiz')}
                      className="px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold border transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm text-white"
                      style={{ backgroundColor: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
                    >
                      كويز المحاضرة 🎯
                    </button>
                    <button
                      onClick={() => setActiveTab('guide')}
                      className="px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold border transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                    >
                      الدليل الدراسي والزتونة 📖
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: QUIZ ENGINE WITH KATEX */}
          {activeTab === 'quiz' && (
            <div className="space-y-6 max-w-4xl mx-auto py-4">
              {quizQuestions.length === 0 ? (
                <div className="text-center py-20 space-y-4" style={{ color: 'var(--text-muted)' }}>
                  <HelpCircle className="w-16 h-16 mx-auto mb-3 opacity-40 animate-pulse" />
                  <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    لم يتم العثور على أسئلة لهذا الكويز حالياً
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => setActiveTab('guide')}
                      className="px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold border transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      الانتقال للدليل والزتونة 📖
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Quiz Progress & Score Card */}
                  <div
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                      boxShadow: 'var(--card-shadow)',
                    }}
                    className="p-6 sm:p-8 rounded-3xl border space-y-5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div
                          style={{
                            backgroundColor: 'var(--bg-surface-elevated)',
                            borderColor: 'var(--border-prominent)',
                            color: 'var(--accent-primary)',
                          }}
                          className="w-14 h-14 rounded-2xl border flex items-center justify-center font-black text-xl shadow-sm"
                        >
                          {quizQuestions.length}
                        </div>
                        <div>
                          <h3 className="font-black text-xl" style={{ color: 'var(--text-primary)' }}>
                            {content.quizTab.title}
                          </h3>
                          <p className="text-xs sm:text-sm font-semibold mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {content.quizTab.progressFormat
                              .replace('{solved}', Object.keys(userAnswers).length.toString())
                              .replace('{total}', quizQuestions.length.toString())}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {score !== null && (
                          <div
                            style={{
                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                              borderColor: 'var(--accent-emerald)',
                              color: 'var(--accent-emerald)',
                            }}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border font-bold text-sm shadow-sm"
                          >
                            <Award className="w-5 h-5" />
                            <span>
                              {content.quizTab.scoreFormat
                                .replace('{score}', score.toString())
                                .replace('{total}', quizQuestions.length.toString())
                                .replace(
                                  '{percent}',
                                  Math.round((score / quizQuestions.length) * 100).toString()
                                )}
                            </span>
                          </div>
                        )}

                        {Object.keys(userAnswers).length > 0 && (
                          <button
                            onClick={() => {
                              setUserAnswers({});
                              setShowHints({});
                              setScore(null);
                              // Dynamic Shuffle
                              setQuizQuestions((prev) =>
                                prev.map((q) => {
                                  const items = q.options.map((opt, idx) => ({
                                    opt,
                                    isCorrect: idx === q.correctIndex,
                                  }));
                                  for (let i = items.length - 1; i > 0; i--) {
                                    const j = Math.floor(Math.random() * (i + 1));
                                    [items[i], items[j]] = [items[j], items[i]];
                                  }
                                  return {
                                    ...q,
                                    options: items.map((it) => it.opt),
                                    correctIndex: items.findIndex((it) => it.isCorrect),
                                  };
                                })
                              );
                            }}
                            style={{
                              backgroundColor: 'var(--bg-surface-elevated)',
                              borderColor: 'var(--border-subtle)',
                              color: 'var(--text-secondary)',
                            }}
                            className="px-4 py-2.5 rounded-2xl border text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer hover:border-blue-400"
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span>{content.quizTab.retryButton}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div
                      className="w-full h-3 rounded-full overflow-hidden"
                      style={{ backgroundColor: 'var(--bg-surface-elevated)' }}
                    >
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          backgroundColor: 'var(--accent-primary)',
                          width: `${(Object.keys(userAnswers).length / quizQuestions.length) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Question Cards List */}
                  {quizQuestions.map((q, qIdx) => {
                    const selectedOpt = userAnswers[qIdx];
                    const isAnswered = selectedOpt !== undefined;
                    const optionLabels = ['أ', 'ب', 'ج', 'د'];

                    return (
                      <div
                        key={qIdx}
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: isAnswered
                            ? selectedOpt === q.correctIndex
                              ? 'var(--accent-emerald)'
                              : 'var(--accent-rose)'
                            : 'var(--border-subtle)',
                          boxShadow: 'var(--card-shadow)',
                        }}
                        className="p-5 sm:p-8 rounded-3xl border transition-all space-y-5"
                      >
                        {/* Question Header */}
                        <div
                          className="flex items-center justify-between gap-3 pb-4 border-b"
                          style={{ borderColor: 'var(--border-subtle)' }}
                        >
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span
                              style={{
                                backgroundColor: 'var(--bg-surface-elevated)',
                                borderColor: 'var(--border-prominent)',
                                color: 'var(--accent-primary)',
                              }}
                              className="px-4 py-1.5 rounded-xl border text-xs sm:text-sm font-bold tracking-wide shadow-sm"
                            >
                              {content.quizTab.questionHeaderFormat
                                .replace('{number}', q.number.toString())
                                .replace('{total}', quizQuestions.length.toString())}
                            </span>
                            {isAnswered && (
                              <span
                                style={{
                                  backgroundColor:
                                    selectedOpt === q.correctIndex
                                      ? 'rgba(16, 185, 129, 0.15)'
                                      : 'rgba(244, 63, 94, 0.15)',
                                  borderColor:
                                    selectedOpt === q.correctIndex
                                      ? 'var(--accent-emerald)'
                                      : 'var(--accent-rose)',
                                  color:
                                    selectedOpt === q.correctIndex
                                      ? 'var(--accent-emerald)'
                                      : 'var(--accent-rose)',
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-bold shadow-xs animate-in fade-in"
                              >
                                {selectedOpt === q.correctIndex ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>إجابة صحيحة</span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>إجابة غير صحيحة</span>
                                  </>
                                )}
                              </span>
                            )}
                          </div>

                          {q.hint && (
                            <button
                              type="button"
                              onClick={() => setShowHints((prev) => ({ ...prev, [qIdx]: !prev[qIdx] }))}
                              className="text-xs sm:text-sm hover:underline flex items-center gap-1.5 transition-colors font-bold cursor-pointer"
                              style={{ color: 'var(--accent-amber)' }}
                            >
                              <Lightbulb className="w-4 h-4" />
                              <span>
                                {showHints[qIdx]
                                  ? content.quizTab.hideHint
                                  : isGirls
                                  ? 'غششة صغننة 💡'
                                  : content.quizTab.showHint}
                              </span>
                            </button>
                          )}
                        </div>

                        {/* Question Statement */}
                        <div
                          className="text-lg sm:text-2xl font-extrabold leading-relaxed"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          <MathRenderer text={q.question} />
                        </div>

                        {/* Interactive Hero Reaction Card when answered */}
                        {isAnswered && (() => {
                          const isCorrect = selectedOpt === q.correctIndex;
                          const feedbackMsg = getQuizFeedback(qIdx, isCorrect, isGirls);
                          const mascot = getMascotEmoji(feedbackMsg, isCorrect, isGirls);

                          return (
                            <div
                              style={{
                                background: isCorrect
                                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(20, 184, 166, 0.05) 100%)'
                                  : 'linear-gradient(135deg, rgba(244, 63, 94, 0.14) 0%, rgba(236, 72, 153, 0.07) 100%)',
                                borderColor: isCorrect ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                              }}
                              className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border-2 p-4 sm:p-6 transition-all duration-300 animate-in fade-in slide-in-from-top-3 shadow-md ${
                                isCorrect ? 'quiz-reaction-correct' : 'quiz-reaction-wrong'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                {/* Mascot + Speech Bubble Content */}
                                <div className="flex items-center gap-3.5 sm:gap-4 flex-1">
                                  {/* Animated Mascot Avatar */}
                                  <div
                                    style={{
                                      backgroundColor: isCorrect ? 'rgba(16, 185, 129, 0.22)' : 'rgba(244, 63, 94, 0.22)',
                                      borderColor: isCorrect ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                                    }}
                                    className="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl border-2 flex items-center justify-center shrink-0 shadow-md text-3xl sm:text-4xl"
                                  >
                                    <span className="quiz-mascot-icon select-none">{mascot}</span>
                                  </div>

                                  <div className="space-y-1 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span
                                        style={{
                                          backgroundColor: isCorrect ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                                          color: '#ffffff',
                                        }}
                                        className="px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wider uppercase shadow-xs"
                                      >
                                        {isCorrect ? 'إجابة عبقرية ✨' : 'محاولة محتاجة تركيز 💡'}
                                      </span>
                                    </div>
                                    <div
                                      className="text-base sm:text-xl font-black leading-snug tracking-tight"
                                      style={{
                                        color: isCorrect ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                                      }}
                                    >
                                      {feedbackMsg}
                                    </div>
                                    <p className="text-xs sm:text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                                      {isCorrect
                                        ? (isGirls
                                            ? 'شطارة وتركيز عالي جداً.. الله ينور عليكي يا بطلة! 🌸✨'
                                            : 'تسلم إيدك وعاش تركيزك يا بطل! 🎯')
                                        : (isGirls
                                            ? 'ولا تشيلي هم خالص! الغلط بيعلمنا أكتر.. بصي على الشرح أو جربي تاني 💪'
                                            : 'فداك يا هندسة! راجع الفكرة وجرب تختار إجابة تانية 💡')}
                                    </p>
                                  </div>
                                </div>

                                {/* Instant Retry Action Button if wrong */}
                                {!isCorrect && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = { ...userAnswers };
                                      delete next[qIdx];
                                      setUserAnswers(next);
                                      let correctCount = 0;
                                      Object.entries(next).forEach(([idx, chosen]) => {
                                        if (quizQuestions[parseInt(idx)]?.correctIndex === chosen) {
                                          correctCount++;
                                        }
                                      });
                                      setScore(correctCount);
                                    }}
                                    style={{
                                      backgroundColor: 'var(--accent-rose)',
                                      color: '#ffffff',
                                      boxShadow: '0 4px 16px rgba(244, 63, 94, 0.35)',
                                    }}
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-black hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0 border border-rose-300 shadow-sm"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                    <span>{isGirls ? 'يلا نجرب تاني؟ 🌸' : 'حاول مرة أخرى 🔄'}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Hint Box */}
                        {showHints[qIdx] && q.hint && (
                          <div
                            style={{
                              backgroundColor: 'rgba(245, 158, 11, 0.12)',
                              borderColor: 'var(--accent-amber)',
                            }}
                            className="p-4 sm:p-6 rounded-2xl border text-sm sm:text-base leading-relaxed flex items-start gap-3 animate-in fade-in"
                          >
                            <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            <div className="flex-1 font-bold" style={{ color: 'var(--text-primary)' }}>
                              <span className="font-extrabold text-amber-600 dark:text-amber-400">
                                {getQuizHintPrefix(qIdx, isGirls)}
                              </span>
                              <MathRenderer text={q.hint} />
                            </div>
                          </div>
                        )}

                        {/* Options Buttons */}
                        <div className="space-y-3 pt-2">
                          {q.options.map((opt, optIdx) => {
                            const isSelected = selectedOpt === optIdx;
                            const isCorrect = optIdx === q.correctIndex;

                            let optStyle: React.CSSProperties = {
                              backgroundColor: 'var(--bg-surface-elevated)',
                              borderColor: 'var(--border-subtle)',
                              color: 'var(--text-primary)',
                            };

                            if (isAnswered) {
                              if (isCorrect) {
                                optStyle = {
                                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                  borderColor: 'var(--accent-emerald)',
                                  color: 'var(--text-primary)',
                                };
                              } else if (isSelected) {
                                optStyle = {
                                  backgroundColor: 'rgba(244, 63, 94, 0.15)',
                                  borderColor: 'var(--accent-rose)',
                                  color: 'var(--text-primary)',
                                };
                              } else {
                                optStyle = {
                                  backgroundColor: 'var(--bg-surface)',
                                  borderColor: 'var(--border-subtle)',
                                  color: 'var(--text-muted)',
                                  opacity: 0.5,
                                };
                              }
                            }

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                disabled={isAnswered}
                                onClick={() => {
                                  const next = { ...userAnswers, [qIdx]: optIdx };
                                  setUserAnswers(next);
                                  let correctCount = 0;
                                  Object.entries(next).forEach(([idx, chosen]) => {
                                    if (quizQuestions[parseInt(idx)]?.correctIndex === chosen) {
                                      correctCount++;
                                    }
                                  });
                                  setScore(correctCount);
                                }}
                                style={optStyle}
                                className="w-full min-h-[56px] sm:min-h-[66px] p-4 sm:p-5 rounded-2xl border text-right transition-all flex items-center justify-between gap-4 text-sm sm:text-lg leading-relaxed cursor-pointer shadow-xs hover:border-blue-400 active:scale-[0.99]"
                              >
                                <div className="flex items-center gap-3 sm:gap-4 flex-1 overflow-x-auto no-scrollbar py-0.5">
                                  <span
                                    style={{
                                      backgroundColor:
                                        isAnswered && isCorrect
                                          ? 'var(--accent-emerald)'
                                          : isAnswered && isSelected
                                          ? 'var(--accent-rose)'
                                          : 'var(--bg-surface)',
                                      borderColor: 'var(--border-prominent)',
                                      color:
                                        isAnswered && (isCorrect || isSelected)
                                          ? '#ffffff'
                                          : 'var(--text-primary)',
                                    }}
                                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center shrink-0 border shadow-xs"
                                  >
                                    {optionLabels[optIdx] || optIdx + 1}
                                  </span>
                                  <div className="flex-1 text-right font-bold text-sm sm:text-lg">
                                    <MathRenderer text={opt} />
                                  </div>
                                </div>

                                {isAnswered && isCorrect && (
                                  <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                                )}
                                {isAnswered && isSelected && !isCorrect && (
                                  <XCircle className="w-6 h-6 text-rose-500 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Explanation Card upon answering */}
                        {isAnswered && (
                          <div
                            style={{
                              backgroundColor: 'var(--bg-surface-elevated)',
                              borderColor: 'var(--border-prominent)',
                            }}
                            className="p-5 sm:p-6 rounded-2xl border text-sm sm:text-base leading-relaxed space-y-2 animate-in fade-in shadow-xs"
                          >
                            <div className="font-extrabold flex items-center gap-2" style={{ color: 'var(--accent-primary)' }}>
                              <Sparkles className="w-5 h-5" />
                              <span>{content.quizTab.explanationTitle}</span>
                            </div>
                            <div className="font-bold" style={{ color: 'var(--text-primary)' }}>
                              {q.hint ? (
                                <MathRenderer text={q.hint} />
                              ) : (
                                <span>{content.quizTab.defaultExplanationFormat.replace('{letter}', optionLabels[q.correctIndex])}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: STUDY GUIDE (الزتونة) */}
          {activeTab === 'guide' && (
            <div className="max-w-4xl mx-auto py-4 space-y-6">
              {isGuideReady && (
                <div
                  className="p-4 sm:p-6 rounded-3xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 transition-all shadow-sm"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
                      style={{
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="text-sm sm:text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>
                        ملخص المحاضرة للمذاكرة والطباعة (PDF)
                      </div>
                      <div className="text-xs sm:text-sm font-medium mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        نسخة منسقة تشمل كافة القوانين والشروحات والأمثلة المحلولة
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadStudyGuidePdf}
                    disabled={downloadingAssetId !== null}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold border transition-all shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      borderColor: 'var(--accent-primary)',
                      color: isGirls && isDark ? '#0D0811' : (!isGirls && isDark ? '#0B0F14' : '#ffffff'),
                    }}
                  >
                    {downloadingAssetId === 'study-guide' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>تحميل ملخص المذاكرة (PDF)</span>
                  </button>
                </div>
              )}

              {/* Study Guide Content Card */}
              <div
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  boxShadow: 'var(--card-shadow)',
                }}
                className="p-6 sm:p-10 rounded-3xl border"
              >
                <StudyGuideViewer content={guideText} />
              </div>
            </div>
          )}

          {/* TAB 5: FLASHCARDS VIEWER */}
          {activeTab === 'flashcards' && (
            <div className="max-w-4xl mx-auto py-4">
              <div
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  boxShadow: 'var(--card-shadow)',
                }}
                className="p-6 sm:p-10 rounded-3xl border"
              >
                <FlashcardsViewer cards={flashcards} />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Academic Footer */}
      <footer
        style={{
          borderColor: 'var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
        }}
        className="mt-20 border-t py-8 px-4 text-center transition-colors"
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          <div>
            <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{content.footer.copyright}</p>
            <p className="mt-0.5">{content.footer.description}</p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-bold hover:underline"
            style={{ color: 'var(--accent-primary)' }}
          >
            <span>← العودة للرئيسية</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}

export default function LecturePage() {
  return (
    <Suspense fallback={<LectureLoadingSkeleton />}>
      <LectureContent />
    </Suspense>
  );
}
