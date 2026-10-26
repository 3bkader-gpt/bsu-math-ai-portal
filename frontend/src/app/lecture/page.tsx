'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import 'katex/dist/katex.min.css';
import MathRenderer from '@/components/MathRenderer';
import StudyGuideViewer from '@/components/StudyGuideViewer';
import FlashcardsViewer from '@/components/FlashcardsViewer';
import ThemeToggle from '@/components/ThemeToggle';
import { StudentGamificationPill } from '@/components/gamification/StudentGamificationPill';
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
  GraduationCap,
  Brain,
  Coffee,
  Menu
} from 'lucide-react';
import MobileNavDrawer from '@/components/MobileNavDrawer';
import StaplePin3D from '@/components/StaplePin3D';
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
import {
  createMediaDetector,
  createQuizDetector,
  createFlashcardDetector,
  trackStudyGuideRead,
  trackQuizQuestionAnswered,
} from '@/modules/telemetry';
import {
  recordPlaybackProgress,
  recordImmediateTransition,
  flushResumeState,
  getLocalResumeState,
} from '@/modules/gamification/resume';
import { MistakeNotebookModal, SessionFlowBar, EthicalWrapUpModal, ConfidenceSelector } from '@/modules/gamification/ui';
import {
  BURNOUT,
  nextHintAction,
  shouldShowBurnoutRelief,
  splitFadedSteps,
  splitHintTiers,
  type HintTier,
} from '@/modules/gamification/core/hintLadder';
import BurnoutReliefModal from '@/modules/gamification/ui/BurnoutReliefModal';
import {
  diagnoseWrongAnswer,
  ETHICAL_EXIT,
  pickPraise,
  trackPraise,
  type Persona,
} from '@/modules/gamification/core/compassionateFeedback';
import {
  type ConfidenceLevel,
  getConfidenceFeedback,
} from '@/modules/gamification/core/confidence';
import { vibrateCorrect, vibrateWrong } from '@/lib/haptics';
import { playSound } from '@/lib/audio/soundEngine';
import { triggerConfetti } from '@/lib/effects/confetti';
import { recordCohortContribution } from '@/modules/gamification/supabase/cohortChallenge';

const DEFAULT_MATH_FLASHCARDS: Flashcard[] = [
  {
    question: 'ما هو تعريف المشتقة الاتجاهية لدالة القياس ∇f؟',
    answer: 'هي معدل تغير الدالة f في اتجاه متجه الوحدة u، وتساوي حاصل الضرب القياسي: Du f = ∇f · u',
  },
  {
    question: 'متى يقال لمجال متجهي F إنه محافظ (Conservative Field)؟',
    answer: 'إذا وجد دالة جهد قياسية φ بحيث F = ∇φ، ويكافئ ذلك هندسياً أن دوران المجال curl(F) = 0.',
  },
  {
    question: 'ما هو الشرط الضروري والكافي لتعامد منحنيين في المستوى الإقليدي؟',
    answer: 'أن يكون حاصل ضرب ميلي المماسين عند نقطة التقاطع يساوي -1، أي m1 · m2 = -1.',
  },
  {
    question: 'ما هو تعريف فضاء المتجهات التآلفي (Affine Space)؟',
    answer: 'هو فضاء هندسي يمكن فيه الانتقال بين النقاط بمتجهات الإزاحة دون الاعتماد على نقطة أصل ثابتة.',
  },
];

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
  const tabParam = searchParams.get('tab') as 'audio' | 'video' | 'quiz' | 'guide' | 'flashcards' | null;
  const timeParam = searchParams.get('t') ? parseFloat(searchParams.get('t')!) : null;
  const initialSeekTimeRef = useRef<number | null>(timeParam);

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
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Active Tab with immediate transition logging
  const [activeTab, setActiveTabState] = useState<'audio' | 'video' | 'quiz' | 'guide' | 'flashcards'>('audio');
  const activeTabRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeTab]);

  const setActiveTab = (tab: 'audio' | 'video' | 'quiz' | 'guide' | 'flashcards') => {
    setActiveTabState(tab);
    if (lectureBundle) {
      recordImmediateTransition(lectureBundle.id, tab, {
        lectureNum: lectureBundle.lecture_num,
        subjectName,
        lectureTitle: lectureBundle.title,
      });
    }
  };

  // Restore saved tab or seek time from URL or localStorage
  useEffect(() => {
    if (tabParam) {
      setActiveTabState(tabParam);
    } else if (lectureIdParam) {
      const saved = getLocalResumeState();
      if (saved && saved.lectureId === parseInt(lectureIdParam, 10)) {
        if (saved.lastTab) setActiveTabState(saved.lastTab);
        if (initialSeekTimeRef.current === null) {
          if (saved.lastTab === 'audio' && saved.audioSec) {
            initialSeekTimeRef.current = saved.audioSec;
          } else if (saved.lastTab === 'video' && saved.videoSec) {
            initialSeekTimeRef.current = saved.videoSec;
          }
        }
      }
    }
  }, [lectureIdParam, tabParam]);

  // Quiz Engine
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [showHints, setShowHints] = useState<Record<number, boolean>>({});
  const [score, setScore] = useState<number | null>(null);
  const [showMistakeNotebook, setShowMistakeNotebook] = useState(false);
  const questionStartTimesRef = useRef<Record<number, number>>({});

  // Phase 3 — Cognitive Guard (hint ladder + burnout relief + flow window)
  const [hintTier, setHintTier] = useState<Record<number, HintTier>>({});
  const [consecutiveWrong, setConsecutiveWrong] = useState(0);
  const [showBurnoutRelief, setShowBurnoutRelief] = useState(false);
  const burnoutShownRef = useRef(false);
  const burnoutTimerRef = useRef<number | null>(null);
  const quizCardRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Phase 4 — Compassionate feedback (praise bank + diagnostics + micro-delight)
  const [answerFeedback, setAnswerFeedback] = useState<Record<number, string>>({});
  const [showEthicalExit, setShowEthicalExit] = useState(false);
  const [ethicalExitPanelOpen, setEthicalExitPanelOpen] = useState(false);
  const [ethicalWrapUpOpen, setEthicalWrapUpOpen] = useState(false);
  const [easterEgg, setEasterEgg] = useState<string | null>(null);
  const praiseRecentRef = useRef<string[]>([]);
  const correctStreakRef = useRef(0);

  // Phase 5 — Fair play & meta-cognition
  const [confidenceLevels, setConfidenceLevels] = useState<Record<number, ConfidenceLevel>>({});

  // Seed each question's dwell clock on first visibility (scroll-into-view).
  useEffect(() => {
    if (activeTab !== 'quiz' || quizQuestions.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const qIdx = Number((entry.target as HTMLElement).dataset.qIdx);
          if (Number.isNaN(qIdx)) continue;
          if (!questionStartTimesRef.current[qIdx] && userAnswers[qIdx] === undefined) {
            questionStartTimesRef.current[qIdx] = Date.now();
          }
        }
      },
      { threshold: 0.4 }
    );
    Object.entries(quizCardRefs.current).forEach(([idx, el]) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [activeTab, quizQuestions, userAnswers]);

  // Stall check: unanswered question visible for >= 2 minutes → relief modal.
  useEffect(() => {
    if (activeTab !== 'quiz' || showBurnoutRelief || burnoutShownRef.current) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      for (const [idxStr, start] of Object.entries(questionStartTimesRef.current)) {
        const qIdx = Number(idxStr);
        if (userAnswers[qIdx] !== undefined) continue;
        if (now - start >= BURNOUT.dwellMsThreshold) {
          burnoutShownRef.current = true;
          setShowBurnoutRelief(true);
          return;
        }
      }
    }, 15_000);
    return () => window.clearInterval(id);
  }, [activeTab, showBurnoutRelief, userAnswers, quizQuestions]);

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

  // Telemetry Detector Refs
  const audioDetectorRef = useRef<ReturnType<typeof createMediaDetector> | null>(null);
  const videoDetectorRef = useRef<ReturnType<typeof createMediaDetector> | null>(null);
  const quizDetectorRef = useRef<ReturnType<typeof createQuizDetector> | null>(null);
  const flashcardDetectorRef = useRef<ReturnType<typeof createFlashcardDetector> | null>(null);

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

        setLectureBundle(bundle);

        // Initialize Telemetry Detectors
        audioDetectorRef.current = createMediaDetector({
          lectureId: bundle.id,
          kind: 'audio',
        });
        videoDetectorRef.current = createMediaDetector({
          lectureId: bundle.id,
          kind: 'video',
        });
        quizDetectorRef.current = createQuizDetector(bundle.id);
        flashcardDetectorRef.current = createFlashcardDetector(bundle.id);

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
            const parsed = parseQuizMarkdown(quizAsset.content_text);
            setQuizQuestions(parsed);
            quizDetectorRef.current?.setTotalQuestions(parsed.length);
          } else if (quizAsset.stream_url) {
            fetch(getApiUrl(quizAsset.stream_url))
              .then((r) => r.text())
              .then((text) => {
                if (isMounted) {
                  const parsed = parseQuizMarkdown(text);
                  setQuizQuestions(parsed);
                  quizDetectorRef.current?.setTotalQuestions(parsed.length);
                }
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
            const parsed = parseFlashcardsMarkdown(cardsAsset.content_text);
            const finalCards = parsed && parsed.length > 0 ? parsed : DEFAULT_MATH_FLASHCARDS;
            setFlashcards(finalCards);
            flashcardDetectorRef.current?.setTotalCards(finalCards.length);
          } else if (cardsAsset.stream_url) {
            fetch(getApiUrl(cardsAsset.stream_url))
              .then((r) => r.text())
              .then((text) => {
                if (isMounted) {
                  const parsed = parseFlashcardsMarkdown(text);
                  const finalCards = parsed && parsed.length > 0 ? parsed : DEFAULT_MATH_FLASHCARDS;
                  setFlashcards(finalCards);
                  flashcardDetectorRef.current?.setTotalCards(finalCards.length);
                }
              })
              .catch(() => {
                if (isMounted) setFlashcards(DEFAULT_MATH_FLASHCARDS);
              });
          } else {
            setFlashcards(DEFAULT_MATH_FLASHCARDS);
          }
        } else {
          setFlashcards(DEFAULT_MATH_FLASHCARDS);
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

  // Synchronize Quiz and Flashcard Detectors
  useEffect(() => {
    if (lectureBundle && quizQuestions.length > 0) {
      quizDetectorRef.current = createQuizDetector(
        lectureBundle.id,
        quizQuestions.length
      );
    }
  }, [lectureBundle?.id, quizQuestions.length]);

  useEffect(() => {
    if (lectureBundle && flashcards.length > 0) {
      flashcardDetectorRef.current = createFlashcardDetector(
        lectureBundle.id,
        flashcards.length
      );
    }
  }, [lectureBundle?.id, flashcards.length]);

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
        backgroundColor: 'transparent',
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
        <div className="max-w-6xl mx-auto px-3 sm:px-6 min-h-[3.25rem] sm:min-h-[3.75rem] py-1.5 flex items-center justify-between gap-2 sm:gap-3">
          
          {/* Back to Courses Link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl border text-[11px] sm:text-xs font-bold transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98] group shrink-0"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            <ArrowRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:-translate-x-0.5 transition-transform shrink-0" />
            <span className="hidden xs:inline">رجوع للمقررات</span>
            <span className="xs:hidden">رجوع</span>
          </Link>

          {/* Subject & Doctor Badge in Center (Visible on md+ where space is ample, eliminating ugly 'هـ...' clipping on mobile) */}
          <div className="hidden md:flex items-center gap-2 min-w-0">
            {subjectName && (
              <span
                className="text-xs font-bold px-3 py-0.5 rounded-lg border whitespace-nowrap"
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
                className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border opacity-90 whitespace-nowrap"
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
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <StudentGamificationPill isGirls={currentPersona === 'girls'} isDark={currentMode === 'dark'} />
            <div className="hidden md:inline-flex">
              <ThemeToggle />
            </div>
            {/* Mobile Hamburger Drawer Trigger */}
            <button
              onClick={() => setIsMobileNavOpen(true)}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              className="md:hidden p-1.5 rounded-lg border flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0"
              title="القائمة والإعدادات"
              aria-label="القائمة والإعدادات"
            >
              <Menu className="w-4.5 h-4.5" style={{ color: 'var(--accent-primary)' }} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Spacious Lecture Page Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-7 space-y-4 sm:space-y-6">
        
        {/* Lecture Hero Banner Card */}
        <section
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--card-shadow)',
          }}
          className="p-3.5 sm:p-7 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 transition-all"
        >
          <div className="flex items-start sm:items-center gap-3 sm:gap-5 min-w-0 flex-1">
            {/* Big Lecture Number */}
            <div
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: isGirls && isDark ? '#0D0811' : (!isGirls && isDark ? '#0B0F14' : '#ffffff'),
              }}
              className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-base sm:text-2xl shadow-xs shrink-0"
            >
              {isGirls ? `🌸 ${lectureBundle.lecture_num}` : lectureBundle.lecture_num}
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className="text-xs font-bold"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  {subjectName || 'المقرر الدراسي'}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>•</span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {isGirls ? 'جاهزة ومية مية 🎀' : 'المحاضرة متاحة'}
                </span>
                {lectureBundle.doctor && (
                  <>
                    <span className="hidden sm:inline" style={{ color: 'var(--text-muted)' }}>•</span>
                    <span className="text-[11px] font-bold sm:hidden" style={{ color: 'var(--text-muted)' }}>
                      {lectureBundle.doctor}
                    </span>
                  </>
                )}
              </div>

              <h1
                className="text-base sm:text-2xl font-black leading-snug sm:leading-tight break-words"
                style={{ color: 'var(--text-primary)' }}
              >
                {lectureBundle.title}
              </h1>

              <p className="text-[11px] sm:text-xs font-medium break-words" style={{ color: 'var(--text-muted)' }}>
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
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              boxShadow: 'var(--card-shadow)',
            }}
            className="p-3.5 sm:p-5 rounded-2xl border space-y-3 transition-all"
          >
            {/* Header: Clean & Integrated */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8.5 h-8.5 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    color: '#10b981',
                  }}
                >
                  <BookOpen className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <span>ملفات المحاضرة الأصلية المعتمدة</span>
                  </h3>
                  <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    المصادر الرسمية المرفوعة للمحاضرة للتحميل المباشر والمذاكرة
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span>📄</span>
                <span>{sortedOriginalPdfs.length === 1 ? 'ملف أصلي متاح' : `${sortedOriginalPdfs.length} ملفات أصلية`}</span>
              </div>
            </div>

            {/* File Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sortedOriginalPdfs.map((pdf) => {
                const info = getOriginalPdfDetails(pdf, lectureBundle.lecture_num);
                const isDownloading = downloadingAssetId === pdf.id;
                const isBook = info.isBook;

                return (
                  <div
                    key={pdf.id}
                    onClick={() => !downloadingAssetId && handleDownloadOriginalFile(info.downloadUrl, info.suggestedFilename, pdf.id)}
                    style={{
                      backgroundColor: isDark
                        ? (isBook ? 'rgba(59, 130, 246, 0.12)' : 'rgba(245, 158, 11, 0.12)')
                        : (isBook ? 'rgba(59, 130, 246, 0.06)' : 'rgba(245, 158, 11, 0.06)'),
                      borderColor: isDark
                        ? (isBook ? 'rgba(59, 130, 246, 0.35)' : 'rgba(245, 158, 11, 0.35)')
                        : (isBook ? '#BFDBFE' : '#FDE68A'),
                    }}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer group hover:scale-[1.01] active:scale-[0.99] shadow-xs ${
                      isBook
                        ? 'hover:border-blue-500 hover:bg-blue-500/10'
                        : 'hover:border-amber-500 hover:bg-amber-500/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Icon Container */}
                      <div
                        style={{
                          backgroundColor: isDark
                            ? (isBook ? 'rgba(59, 130, 246, 0.25)' : 'rgba(245, 158, 11, 0.25)')
                            : (isBook ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)'),
                          color: isDark
                            ? (isBook ? '#93C5FD' : '#FCD34D')
                            : (isBook ? '#1D4ED8' : '#B45309'),
                        }}
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-xl shadow-xs"
                      >
                        {info.badgeEmoji}
                      </div>

                      {/* Details - Full text without clipping */}
                      <div className="min-w-0 text-right space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            style={{
                              backgroundColor: isDark
                                ? (isBook ? 'rgba(59, 130, 246, 0.25)' : 'rgba(245, 158, 11, 0.25)')
                                : (isBook ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)'),
                              color: isDark
                                ? (isBook ? '#93C5FD' : '#FCD34D')
                                : (isBook ? '#1E40AF' : '#92400E'),
                              borderColor: isDark
                                ? (isBook ? 'rgba(59, 130, 246, 0.4)' : 'rgba(245, 158, 11, 0.4)')
                                : (isBook ? '#93C5FD' : '#FCD34D'),
                            }}
                            className="text-[10px] font-black px-2 py-0.5 rounded-md border"
                          >
                            {info.badgeText}
                          </span>
                          {info.formattedSize && (
                            <span
                              style={{ color: 'var(--text-muted)' }}
                              className="inline-flex items-center text-[10px] sm:text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] shrink-0"
                            >
                              <bdi dir="ltr">{info.formattedSize}</bdi>
                            </span>
                          )}
                        </div>
                        <h4
                          className="text-xs sm:text-sm font-black leading-snug line-clamp-2"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {info.title}
                        </h4>
                        {info.subtitle && (
                          <p
                            className="text-[11px] font-bold leading-relaxed line-clamp-1"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {info.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Dedicated Download Action Button */}
                    <div className="shrink-0">
                      <button
                        type="button"
                        disabled={downloadingAssetId !== null}
                        style={{
                          backgroundColor: isBook ? '#2563EB' : '#D97706',
                          borderColor: isBook ? '#1D4ED8' : '#B45309',
                        }}
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-xs border cursor-pointer hover:scale-105 active:scale-95 text-white"
                        title={`تحميل ${info.title}`}
                        aria-label={`تحميل ${info.title}`}
                      >
                        {isDownloading ? (
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                        ) : (
                          <Download className="w-4 h-4 text-white group-hover:translate-y-0.5 transition-transform" />
                        )}
                      </button>
                    </div>
                  </div>
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

        {/* Ergonomic & Spacious Navigation Dock */}
        <nav
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--card-shadow)',
          }}
          className="relative rounded-2xl border p-1 sm:p-1.5 transition-all overflow-hidden"
          aria-label="أقسام المحاضرة"
        >
          <div
            className="flex items-center gap-1.5 sm:gap-2.5 overflow-x-auto overscroll-x-contain py-1 px-2.5 sm:px-3 w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:justify-center"
            style={{
              maskImage: 'linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)',
              WebkitMaskImage: 'linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)',
            }}
          >
            {/* TAB 1: AUDIO RECORD */}
            <button
              ref={activeTab === 'audio' ? activeTabRef : null}
              type="button"
              onClick={() => setActiveTab('audio')}
              className={`shrink-0 inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-150 cursor-pointer select-none ${
                activeTab === 'audio'
                  ? isGirls
                    ? 'bg-pink-500/15 text-pink-600 dark:text-pink-300 border border-pink-500/30 font-black shadow-xs'
                    : 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30 font-black shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
              }`}
            >
              {!isGirls && <Headphones className={`w-4 h-4 shrink-0 ${activeTab === 'audio' ? 'text-cyan-500' : 'opacity-70'}`} />}
              <span className="shrink-0">{isGirls ? content.personas.girls.tabs.audio : content.personas.boys.tabs.audio}</span>
            </button>

            {/* TAB 2: VIDEO */}
            <button
              ref={activeTab === 'video' ? activeTabRef : null}
              type="button"
              onClick={() => setActiveTab('video')}
              className={`shrink-0 inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-150 cursor-pointer select-none ${
                activeTab === 'video'
                  ? isGirls
                    ? 'bg-pink-500/15 text-pink-600 dark:text-pink-300 border border-pink-500/30 font-black shadow-xs'
                    : 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30 font-black shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
              }`}
            >
              {!isGirls && <Video className={`w-4 h-4 shrink-0 ${activeTab === 'video' ? 'text-purple-500' : 'opacity-70'}`} />}
              <span className="shrink-0">{isGirls ? content.personas.girls.tabs.video : content.personas.boys.tabs.video}</span>
            </button>

            {/* TAB 3: QUIZ */}
            <button
              ref={activeTab === 'quiz' ? activeTabRef : null}
              type="button"
              onClick={() => setActiveTab('quiz')}
              className={`shrink-0 inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-150 cursor-pointer select-none ${
                activeTab === 'quiz'
                  ? isGirls
                    ? 'bg-pink-500/15 text-pink-600 dark:text-pink-300 border border-pink-500/30 font-black shadow-xs'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 font-black shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
              }`}
            >
              {!isGirls && <HelpCircle className={`w-4 h-4 shrink-0 ${activeTab === 'quiz' ? 'text-amber-500' : 'opacity-70'}`} />}
              <span className="shrink-0">{isGirls ? content.personas.girls.tabs.quiz : content.personas.boys.tabs.quiz}</span>
              {quizQuestions.length > 0 && (
                <span
                  className="inline-flex items-center justify-center text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full font-mono shrink-0 shadow-2xs"
                  style={{
                    backgroundColor: activeTab === 'quiz'
                      ? (isGirls ? 'rgba(236, 72, 153, 0.25)' : 'rgba(245, 158, 11, 0.25)')
                      : 'var(--bg-surface-elevated)',
                    color: activeTab === 'quiz'
                      ? (isGirls ? '#ec4899' : '#d97706')
                      : 'var(--text-muted)',
                    border: '1px solid',
                    borderColor: activeTab === 'quiz'
                      ? (isGirls ? 'rgba(236, 72, 153, 0.35)' : 'rgba(245, 158, 11, 0.35)')
                      : 'var(--border-subtle)',
                  }}
                >
                  <bdi dir="ltr">{quizQuestions.length}</bdi>
                </span>
              )}
            </button>

            {/* TAB 4: STUDY GUIDE */}
            <button
              ref={activeTab === 'guide' ? activeTabRef : null}
              type="button"
              onClick={() => setActiveTab('guide')}
              className={`shrink-0 inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-150 cursor-pointer select-none ${
                activeTab === 'guide'
                  ? isGirls
                    ? 'bg-pink-500/15 text-pink-600 dark:text-pink-300 border border-pink-500/30 font-black shadow-xs'
                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-black shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
              }`}
            >
              {!isGirls && <FileText className={`w-4 h-4 shrink-0 ${activeTab === 'guide' ? 'text-emerald-500' : 'opacity-70'}`} />}
              <span className="shrink-0">{isGirls ? content.personas.girls.tabs.guide : content.personas.boys.tabs.guide}</span>
            </button>

            {/* TAB 5: FLASHCARDS */}
            <button
              ref={activeTab === 'flashcards' ? activeTabRef : null}
              type="button"
              onClick={() => setActiveTab('flashcards')}
              className={`shrink-0 inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-150 cursor-pointer select-none ${
                activeTab === 'flashcards'
                  ? isGirls
                    ? 'bg-pink-500/15 text-pink-600 dark:text-pink-300 border border-pink-500/30 font-black shadow-xs'
                    : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 font-black shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
              }`}
            >
              {!isGirls && <Layers className={`w-4 h-4 shrink-0 ${activeTab === 'flashcards' ? 'text-indigo-500' : 'opacity-70'}`} />}
              <span className="shrink-0">{isGirls ? content.personas.girls.tabs.flashcards : content.personas.boys.tabs.flashcards}</span>
              {flashcards.length > 0 && (
                <span
                  className="inline-flex items-center justify-center text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full font-mono shrink-0 shadow-2xs"
                  style={{
                    backgroundColor: activeTab === 'flashcards'
                      ? (isGirls ? 'rgba(236, 72, 153, 0.25)' : 'rgba(99, 102, 241, 0.25)')
                      : 'var(--bg-surface-elevated)',
                    color: activeTab === 'flashcards'
                      ? (isGirls ? '#ec4899' : '#6366f1')
                      : 'var(--text-muted)',
                    border: '1px solid',
                    borderColor: activeTab === 'flashcards'
                      ? (isGirls ? 'rgba(236, 72, 153, 0.35)' : 'rgba(99, 102, 241, 0.35)')
                      : 'var(--border-subtle)',
                  }}
                >
                  <bdi dir="ltr">{flashcards.length}</bdi>
                </span>
              )}
            </button>
          </div>
        </nav>

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
                  className="p-6 sm:p-10 rounded-3xl border text-center space-y-6 relative overflow-hidden"
                >
                  <audio
                    ref={audioRef}
                    src={getApiUrl(audioAsset.stream_url)}
                    onTimeUpdate={() => {
                      if (audioRef.current) {
                        const cur = audioRef.current.currentTime;
                        setCurrentTime(cur);
                        audioDetectorRef.current?.onTimeUpdate(cur);
                        if (lectureBundle) {
                          recordPlaybackProgress(lectureBundle.id, 'audio', cur, {
                            lectureNum: lectureBundle.lecture_num,
                            subjectName,
                            lectureTitle: lectureBundle.title,
                          });
                        }
                      }
                    }}
                    onLoadedMetadata={() => {
                      if (audioRef.current) {
                        const dur = audioRef.current.duration;
                        setDuration(dur);
                        audioDetectorRef.current?.setDuration(dur);
                        if (initialSeekTimeRef.current !== null && initialSeekTimeRef.current > 0) {
                          audioRef.current.currentTime = Math.min(initialSeekTimeRef.current, dur);
                          setCurrentTime(audioRef.current.currentTime);
                          initialSeekTimeRef.current = null;
                        }
                      }
                    }}
                    onPause={() => {
                      flushResumeState();
                    }}
                    onEnded={() => {
                      setIsPlaying(false);
                      audioDetectorRef.current?.onEnded();
                      flushResumeState();
                    }}
                    onError={(e) => console.error('Audio playback error:', e)}
                  />

                  {/* Realistic 3D Metallic Staple Pin */}
                  <StaplePin3D isGirls={isGirls} className="absolute top-2.5 left-2.5 sm:top-3.5 sm:left-3.5" />

                  {/* Header Badge & Track Info */}
                  <div className="flex flex-col items-center gap-2">
                    <span
                      style={{
                        backgroundColor: 'var(--bg-surface-elevated)',
                        borderColor: 'var(--border-prominent)',
                        color: 'var(--accent-primary)',
                      }}
                      className="px-3.5 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-1.5 shadow-xs"
                    >
                      <Headphones className="w-3.5 h-3.5 shrink-0" />
                      <span>{isGirls ? '🌸 ريكورد الشرح والروقان • شرح رايق بالبلدي' : '🎙️ شرح رايق بالبلدي • تسجيل المحاضرة'}</span>
                    </span>

                    <h3 className="text-xl sm:text-2xl font-black leading-snug max-w-xl mx-auto" style={{ color: 'var(--text-primary)' }}>
                      {audioAsset.title}
                    </h3>

                    <p className="text-xs sm:text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                      {content.audioTab.descriptionFormat.replace(
                        '{size}',
                        (((audioAsset.file_size_bytes || 0) / (1024 * 1024)).toFixed(1))
                      )}
                    </p>
                  </div>

                  {/* Dynamic Audio Waveform Visualizer */}
                  <div
                    style={{
                      backgroundColor: 'var(--bg-surface-elevated)',
                      borderColor: 'var(--border-subtle)',
                    }}
                    className="p-4 sm:p-6 rounded-2xl border flex items-end justify-center gap-1 sm:gap-1.5 h-24 sm:h-28 max-w-xl mx-auto overflow-hidden"
                  >
                    {[
                      35, 60, 45, 80, 55, 90, 70, 40, 65, 85,
                      95, 60, 40, 75, 90, 50, 70, 85, 60, 45,
                      80, 95, 65, 40, 55, 75, 50, 35
                    ].map((heightPct, idx) => {
                      const barProgress = (idx / 28) * (duration || 100);
                      const isPast = currentTime >= barProgress;
                      return (
                        <div
                          key={idx}
                          style={{
                            height: `${heightPct}%`,
                            width: '6px',
                            backgroundColor: isPast ? 'var(--accent-primary)' : 'var(--border-prominent)',
                            animationDelay: isPlaying ? `${(idx % 8) * 0.12}s` : '0s',
                            transition: 'background-color 0.15s ease',
                          }}
                          className={`min-w-[4px] rounded-full ${
                            isPlaying ? 'waveform-bar-active' : 'opacity-60'
                          }`}
                        />
                      );
                    })}
                  </div>

                  {/* Audio Progress Scrubber */}
                  <div className="space-y-2 max-w-xl mx-auto">
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
                      style={{
                        accentColor: 'var(--accent-primary)',
                      }}
                      className="w-full cursor-pointer h-2 rounded-lg bg-black/10 dark:bg-white/10"
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
                      {content.audioTab.processing}
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
                    onLoadedMetadata={(e) => {
                      const dur = e.currentTarget.duration;
                      videoDetectorRef.current?.setDuration(dur);
                      if (initialSeekTimeRef.current !== null && initialSeekTimeRef.current > 0) {
                        e.currentTarget.currentTime = Math.min(initialSeekTimeRef.current, dur);
                        initialSeekTimeRef.current = null;
                      }
                    }}
                    onTimeUpdate={(e) => {
                      const cur = e.currentTarget.currentTime;
                      videoDetectorRef.current?.onTimeUpdate(cur);
                      if (lectureBundle) {
                        recordPlaybackProgress(lectureBundle.id, 'video', cur, {
                          lectureNum: lectureBundle.lecture_num,
                          subjectName,
                          lectureTitle: lectureBundle.title,
                        });
                      }
                    }}
                    onPause={() => {
                      flushResumeState();
                    }}
                    onEnded={() => {
                      videoDetectorRef.current?.onEnded();
                      flushResumeState();
                    }}
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
              {/* Phase 3.4 — 25-min structured flow indicator (pure UI island) */}
              {quizQuestions.length > 0 && <SessionFlowBar isGirls={isGirls} />}
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
                              setHintTier({});
                              setConfidenceLevels({});
                              setScore(null);
                              setConsecutiveWrong(0);
                              setAnswerFeedback({});
                              setShowEthicalExit(false);
                              correctStreakRef.current = 0;
                              burnoutShownRef.current = false;
                              questionStartTimesRef.current = {};
                              quizDetectorRef.current?.reset();
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

                        <button
                          type="button"
                          onClick={() => setShowMistakeNotebook(true)}
                          style={{
                            backgroundColor: 'rgba(99, 102, 241, 0.12)',
                            borderColor: 'var(--accent-primary)',
                            color: 'var(--accent-primary)',
                          }}
                          className="px-4 py-2.5 rounded-2xl border text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95 shadow-xs"
                        >
                          <Brain className="w-4 h-4" />
                          <span>كراسة الأخطاء 🧠</span>
                        </button>

                        {/* Phase 4.4 — Ethical exit: stays visible once the quiz is completed;
                            clicking toggles the supportive panel (never self-destructs) */}
                        {showEthicalExit && (
                          <button
                            type="button"
                            onClick={() => setEthicalExitPanelOpen((prev) => !prev)}
                            style={{
                              backgroundColor: ethicalExitPanelOpen ? 'var(--accent-emerald)' : 'rgba(16, 185, 129, 0.12)',
                              borderColor: 'var(--accent-emerald)',
                              color: ethicalExitPanelOpen ? '#ffffff' : 'var(--accent-emerald)',
                            }}
                            className="px-4 py-2.5 rounded-2xl border text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95 shadow-xs animate-in fade-in"
                          >
                            <Coffee className="w-4 h-4" />
                            <span>{ETHICAL_EXIT.button(isGirls ? 'girls' : 'boys')}</span>
                          </button>
                        )}
                      </div>

                      {/* Phase 4.4 — Ethical exit supportive panel */}
                      {showEthicalExit && ethicalExitPanelOpen && (
                        <div
                          className="p-4 rounded-2xl border flex items-start justify-between gap-3 animate-in fade-in"
                          style={{
                            backgroundColor: 'rgba(16, 185, 129, 0.08)',
                            borderColor: 'var(--accent-emerald)',
                          }}
                        >
                          <p className="text-xs sm:text-sm font-black leading-relaxed flex-1" style={{ color: 'var(--text-primary)' }}>
                            {ETHICAL_EXIT.headline(isGirls ? 'girls' : 'boys')}
                          </p>
                          <button
                            type="button"
                            onClick={() => setEthicalWrapUpOpen(true)}
                            className="px-4 py-2 rounded-xl text-xs font-black shrink-0 cursor-pointer transition-all hover:scale-105 active:scale-95"
                            style={{ backgroundColor: 'var(--accent-emerald)', color: '#ffffff' }}
                          >
                            عرض ملخص يومك 📊
                          </button>
                        </div>
                      )}
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
                        data-q-idx={qIdx}
                        ref={(el) => {
                          quizCardRefs.current[qIdx] = el;
                        }}
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

                          {q.hint && !isAnswered && (
                            <button
                              type="button"
                              onClick={() => {
                                const current = (hintTier[qIdx] ?? 0) as HintTier;
                                if (current >= 3) return;
                                const nextTier = (current + 1) as HintTier;
                                setHintTier((prev) => ({ ...prev, [qIdx]: nextTier }));
                                setShowHints((prev) => ({ ...prev, [qIdx]: true }));
                              }}
                              className="text-xs sm:text-sm hover:underline flex items-center gap-1.5 transition-colors font-bold cursor-pointer"
                              style={{ color: 'var(--accent-amber)' }}
                            >
                              <Lightbulb className="w-4 h-4" />
                              <span>
                                {(() => {
                                  const tier = (hintTier[qIdx] ?? 0) as HintTier;
                                  if (tier === 0) return isGirls ? 'غششة صغننة 💡' : content.quizTab.showHint;
                                  return nextHintAction(tier) ?? content.quizTab.hideHint;
                                })()}
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
                          const feedbackMsg = answerFeedback[qIdx] ?? getQuizFeedback(qIdx, isCorrect, isGirls);
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
                                            ? 'ولا تشيلي هم خالص! التلمتري بيعلمنا أكتر.. بصي على التشخيص تحت أو جربي تاني 💪'
                                            : 'فداك يا هندسة! التشخيص تحت يقولك فين النقطة بالظبط 💡')}
                                    </p>
                                    {!isCorrect && answerFeedback[qIdx] && (
                                      <p
                                        className="text-xs sm:text-sm font-black mt-1.5 px-3 py-2 rounded-xl animate-in fade-in"
                                        style={{
                                          backgroundColor: 'rgba(245, 158, 11, 0.10)',
                                          border: '1px solid var(--accent-amber)',
                                          color: 'var(--text-primary)',
                                        }}
                                      >
                                        🧭 {answerFeedback[qIdx]}
                                      </p>
                                    )}
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
                                      setAnswerFeedback((prev) => {
                                        const copy = { ...prev };
                                        delete copy[qIdx];
                                        return copy;
                                      });
                                      setShowEthicalExit(false);
                                      questionStartTimesRef.current[qIdx] = Date.now();
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
                        {/* Phase 3.2 — Worked-example fading (steps present in newer quizzes) */}
                        {q.steps && q.steps.length > 0 && !isAnswered && (() => {
                          const { visible, hidden } = splitFadedSteps(q.steps, q.number);
                          const revealedKey = Number(`9${qIdx}`); // synthetic numeric key in the shared Record<number, boolean>
                          const revealed = showHints[revealedKey] ?? false;
                          return (
                            <div
                              className="p-4 sm:p-5 rounded-2xl border space-y-2.5 animate-in fade-in"
                              style={{
                                backgroundColor: 'var(--bg-surface-elevated)',
                                borderColor: 'var(--border-subtle)',
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <GraduationCap className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                                <span className="text-xs sm:text-sm font-black" style={{ color: 'var(--text-secondary)' }}>
                                  الحل النموذجي خطوة بخطوة — جربّي تكمّلي اللي متخفي بنفسك قبل ما تفتحيه
                                </span>
                              </div>
                              {visible.map((step, i) => (
                                <div key={`v${i}`} className="flex items-start gap-2.5 text-sm sm:text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                                  <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 mt-0.5" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--accent-primary)', border: '1px solid var(--border-subtle)' }}>{i + 1}</span>
                                  <MathRenderer text={step} />
                                </div>
                              ))}
                              {hidden.map((step, i) => (
                                <div key={`h${i}`} className="flex items-start gap-2.5">
                                  <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 mt-0.5" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px dashed var(--border-prominent)' }}>{visible.length + i + 1}</span>
                                  {revealed ? (
                                    <MathRenderer text={step} />
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setShowHints((prev) => ({ ...prev, [revealedKey]: true }))}
                                      className="text-xs font-black px-3 py-1.5 rounded-lg border border-dashed cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                                      style={{ color: 'var(--text-muted)', borderColor: 'var(--border-prominent)' }}
                                    >
                                      {isGirls ? 'كمّلي الخطوة دي بنفسك — اضغطي لو عايزة تشوفيها' : 'كمّل الخطوة دي بنفسك — اضغط لو عايز تشوفها'}
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        })()}

                        {showHints[qIdx] && q.hint && !isAnswered && (() => {
                          const tier = (hintTier[qIdx] ?? 1) as HintTier;
                          const { tier1, tier2 } = splitHintTiers(q.hint);
                          const revealed = tier >= 3
                            ? q.options[q.correctIndex] ?? ''
                            : tier >= 2
                            ? tier2
                            : tier1 || tier2;
                          return (
                            <div
                              style={{
                                backgroundColor: tier >= 3
                                  ? 'rgba(16, 185, 129, 0.10)'
                                  : 'rgba(245, 158, 11, 0.12)',
                                borderColor: tier >= 3 ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                              }}
                              className="p-4 sm:p-6 rounded-2xl border text-sm sm:text-base leading-relaxed flex items-start gap-3 animate-in fade-in"
                            >
                              {tier >= 3 ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                              ) : (
                                <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1 font-bold" style={{ color: 'var(--text-primary)' }}>
                                <span className={`font-extrabold ${tier >= 3 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                  {tier >= 3
                                    ? (isGirls ? 'إجابة السؤال يا باشمهندسة — هراجعها معاكي في الدفتر بكرة 📖' : 'إجابة السؤال يا هندسة — هراجعها معاك في الدفتر بكرة 📖')
                                    : getQuizHintPrefix(qIdx, isGirls)}
                                </span>
                                <MathRenderer text={revealed} />
                                {tier < 3 && (
                                  <span className="block text-[11px] sm:text-xs font-bold mt-2" style={{ color: 'var(--text-muted)' }}>
                                    الدرجة {tier} من 3 — لسه في درجات أعلى لو محتاج
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Phase 5.1 — Pre-Answer Confidence Assessment */}
                        <ConfidenceSelector
                          selected={confidenceLevels[qIdx] ?? 'medium'}
                          onChange={(lvl) => setConfidenceLevels((prev) => ({ ...prev, [qIdx]: lvl }))}
                          disabled={isAnswered}
                          isGirls={isGirls}
                        />

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
                                  quizDetectorRef.current?.onAnswerSelected(qIdx, optIdx);

                                  const start = questionStartTimesRef.current[qIdx] || (Date.now() - 4000);
                                  const durationMs = Math.max(1000, Date.now() - start);
                                  const userAnswerText = q.options[optIdx] ?? '';
                                  const correctAnswerText = q.options[q.correctIndex] ?? '';
                                  const isCorrect = optIdx === q.correctIndex;
                                  const tierUsed = (hintTier[qIdx] ?? 0) as HintTier;

                                  // Deterministic question hash
                                  let hashVal = 0;
                                  const cleanQ = q.question.trim().toLowerCase();
                                  for (let i = 0; i < cleanQ.length; i++) {
                                    hashVal = (hashVal << 5) - hashVal + cleanQ.charCodeAt(i);
                                    hashVal |= 0;
                                  }
                                  const questionHash = 'q_' + Math.abs(hashVal).toString(36);

                                  const chosenConfidence = confidenceLevels[qIdx] ?? 'medium';
                                  if (lectureBundle) {
                                    trackQuizQuestionAnswered(
                                      lectureBundle.id,
                                      qIdx,
                                      questionHash,
                                      q.question,
                                      optIdx,
                                      q.correctIndex,
                                      userAnswerText,
                                      correctAnswerText,
                                      isCorrect,
                                      durationMs,
                                      chosenConfidence,
                                      q.hint ?? '',
                                      tierUsed
                                    );
                                  }

                                  // Phase 6: Sybil-proof cohort challenge contribution
                                  if (isCorrect && questionHash) {
                                    recordCohortContribution('mock-weekly-challenge', questionHash);
                                  }

                                  // Cognitive Guard: consecutive-wrong streak
                                  setConsecutiveWrong((prev) => {
                                    const streak = isCorrect ? 0 : prev + 1;
                                    if (
                                      !burnoutShownRef.current &&
                                      shouldShowBurnoutRelief({
                                        consecutiveWrong: streak,
                                        dwellMs: durationMs,
                                      })
                                    ) {
                                      burnoutShownRef.current = true;
                                      setShowBurnoutRelief(true);
                                    }
                                    return streak;
                                  });

                                  // Phase 4 & Phase 5 — Compassionate feedback & meta-cognition
                                  const persona: Persona = isGirls ? 'girls' : 'boys';
                                  const confFeedback = getConfidenceFeedback(chosenConfidence, isCorrect, persona);

                                  if (isCorrect) {
                                    correctStreakRef.current += 1;
                                    const praise = confFeedback.message
                                      ? `${confFeedback.headline} ${confFeedback.message}`
                                      : pickPraise(persona, praiseRecentRef.current);
                                    praiseRecentRef.current = trackPraise(praiseRecentRef.current, praise);
                                    setAnswerFeedback((prev) => ({ ...prev, [qIdx]: praise }));
                                    vibrateCorrect();
                                    playSound('quiz_correct', { semitones: correctStreakRef.current - 1 });
                                  } else {
                                    correctStreakRef.current = 0;
                                    const errorMsg = confFeedback.isMisconception
                                      ? `${confFeedback.headline} ${confFeedback.message}`
                                      : diagnoseWrongAnswer(userAnswerText, correctAnswerText, persona).message;
                                    setAnswerFeedback((prev) => ({ ...prev, [qIdx]: errorMsg }));
                                    vibrateWrong();
                                    playSound('quiz_wrong');
                                  }

                                  let correctCount = 0;
                                  Object.entries(next).forEach(([idx, chosen]) => {
                                    if (quizQuestions[parseInt(idx)]?.correctIndex === chosen) {
                                      correctCount++;
                                    }
                                  });
                                  setScore(correctCount);

                                  if (Object.keys(next).length === quizQuestions.length) {
                                    quizDetectorRef.current?.submitQuiz(correctCount, quizQuestions.length);
                                    // Phase 4 — milestone confetti + ethical exit offer
                                    if (correctCount === quizQuestions.length) {
                                      triggerConfetti('epic');
                                    }
                                    setShowEthicalExit(true);
                                  }
                                }}
                                style={optStyle}
                                className="w-full min-h-[52px] sm:min-h-[66px] p-3.5 sm:p-5 rounded-2xl border text-right transition-all flex items-start sm:items-center justify-between gap-3 sm:gap-4 text-sm sm:text-lg leading-relaxed cursor-pointer shadow-xs hover:border-blue-400 active:scale-[0.99]"
                              >
                                <div className="flex items-start sm:items-center gap-2.5 sm:gap-4 flex-1 min-w-0 py-0.5">
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
                                    className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center shrink-0 border shadow-xs mt-0.5 sm:mt-0"
                                  >
                                    {optionLabels[optIdx] || optIdx + 1}
                                  </span>
                                  <div className="flex-1 min-w-0 text-right font-bold text-sm sm:text-lg overflow-x-auto no-scrollbar">
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
                className="p-6 sm:p-10 rounded-3xl border notebook-red-margin overflow-hidden"
              >
                <StudyGuideViewer
                  content={guideText}
                  onDwell={(dwellSec) => {
                    if (dwellSec === 60 && lectureBundle) {
                      trackStudyGuideRead(lectureBundle.id, 60);
                    }
                  }}
                />
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
                <FlashcardsViewer
                  cards={flashcards}
                  onCardFlipped={(cardIdx) => {
                    flashcardDetectorRef.current?.onCardFlipped(cardIdx);
                    if (lectureBundle) {
                      recordImmediateTransition(lectureBundle.id, 'flashcards', {
                        lectureNum: lectureBundle.lecture_num,
                        subjectName,
                        lectureTitle: lectureBundle.title,
                        cardIndex: cardIdx,
                      });
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Leitner Mistake Notebook Modal */}
      <MistakeNotebookModal
        isOpen={showMistakeNotebook}
        onClose={() => setShowMistakeNotebook(false)}
      />

      {/* Phase 4.4 — Ethical wrap-up (stats from this quiz attempt) */}
      <EthicalWrapUpModal
        isOpen={ethicalWrapUpOpen}
        onClose={() => setEthicalWrapUpOpen(false)}
        stats={{
          conceptsLearned: quizQuestions.length,
          cardsReviewed: flashcards.length || undefined,
          quizAccuracy: score !== null && quizQuestions.length > 0
            ? Math.round((score / quizQuestions.length) * 100)
            : undefined,
        }}
      />

      {/* Phase 4.5 — Mathematical easter eggs (π / e / 1729 trivia) */}
      {easterEgg && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in"
          onClick={() => setEasterEgg(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(ev) => ev.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border p-6 text-center shadow-2xl animate-in zoom-in-95"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-prominent)' }}
          >
            <div className="text-4xl mb-3">{easterEgg === 'pi' ? '🥧' : easterEgg === 'e' ? '📈' : '🚕'}</div>
            <h4 className="text-lg font-black mb-2" style={{ color: 'var(--text-primary)' }}>
              {easterEgg === 'pi'
                ? 'π — ثابت لا نهائي'
                : easterEgg === 'e'
                ? 'e — أساس النمو الطبيعي'
                : '1729 — رقم التاكسي الأسطوري'}
            </h4>
            <p className="text-sm font-bold leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {easterEgg === 'pi'
                ? 'لو طبعت π بعد 40 رقم بس، تحسب بها دائرة حجمها مجرة درب التبانة بدقة ذرة هيدروجين! اكتشفه ويليام جونز 1706 واشتهر بأويلر.'
                : easterEgg === 'e'
                ? 'ايلر أثبت إن e أساس اللوغاريتم الطبيعي وهو مجموع (1/n!) إلى ما لا نهاية ≈ 2.718 — وبيظهر في كل نمو طبيعي من الفايدة المركبة للنووية.'
                : 'لما راح هاردي لزيارة رامانوجان قال إن رقم تاكسيه 1729 ممل... فرد عليه رامانوجان: لأ! أصغر رقم يتحسب مجموع مكعبين بطريقتين مختلفتين (1³+12³ = 9³+10³).'}
            </p>
            <button
              type="button"
              onClick={() => setEasterEgg(null)}
              className="mt-4 px-5 py-2.5 rounded-2xl text-xs font-black cursor-pointer transition-all hover:scale-105"
              style={{ backgroundColor: 'var(--accent-primary)', color: '#ffffff' }}
            >
              جميل! 🧠✨
            </button>
          </div>
        </div>
      )}

      {/* Phase 3.3 — Cognitive Guard: compassionate burnout relief */}
      {showBurnoutRelief && activeTab === 'quiz' && (() => {
        // Stuck question = first unanswered one the student has seen
        const stuckIdx = quizQuestions.findIndex(
          (q, i) => userAnswers[i] === undefined && questionStartTimesRef.current[i]
        );
        const targetIdx = stuckIdx >= 0 ? stuckIdx : quizQuestions.findIndex((q, i) => userAnswers[i] === undefined);
        return (
          <BurnoutReliefModal
            isGirls={isGirls}
            questionHint={targetIdx >= 0 ? quizQuestions[targetIdx]?.hint ?? null : null}
            onClose={() => setShowBurnoutRelief(false)}
            onOpenHint={() => {
              if (targetIdx >= 0) {
                setHintTier((prev) => ({ ...prev, [targetIdx]: 2 }));
                setShowHints((prev) => ({ ...prev, [targetIdx]: true }));
                quizCardRefs.current[targetIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
              setShowBurnoutRelief(false);
            }}
          />
        );
      })()}

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

        {/* Phase 4.5 — Mathematical easter eggs: click a constant for trivia */}
        <div className="mt-5 flex items-center justify-center gap-2 select-none">
          {([['π', 'pi'], ['e', 'e'], ['1729', '1729']] as const).map(([label, key]) => (
            <button
              key={key}
              type="button"
              onClick={() => setEasterEgg(key)}
              dir="ltr"
              title="اضغط لحكاية رياضيات"
              className="px-3 py-1 rounded-full border text-[11px] font-mono font-bold cursor-pointer transition-all hover:scale-110 hover:opacity-100 opacity-50"
              style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
            >
              {label}
            </button>
          ))}
        </div>
      </footer>

      {/* Mobile Drawer Navigation with Background Scroll Lock */}
      <MobileNavDrawer
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        isGirls={isGirls}
        isDark={isDark}
      />
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
