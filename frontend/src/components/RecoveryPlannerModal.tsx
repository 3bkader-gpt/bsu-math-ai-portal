'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  X, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Flame, 
  Sparkles, 
  Zap, 
  Share2, 
  RotateCcw, 
  BookOpen, 
  Headphones, 
  Video, 
  Award,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Check
} from 'lucide-react';
import Link from 'next/link';
import { 
  RecoveryPlan, 
  StudyPacingMode, 
  PACING_MODES, 
  generateRecoveryPlan, 
  loadSavedRecoveryPlan, 
  togglePlanTask, 
  deleteSavedRecoveryPlan, 
  formatPlanForWhatsApp,
  DAY_COMPLETION_XP_REWARD
} from '@/lib/studyPlanner';
import { playSound } from '@/lib/audio/soundEngine';
import { useGamificationStore } from '@/modules/gamification/store/useGamificationStore';
import type { AcademicSubject } from '@/types/academic';

interface RecoveryPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubject?: AcademicSubject | null;
  subjectLectures?: Array<{ id: number; lecture_num: number; title: string }>;
  isDark?: boolean;
  isGirls?: boolean;
}

export default function RecoveryPlannerModal({
  isOpen,
  onClose,
  activeSubject,
  subjectLectures = [],
  isDark = true,
  isGirls = false,
}: RecoveryPlannerModalProps) {
  // State
  const [activePlan, setActivePlan] = useState<RecoveryPlan | null>(null);
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(0);
  const [targetDays, setTargetDays] = useState<number>(5);
  const [dailyMinutes, setDailyMinutes] = useState<number>(60);
  const [pacingMode, setPacingMode] = useState<StudyPacingMode>('fast');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  const [celebrationXp, setCelebrationXp] = useState<number>(50);

  // Load existing plan from LocalStorage on open
  useEffect(() => {
    if (isOpen) {
      const saved = loadSavedRecoveryPlan();
      if (saved) {
        setActivePlan(saved);
        // Find first uncompleted day
        const firstUnfinishedIdx = saved.days.findIndex(d => !d.isDayCompleted);
        setSelectedDayIdx(firstUnfinishedIdx >= 0 ? firstUnfinishedIdx : 0);
      } else {
        setActivePlan(null);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter lectures that can be studied
  const uncompletedLectures = subjectLectures.map(l => ({
    id: l.id,
    lecture_num: l.lecture_num,
    title: l.title,
    subjectId: activeSubject?.id,
    subjectName: activeSubject?.name,
  }));

  const handleCreatePlan = () => {
    if (uncompletedLectures.length === 0) return;

    playSound('streak_fire');
    const newPlan = generateRecoveryPlan({
      uncompletedLectures,
      targetDays,
      dailyMinutesBudget: dailyMinutes,
      pacingMode,
      subjectId: activeSubject?.id,
      subjectName: activeSubject?.name,
    });

    setActivePlan(newPlan);
    setSelectedDayIdx(0);
  };

  const handleToggleTask = (taskId: string) => {
    if (!activePlan) return;

    const { updatedPlan, dayJustCompleted, xpAwarded } = togglePlanTask(activePlan, taskId);
    setActivePlan(updatedPlan);

    if (dayJustCompleted) {
      playSound('level_up');
      setCelebrationXp(xpAwarded);
      setShowCelebration(true);

      // Award XP to gamification store authoritative state
      try {
        const storeState = useGamificationStore.getState();
        const currentXp = storeState.totalXp;
        storeState.reconcileWithServer({
          success: true,
          awardedXp: xpAwarded,
          profile: {
            id: storeState.userId || '',
            nickname: '',
            persona: isGirls ? 'girls' : 'boys',
            totalXp: currentXp + xpAwarded,
            level: Math.floor(Math.sqrt((currentXp + xpAwarded) / 60)) + 1,
            currentStreak: storeState.currentStreak,
            longestStreak: storeState.longestStreak,
            lastActiveDate: storeState.lastActiveDate,
            freezesLeft: storeState.freezesRemaining,
          },
          newBadges: [],
        });
      } catch (err) {
        console.error('Failed to dispatch XP reward to store:', err);
      }

      setTimeout(() => setShowCelebration(false), 3500);
    } else {
      playSound('quiz_correct');
    }
  };

  const handleResetPlan = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في إلغاء الخطة الحالية وبدء خطة إنقاذ جديدة؟')) {
      deleteSavedRecoveryPlan();
      setActivePlan(null);
      setSelectedDayIdx(0);
    }
  };

  const handleShareWhatsApp = () => {
    if (!activePlan) return;
    const shareText = formatPlanForWhatsApp(activePlan);
    navigator.clipboard.writeText(shareText).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    });
  };

  const currentDay = activePlan?.days[selectedDayIdx];
  const overallPercentage = activePlan && activePlan.totalTasks > 0
    ? Math.round((activePlan.completedTasksCount / activePlan.totalTasks) * 100)
    : 0;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div 
        className="w-full max-w-2xl rounded-3xl border shadow-2xl flex flex-col max-h-[92vh] overflow-hidden transition-all"
        style={{
          backgroundColor: isDark ? '#0B1120' : '#FFFFFF',
          borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(219, 234, 254, 0.9)',
          boxShadow: isDark 
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(59, 130, 246, 0.15)' 
            : '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
        dir="rtl"
      >
        {/* Header */}
        <div 
          className="p-4 sm:p-5 border-b flex items-center justify-between shrink-0"
          style={{
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(248, 250, 252, 0.8)',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border"
              style={{
                backgroundColor: isGirls ? 'rgba(244, 63, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                borderColor: isGirls ? 'rgba(244, 63, 94, 0.3)' : 'rgba(59, 130, 246, 0.3)',
                color: isGirls ? '#FB7185' : '#60A5FA',
              }}
            >
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black truncate" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                خطة الإنقاذ وسد التراكمات الذكية 🚀
              </h2>
              <p className="text-xs font-semibold opacity-75 truncate" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                {activeSubject?.name ? `مقرر: ${activeSubject.name}` : 'كلية التربية • تانية رياضيات'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activePlan && (
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="p-2 rounded-xl border transition-all hover:scale-105 active:scale-95 cursor-pointer text-xs font-bold flex items-center gap-1.5"
                style={{
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(236, 253, 245, 0.9)',
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(167, 243, 208, 0.8)',
                  color: isDark ? '#6EE7B7' : '#059669',
                }}
                title="مشاركة الخطة كنص مرتب على واتساب"
              >
                {isCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                <span className="hidden sm:inline">{isCopied ? 'تم النسخ!' : 'واتساب'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border transition-all hover:scale-105 active:scale-95 cursor-pointer"
              style={{
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                color: isDark ? '#94A3B8' : '#64748B',
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">

          {/* Celebration Banner for Day Completion */}
          {showCelebration && (
            <div 
              className="p-4 rounded-2xl border text-center animate-bounce shadow-lg flex items-center justify-center gap-3"
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                borderColor: 'rgba(245, 158, 11, 0.5)',
                color: '#FBBF24',
              }}
            >
              <Award className="w-7 h-7 shrink-0 text-amber-400" />
              <div className="text-right">
                <span className="block text-sm font-black">عاش يا بطل! أنهيت مهام اليوم بالكامل 🎉</span>
                <span className="block text-xs font-bold text-amber-300">
                  حصلت على +{celebrationXp} XP (قاهر التراكمات) وأضفناها لرصيدك باللوحة!
                </span>
              </div>
            </div>
          )}

          {/* VIEW 1: Active Plan Execution */}
          {activePlan ? (
            <div className="space-y-5">
              {/* Overall Progress Widget */}
              <div 
                className="p-4 rounded-2xl border flex flex-col gap-3"
                style={{
                  backgroundColor: isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(248, 250, 252, 0.9)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
                }}
              >
                <div className="flex items-center justify-between text-xs sm:text-sm font-black">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎯</span>
                    <span style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>إجمالي تقدم الخطة</span>
                  </div>
                  <span style={{ color: isGirls ? '#FB7185' : '#60A5FA' }}>
                    {overallPercentage}% ({activePlan.completedTasksCount} من {activePlan.totalTasks} مهمة)
                  </span>
                </div>

                <div 
                  className="w-full h-3 rounded-full overflow-hidden"
                  style={{ backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)' }}
                >
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${overallPercentage}%`,
                      background: isGirls
                        ? 'linear-gradient(90deg, #F43F5E, #FB7185)'
                        : 'linear-gradient(90deg, #3B82F6, #60A5FA)',
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-bold opacity-80 pt-1" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                  <span>المسار: {PACING_MODES[activePlan.pacingMode].title}</span>
                  <span>المكافأة المحصودة: +{activePlan.totalXpClaimed} XP</span>
                </div>
              </div>

              {/* Day Tabs */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-2 px-1" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                  أيام الخطة ({activePlan.days.length} أيام):
                </h3>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {activePlan.days.map((day, idx) => {
                    const isSelected = idx === selectedDayIdx;
                    return (
                      <button
                        key={day.dayNumber}
                        type="button"
                        onClick={() => setSelectedDayIdx(idx)}
                        className="px-3.5 py-2 rounded-xl border text-xs font-black shrink-0 transition-all cursor-pointer flex items-center gap-1.5"
                        style={{
                          backgroundColor: isSelected
                            ? (isGirls ? 'rgba(244, 63, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)')
                            : (isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'),
                          borderColor: isSelected
                            ? (isGirls ? '#F43F5E' : '#3B82F6')
                            : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'),
                          color: isSelected
                            ? (isGirls ? '#FB7185' : '#60A5FA')
                            : (isDark ? '#94A3B8' : '#64748B'),
                        }}
                      >
                        {day.isDayCompleted ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 opacity-40" />
                        )}
                        <span>{day.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Day's Tasks */}
              {currentDay && (
                <div 
                  className="p-4 sm:p-5 rounded-2xl border space-y-3"
                  style={{
                    backgroundColor: isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(248, 250, 252, 0.8)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                  }}
                >
                  <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }}>
                    <div>
                      <h4 className="text-sm font-black flex items-center gap-2" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                        <span>مهام {currentDay.title}</span>
                        {currentDay.isDayCompleted && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            مكتمل (+50 XP)
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] font-semibold opacity-75 mt-0.5" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                        الوقت المستهدف لليوم: {currentDay.targetMinutes} دقيقة مذاكرة مركّزة
                      </p>
                    </div>

                    <div className="text-xs font-black" style={{ color: isGirls ? '#FB7185' : '#60A5FA' }}>
                      {currentDay.tasks.filter(t => t.completed).length} / {currentDay.tasks.length} منجز
                    </div>
                  </div>

                  {/* Task Items List */}
                  <div className="space-y-2.5 pt-1">
                    {currentDay.tasks.map((task) => {
                      const getTaskIcon = () => {
                        switch (task.taskType) {
                          case 'guide': return <BookOpen className="w-4 h-4 text-emerald-400" />;
                          case 'audio': return <Headphones className="w-4 h-4 text-amber-400" />;
                          case 'video': return <Video className="w-4 h-4 text-sky-400" />;
                          case 'quiz': return <Zap className="w-4 h-4 text-purple-400" />;
                        }
                      };

                      const getActionLink = () => {
                        switch (task.taskType) {
                          case 'guide': return `/lecture?id=${task.lectureId}&tab=guide`;
                          case 'audio': return `/lecture?id=${task.lectureId}&tab=audio`;
                          case 'video': return `/lecture?id=${task.lectureId}&tab=video`;
                          case 'quiz': return `/lecture?id=${task.lectureId}&tab=quiz`;
                        }
                      };

                      return (
                        <div 
                          key={task.id}
                          className="p-3 rounded-xl border flex items-center justify-between gap-3 transition-all hover:scale-[1.01]"
                          style={{
                            backgroundColor: task.completed
                              ? (isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(236, 253, 245, 0.7)')
                              : (isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.9)'),
                            borderColor: task.completed
                              ? (isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(167, 243, 208, 0.8)')
                              : (isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'),
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Checkbox */}
                            <button
                              type="button"
                              onClick={() => handleToggleTask(task.id)}
                              className="p-1 rounded-lg transition-transform active:scale-90 cursor-pointer shrink-0"
                            >
                              {task.completed ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                              ) : (
                                <Circle className="w-5 h-5 opacity-40 hover:opacity-100" style={{ color: isDark ? '#94A3B8' : '#64748B' }} />
                              )}
                            </button>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {getTaskIcon()}
                                <span 
                                  className={`text-xs sm:text-sm font-bold truncate ${task.completed ? 'line-through opacity-60' : ''}`}
                                  style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
                                >
                                  {task.taskTitle}
                                </span>
                              </div>
                              <p className="text-[10px] font-semibold opacity-70 truncate mt-0.5" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                                {task.taskDescription}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span 
                              className="text-[10px] font-black px-2 py-0.5 rounded-md border"
                              style={{
                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                                color: isDark ? '#CBD5E1' : '#475569',
                              }}
                            >
                              {task.estimatedMinutes} د
                            </span>

                            <Link
                              href={getActionLink()}
                              target="_blank"
                              className="p-1.5 rounded-lg border transition-all hover:scale-110 active:scale-95 cursor-pointer text-xs font-bold"
                              style={{
                                backgroundColor: isGirls ? 'rgba(244, 63, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                borderColor: isGirls ? 'rgba(244, 63, 94, 0.25)' : 'rgba(59, 130, 246, 0.25)',
                                color: isGirls ? '#FB7185' : '#60A5FA',
                              }}
                              title="فتح المحاضرة مباشرة"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Reset Plan Button */}
              <div className="pt-2 flex justify-between items-center text-xs">
                <button
                  type="button"
                  onClick={handleResetPlan}
                  className="text-rose-400/80 hover:text-rose-400 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>إلغاء الخطة وبدء خطة جديدة</span>
                </button>

                <div className="text-[11px] font-medium opacity-60" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                  كل يوم تخلصه بتاخد +50 XP في المنصة 🌟
                </div>
              </div>
            </div>
          ) : (
            /* VIEW 2: Plan Generation Wizard */
            <div className="space-y-5">
              {/* Diagnostic Backlog Card */}
              <div 
                className="p-4 rounded-2xl border flex items-center gap-3.5"
                style={{
                  backgroundColor: isGirls ? 'rgba(244, 63, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                  borderColor: isGirls ? 'rgba(244, 63, 94, 0.3)' : 'rgba(59, 130, 246, 0.3)',
                }}
              >
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl"
                  style={{ backgroundColor: isGirls ? 'rgba(244, 63, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)' }}
                >
                  ⚡
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                    لديك {uncompletedLectures.length} محاضرات متاحة في {activeSubject?.name || 'هذا المقرر'}
                  </h3>
                  <p className="text-[11px] font-semibold opacity-80 mt-0.5" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                    اختر ميزانيتك اليومية وسيقوم الخوارزم الذكي بتقطيع المنهج عليك بالتساوي دون أي ضغط ذهني.
                  </p>
                </div>
              </div>

              {/* Setting 1: Duration (Days) */}
              <div className="space-y-2">
                <label className="block text-xs font-black" style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                  📅 المدى الزمني للإنهاء:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { days: 3, label: '3 أيام (طوارئ ميدترم)', sub: 'مكثف سريع' },
                    { days: 5, label: '5 أيام (أسبوع دراسي)', sub: 'متوازن' },
                    { days: 7, label: '7 أيام (أسبوع كامل)', sub: 'مريح' },
                    { days: 10, label: '10 أيام (روقان)', sub: 'تأسيس هادئ' },
                  ].map(opt => (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => setTargetDays(opt.days)}
                      className="p-3 rounded-2xl border text-right transition-all cursor-pointer"
                      style={{
                        backgroundColor: targetDays === opt.days
                          ? (isGirls ? 'rgba(244, 63, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)')
                          : (isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'),
                        borderColor: targetDays === opt.days
                          ? (isGirls ? '#F43F5E' : '#3B82F6')
                          : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'),
                      }}
                    >
                      <span className="block text-xs font-black" style={{ color: targetDays === opt.days ? (isGirls ? '#FB7185' : '#60A5FA') : (isDark ? '#F8FAFC' : '#0F172A') }}>
                        {opt.label}
                      </span>
                      <span className="block text-[10px] font-semibold opacity-60 mt-0.5" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                        {opt.sub}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Setting 2: Daily Budget (Minutes) */}
              <div className="space-y-2">
                <label className="block text-xs font-black" style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                  ⏱️ وقت المذاكرة المتاح لك يومياً:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { minutes: 30, label: '30 دقيقة', sub: 'نصف ساعة يومياً' },
                    { minutes: 45, label: '45 دقيقة', sub: 'جلسة تركيز واحدة' },
                    { minutes: 60, label: '60 دقيقة', sub: 'ساعة يومياً (مثالي)' },
                    { minutes: 90, label: '90 دقيقة', sub: 'ساعة ونصف للفرم' },
                  ].map(opt => (
                    <button
                      key={opt.minutes}
                      type="button"
                      onClick={() => setDailyMinutes(opt.minutes)}
                      className="p-3 rounded-2xl border text-right transition-all cursor-pointer"
                      style={{
                        backgroundColor: dailyMinutes === opt.minutes
                          ? (isGirls ? 'rgba(244, 63, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)')
                          : (isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'),
                        borderColor: dailyMinutes === opt.minutes
                          ? (isGirls ? '#F43F5E' : '#3B82F6')
                          : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'),
                      }}
                    >
                      <span className="block text-xs font-black" style={{ color: dailyMinutes === opt.minutes ? (isGirls ? '#FB7185' : '#60A5FA') : (isDark ? '#F8FAFC' : '#0F172A') }}>
                        {opt.label}
                      </span>
                      <span className="block text-[10px] font-semibold opacity-60 mt-0.5" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                        {opt.sub}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Setting 3: Pacing Mode */}
              <div className="space-y-2">
                <label className="block text-xs font-black" style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                  🎯 مسار المذاكرة المفضل:
                </label>
                <div className="space-y-2">
                  {(Object.keys(PACING_MODES) as StudyPacingMode[]).map(modeKey => {
                    const mode = PACING_MODES[modeKey];
                    const isSelected = pacingMode === modeKey;
                    return (
                      <div
                        key={modeKey}
                        onClick={() => setPacingMode(modeKey)}
                        className="p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 hover:scale-[1.01]"
                        style={{
                          backgroundColor: isSelected
                            ? (isGirls ? 'rgba(244, 63, 94, 0.12)' : 'rgba(59, 130, 246, 0.12)')
                            : (isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'),
                          borderColor: isSelected
                            ? (isGirls ? '#F43F5E' : '#3B82F6')
                            : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'),
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{mode.icon}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-black" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                                {mode.title}
                              </span>
                              <span 
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                                style={{
                                  backgroundColor: isGirls ? 'rgba(244, 63, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                  borderColor: isGirls ? 'rgba(244, 63, 94, 0.25)' : 'rgba(59, 130, 246, 0.25)',
                                  color: isGirls ? '#FB7185' : '#60A5FA',
                                }}
                              >
                                {mode.badge}
                              </span>
                            </div>
                            <p className="text-[11px] font-semibold opacity-75 mt-0.5" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                              {mode.description}
                            </p>
                          </div>
                        </div>

                        <div className="text-left shrink-0">
                          <span className="text-xs font-black" style={{ color: isGirls ? '#FB7185' : '#60A5FA' }}>
                            {mode.subtitle}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCreatePlan}
                  className="w-full py-3.5 px-4 rounded-2xl font-black text-sm text-white shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
                  style={{
                    background: isGirls
                      ? 'linear-gradient(135deg, #F43F5E, #E11D48)'
                      : 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                    boxShadow: isGirls
                      ? '0 10px 25px -5px rgba(244, 63, 94, 0.4)'
                      : '0 10px 25px -5px rgba(37, 99, 235, 0.4)',
                  }}
                >
                  <Zap className="w-4 h-4" />
                  <span>توليد وتوزيع خطة الإنقاذ الآن 🚀</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div 
          className="p-3 sm:p-4 border-t flex items-center justify-between text-xs"
          style={{
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(248, 250, 252, 0.8)',
          }}
        >
          <div className="text-[11px] font-bold opacity-75" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
            {activePlan ? `خطة نشطة: ${activePlan.days.length} أيام` : 'خوارزمية ذكية لا تستهلك أي سيرفرات (0-Ops)'}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer"
            style={{
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
              color: isDark ? '#CBD5E1' : '#334155',
            }}
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
}
