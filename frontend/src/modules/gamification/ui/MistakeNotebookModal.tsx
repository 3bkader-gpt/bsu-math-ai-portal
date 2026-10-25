'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  X,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Trophy,
  Brain,
  HelpCircle,
  ArrowRight,
  Flame,
  Award,
} from 'lucide-react';
import { useMistakeNotebook } from '../notebook/mistakeManager';
import MathRenderer from '@/components/MathRenderer';

interface MistakeNotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MistakeNotebookModal({
  isOpen,
  onClose,
}: MistakeNotebookModalProps) {
  const { dueItems, summary, isLoading, submitReview, refresh } = useMistakeNotebook();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [cardStartTs, setCardStartTs] = useState<number>(Date.now());
  const [speedWarning, setSpeedWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<{
    text: string;
    isCorrect: boolean;
    awardedXp: number;
    boxLevel: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setIsRevealed(false);
      setCardStartTs(Date.now());
      setSpeedWarning(null);
      setLastFeedback(null);
      refresh();
    }
  }, [isOpen, refresh]);

  if (!isOpen) return null;

  const currentItem = dueItems[currentIndex];
  const hasItems = dueItems.length > 0;

  const handleReveal = () => {
    setIsRevealed(true);
  };

  const handleReviewAnswer = async (isCorrect: boolean) => {
    if (!currentItem || isSubmitting) return;

    const durationMs = Math.max(500, Date.now() - cardStartTs);
    const isFast = durationMs < 3000;
    setIsSubmitting(true);
    setSpeedWarning(null);

    try {
      const res = await submitReview(currentItem.question_hash, isCorrect, durationMs);

      if (isCorrect && isFast) {
        setSpeedWarning(
          '⚡ إجابة خاطفة (< 3 ثوانٍ): تم ترقية السؤال للصندوق التالي ولكن بدون نقاط XP لتشجيع التفكير الهادئ.'
        );
      }

      setLastFeedback({
        text: isCorrect
          ? res.isMastered
            ? 'ما شاء الله! أتقنت المفهوم ووصلت للصندوق 5 بامتياز 🎯'
            : `ممتاز! تم نقل السؤال للصندوق ${res.boxLevel} 🚀`
          : 'ولا تشيل هم! السؤال هيفضل في صندوق 1 عشان نثبته سوا بكرة 💪',
        isCorrect,
        awardedXp: res.awardedXp,
        boxLevel: res.boxLevel,
      });

      // Move to next card or wrap up
      setTimeout(() => {
        setIsRevealed(false);
        setLastFeedback(null);
        setSpeedWarning(null);
        setCardStartTs(Date.now());
        if (currentIndex >= dueItems.length - 1) {
          setCurrentIndex(0);
        }
        setIsSubmitting(false);
      }, 2000);
    } catch (err: any) {
      console.error('[MistakeNotebook] Review error:', err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          boxShadow: 'var(--card-shadow)',
        }}
        className="w-full max-w-2xl rounded-3xl border shadow-2xl relative flex flex-col max-h-[92vh] pt-2"
      >
        {/* Spiral Notebook Wire Bindings (كشكول سلك معدني مجسم) */}
        <div className="absolute -top-3.5 left-6 right-6 flex items-center justify-around pointer-events-none z-30">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="w-2.5 sm:w-3 h-6 sm:h-7 rounded-full border"
              style={{
                background: 'linear-gradient(180deg, #ffffff 0%, #cbd5e1 40%, #64748b 80%, #334155 100%)',
                borderColor: 'rgba(51, 65, 85, 0.5)',
                boxShadow: '0 3px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.9)',
              }}
            />
          ))}
        </div>

        {/* Header */}
        <div
          style={{ borderColor: 'var(--border-subtle)' }}
          className="p-4 sm:p-5 border-b flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div
              style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--bg-page)' }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm"
            >
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black" style={{ color: 'var(--text-primary)' }}>
                كراسة الأخطاء والتكرار المتباعد
              </h3>
              <p className="text-xs sm:text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                نظام لايتنر لتثبيت المفاهيم الصعبة في الذاكرة طويلة المدى
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Leitner Box Progress Tracker Bar */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-subtle)',
          }}
          className="px-4 py-2.5 sm:px-5 sm:py-3 border-b grid grid-cols-5 gap-2 text-center text-xs font-bold"
        >
          {[1, 2, 3, 4, 5].map((box) => {
            const count = summary.boxCounts[box] || 0;
            const isBox5 = box === 5;
            return (
              <div
                key={box}
                style={{
                  borderColor: isBox5 ? 'var(--accent-emerald)' : 'var(--border-subtle)',
                }}
                className="p-1.5 rounded-xl border flex flex-col items-center justify-center gap-0.5 bg-black/5 dark:bg-white/5"
              >
                <span className="text-[10px] text-gray-500">
                  {isBox5 ? 'متقن 🎯' : `صندوق ${box}`}
                </span>
                <span className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>

        {/* Body Content */}
        <div
          className={`p-4 sm:p-6 flex-1 ${
            !hasItems
              ? 'overflow-hidden flex flex-col items-center justify-center'
              : 'overflow-y-auto no-scrollbar'
          } space-y-4`}
        >
          {isLoading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 mx-auto border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-semibold text-gray-500">جاري فتح كراسة الأخطاء...</p>
            </div>
          ) : !hasItems ? (
            /* Clean Empty State */
            <div className="py-2 sm:py-4 my-auto text-center space-y-3 animate-fade-in max-w-sm mx-auto">
              <div
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: 'var(--accent-emerald)',
                }}
                className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl flex items-center justify-center shadow-lg"
              >
                <Trophy className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg sm:text-xl font-black" style={{ color: 'var(--text-primary)' }}>
                  كراسة أخطائك نظيفة لليوم! 🎉
                </h4>
                <p className="text-xs sm:text-sm font-medium leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  كل الأسئلة تم تثبيتها في مستويات متباعدة. استرح اليوم، وسنذكرك بالأسئلة التالية في موعدها المحدد علمياً.
                </p>
              </div>
              {summary.masteredCount > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  <Award className="w-4 h-4" />
                  <span>أتقنت {summary.masteredCount} سؤال رياضي بشكل نهائي!</span>
                </div>
              )}
            </div>
          ) : (
            /* Active Review Flashcard */
            <div className="space-y-5 animate-fade-in w-full">
              {/* Progress pill */}
              <div className="flex items-center justify-between text-xs font-bold text-gray-500">
                <span>سؤال {currentIndex + 1} من {dueItems.length} مستحق للمراجعة</span>
                <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 font-black">
                  مستوى الصندوق: {currentItem.box_level}
                </span>
              </div>

              {/* Question Statement */}
              <div
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-subtle)',
                }}
                className="p-5 sm:p-6 rounded-2xl border space-y-3 shadow-xs"
              >
                <span className="text-xs font-black text-blue-500 uppercase tracking-wider">
                  نص المسألة
                </span>
                <div className="text-base sm:text-xl font-black leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  <MathRenderer text={currentItem.question_text} />
                </div>
              </div>

              {/* Previous Mistake Highlight */}
              <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 flex items-start gap-3">
                <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5 flex-1">
                  <span className="text-xs font-bold text-rose-500">إجابتك السابقة التي وقعت فيها:</span>
                  <div className="text-sm sm:text-base font-bold text-rose-600 dark:text-rose-400">
                    <MathRenderer text={currentItem.user_last_mistake} />
                  </div>
                </div>
              </div>

              {/* Speed Warning Notification */}
              {speedWarning && (
                <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-500 text-xs font-bold leading-relaxed animate-fade-in">
                  {speedWarning}
                </div>
              )}

              {/* Feedback Animation Card */}
              {lastFeedback && (
                <div
                  className={`p-4 rounded-2xl border text-center font-black text-sm sm:text-base animate-fade-in ${
                    lastFeedback.isCorrect
                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-500'
                      : 'border-rose-500/40 bg-rose-500/15 text-rose-500'
                  }`}
                >
                  <p>{lastFeedback.text}</p>
                  {lastFeedback.awardedXp > 0 && (
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                      +{lastFeedback.awardedXp} XP مكتسبة!
                    </span>
                  )}
                </div>
              )}

              {/* Reveal Prompt or Solution */}
              {!isRevealed ? (
                <div className="pt-2">
                  <button
                    onClick={handleReveal}
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      color: 'var(--bg-page)',
                    }}
                    className="w-full py-3.5 px-6 rounded-2xl text-sm sm:text-base font-black flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all shadow-md cursor-pointer"
                  >
                    <HelpCircle className="w-5 h-5" />
                    <span>اكشف الحل الصحيح والشرح 💡</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in">
                  {/* Correct Solution Card */}
                  <div className="p-4 sm:p-5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>الإجابة الرياضية الصحيحة:</span>
                    </div>
                    <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                      <MathRenderer text={currentItem.correct_answer} />
                    </div>
                    {currentItem.explanation && (
                      <p className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 pt-1 border-t border-emerald-500/20">
                        {currentItem.explanation}
                      </p>
                    )}
                  </div>

                  {/* Self-Assessment Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <button
                      disabled={isSubmitting}
                      onClick={() => handleReviewAnswer(true)}
                      style={{
                        backgroundColor: 'var(--accent-emerald)',
                        color: '#ffffff',
                      }}
                      className="py-3.5 px-5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 hover:opacity-95 active:scale-95 transition-all shadow-md cursor-pointer"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>افتكرتها صح! (ترقية الصندوق)</span>
                    </button>

                    <button
                      disabled={isSubmitting}
                      onClick={() => handleReviewAnswer(false)}
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.12)',
                        color: 'var(--accent-rose)',
                        borderColor: 'var(--accent-rose)',
                      }}
                      className="py-3.5 px-5 rounded-2xl border text-sm font-black flex items-center justify-center gap-2 hover:bg-rose-500/20 active:scale-95 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-5 h-5" />
                      <span>محتاجة تثبيت (إعادة لصندوق 1)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)' }}
          className="p-4 border-t flex items-center justify-between text-xs font-semibold"
        >
          <span style={{ color: 'var(--text-secondary)' }}>
            مراجعة الأخطاء تمنحك <strong className="text-amber-500">15 XP</strong> عند التفكير لأكثر من 3 ثوانٍ
          </span>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
            className="px-4 py-2 rounded-xl border font-bold hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
