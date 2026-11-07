'use client';

import React, { useState, useEffect, useMemo } from 'react';
import MathRenderer from '@/components/MathRenderer';
import {
  Zap,
  CheckCircle2,
  XCircle,
  Flame,
  Award,
  Sparkles,
  Share2,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { playSound } from '@/lib/audio/soundEngine';
import { triggerConfetti } from '@/lib/effects/confetti';
import { vibrateCorrect, vibrateWrong } from '@/lib/haptics';

export interface DailyQuestion {
  id: string;
  subject: string;
  subjectEmoji: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  xpReward: number;
}

const DAILY_QUESTIONS_BANK: DailyQuestion[] = [
  {
    id: 'dq_la_01',
    subject: 'الجبر الخطي',
    subjectEmoji: '📐',
    question: 'ما هي قيمة محدد مصفوفة قطرية $3 \\times 3$ عناصر قطرها الرئيسي هي $2, 3, 5$؟',
    options: ['10', '30', '15', '0'],
    correctIndex: 1,
    explanation: 'محدد أي مصفوفة قطرية يساوي حاصل ضرب عناصر قطرها الرئيسي: $2 \\times 3 \\times 5 = 30$.',
    xpReward: 50,
  },
  {
    id: 'dq_calc_01',
    subject: 'التفاضل والتكامل',
    subjectEmoji: '📈',
    question: 'ما هي المشتقة الأولى للدالة $f(x) = e^{3x}$ بالنسبة لـ $x$؟',
    options: ['3e^{3x}', 'e^{3x}', '3x e^{3x}', '\\frac{1}{3} e^{3x}'],
    correctIndex: 0,
    explanation: 'مشتقة $e^{g(x)}$ هي $g\'(x) \\cdot e^{g(x)}$، وهنا مشتقة الأس $3x$ هي $3$، فالناتج $3e^{3x}$.',
    xpReward: 50,
  },
  {
    id: 'dq_psych_01',
    subject: 'سيكولوجيا التعليم',
    subjectEmoji: '🧠',
    question: 'في نظرية الاشتراط الإجرائي لسكنر، أي جداول التعزيز يعتبر الأكثر مقاومة للانطفاء (Extinction)؟',
    options: ['التعزيز المستمر', 'التعزيز المتقطع ذو النسبة المتغيرة (Variable Ratio)', 'العقاب الإيجابي', 'التعزيز ذو الفاصل الثابت'],
    correctIndex: 1,
    explanation: 'التعزيز ذو النسبة المتغيرة ينتج أعلى معدلات استجابة وأعلى مقاومة للانطفاء لعدم قدرة الكائن على توقع موعد المكافأة.',
    xpReward: 50,
  },
  {
    id: 'dq_dyn_01',
    subject: 'الديناميكا',
    subjectEmoji: '⚙️',
    question: 'إذا تحرك جسيم في خط مستقيم بسرعة متجهة ثابتة مقدارها $20\\text{ m/s}$، فما مقدار عجلته؟',
    options: ['9.8 م/ث²', '0 م/ث²', '2 م/ث²', '20 م/ث²'],
    correctIndex: 1,
    explanation: 'العجلة هي معدل تغير السرعة بالنسبة للزمن ($a = \\frac{dv}{dt}$)، وحيث إن السرعة ثابتة فإن العجلة تساوي صفراً تماماً.',
    xpReward: 50,
  },
  {
    id: 'dq_ai_01',
    subject: 'الذكاء الاصطناعي',
    subjectEmoji: '🤖',
    question: 'ما هي دالة التنشيط (Activation Function) التي تحل معضلة تلاشي التدرج (Vanishing Gradient) بكفاءة في الشبكات العميقة؟',
    options: ['Sigmoid', 'ReLU (Rectified Linear Unit)', 'Step Function', 'Linear'],
    correctIndex: 1,
    explanation: 'دالة ReLU ($f(x) = \\max(0, x)$) مشتقتها ثابتة وتساوي 1 للقيم الموجبة، مما يمنع تلاشي المشتقات في الطبقات العميقة.',
    xpReward: 50,
  },
  {
    id: 'dq_real_01',
    subject: 'التحليل الحقيقي',
    subjectEmoji: '🔬',
    question: 'هل كل متتالية كوشية (Cauchy Sequence) من الأعداد الحقيقية في $\\mathbb{R}$ تكون متقاربة؟',
    options: ['نعم دائماً لأن الفضاء الحقيقي تام (Complete)', 'لا ليس بالضرورة', 'فقط إذا كانت جميع حدودها موجبة', 'نعم في فضاء الأعداد النسبية $\\mathbb{Q}$ فقط'],
    correctIndex: 0,
    explanation: 'خاصية التمام (Completeness) في $\\mathbb{R}$ تضمن أن كل متتالية كوشية تتقارب إلى نقطة داخل $\\mathbb{R}$.',
    xpReward: 50,
  },
  {
    id: 'dq_alg_01',
    subject: 'الجبر المجرد',
    subjectEmoji: '💎',
    question: 'وفقاً لنظرية لاغرانج في نظرية الزمر، رتبة أي زمرة جزئية $H$ من زمرة منتهية $G$ يجب أن:',
    options: ['تكون عدداً أولياً', 'تقسم رتبة الزمرة الأصلية $|G|$', 'تساوي نصف رتبة الزمرة', 'تكون أكبر من رتبة $G$'],
    correctIndex: 1,
    explanation: 'نظرية لاغرانج تنص على أن: $|G| = [G:H] \\cdot |H|$، بالتالي رتبة الزمرة الجزئية تقسم دائماً رتبة الزمرة الكلية.',
    xpReward: 50,
  },
  {
    id: 'dq_stat_01',
    subject: 'الإحصاء الرياضي',
    subjectEmoji: '📊',
    question: 'إذا كان التباين لمتغير عشوائي $X$ يساوي $16$، فإن الانحراف المعياري $\\sigma$ يساوي:',
    options: ['256', '4', '8', '32'],
    correctIndex: 1,
    explanation: 'الانحراف المعياري هو الجذر التربيعي الموجب للتباين: $\\sigma = \\sqrt{16} = 4$.',
    xpReward: 50,
  },
];

export interface DailyMicroHookCardProps {
  isGirls?: boolean;
}

export default function DailyMicroHookCard({ isGirls = false }: DailyMicroHookCardProps) {
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [alreadySolved, setAlreadySolved] = useState(false);
  const [dailyStreak, setDailyStreak] = useState(1);
  const [isShaking, setIsShaking] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  // Cairo Date string format: YYYY-MM-DD
  const todayStr = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }, []);

  // Deterministic daily question picker based on date hash
  const todayQuestion = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < todayStr.length; i++) {
      hash = (hash << 5) - hash + todayStr.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % DAILY_QUESTIONS_BANK.length;
    return DAILY_QUESTIONS_BANK[index];
  }, [todayStr]);

  // Load persistence state on client mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const isSolved = localStorage.getItem(`bsu_daily_hook_${todayStr}`) === 'true';
      if (isSolved) {
        setAlreadySolved(true);
        setIsAnswered(true);
        setIsCorrect(true);
        setSelectedOpt(todayQuestion.correctIndex);
      }

      const streakVal = parseInt(localStorage.getItem('bsu_daily_streak_count') || '1', 10);
      setDailyStreak(streakVal);
    } catch {}

    // Countdown to next Cairo midnight
    const updateCountdown = () => {
      try {
        const now = new Date();
        const cairoNow = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Cairo' }));
        const midnight = new Date(cairoNow);
        midnight.setHours(24, 0, 0, 0);
        const diffMs = midnight.getTime() - cairoNow.getTime();

        if (diffMs > 0) {
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
          setTimeLeft(
            `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
              .toString()
              .padStart(2, '0')}`
          );
        }
      } catch {}
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [todayStr, todayQuestion.correctIndex]);

  const handleSelectOption = (index: number) => {
    if (isAnswered && isCorrect) return;

    setSelectedOpt(index);
    setIsAnswered(true);

    const correct = index === todayQuestion.correctIndex;
    setIsCorrect(correct);

    if (correct) {
      vibrateCorrect();
      playSound('xp_chime');
      triggerConfetti('epic');

      try {
        localStorage.setItem(`bsu_daily_hook_${todayStr}`, 'true');

        // Update streak calculation
        const lastSolvedDate = localStorage.getItem('bsu_daily_streak_last_date');
        let currentStreak = parseInt(localStorage.getItem('bsu_daily_streak_count') || '0', 10);

        if (lastSolvedDate !== todayStr) {
          currentStreak += 1;
          localStorage.setItem('bsu_daily_streak_count', String(currentStreak));
          localStorage.setItem('bsu_daily_streak_last_date', todayStr);
          setDailyStreak(currentStreak);
        }

        // Grant XP to cached gamification state
        const cachedGamification = localStorage.getItem('bsu_portal_gamification_state_v1');
        if (cachedGamification) {
          const parsed = JSON.parse(cachedGamification);
          parsed.totalXp = (parsed.totalXp || 0) + todayQuestion.xpReward;
          localStorage.setItem('bsu_portal_gamification_state_v1', JSON.stringify(parsed));
        }
      } catch {}
    } else {
      vibrateWrong();
      playSound('quiz_wrong');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  const handleShareDaily = async () => {
    const text = `⚡ حليت سؤال اليوم السريع على منصة BSU Math & AI وحصلت على +${todayQuestion.xpReward} XP 🔥\nسؤال النهاردة في ${todayQuestion.subject}: "${todayQuestion.question.replace(/\$/g, '')}"\nادخل حله دلوقتي وثبت الـ Streak بتاعك:\nhttps://bsu-math-ai-portal.pages.dev`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: '⚡ سؤال اليوم السريع - BSU Math',
          text,
          url: 'https://bsu-math-ai-portal.pages.dev',
        });
        return;
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 3000);
    } catch {}
  };

  const optionLetters = ['أ', 'ب', 'ج', 'د'];

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: alreadySolved || isCorrect ? 'rgba(16, 185, 129, 0.4)' : 'rgba(234, 179, 8, 0.4)',
        boxShadow: 'var(--card-shadow)',
      }}
      className={`rounded-2xl sm:rounded-3xl border-2 p-5 sm:p-7 relative overflow-hidden transition-all duration-300 ${
        isShaking ? 'animate-micro-shake' : ''
      }`}
    >
      {/* Ambient background glow orb */}
      <div
        className="absolute -top-16 -left-16 w-48 h-48 rounded-full pointer-events-none opacity-20 blur-2xl"
        style={{
          background: alreadySolved || isCorrect
            ? 'radial-gradient(circle, #10B981 0%, transparent 70%)'
            : 'radial-gradient(circle, #F59E0B 0%, transparent 70%)',
        }}
      />

      {/* Top Banner Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border shadow-xs"
            style={{
              backgroundColor: alreadySolved || isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)',
              borderColor: alreadySolved || isCorrect ? 'rgba(16, 185, 129, 0.3)' : 'rgba(234, 179, 8, 0.3)',
              color: alreadySolved || isCorrect ? '#10B981' : '#F59E0B',
            }}
          >
            {alreadySolved || isCorrect ? '🏆' : <Zap className="w-5 h-5 animate-pulse" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                {isGirls ? 'سؤال اليوم السريع (60 ثانية) 🌸' : 'سؤال اليوم السريع (60 ثانية) ⚡'}
              </span>
              <span
                className="px-2 py-0.5 rounded-full text-[11px] font-black border"
                style={{
                  backgroundColor: 'rgba(234, 179, 8, 0.12)',
                  borderColor: 'rgba(234, 179, 8, 0.35)',
                  color: '#D97706',
                }}
              >
                {todayQuestion.subjectEmoji} {todayQuestion.subject}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold mt-0.5" style={{ color: 'var(--text-muted)' }}>
              <span>تجديد يومي لكسر الملل والروتين</span>
              {timeLeft && (
                <span className="inline-flex items-center gap-1 font-mono text-[11px] opacity-80">
                  <Clock className="w-3 h-3" />
                  <span>يتغير بعد: {timeLeft}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Gamification Pills */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black border"
            style={{
              backgroundColor: 'rgba(234, 179, 8, 0.12)',
              borderColor: 'rgba(234, 179, 8, 0.3)',
              color: '#B45309',
            }}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>+{todayQuestion.xpReward} XP</span>
          </div>

          <div
            className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black border"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              color: '#DC2626',
            }}
          >
            <Flame className="w-3.5 h-3.5 text-rose-500" />
            <span>{dailyStreak} يوم متتالي</span>
          </div>
        </div>
      </div>

      {/* Question Body */}
      <div className="space-y-4">
        <h4 className="text-base sm:text-lg font-black leading-relaxed" style={{ color: 'var(--text-primary)' }}>
          <MathRenderer text={todayQuestion.question} />
        </h4>

        {/* 4 Choices */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {todayQuestion.options.map((opt, idx) => {
            const isChosen = selectedOpt === idx;
            const isThisCorrect = idx === todayQuestion.correctIndex;

            let btnStyle = {
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            };

            if (isAnswered) {
              if (isThisCorrect) {
                btnStyle = {
                  backgroundColor: 'rgba(16, 185, 129, 0.18)',
                  borderColor: 'var(--accent-emerald)',
                  color: 'var(--accent-emerald)',
                };
              } else if (isChosen && !isCorrect) {
                btnStyle = {
                  backgroundColor: 'rgba(244, 63, 94, 0.15)',
                  borderColor: 'var(--accent-rose)',
                  color: 'var(--accent-rose)',
                };
              }
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={isAnswered && isCorrect === true}
                onClick={() => handleSelectOption(idx)}
                style={btnStyle}
                className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-right transition-all flex items-center justify-between gap-3 text-xs sm:text-sm font-bold cursor-pointer hover:border-blue-400 active:scale-[0.98] disabled:cursor-default"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 border"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-prominent)',
                    }}
                  >
                    {optionLetters[idx]}
                  </span>
                  <div className="truncate">
                    <MathRenderer text={opt} />
                  </div>
                </div>

                {isAnswered && isThisCorrect && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                )}
                {isAnswered && isChosen && !isCorrect && (
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback & Explanation Card */}
        {isAnswered && (
          <div
            className="p-4 rounded-2xl border space-y-2 animate-in fade-in"
            style={{
              backgroundColor: isCorrect ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
              borderColor: isCorrect ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)',
            }}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
                      {isGirls ? 'إجابة عبقرية! تسلم شطارتك يا بطلة 🌸✨' : 'الله ينور عليك يا بطل! إجابة نموذجية 🎯'}
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-rose-500" />
                    <span className="text-xs sm:text-sm font-black text-rose-600 dark:text-rose-400">
                      محاولة قريبة! راجع التفسير الرياضي تحت وجرب تاني 💡
                    </span>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {!isCorrect && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAnswered(false);
                      setIsCorrect(null);
                      setSelectedOpt(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-rose-500 text-white cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>جرب تاني</span>
                  </button>
                )}

                {isCorrect && (
                  <button
                    type="button"
                    onClick={handleShareDaily}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-xs"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{copiedShare ? 'تم نسخ التحدي! 📋' : 'شارك التحدي مع الدفعة 🚀'}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="text-xs sm:text-sm font-medium pt-1" style={{ color: 'var(--text-secondary)' }}>
              <strong>التوضيح العلمي: </strong>
              <MathRenderer text={todayQuestion.explanation} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
