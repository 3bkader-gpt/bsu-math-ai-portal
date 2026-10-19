'use client';

import { useState, useEffect } from 'react';
import {
  useTotalXp,
  useLevel,
  useStreak,
  useBadges,
  usePendingCount,
  useIsSyncing,
} from '@/modules/gamification/store/useGamificationStore';
import { getXpRequiredForLevel, getLevelTitle } from '@/modules/gamification/core/xp';
import { GAMIFICATION_CONFIG } from '@/config/gamification-rules';
import { fetchCohortLeaderboard } from '@/modules/gamification/supabase/gamification';
import { LeaderboardEntry } from '@/modules/gamification/supabase/types';
import {
  Flame,
  Zap,
  Award,
  Trophy,
  Shield,
  X,
  ChevronRight,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export function StudentGamificationPill({
  isGirls = false,
  isDark = false,
}: {
  isGirls?: boolean;
  isDark?: boolean;
}) {
  const totalXp = useTotalXp();
  const level = useLevel();
  const streak = useStreak();
  const unlockedBadges = useBadges();
  const pendingCount = usePendingCount();
  const isSyncing = useIsSyncing();

  const [isOpen, setIsOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'progress' | 'badges' | 'leaderboard'>('progress');
  const [loadingLb, setLoadingLb] = useState(false);

  // Level calculations
  const currentLevelBaseXp = getXpRequiredForLevel(level);
  const nextLevelXp = getXpRequiredForLevel(level + 1);
  const levelProgressPercent = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        ((totalXp - currentLevelBaseXp) /
          Math.max(1, nextLevelXp - currentLevelBaseXp)) *
          100
      )
    )
  );

  const levelTitle = getLevelTitle(level);

  const handleOpen = () => {
    setIsOpen(true);
    if (leaderboard.length === 0) {
      setLoadingLb(true);
      fetchCohortLeaderboard(20)
        .then((data) => setLeaderboard(data))
        .catch(() => {})
        .finally(() => setLoadingLb(false));
    }
  };

  return (
    <>
      {/* Top Navbar Floating Pill */}
      <button
        onClick={handleOpen}
        type="button"
        title="انقر لعرض نقاطك والشارات ولوحة الشرف"
        style={{
          backgroundColor: isGirls
            ? isDark
              ? 'rgba(255, 101, 132, 0.12)'
              : 'rgba(255, 240, 245, 0.9)'
            : isDark
            ? 'rgba(45, 212, 191, 0.12)'
            : 'rgba(230, 244, 241, 0.9)',
          borderColor: isGirls
            ? isDark
              ? 'rgba(255, 101, 132, 0.35)'
              : '#F4D7DE'
            : isDark
            ? 'rgba(45, 212, 191, 0.35)'
            : '#B2DFDB',
        }}
        className="group relative flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-3.5 py-1.5 rounded-full border shadow-sm hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer text-xs sm:text-sm font-bold"
      >
        {/* Streak Flame */}
        <div className="flex items-center gap-1 text-amber-500 dark:text-amber-400">
          <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-500 animate-pulse" />
          <span className="font-extrabold">{streak}</span>
        </div>

        <span className="text-gray-300 dark:text-gray-700 font-light">•</span>

        {/* Total XP */}
        <div className="flex items-center gap-1 text-teal-600 dark:text-teal-300">
          <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-teal-500 dark:fill-teal-400" />
          <span className="font-black font-mono">{totalXp}</span>
          <span className="text-[10px] opacity-75">XP</span>
        </div>

        <span className="text-gray-300 dark:text-gray-700 font-light hidden xs:inline">•</span>

        {/* Level Tag */}
        <div
          style={{
            backgroundColor: isGirls
              ? 'rgba(244, 114, 182, 0.2)'
              : 'rgba(20, 184, 166, 0.2)',
          }}
          className="hidden xs:flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-bold"
        >
          <span>Lv.{level}</span>
        </div>

        {/* Pending Sync Dot */}
        {pendingCount > 0 && (
          <span
            title={`جاري مزامنة ${pendingCount} من الأحداث في الخلفية`}
            className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute -top-0.5 -right-0.5"
          />
        )}
      </button>

      {/* Gamification Modal / Drawer */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          dir="rtl"
        >
          <div
            style={{
              backgroundColor: isDark ? '#131922' : '#FFFFFF',
              borderColor: isDark ? '#1E2B3A' : '#E3D7C1',
            }}
            className="w-full max-w-lg rounded-2xl sm:rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div
              style={{
                backgroundColor: isGirls
                  ? isDark
                    ? 'rgba(255, 101, 132, 0.15)'
                    : '#FFF0F3'
                  : isDark
                  ? 'rgba(45, 212, 191, 0.12)'
                  : '#E6F4F1',
                borderColor: isDark ? '#1E2B3A' : '#E3D7C1',
              }}
              className="px-5 py-4 border-b flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center text-xl">
                  {isGirls ? '🎀' : '🎓'}
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-gray-900 dark:text-gray-100">
                    ملف الإنجازات الأكاديمي
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {levelTitle} • المستوى {level}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-800 px-4 pt-2 gap-2 text-xs font-bold">
              <button
                onClick={() => setActiveTab('progress')}
                className={`pb-2.5 px-3 border-b-2 transition-colors ${
                  activeTab === 'progress'
                    ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                    : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                المستوى والتقدم
              </button>
              <button
                onClick={() => setActiveTab('badges')}
                className={`pb-2.5 px-3 border-b-2 transition-colors ${
                  activeTab === 'badges'
                    ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                    : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                الأوسمة والشارات ({unlockedBadges.length})
              </button>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`pb-2.5 px-3 border-b-2 transition-colors ${
                  activeTab === 'leaderboard'
                    ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                    : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                لوحة شرف الدفعة 🏆
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {activeTab === 'progress' && (
                <div className="space-y-4">
                  {/* XP & Level Card */}
                  <div
                    style={{
                      backgroundColor: isDark ? '#1C2533' : '#FAF5EA',
                      borderColor: isDark ? '#2A3B4F' : '#E3D7C1',
                    }}
                    className="p-4 rounded-2xl border space-y-3"
                  >
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-gray-700 dark:text-gray-300">
                        التقدم للمستوى {level + 1}
                      </span>
                      <span className="text-teal-600 dark:text-teal-400 font-mono">
                        {totalXp} / {nextLevelXp} XP
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-3 overflow-hidden p-0.5">
                      <div
                        className="bg-gradient-to-l from-teal-400 to-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${levelProgressPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                      <span>{levelProgressPercent}% مكتمل</span>
                      <span>باقي {Math.max(0, nextLevelXp - totalXp)} XP للترقية</span>
                    </div>
                  </div>

                  {/* Streak & Freeze Status */}
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      style={{
                        backgroundColor: isDark ? '#1C2533' : '#FAF5EA',
                        borderColor: isDark ? '#2A3B4F' : '#E3D7C1',
                      }}
                      className="p-3.5 rounded-2xl border flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                        <Flame className="w-5 h-5 fill-amber-500" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                          أيام الاستمرار
                        </div>
                        <div className="text-base font-extrabold text-gray-900 dark:text-gray-100">
                          {streak} {streak === 1 ? 'يوم' : 'أيام'}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        backgroundColor: isDark ? '#1C2533' : '#FAF5EA',
                        borderColor: isDark ? '#2A3B4F' : '#E3D7C1',
                      }}
                      className="p-3.5 rounded-2xl border flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-500 flex items-center justify-center shrink-0">
                        <Shield className="w-5 h-5 fill-sky-500" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                          درع التجميد
                        </div>
                        <div className="text-base font-extrabold text-gray-900 dark:text-gray-100">
                          1 متاح
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Egyptian Badges Highlight */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      أحدث الشارات المفتوحة
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {GAMIFICATION_CONFIG.badges
                        .filter((b) => unlockedBadges.includes(b.id))
                        .slice(0, 4)
                        .map((b) => (
                          <div
                            key={b.id}
                            className="p-2.5 rounded-xl border border-teal-500/30 bg-teal-500/5 flex items-center gap-2.5"
                          >
                            <span className="text-2xl">{b.icon}</span>
                            <div>
                              <div className="font-bold text-xs text-teal-600 dark:text-teal-300">
                                {b.title}
                              </div>
                              <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                {b.description}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'badges' && (
                <div className="grid grid-cols-1 gap-2.5">
                  {GAMIFICATION_CONFIG.badges.map((b) => {
                    const isUnlocked = unlockedBadges.includes(b.id);
                    return (
                      <div
                        key={b.id}
                        style={{
                          backgroundColor: isUnlocked
                            ? isDark
                              ? 'rgba(45, 212, 191, 0.08)'
                              : '#E6F4F1'
                            : isDark
                            ? '#1A222D'
                            : '#F5F5F5',
                          borderColor: isUnlocked
                            ? isDark
                              ? 'rgba(45, 212, 191, 0.3)'
                              : '#B2DFDB'
                            : isDark
                            ? '#243242'
                            : '#E0E0E0',
                        }}
                        className={`p-3 rounded-2xl border flex items-center gap-3.5 transition-all ${
                          !isUnlocked ? 'opacity-60 grayscale' : 'shadow-sm'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-3xl shrink-0">
                          {b.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h5 className="font-extrabold text-sm text-gray-900 dark:text-gray-100">
                              {b.title}
                            </h5>
                            {isUnlocked ? (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                                مفتوح ✓
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400 font-medium">
                                مقفول 🔒
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                            {b.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === 'leaderboard' && (
                <div className="space-y-3">
                  {loadingLb ? (
                    <div className="text-center py-8 text-gray-400 text-xs font-semibold animate-pulse">
                      جاري تحميل لوحة شرف الدفعة...
                    </div>
                  ) : leaderboard.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-xs">
                      لا يوجد متسابقين حتى الآن. ابدأ بالمذاكرة لتكون الأول!
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {leaderboard.map((student) => (
                        <div
                          key={student.user_id}
                          className="py-2.5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-6 text-center font-black ${
                                student.rank === 1
                                  ? 'text-amber-500 text-base'
                                  : student.rank === 2
                                  ? 'text-gray-400 text-sm'
                                  : student.rank === 3
                                  ? 'text-amber-700 text-sm'
                                  : 'text-gray-500'
                              }`}
                            >
                              {student.rank === 1
                                ? '🥇'
                                : student.rank === 2
                                ? '🥈'
                                : student.rank === 3
                                ? '🥉'
                                : `#${student.rank}`}
                            </span>
                            <div>
                              <div className="font-bold text-gray-900 dark:text-gray-100">
                                {student.nickname}
                              </div>
                              <div className="text-[10px] text-gray-400">
                                المستوى {student.level} • {student.current_streak} يوم استمرار 🔥
                              </div>
                            </div>
                          </div>
                          <div className="font-mono font-extrabold text-teal-600 dark:text-teal-400 text-sm">
                            {student.total_xp} XP
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
