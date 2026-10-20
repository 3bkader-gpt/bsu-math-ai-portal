'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, X, ChevronRight, ChevronLeft, CheckCircle2, RotateCw, Trophy, Flame } from 'lucide-react';
import { getLocalResumeState } from '../resume';
import { parseFlashcardsMarkdown, parseQuizMarkdown, Flashcard, QuizQuestion } from '@/lib/lecture-utils';
import { getDirectSupabaseBundle } from '@/lib/supabase';
import { getApiBaseUrl } from '@/lib/api';
import { emitTelemetryEvent } from '@/modules/telemetry';

interface QuickMicroSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Fallback high-yield micro cards if no lecture is loaded yet
const FALLBACK_CARDS: Flashcard[] = [
  {
    question: 'ما هو تعريف المشتقة الاتجاهية لدالة القياس ∇f؟',
    answer: 'هي معدل تغير الدالة f في اتجاه متجه الوحدة u، وتساوي حاصل الضرب القياسي: Du f = ∇f · u',
  },
  {
    question: 'متى يقال لمجال متجهي F إنه محافظ (Conservative)؟',
    answer: 'إذا وجد مجال دالي سلمي φ بحيث F = ∇φ، ويكافئ ذلك هندسياً أن دوران المجال curl(F) = 0.',
  },
  {
    question: 'ما هي صيغة قانون كولوم للمجال الكهربي لشحنة نقطية q؟',
    answer: 'E = (1 / 4πε₀) * (q / r²) * r̂ ، حيث ε₀ هي سماحية الفراغ الكهربية.',
  },
];

const FALLBACK_QUESTION: QuizQuestion = {
  number: 1,
  question: 'إذا كان المتجهان A و B متعامدين، فإن حاصل ضربهما القياسي A · B يساوي:',
  options: ['0', '1', '|A||B|', '-1'],
  correctIndex: 0,
  hint: 'حاصل الضرب القياسي A · B = |A||B| cos(θ). وبما أن المتجهين متعامدان فإن θ = 90° و cos(90°) = 0.',
};

export function QuickMicroSessionModal({ isOpen, onClose }: QuickMicroSessionModalProps) {
  const [cards, setCards] = useState<Flashcard[]>(FALLBACK_CARDS);
  const [question, setQuestion] = useState<QuizQuestion>(FALLBACK_QUESTION);
  const [activeLectureId, setActiveLectureId] = useState<number>(1);
  const [currentStep, setCurrentStep] = useState<'cards' | 'quiz' | 'completed'>('cards');
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [sessionStartTs, setSessionStartTs] = useState<number>(0);
  const [questionStartTs, setQuestionStartTs] = useState<number>(0);
  const [isFastGuess, setIsFastGuess] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    // Reset session states
    const now = Date.now();
    setSessionStartTs(now);
    setCurrentStep('cards');
    setCardIndex(0);
    setIsFlipped(false);
    setSelectedOption(null);
    setIsSubmitted(false);
    setIsFastGuess(false);

    // Try loading real assets from last active lecture
    const resume = getLocalResumeState();
    const lectureId = resume?.lectureId || 1;
    setActiveLectureId(lectureId);

    getDirectSupabaseBundle(lectureId, getApiBaseUrl())
      .then((bundle) => {
        if (!bundle) return;
        const cardsAsset = bundle.assets?.find((a) => a.asset_type === 'flashcards_md');
        if (cardsAsset?.content_text) {
          const parsed = parseFlashcardsMarkdown(cardsAsset.content_text);
          if (parsed.length >= 3) {
            setCards(parsed.slice(0, 3));
          }
        }

        const quizAsset = bundle.assets?.find((a) => a.asset_type === 'quiz_md');
        if (quizAsset?.content_text) {
          const parsedQ = parseQuizMarkdown(quizAsset.content_text);
          if (parsedQ.length > 0) {
            setQuestion(parsedQ[0]);
          }
        }
      })
      .catch(() => {
        // Fallbacks already in place
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNextCard = () => {
    setIsFlipped(false);
    if (cardIndex < cards.length - 1) {
      setCardIndex((prev) => prev + 1);
    } else {
      setCurrentStep('quiz');
      setQuestionStartTs(Date.now());
    }
  };

  const handlePrevCard = () => {
    setIsFlipped(false);
    if (cardIndex > 0) {
      setCardIndex((prev) => prev - 1);
    }
  };

  const handleSelectOption = (idx: number) => {
    if (isSubmitted) return;
    const durationMs = Math.max(0, Date.now() - (questionStartTs || sessionStartTs));
    const fast = durationMs < 3000;
    setSelectedOption(idx);
    setIsSubmitted(true);
    setIsFastGuess(fast);

    // Finish session after 1.8 seconds delay
    setTimeout(() => {
      setCurrentStep('completed');

      // Only award completion if answered with thoughtful deliberation (>= 3s)
      if (!fast) {
        emitTelemetryEvent(
          'quiz.finished',
          {
            lectureId: activeLectureId,
            score: idx === question.correctIndex ? 1 : 0,
            total: 1,
            attempt: 1,
            durationMs,
          },
          activeLectureId
        );
      }
    }, 1800);
  };

  const currentCard = cards[cardIndex] || cards[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          boxShadow: 'var(--card-shadow)',
        }}
        className="w-full max-w-lg rounded-3xl border overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div
          style={{ borderColor: 'var(--border-subtle)' }}
          className="p-5 border-b flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <div
              style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--bg-page)' }}
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base" style={{ color: 'var(--text-primary)' }}>
                جلسة الـ 5 دقائق السريعة ⏱️
              </h3>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                {currentStep === 'cards' && `مراجعة المفاهيم (بطاقة ${cardIndex + 1} من ${cards.length})`}
                {currentStep === 'quiz' && 'تحدي التثبيت السريع (سؤال واحد)'}
                {currentStep === 'completed' && 'اكتملت الجلسة بنجاح!'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* STEP 1: 3 FLASHCARDS */}
          {currentStep === 'cards' && (
            <div className="space-y-6">
              {/* Progress bar */}
              <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    width: `${((cardIndex + 1) / cards.length) * 100}%`,
                  }}
                />
              </div>

              {/* Flip Card Container */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-subtle)',
                }}
                className="min-h-[220px] p-6 rounded-2xl border flex flex-col justify-between items-center text-center cursor-pointer transition-all duration-300 hover:scale-[1.01] shadow-sm select-none"
              >
                <div className="text-[11px] font-bold px-3 py-1 rounded-full bg-black/5 dark:bg-white/5" style={{ color: 'var(--text-muted)' }}>
                  {isFlipped ? '💡 الإجابة والشرح' : '❓ انقر لإظهار الإجابة'}
                </div>

                <div className="my-auto py-4">
                  <p className="text-base sm:text-lg font-black leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {isFlipped ? currentCard.answer : currentCard.question}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--accent-primary)' }}>
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>انقر للقلب</span>
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  onClick={handlePrevCard}
                  disabled={cardIndex === 0}
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    color: 'var(--text-secondary)',
                    borderColor: 'var(--border-subtle)',
                  }}
                  className="px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>السابق</span>
                </button>

                <button
                  onClick={handleNextCard}
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'var(--bg-page)',
                  }}
                  className="px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-1 shadow-sm hover:opacity-90 cursor-pointer"
                >
                  <span>{cardIndex === cards.length - 1 ? 'الانتقال للسؤال 🎯' : 'التالي'}</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: 1 QUIZ QUESTION */}
          {currentStep === 'quiz' && (
            <div className="space-y-6">
              <div
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-subtle)',
                }}
                className="p-5 rounded-2xl border space-y-4 shadow-sm"
              >
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500">
                  سؤال تثبيت فوري
                </span>
                <h4 className="text-base font-black leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  {question.question}
                </h4>
              </div>

              <div className="space-y-2.5">
                {question.options.map((opt, idx) => {
                  let btnBg = 'var(--bg-surface-elevated)';
                  let borderCol = 'var(--border-subtle)';
                  let textCol = 'var(--text-primary)';

                  if (isSubmitted) {
                    if (idx === question.correctIndex) {
                      btnBg = 'rgba(16, 185, 129, 0.15)';
                      borderCol = '#10B981';
                      textCol = '#10B981';
                    } else if (idx === selectedOption) {
                      btnBg = 'rgba(239, 68, 68, 0.15)';
                      borderCol = '#EF4444';
                      textCol = '#EF4444';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(idx)}
                      disabled={isSubmitted}
                      style={{
                        backgroundColor: btnBg,
                        borderColor: borderCol,
                        color: textCol,
                      }}
                      className="w-full p-4 rounded-xl border text-right font-bold text-sm transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-between cursor-pointer"
                    >
                      <span>{opt}</span>
                      {isSubmitted && idx === question.correctIndex && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {isSubmitted && question.hint && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium leading-relaxed animate-fade-in">
                  💡 {question.hint}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: SESSION COMPLETED */}
          {currentStep === 'completed' && (
            <div className="py-6 text-center space-y-5 animate-fade-in">
              <div
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--bg-page)',
                }}
                className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center shadow-xl animate-bounce"
              >
                <Trophy className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h4 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>
                  {isFastGuess ? 'تم إنهاء المراجعة السريعة ⏱️' : 'عاش يا بطل! أنهيت جلسة الـ 5 دقائق 🎉'}
                </h4>
                <p className="text-sm font-semibold max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
                  {isFastGuess
                    ? 'تم تسجيل مراجعتك، ولكن لم يتم احتساب شعلة الاستمرار اليومي لأن الإجابة كانت سريعة جداً (< 3 ثوانٍ). خذ وقتك في التفكير المرة القادمة!'
                    : 'راجعت 3 مفاهيم أساسية وثبّت سؤال كويز بنجاح. تم حفظ استمرارك اليومي وحماية شعلتك 🔥'}
                </p>
              </div>

              {!isFastGuess && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/15 text-amber-500 font-black text-sm">
                    <Flame className="w-4 h-4 fill-current" />
                    <span>الاستمرار اليومي محفوظ اليوم</span>
                  </div>
                </div>
              )}

              <button
                onClick={onClose}
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--bg-page)',
                }}
                className="w-full py-3.5 rounded-2xl font-black text-sm shadow-md hover:opacity-90 cursor-pointer"
              >
                تمام، إغلاق والعودة
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
