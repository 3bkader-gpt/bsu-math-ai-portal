'use client';

import React, { MutableRefObject, useState, useEffect } from 'react';
import MathRenderer from '@/components/MathRenderer';
import ExamTrapBadge from '@/components/ExamTrapBadge';
import content from '@/data/content.json';
import {
  HelpCircle,
  RotateCcw,
  Award,
  Sparkles,
  Lightbulb,
  CheckCircle2,
  XCircle,
  GraduationCap,
  Brain,
  Coffee,
  Swords,
  Flame,
  Share2,
} from 'lucide-react';
import {
  QuizQuestion,
  getQuizFeedback,
  getQuizHintPrefix,
  getMascotEmoji,
} from '@/lib/lecture-utils';
import { trackQuizQuestionAnswered } from '@/modules/telemetry';
import { SessionFlowBar, ConfidenceSelector } from '@/modules/gamification/ui';
import {
  nextHintAction,
  shouldShowBurnoutRelief,
  splitFadedSteps,
  splitHintTiers,
  type HintTier,
} from '@/modules/gamification/core/hintLadder';
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
import { AcademicLectureBundle } from '@/types/academic';
import { generateStoryCardBlob } from '@/lib/storyCardGenerator';

export interface LectureQuizEngineProps {
  lectureBundle: AcademicLectureBundle | null;
  quizQuestions: QuizQuestion[];
  setQuizQuestions: React.Dispatch<React.SetStateAction<QuizQuestion[]>>;
  trapsMap: Record<string, { failure_rate_pct: number; total_attempts: number; is_trap: boolean }>;
  userAnswers: Record<number, number>;
  setUserAnswers: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  showHints: Record<number, boolean>;
  setShowHints: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  hintTier: Record<number, HintTier>;
  setHintTier: React.Dispatch<React.SetStateAction<Record<number, HintTier>>>;
  confidenceLevels: Record<number, ConfidenceLevel>;
  setConfidenceLevels: React.Dispatch<React.SetStateAction<Record<number, ConfidenceLevel>>>;
  score: number | null;
  setScore: React.Dispatch<React.SetStateAction<number | null>>;
  setConsecutiveWrong: React.Dispatch<React.SetStateAction<number>>;
  answerFeedback: Record<number, string>;
  setAnswerFeedback: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  showEthicalExit: boolean;
  setShowEthicalExit: React.Dispatch<React.SetStateAction<boolean>>;
  ethicalExitPanelOpen: boolean;
  setEthicalExitPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setEthicalWrapUpOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setShowMistakeNotebook: React.Dispatch<React.SetStateAction<boolean>>;
  setShowBurnoutRelief: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveTab: (tab: 'audio' | 'video' | 'quiz' | 'guide' | 'flashcards') => void;
  isGirls: boolean;
  isDark: boolean;
  quizCardRefs: MutableRefObject<Record<number, HTMLDivElement | null>>;
  questionStartTimesRef: MutableRefObject<Record<number, number>>;
  quizDetectorRef: MutableRefObject<any>;
  burnoutShownRef: MutableRefObject<boolean>;
  praiseRecentRef: MutableRefObject<string[]>;
  correctStreakRef: MutableRefObject<number>;
}

export default function LectureQuizEngine({
  lectureBundle,
  quizQuestions,
  setQuizQuestions,
  trapsMap,
  userAnswers,
  setUserAnswers,
  showHints,
  setShowHints,
  hintTier,
  setHintTier,
  confidenceLevels,
  setConfidenceLevels,
  score,
  setScore,
  setConsecutiveWrong,
  answerFeedback,
  setAnswerFeedback,
  showEthicalExit,
  setShowEthicalExit,
  ethicalExitPanelOpen,
  setEthicalExitPanelOpen,
  setEthicalWrapUpOpen,
  setShowMistakeNotebook,
  setShowBurnoutRelief,
  setActiveTab,
  isGirls,
  isDark,
  quizCardRefs,
  questionStartTimesRef,
  quizDetectorRef,
  burnoutShownRef,
  praiseRecentRef,
  correctStreakRef,
}: LectureQuizEngineProps) {
  // Arcade Combo & 1v1 Duel Engine (Sprint 1)
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [comboBrokenAlert, setComboBrokenAlert] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [copiedDuel, setCopiedDuel] = useState(false);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [duelData, setDuelData] = useState<{
    challenger: string;
    score: number;
    total: number;
    timeSec?: number;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const duelBy = params.get('duel_by');
        const duelScore = params.get('duel_score');
        const duelTotal = params.get('duel_total');
        const duelTime = params.get('duel_time');

        if (duelBy && duelScore && duelTotal) {
          setDuelData({
            challenger: decodeURIComponent(duelBy),
            score: parseInt(duelScore, 10) || 0,
            total: parseInt(duelTotal, 10) || 0,
            timeSec: duelTime ? parseInt(duelTime, 10) : undefined,
          });
        }
      } catch {}
    }
  }, []);

  const handleShareDuel = async () => {
    if (typeof window === 'undefined') return;
    const studentName =
      localStorage.getItem('bsu_portal_student_nickname') || (isGirls ? 'بطلة الرياضيات 🌸' : 'بطل الرياضيات ⚡');
    const totalSec =
      Math.round(
        Object.values(questionStartTimesRef.current).reduce((acc, t) => acc + (Date.now() - t), 0) / 1000
      ) || 45;

    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('duel_by', studentName);
    currentUrl.searchParams.set('duel_score', String(score ?? 0));
    currentUrl.searchParams.set('duel_total', String(quizQuestions.length));
    currentUrl.searchParams.set('duel_time', String(totalSec));

    const textToShare = `⚔️ تحدي 1v1 على منصة BSU Math!\nأنا جبت ${score}/${quizQuestions.length} في كويز "${lectureBundle?.title || 'المحاضرة'}" في ${totalSec} ثانية 🔥\nتقدر تكسر رقمي؟ ادخل اتحداني من هنا:\n${currentUrl.toString()}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: '⚔️ تحدي 1v1 - BSU Math Portal',
          text: textToShare,
          url: currentUrl.toString(),
        });
        return;
      } catch {
        // Fallback to clipboard if share dialog was cancelled or unsupported
      }
    }

    try {
      await navigator.clipboard.writeText(textToShare);
      setCopiedDuel(true);
      setTimeout(() => setCopiedDuel(false), 3000);
    } catch (e) {
      console.error('Clipboard copy failed', e);
    }
  };

  const handleExportStoryCard = async () => {
    try {
      setIsGeneratingStory(true);
      const studentName =
        typeof window !== 'undefined'
          ? localStorage.getItem('bsu_portal_student_nickname') || (isGirls ? 'بطلة الرياضيات 🌸' : 'بطل الرياضيات ⚡')
          : 'بطل الرياضيات ⚡';

      let studentLevel = 3;
      let levelTitle = isGirls ? 'شطورة الدفعة 🌸' : 'فنان المعادلات ⚡';
      try {
        const cached = localStorage.getItem('bsu_portal_gamification_state_v1');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.level) studentLevel = parsed.level;
        }
      } catch {}

      const totalSec =
        Math.round(
          Object.values(questionStartTimesRef.current).reduce((acc, t) => acc + (Date.now() - t), 0) / 1000
        ) || 45;

      const blob = await generateStoryCardBlob({
        studentName,
        studentLevel,
        levelTitle,
        lectureTitle: lectureBundle?.title || 'كويز المحاضرة',
        subjectName: lectureBundle?.subject_name || 'كلية العلوم - قسم الرياضيات',
        score: score ?? 0,
        total: quizQuestions.length,
        maxCombo: Math.max(maxCombo, 1),
        timeSpentSec: totalSec,
      });

      const file = new File([blob], `bsu-quiz-story-${Date.now()}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'إنجازي في كويز الرياضيات 🎓',
          text: `قفلت كويز ${lectureBundle?.title || ''} على منصة BSU Math! 🔥`,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `bsu-story-${Date.now()}.png`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to export story card:', err);
    } finally {
      setIsGeneratingStory(false);
    }
  };

  return (
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
          {/* Phase 7: 1v1 Challenger Banner */}
          {duelData && (
            <div
              className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 flex items-center justify-between gap-3 shadow-md animate-in fade-in"
              style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(239, 68, 68, 0.1) 100%)',
                borderColor: 'rgba(245, 158, 11, 0.5)',
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl sm:text-4xl">⚔️</span>
                <div>
                  <div className="text-xs sm:text-sm font-black text-amber-500">تحدي 1v1 رسمي من زميلك</div>
                  <div className="text-sm sm:text-base font-black" style={{ color: 'var(--text-primary)' }}>
                    {duelData.challenger} جاب <strong>{duelData.score}/{duelData.total}</strong>
                    {duelData.timeSec ? ` في ${duelData.timeSec} ثانية` : ''} 🎯
                  </div>
                  <div className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                    هتقدر تكسر رقمه النهاردة؟ وريه شطارتك وسرعتك!
                  </div>
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-amber-500 text-black font-black text-xs shrink-0 shadow-xs">
                تحدي مفتوح ⚡
              </div>
            </div>
          )}

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
                  <>
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
                          .replace('{percent}', Math.round((score / quizQuestions.length) * 100).toString())}
                      </span>
                    </div>

                    {maxCombo >= 2 && (
                      <div
                        style={{
                          backgroundColor: 'rgba(245, 158, 11, 0.15)',
                          borderColor: '#F59E0B',
                          color: '#F59E0B',
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border font-black text-xs sm:text-sm shadow-sm"
                      >
                        <Flame className="w-4 h-4 text-amber-500" />
                        <span>أطول كومبو: x{maxCombo} 🔥</span>
                      </div>
                    )}

                    {/* Viral 1v1 Challenge Button */}
                    <button
                      type="button"
                      onClick={handleShareDuel}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs sm:text-sm font-black transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-xs"
                      style={{
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        borderColor: 'rgba(59, 130, 246, 0.5)',
                        color: isDark ? '#93C5FD' : '#1D4ED8',
                      }}
                      title="شارك نتيجتك مع زمايلك في رابط تحدي مباشر على واتساب"
                    >
                      <Swords className="w-4 h-4" />
                      <span>{copiedDuel ? 'تم نسخ التحدي! 📋' : '⚔️ اتحدى صاحبك (1v1)'}</span>
                    </button>

                    {/* Viral 9:16 Story Card Button */}
                    <button
                      type="button"
                      disabled={isGeneratingStory}
                      onClick={handleExportStoryCard}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs sm:text-sm font-black transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-xs disabled:opacity-50"
                      style={{
                        backgroundColor: 'rgba(234, 179, 8, 0.15)',
                        borderColor: 'rgba(234, 179, 8, 0.5)',
                        color: isDark ? '#FDE047' : '#B45309',
                      }}
                      title="توليف كارت استوري احترافي بجودة 1080x1920 لحالة الواتساب والإنستغرام"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{isGeneratingStory ? 'جاري التوليف... ⏳' : '📸 كارت الاستوري (9:16)'}</span>
                    </button>
                  </>
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
                      setCombo(0);
                      setMaxCombo(0);
                      setComboBrokenAlert(false);
                      correctStreakRef.current = 0;
                      burnoutShownRef.current = false;
                      questionStartTimesRef.current = {};
                      quizDetectorRef.current?.reset();
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
            <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface-elevated)' }}>
              <div
                className="h-full transition-all duration-300"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  width: `${(Object.keys(userAnswers).length / quizQuestions.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Gentle Combo Broken Alert */}
          {comboBrokenAlert && (
            <div className="p-3 sm:p-4 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-between gap-3 animate-in fade-in bg-rose-500/10 border-rose-500/30 text-rose-500">
              <div className="flex items-center gap-2">
                <span>💔</span>
                <span>انكسر الكومبو! ولا يهمك خالص، ركز في السؤال الجاي وابدأ كومبو جديد 💪</span>
              </div>
              <button
                type="button"
                onClick={() => setComboBrokenAlert(false)}
                className="text-xs opacity-75 hover:opacity-100 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

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
                className={`p-5 sm:p-8 rounded-3xl border transition-all space-y-5 ${isShaking ? 'animate-micro-shake' : ''}`}
              >
                {/* Question Header */}
                <div className="flex items-center justify-between gap-3 pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
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

                    {/* Arcade Combo Badge */}
                    {combo >= 2 && !isAnswered && (
                      <span
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black shadow-xs border animate-bounce"
                        style={{
                          background:
                            combo >= 5
                              ? 'linear-gradient(135deg, #EF4444 0%, #F59E0B 100%)'
                              : 'linear-gradient(135deg, #F59E0B 0%, #10B981 100%)',
                          color: '#FFFFFF',
                          borderColor: 'rgba(255, 255, 255, 0.4)',
                        }}
                      >
                        <Flame className="w-3.5 h-3.5 text-white animate-pulse" />
                        <span>x{combo} كومبو!</span>
                        {combo >= 5 && <span className="text-[10px] font-black mr-0.5">🔥 مولع</span>}
                      </span>
                    )}

                    {isAnswered && (
                      <span
                        style={{
                          backgroundColor:
                            selectedOpt === q.correctIndex ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                          borderColor: selectedOpt === q.correctIndex ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                          color: selectedOpt === q.correctIndex ? 'var(--accent-emerald)' : 'var(--accent-rose)',
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

                {/* Exam Trap Badge */}
                {(() => {
                  let hashVal = 0;
                  const cleanQ = q.question.trim().toLowerCase();
                  for (let i = 0; i < cleanQ.length; i++) {
                    hashVal = (hashVal << 5) - hashVal + cleanQ.charCodeAt(i);
                    hashVal |= 0;
                  }
                  const qHash = 'q_' + Math.abs(hashVal).toString(36);
                  const trap = trapsMap[qHash];
                  if (trap && trap.is_trap) {
                    return (
                      <div className="pb-1.5 animate-in fade-in slide-in-from-top-1">
                        <ExamTrapBadge
                          failureRatePct={trap.failure_rate_pct}
                          totalAttempts={trap.total_attempts}
                          isDark={isDark}
                        />
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Question Statement */}
                <div className="text-lg sm:text-2xl font-extrabold leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  <MathRenderer text={q.question} />
                </div>

                {/* Interactive Hero Reaction Card */}
                {isAnswered &&
                  (() => {
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
                          <div className="flex items-center gap-3.5 sm:gap-4 flex-1">
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
                                  className="px-2.5 py-0.5 rounded-full text-xs font-black tracking-wider uppercase shadow-xs"
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
                                  ? isGirls
                                    ? 'شطارة وتركيز عالي جداً.. الله ينور عليكي يا بطلة! 🌸✨'
                                    : 'تسلم إيدك وعاش تركيزك يا بطل! 🎯'
                                  : isGirls
                                  ? 'ولا تشيلي هم خالص! التلمتري بيعلمنا أكتر.. بصي على التشخيص تحت أو جربي تاني 💪'
                                  : 'فداك يا هندسة! التشخيص تحت يقولك فين النقطة بالظبط 💡'}
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

                {/* Worked-example fading */}
                {q.steps &&
                  q.steps.length > 0 &&
                  !isAnswered &&
                  (() => {
                    const { visible, hidden } = splitFadedSteps(q.steps, q.number);
                    const revealedKey = Number(`9${qIdx}`);
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
                          <div
                            key={`v${i}`}
                            className="flex items-start gap-2.5 text-sm sm:text-base font-bold"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            <span
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
                              style={{
                                backgroundColor: 'var(--bg-surface)',
                                color: 'var(--accent-primary)',
                                border: '1px solid var(--border-subtle)',
                              }}
                            >
                              {i + 1}
                            </span>
                            <MathRenderer text={step} />
                          </div>
                        ))}
                        {hidden.map((step, i) => (
                          <div key={`h${i}`} className="flex items-start gap-2.5">
                            <span
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
                              style={{
                                backgroundColor: 'var(--bg-surface)',
                                color: 'var(--text-muted)',
                                border: '1px dashed var(--border-prominent)',
                              }}
                            >
                              {visible.length + i + 1}
                            </span>
                            {revealed ? (
                              <MathRenderer text={step} />
                            ) : (
                              <button
                                type="button"
                                onClick={() => setShowHints((prev) => ({ ...prev, [revealedKey]: true }))}
                                className="text-xs font-black px-3 py-1.5 rounded-lg border border-dashed cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                                style={{ color: 'var(--text-muted)', borderColor: 'var(--border-prominent)' }}
                              >
                                {isGirls
                                  ? 'كمّلي الخطوة دي بنفسك — اضغطي لو عايزة تشوفيها'
                                  : 'كمّل الخطوة دي بنفسك — اضغط لو عايز تشوفها'}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                {/* Hint Box */}
                {showHints[qIdx] &&
                  q.hint &&
                  !isAnswered &&
                  (() => {
                    const tier = (hintTier[qIdx] ?? 1) as HintTier;
                    const { tier1, tier2 } = splitHintTiers(q.hint);
                    const revealed =
                      tier >= 3 ? q.options[q.correctIndex] ?? '' : tier >= 2 ? tier2 : tier1 || tier2;
                    return (
                      <div
                        style={{
                          backgroundColor:
                            tier >= 3 ? 'rgba(16, 185, 129, 0.10)' : 'rgba(245, 158, 11, 0.12)',
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
                          <span
                            className={`font-extrabold ${
                              tier >= 3
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {tier >= 3
                              ? isGirls
                                ? 'إجابة السؤال يا باشمهندسة — هراجعها معاكي في الدفتر بكرة 📖'
                                : 'إجابة السؤال يا هندسة — هراجعها معاك في الدفتر بكرة 📖'
                              : getQuizHintPrefix(qIdx, isGirls)}
                          </span>
                          <MathRenderer text={revealed} />
                          {tier < 3 && (
                            <span className="block text-xs sm:text-sm font-bold mt-2" style={{ color: 'var(--text-muted)' }}>
                              الدرجة {tier} من 3 — لسه في درجات أعلى لو محتاج
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                {/* Confidence Selector */}
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

                          const start = questionStartTimesRef.current[qIdx] || Date.now() - 4000;
                          const durationMs = Math.max(1000, Date.now() - start);
                          const userAnswerText = q.options[optIdx] ?? '';
                          const correctAnswerText = q.options[q.correctIndex] ?? '';
                          const isCorrect = optIdx === q.correctIndex;
                          const tierUsed = (hintTier[qIdx] ?? 0) as HintTier;

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

                          if (isCorrect && questionHash) {
                            recordCohortContribution('mock-weekly-challenge', questionHash);
                          }

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

                          const persona: Persona = isGirls ? 'girls' : 'boys';
                          const confFeedback = getConfidenceFeedback(chosenConfidence, isCorrect, persona);

                          if (isCorrect) {
                            correctStreakRef.current += 1;
                            const nextCombo = combo + 1;
                            setCombo(nextCombo);
                            setMaxCombo((prev) => Math.max(prev, nextCombo));
                            setComboBrokenAlert(false);

                            const praise = confFeedback.message
                              ? `${confFeedback.headline} ${confFeedback.message}`
                              : pickPraise(persona, praiseRecentRef.current);
                            praiseRecentRef.current = trackPraise(praiseRecentRef.current, praise);
                            setAnswerFeedback((prev) => ({ ...prev, [qIdx]: praise }));
                            vibrateCorrect();

                            if (nextCombo >= 5) {
                              setIsShaking(true);
                              setTimeout(() => setIsShaking(false), 500);
                              triggerConfetti('standard');
                              playSound('streak_fire');
                            } else {
                              playSound('quiz_correct', { semitones: nextCombo });
                            }
                          } else {
                            if (combo >= 3) {
                              setComboBrokenAlert(true);
                              setTimeout(() => setComboBrokenAlert(false), 3500);
                            }
                            setCombo(0);
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
                              color: isAnswered && (isCorrect || isSelected) ? '#ffffff' : 'var(--text-primary)',
                            }}
                            className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center shrink-0 border shadow-xs mt-0.5 sm:mt-0"
                          >
                            {optionLabels[optIdx] || optIdx + 1}
                          </span>
                          <div className="flex-1 min-w-0 text-right font-bold text-sm sm:text-lg overflow-x-auto no-scrollbar">
                            <MathRenderer text={opt} />
                          </div>
                        </div>

                        {isAnswered && isCorrect && <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />}
                        {isAnswered && isSelected && !isCorrect && <XCircle className="w-6 h-6 text-rose-500 shrink-0" />}
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
  );
}
