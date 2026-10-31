'use client';

import React, { useState, useEffect } from 'react';
import { 
  Headphones, 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Flame, 
  Award,
  CloudRain,
  Radio,
  Coffee,
  Check
} from 'lucide-react';
import { 
  AmbientSoundType, 
  setAmbientSound, 
  setAmbientVolume, 
  stopAmbientSound, 
  getCurrentAmbientType, 
  getCurrentAmbientVolume,
  POMODORO_FOCUS_MINUTES,
  POMODORO_BREAK_MINUTES,
  FOCUS_SESSION_XP_REWARD,
  STORAGE_KEY_POMODORO,
  PomodoroState
} from '@/lib/ambientFocusEngine';
import { playSound } from '@/lib/audio/soundEngine';
import { useGamificationStore } from '@/modules/gamification/store/useGamificationStore';

interface FocusAmbienceModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
  isGirls?: boolean;
}

export default function FocusAmbienceModal({
  isOpen,
  onClose,
  isDark = true,
  isGirls = false,
}: FocusAmbienceModalProps) {
  // Ambient Sound State
  const [ambientType, setAmbientType] = useState<AmbientSoundType>('none');
  const [volume, setVolume] = useState<number>(0.5);

  // Pomodoro State
  const [isActive, setIsActive] = useState<boolean>(false);
  const [phase, setPhase] = useState<'focus' | 'break'>('focus');
  const [remainingSeconds, setRemainingSeconds] = useState<number>(POMODORO_FOCUS_MINUTES * 60);
  const [sessionsCompleted, setSessionsCompleted] = useState<number>(0);
  const [showXpCelebration, setShowXpCelebration] = useState<boolean>(false);

  // Sync ambient sound and timer from storage on mount
  useEffect(() => {
    setAmbientType(getCurrentAmbientType());
    setVolume(getCurrentAmbientVolume());

    try {
      const saved = localStorage.getItem(STORAGE_KEY_POMODORO);
      if (saved) {
        const parsed: PomodoroState = JSON.parse(saved);
        setPhase(parsed.phase);
        setRemainingSeconds(parsed.remainingSeconds);
        setSessionsCompleted(parsed.totalSessionsCompleted);
      }
    } catch {}
  }, []);

  // Pomodoro Timer Interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && remainingSeconds > 0) {
      interval = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            // Phase Completed!
            if (phase === 'focus') {
              // Focus period finished -> Award +15 XP!
              playSound('level_up');
              setSessionsCompleted(s => s + 1);
              setShowXpCelebration(true);
              setTimeout(() => setShowXpCelebration(false), 3500);

              // Award XP in Gamification Store
              try {
                const store = useGamificationStore.getState();
                const curXp = store.totalXp;
                store.reconcileWithServer({
                  success: true,
                  awardedXp: FOCUS_SESSION_XP_REWARD,
                  profile: {
                    id: store.userId || '',
                    nickname: '',
                    persona: isGirls ? 'girls' : 'boys',
                    totalXp: curXp + FOCUS_SESSION_XP_REWARD,
                    level: Math.floor(Math.sqrt((curXp + FOCUS_SESSION_XP_REWARD) / 60)) + 1,
                    currentStreak: store.currentStreak,
                    longestStreak: store.longestStreak,
                    lastActiveDate: store.lastActiveDate,
                    freezesLeft: store.freezesRemaining,
                  },
                  newBadges: [],
                });
              } catch (e) {
                console.error('Failed to award focus XP:', e);
              }

              // Switch to Break
              setPhase('break');
              return POMODORO_BREAK_MINUTES * 60;
            } else {
              // Break finished -> switch to Focus
              playSound('streak_fire');
              setPhase('focus');
              return POMODORO_FOCUS_MINUTES * 60;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, phase, remainingSeconds, isGirls]);

  // Save Pomodoro state to LocalStorage
  useEffect(() => {
    try {
      const state: PomodoroState = {
        isActive,
        isPaused: !isActive && remainingSeconds < (phase === 'focus' ? POMODORO_FOCUS_MINUTES * 60 : POMODORO_BREAK_MINUTES * 60),
        phase,
        remainingSeconds,
        totalSessionsCompleted: sessionsCompleted,
      };
      localStorage.setItem(STORAGE_KEY_POMODORO, JSON.stringify(state));
    } catch {}
  }, [isActive, phase, remainingSeconds, sessionsCompleted]);

  const handleSelectAmbient = (type: AmbientSoundType) => {
    if (ambientType === type) {
      stopAmbientSound();
      setAmbientType('none');
    } else {
      setAmbientSound(type, volume);
      setAmbientType(type);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setAmbientVolume(val);
  };

  const toggleTimer = () => {
    if (!isActive) {
      playSound('streak_fire');
      // If no ambient sound is active, auto-start Brown noise for focus
      if (ambientType === 'none') {
        setAmbientSound('brown', volume);
        setAmbientType('brown');
      }
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setPhase('focus');
    setRemainingSeconds(POMODORO_FOCUS_MINUTES * 60);
  };

  if (!isOpen) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const totalTargetSec = phase === 'focus' ? POMODORO_FOCUS_MINUTES * 60 : POMODORO_BREAK_MINUTES * 60;
  const progressPct = Math.round(((totalTargetSec - remainingSeconds) / totalTargetSec) * 100);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div 
        className="w-full max-w-lg rounded-3xl border shadow-2xl flex flex-col overflow-hidden transition-all"
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
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border"
              style={{
                backgroundColor: isGirls ? 'rgba(244, 63, 94, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                borderColor: isGirls ? 'rgba(244, 63, 94, 0.3)' : 'rgba(168, 85, 247, 0.3)',
                color: isGirls ? '#FB7185' : '#C084FC',
              }}
            >
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                ركن التركيز التوليدي ومؤقت بومودورو 🧘
              </h2>
              <p className="text-xs font-semibold opacity-75" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                أصوات مهدئة تُخلق لحظياً بدون إنترنت + مؤقت فترات التركيز
              </p>
            </div>
          </div>

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

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-6">

          {/* XP Celebration Banner */}
          {showXpCelebration && (
            <div 
              className="p-3.5 rounded-2xl border text-center animate-bounce shadow-lg flex items-center justify-center gap-2.5"
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                borderColor: 'rgba(245, 158, 11, 0.5)',
                color: '#FBBF24',
              }}
            >
              <Award className="w-6 h-6 text-amber-400" />
              <span className="text-xs font-black">
                أنجزت جلسة تركيز كاملة وحصلت على +15 XP في لوحة الشرف! 🌟
              </span>
            </div>
          )}

          {/* SECTION 1: Pomodoro Timer Widget */}
          <div 
            className="p-5 rounded-3xl border flex flex-col items-center justify-center text-center relative overflow-hidden"
            style={{
              backgroundColor: isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(248, 250, 252, 0.9)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            }}
          >
            {/* Phase Badge */}
            <div className="flex items-center gap-2 mb-3">
              <span 
                className="text-xs font-black px-3 py-1 rounded-full border flex items-center gap-1.5"
                style={{
                  backgroundColor: phase === 'focus'
                    ? (isGirls ? 'rgba(244, 63, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)')
                    : 'rgba(16, 185, 129, 0.15)',
                  borderColor: phase === 'focus'
                    ? (isGirls ? '#F43F5E' : '#3B82F6')
                    : '#10B981',
                  color: phase === 'focus'
                    ? (isGirls ? '#FB7185' : '#60A5FA')
                    : '#34D399',
                }}
              >
                {phase === 'focus' ? '🎯 فترة تركيز ومذاكرة (25 دقيقة)' : '☕ استراحة وتمدد (5 دقائق)'}
              </span>
            </div>

            {/* Huge Timer Digits */}
            <div 
              className="text-5xl sm:text-6xl font-black font-mono tracking-wider mb-3 select-none"
              style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
            >
              {timeFormatted}
            </div>

            {/* Circular Progress Bar Line */}
            <div 
              className="w-full max-w-xs h-2 rounded-full overflow-hidden mb-5"
              style={{ backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }}
            >
              <div 
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progressPct}%`,
                  background: phase === 'focus'
                    ? (isGirls ? 'linear-gradient(90deg, #F43F5E, #FB7185)' : 'linear-gradient(90deg, #3B82F6, #60A5FA)')
                    : 'linear-gradient(90deg, #10B981, #34D399)',
                }}
              />
            </div>

            {/* Timer Controls */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleTimer}
                className="px-6 py-2.5 rounded-2xl font-black text-sm text-white shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
                style={{
                  background: isActive
                    ? 'linear-gradient(135deg, #EF4444, #DC2626)'
                    : (isGirls
                        ? 'linear-gradient(135deg, #F43F5E, #E11D48)'
                        : 'linear-gradient(135deg, #2563EB, #1D4ED8)'),
                }}
              >
                {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isActive ? 'إيقاف مؤقت' : 'ابدأ جلسة التركيز'}</span>
              </button>

              <button
                type="button"
                onClick={resetTimer}
                className="p-2.5 rounded-2xl border transition-all hover:scale-105 active:scale-95 cursor-pointer opacity-70 hover:opacity-100"
                style={{
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                  color: isDark ? '#CBD5E1' : '#475569',
                }}
                title="إعادة ضبط المؤقت"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Sessions count badge */}
            <div className="text-[11px] font-bold opacity-75 mt-4" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
              جلسات التركيز المكتملة اليوم: <span className="font-black text-amber-400">{sessionsCompleted} جلسة</span> (+{sessionsCompleted * 15} XP)
            </div>
          </div>

          {/* SECTION 2: Zero-Bandwidth Procedural Ambient Sounds */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <label className="text-xs font-black flex items-center gap-1.5" style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                <Radio className="w-4 h-4 text-purple-400" />
                <span>أصوات عزل الضوضاء التوليدية (بدون استهلاك إنترنت):</span>
              </label>

              {ambientType !== 'none' && (
                <button
                  type="button"
                  onClick={() => handleSelectAmbient('none')}
                  className="text-[11px] font-bold text-rose-400 hover:underline cursor-pointer"
                >
                  إيقاف الصوت
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {[
                {
                  type: 'brown' as AmbientSoundType,
                  title: 'ضوضاء براونية',
                  sub: 'الأفضل للرياضيات',
                  emoji: '🟤',
                },
                {
                  type: 'rain' as AmbientSoundType,
                  title: 'صوت المطر',
                  sub: 'استرخاء وتركيز',
                  emoji: '🌧️',
                },
                {
                  type: 'white' as AmbientSoundType,
                  title: 'ضوضاء بيضاء',
                  sub: 'عزل تام للمحيط',
                  emoji: '⚪',
                },
              ].map(opt => {
                const isSelected = ambientType === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => handleSelectAmbient(opt.type)}
                    className="p-3 rounded-2xl border text-center transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      backgroundColor: isSelected
                        ? (isGirls ? 'rgba(244, 63, 94, 0.18)' : 'rgba(168, 85, 247, 0.18)')
                        : (isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'),
                      borderColor: isSelected
                        ? (isGirls ? '#F43F5E' : '#A855F7')
                        : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'),
                    }}
                  >
                    <span className="text-xl block mb-1">{opt.emoji}</span>
                    <span 
                      className="block text-xs font-black truncate"
                      style={{ color: isSelected ? (isGirls ? '#FB7185' : '#C084FC') : (isDark ? '#F8FAFC' : '#0F172A') }}
                    >
                      {opt.title}
                    </span>
                    <span className="block text-[10px] font-semibold opacity-60 truncate mt-0.5" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                      {opt.sub}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Volume Slider */}
            {ambientType !== 'none' && (
              <div 
                className="p-3 rounded-2xl border flex items-center gap-3 animate-in fade-in"
                style={{
                  backgroundColor: isDark ? 'rgba(15, 23, 42, 0.3)' : 'rgba(248, 250, 252, 0.6)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
                }}
              >
                {volume === 0 ? <VolumeX className="w-4 h-4 opacity-50" /> : <Volume2 className="w-4 h-4 text-purple-400" />}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="flex-1 accent-purple-500 cursor-pointer h-1.5 rounded-lg"
                />
                <span className="text-xs font-bold w-10 text-left opacity-75" style={{ color: isDark ? '#CBD5E1' : '#475569' }}>
                  {Math.round(volume * 100)}%
                </span>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div 
          className="p-3.5 sm:p-4 border-t flex items-center justify-between text-xs"
          style={{
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(248, 250, 252, 0.8)',
          }}
        >
          <div className="text-[11px] font-bold opacity-75" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
            الصوت يظل يعمل في الخلفية أثناء حل الكويزات أو تصفح الملخصات 🎧
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
            إغلاق ومتابعة المذاكرة
          </button>
        </div>
      </div>
    </div>
  );
}
