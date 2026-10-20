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
  Volume2,
  VolumeX,
  Moon,
  Target,
  Headphones,
  Video,
  Layers,
} from 'lucide-react';
import { isAudioMuted, toggleAudioMute } from '@/lib/audio/soundEngine';

const BADGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles,
  Flame,
  Zap,
  Target,
  Moon,
  Headphones,
  Video,
  Layers,
  Award,
  Trophy,
};

function BadgeIcon({ name, className = 'w-5 h-5' }: { name: string; className?: string }) {
  const Icon = BADGE_ICONS[name] || Award;
  return <Icon className={className} />;
}

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
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    setIsMuted(isAudioMuted());
  }, []);

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
        <div
          style={{ color: isDark ? '#5EEAD4' : '#0D9488' }}
          className="flex items-center gap-1"
        >
          <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
          <span className="font-black font-mono">{totalXp}</span>
          <span className="text-[10px] opacity-75">XP</span>
        </div>

        <span className="text-gray-400 dark:text-gray-600 font-light hidden xs:inline">•</span>

        {/* Level Tag */}
        <div
          style={{
            backgroundColor: isGirls
              ? (isDark ? 'rgba(244, 114, 182, 0.25)' : 'rgba(244, 114, 182, 0.2)')
              : (isDark ? 'rgba(45, 212, 191, 0.25)' : 'rgba(20, 184, 166, 0.2)'),
            color: isGirls
              ? (isDark ? '#F472B6' : '#BE185D')
              : (isDark ? '#5EEAD4' : '#0D9488'),
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
          className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 ${
            isDark ? 'dark' : ''
          }`}
          dir="rtl"
        >
          <div
            style={{
              backgroundColor: isDark ? '#131922' : '#FFFFFF',
              borderColor: isDark ? '#1E2B3A' : '#E3D7C1',
              color: isDark ? '#F1F5F9' : '#162828',
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
                <div
                  style={{
                    backgroundColor: isGirls
                      ? 'rgba(244, 114, 182, 0.2)'
                      : 'rgba(20, 184, 166, 0.2)',
                    color: isGirls ? '#F472B6' : '#2DD4BF',
                  }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                >
                  {isGirls ? '🎀' : '🎓'}
                </div>
                <div>
                  <h3
                    style={{ color: isDark ? '#F1F5F9' : '#162828' }}
                    className="font-extrabold text-base sm:text-lg"
                  >
                    ملف الإنجازات الأكاديمي
                  </h3>
                  <p
                    style={{ color: isDark ? '#94A3B8' : '#526E6E' }}
                    className="text-xs font-medium"
                  >
                    {levelTitle} • المستوى {level}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsMuted(toggleAudioMute())}
                  title={isMuted ? 'تفعيل المؤثرات الصوتية 🔊' : 'كتم المؤثرات الصوتية 🔇'}
                  style={{ color: isDark ? '#CBD5E1' : '#526E6E' }}
                  className="w-8 h-8 rounded-full hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-rose-500" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-teal-400" />
                  )}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{ color: isDark ? '#CBD5E1' : '#526E6E' }}
                  className="w-8 h-8 rounded-full hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div
              style={{ borderColor: isDark ? '#1E2B3A' : '#E3D7C1' }}
              className="flex border-b px-4 pt-2 gap-2 text-xs font-bold"
            >
              <button
                onClick={() => setActiveTab('progress')}
                style={{
                  color:
                    activeTab === 'progress'
                      ? isDark
                        ? '#2DD4BF'
                        : '#0D9488'
                      : isDark
                      ? '#94A3B8'
                      : '#526E6E',
                  borderColor: activeTab === 'progress' ? '#2DD4BF' : 'transparent',
                }}
                className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'progress' ? 'font-black' : 'font-medium'
                }`}
              >
                المستوى والتقدم
              </button>
              <button
                onClick={() => setActiveTab('badges')}
                style={{
                  color:
                    activeTab === 'badges'
                      ? isDark
                        ? '#2DD4BF'
                        : '#0D9488'
                      : isDark
                      ? '#94A3B8'
                      : '#526E6E',
                  borderColor: activeTab === 'badges' ? '#2DD4BF' : 'transparent',
                }}
                className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'badges' ? 'font-black' : 'font-medium'
                }`}
              >
                الأوسمة والشارات ({unlockedBadges.length})
              </button>
              <button
                onClick={() => setActiveTab('leaderboard')}
                style={{
                  color:
                    activeTab === 'leaderboard'
                      ? isDark
                        ? '#2DD4BF'
                        : '#0D9488'
                      : isDark
                      ? '#94A3B8'
                      : '#526E6E',
                  borderColor: activeTab === 'leaderboard' ? '#2DD4BF' : 'transparent',
                }}
                className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'leaderboard' ? 'font-black' : 'font-medium'
                }`}
              >
                لوحة شرف الدفعة 🏆
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 no-scrollbar">
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
                      <span style={{ color: isDark ? '#F1F5F9' : '#162828' }}>
                        التقدم للمستوى {level + 1}
                      </span>
                      <span
                        style={{ color: isDark ? '#2DD4BF' : '#0D9488' }}
                        className="font-mono font-black"
                      >
                        {totalXp} / {nextLevelXp} XP
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div
                      style={{ backgroundColor: isDark ? '#0E1724' : '#E2E8F0' }}
                      className="w-full rounded-full h-3 overflow-hidden p-0.5"
                    >
                      <div
                        className="bg-gradient-to-l from-teal-400 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-sm"
                        style={{ width: `${levelProgressPercent}%` }}
                      />
                    </div>
                    <div
                      style={{ color: isDark ? '#94A3B8' : '#526E6E' }}
                      className="flex justify-between text-[11px] font-medium"
                    >
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
                        <div
                          style={{ color: isDark ? '#94A3B8' : '#526E6E' }}
                          className="text-xs font-medium"
                        >
                          أيام الاستمرار
                        </div>
                        <div
                          style={{ color: isDark ? '#F1F5F9' : '#162828' }}
                          className="text-base font-extrabold"
                        >
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
                      <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
                        <Shield className="w-5 h-5 fill-sky-400" />
                      </div>
                      <div>
                        <div
                          style={{ color: isDark ? '#94A3B8' : '#526E6E' }}
                          className="text-xs font-medium"
                        >
                          درع التجميد
                        </div>
                        <div
                          style={{ color: isDark ? '#F1F5F9' : '#162828' }}
                          className="text-base font-extrabold"
                        >
                          1 متاح
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Egyptian Badges Highlight */}
                  <div className="space-y-2">
                    <h4
                      style={{ color: isDark ? '#CBD5E1' : '#526E6E' }}
                      className="text-xs font-bold uppercase tracking-wider"
                    >
                      أحدث الشارات المفتوحة
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {GAMIFICATION_CONFIG.badges
                        .filter((b) => unlockedBadges.includes(b.id))
                        .slice(0, 4)
                        .map((b) => (
                          <div
                            key={b.id}
                            style={{
                              backgroundColor: isDark
                                ? 'rgba(45, 212, 191, 0.1)'
                                : '#E6F4F1',
                              borderColor: isDark
                                ? 'rgba(45, 212, 191, 0.3)'
                                : '#B2DFDB',
                            }}
                            className="p-2.5 rounded-xl border flex items-center gap-2.5"
                          >
                            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0">
                              <BadgeIcon name={b.icon} className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div
                                style={{ color: isDark ? '#5EEAD4' : '#0D9488' }}
                                className="font-extrabold text-xs whitespace-nowrap"
                              >
                                {b.title}
                              </div>
                              <div
                                style={{ color: isDark ? '#94A3B8' : '#526E6E' }}
                                className="text-[10px] line-clamp-1"
                              >
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
                              ? 'rgba(45, 212, 191, 0.12)'
                              : '#E6F4F1'
                            : isDark
                            ? '#1C2533'
                            : '#FAF5EA',
                          borderColor: isUnlocked
                            ? isDark
                              ? 'rgba(45, 212, 191, 0.4)'
                              : '#80CBC4'
                            : isDark
                            ? '#2A3B4F'
                            : '#E3D7C1',
                        }}
                        className="p-3.5 rounded-2xl border flex items-center gap-3.5 transition-all shadow-sm"
                      >
                        <div
                          style={{
                            backgroundColor: isUnlocked
                              ? isDark
                                ? 'rgba(45, 212, 191, 0.2)'
                                : 'rgba(13, 148, 136, 0.15)'
                              : isDark
                              ? '#253346'
                              : '#E8E1D3',
                            color: isUnlocked
                              ? isDark
                                ? '#5EEAD4'
                                : '#0D9488'
                              : isDark
                              ? '#94A3B8'
                              : '#8C7B65',
                          }}
                          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                        >
                          <BadgeIcon name={b.icon} className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h5
                              style={{
                                color: isUnlocked
                                  ? isDark
                                    ? '#F1F5F9'
                                    : '#162828'
                                  : isDark
                                  ? '#E2E8F0'
                                  : '#334155',
                              }}
                              className="font-extrabold text-sm"
                            >
                              {b.title}
                            </h5>
                            {isUnlocked ? (
                              <span
                                style={{
                                  backgroundColor: isDark
                                    ? 'rgba(16, 185, 129, 0.2)'
                                    : 'rgba(5, 150, 105, 0.15)',
                                  color: isDark ? '#6EE7B7' : '#047857',
                                  borderColor: isDark
                                    ? 'rgba(16, 185, 129, 0.4)'
                                    : 'rgba(5, 150, 105, 0.3)',
                                }}
                                className="text-[11px] border px-2.5 py-0.5 rounded-full font-extrabold shrink-0"
                              >
                                مفتوح ✓
                              </span>
                            ) : (
                              <span
                                style={{
                                  backgroundColor: isDark
                                    ? 'rgba(255, 255, 255, 0.06)'
                                    : 'rgba(0, 0, 0, 0.05)',
                                  color: isDark ? '#CBD5E1' : '#64748B',
                                  borderColor: isDark ? '#2A3B4F' : '#D9C8AC',
                                }}
                                className="text-[11px] border px-2.5 py-0.5 rounded-full font-bold shrink-0"
                              >
                                مقفول 🔒
                              </span>
                            )}
                          </div>
                          <p
                            style={{
                              color: isUnlocked
                                ? isDark
                                  ? '#CBD5E1'
                                  : '#526E6E'
                                : isDark
                                ? '#94A3B8'
                                : '#64748B',
                            }}
                            className="text-xs mt-1 leading-relaxed"
                          >
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
                    <div
                      style={{ color: isDark ? '#94A3B8' : '#526E6E' }}
                      className="text-center py-8 text-xs font-semibold animate-pulse"
                    >
                      جاري تحميل لوحة شرف الدفعة...
                    </div>
                  ) : leaderboard.length === 0 ? (
                    <div
                      style={{ color: isDark ? '#94A3B8' : '#526E6E' }}
                      className="text-center py-8 text-xs font-medium"
                    >
                      لا يوجد متسابقين حتى الآن. ابدأ بالمذاكرة لتكون الأول!
                    </div>
                  ) : (
                    <div
                      style={{ borderColor: isDark ? '#1E2B3A' : '#E3D7C1' }}
                      className="divide-y divide-gray-200 dark:divide-gray-800"
                    >
                      {leaderboard.map((student) => (
                        <div
                          key={student.user_id}
                          className="py-2.5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-6 text-center font-black ${
                                student.rank === 1
                                  ? 'text-amber-400 text-base'
                                  : student.rank === 2
                                  ? 'text-slate-300 text-sm'
                                  : student.rank === 3
                                  ? 'text-amber-600 text-sm'
                                  : 'text-gray-400'
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
                              <div
                                style={{ color: isDark ? '#F1F5F9' : '#162828' }}
                                className="font-extrabold text-xs sm:text-sm"
                              >
                                {student.nickname}
                              </div>
                              <div
                                style={{ color: isDark ? '#94A3B8' : '#526E6E' }}
                                className="text-[10px] font-medium"
                              >
                                المستوى {student.level} • {student.current_streak} يوم استمرار 🔥
                              </div>
                            </div>
                          </div>
                          <div
                            style={{ color: isDark ? '#2DD4BF' : '#0D9488' }}
                            className="font-mono font-extrabold text-xs sm:text-sm"
                          >
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
